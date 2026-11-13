import type { UiFormAttachment } from './form-contracts'

export function isFormAttachment(value: unknown): value is UiFormAttachment {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return (
    Object.keys(item).every((key) => ['id', 'name', 'size'].includes(key)) &&
    typeof item['id'] === 'string' &&
    item['id'].trim().length > 0 &&
    typeof item['name'] === 'string' &&
    item['name'].trim().length > 0 &&
    (item['size'] === undefined ||
      (typeof item['size'] === 'number' && Number.isSafeInteger(item['size']) && item['size'] >= 0))
  )
}

/** Literal separators are inserted only when followed by data, making backspace predictable. */
export function formatFormMask(input: string, mask: string): string {
  let result = ''
  let position = 0
  let literals = ''
  for (const token of mask) {
    const pattern =
      token === '#' ? /[0-9]/u : token === 'A' ? /[a-z]/iu : token === '*' ? /[a-z0-9]/iu : null
    if (pattern === null) {
      literals += token
      if (input[position] === token) position += 1
      continue
    }
    while (position < input.length && !pattern.test(input[position] ?? '')) position += 1
    const character = input[position]
    if (character === undefined) break
    result += literals + character
    literals = ''
    position += 1
  }
  return result
}
export function isCompleteFormMask(value: string, mask: string): boolean {
  // Trailing literals do not carry user data.
  const lastSlot = Math.max(mask.lastIndexOf('#'), mask.lastIndexOf('A'), mask.lastIndexOf('*'))
  return value.length === lastSlot + 1 && formatFormMask(value, mask) === value
}
