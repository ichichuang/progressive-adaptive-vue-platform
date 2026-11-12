import {
  createConfigurationInspection,
  type UiConfigurationInspection,
} from './configuration-inspection'
import { cloneDraft, freezeDraftValue } from '../composables/form-draft-values'
import { parseUiFormSchema } from './form-schema'
import { parseTableRequest, tablePathParts } from './table-request'
import { parseTableColumnGroups } from './table-column-groups'
import { parseTableSummary } from './table-summary'
import type { UiTableSchema } from './table-contracts'

/** Validate untrusted JSON before a table resolves any data or transport request. */
export function parseUiTableSchema(input: unknown): UiTableSchema {
  return parseConfiguration(input)
}
/** Parser-backed suggestions; stops at the first invalid node and never applies a configuration. */
export function inspectUiTableSchema(input: unknown): UiConfigurationInspection {
  let hints: UiConfigurationInspection['hints'] = []
  try {
    parseConfiguration(input, (value) => {
      hints = value
    })
    return { valid: true, issue: null, hints }
  } catch (cause) {
    return { valid: false, issue: cause instanceof Error ? cause.message : String(cause), hints }
  }
}
function parseConfiguration(
  input: unknown,
  collect?: (hints: UiConfigurationInspection['hints']) => void,
): UiTableSchema {
  const cloned: unknown = cloneDraft(input)
  const inspection = createConfigurationInspection(cloned)
  collect?.(inspection.hints)
  const { record, keys, error } = inspection
  function text(value: unknown): void {
    if (typeof value !== 'string' || !value.trim()) throw error('Expected nonempty table text.')
  }
  const choice = inspection.choice
  function integer(value: unknown, minimum: number): void {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
      throw error('Invalid table numeric bounds.')
  }
  const schema = record(cloned)
  keys(schema, [
    'id',
    'rowKey',
    'columns',
    'columnGroups',
    'csvExport',
    'source',
    'query',
    'pagination',
    'height',
    'appearance',
    'summary',
    'selection',
    'editor',
    'columnSettings',
    'sorting',
    'columnPreferenceKey',
    'batchActions',
  ])
  text(schema['id'])
  if (schema['columnPreferenceKey'] !== undefined) text(schema['columnPreferenceKey'])
  tablePathParts(schema['rowKey'])
  if (schema['sorting'] !== undefined) choice(schema, 'sorting', ['single', 'multiple'])

  if (schema['appearance'] !== undefined) {
    const appearance = record(schema['appearance'])
    keys(appearance, [
      'bordered',
      'rowDividers',
      'columnDividers',
      'striped',
      'headerTone',
      'density',
    ])
    for (const flag of ['bordered', 'rowDividers', 'columnDividers', 'striped'])
      if (appearance[flag] !== undefined && typeof appearance[flag] !== 'boolean')
        throw error('Invalid table appearance state.')
    if (appearance['headerTone'] !== undefined)
      choice(appearance, 'headerTone', ['neutral', 'soft', 'solid'])
    if (appearance['density'] !== undefined)
      choice(appearance, 'density', ['compact', 'comfortable', 'spacious'])
  }

  if (schema['height'] !== undefined) {
    const height = record(schema['height'])
    choice(height, 'mode', ['auto', 'fixed', 'fill'])
    keys(height, height['mode'] === 'fixed' ? ['mode', 'bodyHeight'] : ['mode'])
    if (
      height['mode'] === 'fixed' &&
      (typeof height['bodyHeight'] !== 'number' ||
        !Number.isFinite(height['bodyHeight']) ||
        height['bodyHeight'] <= 0)
    )
      throw error('Table bodyHeight must be a positive finite number.')
  }

  const columns = schema['columns']
  if (!Array.isArray(columns) || columns.length === 0)
    throw error('A table requires configured columns.')
  const columnKeys = new Set<string>()
  for (const raw of columns) {
    const column = record(raw)
    keys(column, ['key', 'title', 'kind', 'width', 'fixed', 'sortable', 'hidden', 'sortComparator'])
    tablePathParts(column['key'])
    const key = column['key'] as string
    if (columnKeys.has(key)) throw error('Table column keys must be unique.')
    columnKeys.add(key)
    text(column['title'])
    if (column['sortComparator'] !== undefined) {
      text(column['sortComparator'])
      if (column['sortable'] !== true) throw error('A comparator requires a sortable column.')
    }
    if (column['kind'] !== undefined)
      choice(column, 'kind', ['text', 'number', 'boolean', 'date', 'tag'])
    if (
      column['width'] !== undefined &&
      (typeof column['width'] !== 'number' || column['width'] <= 0)
    )
      throw error('Table column width must be positive.')
    if (column['fixed'] !== undefined) choice(column, 'fixed', ['left', 'right'])
    for (const flag of ['sortable', 'hidden'])
      if (column[flag] !== undefined && typeof column[flag] !== 'boolean')
        throw error('Invalid table column state.')
  }

  if (schema['columnGroups'] !== undefined)
    schema['columnGroups'] = parseTableColumnGroups(
      schema['columnGroups'],
      columns as UiTableSchema['columns'],
    )

  if (columns.every((column) => record(column)['hidden'] === true))
    throw error('A table requires at least one visible column.')
  if (schema['columnSettings'] !== undefined && typeof schema['columnSettings'] !== 'boolean')
    throw error('Invalid table column settings state.')
  if (schema['batchActions'] !== undefined) {
    const actions = schema['batchActions']
    if (!Array.isArray(actions)) throw error('Expected table batch actions.')
    if (actions.length && schema['selection'] !== 'multiple')
      throw error('Batch actions require multiple row selection.')
    const ids = new Set<string>()
    for (const raw of actions) {
      const action = record(raw)
      keys(action, ['id', 'label', 'request'])
      text(action['id'])
      text(action['label'])
      const id = action['id'] as string
      if (ids.has(id)) throw error('Table batch action IDs must be unique.')
      ids.add(id)
      action['request'] = parseTableRequest(action['request'])
    }
  }

  const source = record(schema['source'])
  choice(source, 'kind', ['local', 'remote'])
  keys(source, source['kind'] === 'local' ? ['kind'] : ['kind', 'request'])
  if (source['kind'] === 'remote') {
    source['request'] = parseTableRequest(source['request'])
    if (columns.some((column) => record(column)['sortComparator'] !== undefined))
      throw error('Remote sorting is owned by the server, not local comparators.')
  }

  if (schema['summary'] !== undefined)
    schema['summary'] = parseTableSummary(
      schema['summary'],
      columns as UiTableSchema['columns'],
      source['kind'] as UiTableSchema['source']['kind'],
    )

  if (schema['csvExport'] !== undefined) {
    const csv = record(schema['csvExport'])
    keys(csv, ['fileName', 'scopes'])
    text(csv['fileName'])
    const fileName = csv['fileName'] as string
    if (
      fileName.length > 120 ||
      /[\\/<>:"|?*\u0000-\u001f\u007f]/u.test(fileName) ||
      !fileName.endsWith('.csv') ||
      fileName.startsWith('.')
    )
      throw error(
        'CSV fileName must be a plain .csv file name without paths or control characters.',
      )
    const scopes = csv['scopes']
    if (!Array.isArray(scopes) || scopes.length === 0 || new Set(scopes).size !== scopes.length)
      throw error('CSV scopes must be nonempty and unique.')
    for (const scope of scopes) {
      if (scope !== 'page' && scope !== 'selected')
        throw error('CSV scope must be page or selected.')
      if (
        scope === 'selected' &&
        schema['selection'] !== 'single' &&
        schema['selection'] !== 'multiple'
      )
        throw error('Selected CSV export requires row selection.')
    }
  }

  if (schema['query'] !== undefined) {
    const query = record(schema['query'])
    keys(query, ['form', 'mode', 'debounce'])
    query['form'] = parseUiFormSchema(query['form'])
    if (query['mode'] !== undefined) choice(query, 'mode', ['submit', 'change'])
    if (query['debounce'] !== undefined) integer(query['debounce'], 0)
  }
  if (schema['pagination'] !== undefined) {
    const pagination = record(schema['pagination'])
    keys(pagination, ['pageSize', 'pageSizes'])
    if (pagination['pageSize'] !== undefined) integer(pagination['pageSize'], 1)
    if (pagination['pageSizes'] !== undefined) {
      const sizes = pagination['pageSizes']
      if (!Array.isArray(sizes) || sizes.length === 0)
        throw error('Table page sizes must be a nonempty array.')
      for (const size of sizes) integer(size, 1)
      if (new Set(sizes).size !== sizes.length) throw error('Table page sizes must be unique.')
    }
  }
  if (schema['selection'] !== undefined) choice(schema, 'selection', ['none', 'single', 'multiple'])
  if (schema['editor'] !== undefined) {
    const editor = record(schema['editor'])
    keys(editor, ['form', 'presentation', 'create', 'update', 'detail', 'remove'])
    editor['form'] = parseUiFormSchema(editor['form'])
    if (editor['presentation'] !== undefined)
      choice(editor, 'presentation', ['modal', 'drawer', 'page'])
    for (const operation of ['create', 'update', 'detail', 'remove'])
      if (editor[operation] !== undefined) editor[operation] = parseTableRequest(editor[operation])
  }
  freezeDraftValue(cloned)
  return cloned as UiTableSchema
}
