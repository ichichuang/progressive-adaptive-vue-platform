import { getFormValue } from '../composables/form-draft-values'
import type { UiTableKey, UiTableReadonlyRecord, UiTableTree } from './table-contracts'

/** Display row for Naive tree protocol; application payload stays on `record`. */
export interface UiTableTreeDisplayRow {
  readonly key: UiTableKey
  readonly record: UiTableReadonlyRecord
  readonly isLeaf: boolean
  readonly children?: readonly UiTableTreeDisplayRow[]
}

export function resolveUiTableTree(
  tree: UiTableTree | undefined,
): Required<Pick<UiTableTree, 'childrenKey' | 'selectionCascade' | 'indent'>> &
  Pick<UiTableTree, 'leafKey' | 'defaultExpandedKeys' | 'childrenRequest'> {
  if (!tree) {
    return {
      childrenKey: 'children',
      selectionCascade: false,
      indent: 16,
    }
  }
  return {
    childrenKey: tree.childrenKey ?? 'children',
    selectionCascade: tree.selectionCascade ?? true,
    indent: tree.indent ?? 16,
    ...(tree.leafKey === undefined ? {} : { leafKey: tree.leafKey }),
    ...(tree.defaultExpandedKeys === undefined
      ? {}
      : { defaultExpandedKeys: tree.defaultExpandedKeys }),
    ...(tree.childrenRequest === undefined ? {} : { childrenRequest: tree.childrenRequest }),
  }
}

export function readTreeChildren(
  row: UiTableReadonlyRecord,
  childrenKey: string,
): readonly UiTableReadonlyRecord[] | undefined {
  const value = getFormValue(row, childrenKey)
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new TypeError('Table tree children must be an array of records.')
  return value as readonly UiTableReadonlyRecord[]
}

function isTreeLeafRecord(
  row: UiTableReadonlyRecord,
  tree: ReturnType<typeof resolveUiTableTree>,
): boolean {
  if (tree.leafKey !== undefined) {
    const flag = getFormValue(row, tree.leafKey)
    if (flag === true) return true
    if (flag === false) return false
  }
  const children = readTreeChildren(row, tree.childrenKey)
  if (tree.childrenRequest && children === undefined) return false
  return !Array.isArray(children) || children.length === 0
}

export function walkTreeRecords(
  rows: readonly UiTableReadonlyRecord[],
  childrenKey: string,
  visit: (row: UiTableReadonlyRecord) => void,
): void {
  for (const row of rows) {
    visit(row)
    const children = readTreeChildren(row, childrenKey)
    if (children?.length) walkTreeRecords(children, childrenKey, visit)
  }
}

export function collectTreeKeys(
  rows: readonly UiTableReadonlyRecord[],
  rowKey: (row: UiTableReadonlyRecord) => UiTableKey,
  childrenKey: string,
): UiTableKey[] {
  const keys: UiTableKey[] = []
  walkTreeRecords(rows, childrenKey, (row) => {
    keys.push(rowKey(row))
  })
  return keys
}

export function flattenTreeRecords(
  rows: readonly UiTableReadonlyRecord[],
  childrenKey: string,
): UiTableReadonlyRecord[] {
  const result: UiTableReadonlyRecord[] = []
  walkTreeRecords(rows, childrenKey, (row) => {
    result.push(row)
  })
  return result
}

export function findTreeRecord(
  rows: readonly UiTableReadonlyRecord[],
  key: UiTableKey,
  rowKey: (row: UiTableReadonlyRecord) => UiTableKey,
  childrenKey: string,
): UiTableReadonlyRecord | undefined {
  for (const row of rows) {
    if (Object.is(rowKey(row), key)) return row
    const children = readTreeChildren(row, childrenKey)
    if (!children?.length) continue
    const nested = findTreeRecord(children, key, rowKey, childrenKey)
    if (nested) return nested
  }
  return undefined
}

/** Immutable attach of loaded children onto the matching parent key. */
export function attachTreeChildren(
  rows: readonly UiTableReadonlyRecord[],
  parentKey: UiTableKey,
  children: readonly UiTableReadonlyRecord[],
  rowKey: (row: UiTableReadonlyRecord) => UiTableKey,
  childrenKey: string,
): readonly UiTableReadonlyRecord[] {
  return rows.map((row) => {
    if (Object.is(rowKey(row), parentKey)) {
      return Object.freeze({ ...row, [childrenKey]: children })
    }
    const existing = readTreeChildren(row, childrenKey)
    if (!existing?.length) return row
    return Object.freeze({
      ...row,
      [childrenKey]: attachTreeChildren(existing, parentKey, children, rowKey, childrenKey),
    })
  })
}

export function projectTreeDisplayRows(
  rows: readonly UiTableReadonlyRecord[],
  rowKey: (row: UiTableReadonlyRecord) => UiTableKey,
  tree: ReturnType<typeof resolveUiTableTree>,
): UiTableTreeDisplayRow[] {
  return rows.map((record) => {
    const key = rowKey(record)
    const children = readTreeChildren(record, tree.childrenKey)
    const leaf = isTreeLeafRecord(record, tree)
    if (leaf) return { key, record, isLeaf: true }
    if (Array.isArray(children)) {
      return {
        key,
        record,
        isLeaf: false,
        children: projectTreeDisplayRows(children, rowKey, tree),
      }
    }
    // Lazy parent: explicit non-leaf without a children array.
    return { key, record, isLeaf: false }
  })
}
