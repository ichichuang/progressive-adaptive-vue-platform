import type {
  UiG2ChartDateTimeChannels,
  UiG2ChartOptions,
} from '../../components/g2-chart-contracts'
import {
  formatUiDateTime,
  type UiDateTimeContext,
  type UiDateTimeColumnFormat,
  type UiDateTimePreset,
} from '../../date-time/date-time'

type RecordValue = Record<string, unknown>
function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function format(
  value: unknown,
  policy: UiDateTimeColumnFormat,
  context: UiDateTimeContext,
  preset?: UiDateTimePreset,
): string {
  if (policy.kind === 'instant' && value instanceof Date) {
    return (
      formatUiDateTime(
        { kind: 'timestamp', value: value.getTime(), unit: 'milliseconds' },
        context,
        preset,
      ) ?? '—'
    )
  }
  const result =
    policy.kind === 'timestamp'
      ? typeof value === 'number' || value instanceof Date
        ? formatUiDateTime(
            {
              kind: 'timestamp',
              value:
                value instanceof Date
                  ? value.getTime() / (policy.unit === 'seconds' ? 1000 : 1)
                  : value,
              unit: policy.unit,
            },
            context,
            preset,
          )
        : null
      : typeof value === 'string'
        ? formatUiDateTime({ kind: policy.kind, value }, context, preset)
        : null
  return result ?? '—'
}
/** Opt-in display projection; does not infer temporal meaning or change data/scale values. */
export function projectG2DateTime(
  options: UiG2ChartOptions,
  channels: UiG2ChartDateTimeChannels | undefined,
  context: UiDateTimeContext | undefined,
): UiG2ChartOptions {
  if (!channels || !context) return options
  function project(
    value: unknown,
    inheritedEncode: RecordValue = {},
    inheritedAxis?: unknown,
    inheritedTooltip?: unknown,
    inheritedScale: RecordValue = {},
  ): unknown {
    if (!record(value)) return value
    const encode = record(value['encode'])
      ? { ...inheritedEncode, ...value['encode'] }
      : inheritedEncode
    const scales = record(value['scale'])
      ? { ...inheritedScale, ...value['scale'] }
      : inheritedScale
    const node: RecordValue = { ...value }
    const axisPolicy = value['axis'] === undefined ? inheritedAxis : value['axis']
    const tooltipPolicy = value['tooltip'] === undefined ? inheritedTooltip : value['tooltip']
    if (axisPolicy !== undefined) node['axis'] = axisPolicy
    if (tooltipPolicy !== undefined) node['tooltip'] = tooltipPolicy
    for (const channel of ['x', 'y'] as const) {
      const policy = channels?.[channel]
      const field = encode[channel]
      const scale = scales[channel]
      if (!policy || typeof field !== 'string' || !context) continue
      if (node['axis'] !== false && node['axis'] !== null) {
        const axes = record(node['axis']) ? node['axis'] : {}
        const axis = axes[channel]
        if (
          axis !== false &&
          axis !== null &&
          (!record(axis) || axis['labelFormatter'] === undefined)
        ) {
          node['axis'] = {
            ...axes,
            [channel]: {
              ...(record(axis) ? axis : {}),
              labelFormatter: (datum: unknown) => {
                // Time emits Date ticks in its own calendar (local by default, or UTC).
                // Recover that civil date before formatting; the display timezone must
                // never move a date-only tick to the previous or following day.
                if (
                  policy.kind === 'date' &&
                  record(scale) &&
                  scale['type'] === 'time' &&
                  datum instanceof Date &&
                  Number.isFinite(datum.getTime())
                ) {
                  const utc = scale['utc'] === true
                  const year = utc ? datum.getUTCFullYear() : datum.getFullYear()
                  const month = (utc ? datum.getUTCMonth() : datum.getMonth()) + 1
                  const day = utc ? datum.getUTCDate() : datum.getDate()
                  const civil = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  return format(civil, policy, context, policy.preset)
                }
                return format(datum, policy, context, policy.preset)
              },
            },
          }
        }
      }
      const suppliedTooltip = node['tooltip']
      // Native G2 shortcuts are caller-owned: strings/arrays/functions and individual
      // item objects are not component option records. Preserve them verbatim.
      if (
        suppliedTooltip !== undefined &&
        (!record(suppliedTooltip) ||
          ['field', 'channel', 'value', 'name', 'color', 'valueFormatter'].some((key) =>
            Object.hasOwn(suppliedTooltip, key),
          ))
      )
        continue
      const tooltip = record(node['tooltip']) ? node['tooltip'] : {}
      const next = { ...tooltip }
      if (channel === 'x' && tooltip['title'] === undefined) {
        next['title'] = (datum: unknown) =>
          record(datum) ? format(datum[field], policy, context) : '—'
      }
      if (Array.isArray(tooltip['items'])) {
        next['items'] = tooltip['items'].map((item: unknown) => {
          if (item === field)
            return { field, valueFormatter: (datum: unknown) => format(datum, policy, context) }
          if (record(item) && item['field'] === field && item['valueFormatter'] === undefined)
            return { ...item, valueFormatter: (datum: unknown) => format(datum, policy, context) }
          return item
        })
      }
      node['tooltip'] = next
    }
    if (Array.isArray(value['children']))
      node['children'] = value['children'].map((child: unknown) =>
        project(child, encode, axisPolicy, tooltipPolicy, scales),
      )
    return node
  }
  return project(options) as UiG2ChartOptions
}
