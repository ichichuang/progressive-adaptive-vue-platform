import { computed, getCurrentScope, onScopeDispose, shallowRef, watch } from 'vue'
import type {
  UiFormController,
  UiFormCopy,
  UiFormNode,
  UiFormOptionSource,
  UiFormSchema,
  UiFormReadonlyValue,
  UiFormValue,
} from '../components/form-contracts'
import type {
  UiTableController,
  UiTableRecord,
  UiTableReadonlyRecord,
  UiTableTransport,
} from '../components/table-contracts'
import { useUiForm } from './use-ui-form'
import { resolveUiTableRequest } from '../components/table-request'
import { cloneDraft, freezeDraftValue } from './form-draft-values'

export interface UiTableFormInput {
  readonly table: UiTableController
  readonly transport: UiTableTransport
  readonly copy: UiFormCopy
  readonly sources?: Readonly<Record<string, UiFormOptionSource<UiTableRecord>>>
  readonly context?: UiTableReadonlyRecord
}
export interface UiTableFormScope {
  /** Independent top-level fields of an existing row to edit in place. The original record supplies untouched request values. */
  readonly fields: readonly string[]
}
/** Shared form session for inline, modal, drawer and route hosts. Never manufactures mutation success. */
export function useUiTableForm(input: UiTableFormInput) {
  const configuration = input.table.schema.editor
  if (!configuration) throw new TypeError('Table editor configuration is required.')
  const editor = configuration
  const form = shallowRef<UiFormController<UiTableRecord> | null>(null)
  const row = shallowRef<UiTableReadonlyRecord | null>(null)
  const mode = shallowRef<'create' | 'edit' | 'detail'>('create')
  const loading = shallowRef(false)
  const error = shallowRef<Error | null>(null)
  const open = shallowRef(false)
  let active: AbortController | undefined
  let sequence = 0
  let disposed = false
  let stopSubmission: (() => void) | undefined
  const context = cloneDraft(input.context ?? {})
  function current(ticket: number, signal: AbortSignal): boolean {
    return !disposed && ticket === sequence && !signal.aborted
  }
  function fieldsOnly(fields: readonly UiFormNode[], record: UiTableReadonlyRecord): UiTableRecord {
    const result: UiTableRecord = {}
    for (const field of fields) {
      if (!Object.hasOwn(record, field.name)) continue
      const value = record[field.name]
      if (value === undefined) continue
      if (
        field.kind === 'group' &&
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      )
        result[field.name] = fieldsOnly(field.fields, value as UiTableReadonlyRecord)
      else if (field.kind === 'repeat' && Array.isArray(value))
        result[field.name] = value.map((item: UiFormReadonlyValue) =>
          typeof item === 'object' && item !== null && !Array.isArray(item)
            ? fieldsOnly(field.fields, item as UiTableReadonlyRecord)
            : (cloneDraft(item) as UiFormValue),
        )
      else result[field.name] = cloneDraft(value) as UiFormValue
    }
    return result
  }
  function close(force = false): boolean {
    if (form.value?.submitting.value) return false
    if (open.value && !force && form.value?.hasUnsavedChanges.value) return false
    ++sequence
    active?.abort()
    open.value = false
    loading.value = false
    if (editor.presentation === 'page') release()
    return true
  }
  // Overlay hosts release only after their leave transition. A reopened session
  // must never be released by a previous overlay's delayed after-leave event.
  function release(): void {
    if (open.value) return
    stopSubmission?.()
    stopSubmission = undefined
    form.value?.dispose()
    form.value = null
  }
  async function show(
    nextMode: 'create' | 'edit' | 'detail',
    recordInput: UiTableReadonlyRecord = {},
    scope?: UiTableFormScope,
  ): Promise<boolean> {
    if (disposed || !close()) return false
    release()
    const selected = cloneDraft(recordInput)
    freezeDraftValue<unknown>(selected)
    row.value = selected
    const ticket = ++sequence
    active = new AbortController()
    const signal = active.signal
    mode.value = nextMode
    open.value = true
    loading.value = true
    error.value = null
    try {
      if (scope !== undefined && nextMode !== 'edit')
        throw new TypeError('Scoped table forms only support editing existing rows.')
      let record = selected
      if (nextMode !== 'create' && editor.detail) {
        if (!input.transport.detail) throw new TypeError('Detail transport is required.')
        record = await input.transport.detail(
          resolveUiTableRequest(editor.detail, {
            ...input.table.query.value,
            context,
            row: selected,
            form: {},
          }),
          signal,
        )
      }
      if (!current(ticket, signal)) return false
      const names = scope === undefined ? null : new Set(scope.fields)
      if (
        names &&
        (names.size === 0 ||
          names.size !== scope?.fields.length ||
          [...names].some((name) => !editor.form.fields.some((field) => field.name === name)))
      )
        throw new TypeError('Inline fields must be unique existing top-level form fields.')
      const schema = names
        ? { ...editor.form, fields: editor.form.fields.filter((field) => names.has(field.name)) }
        : editor.form
      const baseline = fieldsOnly(
        editor.form.fields.filter((field) => !names?.has(field.name)),
        record,
      )
      let saved = false
      const session = useUiForm<UiFormSchema>({
        formId: `${input.table.schema.id}-editor`,
        schema,
        initial: {
          draftId: `${input.table.schema.id}-${String(ticket)}`,
          values: fieldsOnly(schema.fields, record),
        },
        copy: input.copy,
        ...(input.sources === undefined ? {} : { sources: input.sources }),
        translate: (value) => input.table.text(value),
        onSubmit: async (values, work) => {
          if (saved || !current(ticket, work.signal) || !open.value)
            return { status: 'failure', message: input.copy.submitFailed }
          const request =
            nextMode === 'create' ? editor.create : nextMode === 'edit' ? editor.update : undefined
          if (!request || !input.transport.mutate)
            return { status: 'failure', message: input.copy.submitFailed }
          try {
            await input.transport.mutate(
              resolveUiTableRequest(request, {
                ...input.table.query.value,
                context,
                row: selected,
                form: names ? { ...baseline, ...values } : values,
              }),
              work.signal,
            )
            if (!current(ticket, work.signal))
              return { status: 'failure', message: input.copy.submitFailed }
            saved = true
            await input.table.refresh()
            return { status: 'success' }
          } catch {
            return { status: 'failure', message: input.copy.submitFailed }
          }
        },
      })
      form.value = session
      stopSubmission = watch(
        session.submitting,
        (submitting) => {
          if (!submitting && saved && ticket === sequence) close(true)
        },
        { flush: 'post' },
      )
      return true
    } catch (cause) {
      if (current(ticket, signal))
        error.value = cause instanceof Error ? cause : new Error('Table detail request failed.')
      return false
    } finally {
      if (ticket === sequence) loading.value = false
    }
  }
  async function remove(
    row: UiTableReadonlyRecord,
    confirm: () => boolean | Promise<boolean>,
  ): Promise<boolean> {
    if (
      disposed ||
      open.value ||
      loading.value ||
      form.value?.submitting.value ||
      !editor.remove ||
      !input.transport.mutate
    )
      return false
    const selected = cloneDraft(row)
    const query = input.table.query.value
    const controller = new AbortController()
    active?.abort()
    active = controller
    const ticket = ++sequence
    loading.value = true
    error.value = null
    try {
      if (!(await confirm()) || !current(ticket, controller.signal)) return false
      await input.transport.mutate(
        resolveUiTableRequest(editor.remove, {
          ...query,
          context,
          row: selected,
          form: {},
        }),
        controller.signal,
      )
      if (!current(ticket, controller.signal)) return false
      await input.table.refresh()
      return true
    } catch (cause) {
      if (current(ticket, controller.signal))
        error.value = cause instanceof Error ? cause : new Error('Table removal failed.')
      return false
    } finally {
      if (ticket === sequence) loading.value = false
    }
  }
  function dispose() {
    disposed = true
    stopSubmission?.()
    stopSubmission = undefined
    ++sequence
    active?.abort()
    form.value?.dispose()
    loading.value = false
    open.value = false
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  return {
    form: computed(() => form.value),
    row: computed(() => row.value),
    mode: computed(() => mode.value),
    open: computed(() => open.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    presentation: editor.presentation ?? 'modal',
    show,
    remove,
    close,
    release,
    dispose,
  }
}
