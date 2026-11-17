import type {
  UiChartTimeRangeValue,
  UiChartTimeSample,
  UiG2ChartAccess,
  UiG2ChartFrame,
  UiG2ChartOptions,
} from '@platform/ui'
import {
  computed,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  watch,
} from 'vue'
import { createScopedApiRead } from '../api/scoped-api-read'
import type { AccessBoundary, AccessRequest, BoundAccessRequest } from '../access/access-contract'
import { executeGuardedAction, type GuardedAction } from '../access/guarded-action'
import {
  observeNativeRequirement,
  type NativeAccessRequirement,
} from '../access/native-requirement'
import {
  bindGuardedChartSpec,
  chartValue,
  intersectChartScope,
  type ChartDatum,
} from './guarded-chart-spec'

type Context = BoundAccessRequest['context']
type Row = Readonly<Record<string, unknown>>
type Report =
  | {
      readonly kind: 'records'
      readonly completeness: 'complete' | 'partial'
      readonly rows: readonly Row[]
    }
  | { readonly kind: 'aggregate'; readonly rows: readonly Row[] }
type Reader = typeof createScopedApiRead<Report>
type ReadStatus = Awaited<ReturnType<ReturnType<Reader>['run']>>
type Status = ReadStatus | 'idle' | 'pending' | 'partial'
type Permit = NonNullable<ReturnType<ReturnType<typeof observeNativeRequirement>['permit']>>

interface ChartInput {
  readonly access: AccessBoundary
  readonly view: NativeAccessRequirement
  /** Only static public metadata; G2 mark keys select the declared series. */
  readonly options: UiG2ChartOptions
  readonly series: Readonly<
    Record<
      string,
      {
        readonly fields: readonly string[]
        /** Totals, percentages, bins and comparisons require complete input or a host aggregate. */
        readonly input: 'window' | 'complete' | 'aggregate'
      }
    >
  >
  readonly records?: {
    readonly domain: string
    readonly resource: string
    readonly id: (row: Row) => string | undefined
    readonly read?: string
    readonly fields?: Readonly<Record<string, string>>
  }
  readonly source:
    | { readonly kind: 'local'; read(context: Context): Report }
    | { readonly kind: 'remote'; readonly read: Parameters<Reader>[1] }
  readonly time?: {
    readonly permitted: (context: Context) => UiChartTimeRangeValue | undefined
    readonly field: string
    readonly overview: string
  }
  readonly output?: {
    readonly image?: NativeAccessRequirement
    readonly data?: {
      readonly requirement: NativeAccessRequirement
      readonly fields: readonly string[]
    }
  }
}

interface Presentation extends UiG2ChartFrame {
  readonly context: Context
  readonly series: ReadonlyMap<string, readonly ChartDatum[] | undefined>
  readonly recordIds: ReadonlySet<string>
  readonly timeline?: {
    readonly bounds: UiChartTimeRangeValue
    readonly overview: readonly UiChartTimeSample[]
  }
  readonly scope: 'complete' | 'window' | 'aggregate'
}

function exactRequest(
  input: ChartInput,
  action: string,
  id: string,
  fieldPath?: string,
): NativeAccessRequirement {
  const domain = input.records?.domain
  const resource = input.records?.resource
  if (!domain || !resource) throw new TypeError('Controlled chart records need a resource.')
  const shared = { resource, domain, action, recordId: id }
  const request: AccessRequest =
    fieldPath === undefined
      ? { ...shared, kind: 'record' }
      : { ...shared, kind: 'field', fieldPath }
  return { scope: input.view.scope, operator: 'all', requests: [request] }
}

function readStatus(
  status: ReturnType<ReturnType<typeof observeNativeRequirement>['read']>['status'],
): Status {
  if (status === 'deny') return 'denied'
  if (status === 'unsupported') return status
  if (status === 'configuration-error') return status
  if (status === 'evaluation-failed' || status === 'identity-failed') return 'failed'
  return 'unresolved'
}

export function useGuardedChart(input: ChartInput) {
  const { access, records, source, time } = input
  const presentation = shallowRef<Presentation>()
  const status = shallowRef<Status>('idle')
  const range = shallowRef<UiChartTimeRangeValue>()
  const outputRevision = shallowRef(0)
  let active = true
  let requestedRange: UiChartTimeRangeValue | undefined
  let request = 0
  let epoch = 0
  let pendingRelease: (() => void) | undefined
  let releaseFrame: (() => void) | undefined
  const operation = new Map<string, ReturnType<typeof observeNativeRequirement>>()

  function context(): Context | undefined {
    const state = access.readContext()
    return state.status === 'ready' ? state.snapshot : undefined
  }

  function retire(): void {
    epoch++
    presentation.value = undefined
    releaseFrame?.()
    releaseFrame = undefined
  }

  function clear(): void {
    request++
    pendingRelease?.()
    pendingRelease = undefined
    retire()
    range.value = undefined
    status.value = 'idle'
  }

  function resetOutputs(): void {
    for (const check of operation.values()) check.dispose()
    operation.clear()
    outputRevision.value++
  }

  function checkOutput(): void {
    resetOutputs()
    if (!active || !context()) return
    const requirements = { image: input.output?.image, data: input.output?.data?.requirement }
    for (const [name, definition] of Object.entries(requirements)) {
      if (!definition) continue
      const check = observeNativeRequirement(access, definition, () => {
        outputRevision.value++
        queueMicrotask(() => {
          if (operation.get(name) === check && active)
            void check.evaluate().finally(() => {
              outputRevision.value++
            })
        })
      })
      operation.set(name, check)
      void check.evaluate().finally(() => {
        outputRevision.value++
      })
    }
  }

  function outputPermit(name: 'image' | 'data'): (() => boolean) | undefined {
    void outputRevision.value
    const owner = presentation.value
    const permit = operation.get(name)?.permit()
    return owner?.isCurrent() && permit
      ? () => presentation.value === owner && owner.isCurrent() && permit.isCurrent()
      : undefined
  }

  async function refresh(selected?: UiChartTimeRangeValue): Promise<Status> {
    if (!active) return 'stale'
    if (selected !== undefined) requestedRange = Object.freeze([...selected] as const)
    const ticket = ++request
    pendingRelease?.()
    pendingRelease = undefined
    const origin = context()
    if (!origin) {
      const unavailable = access.readContext().status
      status.value =
        unavailable === 'unconfigured'
          ? 'configuration-error'
          : unavailable === 'identity-failed'
            ? 'failed'
            : 'unresolved'
      return status.value
    }
    const startEpoch = epoch
    const current = () =>
      active && request === ticket && context() === origin && startEpoch === epoch
    const checks = new Set<ReturnType<typeof observeNativeRequirement>>()
    const permits: Permit[] = []
    let reader: ReturnType<Reader> | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    const released = shallowRef(false)
    const release = (): void => {
      if (released.value) return
      released.value = true
      if (timeout !== undefined) clearTimeout(timeout)
      for (const check of checks) check.dispose()
      checks.clear()
      reader?.dispose()
    }
    pendingRelease = release
    function invalidate(): void {
      if (released.value) return
      const published = release === releaseFrame
      const evaluating = release === pendingRelease
      if (published || evaluating) clear()
      if (source.kind === 'local' && active && context() === origin) {
        const generation = request
        queueMicrotask(() => {
          if (generation === request) void refresh()
        })
      }
    }
    function observe(definition: NativeAccessRequirement) {
      const check = observeNativeRequirement(access, definition, invalidate)
      checks.add(check)
      return check
    }
    function settle(value: Status): Status {
      if (current()) status.value = value
      return current() ? value : 'stale'
    }
    try {
      status.value = 'pending'
      const view = observe(input.view)
      await view.evaluate()
      if (!current()) return 'stale'
      const viewPermit = view.permit()
      if (!viewPermit) return settle(readStatus(view.read().status))
      permits.push(viewPermit)
      const permitted = time?.permitted(origin)
      const bounded = permitted && intersectChartScope(requestedRange ?? permitted, permitted)
      if (time && !bounded) {
        retire()
        range.value = undefined
        status.value = 'empty'
        return 'empty'
      }
      let report: Report | undefined
      let receipt: string | undefined
      if (source.kind === 'local') report = source.read(origin)
      else {
        reader = createScopedApiRead(access, {
          ...source.read,
          clearDerived: () => {
            if (!released.value) invalidate()
            return undefined
          },
        })
        const result = await reader.run(bounded ? { from: bounded[0], to: bounded[1] } : {})
        if (!current()) return 'stale'
        const response = reader.state.value
        if (response.status === 'empty') {
          retire()
          status.value = 'empty'
          return 'empty'
        }
        if (response.status !== 'ready') return settle(result)
        receipt = response.requestId
        report = reader.consume(receipt)
      }
      if (!report || !current()) return settle('failed')
      const seenIds = new Set<string>()
      if (report.kind === 'records' && records) {
        for (const row of report.rows) {
          const id = records.id(row)
          if (!id || seenIds.has(id)) return settle('unsupported')
          seenIds.add(id)
        }
      }
      const configuredFields = [
        ...new Set(Object.values(input.series).flatMap(({ fields }) => fields)),
      ]
      let fieldFailure: Status | undefined
      const outcomes = await Promise.all(
        report.rows.map(async (row) => {
          const id = report.kind === 'records' ? records?.id(row) : undefined
          const allowed: Record<string, ChartDatum[string]> = {}
          if (id && records?.read) {
            const check = observe(exactRequest(input, records.read, id))
            await check.evaluate()
            if (!current()) return
            const permit = check.permit()
            if (!permit) return { unavailable: readStatus(check.read().status) }
            permits.push(permit)
          }
          await Promise.all(
            configuredFields.map(async (path) => {
              const action = id ? records?.fields?.[path] : undefined
              if (id && action) {
                const check = observe(exactRequest(input, action, id, path))
                await check.evaluate()
                if (!current()) return
                const permit = check.permit()
                if (!permit) {
                  const denied = readStatus(check.read().status)
                  if (denied !== 'denied') fieldFailure = denied
                  return
                }
                permits.push(permit)
              }
              const value = chartValue(row, path)
              if (value !== undefined)
                Object.defineProperty(allowed, path, { value, enumerable: true })
            }),
          )
          return { id, row: Object.freeze(allowed) }
        }),
      )
      if (!current() || !permits.every((permit) => permit.isCurrent())) return 'stale'
      const recordFailure = outcomes.find(
        (outcome) => outcome?.unavailable && outcome.unavailable !== 'denied',
      )?.unavailable
      const failure = recordFailure ?? fieldFailure
      if (failure) {
        retire()
        status.value = failure
        return failure
      }
      const valid = outcomes.flatMap((outcome) => (outcome?.row ? [outcome] : []))
      const visible =
        time && bounded
          ? valid.filter(({ row }) => {
              const at = row[time.field]
              return typeof at === 'number' && at >= bounded[0] && at <= bounded[1]
            })
          : valid
      const completeRange = !bounded || (permitted[0] === bounded[0] && permitted[1] === bounded[1])
      const recordIds = new Set<string>()
      const mapped = new Map(
        Object.entries(input.series).map(([key, series]) => {
          const candidates = visible.flatMap(({ id, row }) => {
            const leaves = series.fields.flatMap((field) => {
              const value = row[field]
              return value === undefined ? [] : [[field, value] as const]
            })
            return leaves.length === series.fields.length
              ? [{ id, data: Object.freeze(Object.fromEntries(leaves)) }]
              : []
          })
          const complete =
            report.kind === 'records' &&
            report.completeness === 'complete' &&
            completeRange &&
            candidates.length === valid.length
          const applicable =
            series.input === 'aggregate'
              ? report.kind === 'aggregate' && candidates.length === visible.length
              : report.kind === 'records' && (series.input === 'window' || complete)
          if (!applicable) return [key, undefined] as const
          for (const { id } of candidates) if (id) recordIds.add(id)
          return [key, candidates.map(({ data }) => data)] as const
        }),
      )
      const frameEpoch = epoch
      const isCurrent = () =>
        !released.value &&
        active &&
        epoch === frameEpoch &&
        context() === origin &&
        permits.every((permit) => permit.isCurrent()) &&
        (receipt === undefined || reader?.isCurrent(receipt) === true)
      const options = bindGuardedChartSpec(input.options, mapped, isCurrent)
      if (!options) {
        retire()
        status.value = 'unsupported'
        return 'unsupported'
      }
      const samples =
        time && bounded
          ? valid
              .flatMap(({ row }) => {
                const at = row[time.field]
                const value = row[time.overview]
                return typeof at === 'number' &&
                  Number.isSafeInteger(at) &&
                  typeof value === 'number' &&
                  at >= permitted[0] &&
                  at <= permitted[1]
                  ? [{ at, value }]
                  : []
              })
              .sort((a, b) => a.at - b.at)
          : []
      const previous = releaseFrame
      releaseFrame = release
      pendingRelease = undefined
      presentation.value = Object.freeze({
        options,
        context: origin,
        isCurrent,
        series: mapped,
        recordIds,
        scope:
          report.kind === 'aggregate'
            ? 'aggregate'
            : report.completeness === 'complete' && completeRange
              ? 'complete'
              : 'window',
        ...(samples.length && permitted
          ? { timeline: { bounds: permitted, overview: samples } }
          : {}),
      })
      previous?.()
      range.value = bounded
      const expiresAt = permits.reduce(
        (deadline, permit) => Math.min(deadline, permit.expiresAt),
        origin.expiresAt ?? Infinity,
      )
      function expire(): void {
        if (Number.isFinite(expiresAt))
          timeout = setTimeout(
            () => {
              if (!isCurrent()) invalidate()
              else expire()
            },
            Math.min(2_147_483_647, Math.max(1, expiresAt - Date.now())),
          )
      }
      expire()
      return settle(
        mapped.size > 0 && [...mapped.values()].some((rows) => rows === undefined)
          ? 'partial'
          : visible.length === 0
            ? 'empty'
            : 'ready',
      )
    } catch (error) {
      return settle(error instanceof TypeError ? 'configuration-error' : 'failed')
    } finally {
      if (pendingRelease === release) pendingRelease = undefined
      if (releaseFrame !== release) release()
    }
  }

  const view: UiG2ChartAccess = {
    read: () => presentation.value,
    permitImage: () => outputPermit('image'),
  }

  const timeline = computed(() => {
    const frame = presentation.value
    if (!frame?.isCurrent() || !frame.timeline) return
    const current = () => presentation.value === frame && frame.isCurrent()
    return Object.freeze({
      ...frame.timeline,
      isCurrent: current,
      select: (value: UiChartTimeRangeValue) =>
        current() ? refresh(value) : Promise.resolve('stale' as const),
    })
  })

  function exportData(key: string) {
    const current = outputPermit('data')
    const rows = presentation.value?.series.get(key)
    const fields = input.output?.data?.fields
    if (!current || !rows || !fields) return
    return Object.freeze({
      rows: Object.freeze(
        rows.map((row) =>
          Object.freeze(
            Object.fromEntries(
              fields.flatMap((field) => (Object.hasOwn(row, field) ? [[field, row[field]]] : [])),
            ),
          ),
        ),
      ),
      scope: presentation.value?.scope,
      isCurrent: current,
    })
  }

  async function drilldown<Result>(
    id: string,
    action: GuardedAction<Result>,
    invocation: Parameters<typeof executeGuardedAction<Result>>[2],
  ) {
    const frame = presentation.value
    if (!frame?.isCurrent() || !frame.recordIds.has(id)) return []
    const bound = () => presentation.value === frame && frame.isCurrent() && frame.recordIds.has(id)
    return await executeGuardedAction(
      access,
      {
        ...action,
        isTargetCurrent: (target) => target.id === id && bound() && action.isTargetCurrent(target),
      },
      invocation,
    )
  }

  watch(
    context,
    () => {
      clear()
      requestedRange = undefined
      checkOutput()
      if (active && source.kind === 'local' && context()) void refresh()
    },
    { immediate: true, flush: 'sync' },
  )
  function suspend(): void {
    active = false
    clear()
    requestedRange = undefined
    resetOutputs()
  }
  if (getCurrentInstance()) {
    onDeactivated(suspend)
    onActivated(() => {
      if (active) return
      active = true
      checkOutput()
      if (source.kind === 'local') void refresh()
    })
  }
  onScopeDispose(suspend)

  return {
    view,
    status,
    range: computed(() => range.value),
    timeline,
    refresh,
    exportData,
    drilldown,
  }
}
