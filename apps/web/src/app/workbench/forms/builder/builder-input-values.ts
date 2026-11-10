/** Preserve the exact text while validating the value represented by an editor control. */
export function parseBuilderNumberInput(raw: string, integer = false, required = false) {
  const input = raw.trim()
  const value = input === '' ? null : Number(input)
  const invalid =
    (required && value === null) ||
    (value !== null &&
      (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/iu.test(input) ||
        !Number.isFinite(value) ||
        (integer && !Number.isInteger(value))))
  return { value, invalid }
}

export function invalidBuilderDateInput(raw: string): boolean {
  const date = new Date(`${raw}T00:00:00.000Z`)
  return (
    raw !== '' &&
    (!/^\d{4}-\d{2}-\d{2}$/u.test(raw) ||
      raw.startsWith('0000-') ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== raw)
  )
}
