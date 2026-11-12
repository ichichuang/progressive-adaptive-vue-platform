import {
  computed,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  shallowRef,
  triggerRef,
  type ShallowRef,
  type DeepReadonly,
} from 'vue'
import type {
  UiFormController,
  UiFormFieldBinding,
  UiFormFieldConfig,
  UiFormInput,
  UiFormSchema,
  UiFormSchemaValues,
  UiFormIssue,
  UiFormLoadOptions,
  UiFormLoadOutcome,
  UiFormLoadState,
  UiFormMutationResult,
  UiFormOption,
  UiFormOptionValue,
  UiFormOptionSource,
  UiFormOptionPage,
  UiFormOptionQuery,
  UiFormSelectedOption,
  UiFormPagedOptionSource,
  UiFormNode,
  UiFormReadonlyValue,
  UiFormSnapshot,
  UiFormSubmitOutcome,
  UiFormText,
  UiFormValue,
  UiFormWorkContext,
} from '../components/form-contracts'
import { parseUiFormSchema } from '../components/form-schema'
import {
  cloneDraft,
  createFormValues,
  evaluateFormFlag,
  formEntries,
  freezeDraftValue,
  getFormValue,
  resolveFormReference,
  sameDraftValue,
  setFormValue,
} from './form-draft-values'
import { createFormOperation } from './form-operation'
import { registerFormPresentation } from './form-presentation'
import { validateFormField } from './form-validation'

type ValidationOutcome = 'valid' | 'invalid' | 'cancelled'
type OptionStatus = 'idle' | 'loading' | 'ready' | 'failed'
type IssueOrigin = 'schema' | 'validation' | 'server' | 'input'
interface ItemValidationScope {
  readonly prefix: string
  readonly current: () => boolean
}

/** A controller owns one draft and all work bound to that draft's lifetime. */
export function useUiForm<const Schema extends UiFormSchema>(
  input: UiFormInput<UiFormSchemaValues<Schema>> & { readonly schema: Schema },
): UiFormController<UiFormSchemaValues<Schema>> {
  type I = UiFormSchemaValues<Schema>
  if (!input.formId.trim() || !input.initial.draftId.trim())
    throw new TypeError('Form identities are required.')
  const schema = parseUiFormSchema(input.schema)
  // Capture only explicit registrations used by this immutable schema. Later
  // mutation of an application object cannot replace this controller's provider.
  const sources = new Map<string, UiFormOptionSource<I>>()
  function registeredSource(name: string) {
    return sources.get(name)
  }
  function isPagedSource(source: unknown): source is UiFormPagedOptionSource<I> {
    if (source === null || typeof source !== 'object') return false
    const size: unknown = Reflect.get(source, 'pageSize')
    return (
      typeof size === 'number' &&
      Number.isInteger(size) &&
      size >= 1 &&
      size <= 100 &&
      typeof Reflect.get(source, 'query') === 'function' &&
      typeof Reflect.get(source, 'resolve') === 'function'
    )
  }
  function validateSources(nodes: readonly UiFormNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'group' || node.kind === 'repeat') validateSources(node.fields)
      else if (
        (node.kind === 'select' ||
          node.kind === 'multi-select' ||
          node.kind === 'radio' ||
          node.kind === 'checkbox-group') &&
        'source' in node.options
      ) {
        const name = node.options.source
        if (sources.has(name)) continue
        const source =
          input.sources !== undefined && Object.hasOwn(input.sources, name)
            ? input.sources[name]
            : undefined
        if (source === undefined) continue
        if (typeof source === 'function') {
          sources.set(name, source)
          continue
        }
        if (!isPagedSource(source))
          throw new TypeError('A paged option source requires pageSize 1–100, query and resolve.')
        if (
          typeof input.copy.previousOptionsPage !== 'function' ||
          typeof input.copy.nextOptionsPage !== 'function' ||
          typeof input.copy.optionsPage !== 'function'
        )
          throw new TypeError(
            'Paged option sources require previousOptionsPage, nextOptionsPage and optionsPage copy.',
          )
        sources.set(
          name,
          Object.freeze({
            pageSize: source.pageSize,
            query: source.query.bind(source),
            resolve: source.resolve.bind(source),
          }),
        )
      }
    }
  }
  validateSources(schema.fields)
  const normalize = (value: unknown) => createFormValues(schema.fields, value) as I
  const initial = normalize(input.initial.values)
  // Baseline, current values and identity are one publication. Synchronous
  // observers must never see a new baseline paired with another record's values.
  const record = shallowRef({
    accepted: initial,
    values: cloneDraft(initial),
    draftId: input.initial.draftId,
  })
  const accepted = computed(() => record.value.accepted)
  const draft = computed(() => record.value.values)
  const values = computed<DeepReadonly<I>>(() => freezeDraftValue<I>(draft.value))
  const draftId = computed(() => record.value.draftId)
  const generation = shallowRef(0)
  const summaryRevision = shallowRef(0)
  const feedbackRevision = shallowRef(0)
  const feedbackTarget = shallowRef<{
    readonly identity: symbol
    readonly revision: number
  } | null>(null)
  let feedbackValueRevision = -1
  let explicitCheck: ReturnType<typeof createFormOperation<ValidationOutcome>> | null = null
  let checkingItem: ItemValidationScope | undefined
  const feedbackScope = shallowRef<string | undefined>()
  let valueRevision = 0
  const revision = shallowRef(0)
  let summaryValueRevision = -1
  const touched = shallowRef<Readonly<Record<string, boolean>>>(Object.freeze({}))
  const issues = shallowRef<readonly UiFormIssue[]>([])
  const issueMetadata = new WeakMap<
    UiFormIssue,
    { readonly origin: IssueOrigin; readonly value: unknown }
  >()
  const notice = shallowRef<UiFormText | null>(null)
  const showAll = shallowRef(false)
  const disposed = shallowRef(false)
  const loadState = shallowRef<UiFormLoadState>('idle')
  let loading: ReturnType<typeof createFormOperation<UiFormLoadOutcome>> | null = null
  let loadRevision = 0
  const checking = shallowRef<ReturnType<typeof createFormOperation<ValidationOutcome>> | null>(
    null,
  )
  const submission = shallowRef<{
    work: ReturnType<typeof createFormOperation<UiFormSubmitOutcome>>
    validation: ReturnType<typeof createFormOperation<ValidationOutcome>>
    stage: 'validating' | 'submitting'
  } | null>(null)
  let committing = false
  let changing = false
  const focuses = new Map<
    string,
    { owner: symbol; run: () => void; relocate: (path: string) => void }
  >()
  const commits = new Map<
    string,
    { owner: symbol; run: () => boolean; relocate: (path: string) => void }
  >()
  const pendingInputs = new Map<string, { owner: symbol; relocate: (path: string) => void }>()
  const pendingFields = shallowRef<readonly string[]>(Object.freeze([]))
  const dirty = computed(() => !sameDraftValue(accepted.value, draft.value))
  const hasPendingInput = computed(() => pendingFields.value.length > 0)
  const hasUnsavedChanges = computed(() => dirty.value || hasPendingInput.value)
  const keys = new Map<string, readonly string[]>()
  const controlKeys = new Map<string, symbol>()
  let nextKey = 0
  const entries = computed(() => formEntries(schema.fields, draft.value))
  const fields = computed<readonly UiFormFieldConfig[]>(() =>
    Object.freeze(
      entries.value.flatMap(({ node, path }) =>
        node.kind === 'group' || node.kind === 'repeat'
          ? []
          : [Object.freeze({ ...node, name: path })],
      ),
    ),
  )
  const dirtyFields = computed(() =>
    Object.freeze(
      entries.value
        .filter(
          ({ node, path }) =>
            node.kind !== 'group' &&
            !sameDraftValue(getFormValue(accepted.value, path), getFormValue(draft.value, path)),
        )
        .map(({ path }) => path),
    ),
  )
  const optionIssueCurrent = new WeakMap<UiFormText, () => boolean>()
  interface OptionView {
    readonly items: readonly UiFormOption[]
    readonly status: OptionStatus
    readonly selected: readonly UiFormSelectedOption[]
    readonly query: UiFormOptionQuery | null
  }
  interface OptionOwner {
    name: string
    view: ShallowRef<OptionView>
    statusMessage: UiFormText
    selectionMessage: UiFormText
    missingMessage: UiFormText
    request: AbortController | null
    resolution: AbortController | null
    resolving: readonly UiFormOptionValue[]
    timer: ReturnType<typeof setTimeout> | undefined
    dependencies: unknown
    epoch: number
    hidden: boolean
    queried: boolean
    provider: UiFormPagedOptionSource<I> | undefined
    versions: Map<UiFormOptionValue, number>
  }
  const options = new Map<string, OptionOwner>()
  let optionSequence = 0
  // This is controller-local history, not another source or selected-value authority.
  const optionPages: {
    owner: OptionOwner
    epoch: number
    search: string
    page: number
    expires: number
    sequence: number
    result: UiFormOptionPage
  }[] = []
  function optionView(state: OptionOwner, patch: Partial<OptionView>): void {
    state.view.value = Object.freeze({ ...state.view.value, ...patch })
  }
  function forgetPages(state?: OptionOwner): void {
    for (let index = optionPages.length - 1; index >= 0; index -= 1) {
      if (state === undefined || optionPages[index]?.owner === state) optionPages.splice(index, 1)
    }
  }
  function stopOptions(state: OptionOwner, next?: Partial<OptionView>): number {
    const query = state.request
    const resolution = state.resolution
    state.request = null
    state.resolution = null
    state.resolving = []
    const epoch = ++state.epoch
    if (state.timer !== undefined) clearTimeout(state.timer)
    state.timer = undefined
    forgetPages(state)
    if (next !== undefined) optionView(state, next)
    query?.abort()
    resolution?.abort()
    return epoch
  }
  function entryFor(path: string) {
    const entry = entries.value.find((entry) => entry.path === path)
    if (entry === undefined) throw new TypeError(`Unknown form path: ${path}`)
    return entry
  }
  function fieldFor(path: string) {
    const entry = entryFor(path)
    if (entry.node.kind === 'group' || entry.node.kind === 'repeat')
      throw new TypeError('Expected a form field.')
    return { ...entry, node: entry.node }
  }
  function nodeState(path: string) {
    const entry = entryFor(path)
    const lineage = [...entry.ancestors.map(entryFor), entry]
    return Object.freeze({
      hidden: lineage.some(({ node, group }) => evaluateFormFlag(node.hidden, draft.value, group)),
      disabled:
        disposed.value ||
        (submission.value !== null && !committing) ||
        lineage.some(({ node, group }) => evaluateFormFlag(node.disabled, draft.value, group)),
      readonly: lineage.some(({ node, group }) =>
        evaluateFormFlag(node.readonly, draft.value, group),
      ),
    })
  }
  function rememberIssue(issue: UiFormIssue, origin: IssueOrigin): UiFormIssue {
    issueMetadata.set(issue, {
      origin,
      value:
        issue.field !== null && entries.value.some((entry) => entry.path === issue.field)
          ? getFormValue(draft.value, issue.field)
          : draft.value,
    })
    return issue
  }
  function moveIssue(issue: UiFormIssue, field: string | null): UiFormIssue {
    const moved = Object.freeze({ field, message: issue.message })
    const metadata = issueMetadata.get(issue)
    if (metadata !== undefined) issueMetadata.set(moved, metadata)
    return moved
  }
  function inScope(name: string | null, scope?: string): boolean {
    return scope === undefined || (name?.startsWith(scope) ?? false)
  }
  function issueCurrent(issue: UiFormIssue): boolean {
    if (!(optionIssueCurrent.get(issue.message)?.() ?? true)) return false
    const metadata = issueMetadata.get(issue)
    if (metadata?.origin !== 'server' && metadata?.origin !== 'input') return true
    return issue.field === null
      ? sameDraftValue(metadata.value, draft.value)
      : entries.value.some((entry) => entry.path === issue.field) &&
          sameDraftValue(metadata.value, getFormValue(draft.value, issue.field))
  }
  function publishIssues(result: readonly UiFormIssue[], scope?: string) {
    const retained =
      scope === undefined
        ? []
        : issues.value.filter((issue) => !inScope(issue.field, scope) && issueCurrent(issue))
    issues.value = Object.freeze([
      ...retained,
      ...result
        .filter((issue) => inScope(issue.field, scope))
        .filter(
          (issue) =>
            scope === undefined || entries.value.some((entry) => entry.path === issue.field),
        )
        .filter((issue) => optionIssueCurrent.get(issue.message)?.() ?? true)
        .filter(
          (issue) =>
            issue.field === null ||
            !entries.value.some((entry) => entry.path === issue.field) ||
            !nodeState(issue.field).hidden,
        )
        .map((issue) => {
          if (typeof issue.message !== 'function')
            throw new TypeError('Validation messages must be functions.')
          const normalized = moveIssue(
            issue,
            issue.field !== null && entries.value.some((entry) => entry.path === issue.field)
              ? issue.field
              : null,
          )
          if (!issueMetadata.has(normalized) || normalized.field !== issue.field)
            rememberIssue(normalized, issueMetadata.get(issue)?.origin ?? 'schema')
          return normalized
        }),
    ])
  }
  function validationVisible() {
    return showAll.value || Object.keys(touched.value).length > 0
  }
  function refreshIssues() {
    if (!validationVisible()) return
    const scope = checkingItem?.prefix
    // Keep custom feedback until its replacement has finished. Server/input
    // feedback belongs to the exact value that was rejected, not its index.
    const retained = issues.value.filter((issue) => {
      if (!inScope(issue.field, scope)) return false
      const metadata = issueMetadata.get(issue)
      if (metadata?.origin === 'validation') return true
      if (metadata?.origin !== 'server' && metadata?.origin !== 'input') return false
      return issueCurrent(issue)
    })
    publishIssues([...retained, ...validateSchema(draft.value, scope)], scope)
  }
  function cancelValidation(previous = checking.value) {
    if (checking.value === previous) {
      checkingItem = undefined
      checking.value = null
    }
    previous?.cancel()
    return checking.value
  }
  function publishPendingInputs() {
    const next = [...pendingInputs.keys()]
    if (!sameDraftValue(pendingFields.value, next)) pendingFields.value = Object.freeze(next)
  }
  function cancelLoad() {
    const cancellation = ++loadRevision
    const previous = loading
    loading = null
    if (previous !== null) loadState.value = 'idle'
    previous?.cancel()
    return cancellation
  }
  function cancelWork(keepLoad = false) {
    // Detach the captured option owners before cancellation can create new work.
    const requests = [...options.values()]
    const validation = checking.value
    const previous = submission.value
    options.clear()
    if (!keepLoad) cancelLoad()
    cancelValidation(validation)
    if (submission.value === previous) submission.value = null
    previous?.validation.cancel()
    previous?.work.cancel()
    forgetPages()
    for (const option of requests) stopOptions(option)
  }
  function acceptOptions(items: unknown): readonly UiFormOption[] {
    if (!Array.isArray(items)) throw new TypeError('Options must be an array.')
    const identities = new Set<string | number>()
    return Object.freeze(
      items.map((item: UiFormOption | null) => {
        if (
          typeof item !== 'object' ||
          item === null ||
          (typeof item.value !== 'string' &&
            !(typeof item.value === 'number' && Number.isFinite(item.value))) ||
          typeof item.label !== 'string' ||
          (item.disabled !== undefined && typeof item.disabled !== 'boolean') ||
          identities.has(item.value)
        )
          throw new TypeError('Invalid form option.')
        identities.add(item.value)
        return Object.freeze({
          value: item.value,
          label: item.label,
          ...(item.disabled === undefined ? {} : { disabled: item.disabled }),
        })
      }),
    )
  }
  function selectedValues(name: string): readonly UiFormOptionValue[] {
    const value = getFormValue(draft.value, name)
    return (
      Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]
    ).filter(
      (item): item is UiFormOptionValue => typeof item === 'string' || typeof item === 'number',
    )
  }
  function ownsOptions(state: OptionOwner, epoch = state.epoch): boolean {
    return !disposed.value && options.get(state.name) === state && state.epoch === epoch
  }
  function syncSelected(state: OptionOwner): void {
    const selected = selectedValues(state.name)
    const previous = state.view.value.selected
    const next = selected.map((value): UiFormSelectedOption => {
      const known = previous.find((item) => item.value === value)
      if (known !== undefined) return known
      const option =
        state.view.value.status === 'ready'
          ? state.view.value.items.find((item) => item.value === value)
          : undefined
      return Object.freeze({
        value,
        option: option ?? null,
        status: option === undefined ? 'idle' : 'ready',
      })
    })
    for (const value of state.versions.keys())
      if (!selected.includes(value)) state.versions.delete(value)
    if (!sameDraftValue(previous, next)) optionView(state, { selected: Object.freeze(next) })
  }
  function resolveSelected(state: OptionOwner, force = false): void {
    if (!ownsOptions(state) || state.provider === undefined || nodeState(state.name).hidden) return
    const wanted = Object.freeze([
      ...new Set(
        state.view.value.selected
          .filter((item) => force || item.status === 'idle' || item.status === 'loading')
          .map((item) => item.value),
      ),
    ])
    if (!force && state.resolution !== null && sameDraftValue(wanted, state.resolving)) return
    const previous = state.resolution
    const request = wanted.length === 0 ? null : new AbortController()
    state.resolution = request
    state.resolving = wanted
    const epoch = state.epoch
    const sequence = ++optionSequence
    const current = () => ownsOptions(state, epoch) && state.resolution === request
    const provider = state.provider
    const captured = values.value
    const name = state.name
    const { group } = fieldFor(name)
    for (const value of wanted) state.versions.set(value, sequence)
    if (wanted.length > 0)
      optionView(state, {
        selected: Object.freeze(
          state.view.value.selected.map((item) =>
            wanted.includes(item.value)
              ? Object.freeze({ ...item, status: 'loading' as const })
              : item,
          ),
        ),
      })
    previous?.abort()
    if (request === null || !current()) return
    void Promise.resolve()
      .then(() => {
        if (!current()) return null
        return provider.resolve(captured, {
          signal: request.signal,
          field: name,
          group,
          selected: wanted,
        })
      })
      .then((result) => {
        if (!current()) return
        if (result === null || typeof result !== 'object' || !Array.isArray(result.missing))
          throw new TypeError('Invalid option resolution.')
        const items = acceptOptions(result.items)
        const found = new Map(items.map((item) => [item.value, item]))
        const missing = new Set<UiFormOptionValue>()
        for (const value of result.missing) {
          if (
            (typeof value !== 'string' && !(typeof value === 'number' && Number.isFinite(value))) ||
            missing.has(value) ||
            found.has(value) ||
            !wanted.includes(value)
          )
            throw new TypeError('Invalid missing option identity.')
          missing.add(value)
        }
        if (
          items.some((item) => !wanted.includes(item.value)) ||
          wanted.some((value) => !found.has(value) && !missing.has(value))
        )
          throw new TypeError('Option resolution must cover exactly the requested identities.')
        const selected = state.view.value.selected.map((item) => {
          if (!wanted.includes(item.value) || (state.versions.get(item.value) ?? 0) > sequence)
            return item
          const option = found.get(item.value)
          return Object.freeze({
            value: item.value,
            option: option ?? item.option,
            status: option === undefined ? ('missing' as const) : ('ready' as const),
          })
        })
        optionView(state, { selected: Object.freeze(selected) })
        if (current()) refreshIssues()
      })
      .catch(() => {
        if (!current()) return
        optionView(state, {
          selected: Object.freeze(
            state.view.value.selected.map((item) =>
              wanted.includes(item.value) && (state.versions.get(item.value) ?? 0) <= sequence
                ? Object.freeze({ ...item, status: 'failed' as const })
                : item,
            ),
          ),
        })
        if (current()) refreshIssues()
      })
      .finally(() => {
        if (current()) {
          state.resolution = null
          state.resolving = []
        }
      })
  }
  function queryOptions(
    state: OptionOwner,
    search: string,
    page: number,
    delay = 0,
    retry = false,
  ): void {
    if (!ownsOptions(state) || state.provider === undefined || nodeState(state.name).hidden) return
    const provider = state.provider
    state.queried = true
    const previous = state.request
    const request = new AbortController()
    const epoch = state.epoch
    const sequence = ++optionSequence
    const name = state.name
    const { group } = fieldFor(name)
    const captured = values.value
    const current = () => ownsOptions(state, epoch) && state.request === request
    if (state.timer !== undefined) clearTimeout(state.timer)
    state.timer = undefined
    state.request = request
    const query = Object.freeze({ search, page, pageSize: provider.pageSize, hasNext: false })
    if (retry) forgetPages(state)
    optionView(state, { query, status: 'loading', items: [] })
    previous?.abort()
    if (!current()) return
    function publish(result: UiFormOptionPage, evidenceSequence = sequence): void {
      if (!current()) return
      const selected = state.view.value.selected.map((item) => {
        const option = result.items.find((candidate) => candidate.value === item.value)
        if (
          item.status === 'ready' ||
          option === undefined ||
          (state.versions.get(item.value) ?? 0) > evidenceSequence
        )
          return item
        state.versions.set(item.value, evidenceSequence)
        return Object.freeze({ value: item.value, option, status: 'ready' as const })
      })
      optionView(state, {
        items: result.items,
        status: 'ready',
        query: Object.freeze({ ...query, hasNext: result.hasNext }),
        selected: Object.freeze(selected),
      })
      if (current()) refreshIssues()
      if (current()) resolveSelected(state)
    }
    function run(): void {
      if (!current()) return
      state.timer = undefined
      const now = Date.now()
      for (let index = optionPages.length - 1; index >= 0; index -= 1)
        if ((optionPages[index]?.expires ?? 0) <= now) optionPages.splice(index, 1)
      const index = optionPages.findIndex(
        (entry) =>
          entry.owner === state &&
          entry.epoch === epoch &&
          entry.search === search &&
          entry.page === page,
      )
      const cached = optionPages[index]
      if (!retry && cached !== undefined) {
        optionPages.splice(index, 1)
        optionPages.push(cached)
        publish(cached.result, cached.sequence)
        if (current()) state.request = null
        return
      }
      void Promise.resolve()
        .then(() => {
          if (!current()) return null
          return provider.query(captured, {
            signal: request.signal,
            field: name,
            group,
            search,
            page,
            pageSize: provider.pageSize,
          })
        })
        .then((result) => {
          if (!current()) return
          if (result === null || typeof result !== 'object' || typeof result.hasNext !== 'boolean')
            throw new TypeError('Invalid option page.')
          const items = acceptOptions(result.items)
          if (items.length > provider.pageSize) throw new TypeError('Option page exceeds pageSize.')
          const accepted = Object.freeze({ items, hasNext: result.hasNext })
          optionPages.push({
            owner: state,
            epoch,
            search,
            page,
            expires: Date.now() + 60_000,
            sequence,
            result: accepted,
          })
          if (optionPages.length > 20) optionPages.shift()
          publish(accepted)
        })
        .catch(() => {
          if (!current()) return
          optionView(state, { status: 'failed' })
          if (current()) refreshIssues()
        })
        .finally(() => {
          if (current()) state.request = null
        })
    }
    if (delay > 0) state.timer = setTimeout(run, delay)
    else run()
  }
  function loadOptions(name: string, retry = false) {
    if (disposed.value) return
    const { node, group } = fieldFor(name)
    if (
      node.kind !== 'select' &&
      node.kind !== 'multi-select' &&
      node.kind !== 'radio' &&
      node.kind !== 'checkbox-group'
    )
      return
    let state = options.get(name)
    if (state === undefined) {
      const source = 'source' in node.options ? registeredSource(node.options.source) : undefined
      const provider = isPagedSource(source) ? source : undefined
      state = {
        name,
        view: shallowRef<OptionView>({
          items: [],
          status: 'idle',
          selected: [],
          query:
            provider === undefined
              ? null
              : Object.freeze({ search: '', page: 1, pageSize: provider.pageSize, hasNext: false }),
        }),
        statusMessage: input.copy.loadingOptions,
        selectionMessage: input.copy.loadingOptions,
        missingMessage: () => input.copy.invalidValue(),
        request: null,
        resolution: null,
        resolving: [],
        timer: undefined,
        dependencies: undefined,
        epoch: 0,
        hidden: false,
        queried: false,
        provider,
        versions: new Map(),
      }
      const created = state
      created.statusMessage = () =>
        created.view.value.status === 'failed'
          ? input.copy.optionsFailed()
          : input.copy.loadingOptions()
      created.selectionMessage = () =>
        created.view.value.selected.some((item) => item.status === 'failed')
          ? input.copy.optionsFailed()
          : input.copy.loadingOptions()
      optionIssueCurrent.set(
        created.missingMessage,
        () =>
          ownsOptions(created) &&
          created.view.value.selected.some((item) => item.status === 'missing'),
      )
      optionIssueCurrent.set(
        created.statusMessage,
        () => ownsOptions(created) && created.view.value.status !== 'ready',
      )
      optionIssueCurrent.set(
        created.selectionMessage,
        () =>
          ownsOptions(created) &&
          created.view.value.selected.some((item) =>
            ['idle', 'loading', 'failed'].includes(item.status),
          ),
      )
      options.set(name, state)
    }
    if (nodeState(name).hidden) {
      if (!state.hidden) {
        if (state.provider !== undefined) syncSelected(state)
        state.hidden = true
        state.queried = false
        if (state.provider === undefined && state.request === null) return
        stopOptions(state, {
          status: 'idle',
          items: [],
          selected: Object.freeze(
            state.view.value.selected.map((item) =>
              item.status === 'loading'
                ? Object.freeze({ ...item, status: 'idle' as const })
                : item,
            ),
          ),
        })
      }
      return
    }
    state.hidden = false
    const source = node.options
    if (!('source' in source)) {
      optionView(state, { items: acceptOptions(source), status: 'ready' })
      return
    }
    const dependencies =
      source.dependsOn === undefined
        ? cloneDraft(draft.value)
        : source.dependsOn.map(
            (reference) =>
              getFormValue(draft.value, resolveFormReference(reference, group)) ?? null,
          )
    if (state.provider !== undefined) {
      if (!sameDraftValue(dependencies, state.dependencies)) {
        const queried = state.queried
        const search = state.view.value.query?.search ?? ''
        state.dependencies = cloneDraft(dependencies)
        state.versions.clear()
        const epoch = stopOptions(state, {
          items: [],
          status: 'idle',
          query: Object.freeze({
            search,
            page: 1,
            pageSize: state.provider.pageSize,
            hasNext: false,
          }),
          selected: Object.freeze(
            state.view.value.selected.map((item) =>
              Object.freeze({ ...item, status: 'idle' as const }),
            ),
          ),
        })
        if (!ownsOptions(state, epoch)) return
        syncSelected(state)
        if (!ownsOptions(state, epoch)) return
        resolveSelected(state)
        if (
          ownsOptions(state, epoch) &&
          queried &&
          state.request === null &&
          state.view.value.status === 'idle'
        )
          queryOptions(state, search, 1)
      } else {
        const epoch = state.epoch
        syncSelected(state)
        if (ownsOptions(state, epoch)) resolveSelected(state)
      }
      return
    }
    if (
      !retry &&
      state.view.value.status !== 'idle' &&
      sameDraftValue(dependencies, state.dependencies)
    )
      return
    const previous = state.request
    const request = new AbortController()
    state.request = request
    state.dependencies = cloneDraft(dependencies)
    const epoch = state.epoch
    const current = () => ownsOptions(state, epoch) && state.request === request
    optionView(state, { status: 'loading', items: [] })
    previous?.abort()
    const captured = values.value
    void Promise.resolve()
      .then(() => {
        if (!current()) return null
        const loader = registeredSource(source.source)
        if (typeof loader !== 'function') throw new TypeError('Unknown form option source.')
        return loader(captured, { signal: request.signal, field: name, group })
      })
      .then((items) => {
        if (!current()) return
        optionView(state, { items: acceptOptions(items), status: 'ready' })
        if (current()) refreshIssues()
      })
      .catch(() => {
        if (current()) {
          optionView(state, { status: 'failed' })
          if (current()) refreshIssues()
        }
      })
      .finally(() => {
        if (current()) state.request = null
      })
  }
  function controlIdentity(name: string): string {
    const entry = entryFor(name)
    const parts = name.split('.')
    for (const ancestor of entry.ancestors) {
      if (entryFor(ancestor).node.kind !== 'repeat') continue
      const position = ancestor.split('.').length
      const index = Number(name.split('.')[position])
      parts[position] = keys.get(ancestor)?.[index] ?? String(index)
    }
    const identity = `${String(generation.value)}:${parts.join('.')}`
    return identity
  }
  function refreshMetadata() {
    const originGeneration = generation.value
    const originRevision = valueRevision
    const paths = new Set(entries.value.map((entry) => entry.path))
    for (const [path, state] of [...options])
      if (!paths.has(path) && options.get(path) === state) {
        options.delete(path)
        stopOptions(state)
        if (generation.value !== originGeneration || valueRevision !== originRevision) return
      }
    for (const path of keys.keys()) if (!paths.has(path)) keys.delete(path)
    for (const path of focuses.keys()) if (!paths.has(path)) focuses.delete(path)
    for (const path of commits.keys()) if (!paths.has(path)) commits.delete(path)
    for (const path of pendingInputs.keys()) if (!paths.has(path)) pendingInputs.delete(path)
    publishPendingInputs()
    for (const { path, node } of entries.value) {
      if (node.kind === 'repeat') {
        const value = getFormValue(draft.value, path)
        if (!Array.isArray(value)) throw new TypeError('Expected repeat rows.')
        const previous = keys.get(path) ?? []
        keys.set(
          path,
          Object.freeze(value.map((_, index) => previous[index] ?? `row-${String(++nextKey)}`)),
        )
      } else if (node.kind !== 'group') loadOptions(path)
    }
    const liveIdentities = new Set(fields.value.map((field) => controlIdentity(field.name)))
    for (const identity of controlKeys.keys()) {
      if (!liveIdentities.has(identity)) controlKeys.delete(identity)
    }
  }
  function clearDescendants(path: string, next: I) {
    const originGeneration = generation.value
    const originRevision = valueRevision
    const child = (key: string) => key.startsWith(`${path}.`)
    if (entryFor(path).node.kind === 'group') {
      // A partial group replacement must not drop an unchanged child's pending
      // control buffer. Only repeated collections receive new row identities.
      for (const entry of entries.value)
        if (
          entry.node.kind === 'repeat' &&
          child(entry.path) &&
          !sameDraftValue(getFormValue(draft.value, entry.path), getFormValue(next, entry.path)) &&
          !entry.ancestors.some(
            (ancestor) => child(ancestor) && entryFor(ancestor).node.kind === 'repeat',
          )
        )
          clearDescendants(entry.path, next)
      return
    }
    for (const [key, state] of [...options])
      if (child(key) && options.get(key) === state) {
        options.delete(key)
        stopOptions(state)
        if (generation.value !== originGeneration || valueRevision !== originRevision) return
      }
    for (const entry of entries.value)
      if (child(entry.path)) controlKeys.delete(controlIdentity(entry.path))
    for (const key of keys.keys()) if (key === path || child(key)) keys.delete(key)
    for (const key of focuses.keys()) if (child(key)) focuses.delete(key)
    for (const key of commits.keys()) if (child(key)) commits.delete(key)
    for (const key of pendingInputs.keys()) if (child(key)) pendingInputs.delete(key)
    publishPendingInputs()
    const replacedRepeats = entries.value.filter(
      (entry) => entry.node.kind === 'repeat' && (entry.path === path || child(entry.path)),
    )
    issues.value = Object.freeze(
      issues.value.filter(
        (issue) => !replacedRepeats.some((entry) => issue.field?.startsWith(`${entry.path}.`)),
      ),
    )
    touched.value = Object.freeze(
      Object.fromEntries(Object.entries(touched.value).filter(([key]) => !child(key))),
    )
  }
  function relocateRows(
    path: string,
    previous: readonly string[],
    next: readonly string[],
    current: () => boolean,
  ) {
    const destination = (name: string): string | null => {
      if (!name.startsWith(`${path}.`)) return name
      const suffix = name.slice(path.length + 1)
      const boundary = suffix.indexOf('.')
      const index = Number(boundary === -1 ? suffix : suffix.slice(0, boundary))
      const identity = previous[index]
      const target = identity === undefined ? -1 : next.indexOf(identity)
      return target === -1
        ? null
        : `${path}.${String(target)}${boundary === -1 ? '' : suffix.slice(boundary)}`
    }
    function remap<T>(map: Map<string, T>, moved?: (item: T, target: string) => void) {
      const items = [...map]
      map.clear()
      for (const [name, item] of items) {
        const target = destination(name)
        if (target === null) continue
        moved?.(item, target)
        map.set(target, item)
      }
    }
    remap(focuses, (item, target) => {
      item.relocate(target)
    })
    remap(commits, (item, target) => {
      item.relocate(target)
    })
    remap(pendingInputs, (item, target) => {
      item.relocate(target)
    })
    remap(keys)
    // Detach every affected request before abort listeners can reenter. Paged
    // projections travel with the row, but their old path evidence is rechecked.
    const movedOptions = [...options].filter(([name]) => name.startsWith(`${path}.`))
    for (const [name] of movedOptions) options.delete(name)
    // Every detached owner must be stopped even if an abort listener replaces
    // the form. New owners created by that reentry are not in this snapshot.
    for (const [, state] of movedOptions) stopOptions(state)
    if (!current()) return
    for (const [name, state] of movedOptions) {
      const target = destination(name)
      if (target !== null && state.provider !== undefined) {
        state.name = target
        state.dependencies = undefined
        options.set(target, state)
      }
    }
    const nextTouched = Object.freeze(
      Object.fromEntries(
        Object.entries(touched.value).flatMap(([name, value]) => {
          const target = destination(name)
          return target === null ? [] : [[target, value]]
        }),
      ),
    )
    const nextIssues = Object.freeze(
      issues.value.flatMap((issue) => {
        if (issue.field === null) return [issue]
        const target = destination(issue.field)
        return target === null ? [] : [moveIssue(issue, target)]
      }),
    )
    return (current: () => boolean) => {
      touched.value = nextTouched
      if (current()) issues.value = nextIssues
    }
  }
  function mutationGuard(): UiFormMutationResult | null {
    return disposed.value
      ? 'disposed'
      : changing || (submission.value !== null && !committing)
        ? 'busy'
        : null
  }
  function applyValues(
    candidate: I,
    beforePublish?: (
      next: I,
      current: () => boolean,
    ) => ((current: () => boolean) => void) | undefined,
    notify = true,
    baseline?: I,
    current = () => true,
    identityChange = false,
  ): UiFormMutationResult {
    const blocked = mutationGuard()
    if (blocked !== null) return blocked
    const next = normalize(candidate)
    const changedValues = !sameDraftValue(next, draft.value)
    if (!changedValues && baseline === undefined && !identityChange) return 'unchanged'
    const originRevision = valueRevision
    const originGeneration = generation.value
    const active = () => current() && !disposed.value && generation.value === originGeneration
    const previous = values.value
    const oldEntries = entries.value
    const changed = Object.freeze(
      [
        ...new Set([...oldEntries, ...formEntries(schema.fields, next)].map((entry) => entry.path)),
      ].filter(
        (path) => !sameDraftValue(getFormValue(draft.value, path), getFormValue(next, path)),
      ),
    )
    if (!committing || (checkingItem !== undefined && identityChange)) cancelValidation()
    if (!active() || valueRevision !== originRevision) return 'blocked'
    const afterPublish =
      changedValues || identityChange
        ? beforePublish?.(next, () => active() && valueRevision === originRevision)
        : undefined
    if (!active() || valueRevision !== originRevision) return 'blocked'
    valueRevision += 1
    const publishedRevision = valueRevision
    record.value = {
      ...record.value,
      values: changedValues || identityChange ? next : draft.value,
      accepted: baseline === undefined ? accepted.value : cloneDraft(baseline),
    }
    const ownsPublication = () => active() && valueRevision === publishedRevision
    if (!ownsPublication()) return 'applied'
    afterPublish?.(ownsPublication)
    if (!ownsPublication()) return 'applied'
    revision.value += 1
    if (!ownsPublication()) return 'applied'
    notice.value = null
    if (!ownsPublication()) return 'applied'
    refreshMetadata()
    if (!ownsPublication()) return 'applied'
    refreshIssues()
    if (!ownsPublication()) return 'applied'
    if (validationVisible() && !committing) void check()
    if (!ownsPublication()) return 'applied'
    changing = true
    try {
      if (notify && changedValues)
        input.onChange?.(Object.freeze({ previous, values: values.value, changed }))
    } finally {
      changing = false
    }
    return 'applied'
  }
  function setValues(patch: Partial<I>): UiFormMutationResult {
    const blocked = mutationGuard()
    if (blocked !== null) return blocked
    const checked = cloneDraft(patch)
    return applyValues({ ...draft.value, ...checked }, (next) => {
      for (const node of schema.fields)
        if (
          (node.kind === 'repeat' || node.kind === 'group') &&
          Object.hasOwn(checked, node.name) &&
          !sameDraftValue(getFormValue(draft.value, node.name), getFormValue(next, node.name))
        )
          clearDescendants(node.name, next)
    })
  }

  function setValue(path: string, value: UiFormValue): UiFormMutationResult {
    const blocked = mutationGuard()
    if (blocked !== null) return blocked
    const entry = entryFor(path)
    const next = cloneDraft(draft.value)
    setFormValue(next, path, cloneDraft(value))
    return applyValues(next, (normalized) => {
      if (entry.node.kind === 'repeat' || entry.node.kind === 'group') {
        clearDescendants(path, normalized)
      }
    })
  }
  function replaceValues(value: I): UiFormMutationResult {
    const blocked = mutationGuard()
    if (blocked !== null) return blocked
    const next = normalize(value)
    const previous = values.value
    const changed = Object.freeze(
      [
        ...new Set([...entries.value, ...formEntries(schema.fields, next)].map(({ path }) => path)),
      ].filter(
        (path) => !sameDraftValue(getFormValue(draft.value, path), getFormValue(next, path)),
      ),
    )
    if (!hydrate({ draftId: draftId.value, values: next }, false)) return 'blocked'
    changing = true
    try {
      input.onChange?.(Object.freeze({ previous, values: values.value, changed }))
    } finally {
      changing = false
    }
    return 'applied'
  }
  function load(
    loader: (context: UiFormWorkContext) => UiFormSnapshot<I> | Promise<UiFormSnapshot<I>>,
    options: UiFormLoadOptions = {},
  ): Promise<UiFormLoadOutcome> {
    if (disposed.value) return Promise.resolve('cancelled')
    if (mutationGuard() !== null) return Promise.resolve('busy')
    const requestRevision = cancelLoad()
    if (requestRevision !== loadRevision) return Promise.resolve('cancelled')
    const work = createFormOperation<UiFormLoadOutcome>('cancelled')
    const replace = options.strategy === 'replace'
    loading = work
    loadState.value = 'loading'
    const current = () => loading === work && !disposed.value
    void Promise.resolve()
      .then(() => (current() ? loader({ signal: work.signal }) : null))
      .then((snapshot) => {
        if (!current()) return
        if (snapshot === null) throw new TypeError('A form snapshot is required.')
        if (!snapshot.draftId.trim()) throw new TypeError('Draft identity is required.')
        const baseline = normalize(snapshot.values)
        if (!replace && snapshot.draftId !== draftId.value && hasUnsavedChanges.value) {
          loading = null
          loadState.value = 'blocked'
          work.resolve('blocked')
          return
        }
        if (replace || snapshot.draftId !== draftId.value) {
          if (!hydrate({ draftId: snapshot.draftId, values: baseline }, true, true, current)) {
            if (current()) cancelLoad()
            return
          }
        } else {
          const next = cloneDraft(baseline)
          // Repeated collections have no server row identity. Protect the whole
          // collection rather than merge indexes and risk assigning edits to another row.
          for (const { node, path, ancestors } of entries.value) {
            if (
              node.kind === 'group' ||
              ancestors.some((name) => entryFor(name).node.kind === 'repeat')
            )
              continue
            if (
              !sameDraftValue(
                getFormValue(accepted.value, path),
                getFormValue(draft.value, path),
              ) ||
              pendingFields.value.some((name) => name === path || name.startsWith(`${path}.`))
            ) {
              const value = getFormValue(draft.value, path)
              if (value !== undefined) setFormValue(next, path, cloneDraft(value))
            }
          }
          const applied = applyValues(
            next,
            (normalized) => {
              for (const node of schema.fields)
                if (
                  (node.kind === 'group' || node.kind === 'repeat') &&
                  !sameDraftValue(
                    getFormValue(draft.value, node.name),
                    getFormValue(normalized, node.name),
                  )
                )
                  clearDescendants(node.name, normalized)
            },
            false,
            baseline,
            current,
          )
          if (applied === 'blocked') {
            if (current()) cancelLoad()
            return
          }
        }
        if (!current()) return
        loading = null
        loadState.value = 'ready'
        work.resolve('applied')
      })
      .catch(() => {
        if (!current()) return
        loading = null
        loadState.value = 'failed'
        work.resolve('failure')
      })
    return work.promise
  }
  function validateSchema(captured: I, scope?: string): readonly UiFormIssue[] {
    const result: UiFormIssue[] = []
    for (const { node, path } of entries.value) {
      if (node.kind !== 'repeat' || !inScope(path, scope) || nodeState(path).hidden) continue
      const rows = getFormValue(captured, path)
      if (!Array.isArray(rows)) continue
      const minimum = node.minItems
      const maximum = node.maxItems
      if (minimum !== undefined && rows.length < minimum)
        result.push({ field: path, message: () => input.copy.minItems(minimum) })
      if (maximum !== undefined && rows.length > maximum)
        result.push({ field: path, message: () => input.copy.maxItems(maximum) })
    }
    for (const config of fields.value) {
      if (!inScope(config.name, scope) || nodeState(config.name).hidden) continue
      const { group } = fieldFor(config.name)
      const value = getFormValue(captured, config.name)
      result.push(
        ...validateFormField(
          config,
          value,
          evaluateFormFlag(config.required, captured, group),
          input.copy,
          input.translate,
        ),
      )
    }
    for (const config of fields.value) {
      if (!inScope(config.name, scope) || nodeState(config.name).hidden) continue
      const value = getFormValue(captured, config.name)
      const state = options.get(config.name)
      if (state !== undefined) {
        const selected = Array.isArray(value)
          ? value
          : value === null || value === undefined
            ? []
            : [value]
        if (state.provider !== undefined) {
          if (new Set(selected).size !== selected.length)
            result.push({ field: config.name, message: input.copy.invalidValue })
          if (state.view.value.selected.some((item) => item.status === 'missing'))
            result.push({ field: config.name, message: state.missingMessage })
          if (
            state.view.value.selected.some((item) =>
              ['idle', 'loading', 'failed'].includes(item.status),
            )
          )
            result.push({ field: config.name, message: state.selectionMessage })
        } else if (state.view.value.status !== 'ready') {
          result.push({ field: config.name, message: state.statusMessage })
        } else if (
          new Set(selected).size !== selected.length ||
          selected.some((value) => !state.view.value.items.some((item) => item.value === value))
        ) {
          result.push({ field: config.name, message: input.copy.invalidValue })
        }
      }
    }
    return result
  }
  async function validateCaptured(
    captured: I,
    signal: AbortSignal,
    scope?: string,
  ): Promise<readonly UiFormIssue[]> {
    const result: UiFormIssue[] = []
    if (input.validation !== undefined) {
      const custom = await input.validation(freezeDraftValue(captured), { signal })
      if (signal.aborted) return []
      result.push(...custom.map((issue) => rememberIssue(issue, 'validation')))
    }
    // Source completion can change availability while custom validation awaits.
    return [...result, ...validateSchema(captured, scope)]
  }
  function publishFeedbackAttempt(scope?: string): void {
    feedbackScope.value = scope
    // Explicit validation and submit failures share the existing reveal/feedback attempt.
    summaryValueRevision = valueRevision
    summaryRevision.value += 1
    feedbackTarget.value = null
    feedbackValueRevision = valueRevision
    feedbackRevision.value += 1
  }
  function isFeedbackCurrent(revision: number): boolean {
    return (
      !disposed.value &&
      revision === feedbackRevision.value &&
      feedbackValueRevision === valueRevision &&
      checking.value === null &&
      submission.value === null
    )
  }
  function commitInputs(current: () => boolean, scope?: string): readonly UiFormIssue[] | null {
    const incomplete: UiFormIssue[] = []
    committing = true
    try {
      for (const name of [...commits.keys()]) {
        if (!inScope(name, scope)) continue
        const target = commits.get(name)
        if (target === undefined) continue
        const binding = field(name)
        if (!binding.hidden && !binding.disabled && !binding.readonly && !target.run())
          incomplete.push(
            rememberIssue({ field: name, message: input.copy.inputIncomplete }, 'input'),
          )
        if (!current()) return null
      }
      for (const name of pendingFields.value) {
        if (!inScope(name, scope)) continue
        const binding = field(name)
        if (
          !binding.hidden &&
          !binding.disabled &&
          !binding.readonly &&
          !incomplete.some((issue) => issue.field === name)
        )
          incomplete.push(
            rememberIssue({ field: name, message: input.copy.inputIncomplete }, 'input'),
          )
      }
    } finally {
      committing = false
    }
    return incomplete
  }
  function incompleteFeedback(
    incomplete: readonly UiFormIssue[],
    scope?: string,
    previous: readonly UiFormIssue[] = issues.value,
  ) {
    // Raw input has not been validated by the custom callback. Keep its prior
    // result, but do not diagnose the incomplete field's older canonical value.
    const blocked = new Set(incomplete.map((issue) => issue.field))
    return [
      ...previous.filter((issue) => issueMetadata.get(issue)?.origin === 'validation'),
      ...validateSchema(draft.value, scope).filter((issue) => !blocked.has(issue.field)),
      ...incomplete,
    ]
  }
  function check(explicit = false, item?: ItemValidationScope): Promise<ValidationOutcome> {
    if (disposed.value || (item !== undefined && !item.current()))
      return Promise.resolve('cancelled')
    if (submission.value !== null)
      return item === undefined ? submission.value.validation.promise : Promise.resolve('cancelled')
    if (checking.value !== null) {
      if (!explicit || (explicitCheck === checking.value && checkingItem?.prefix === item?.prefix))
        return checking.value.promise
      // An explicit request must commit its own controls, not reuse an automatic
      // or differently scoped snapshot. A replacement created on abort wins.
      const originRevision = revision.value
      const replacement = cancelValidation()
      if (originRevision !== revision.value) return Promise.resolve('cancelled')
      if (replacement !== null)
        return explicitCheck === replacement && checkingItem?.prefix === item?.prefix
          ? replacement.promise
          : Promise.resolve('cancelled')
      return check(explicit, item)
    }
    const work = createFormOperation<ValidationOutcome>('cancelled')
    const scope = item?.prefix
    let capturedRevision: number | undefined
    let incompleteInput = false
    checkingItem = item
    if (explicit) explicitCheck = work
    checking.value = work
    const current = () =>
      checking.value === work &&
      !disposed.value &&
      (item === undefined ||
        (item.current() && (capturedRevision === undefined || capturedRevision === revision.value)))
    void Promise.resolve()
      .then(async () => {
        if (!current()) return null
        if (explicit) {
          await nextTick()
          if (!current()) return null
          if (scope !== undefined) {
            touched.value = Object.freeze({
              ...touched.value,
              ...Object.fromEntries(
                entries.value
                  .filter(({ path }) => inScope(path, scope))
                  .map(({ path }) => [path, true]),
              ),
            })
            if (!current()) return null
          }
          const incomplete = commitInputs(current, scope)
          if (incomplete === null) return null
          capturedRevision = revision.value
          if (incomplete.length > 0) {
            incompleteInput = true
            return incompleteFeedback(incomplete, scope)
          }
        }
        return validateCaptured(cloneDraft(draft.value), work.signal, scope)
      })
      .then((result) => {
        if (!current() || result === null) return
        publishIssues(
          [
            ...issues.value.filter((issue) => {
              const origin = issueMetadata.get(issue)?.origin
              return origin === 'server' || (!explicit && origin === 'input')
            }),
            ...result,
          ],
          scope,
        )
        if (!current()) return
        if (
          item !== undefined &&
          !incompleteInput &&
          notice.value === input.copy.validationUnavailable
        )
          notice.value = null
        if (!current()) return
        const invalid = issues.value.some((issue) => inScope(issue.field, scope))
        if (invalid && explicitCheck === work) publishFeedbackAttempt(scope)
        if (!current()) return
        checkingItem = undefined
        checking.value = null
        work.resolve(invalid ? 'invalid' : 'valid')
      })
      .catch(() => {
        if (!current()) return
        if (item === undefined) {
          publishIssues([
            ...issues.value.filter((issue) => issue.message !== input.copy.validationUnavailable),
            rememberIssue({ field: null, message: input.copy.validationUnavailable }, 'validation'),
          ])
        } else {
          refreshIssues()
          if (!current()) return
          notice.value = input.copy.validationUnavailable
        }
        if (!current()) return
        if (explicitCheck === work) publishFeedbackAttempt(scope)
        if (!current()) return
        checkingItem = undefined
        checking.value = null
        work.resolve('invalid')
      })
      .finally(() => {
        if (checking.value === work) cancelValidation(work)
        else work.resolve('cancelled')
      })
    return work.promise
  }
  function validateItem(path: string, index: number) {
    if (disposed.value) return Promise.resolve('cancelled' as const)
    if (mutationGuard() !== null) return Promise.resolve('busy' as const)
    const { node } = entryFor(path)
    if (node.kind !== 'repeat') throw new TypeError('Expected a repeat group.')
    const state = nodeState(path)
    const key = keys.get(path)?.[index]
    if (
      !Number.isInteger(index) ||
      key === undefined ||
      state.hidden ||
      state.disabled ||
      state.readonly
    )
      return Promise.resolve('blocked' as const)
    const originGeneration = generation.value
    return check(true, {
      prefix: `${path}.${String(index)}.`,
      current: () => generation.value === originGeneration && keys.get(path)?.[index] === key,
    })
  }
  function hydrate(
    snapshot: UiFormSnapshot<I>,
    replaceBaseline = true,
    keepLoad = false,
    current = () => true,
  ): boolean {
    if (!snapshot.draftId.trim()) throw new TypeError('Draft identity is required.')
    const next = normalize(snapshot.values)
    const originRevision = ++valueRevision
    const active = () => current() && !disposed.value && valueRevision === originRevision
    cancelWork(keepLoad)
    if (!active()) return false
    if (!keepLoad && loading === null) loadState.value = 'idle'
    if (!active()) return false
    generation.value += 1
    if (!active()) return false
    touched.value = Object.freeze({})
    if (!active()) return false
    issues.value = []
    if (!active()) return false
    notice.value = null
    if (!active()) return false
    showAll.value = false
    if (!active()) return false
    keys.clear()
    controlKeys.clear()
    focuses.clear()
    commits.clear()
    pendingInputs.clear()
    publishPendingInputs()
    if (!active()) return false
    record.value = {
      draftId: snapshot.draftId,
      values: next,
      accepted: replaceBaseline ? cloneDraft(next) : accepted.value,
    }
    if (!active()) return false
    refreshMetadata()
    if (!active()) return false
    revision.value += 1
    return active()
  }
  function blur(name: string) {
    if (disposed.value || submission.value !== null) return
    fieldFor(name)
    touched.value = Object.freeze({ ...touched.value, [name]: true })
    const originGeneration = generation.value
    const previous = checking.value
    if (checkingItem !== undefined && !inScope(name, checkingItem.prefix))
      cancelValidation(previous)
    input.onBlur?.(Object.freeze({ field: name, values: values.value }))
    if (originGeneration === generation.value) void check()
  }
  function field(name: string): UiFormFieldBinding {
    fieldFor(name)
    const owner = Symbol(name)
    const originGeneration = generation.value
    const originIdentity = controlIdentity(name)
    const current = () =>
      !disposed.value &&
      originGeneration === generation.value &&
      entries.value.some((entry) => entry.path === name) &&
      controlIdentity(name) === originIdentity
    const relocate = (path: string) => {
      name = path
    }
    const binding: UiFormFieldBinding = {
      get name() {
        return name
      },
      get value() {
        return freezeDraftValue<unknown>(
          getFormValue(draft.value, name) ?? null,
        ) as UiFormReadonlyValue
      },
      get controlId() {
        return `${encodeURIComponent(input.formId)}:${encodeURIComponent(name)}:control`
      },
      get labelId() {
        return `${encodeURIComponent(input.formId)}:${encodeURIComponent(name)}:label`
      },
      get describedBy() {
        return [
          fieldFor(name).node.description === undefined ? '' : `${binding.controlId}-description`,
          binding.invalid ? `${binding.controlId}-errors` : '',
        ]
          .filter(Boolean)
          .join(' ')
      },
      get hidden() {
        return nodeState(name).hidden
      },
      get disabled() {
        return nodeState(name).disabled
      },
      get readonly() {
        return nodeState(name).readonly
      },
      get required() {
        const { node, group } = fieldFor(name)
        return evaluateFormFlag(node.required, draft.value, group)
      },
      get dirty() {
        return dirtyFields.value.includes(name)
      },
      get pendingInput() {
        return pendingFields.value.includes(name)
      },
      get invalid() {
        return binding.errors.length > 0
      },
      get errors() {
        return !binding.hidden && (showAll.value || touched.value[name])
          ? Object.freeze(
              issues.value.filter((issue) => issue.field === name).map((issue) => issue.message),
            )
          : []
      },
      get options() {
        return options.get(name)?.view.value.items ?? []
      },
      get optionsState() {
        return options.get(name)?.view.value.status ?? 'idle'
      },
      get selectedOptions() {
        const state = options.get(name)
        if (state?.provider !== undefined) return state.view.value.selected
        return Object.freeze(
          selectedValues(name).map((value): UiFormSelectedOption => {
            const option = state?.view.value.items.find((item) => item.value === value) ?? null
            return Object.freeze({
              value,
              option,
              status:
                state?.view.value.status === 'ready'
                  ? option === null
                    ? 'missing'
                    : 'ready'
                  : (state?.view.value.status ?? 'idle'),
            })
          }),
        )
      },
      get optionQuery() {
        return options.get(name)?.view.value.query ?? null
      },
      searchOptions(search) {
        const blocked = mutationGuard()
        if (blocked !== null) return blocked
        if (
          !current() ||
          typeof search !== 'string' ||
          binding.hidden ||
          binding.disabled ||
          binding.readonly
        )
          return 'blocked'
        const state = options.get(name)
        if (state?.provider === undefined) return 'blocked'
        const query = state.view.value.query
        if (query?.search === search && query.page === 1 && state.view.value.status === 'loading')
          return 'unchanged'
        const delay = state.view.value.status === 'idle' || query?.search === search ? 0 : 200
        queryOptions(state, search, 1, delay)
        return 'applied'
      },
      setOptionsPage(page) {
        const blocked = mutationGuard()
        if (blocked !== null) return blocked
        if (!current() || binding.hidden || binding.disabled || binding.readonly) return 'blocked'
        const state = options.get(name)
        const query = state?.view.value.query
        if (
          state?.provider === undefined ||
          query === null ||
          query === undefined ||
          !Number.isSafeInteger(page) ||
          page < 1
        )
          return 'blocked'
        if (page === query.page) return 'unchanged'
        if (state.view.value.status === 'idle' || state.view.value.status === 'loading')
          return 'blocked'
        if (page !== query.page - 1 && page !== query.page + 1) return 'blocked'
        if (page > query.page && (state.view.value.status !== 'ready' || !query.hasNext))
          return 'blocked'
        queryOptions(state, query.search, page)
        return 'applied'
      },
      setValue(value) {
        const blocked = mutationGuard()
        if (blocked !== null) return blocked
        if (!current() || binding.hidden || binding.disabled || binding.readonly) return 'blocked'
        const state = options.get(name)
        if (state !== undefined) {
          const selected = Array.isArray(value) ? value : value === null ? [] : [value]
          const retained = selectedValues(name)
          if (
            new Set(selected).size !== selected.length ||
            selected.some((candidate) =>
              state.provider !== undefined && retained.some((item) => item === candidate)
                ? false
                : state.view.value.status !== 'ready' ||
                  !state.view.value.items.some(
                    (item) => item.value === candidate && !item.disabled,
                  ),
            ) ||
            (state.provider === undefined && state.view.value.status !== 'ready')
          )
            return 'blocked'
        }
        return setValue(name, value)
      },
      blur: () => {
        if (current()) blur(name)
      },
      retryOptions: (target) => {
        if (disposed.value || submission.value !== null || !current() || binding.hidden) return
        const state = options.get(name)
        if (state?.provider !== undefined) {
          const epoch = state.epoch
          if (target !== 'query') resolveSelected(state, true)
          if (!ownsOptions(state, epoch)) return
          const query = state.view.value.query
          if (target !== 'selection' && query !== null && state.view.value.status !== 'idle')
            queryOptions(state, query.search, query.page, 0, true)
          if (ownsOptions(state, epoch)) refreshIssues()
        } else {
          cancelValidation()
          loadOptions(name, true)
          refreshIssues()
          if (validationVisible()) void check()
        }
      },
      setFocusTarget(focus) {
        if (focus === null || disposed.value) {
          if (focuses.get(name)?.owner === owner) focuses.delete(name)
        } else if (current()) focuses.set(name, { owner, run: focus, relocate })
      },
      setCommitTarget(commit) {
        if (commit === null || disposed.value) {
          if (commits.get(name)?.owner === owner) commits.delete(name)
        } else if (current()) commits.set(name, { owner, run: commit, relocate })
      },
      setPendingInput(pending) {
        if (!current()) return
        if (!pending && pendingInputs.get(name)?.owner !== owner) return
        const previous = !committing && checkingItem !== undefined ? checking.value : null
        if (pending) {
          pendingInputs.set(name, { owner, relocate })
          revision.value += 1
        } else if (pendingInputs.get(name)?.owner === owner) {
          pendingInputs.delete(name)
          revision.value += 1
          issues.value = Object.freeze(
            issues.value.filter(
              (issue) => issue.field !== name || issueMetadata.get(issue)?.origin !== 'input',
            ),
          )
        }
        publishPendingInputs()
        if (previous !== null) cancelValidation(previous)
      },
    }
    return Object.freeze(binding)
  }
  function changeRows(
    path: string,
    operation: 'add' | 'insert' | 'duplicate' | 'remove' | 'move',
    from = -1,
    to = -1,
  ): UiFormMutationResult {
    const blocked = mutationGuard()
    if (blocked !== null) return blocked
    const { node } = entryFor(path)
    if (node.kind !== 'repeat') throw new TypeError('Expected a repeat group.')
    const state = nodeState(path)
    if (state.hidden || state.disabled || state.readonly) return 'blocked'
    const currentRows = getFormValue(draft.value, path)
    if (!Array.isArray(currentRows)) throw new TypeError('Expected repeat rows.')
    if (operation === 'add') from = currentRows.length
    const inserting = operation === 'add' || operation === 'insert'
    if (
      !Number.isInteger(from) ||
      from < 0 ||
      from > currentRows.length ||
      (!inserting && from === currentRows.length)
    )
      return 'blocked'
    if (inserting || operation === 'duplicate') {
      if (node.maxItems !== undefined && currentRows.length >= node.maxItems) return 'blocked'
      if (
        operation === 'duplicate' &&
        [...pendingInputs.keys()].some((name) => name.startsWith(`${path}.${String(from)}.`))
      )
        return 'blocked'
    }
    const rows = cloneDraft(currentRows)
    const previousIds = keys.get(path) ?? []
    const rowIds = [...previousIds]
    if (inserting || operation === 'duplicate') {
      const index = inserting ? from : from + 1
      const row = inserting ? createFormValues(node.fields) : cloneDraft(rows[from])
      if (row === undefined) throw new TypeError('Unknown repeat row.')
      rows.splice(index, 0, row)
      rowIds.splice(index, 0, `row-${String(++nextKey)}`)
    } else if (operation === 'remove') {
      if (rows.length <= (node.minItems ?? 0)) return 'blocked'
      rows.splice(from, 1)
      rowIds.splice(from, 1)
    } else {
      if (!Number.isInteger(to) || to < 0 || to >= rows.length) return 'blocked'
      if (from === to) return 'unchanged'
      const row = rows.splice(from, 1)[0]
      const key = rowIds.splice(from, 1)[0]
      if (row === undefined || key === undefined) throw new TypeError('Unknown repeat row.')
      rows.splice(to, 0, row)
      rowIds.splice(to, 0, key)
    }
    const next = cloneDraft(draft.value)
    setFormValue(next, path, rows)
    try {
      return applyValues(
        next,
        (_, current) => {
          // Row registries and reactive metadata publish in one guarded mutation.
          // Record replacement may supersede it, but nested edits must wait.
          changing = true
          const publishRows =
            operation === 'add' ? undefined : relocateRows(path, previousIds, rowIds, current)
          if (current()) {
            keys.set(path, Object.freeze(rowIds))
            // Public paths must describe the new row collection when observed.
            return (current) => {
              publishPendingInputs()
              if (current()) publishRows?.(current)
            }
          }
        },
        true,
        undefined,
        undefined,
        // Equal-valued rows still change identity. Publish through the same guarded
        // owner so a synchronous observer's newer record always wins.
        operation === 'move',
      )
    } finally {
      changing = false
    }
  }

  function submit(): Promise<UiFormSubmitOutcome> {
    if (disposed.value) return Promise.resolve('cancelled')
    if (submission.value !== null) return submission.value.work.promise
    const requestRevision = cancelLoad()
    if (requestRevision !== loadRevision) return Promise.resolve('cancelled')
    const attempt = {
      work: createFormOperation<UiFormSubmitOutcome>('cancelled'),
      validation: createFormOperation<ValidationOutcome>('cancelled'),
      stage: 'validating' as 'validating' | 'submitting',
    }
    const previousIssues = issues.value
    submission.value = attempt
    cancelValidation()
    showAll.value = true
    issues.value = []
    notice.value = null
    const current = () => submission.value === attempt && !disposed.value
    const invalid = () => {
      publishFeedbackAttempt()
      attempt.validation.resolve('invalid')
      attempt.work.resolve('invalid')
    }
    void Promise.resolve().then(async () => {
      await nextTick()
      if (!current()) return
      try {
        const incomplete = commitInputs(current)
        if (incomplete === null) return
        if (incomplete.length > 0) {
          publishIssues(incompleteFeedback(incomplete, undefined, previousIssues))
          invalid()
          return
        }
        const captured = cloneDraft(draft.value)
        const result = await validateCaptured(captured, attempt.work.signal)
        if (!current()) return
        publishIssues(result)
        if (issues.value.length > 0) {
          invalid()
          return
        }
        attempt.validation.resolve('valid')
        attempt.stage = 'submitting'
        triggerRef(submission)
        try {
          const submitted =
            input.onSubmit === undefined
              ? { status: 'success' as const }
              : await input.onSubmit(cloneDraft(captured), { signal: attempt.work.signal })
          if (!current()) return
          const result: unknown = submitted
          if (
            result === null ||
            typeof result !== 'object' ||
            !('status' in result) ||
            (result.status !== 'success' && result.status !== 'failure')
          ) {
            throw new TypeError('Invalid submit result.')
          }
          if (submitted.status === 'failure') {
            if (typeof submitted.message !== 'function') {
              throw new TypeError('Submit failure message must be a function.')
            }
            publishIssues((submitted.issues ?? []).map((issue) => rememberIssue(issue, 'server')))
            if (issues.value.length > 0) {
              publishFeedbackAttempt()
            }
            notice.value = submitted.message
            attempt.work.resolve('failure')
            return
          }
          const snapshot = submitted.initial ?? { draftId: draftId.value, values: captured }
          const next = normalize(snapshot.values)
          if (!snapshot.draftId.trim()) throw new TypeError('Draft identity is required.')
          submission.value = null
          if (!hydrate({ draftId: snapshot.draftId, values: next })) {
            attempt.work.resolve('cancelled')
            return
          }
          notice.value = input.copy.submitSucceeded
          attempt.work.resolve('success')
        } catch {
          if (current()) {
            notice.value = input.copy.submitFailed
            attempt.work.resolve('failure')
          }
        }
      } catch {
        if (current()) {
          publishIssues([{ field: null, message: input.copy.validationUnavailable }])
          invalid()
        }
      } finally {
        if (current()) submission.value = null
      }
    })
    return attempt.work.promise
  }
  function nodeLabel(name: string): string {
    const entry = entryFor(name)
    return [...entry.ancestors, name]
      .map((path) => {
        const { node } = entryFor(path)
        const label = form.text(node.label)
        if (node.kind !== 'repeat' || path === name) return label
        const position = Number(name.split('.')[path.split('.').length]) + 1
        return `${label} ${String(position)}`
      })
      .join(' / ')
  }
  function canFocusField(name: string): boolean {
    return (
      !disposed.value &&
      entries.value.some((entry) => entry.path === name) &&
      !nodeState(name).hidden &&
      !nodeState(name).disabled &&
      focuses.has(name)
    )
  }
  function focusField(name: string): boolean {
    if (
      disposed.value ||
      !entries.value.some((entry) => entry.path === name) ||
      nodeState(name).hidden ||
      nodeState(name).disabled
    )
      return false
    const focus = focuses.get(name)
    if (focus === undefined) return false
    focus.run()
    return true
  }
  const form: UiFormController<I> = Object.freeze({
    formId: input.formId,
    text: (value: string) => (value === '' ? '' : (input.translate?.(value) ?? value)),
    schema,
    copy: input.copy,
    get fields() {
      return fields.value
    },
    draftId: computed(() => draftId.value),
    values,
    dirty,
    dirtyFields,
    pendingFields: computed(() => {
      const current = pendingFields.value.filter((name) =>
        entries.value.some((entry) => entry.path === name),
      )
      return current.length === pendingFields.value.length
        ? pendingFields.value
        : Object.freeze(current)
    }),
    hasPendingInput,
    hasUnsavedChanges,
    revision: computed(() => revision.value),
    loadState: computed(() => loadState.value),
    touched: computed(() => {
      const current = Object.entries(touched.value).filter(([name]) =>
        entries.value.some((entry) => entry.path === name),
      )
      return current.length === Object.keys(touched.value).length
        ? touched.value
        : Object.freeze(Object.fromEntries(current))
    }),
    issues: computed(() =>
      Object.freeze(
        issues.value.filter(
          (issue) =>
            (issue.field === null ||
              (entries.value.some((entry) => entry.path === issue.field) &&
                !nodeState(issue.field).hidden)) &&
            (showAll.value || (issue.field !== null && touched.value[issue.field])),
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
    getValues: () => cloneDraft(draft.value),
    getInitial: () => ({ draftId: draftId.value, values: cloneDraft(accepted.value) }),
    getValue(path: string) {
      entryFor(path)
      const value = getFormValue(draft.value, path)
      return value === undefined ? undefined : cloneDraft(value)
    },
    setValues,
    replaceValues,
    setValue,
    load,
    blur,
    field,
    nodeState,
    nodeLabel,
    canFocusField,
    focusField,
    submit,
    validateItem,
    rowKeys(path: string) {
      const entry = entryFor(path)
      if (entry.node.kind !== 'repeat') throw new TypeError('Expected a repeat group.')
      return keys.get(path) ?? []
    },
    addItem: (path: string) => changeRows(path, 'add'),
    insertItem: (path: string, index: number) => changeRows(path, 'insert', index),
    duplicateItem: (path: string, index: number) => changeRows(path, 'duplicate', index),
    removeItem: (path: string, index: number) => changeRows(path, 'remove', index),
    moveItem: (path: string, from: number, to: number) => changeRows(path, 'move', from, to),
    validate() {
      if (!disposed.value) showAll.value = true
      return check(true)
    },
    reset() {
      if (!disposed.value) {
        if (hydrate({ draftId: draftId.value, values: accepted.value }))
          input.onReset?.(values.value)
      }
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
      pendingInputs.clear()
      publishPendingInputs()
      keys.clear()
      controlKeys.clear()
    },
  })
  registerFormPresentation(form, {
    generation: computed(() => generation.value),
    feedbackRevision: computed(() => feedbackRevision.value),
    feedbackScope: computed(() => feedbackScope.value),
    feedbackTarget: computed(() => feedbackTarget.value),
    isFeedbackCurrent,
    requestFeedback(name, revision) {
      if (
        !isFeedbackCurrent(revision) ||
        !inScope(name, feedbackScope.value) ||
        !issues.value.some((issue) => issue.field === name)
      )
        return
      const state = nodeState(name)
      const identity = controlKeys.get(controlIdentity(name))
      if (identity === undefined || state.hidden || state.disabled || state.readonly) return
      feedbackTarget.value = { identity, revision }
    },
    summaryRevision: computed(() => summaryRevision.value),
    nodeLabel,
    nodeControlId(name) {
      entryFor(name)
      return `${encodeURIComponent(input.formId)}:${encodeURIComponent(name)}:control`
    },
    setNodeFocusTarget(name, owner, focus) {
      if (focus === null || disposed.value) {
        if (focuses.get(name)?.owner === owner) focuses.delete(name)
        return
      }
      entryFor(name)
      focuses.set(name, { owner, run: focus, relocate: () => undefined })
    },
    fieldIdentity(name) {
      const identity = controlIdentity(name)
      let key = controlKeys.get(identity)
      if (key === undefined) {
        key = Symbol(identity)
        controlKeys.set(identity, key)
      }
      return key
    },
    isSummaryCurrent: (revision) =>
      revision === summaryRevision.value && summaryValueRevision === valueRevision,
    canFocusField,
    focusField,
  })
  refreshMetadata()
  if (getCurrentScope() !== undefined)
    onScopeDispose(() => {
      form.dispose()
    })
  return form
}
