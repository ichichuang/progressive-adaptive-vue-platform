import {
  computed,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  triggerRef,
  type ShallowRef,
} from 'vue'

import type {
  UiFormController,
  UiFormFieldBinding,
  UiFormFlag,
  UiFormInput,
  UiFormIssue,
  UiFormKey,
  UiFormOption,
  UiFormOptions,
  UiFormOptionValue,
  UiFormSnapshot,
  UiFormSubmitOutcome,
  UiFormText,
} from '../components/form-contracts'
import {
  checkDraft,
  cloneDraft,
  freezeDraftValue,
  isFormKey,
  sameDraftValue,
} from './form-draft-values'
import { createFormOperation } from './form-operation'
import { registerFormPresentation } from './form-presentation'

type ValidationOutcome = 'valid' | 'invalid' | 'cancelled'
type OptionsState = 'idle' | 'loading' | 'ready' | 'failed'

/** One instance owns the draft, accepted snapshot, validation, options and submit lock. */
export function useUiForm<I extends object, O>(input: UiFormInput<I, O>): UiFormController<I> {
  if (!input.formId.trim() || !input.initial.draftId.trim())
    throw new TypeError('Form identities are required.')
  const fields = Object.freeze([...input.fields])
  checkDraft(input.initial.values, fields)
  let accepted = cloneDraft(input.initial.values)
  const draft: ShallowRef<I> = shallowRef<I>(cloneDraft(accepted))
  const draftId = shallowRef(input.initial.draftId)
  const generation = shallowRef(0)
  const summaryRevision = shallowRef(0)
  const touched: ShallowRef<Partial<Record<UiFormKey<I>, boolean>>> = shallowRef(Object.freeze({}))
  const issues = shallowRef<readonly UiFormIssue<I>[]>([])
  const notice = shallowRef<UiFormText | null>(null)
  const showAll = shallowRef(false)
  const disposed = shallowRef(false)
  const checking = shallowRef<ReturnType<typeof createFormOperation<ValidationOutcome>> | null>(
    null,
  )
  const submission = shallowRef<{
    readonly work: ReturnType<typeof createFormOperation<UiFormSubmitOutcome>>
    readonly validation: ReturnType<typeof createFormOperation<ValidationOutcome>>
    readonly generation: number
    stage: 'validating' | 'submitting'
  } | null>(null)
  const focuses = new Map<UiFormKey<I>, () => void>()
  const commits = new Map<UiFormKey<I>, () => boolean>()
  let committing = false
  let changing = false
  let valueRevision = 0
  let summaryValueRevision = -1
  const values = computed(() => freezeDraftValue(draft.value))
  const options = new Map<
    UiFormKey<I>,
    {
      readonly source: UiFormOptions<I, unknown>
      readonly items: ShallowRef<readonly UiFormOption<unknown>[]>
      readonly state: ShallowRef<OptionsState>
      request: AbortController | null
      dependencies: readonly unknown[] | null
      generation: number
    }
  >()

  function configFor(name: UiFormKey<I>) {
    const config = fields.find((candidate) => candidate.name === name)
    if (config === undefined) throw new TypeError('Unknown form field.')
    return config
  }
  function flag(value: UiFormFlag<I> | undefined): boolean {
    return typeof value === 'function' ? value(values.value) : value === true
  }
  function publishIssues(result: readonly UiFormIssue<I>[]): void {
    issues.value = Object.freeze(
      result.map((issue) =>
        Object.freeze({
          field:
            issue.field !== null && fields.some((config) => config.name === issue.field)
              ? issue.field
              : null,
          message: issue.message,
        }),
      ),
    )
  }
  function unavailable(): void {
    publishIssues([{ field: null, message: input.copy.validationUnavailable }])
  }
  function cancelValidation(): void {
    const previous = checking.value
    checking.value = null
    previous?.cancel()
  }
  function cancelWork(): void {
    cancelValidation()
    const previous = submission.value
    submission.value = null
    previous?.validation.cancel()
    previous?.work.cancel()
    for (const state of options.values()) {
      const request = state.request
      state.request = null
      state.dependencies = null
      request?.abort()
    }
  }
  function acceptOptions(
    items: readonly UiFormOption<unknown>[],
  ): readonly UiFormOption<unknown>[] {
    const identities = new Set<unknown>()
    return Object.freeze(
      items.map((option) => {
        if (
          (typeof option.value !== 'string' &&
            !(typeof option.value === 'number' && Number.isFinite(option.value))) ||
          identities.has(option.value) ||
          typeof option.label !== 'function'
        ) {
          throw new TypeError('Form options require unique typed identities and labels.')
        }
        identities.add(option.value)
        return Object.freeze({ ...option })
      }),
    )
  }
  function loadOptions(name: UiFormKey<I>, retry = false): void {
    const state = options.get(name)
    if (state === undefined || disposed.value) return
    const source = state.source
    if (!('load' in source)) {
      state.items.value = acceptOptions(source)
      state.state.value = 'ready'
      return
    }
    const dependencies = source.dependsOn.map((key) => draft.value[key])
    const same =
      state.generation === generation.value &&
      state.dependencies !== null &&
      dependencies.every((value, index) => sameDraftValue(value, state.dependencies?.[index]))
    if (same && (state.request !== null || !retry)) return
    const previous = state.request
    const request = new AbortController()
    state.request = request
    state.generation = generation.value
    state.dependencies = dependencies
    state.state.value = 'loading'
    previous?.abort()
    const captured = values.value
    const current = () =>
      !disposed.value && state.request === request && state.generation === generation.value
    void Promise.resolve()
      .then(() => {
        if (!current()) return null
        return source.load(captured, { signal: request.signal })
      })
      .then((items) => {
        if (!current() || items === null) return
        state.items.value = acceptOptions(items)
        state.state.value = 'ready'
      })
      .catch(() => {
        if (current()) state.state.value = 'failed'
      })
      .finally(() => {
        if (current()) state.request = null
      })
  }
  for (const config of fields) {
    if (config.kind !== 'select' && config.kind !== 'multi-select') continue
    if (
      'load' in config.options &&
      (new Set(config.options.dependsOn).size !== config.options.dependsOn.length ||
        config.options.dependsOn.some((key) => !fields.some((field) => field.name === key)))
    ) {
      throw new TypeError('Option dependencies must name configured fields.')
    }
    options.set(config.name, {
      source:
        'load' in config.options
          ? Object.freeze({
              dependsOn: Object.freeze([...config.options.dependsOn]),
              load: config.options.load,
            })
          : acceptOptions(config.options),
      items: shallowRef([]),
      state: shallowRef('idle'),
      request: null,
      dependencies: null,
      generation: -1,
    })
  }

  function check(): Promise<ValidationOutcome> {
    if (disposed.value) return Promise.resolve('cancelled')
    if (submission.value !== null) return submission.value.validation.promise
    if (checking.value !== null) return checking.value.promise
    const work = createFormOperation<ValidationOutcome>('cancelled')
    const revision = valueRevision
    const acceptedGeneration = generation.value
    const captured = values.value
    checking.value = work
    const current = () =>
      checking.value === work &&
      !disposed.value &&
      revision === valueRevision &&
      acceptedGeneration === generation.value
    void Promise.resolve()
      .then(() => {
        if (!current()) return null
        return input.validation.check(captured, { signal: work.signal })
      })
      .then((result) => {
        if (!current() || result === null) return
        publishIssues(result)
        checking.value = null
        work.resolve(result.length === 0 ? 'valid' : 'invalid')
      })
      .catch(() => {
        if (!current()) return
        unavailable()
        checking.value = null
        work.resolve('invalid')
      })
      .finally(() => {
        if (current()) checking.value = null
      })
    return work.promise
  }
  function setValues(patch: Partial<I>): 'applied' | 'unchanged' | 'busy' | 'disposed' {
    if (disposed.value) return 'disposed'
    if (changing || (submission.value !== null && !committing)) return 'busy'
    function merge(base: I, update: Partial<I>): I {
      for (const key of Object.keys(update)) {
        if (!isFormKey(base, key)) throw new TypeError('Unknown form patch field.')
      }
      const result = { ...base, ...update }
      checkDraft<I>(result, fields)
      return cloneDraft(result)
    }
    const previous = values.value
    const originGeneration = generation.value
    const originRevision = valueRevision
    const invalidated = () =>
      disposed.value
        ? ('disposed' as const)
        : originGeneration !== generation.value || originRevision !== valueRevision
          ? ('busy' as const)
          : null
    let candidate = merge(draft.value, patch)
    const changed = fields
      .filter((config) => !sameDraftValue(draft.value[config.name], candidate[config.name]))
      .map((config) => config.name)
    if (changed.length === 0) return 'unchanged'
    changing = true
    try {
      const linked = input.onChange?.({
        previous,
        values: freezeDraftValue(candidate),
        changed: Object.freeze(changed),
      })
      if (linked !== undefined) candidate = merge(candidate, linked)
    } finally {
      changing = false
    }
    const invalidation = invalidated()
    if (invalidation !== null) return invalidation
    if (fields.every((config) => sameDraftValue(draft.value[config.name], candidate[config.name])))
      return 'unchanged'
    const recheck = issues.value.length > 0
    cancelValidation()
    valueRevision += 1
    draft.value = candidate
    notice.value = null
    issues.value = []
    for (const name of options.keys()) loadOptions(name)
    if (recheck && submission.value === null) void check()
    return 'applied'
  }
  function hydrate(snapshot: UiFormSnapshot<I>): void {
    if (!snapshot.draftId.trim()) throw new TypeError('Draft identity is required.')
    checkDraft(snapshot.values, fields)
    const cloned = cloneDraft(snapshot.values)
    cancelWork()
    generation.value += 1
    valueRevision += 1
    accepted = cloned
    draft.value = cloneDraft(cloned)
    draftId.value = snapshot.draftId
    touched.value = Object.freeze({})
    issues.value = []
    notice.value = null
    showAll.value = false
    for (const name of options.keys()) loadOptions(name)
  }
  function blur(name: UiFormKey<I>): void {
    if (disposed.value || submission.value !== null) return
    configFor(name)
    touched.value = Object.freeze({ ...touched.value, [name]: true })
    void check()
  }
  function field<K extends UiFormKey<I>>(name: K): UiFormFieldBinding<I, K> {
    const config = configFor(name)
    // The list is produced only by this exact field's typed configuration/loader.
    // Filtering narrows the vendor-independent identity after that association.
    function typedOption(
      option: UiFormOption<unknown>,
    ): option is UiFormOption<UiFormOptionValue<I[K]>> {
      return typeof option.value === 'string' || typeof option.value === 'number'
    }
    const binding: UiFormFieldBinding<I, K> = {
      name,
      get value() {
        return freezeDraftValue(draft.value[name])
      },
      controlId: `${encodeURIComponent(input.formId)}:${encodeURIComponent(name)}:control`,
      labelId: `${encodeURIComponent(input.formId)}:${encodeURIComponent(name)}:label`,
      get describedBy() {
        return [
          config.description === undefined ? '' : `${binding.controlId}-description`,
          binding.invalid ? `${binding.controlId}-errors` : '',
        ]
          .filter(Boolean)
          .join(' ')
      },
      get hidden() {
        return flag(config.hidden)
      },
      get disabled() {
        return flag(config.disabled) || disposed.value || (submission.value !== null && !committing)
      },
      get readonly() {
        return flag(config.readonly)
      },
      get required() {
        return flag(config.required)
      },
      get invalid() {
        return binding.errors.length > 0
      },
      get errors() {
        return showAll.value || touched.value[name]
          ? issues.value.filter((issue) => issue.field === name).map((issue) => issue.message)
          : []
      },
      get options() {
        return Object.freeze((options.get(name)?.items.value ?? []).filter(typedOption))
      },
      get optionsState() {
        return options.get(name)?.state.value ?? 'idle'
      },
      setValue(value) {
        if (disposed.value) return 'disposed'
        if (submission.value !== null && !committing) return 'busy'
        if (binding.hidden || binding.disabled || binding.readonly) return 'blocked'
        const state = options.get(name)
        if (state !== undefined) {
          if (state.state.value !== 'ready') return 'blocked'
          const selected: readonly unknown[] = Array.isArray(value)
            ? value
            : value === null
              ? []
              : [value]
          if (
            new Set(selected).size !== selected.length ||
            selected.some(
              (identity) =>
                !state.items.value.some((option) => option.value === identity && !option.disabled),
            )
          )
            return 'blocked'
        }
        if (
          config.kind === 'date' &&
          typeof value === 'string' &&
          config.isDateAllowed?.(value, values.value) === false
        )
          return 'blocked'
        const patch: Partial<I> = {}
        patch[name] = value
        return setValues(patch)
      },
      blur: () => {
        blur(name)
      },
      retryOptions: () => {
        if (!disposed.value && submission.value === null) loadOptions(name, true)
      },
      setFocusTarget(focus) {
        if (focus === null || disposed.value) focuses.delete(name)
        else focuses.set(name, focus)
      },
      setCommitTarget(commit) {
        if (commit === null || disposed.value) commits.delete(name)
        else commits.set(name, commit)
      },
    }
    return Object.freeze(binding)
  }
  function submit(): Promise<UiFormSubmitOutcome> {
    if (disposed.value) return Promise.resolve('cancelled')
    if (submission.value !== null) return submission.value.work.promise
    const attempt: NonNullable<(typeof submission)['value']> = {
      work: createFormOperation<UiFormSubmitOutcome>('cancelled'),
      validation: createFormOperation<ValidationOutcome>('cancelled'),
      generation: generation.value,
      stage: 'validating',
    }
    submission.value = attempt
    cancelValidation()
    if (submission.value !== attempt) return attempt.work.promise
    showAll.value = true
    summaryRevision.value += 1
    issues.value = []
    notice.value = null
    const current = () =>
      submission.value === attempt && !disposed.value && attempt.generation === generation.value
    const invalid = () => {
      if (!current()) return
      summaryValueRevision = valueRevision
      summaryRevision.value += 1
      attempt.validation.resolve('invalid')
      attempt.work.resolve('invalid')
    }
    void (async () => {
      try {
        const incomplete: UiFormIssue<I>[] = []
        committing = true
        try {
          for (const [name, commit] of commits) {
            const binding = field(name)
            if (!binding.hidden && !binding.disabled && !binding.readonly && !commit())
              incomplete.push({ field: name, message: input.copy.inputIncomplete })
            if (!current()) return
          }
        } finally {
          committing = false
        }
        if (incomplete.length > 0) {
          publishIssues(incomplete)
          invalid()
          return
        }
        const captured = cloneDraft(draft.value)
        const parsed = await input.validation.parse(freezeDraftValue(captured), {
          signal: attempt.work.signal,
        })
        if (!current()) return
        if (parsed.status === 'invalid') {
          if (parsed.issues.length === 0) unavailable()
          else publishIssues(parsed.issues)
          invalid()
          return
        }
        publishIssues([])
        attempt.validation.resolve('valid')
        attempt.stage = 'submitting'
        triggerRef(submission)
        let result
        try {
          result = await input.onSubmit(parsed.output, { signal: attempt.work.signal })
        } catch {
          if (current()) {
            notice.value = input.copy.submitFailed
            attempt.work.resolve('failure')
          }
          return
        }
        if (!current()) return
        if (result.status === 'failure') {
          notice.value = result.message
          attempt.work.resolve('failure')
          return
        }
        const snapshot = result.initial ?? { draftId: draftId.value, values: captured }
        let next: I
        try {
          checkDraft(snapshot.values, fields)
          if (!snapshot.draftId.trim()) throw new TypeError('Draft identity is required.')
          next = cloneDraft(snapshot.values)
        } catch {
          notice.value = input.copy.submitFailed
          attempt.work.resolve('failure')
          return
        }
        // Settle this attempt before accepting its new generation; never copy O into I.
        submission.value = null
        hydrate({ draftId: snapshot.draftId, values: next })
        notice.value = input.copy.submitSucceeded
        attempt.work.resolve('success')
      } catch {
        if (current()) {
          unavailable()
          invalid()
        }
      } finally {
        if (current()) submission.value = null
      }
    })()
    return attempt.work.promise
  }
  const form: UiFormController<I> = Object.freeze({
    formId: input.formId,
    fields,
    copy: input.copy,
    draftId: computed(() => draftId.value),
    values,
    dirty: computed(() =>
      fields.some((config) => !sameDraftValue(accepted[config.name], draft.value[config.name])),
    ),
    touched: computed(() => touched.value),
    issues: computed(() =>
      Object.freeze(
        issues.value.filter(
          (issue) => showAll.value || (issue.field !== null && touched.value[issue.field]),
        ),
      ),
    ),
    phase: computed(() =>
      disposed.value
        ? 'disposed'
        : (submission.value?.stage ?? (checking.value === null ? 'idle' : 'validating')),
    ),
    submitting: computed(() => submission.value !== null),
    notice: computed(() => notice.value),
    setValues,
    blur,
    field,
    submit,
    validate() {
      if (!disposed.value) showAll.value = true
      return check()
    },
    reset() {
      if (!disposed.value) hydrate({ draftId: draftId.value, values: accepted })
    },
    replaceInitial(snapshot: UiFormSnapshot<I>) {
      if (!disposed.value) hydrate(snapshot)
    },
    dispose() {
      if (disposed.value) return
      disposed.value = true
      generation.value += 1
      cancelWork()
      focuses.clear()
      commits.clear()
    },
  })
  registerFormPresentation(form, {
    generation: computed(() => generation.value),
    summaryRevision: computed(() => summaryRevision.value),
    isSummaryCurrent(revision) {
      return revision === summaryRevision.value && summaryValueRevision === valueRevision
    },
    canFocusField(name) {
      if (!isFormKey<I>(draft.value, name) || disposed.value) return false
      const binding = field(name)
      return !binding.hidden && !binding.disabled && focuses.has(name)
    },
    focusField(name) {
      if (!isFormKey<I>(draft.value, name) || disposed.value) return false
      const binding = field(name)
      const focus = focuses.get(name)
      if (binding.hidden || binding.disabled || focus === undefined) return false
      focus()
      return true
    },
  })
  for (const name of options.keys()) loadOptions(name)
  if (getCurrentScope() !== undefined)
    onScopeDispose(() => {
      form.dispose()
    })
  return form
}
