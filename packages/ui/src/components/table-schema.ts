import { cloneDraft, freezeDraftValue } from '../composables/form-draft-values'
import { parseUiFormSchema } from './form-schema'
import { parseTableRequest, tablePathParts } from './table-request'
import { parseTableSummary } from './table-summary'
import type { UiTableSchema } from './table-contracts'

/** Validate untrusted JSON before a table resolves any data or transport request. */
export function parseUiTableSchema(input: unknown): UiTableSchema {
  const cloned: unknown = cloneDraft(input)
  function record(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new TypeError('Expected a table configuration object.')
    return value as Record<string, unknown>
  }
  function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
    if (Object.keys(value).some((key) => !allowed.includes(key)))
      throw new TypeError('Unsupported table configuration property.')
  }
  function text(value: unknown): void {
    if (typeof value !== 'string' || !value.trim())
      throw new TypeError('Expected nonempty table text.')
  }
  function choice(value: unknown, allowed: readonly string[]): void {
    if (typeof value !== 'string' || !allowed.includes(value))
      throw new TypeError('Unsupported table configuration choice.')
  }
  function integer(value: unknown, minimum: number): void {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum)
      throw new TypeError('Invalid table numeric bounds.')
  }
  const schema = record(cloned)
  keys(schema, [
    'id',
    'rowKey',
    'columns',
    'source',
    'query',
    'pagination',
    'height',
    'appearance',
    'summary',
    'selection',
    'editor',
    'columnSettings',
    'batchActions',
  ])
  text(schema['id'])
  tablePathParts(schema['rowKey'])

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
        throw new TypeError('Invalid table appearance state.')
    if (appearance['headerTone'] !== undefined)
      choice(appearance['headerTone'], ['neutral', 'soft', 'solid'])
    if (appearance['density'] !== undefined)
      choice(appearance['density'], ['compact', 'comfortable', 'spacious'])
  }

  if (schema['height'] !== undefined) {
    const height = record(schema['height'])
    choice(height['mode'], ['auto', 'fixed', 'fill'])
    keys(height, height['mode'] === 'fixed' ? ['mode', 'bodyHeight'] : ['mode'])
    if (
      height['mode'] === 'fixed' &&
      (typeof height['bodyHeight'] !== 'number' ||
        !Number.isFinite(height['bodyHeight']) ||
        height['bodyHeight'] <= 0)
    )
      throw new TypeError('Table bodyHeight must be a positive finite number.')
  }

  const columns = schema['columns']
  if (!Array.isArray(columns) || columns.length === 0)
    throw new TypeError('A table requires configured columns.')
  const columnKeys = new Set<string>()
  for (const raw of columns) {
    const column = record(raw)
    keys(column, ['key', 'title', 'kind', 'width', 'fixed', 'sortable', 'hidden'])
    tablePathParts(column['key'])
    const key = column['key'] as string
    if (columnKeys.has(key)) throw new TypeError('Table column keys must be unique.')
    columnKeys.add(key)
    text(column['title'])
    if (column['kind'] !== undefined)
      choice(column['kind'], ['text', 'number', 'boolean', 'date', 'tag'])
    if (
      column['width'] !== undefined &&
      (typeof column['width'] !== 'number' || column['width'] <= 0)
    )
      throw new TypeError('Table column width must be positive.')
    if (column['fixed'] !== undefined) choice(column['fixed'], ['left', 'right'])
    for (const flag of ['sortable', 'hidden'])
      if (column[flag] !== undefined && typeof column[flag] !== 'boolean')
        throw new TypeError('Invalid table column state.')
  }

  if (columns.every((column) => record(column)['hidden'] === true))
    throw new TypeError('A table requires at least one visible column.')
  if (schema['columnSettings'] !== undefined && typeof schema['columnSettings'] !== 'boolean')
    throw new TypeError('Invalid table column settings state.')
  if (schema['batchActions'] !== undefined) {
    const actions = schema['batchActions']
    if (!Array.isArray(actions)) throw new TypeError('Expected table batch actions.')
    if (actions.length && schema['selection'] !== 'multiple')
      throw new TypeError('Batch actions require multiple row selection.')
    const ids = new Set<string>()
    for (const raw of actions) {
      const action = record(raw)
      keys(action, ['id', 'label', 'request'])
      text(action['id'])
      text(action['label'])
      const id = action['id'] as string
      if (ids.has(id)) throw new TypeError('Table batch action IDs must be unique.')
      ids.add(id)
      action['request'] = parseTableRequest(action['request'])
    }
  }

  const source = record(schema['source'])
  choice(source['kind'], ['local', 'remote'])
  keys(source, source['kind'] === 'local' ? ['kind'] : ['kind', 'request'])
  if (source['kind'] === 'remote') source['request'] = parseTableRequest(source['request'])

  if (schema['summary'] !== undefined)
    schema['summary'] = parseTableSummary(
      schema['summary'],
      columns as UiTableSchema['columns'],
      source['kind'] as UiTableSchema['source']['kind'],
    )

  if (schema['query'] !== undefined) {
    const query = record(schema['query'])
    keys(query, ['form', 'mode', 'debounce'])
    query['form'] = parseUiFormSchema(query['form'])
    if (query['mode'] !== undefined) choice(query['mode'], ['submit', 'change'])
    if (query['debounce'] !== undefined) integer(query['debounce'], 0)
  }
  if (schema['pagination'] !== undefined) {
    const pagination = record(schema['pagination'])
    keys(pagination, ['pageSize', 'pageSizes'])
    if (pagination['pageSize'] !== undefined) integer(pagination['pageSize'], 1)
    if (pagination['pageSizes'] !== undefined) {
      const sizes = pagination['pageSizes']
      if (!Array.isArray(sizes) || sizes.length === 0)
        throw new TypeError('Table page sizes must be a nonempty array.')
      for (const size of sizes) integer(size, 1)
      if (new Set(sizes).size !== sizes.length)
        throw new TypeError('Table page sizes must be unique.')
    }
  }
  if (schema['selection'] !== undefined) choice(schema['selection'], ['none', 'single', 'multiple'])
  if (schema['editor'] !== undefined) {
    const editor = record(schema['editor'])
    keys(editor, ['form', 'presentation', 'create', 'update', 'detail', 'remove'])
    editor['form'] = parseUiFormSchema(editor['form'])
    if (editor['presentation'] !== undefined)
      choice(editor['presentation'], ['modal', 'drawer', 'page'])
    for (const operation of ['create', 'update', 'detail', 'remove'])
      if (editor[operation] !== undefined) editor[operation] = parseTableRequest(editor[operation])
  }
  freezeDraftValue(cloned)
  return cloned as UiTableSchema
}
