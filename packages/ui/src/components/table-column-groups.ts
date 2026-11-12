import type { UiTableColumn, UiTableColumnGroup } from './table-contracts'

/** Groups describe membership, never a second column order or width authority. */
export function parseTableColumnGroups(
  input: unknown,
  columns: readonly UiTableColumn[],
): readonly UiTableColumnGroup[] {
  const columnKeys = new Set(columns.map((column) => column.key))
  const groupKeys = new Set<string>()
  const members = new Set<string>()
  function group(value: unknown): UiTableColumnGroup {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('Expected a table column group.')
    const item = value as Record<string, unknown>
    if (Object.keys(item).some((key) => !['key', 'title', 'children'].includes(key)))
      throw new TypeError('Unsupported table column group property.')
    const key = item['key']
    const title = item['title']
    const children = item['children']
    if (typeof key !== 'string' || !key.trim() || typeof title !== 'string' || !title.trim())
      throw new TypeError('Table column groups require nonempty keys and titles.')
    if (groupKeys.has(key) || columnKeys.has(key))
      throw new TypeError('Table group keys must be unique and distinct from columns.')
    groupKeys.add(key)
    if (!Array.isArray(children) || !children.length)
      throw new TypeError('Table column groups require children.')
    return {
      key,
      title,
      children: children.map((child: unknown) => {
        if (typeof child !== 'string') return group(child)
        if (!columnKeys.has(child) || members.has(child))
          throw new TypeError('Grouped column references must exist and occur only once.')
        members.add(child)
        return child
      }),
    }
  }
  if (!Array.isArray(input)) throw new TypeError('Expected table column groups.')
  return input.map(group)
}

export type TableHeaderNode =
  | { readonly kind: 'column'; readonly column: UiTableColumn }
  | {
      readonly kind: 'group'
      readonly key: string
      readonly title: string
      readonly fixed?: 'left' | 'right'
      readonly children: TableHeaderNode[]
    }

/** Split noncontiguous or differently pinned members without moving any column. */
export function projectTableColumnGroups(
  columns: readonly UiTableColumn[],
  groups: readonly UiTableColumnGroup[],
): TableHeaderNode[] {
  const paths = new Map<string, readonly UiTableColumnGroup[]>()
  function visit(group: UiTableColumnGroup, parents: readonly UiTableColumnGroup[]): void {
    const path = [...parents, group]
    for (const child of group.children) {
      if (typeof child === 'string') paths.set(child, path)
      else visit(child, path)
    }
  }
  for (const group of groups) visit(group, [])
  const result: TableHeaderNode[] = []
  const stack: { key: string; fixed: UiTableColumn['fixed']; children: TableHeaderNode[] }[] = []
  let segment = 0
  for (const column of columns) {
    if (column.hidden) continue
    const path = paths.get(column.key) ?? []
    let shared = 0
    while (
      shared < path.length &&
      stack[shared]?.key === path[shared]?.key &&
      stack[shared]?.fixed === column.fixed
    )
      shared += 1
    stack.length = shared
    let destination = stack.at(-1)?.children ?? result
    for (const group of path.slice(shared)) {
      const children: TableHeaderNode[] = []
      destination.push({
        kind: 'group',
        key: JSON.stringify(['group', group.key, segment++]),
        title: group.title,
        ...(column.fixed === undefined ? {} : { fixed: column.fixed }),
        children,
      })
      stack.push({ key: group.key, fixed: column.fixed, children })
      destination = children
    }
    destination.push({ kind: 'column', column })
  }
  return result
}
