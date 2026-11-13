import type { UiTableColumn, UiTableColumnPreference } from './table-contracts'

/** Persisted input is untrusted and may refer to columns removed by a deployment. */
export function parseUiTableColumnPreference(value: unknown): UiTableColumnPreference {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new TypeError('Invalid table column preference.')
  const record = value as Record<string, unknown>
  if (
    record['schemaVersion'] !== 1 ||
    !Array.isArray(record['columns']) ||
    Object.keys(record).some((key) => !['schemaVersion', 'columns'].includes(key))
  )
    throw new TypeError('Invalid table column preference.')
  const keys = new Set<string>()
  const columns = record['columns'].map((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item))
      throw new TypeError('Invalid table column preference entry.')
    const entry = item as Record<string, unknown>
    const key = entry['key']
    const hidden = entry['hidden']
    const width = entry['width']
    if (
      typeof key !== 'string' ||
      !key.trim() ||
      typeof hidden !== 'boolean' ||
      keys.has(key) ||
      (width !== undefined &&
        (typeof width !== 'number' || !Number.isFinite(width) || width <= 0)) ||
      Object.keys(entry).some((name) => !['key', 'hidden', 'width'].includes(name))
    )
      throw new TypeError('Invalid table column preference entry.')
    keys.add(key)
    return Object.freeze({
      key,
      hidden,
      ...(width === undefined ? {} : { width }),
    })
  })
  return Object.freeze({ schemaVersion: 1, columns: Object.freeze(columns) })
}

export function restoreTableColumns(
  columns: readonly UiTableColumn[],
  preference: UiTableColumnPreference,
): readonly UiTableColumn[] {
  const remaining = new Map(columns.map((column) => [column.key, column]))
  const restored: UiTableColumn[] = []
  for (const entry of preference.columns) {
    const column = remaining.get(entry.key)
    if (!column) continue
    restored.push({
      ...column,
      hidden: entry.hidden,
      ...(entry.width === undefined
        ? {}
        : {
            width: Math.min(
              column.maxWidth ?? Infinity,
              Math.max(column.minWidth ?? 1, entry.width),
            ),
          }),
    })
    remaining.delete(entry.key)
  }
  restored.push(...remaining.values())
  // Removing the only visible column must not leave the new table blank.
  if (restored.every((column) => column.hidden)) {
    const firstVisible = columns.find((column) => !column.hidden)
    return restored.map((column) =>
      column.key === firstVisible?.key ? { ...column, hidden: false } : column,
    )
  }
  return restored
}

/** Header keyboard movement follows visible neighbors, not hidden configuration entries. */
export function adjacentVisibleTableColumn(
  columns: readonly UiTableColumn[],
  key: string,
  direction: 'left' | 'right',
): string | undefined {
  const visible = columns.filter((column) => !column.hidden)
  const index = visible.findIndex((column) => column.key === key)
  return index === -1 ? undefined : visible[index + (direction === 'left' ? -1 : 1)]?.key
}
