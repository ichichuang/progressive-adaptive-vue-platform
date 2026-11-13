/** Display policy only. Locale never implies a time zone; models retain their original values. */
export interface UiDateTimeContext {
  readonly locale: string
  readonly timeZone: string
  readonly hourCycle?: 'h12' | 'h23'
}
export type UiDateTimePreset = 'date' | 'time' | 'datetime' | 'long-date'
export type UiDateTimeValue =
  | { readonly kind: 'instant'; readonly value: string }
  | {
      readonly kind: 'timestamp'
      readonly value: number
      readonly unit: 'seconds' | 'milliseconds'
    }
  | { readonly kind: 'date'; readonly value: string }
  | { readonly kind: 'time'; readonly value: string }
export type UiDateTimeColumnFormat =
  | { readonly kind: 'date' | 'time' | 'instant'; readonly preset?: UiDateTimePreset }
  | {
      readonly kind: 'timestamp'
      readonly unit: 'seconds' | 'milliseconds'
      readonly preset?: UiDateTimePreset
    }
function validValue(value: unknown): value is UiDateTimeValue {
  if (typeof value !== 'object' || value === null || !('kind' in value) || !('value' in value))
    return false
  if (value.kind === 'timestamp')
    return (
      typeof value.value === 'number' &&
      Number.isFinite(value.value) &&
      'unit' in value &&
      (value.unit === 'seconds' || value.unit === 'milliseconds')
    )
  return (
    (value.kind === 'date' || value.kind === 'time' || value.kind === 'instant') &&
    typeof value.value === 'string'
  )
}
function validInstantValue(
  value: unknown,
): value is Extract<UiDateTimeValue, { kind: 'instant' | 'timestamp' }> {
  return validValue(value) && (value.kind === 'instant' || value.kind === 'timestamp')
}
function validContext(value: unknown): value is UiDateTimeContext {
  if (typeof value !== 'object' || value === null || !('locale' in value) || !('timeZone' in value))
    return false
  return (
    typeof value.locale === 'string' &&
    typeof value.timeZone === 'string' &&
    (!('hourCycle' in value) ||
      value.hourCycle === undefined ||
      value.hourCycle === 'h12' ||
      value.hourCycle === 'h23')
  )
}
function validPreset(value: unknown): value is UiDateTimePreset | undefined {
  return (
    value === undefined ||
    value === 'date' ||
    value === 'time' ||
    value === 'datetime' ||
    value === 'long-date'
  )
}
const formatters = new Map<string, Intl.DateTimeFormat>()
const relatives = new Map<string, Intl.RelativeTimeFormat>()
function remember<T>(cache: Map<string, T>, key: string, create: () => T): T {
  const existing = cache.get(key)
  if (existing !== undefined) return existing
  const value = create()
  if (cache.size >= 64) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
  return value
}
export function isUiDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function isUiTimeOnly(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(value)
}
function instant(
  value: Extract<UiDateTimeValue, { kind: 'instant' | 'timestamp' }>,
): number | null {
  if (value.kind === 'timestamp') {
    const ms = value.value * (value.unit === 'seconds' ? 1000 : 1)
    return Number.isFinite(ms) && Number.isFinite(new Date(ms).getTime()) ? ms : null
  }
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/u.test(
      value.value,
    ) ||
    !isUiDateOnly(value.value.slice(0, 10))
  )
    return null
  const ms = Date.parse(value.value)
  return Number.isFinite(ms) ? ms : null
}
/** Invalid input or policy returns null, never a guessed time, date, locale or zone. */
export function formatUiDateTime(
  value: UiDateTimeValue,
  context: UiDateTimeContext,
  preset?: UiDateTimePreset,
): string | null {
  try {
    if (!validValue(value) || !validContext(context) || !validPreset(preset)) return null
    if (
      !context.locale.trim() ||
      !context.timeZone.trim() ||
      Intl.DateTimeFormat.supportedLocalesOf(context.locale).length === 0
    )
      return null
    // Validate even for date-only/time-only, without applying a zone to those civil values.
    remember(
      formatters,
      JSON.stringify(['policy', context.locale, context.timeZone]),
      () => new Intl.DateTimeFormat(context.locale, { timeZone: context.timeZone }),
    )
    const kind = value.kind
    const style = preset ?? (kind === 'date' ? 'date' : kind === 'time' ? 'time' : 'datetime')
    if (kind === 'date' && style !== 'date' && style !== 'long-date') return null
    if (kind === 'time' && style !== 'time') return null
    const ms =
      kind === 'date'
        ? isUiDateOnly(value.value)
          ? Date.parse(`${value.value}T00:00:00Z`)
          : null
        : kind === 'time'
          ? isUiTimeOnly(value.value)
            ? Date.parse(
                `2000-01-01T${value.value.length === 5 ? `${value.value}:00` : value.value}Z`,
              )
            : null
          : instant(value)
    if (ms === null) return null
    const options: Intl.DateTimeFormatOptions = {
      timeZone: kind === 'date' || kind === 'time' ? 'UTC' : context.timeZone,
    }
    if (style !== 'time') {
      options.year = 'numeric'
      options.month = style === 'long-date' ? 'long' : '2-digit'
      options.day = '2-digit'
    }
    if (style === 'time' || style === 'datetime') {
      options.hour = '2-digit'
      options.minute = '2-digit'
      options.second = '2-digit'
      if (context.hourCycle !== undefined) options.hourCycle = context.hourCycle
    }
    return remember(
      formatters,
      JSON.stringify([context.locale, options]),
      () => new Intl.DateTimeFormat(context.locale, options),
    ).format(ms)
  } catch {
    return null
  }
}
/** Pure relative formatting. The caller owns and disposes any reactive clock. */
export function formatUiRelativeTime(
  value: Extract<UiDateTimeValue, { kind: 'instant' | 'timestamp' }>,
  context: UiDateTimeContext,
  now: number,
): string | null {
  if (
    !validInstantValue(value) ||
    typeof now !== 'number' ||
    !Number.isFinite(now) ||
    formatUiDateTime(value, context) === null
  )
    return null
  const ms = instant(value)
  if (ms === null) return null
  const seconds = (ms - now) / 1000
  const magnitude = Math.abs(seconds)
  const [unit, divisor]: [Intl.RelativeTimeFormatUnit, number] =
    magnitude < 60
      ? ['second', 1]
      : magnitude < 3600
        ? ['minute', 60]
        : magnitude < 86400
          ? ['hour', 3600]
          : ['day', 86400]
  try {
    return remember(
      relatives,
      context.locale,
      () => new Intl.RelativeTimeFormat(context.locale, { numeric: 'auto' }),
    ).format(Math.round(seconds / divisor), unit)
  } catch {
    return null
  }
}
