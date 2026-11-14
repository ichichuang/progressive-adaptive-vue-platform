import { isUiDateOnly, type UiDateTimeContext } from '../../date-time/date-time'

type DatePart = 'year' | 'month' | 'day'
type DateSegment = { readonly part: DatePart } | { readonly literal: string }
const tokens = { year: 'yyyy', month: 'MM', day: 'dd' } as const
function segments(context: UiDateTimeContext | undefined): readonly DateSegment[] {
  const choice = context?.dateFormat ?? 'locale'
  const order: readonly DatePart[] =
    choice === 'dmy'
      ? ['day', 'month', 'year']
      : choice === 'mdy'
        ? ['month', 'day', 'year']
        : ['year', 'month', 'day']
  if (choice !== 'locale' || !context) {
    return order.flatMap((part, index) =>
      index === 0
        ? [{ part }]
        : [{ literal: choice === 'dmy' || choice === 'mdy' ? '/' : '-' }, { part }],
    )
  }
  return new Intl.DateTimeFormat(context.locale, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: 'gregory',
    numberingSystem: 'latn',
  })
    .formatToParts(new Date('2006-11-22T00:00:00Z'))
    .flatMap((part): DateSegment[] => {
      if (part.type === 'year' || part.type === 'month' || part.type === 'day')
        return [{ part: part.type }]
      return part.type === 'literal' ? [{ literal: part.value }] : []
    })
}
/** Naive display format only. Its value-format always retains the ISO model contract. */
export function naiveDateFormat(context: UiDateTimeContext | undefined): string {
  return segments(context)
    .map((segment) =>
      'part' in segment ? tokens[segment.part] : `'${segment.literal.replaceAll("'", "''")}'`,
    )
    .join('')
}
export function naiveTimeFormat(context: UiDateTimeContext | undefined): string {
  return context?.hourCycle === 'h12' ? 'hh:mm:ss a' : 'HH:mm:ss'
}
export function formatDateInput(value: string, context: UiDateTimeContext | undefined): string {
  if (!isUiDateOnly(value)) return value
  const parts = { year: value.slice(0, 4), month: value.slice(5, 7), day: value.slice(8, 10) }
  return segments(context)
    .map((segment) => ('part' in segment ? parts[segment.part] : segment.literal))
    .join('')
}
export function parseDateInput(
  value: string,
  context: UiDateTimeContext | undefined,
): string | null {
  const text = value.trim()
  if (isUiDateOnly(text)) return text
  const layout = segments(context)
  const expression = layout
    .map((segment) =>
      'part' in segment
        ? segment.part === 'year'
          ? '(\\d{4})'
          : '(\\d{1,2})'
        : segment.literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'),
    )
    .join('')
  const match = new RegExp(`^${expression}$`, 'u').exec(text)
  if (!match) return null
  const parts: Partial<Record<DatePart, string>> = {}
  let index = 1
  for (const segment of layout) {
    if ('part' in segment)
      parts[segment.part] = (match[index++] ?? '').padStart(segment.part === 'year' ? 4 : 2, '0')
  }
  const date = `${parts.year ?? ''}-${parts.month ?? ''}-${parts.day ?? ''}`
  return isUiDateOnly(date) ? date : null
}
