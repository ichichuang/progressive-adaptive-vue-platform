import {
  parseUiTableSchema,
  useUiTable,
  type UiTableAccess,
  type UiTableAccessState,
  type UiTableInput,
  type UiTableKey,
  type UiTablePage,
  type UiTableQuery,
  type UiTableReadonlyRecord,
  type UiTableRecord,
  type UiTableBatchAccess,
} from '@platform/ui'
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { createScopedApiRead } from '../api/scoped-api-read'
import type {
  AccessBoundary,
  BoundAccessRequest,
  AccessRequest,
  AccessState,
} from '../access/access-contract'
import {
  observeNativeRequirement,
  type NativeAccessRequirement,
} from '../access/native-requirement'
import {
  executeGuardedAction,
  type ActionTarget,
  type GuardedAction,
} from '../access/guarded-action'

interface GuardedTableInput extends Omit<
  UiTableInput,
  'access' | 'transport' | 'rows' | 'columnPreferenceStorage'
> {
  readonly access: AccessBoundary
  readonly domain: string
  readonly resource: string
  readonly scope: NativeAccessRequirement['scope']
  readonly recordAction: string
  /** Optional record-level decisions for row controls, using the same resource and identity. */
  readonly recordActions?: readonly string[]
  readonly target: (record: UiTableReadonlyRecord) => ActionTarget | undefined
  readonly fields?: {
    readonly selection: 'listed' | 'all'
    /** Column metadata is a separate decision from reading a field on an individual row. */
    readonly paths: Readonly<
      Record<string, { readonly column: NativeAccessRequirement; readonly read?: string }>
    >
    readonly filters?: Readonly<Record<string, readonly string[]>>
    readonly summary?: Readonly<Record<string, readonly string[]>>
  }
  readonly data:
    | {
        readonly kind: 'local'
        readonly read: NativeAccessRequirement
        rows(context: AccessContextSnapshot): readonly UiTableReadonlyRecord[]
      }
    | {
        readonly kind: 'remote'
        readonly read: Parameters<typeof createScopedApiRead<UiTablePage>>[1]
        query(
          query: UiTableQuery,
        ): Parameters<ReturnType<typeof createScopedApiRead<UiTablePage>>['run']>[0]
      }
  readonly output?: Partial<
    Record<
      'csv' | 'copy',
      {
        readonly requirement: NativeAccessRequirement
        readonly fields: readonly string[]
      }
    >
  >
}

type Check = ReturnType<typeof observeNativeRequirement>
type AccessContextSnapshot = BoundAccessRequest['context']
interface RecordChecks {
  readonly target: ActionTarget
  readonly read: Check
  readonly fields: ReadonlyMap<string, Check>
  readonly actions: ReadonlyMap<string, Check>
}

function valueAt(
  record: UiTableReadonlyRecord,
  path: string,
): UiTableReadonlyRecord[string] | undefined {
  let value: unknown = record
  for (const segment of path.split('.')) {
    if (value === null || typeof value !== 'object' || !Object.hasOwn(value, segment)) return
    value = (value as Record<string, unknown>)[segment]
  }
  return value as UiTableReadonlyRecord[string]
}

function safePath(path: string): boolean {
  return path
    .split('.')
    .every((part) => part && !['__proto__', 'prototype', 'constructor'].includes(part))
}

function writePath(
  record: UiTableRecord,
  path: string,
  value: UiTableReadonlyRecord[string] | undefined,
): void {
  const segments = path.split('.')
  const leaf = segments.pop()
  if (!leaf || value === undefined) return
  let group = record
  for (const segment of segments) {
    group[segment] ??= {}
    group = group[segment] as UiTableRecord
  }
  group[leaf] = value as UiTableRecord[string]
}

function unavailable(status: AccessState['status'] | 'unconfigured'): UiTableAccessState {
  if (status === 'deny') return 'denied'
  if (status === 'configuration-error' || status === 'unconfigured') return 'configuration-error'
  if (status === 'evaluation-failed' || status === 'identity-failed') return 'failed'
  if (status === 'pending' || status === 'initializing' || status === 'transitioning')
    return 'pending'
  return 'unresolved'
}

/** Own scoped data/requirements; useUiTable remains the query and presentation authority. */
export function useGuardedTable(input: GuardedTableInput) {
  const { access, data, fields } = input
  const schema = parseUiTableSchema(input.schema)
  if (schema.source.kind !== data.kind)
    throw new TypeError('Table schema and scoped source disagree.')
  const paths = [
    ...new Set([
      schema.rowKey,
      ...schema.columns.map(({ key }) => key),
      ...Object.keys(fields?.paths ?? {}),
    ]),
  ]
  if (
    paths.some((path) => !safePath(path)) ||
    (fields && Object.hasOwn(fields.paths, schema.rowKey))
  )
    throw new TypeError('The table row key is metadata and field paths must be safe.')
  if (fields && paths.some((path) => paths.some((other) => other.startsWith(path + '.'))))
    throw new TypeError('Controlled table fields must use non-overlapping leaf paths.')
  const revision = shallowRef(0)
  const records = new Map<UiTableKey, RecordChecks>()
  const checks = new Set<Check>()
  const metadata = new Map<string, Check>()
  const output = new Map<'csv' | 'copy', Check>()
  const localRead = shallowRef<Check>()
  let owner: AccessContextSnapshot | undefined
  let expiry: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let sourceGeneration = 0
  const context = () => {
    const current = access.readContext()
    return current.status === 'ready' ? current.snapshot : undefined
  }
  const allowed = (check: Check | undefined) => check?.permit()?.isCurrent() === true
  const remote =
    data.kind === 'remote'
      ? createScopedApiRead(access, {
          ...data.read,
          clearDerived() {
            releaseRecords()
            revision.value++
            data.read.clearDerived?.()
            return undefined
          },
        })
      : undefined
  function arm() {
    clearTimeout(expiry)
    if (disposed) return
    const deadline = Math.min(
      owner?.expiresAt ?? Infinity,
      ...[...checks].map((check) => check.permit()?.expiresAt ?? Infinity),
    )
    if (Number.isFinite(deadline) && deadline > Date.now())
      expiry = setTimeout(
        () => {
          revision.value++
          arm()
        },
        Math.min(2_147_483_647, deadline - Date.now()),
      )
  }
  function observe(requirement: NativeAccessRequirement): Check {
    const evaluate = () => {
      if (checks.has(check))
        void check.evaluate().then(() => {
          if (!checks.has(check)) return
          revision.value++
          arm()
        })
    }
    const check = observeNativeRequirement(access, requirement, () => {
      revision.value++
      queueMicrotask(evaluate)
    })
    checks.add(check)
    return check
  }
  function release(check: Check): void {
    checks.delete(check)
    check.dispose()
  }
  function releaseRecords(): void {
    for (const record of records.values()) {
      release(record.read)
      for (const check of record.fields.values()) release(check)
      for (const check of record.actions.values()) release(check)
    }
    records.clear()
  }
  function exact(
    target: ActionTarget,
    action: string,
    fieldPath?: string,
  ): NativeAccessRequirement {
    const common = { domain: input.domain, resource: input.resource, action, recordId: target.id }
    const request: AccessRequest =
      fieldPath === undefined
        ? { ...common, kind: 'record' }
        : { ...common, kind: 'field', fieldPath }
    return { operator: 'all', scope: input.scope, requests: [request] }
  }
  function keyOf(record: UiTableReadonlyRecord): UiTableKey | undefined {
    const key = valueAt(record, schema.rowKey)
    return (typeof key === 'string' && key.length > 0) ||
      (typeof key === 'number' && Number.isFinite(key))
      ? key
      : undefined
  }
  async function bindRows(
    rows: readonly UiTableReadonlyRecord[],
    origin: AccessContextSnapshot,
  ): Promise<boolean> {
    if (context() !== origin) return false
    releaseRecords()
    const targets = new Set<string>()
    const checksForRows: Check[] = []
    const visit = (row: UiTableReadonlyRecord): boolean => {
      const key = keyOf(row)
      const target = input.target(row)
      if (key === undefined || !target?.id || targets.has(target.id) || records.has(key))
        return false
      targets.add(target.id)
      const captured = Object.freeze({ ...target })
      const read = observe(exact(captured, input.recordAction))
      const actions = new Map(
        input.recordActions?.map((action) => [action, observe(exact(captured, action))]),
      )
      const fieldChecks = new Map<string, Check>()
      for (const [path, config] of Object.entries(fields?.paths ?? {}))
        if (config.read !== undefined)
          fieldChecks.set(path, observe(exact(captured, config.read, path)))
      records.set(key, { target: captured, read, fields: fieldChecks, actions })
      checksForRows.push(read, ...fieldChecks.values(), ...actions.values())
      if (!schema.tree) return true
      const children = valueAt(row, schema.tree.childrenKey ?? 'children')
      return (
        !Array.isArray(children) ||
        children.every(
          (child) =>
            child !== null &&
            typeof child === 'object' &&
            !Array.isArray(child) &&
            visit(child as UiTableReadonlyRecord),
        )
      )
    }
    if (!rows.every(visit)) {
      releaseRecords()
      return false
    }
    await Promise.all(checksForRows.map((check) => check.evaluate()))
    arm()
    return !disposed && context() === origin
  }
  const column = (path: string) => {
    void revision.value
    if (owner === undefined || context() !== owner) return false
    const configured = fields?.paths[path]
    return configured
      ? allowed(metadata.get(path))
      : fields?.selection !== 'all' || path === schema.rowKey
  }
  const queryColumn = (key: string) => {
    if (!column(key)) return false
    if (!fields?.paths[key]) return true
    return [...records.values()].every(
      (entry) => !allowed(entry.read) || allowed(entry.fields.get(key)),
    )
  }
  const usableColumns = (required: readonly string[]) => required.every(queryColumn)
  const filter = (path: string) => {
    if (fields === undefined) return owner !== undefined && context() === owner
    const keyword = schema.keywordSearch
    if (keyword?.parameter === path) return usableColumns(keyword.fields)
    const local = schema.localFilters?.find(({ parameter }) => parameter === path)
    const keys =
      fields.filters?.[path] ??
      (local ? [local.field] : schema.columns.some(({ key }) => key === path) ? [path] : undefined)
    return keys !== undefined && keys.length !== 0 && usableColumns(keys)
  }
  function row(record: UiTableReadonlyRecord): UiTableReadonlyRecord | undefined {
    void revision.value
    const key = keyOf(record)
    const entry = key === undefined ? undefined : records.get(key)
    if (
      context() !== owner ||
      !entry ||
      !allowed(entry.read) ||
      (data.kind === 'local' && !allowed(localRead.value))
    )
      return
    if (!fields && !schema.tree) return record
    const result: UiTableRecord = fields ? {} : ({ ...record } as UiTableRecord)
    if (schema.tree) Reflect.deleteProperty(result, schema.tree.childrenKey ?? 'children')
    for (const path of fields ? paths : []) {
      const decision = fields?.paths[path]
      if (
        path === schema.rowKey ||
        (column(path) && (decision === undefined || allowed(entry.fields.get(path))))
      )
        writePath(result, path, valueAt(record, path))
    }
    return result
  }
  const missingIdentity = shallowRef(false)
  const state = (): UiTableAccessState => {
    const current = access.readContext()
    if (current.status !== 'ready') return unavailable(current.status)
    if (missingIdentity.value) return 'unresolved'
    const recordStates = [...records.values()].map(({ read }) => read.read().status)
    const noRecords = !recordStates.includes('allow') && recordStates.length > 0
    const recordUnavailable = noRecords
      ? unavailable(recordStates.find((status) => status !== 'deny') ?? 'deny')
      : undefined
    if (data.kind === 'local') {
      const check = localRead.value
      if (!allowed(check)) return unavailable(check?.read().status ?? 'pending')
      return recordUnavailable ?? 'ready'
    }
    const status = remote?.state.value.status
    if (status === 'consumed') return recordUnavailable ?? 'ready'
    if (
      status === 'ready' ||
      status === 'empty' ||
      status === 'denied' ||
      status === 'configuration-error' ||
      status === 'failed' ||
      status === 'pending'
    )
      return status
    return 'unresolved'
  }
  const table = useUiTable({
    schema,
    ...(input.sortComparators === undefined ? {} : { sortComparators: input.sortComparators }),
    ...(input.translate === undefined ? {} : { translate: input.translate }),
    ...(input.filters === undefined ? {} : { filters: input.filters }),
    ...(input.onSelectionChange === undefined
      ? {}
      : { onSelectionChange: input.onSelectionChange }),
    immediate: false,
    access: {
      context,
      revision: () => revision.value,
      state,
      column,
      queryColumn,
      filter,
      row,
      summary: (path) =>
        fields === undefined ||
        (fields.summary?.[path] !== undefined && usableColumns(fields.summary[path])),
      ...(data.kind === 'local'
        ? { local: () => (owner && allowed(localRead.value) ? data.rows(owner) : []) }
        : {}),
      ...(data.kind === 'remote'
        ? ({
            async read(query, signal) {
              const origin = context()
              if (!origin || !remote) return
              const outcome = await remote.run(data.query(query), signal)
              const receipt = remote.state.value
              if (signal.aborted || origin !== context()) return
              if (outcome === 'empty' && receipt.status === 'empty')
                return {
                  page: { rows: [], total: 0 },
                  isCurrent: () => remote.isCurrent(receipt.requestId),
                }
              if (outcome !== 'ready' || receipt.status !== 'ready') return
              const bound = await bindRows(receipt.data.rows, origin)
              if (!remote.isCurrent(receipt.requestId)) return
              missingIdentity.value = !bound
              if (!bound) return
              const requestId = receipt.requestId
              const page = remote.consume(requestId)
              if (page === undefined) return
              // A new page can narrow the readable query fields even with unchanged column grants.
              revision.value++
              return { page, isCurrent: () => remote.isCurrent(requestId) }
            },
          } satisfies Pick<UiTableAccess, 'read'>)
        : {}),
      output(kind) {
        const permit = output.get(kind)?.permit()
        const config = input.output?.[kind]
        if (permit === undefined || config === undefined) return
        return { fields: config.fields, isCurrent: permit.isCurrent }
      },
    },
  })
  const stop = watch(
    [
      context,
      () => {
        const current = context()
        return data.kind === 'local' && current ? data.rows(current) : undefined
      },
    ],
    async ([current, local], [previous]) => {
      const generation = ++sourceGeneration
      if (current !== previous) {
        for (const check of checks) release(check)
        records.clear()
        metadata.clear()
        output.clear()
        localRead.value = undefined
        owner = current
        if (current) {
          for (const [path, config] of Object.entries(fields?.paths ?? {}))
            metadata.set(path, observe(config.column))
          if (data.kind === 'local') localRead.value = observe(data.read)
          for (const kind of ['csv', 'copy'] as const) {
            const requirement = input.output?.[kind]?.requirement
            if (requirement) output.set(kind, observe(requirement))
          }
        }
      }
      missingIdentity.value = false
      if (!current) return
      if (current !== previous) await Promise.all([...checks].map((check) => check.evaluate()))
      if (context() !== current || generation !== sourceGeneration) return
      if (local) {
        const bound = await bindRows(local, current)
        if (context() !== current || generation !== sourceGeneration) return
        missingIdentity.value = !bound
      }
      revision.value++
      arm()
      if (data.kind === 'remote' && input.immediate !== false) await table.refresh()
    },
    { flush: 'sync', immediate: true },
  )
  function* presented(rows: readonly UiTableReadonlyRecord[]): Generator<UiTableReadonlyRecord> {
    for (const row of rows) {
      yield row
      if (!schema.tree) continue
      const children = valueAt(row, schema.tree.childrenKey ?? 'children')
      if (Array.isArray(children)) yield* presented(children as UiTableReadonlyRecord[])
    }
  }
  const visible = computed(() => new Set(presented(table.rows.value)))
  function target(record: UiTableReadonlyRecord): ActionTarget | undefined {
    if (!visible.value.has(record)) return
    const key = keyOf(record)
    const entry = key === undefined ? undefined : records.get(key)
    return entry && row(record) ? entry.target : undefined
  }
  const visibleTargets = computed(
    () =>
      new Map(
        [...visible.value].flatMap((record) => {
          const item = target(record)
          return item ? [[item.id, item] as const] : []
        }),
      ),
  )
  function can(record: UiTableReadonlyRecord, action: string): boolean {
    const key = keyOf(record)
    const entry = key === undefined ? undefined : records.get(key)
    return (
      entry !== undefined &&
      target(record) !== undefined &&
      (action === input.recordAction || allowed(entry.actions.get(action)))
    )
  }
  async function execute<Result>(
    action: GuardedAction<Result>,
    invocation: Parameters<typeof executeGuardedAction<Result>>[2],
  ) {
    const origin = context()
    const original = visibleTargets.value
    return executeGuardedAction(
      access,
      {
        ...action,
        apply(value, command) {
          action.apply?.(value, command)
          return undefined
        },
        isTargetCurrent(candidate) {
          const target = original.get(candidate.id)
          return (
            origin !== undefined &&
            origin === context() &&
            target !== undefined &&
            target === visibleTargets.value.get(candidate.id) &&
            target.revision === candidate.revision &&
            target.idempotencyKey === candidate.idempotencyKey &&
            action.isTargetCurrent(candidate)
          )
        },
      },
      invocation,
    )
  }
  function batch(
    actions: Readonly<
      Record<string, { readonly action: GuardedAction<unknown>; readonly mode?: 'partial' }>
    >,
  ): UiTableBatchAccess {
    return {
      async execute({ action, rows, signal, confirm }) {
        const configured = actions[action.id]
        const targets = rows.map(target)
        if (!configured || targets.some((candidate) => candidate === undefined))
          if (configured?.mode !== 'partial')
            return targets.map((candidate) => ({
              targetId: candidate?.id ?? '',
              status: candidate === undefined ? 'invalid-target' : 'not-dispatched',
            }))
        const results = await execute(configured.action, {
          targets: targets.filter(
            (candidate): candidate is ActionTarget => candidate !== undefined,
          ),
          signal,
          confirm,
          ...(configured.mode === undefined ? {} : { mode: configured.mode }),
        })
        const byTarget = new Map(results.map((result) => [result.targetId, result]))
        return targets.map((candidate) =>
          candidate
            ? (byTarget.get(candidate.id) ?? { targetId: candidate.id, status: 'not-dispatched' })
            : { targetId: '', status: 'invalid-target' },
        )
      },
    }
  }
  onScopeDispose(() => {
    disposed = true
    stop()
    clearTimeout(expiry)
    for (const check of checks) release(check)
    records.clear()
    remote?.dispose()
  }, true)
  return { table, target, can, execute, batch }
}
