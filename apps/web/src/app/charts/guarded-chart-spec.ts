import type { UiChartTimeRangeValue, UiG2ChartOptions } from '@platform/ui'
import { z } from 'zod'

type ChartValue = string | number | boolean | null
export type ChartDatum = Readonly<Record<string, ChartValue>>

const reportRows = z.array(z.record(z.string(), z.json()))
export const guardedChartReportSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('records'),
    completeness: z.enum(['complete', 'partial']),
    rows: reportRows,
  }),
  z.strictObject({ kind: z.literal('aggregate'), rows: reportRows }),
])

export function intersectChartScope(
  range: UiChartTimeRangeValue,
  permitted: UiChartTimeRangeValue,
): UiChartTimeRangeValue | undefined {
  const start = Math.max(range[0], permitted[0])
  const end = Math.min(range[1], permitted[1])
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start < end
    ? Object.freeze([start, end] as const)
    : undefined
}

export function chartValue(
  row: Readonly<Record<string, unknown>>,
  path: string,
): ChartValue | undefined {
  let value: unknown = row
  for (const part of path.split('.')) {
    if (
      !part ||
      ['__proto__', 'prototype', 'constructor'].includes(part) ||
      value === null ||
      typeof value !== 'object' ||
      !Object.hasOwn(value, part)
    )
      return
    value = (value as Readonly<Record<string, unknown>>)[part]
  }
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
    return value
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  )
}

/** Protected specs are static public metadata with explicitly bound, independent marks. */
export function bindGuardedChartSpec(
  source: UiG2ChartOptions,
  series: ReadonlyMap<string, readonly ChartDatum[] | undefined>,
  isCurrent: () => boolean,
): UiG2ChartOptions | undefined {
  const privateKeys = new Set([
    'data',
    'join',
    'mount',
    'container',
    '__proto__',
    'constructor',
    'prototype',
  ])
  function metadata(value: unknown): unknown {
    if (typeof value === 'function') {
      const callback = value as (this: unknown, ...args: unknown[]) => unknown
      return function (this: unknown, ...args: unknown[]): unknown {
        return isCurrent() ? callback.apply(this, args) : undefined
      }
    }
    if (Array.isArray(value)) return value.map(metadata)
    if (!record(value)) {
      if (value !== null && typeof value === 'object')
        throw new TypeError('Controlled chart metadata must use plain G2 options.')
      return value
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (privateKeys.has(key) || key === 'children')
          throw new TypeError('Controlled chart metadata cannot supply data or an external mount.')
        return [key, metadata(item)]
      }),
    )
  }

  const seen = new Set<string>()
  function node(value: unknown): Record<string, unknown> | undefined {
    if (!record(value)) throw new TypeError('Controlled chart nodes must be static G2 options.')
    const { children, ...rest } = value
    const result = metadata(rest) as Record<string, unknown>
    if (children !== undefined) {
      if (
        !Array.isArray(children) ||
        !['view', 'spaceLayer', 'spaceFlex', 'timingKeyframe'].includes(String(result['type']))
      )
        throw new TypeError('Unsupported controlled chart composition.')
      const descendants = children.map(node).filter((child) => child !== undefined)
      return descendants.length === 0 ? undefined : { ...result, children: descendants }
    }
    const key = result['key']
    if (
      typeof key !== 'string' ||
      !series.has(key) ||
      seen.has(key) ||
      typeof result['type'] !== 'string'
    )
      throw new TypeError('Every controlled chart mark must have a unique configured series key.')
    seen.add(key)
    const rows = series.get(key)
    return rows === undefined ? undefined : { ...result, data: rows }
  }
  const options = node(source)
  if (seen.size !== series.size) throw new TypeError('A controlled series has no matching mark.')
  return options
}
