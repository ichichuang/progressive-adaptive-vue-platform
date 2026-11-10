/** JSON object key order is not part of the meaning of a form or its recoverable draft. */
export function formDraftSignature(value: unknown): string {
  if (value === undefined) return ''
  return JSON.stringify(value, (_key, item: unknown) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, (item as Record<string, unknown>)[key]]),
        )
      : item,
  )
}
