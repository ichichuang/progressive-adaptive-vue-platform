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
    'maxSelection',
    'tree',
    'editor',
    'columnSettings',
    'keywordSearch',
    'reorderableColumns',
    'sorting',
    'columnPreferenceKey',
    'maximizable',
    'batchActions',
  ])
  text(schema['id'])
  if (schema['maximizable'] !== undefined && typeof schema['maximizable'] !== 'boolean')
    throw error('Invalid table maximizable state.')
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
    keys(column, [
      'key',
      'title',
      'kind',
      'align',
      'overflow',
      'emptyText',
      'format',
      'dateTime',
      'options',
      'width',
      'minWidth',
      'maxWidth',
      'resizable',
      'fixed',
      'sortable',
      'hidden',
      'sortComparator',
    ])
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
    if (column['align'] !== undefined) choice(column, 'align', ['left', 'center', 'right'])
    if (column['overflow'] !== undefined) choice(column, 'overflow', ['wrap', 'ellipsis'])
    if (column['emptyText'] !== undefined && typeof column['emptyText'] !== 'string')
      throw error('Table emptyText must be text.')
    if (column['dateTime'] !== undefined) {
      if (column['format'] !== undefined || column['options'] !== undefined)
        throw error('Date display cannot be combined with numeric formatting or option labels.')
      if (column['kind'] !== undefined && column['kind'] !== 'date' && column['kind'] !== 'text')
        throw error('Date display requires a date or text column.')
      const date = record(column['dateTime'])
      keys(date, ['kind', 'unit', 'preset'])
      choice(date, 'kind', ['date', 'time', 'instant', 'timestamp'])
      if (date['kind'] === 'timestamp') choice(date, 'unit', ['seconds', 'milliseconds'])
      else if (date['unit'] !== undefined) throw error('Only timestamps accept a unit.')
      if (date['preset'] !== undefined)
        choice(date, 'preset', ['date', 'time', 'datetime', 'long-date'])
      if (
        date['kind'] === 'date' &&
        date['preset'] !== undefined &&
        date['preset'] !== 'date' &&
        date['preset'] !== 'long-date'
      )
        throw error('Date-only values require a date preset.')
      if (date['kind'] === 'time' && date['preset'] !== undefined && date['preset'] !== 'time')
        throw error('Time-only values require a time preset.')
    }
    if (column['format'] !== undefined) {
      const format = record(column['format'])
      keys(format, ['decimalPlaces', 'prefix', 'suffix'])
      const decimals = format['decimalPlaces']
      if (decimals !== undefined) {
        integer(decimals, 0)
        if ((decimals as number) > 20) throw error('Table decimalPlaces must not exceed 20.')
      }
      for (const affix of ['prefix', 'suffix'])
        if (format[affix] !== undefined && typeof format[affix] !== 'string')
          throw error('Table format affixes must be text.')
    }
    if (column['options'] !== undefined) {
      const options = column['options']
      if (!Array.isArray(options)) throw error('Table options must be an array.')
      const values = new Set<unknown>()
      for (const rawOption of options) {
        const option = record(rawOption)
        keys(option, ['value', 'label', 'tone'])
        const value = option['value']
        if (
          !(
            typeof value === 'string' ||
            typeof value === 'boolean' ||
            (typeof value === 'number' && Number.isFinite(value))
          ) ||
          values.has(value)
        )
          throw error('Table options require unique scalar values.')
        values.add(value)
        text(option['label'])
        if (option['tone'] !== undefined)
          choice(option, 'tone', ['default', 'primary', 'info', 'success', 'warning', 'error'])
      }
    }
    for (const dimension of ['width', 'minWidth', 'maxWidth']) {
      const value = column[dimension]
      if (
        value !== undefined &&
        (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
      )
        throw error('Table column widths must be positive finite numbers.')
    }
    const minimum = column['minWidth'] as number | undefined
    const maximum = column['maxWidth'] as number | undefined
    const width = column['width'] as number | undefined
    if (minimum !== undefined && maximum !== undefined && minimum > maximum)
      throw error('Table column minWidth must not exceed maxWidth.')
    if (
      width !== undefined &&
      ((minimum !== undefined && width < minimum) || (maximum !== undefined && width > maximum))
    )
      throw error('Table column width must be within its bounds.')
    if (column['fixed'] !== undefined) choice(column, 'fixed', ['left', 'right'])
    for (const flag of ['sortable', 'hidden', 'resizable'])
      if (column[flag] !== undefined && typeof column[flag] !== 'boolean')
        throw error('Invalid table column state.')
  }

  if (schema['keywordSearch'] !== undefined) {
    const search = record(schema['keywordSearch'])
    keys(search, ['parameter', 'fields', 'placeholder'])
    if (tablePathParts(search['parameter']).length !== 1)
      throw error('Keyword search requires a top-level filter parameter.')
    const fields = search['fields']
    if (
      !Array.isArray(fields) ||
      !fields.length ||
      new Set(fields).size !== fields.length ||
      fields.some((field) => typeof field !== 'string' || !columnKeys.has(field))
    )
      throw error('Keyword search fields must be unique configured column keys.')
    if (search['placeholder'] !== undefined) text(search['placeholder'])
    if (schema['tree'] !== undefined)
      throw error('Keyword search is not supported for tree tables.')
  }
  if (schema['columnGroups'] !== undefined)
    schema['columnGroups'] = parseTableColumnGroups(
      schema['columnGroups'],
      columns as UiTableSchema['columns'],
    )

  if (columns.every((column) => record(column)['hidden'] === true))
    throw error('A table requires at least one visible column.')
  if (
    schema['reorderableColumns'] !== undefined &&
    typeof schema['reorderableColumns'] !== 'boolean'
  )
    throw error('Invalid table column reordering state.')
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
    keys(pagination, ['mode', 'pageSize', 'pageSizes'])
    if (pagination['mode'] !== undefined) choice(pagination, 'mode', ['pages', 'load-more'])
    if (pagination['mode'] === 'load-more' && schema['tree'] !== undefined)
      throw error('Continuous loading is not supported for tree tables.')
    if (pagination['pageSize'] !== undefined) integer(pagination['pageSize'], 1)
    if (pagination['pageSizes'] !== undefined) {
      const sizes = pagination['pageSizes']
      if (!Array.isArray(sizes) || sizes.length === 0)
        throw error('Table page sizes must be a nonempty array.')
      for (const size of sizes) integer(size, 1)
      if (new Set(sizes).size !== sizes.length) throw error('Table page sizes must be unique.')
    }
  }
  if (schema['maxSelection'] !== undefined) {
    integer(schema['maxSelection'], 1)
    if (schema['selection'] !== 'multiple')
      throw error('A selection limit requires multiple selection.')
  }
  if (schema['selection'] !== undefined) choice(schema, 'selection', ['none', 'single', 'multiple'])
  if (schema['tree'] !== undefined) {
    const tree = record(schema['tree'])
    keys(tree, [
      'childrenKey',
      'leafKey',
      'indent',
      'selectionCascade',
      'defaultExpandedKeys',
      'childrenRequest',
    ])
    if (tree['childrenKey'] !== undefined) {
      const parts = tablePathParts(tree['childrenKey'])
      if (parts.length !== 1) throw error('Tree childrenKey must be a single path segment.')
    }
    if (tree['leafKey'] !== undefined) tablePathParts(tree['leafKey'])
    if (
      tree['indent'] !== undefined &&
      (typeof tree['indent'] !== 'number' || !Number.isFinite(tree['indent']) || tree['indent'] < 0)
    )
      throw error('Tree indent must be a finite non-negative number.')
    if (tree['selectionCascade'] !== undefined) {
      if (typeof tree['selectionCascade'] !== 'boolean')
        throw error('Invalid tree selectionCascade state.')
      if (tree['selectionCascade'] && schema['selection'] !== 'multiple')
        throw error('Tree selectionCascade requires multiple row selection.')
    }
    if (tree['defaultExpandedKeys'] !== undefined) {
      const keysValue = tree['defaultExpandedKeys']
      if (!Array.isArray(keysValue)) throw error('Tree defaultExpandedKeys must be an array.')
      for (const key of keysValue) {
        if (typeof key !== 'string' && typeof key !== 'number')
          throw error('Tree defaultExpandedKeys require string or number keys.')
      }
    }
    if (tree['childrenRequest'] !== undefined)
      tree['childrenRequest'] = parseTableRequest(tree['childrenRequest'])
    if (columns.some((column) => record(column)['sortable'] === true))
      throw error('Tree tables do not support column sorting.')
    if (schema['sorting'] === 'multiple')
      throw error('Tree tables do not support multiple sorting.')
    if (schema['summary'] !== undefined) throw error('Tree tables do not support summary rows.')
    if (source['kind'] === 'local' && schema['query'] !== undefined)
      throw error('Local tree tables do not support query filters.')
  }
  if (schema['editor'] !== undefined) {
    const editor = record(schema['editor'])
    keys(editor, ['form', 'presentation', 'inline', 'create', 'update', 'detail', 'remove'])
    const form = parseUiFormSchema(editor['form'])
    editor['form'] = form
    if (editor['inline'] !== undefined) {
      const inline = record(editor['inline'])
      keys(inline, ['mode', 'fields'])
      if (inline['mode'] !== undefined) choice(inline, 'mode', ['cell', 'row'])
      const fields = inline['fields']
      if (!Array.isArray(fields) || fields.length === 0 || new Set(fields).size !== fields.length)
        throw error('Inline editing requires unique configured fields.')
      for (const name of fields) {
        const field = form.fields.find((candidate) => candidate.name === name)
        if (
          typeof name !== 'string' ||
          !columnKeys.has(name) ||
          !field ||
          field.kind === 'group' ||
          field.kind === 'repeat'
        )
          throw error('Inline fields must identify scalar top-level form fields and table columns.')
      }
      if (editor['update'] === undefined) throw error('Inline editing requires an update request.')
    }
    if (editor['presentation'] !== undefined)
      choice(editor, 'presentation', ['modal', 'drawer', 'page'])
    for (const operation of ['create', 'update', 'detail', 'remove'])
      if (editor[operation] !== undefined) editor[operation] = parseTableRequest(editor[operation])
  }
  freezeDraftValue(cloned)
  return cloned as UiTableSchema
}
