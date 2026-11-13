import { verifyDashboard } from './check-dashboard'
import { verifyDateTime } from './check-date-time'
import { adjacentVisibleTableColumn } from '../../packages/ui/src/components/table-column-preference'
import { verifyFormBuilderFields } from './check-form-builder-fields'
import { resolveTableColumnDisplay } from '../../packages/ui/src/components/table-column-display'
import { verifyFormSpecialFields } from './check-form-fields'
import { tableQuerySharingCodec } from '../../apps/web/src/app/tables/table-query-sharing-example'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript'
import { effectScope, h, nextTick } from 'vue'
import { generatedThemeRegistry } from '../../packages/design-system/src/generated/theme-registry'
import { ProductPreferenceDefault } from '../../packages/design-system/src/runtime/appearance-defaults'
import {
  validateCustomThemeDefinition,
  type ThemeRegistryEntry,
} from '../../packages/design-system/src/runtime/theme-registry'
import { projectUiAppearance } from '../../packages/design-system/src/runtime/ui-appearance-projection'
import {
  calculateWcag21Contrast,
  parseCssColor,
  type ParsedCssColor,
} from '../../packages/design-system/src/schema/css-color'
import { projectMotionPolicy } from '../../packages/ui/src/adapters/motion/motion-policy'
import { createPavpNaiveTableThemeProjection } from '../../packages/ui/src/adapters/naive/pavp-naive-table-theme'
import type {
  UiTableController,
  UiTablePage,
  UiTableQuery,
  UiTableRecord,
  UiTableReadonlyRecord,
  UiTableResolvedRequest,
  UiTableSchema,
  UiTableSummaryCell,
  UiTableSummaryRow,
} from '../../packages/ui/src/components/table-contracts'
import {
  projectTableColumnGroups,
  type TableHeaderNode,
} from '../../packages/ui/src/components/table-column-groups'
import {
  parseUiTableSchema,
  inspectUiTableSchema,
} from '../../packages/ui/src/components/table-schema'
import { useUiTableActions } from '../../packages/ui/src/composables/use-ui-table-actions'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import { useUiTableQuery } from '../../packages/ui/src/composables/use-ui-table-query'
import { useUiTableForm } from '../../packages/ui/src/composables/use-ui-table-form'
import {
  parseUiFormSchema,
  inspectUiFormSchema,
} from '../../packages/ui/src/components/form-schema'
import { useFormFieldPresentation } from '../../packages/ui/src/components/form-field-presentation'
import type { UiFormCopy } from '../../packages/ui/src/components/form-contracts'

const formCopy: UiFormCopy = {
  submit: () => 'Submit',
  reset: () => 'Reset',
  required: () => 'Required',
  loadingOptions: () => 'Loading options',
  noOptions: () => 'No options',
  optionsFailed: () => 'Options failed',
  retryOptions: () => 'Retry options',
  validating: () => 'Validating',
  submitting: () => 'Submitting',
  submitSucceeded: () => 'Saved',
  submitFailed: () => 'Save failed',
  validationUnavailable: () => 'Validation unavailable',
  inputIncomplete: () => 'Input incomplete',
  errorSummary: (count) => `${String(count)} errors`,
  empty: () => 'Empty',
  yes: () => 'Yes',
  no: () => 'No',
  addItem: () => 'Add',
  insertItem: () => 'Insert',
  duplicateItem: () => 'Duplicate',
  removeItem: () => 'Remove',
  moveUp: () => 'Up',
  moveDown: () => 'Down',
  minItems: (count) => `Minimum ${String(count)}`,
  maxItems: (count) => `Maximum ${String(count)}`,
  invalidValue: () => 'Invalid value',
}

async function verifyFormBindingLifecycle(): Promise<void> {
  const form = useUiForm({
    formId: 'binding-lifecycle',
    schema: {
      fields: [
        { kind: 'text', name: 'name', label: 'Name' },
        {
          kind: 'repeat',
          name: 'rows',
          label: 'Rows',
          fields: [{ kind: 'custom', name: 'name', label: 'Name' }],
        },
      ],
    },
    initial: {
      draftId: 'A',
      values: { name: 'Alice', rows: [{ name: 'Alice' }, { name: 'Bob' }] },
    },
    copy: formCopy,
  })
  const retired = form.field('name')
  form.replaceInitial({
    draftId: 'B',
    values: { name: 'Bob', rows: [{ name: 'Alice' }, { name: 'Bob' }] },
  })
  assert.equal(retired.setValue('Late Alice result'), 'blocked')
  retired.blur()
  assert.deepEqual(form.touched.value, {})
  const live = form.field('name')
  let focused = false
  live.setFocusTarget(() => {
    focused = true
  })
  live.setCommitTarget(() => true)
  retired.setFocusTarget(() => {
    throw new Error('Retired focus registered')
  })
  retired.setCommitTarget(() => {
    throw new Error('Retired commit registered')
  })
  retired.setPendingInput(true)
  assert.equal(form.hasPendingInput.value, false)
  assert.equal(form.focusField('name'), true)
  assert.equal(focused, true)
  assert.equal(await form.validate(), 'valid')
  assert.equal(form.getValue('name'), 'Bob')

  const removed = form.field('rows.0.name')
  removed.setFocusTarget(() => undefined)
  removed.setCommitTarget(() => true)
  const survivor = form.field('rows.1.name')
  survivor.setFocusTarget(() => undefined)
  survivor.setCommitTarget(() => true)
  assert.equal(form.removeItem('rows', 0), 'applied')
  assert.equal(removed.setValue('Late deleted row'), 'blocked')
  removed.setPendingInput(true)
  removed.blur()
  assert.equal(form.hasPendingInput.value, false)
  assert.equal(survivor.name, 'rows.0.name')
  assert.equal(survivor.setValue('Surviving Bob'), 'applied')
  assert.equal(form.getValue('rows.0.name'), 'Surviving Bob')
  assert.equal(form.addItem('rows'), 'applied')
  assert.equal(form.moveItem('rows', 0, 1), 'applied')
  assert.equal(survivor.name, 'rows.1.name')
  assert.equal(survivor.setValue('Moved Bob'), 'applied')
  assert.equal(form.getValue('rows.1.name'), 'Moved Bob')
  assert.equal(form.setValue('rows', [{ name: 'Replacement' }]), 'applied')
  assert.equal(survivor.setValue('Late replaced row'), 'blocked')

  // The renderer must acquire its new binding after snapshot row keys settle.
  const scope = effectScope()
  const presentation = scope.run(() =>
    useFormFieldPresentation({ form, name: 'rows.0.name' }, () => true),
  )
  assert.ok(presentation)
  const beforeReset = presentation.binding.value
  form.reset()
  assert.equal(beforeReset.setValue('Late reset'), 'blocked')
  await nextTick()
  assert.equal(presentation.binding.value.setValue('Current reset row'), 'applied')
  assert.equal(form.getValue('rows.0.name'), 'Current reset row')
  scope.stop()
  form.dispose()
  assert.equal(live.setValue('After dispose'), 'disposed')
}

async function verifyGroupedQueries(): Promise<void> {
  const table = useUiTable({
    schema: {
      id: 'grouped-query',
      rowKey: 'id',
      source: { kind: 'local' },
      columns: [{ key: 'profile.name', title: 'Name' }],
      query: {
        form: {
          fields: [
            {
              kind: 'group',
              name: 'profile',
              label: 'Profile',
              fields: [
                { kind: 'text', name: 'name', label: 'Name' },
                {
                  kind: 'group',
                  name: 'location',
                  label: 'Location',
                  fields: [{ kind: 'text', name: 'city', label: 'City' }],
                },
              ],
            },
          ],
        },
      },
    },
    rows: [
      {
        id: 1,
        profile: { name: 'Alice', location: { city: 'Paris' } },
        active: false,
        rank: 0,
        category: 'A',
      },
      {
        id: 2,
        profile: { name: 'Bob', location: { city: 'Rome' } },
        active: true,
        rank: 1,
        category: 'B',
      },
    ],
  })
  const query = useUiTableQuery(table, formCopy)
  assert.equal(await query.submit(), 'success')
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1, 2],
  )
  query.setValue('profile.name', 'ali')
  assert.equal(await query.submit(), 'success')
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1],
  )
  assert.deepEqual(table.query.value.filters, { profile: { name: 'ali', location: { city: '' } } })
  query.setValue('profile.name', '')
  query.setValue('profile.location.city', 'rome')
  assert.equal(await query.submit(), 'success')
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [2],
  )
  await table.search({ 'profile.name': 'Alice' })
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1],
  )
  await table.search({ active: false, rank: 0, category: ['A'], profile: {} })
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1],
  )
  await table.search({ profile: { name: null }, category: [] })
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1, 2],
  )
  query.dispose()
  table.dispose()
}

const schema: UiTableSchema = {
  id: 'summary-contract',
  rowKey: 'id',
  source: { kind: 'local' },
  selection: 'multiple',
  pagination: { pageSize: 2 },
  columns: [
    { key: 'label', title: 'Label', fixed: 'left' },
    { key: 'amount', title: 'Amount', kind: 'number', sortable: true },
    { key: 'other', title: 'Other', kind: 'number' },
    { key: 'nested.amount', title: 'Nested', kind: 'number' },
  ],
}

function one(cell: UiTableSummaryCell): readonly UiTableSummaryRow[] {
  return [{ key: 'total', cells: { amount: cell } }]
}

function cell(table: UiTableController, key = 'total', column = 'amount') {
  const found = table.summaryRows.value.find((row) => row.key === key)?.cells[column]
  assert.ok(found, `Missing summary cell ${key}/${column}`)
  return found
}

/** Evaluate the table's opaque sRGB mixes while keeping leaf parsing with the design system. */
function tableColor(value: string): ParsedCssColor {
  const expression = /^color-mix\(\s*in srgb,([\s\S]+)\)$/u.exec(value.trim())
  if (!expression) return parseCssColor(value)
  const contents = expression[1]
  assert.ok(contents)
  let depth = 0
  let separator = -1
  for (let index = 0; index < contents.length; index++) {
    const character = contents[index]
    if (character === '(') depth++
    if (character === ')') depth--
    if (character === ',' && depth === 0) separator = index
  }
  assert.ok(separator >= 0, 'A table color mix needs two operands.')
  const operand = (text: string) => {
    const weighted = /^(.*?)\s+(\d+(?:\.\d+)?)%$/u.exec(text.trim())
    return {
      color: tableColor(weighted?.[1] ?? text.trim()),
      weight: weighted?.[2] === undefined ? undefined : Number(weighted[2]) / 100,
    }
  }
  const first = operand(contents.slice(0, separator))
  const second = operand(contents.slice(separator + 1))
  const fraction = second.weight ?? (first.weight === undefined ? 0.5 : 1 - first.weight)
  for (const { color } of [first, second]) {
    assert.equal(color.spaceId, 'srgb')
    assert.equal(color.alpha, 1)
  }
  const channels = first.color.coords.map((channel, index) => {
    const target = second.color.coords[index]
    assert.equal(typeof channel, 'number')
    assert.equal(typeof target, 'number')
    return (Number(channel) * (1 - fraction) + Number(target) * fraction) * 255
  })
  return parseCssColor(`rgb(${channels.join(' ')})`)
}

function verifyTableColors(): void {
  const color = (value: unknown): string => {
    assert.ok(typeof value === 'string', 'The table theme must provide a CSS color.')
    return value
  }
  const source = readFileSync(
    new URL('../../packages/ui/src/components/UiTable.vue', import.meta.url),
    'utf8',
  )
  const stripedSorting =
    /\.n-data-table-tr--striped\s*>\s*\.n-data-table-td--sorting\)[^{]*\{\s*background-color:\s*([^;]+);/u.exec(
      source,
    )?.[1]
  assert.ok(stripedSorting, 'Sorted striped cells need their composed background.')
  const contract = generatedThemeRegistry.namedContrasts.find(
    (pair) => pair.id === 'text-primary-on-panel',
  )
  assert.ok(contract)
  const builtIns: ThemeRegistryEntry[] = generatedThemeRegistry.builtInEntries.map((entry) => ({
    registryKind: 'built-in',
    themeId: entry.themeId,
    definition: entry.definition,
  }))
  const cobalt = builtIns.find((entry) => entry.themeId === 'cobalt-tide')
  assert.ok(cobalt)
  const custom = validateCustomThemeDefinition({
    ...structuredClone(cobalt.definition),
    id: 'table-cross-role-contrast-regression',
  })
  assert.equal(custom.status, 'validated')
  const definition = structuredClone(custom.entry.definition)
  // A valid primary soft pair need not contrast with the neutral body foreground.
  for (const contrast of ['standard', 'enhanced'] as const) {
    const role = definition.uiPalette.light[contrast].roles.primary
    const foreground = contrast === 'standard' ? '#333333' : '#000000'
    role.foreground = {
      default: foreground,
      hover: foreground,
      pressed: foreground,
      suppl: foreground,
    }
    role.soft = {
      background: { default: '#BBBBBB', hover: '#BBBBBB', pressed: '#BBBBBB' },
      foreground,
      icon: foreground,
      border: foreground,
    }
  }
  const regression = validateCustomThemeDefinition(definition)
  assert.equal(regression.status, 'validated')
  for (const entry of [...builtIns, regression.entry]) {
    const reference =
      entry.registryKind === 'built-in'
        ? { registryKind: entry.registryKind, themeId: entry.themeId }
        : { registryKind: entry.registryKind, themeId: entry.themeId }
    for (const colorMode of ['light', 'dark'] as const) {
      for (const contrast of ['standard', 'enhanced'] as const) {
        const appearance = projectUiAppearance(
          {
            ...ProductPreferenceDefault,
            colorMode,
            contrast,
            density: ProductPreferenceDefault.density.preset,
            material: 'solid',
            theme: reference,
          },
          entry,
        )
        const palette = appearance.colorPalette
        const minimum =
          contrast === 'enhanced' ? contract.enhancedMinimum : contract.standardMinimum
        const context = `${entry.themeId}/${colorMode}/${contrast}`
        const ratio = (foreground: string, background: string): number =>
          calculateWcag21Contrast(tableColor(foreground), tableColor(background))
        if (entry === regression.entry && colorMode === 'light')
          assert.ok(
            ratio(
              palette.roles.neutral.foreground.default,
              palette.roles.primary.soft.background.hover,
            ) < minimum,
            `${context}: the custom fixture must expose cross-role contrast loss.`,
          )
        for (const headerTone of ['neutral', 'soft', 'solid'] as const) {
          const theme = createPavpNaiveTableThemeProjection(appearance, headerTone)
          const tdTextColor = color(theme.tdTextColor)
          const tdColorStriped = color(theme.tdColorStriped)
          const tdColorSorting = color(theme.tdColorSorting)
          const tdColorHover = color(theme.tdColorHover)
          const thTextColor = color(theme.thTextColor)
          const thColor = color(theme.thColor)
          const thColorSorting = color(theme.thColorSorting)
          const sortedStripe = stripedSorting
            .replace(/\s*!important\s*$/u, '')
            .replaceAll('var(--n-merged-td-color-striped)', tdColorStriped)
            .replaceAll('var(--n-merged-td-color-hover)', tdColorHover)
          const surface = palette.surfaces.surface
          const backgrounds = [surface, tdColorSorting, tdColorStriped, sortedStripe, tdColorHover]
          for (const background of backgrounds)
            assert.ok(
              ratio(tdTextColor, background) >= minimum,
              `${context}/${headerTone}: body contrast on ${background}`,
            )
          const distances = backgrounds.map((background) => ratio(surface, background))
          for (let index = 1; index < distances.length; index++)
            assert.ok(
              Number(distances[index]) > Number(distances[index - 1]),
              `${context}: reading states must increase gently toward hover.`,
            )
          assert.ok(
            ratio(surface, tdColorStriped) < ratio(surface, palette.surfaces.sunken),
            `${context}: stripes must be quieter than the sunken surface.`,
          )
          assert.ok(
            ratio(thTextColor, thColorSorting) >= minimum,
            `${context}/${headerTone}: sorted header contrast`,
          )
          const pressed =
            headerTone === 'neutral'
              ? palette.surfaces.sunken
              : palette.roles.primary[headerTone].background.pressed
          assert.ok(
            ratio(thColor, thColorSorting) <= ratio(thColor, pressed) + 1e-9,
            `${context}/${headerTone}: header sorting must not be stronger than pressed.`,
          )
          for (const suffix of ['Modal', 'Popover'] as const) {
            assert.equal(theme[`tdColorStriped${suffix}`], tdColorStriped)
            assert.equal(theme[`tdColorSorting${suffix}`], tdColorSorting)
            assert.equal(theme[`tdColorHover${suffix}`], tdColorHover)
            assert.equal(theme[`thColorSorting${suffix}`], thColorSorting)
          }
        }
      }
    }
  }
}

function verifyParser(): void {
  const invalid: readonly unknown[] = [
    null,
    {},
    [null],
    [{ key: '', cells: { amount: { kind: 'text', text: 'Total' } } }],
    [{ key: 'total', cells: {} }],
    [{ key: 'total', cells: { missing: { kind: 'text', text: 'Total' } } }],
    [{ key: 'total', cells: { amount: { kind: 'text', text: 'Total' } }, unknown: true }],
    [
      { key: 'total', cells: { amount: { kind: 'text', text: 'A' } } },
      { key: 'total', cells: { amount: { kind: 'text', text: 'B' } } },
    ],
    ...[
      { kind: 'unknown' },
      { kind: 'text', text: 1 },
      { kind: 'text', text: 'Total', unknown: true },
      { kind: 'text', text: 'Total', format: {} },
      { kind: 'value' },
      { kind: 'value', value: 1, from: 'total' },
      { kind: 'value', value: true },
      { kind: 'value', value: {} },
      { kind: 'value', value: Number.POSITIVE_INFINITY },
      { kind: 'value', value: () => 1 },
      { kind: 'value', value: h('strong', 'Total') },
      { kind: 'value', value: 1, format: { decimalPlaces: -1 } },
      { kind: 'value', value: 1, format: { decimalPlaces: 21 } },
      { kind: 'value', value: 1, format: { decimalPlaces: 0.5 } },
      { kind: 'value', value: 1, format: { prefix: 3 } },
      { kind: 'value', value: 1, format: { suffix: false } },
      { kind: 'value', value: 1, format: { currency: 'USD' } },
      { kind: 'aggregate', operation: 'sum' },
      { kind: 'aggregate', operation: 'median', scope: 'page' },
      { kind: 'aggregate', operation: ['sum'], scope: 'page' },
      { kind: 'aggregate', operation: {}, scope: 'page' },
      { kind: 'aggregate', operation: 'sum', scope: 'remote' },
      { kind: 'aggregate', operation: 'sum', scope: ['page'] },
      { kind: 'aggregate', operation: 'sum', scope: ['filtered'] },
      { kind: 'aggregate', operation: 'sum', scope: {} },
      { kind: 'aggregate', operation: 'count', field: 'amount', scope: 'page' },
      ...[
        '__proto__.value',
        'constructor.value',
        'a.prototype.value',
        'a[0]',
        'a.*',
        'a()',
      ].flatMap((path) => [
        { kind: 'value', from: path },
        { kind: 'aggregate', operation: 'sum', field: path, scope: 'page' },
      ]),
    ].map((value) => [{ key: 'total', cells: { amount: value } }]),
  ]
  for (const summary of invalid)
    assert.throws(() => parseUiTableSchema({ ...schema, summary }), TypeError)
  assert.throws(
    () =>
      parseUiTableSchema({
        ...schema,
        source: { kind: 'remote', request: { api: '/rows', method: 'GET' } },
        summary: one({ kind: 'aggregate', operation: 'sum', scope: 'filtered' }),
      }),
    /local data/u,
  )
  assert.throws(
    () =>
      parseUiTableSchema({
        ...schema,
        source: { kind: 'remote', request: { api: '/rows', method: 'GET' } },
        summary: [
          {
            key: 'total',
            cells: { amount: { kind: 'aggregate', operation: 'sum', scope: ['filtered'] } },
          },
        ],
      }),
    /summary scope/u,
  )
  const input = [{ key: 'total', cells: { amount: { kind: 'value', value: 1 } } }]
  const parsed = parseUiTableSchema({ ...schema, summary: input })
  const first = input[0]
  assert.ok(first)
  first.cells.amount.value = 2
  assert.equal(parsed.summary?.[0]?.cells['amount']?.kind, 'value')
  assert.ok(Object.isFrozen(parsed.summary[0].cells['amount']))
  assert.deepEqual(parsed.summary, [
    { key: 'total', cells: { amount: { kind: 'value', value: 1 } } },
  ])
}

async function verifyLocal(): Promise<void> {
  const records: readonly UiTableRecord[] = [
    { id: 1, label: 'A', amount: 2, nested: { amount: 11 } },
    { id: 2, label: 'A', amount: 8, nested: { amount: 13 } },
    { id: 3, label: 'B', amount: -4, nested: { amount: 17 } },
    { id: 4, label: 'B', amount: null },
    { id: 5, label: 'B', amount: '12' },
  ]
  const summaries: readonly UiTableSummaryRow[] = ['page', 'filtered'].flatMap((scope) =>
    (['sum', 'avg', 'min', 'max', 'count'] as const).map((operation) => ({
      key: `${scope}-${operation}`,
      cells: {
        amount: {
          kind: 'aggregate' as const,
          operation,
          scope: scope as 'page' | 'filtered',
        },
      },
    })),
  )
  let changes = 0
  const table = useUiTable({
    schema: { ...schema, summary: summaries },
    rows: records,
    immediate: false,
    onQueryChange: () => changes++,
    translate: (value) => (value === 'summary.total' ? 'Total' : value),
  })
  await table.refresh()
  assert.deepEqual(
    summaries.map((row) => cell(table, row.key).value),
    [10, 5, 2, 8, 2, 6, 2, -4, 8, 5],
  )
  await table.setPage(2)
  assert.equal(cell(table, 'page-sum').value, -4)
  assert.equal(cell(table, 'page-count').value, 2)
  assert.equal(cell(table, 'filtered-count').value, 5)
  await table.setPage(3)
  assert.equal(cell(table, 'page-sum').value, null)
  assert.equal(cell(table, 'page-avg').value, null)
  assert.equal(cell(table, 'page-count').value, 1)
  await table.search({ label: 'B' })
  assert.equal(cell(table, 'filtered-count').value, 3)
  assert.equal(cell(table, 'filtered-sum').value, -4)
  await table.search({ label: 'missing' })
  assert.deepEqual(
    summaries.map((row) => cell(table, row.key).value),
    [0, null, null, null, 0, 0, null, null, null, 0],
  )
  await table.reset()
  await table.setPageSize(3)
  await table.setSort({ key: 'amount', order: 'descend' })
  await table.setPage(2)
  table.setSelection(table.rows.value.map((row) => row['id'] as number))
  table.setColumnVisibility('amount', false)
  table.moveColumn('amount', 'down')
  const previous = {
    query: table.query.value,
    rows: table.rows.value,
    columns: table.columns.value,
    selectedKeys: table.selectedKeys.value,
    total: table.total.value,
    changes,
  }
  table.setSummary([
    {
      key: 'total',
      cells: {
        label: { kind: 'text', text: 'summary.total' },
        amount: {
          kind: 'aggregate',
          operation: 'sum',
          field: 'nested.amount',
          scope: 'filtered',
          format: { decimalPlaces: 2, prefix: '$', suffix: ' net' },
        },
        other: { kind: 'value', value: 0, format: { decimalPlaces: 0 } },
      },
    },
  ])
  assert.equal(table.query.value, previous.query)
  assert.equal(table.rows.value, previous.rows)
  assert.equal(table.columns.value, previous.columns)
  assert.equal(table.selectedKeys.value, previous.selectedKeys)
  assert.equal(table.total.value, previous.total)
  assert.equal(changes, previous.changes)
  assert.equal(cell(table).value, 41)
  assert.equal(cell(table).text, '$41.00 net')
  assert.equal(cell(table, 'total', 'label').text, 'Total')
  assert.equal(cell(table, 'total', 'other').text, '0')
  assert.deepEqual(table.schema.summary, summaries)
  const configured = table.summary.value
  assert.throws(() => {
    table.setSummary([{ key: 'bad', cells: { absent: { kind: 'value', value: 1 } } }])
  }, /Unknown summary column/u)
  assert.equal(table.summary.value, configured)
  table.resetColumns()
  assert.equal(cell(table).value, 41)
  assert.equal(table.summary.value, configured)
  table.setColumnVisibility('amount', true)
  table.moveColumn('amount', 'up')
  assert.equal(cell(table).value, 41)
  table.setSummary(one({ kind: 'value', value: null, format: { prefix: '$', suffix: ' net' } }))
  assert.deepEqual(cell(table), { value: null, text: '' })
  table.setSummary(one({ kind: 'value', value: '<strong>Total</strong>' }))
  assert.equal(cell(table).text, '<strong>Total</strong>')
  table.setSummary(one({ kind: 'aggregate', operation: 'sum', scope: 'filtered' }))
  await table.setRows([
    { id: 1, amount: Number.MAX_VALUE },
    { id: 2, amount: Number.MAX_VALUE },
  ])
  assert.deepEqual(cell(table), { value: null, text: '' })
  table.setSummary(one({ kind: 'aggregate', operation: 'avg', scope: 'filtered' }))
  assert.equal(cell(table).value, Number.MAX_VALUE)
  table.setSummary([])
  assert.deepEqual(table.summaryRows.value, [])
  table.dispose()
  table.setSummary(summaries)
  assert.deepEqual(table.summary.value, [])
}

interface PendingPage {
  readonly signal: AbortSignal
  readonly resolve: (page: UiTablePage) => void
  readonly reject: (error: Error) => void
}

function verifySortIconMotion(): void {
  const full = projectMotionPolicy('full').tableSortIcon
  const reduced = projectMotionPolicy('reduced').tableSortIcon
  assert.ok(full.transition.duration > 0, 'Full motion must animate sort icon changes.')
  assert.ok(
    reduced.transition.duration > 0 && reduced.transition.duration < full.transition.duration,
    'Reduced motion must retain only a shorter sort icon fade.',
  )
  assert.ok(
    full.hidden.scale > 0 && full.hidden.scale < full.visible.scale,
    'Full motion may gently scale the outgoing sort icon.',
  )
  for (const mode of ['full', 'reduced', 'none'] as const) {
    for (const featureReady of [true, false]) {
      const policy = projectMotionPolicy(mode, featureReady)
      const icon = policy.tableSortIcon
      assert.deepEqual(icon.visible, { opacity: 1, scale: 1 })
      assert.equal(icon.hidden.opacity, 0, 'Inactive sort layers must be hidden in every mode.')
      assert.equal(policy.skipAnimations, mode === 'none' || !featureReady)
      if (mode !== 'full' || !featureReady) {
        assert.deepEqual(
          icon.hidden,
          { opacity: 0, scale: 1 },
          'Reduced, disabled and unavailable motion must not change icon geometry.',
        )
      }
      if (mode === 'none' || !featureReady) {
        assert.equal(
          icon.transition.duration,
          0,
          'Disabled or unavailable motion must show the final sort state immediately.',
        )
      }
    }
  }
}

async function verifySorting(): Promise<void> {
  const records: readonly UiTableRecord[] = [
    { id: 1, amount: 2, other: 30 },
    { id: 2, amount: 8, other: 10 },
    { id: 3, amount: -4, other: 50 },
    { id: 4, amount: 6, other: 20 },
    { id: 5, amount: 10, other: 40 },
  ]
  const columns = schema.columns.map((column) =>
    column.key === 'other' ? { ...column, sortable: true } : column,
  )
  const transitions: readonly { sort: UiTableQuery['sort']; ids: readonly number[] }[] = [
    { sort: { key: 'amount', order: 'descend' }, ids: [5, 2] },
    { sort: { key: 'amount', order: 'ascend' }, ids: [3, 1] },
    { sort: null, ids: [1, 2] },
    { sort: { key: 'other', order: 'ascend' }, ids: [2, 4] },
    { sort: { key: 'amount', order: 'descend' }, ids: [5, 2] },
  ]
  const local = useUiTable({
    schema: { ...schema, columns },
    rows: records,
    immediate: false,
  })
  await local.refresh()
  assert.equal(local.query.value.sort, null)
  assert.deepEqual(
    local.rows.value.map((row) => row['id']),
    [1, 2],
  )
  for (const { sort, ids } of transitions) {
    await local.setPage(2)
    assert.equal(local.query.value.page, 2)
    await local.setSort(sort)
    assert.deepEqual(local.query.value.sort, sort)
    assert.equal(local.query.value.page, 1)
    assert.equal(local.total.value, records.length)
    assert.deepEqual(
      local.rows.value.map((row) => row['id']),
      ids,
    )
  }

  const requests: UiTableResolvedRequest[] = []
  // Deliberately unsorted in both directions, so local sorting would corrupt the response.
  const serverRows = records.slice(0, 3)
  const remote = useUiTable({
    schema: {
      ...schema,
      columns,
      pagination: { pageSize: 3 },
      source: {
        kind: 'remote',
        request: {
          api: '/rows',
          method: 'GET',
          params: {
            page: { from: 'page' },
            limit: { from: 'pageSize' },
            sortBy: { from: 'sort.key' },
            sortOrder: { from: 'sort.order' },
          },
        },
      },
    },
    transport: {
      list: (request) => {
        requests.push(request)
        return Promise.resolve({ rows: serverRows, total: 9 })
      },
    },
    immediate: false,
  })
  await remote.refresh()
  assert.equal(remote.query.value.sort, null)
  assert.deepEqual(requests.at(-1)?.params, { page: 1, limit: 3 })
  for (const { sort } of transitions) {
    await remote.setPage(2)
    assert.equal(remote.query.value.page, 2)
    const requestCount = requests.length
    await remote.setSort(sort)
    assert.equal(requests.length, requestCount + 1)
    assert.deepEqual(remote.query.value.sort, sort)
    assert.equal(remote.query.value.page, 1)
    assert.deepEqual(requests.at(-1), {
      api: '/rows',
      method: 'GET',
      params: {
        page: 1,
        limit: 3,
        ...(sort ? { sortBy: sort.key, sortOrder: sort.order } : {}),
      },
      body: {},
    })
    assert.deepEqual(remote.rows.value, serverRows)
    assert.equal(remote.total.value, 9)
    assert.equal(remote.error.value, null)
  }
  const requestCount = requests.length
  for (const table of [local, remote]) {
    const query = table.query.value
    const rows = table.rows.value
    for (const key of ['label', 'missing']) {
      assert.throws(() => table.setSort({ key, order: 'ascend' }), /not sortable/u)
      assert.equal(table.query.value, query)
      assert.equal(table.rows.value, rows)
    }
    table.dispose()
  }
  assert.equal(requests.length, requestCount)
}

async function verifyRemote(): Promise<void> {
  const pending: PendingPage[] = []
  const summary: readonly UiTableSummaryRow[] = [
    {
      key: 'total',
      cells: {
        amount: { kind: 'value', from: 'totals.amount', format: { decimalPlaces: 2 } },
        other: { kind: 'aggregate', operation: 'sum', field: 'amount', scope: 'page' },
      },
    },
  ]
  const table = useUiTable({
    schema: {
      ...schema,
      source: { kind: 'remote', request: { api: '/rows', method: 'GET' } },
      summary,
    },
    transport: {
      list: (_request, signal) =>
        new Promise<UiTablePage>((resolve, reject) => pending.push({ signal, resolve, reject })),
    },
    immediate: false,
  })
  function take(): PendingPage {
    const request = pending.shift()
    assert.ok(request)
    return request
  }
  const first = table.refresh()
  const serverSummary = { totals: { amount: 100 } }
  take().resolve({ rows: [{ id: 1, amount: 2 }], total: 10, summary: serverSummary })
  await first
  serverSummary.totals.amount = 999
  assert.equal(cell(table).value, 100)
  assert.equal(cell(table).text, '100.00')
  const old = table.setPage(2)
  const oldRequest = take()
  const newer = table.search({ label: 'new' })
  const newRequest = take()
  assert.equal(oldRequest.signal.aborted, true)
  assert.equal(table.loading.value, true)
  assert.equal(cell(table).value, 100)
  assert.equal(cell(table, 'total', 'other').value, 2)
  newRequest.resolve({
    rows: [{ id: 3, amount: 7 }],
    total: 4,
    summary: { totals: { amount: 250 } },
  })
  await newer
  oldRequest.resolve({
    rows: [{ id: 2, amount: 9 }],
    total: 10,
    summary: { totals: { amount: 9 } },
  })
  await old
  assert.equal(table.rows.value[0]?.['id'], 3)
  assert.equal(table.total.value, 4)
  assert.equal(cell(table).value, 250)
  assert.equal(cell(table, 'total', 'other').value, 7)
  const failed = table.search({ label: 'failure' })
  take().reject(new Error('Expected failure'))
  await failed
  assert.equal(table.error.value?.message, 'Expected failure')
  assert.equal(table.rows.value[0]['id'], 3)
  assert.equal(cell(table).value, 250)
  assert.equal(cell(table, 'total', 'other').value, 7)
  const requestCount = pending.length
  table.setSummary([
    ...summary,
    { key: 'missing', cells: { amount: { kind: 'value', from: 'totals.missing' } } },
  ])
  assert.equal(pending.length, requestCount)
  assert.equal(cell(table).value, 250)
  assert.equal(cell(table, 'missing').value, null)
  table.setSummary([
    ...summary,
    { key: 'object', cells: { amount: { kind: 'value', from: 'totals' } } },
  ])
  assert.deepEqual(cell(table, 'object'), { value: null, text: '' })
  const omitted = table.refresh()
  take().resolve({ rows: [{ id: 4, amount: 6 }], total: 1 })
  await omitted
  assert.deepEqual(cell(table), { value: null, text: '' })
  assert.equal(cell(table, 'total', 'other').value, 6)
  const zero = table.refresh()
  take().resolve({ rows: [{ id: 4, amount: 6 }], total: 1, summary: { totals: { amount: 0 } } })
  await zero
  assert.deepEqual(cell(table), { value: 0, text: '0.00' })
  const nullValue = table.refresh()
  take().resolve({ rows: [{ id: 4, amount: 6 }], total: 1, summary: { totals: { amount: null } } })
  await nullValue
  assert.deepEqual(cell(table), { value: null, text: '' })
  const textValue = table.refresh()
  take().resolve({
    rows: [{ id: 4, amount: 6 }],
    total: 1,
    summary: { totals: { amount: 'Server formatted' } },
  })
  await textValue
  assert.deepEqual(cell(table), { value: 'Server formatted', text: 'Server formatted' })
  const invalid = table.refresh()
  take().resolve({ rows: [{ id: 8, amount: 3 }], total: 1, summary: { amount: Number.NaN } })
  await invalid
  assert.ok(table.error.value)
  assert.equal(table.rows.value[0]['id'], 4)
  assert.equal(cell(table).value, 'Server formatted')
  assert.throws(() => {
    table.setSummary(one({ kind: 'aggregate', operation: 'sum', scope: 'filtered' }))
  }, /local data/u)
  const late = table.refresh()
  const lateRequest = take()
  table.dispose()
  assert.equal(lateRequest.signal.aborted, true)
  lateRequest.resolve({
    rows: [{ id: 9, amount: 3 }],
    total: 1,
    summary: { totals: { amount: 3 } },
  })
  await late
  assert.equal(table.rows.value[0]['id'], 4)
  assert.equal(cell(table).value, 'Server formatted')
}

function verifyPublicValueTypes(): void {
  // This consumer must fail type checking at the three unsafe operations only.
  // Keep the probe in memory: it protects public contracts without emitting files.
  const fileName = resolve('scripts/verify/ui-contract-probe.ts')
  const source = `
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import type { UiFormCopy } from '../../packages/ui/src/components/form-contracts'
import type { UiTableController } from '../../packages/ui/src/components/table-contracts'
declare const copy: UiFormCopy
declare const table: UiTableController
const form = useUiForm({
  formId: 'probe', schema: { fields: [{ kind: 'number', name: 'age', label: 'Age' }] },
  initial: { draftId: 'probe', values: { age: 18 } }, copy,
})
form.setValue('age', null)
form.getValues().age.toFixed(0)
const row = table.rows.value[0]
if (row) row['name'] = 'after'
table.query.value.filters['name'] = 'after'
`
  const config = ts.readConfigFile(resolve('tsconfig.base.json'), (path) => ts.sys.readFile(path))
  assert.equal(config.error, undefined)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd())
  assert.deepEqual(parsed.errors, [])
  const options = { ...parsed.options, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], noEmit: true }
  const host = ts.createCompilerHost(options)
  const readSource = host.getSourceFile.bind(host)
  host.getSourceFile = (path, ...args) =>
    path === fileName
      ? ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true)
      : readSource(path, ...args)
  const program = ts.createProgram([fileName], options, host)
  const diagnostics = ts.getPreEmitDiagnostics(program)
  assert.deepEqual(
    diagnostics.map((diagnostic) => ({ file: diagnostic.file?.fileName, code: diagnostic.code })),
    [2531, 2542, 2542].map((code) => ({ file: fileName, code })),
    diagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      .join('\n'),
  )
}

async function verifyFormValueBoundaries(): Promise<void> {
  for (const operator of [['eq'], ['neq'], ['in'], ['empty'], ['not-empty'], {}, null, 1]) {
    assert.throws(
      () =>
        parseUiFormSchema({
          fields: [
            { kind: 'switch', name: 'enabled', label: 'Enabled' },
            {
              kind: 'text',
              name: 'answer',
              label: 'Answer',
              required: { field: 'enabled', operator, value: true },
            },
          ],
        }),
      /condition operator/u,
    )
  }
  const form = useUiForm({
    formId: 'value-domain',
    schema: {
      fields: [
        { kind: 'number', name: 'age', label: 'Age' },
        { kind: 'select', name: 'choice', label: 'Choice', options: [{ value: 1, label: 'One' }] },
        {
          kind: 'group',
          name: 'address',
          label: 'Address',
          fields: [{ kind: 'text', name: 'city', label: 'City' }],
        },
        { kind: 'switch', name: 'enabled', label: 'Enabled' },
        {
          kind: 'text',
          name: 'answer',
          label: 'Answer',
          required: { field: 'enabled', operator: 'eq', value: true },
        },
      ],
    },
    initial: { draftId: 'value-domain', values: { age: 18, address: {}, enabled: true } },
    copy: formCopy,
  })
  assert.equal(form.getValues().address.city, '')
  assert.equal(form.setValue('age', null), 'applied')
  assert.equal(form.getValues().age, null)
  assert.equal(form.setValue('choice', 1), 'applied')
  assert.equal(form.getValues().choice, 1)
  assert.equal(await form.validate(), 'invalid')
  assert.equal(form.field('answer').required, true)
  form.dispose()
}

async function verifyTableFormSources(): Promise<void> {
  for (const paged of [false, true]) {
    let fail = true
    let calls = 0
    const options = [{ value: 'ready', label: 'Ready' }]
    const provide = () => {
      calls += 1
      return fail ? Promise.reject(new Error('Expected option failure')) : Promise.resolve(options)
    }
    const source = paged
      ? {
          pageSize: 10,
          query: async () => ({ items: await provide(), hasNext: false }),
          resolve: () => Promise.resolve({ items: options, missing: [] }),
        }
      : provide
    const sources = { statuses: source }
    const formSchema = {
      fields: [
        {
          kind: 'select' as const,
          name: 'status',
          label: 'Status',
          options: { source: 'statuses', dependsOn: [] },
        },
      ],
    }
    const table = useUiTable({
      schema: {
        id: 'source-probe',
        rowKey: 'id',
        columns: [{ key: 'status', title: 'Status' }],
        source: { kind: 'local' },
        query: { form: formSchema },
        editor: { form: formSchema },
      },
      immediate: false,
    })
    const copy = {
      ...formCopy,
      previousOptionsPage: () => 'Previous',
      nextOptionsPage: () => 'Next',
      optionsPage: String,
    }
    const query = useUiTableQuery(table, copy, sources)
    const editor = useUiTableForm({
      table,
      copy,
      sources,
      transport: { list: () => Promise.resolve({ rows: [], total: 0 }) },
    })
    assert.equal(await editor.show('create'), true)
    const editorForm = editor.form.value
    assert.ok(editorForm)
    if (paged) {
      assert.equal(query.field('status').searchOptions(''), 'applied')
      assert.equal(editorForm.field('status').searchOptions(''), 'applied')
    }
    await new Promise<void>((resolve) => setImmediate(resolve))
    assert.equal(query.field('status').optionsState, 'failed')
    assert.equal(editorForm.field('status').optionsState, 'failed')
    fail = false
    query.field('status').retryOptions()
    editorForm.field('status').retryOptions()
    await new Promise<void>((resolve) => setImmediate(resolve))
    for (const form of [query, editorForm]) {
      assert.equal(form.field('status').optionsState, 'ready')
      assert.deepEqual(form.field('status').options, options)
      assert.equal(form.field('status').setValue('ready'), 'applied')
      assert.equal(await form.validate(), 'valid')
    }
    assert.ok(calls >= 4)
    query.dispose()
    editor.dispose()
    table.dispose()
  }
}

async function verifyTableReadonlySnapshots(): Promise<void> {
  const table = useUiTable({
    schema: {
      id: 'readonly',
      rowKey: 'id',
      columns: [{ key: 'id', title: 'ID' }],
      source: { kind: 'local' },
    },
    rows: [{ id: 1, nested: { title: 'Before' }, tags: ['first'] }],
    filters: { nested: { title: '' } },
    immediate: false,
  })
  await table.refresh()
  const row = table.rows.value[0]
  assert.ok(row)
  assert.equal(Reflect.set(row, 'id', 2), false)
  assert.equal(Object.isFrozen(row['nested']), true)
  assert.equal(Object.isFrozen(row['tags']), true)
  assert.equal(Reflect.set(table.query.value.filters, 'name', 'After'), false)
  assert.equal(Object.isFrozen(table.query.value.filters['nested']), true)
  table.dispose()
}

function verifyColumnDisplay(): void {
  const base = { key: 'value', title: 'Value' }
  assert.equal(
    resolveTableColumnDisplay(
      { ...base, kind: 'boolean', emptyText: 'missing' },
      true,
      (value) => (value === true ? 'Yes' : 'No'),
      (value) => value,
    ).text,
    'Yes',
  )
  assert.equal(
    resolveTableColumnDisplay(
      { ...base, kind: 'number', emptyText: 'missing' },
      'invalid',
      () => 'Wrong',
      (value) => value,
    ).text,
    'missing',
  )
  assert.equal(
    resolveTableColumnDisplay(
      { ...base, kind: 'number', emptyText: 'missing' },
      12,
      (value) => (typeof value === 'number' ? value.toFixed(2) : ''),
      (value) => value,
    ).text,
    '12.00',
  )
  const fallback = (value: unknown) =>
    typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : 'Empty'
  const translated = (text: string) => `translated:${text}`
  assert.deepEqual(
    resolveTableColumnDisplay(
      { ...base, format: { decimalPlaces: 2, prefix: '$', suffix: ' USD' } },
      12.3,
      fallback,
      translated,
    ),
    { text: '$12.30 USD', tone: undefined },
  )
  assert.equal(
    resolveTableColumnDisplay({ ...base, emptyText: 'missing' }, null, fallback, translated).text,
    'translated:missing',
  )
  const options = [
    { value: true, label: 'enabled', tone: 'success' as const },
    { value: 'true', label: 'literal' },
  ]
  assert.deepEqual(resolveTableColumnDisplay({ ...base, options }, true, fallback, translated), {
    text: 'translated:enabled',
    tone: 'success',
  })
  assert.equal(
    resolveTableColumnDisplay({ ...base, options }, 'true', fallback, translated).text,
    'translated:literal',
  )
  assert.equal(
    resolveTableColumnDisplay({ ...base, options }, 'unknown', fallback, translated).text,
    'unknown',
  )
  const schema = { id: 'format', rowKey: 'id', source: { kind: 'local' }, columns: [base] }
  for (const invalid of [
    { align: 'top' },
    { overflow: 'hidden' },
    { format: { decimalPlaces: 21 } },
    { format: { expression: 'x' } },
    {
      options: [
        { value: 1, label: 'a' },
        { value: 1, label: 'b' },
      ],
    },
    { options: [{ value: {}, label: 'x' }] },
    { options: [{ value: 'a', label: 'A', tone: 'red' }] },
  ])
    assert.throws(() => {
      parseUiTableSchema({ ...schema, columns: [{ ...base, ...invalid }] })
    })
  assert.doesNotThrow(() => {
    parseUiTableSchema({
      ...schema,
      columns: [
        {
          ...base,
          align: 'center',
          overflow: 'ellipsis',
          options,
          format: { decimalPlaces: 2 },
          emptyText: '',
        },
      ],
    })
  })
}

function verifyColumnManipulation(): void {
  const neighbors = [
    { key: 'a', title: 'A' },
    { key: 'hidden', title: 'Hidden', hidden: true },
    { key: 'b', title: 'B' },
  ]
  assert.equal(adjacentVisibleTableColumn(neighbors, 'a', 'right'), 'b')
  assert.equal(adjacentVisibleTableColumn(neighbors, 'b', 'left'), 'a')
  assert.equal(adjacentVisibleTableColumn(neighbors, 'a', 'left'), undefined)
  const stored = new Map<string, unknown>()
  const storage = {
    read: (key: string): unknown => stored.get(key),
    write: (key: string, value: unknown): void => {
      stored.set(key, structuredClone(value))
    },
    clear: (key: string): void => {
      stored.delete(key)
    },
  }
  const schema: UiTableSchema = {
    id: 'column-manipulation',
    rowKey: 'id',
    source: { kind: 'local' },
    columnPreferenceKey: 'manipulation',
    reorderableColumns: true,
    columns: [
      { key: 'id', title: 'ID', width: 120, minWidth: 80, maxWidth: 200, resizable: true },
      { key: 'name', title: 'Name', width: 240 },
      { key: 'amount', title: 'Amount', hidden: true },
    ],
  }
  const create = () => useUiTable({ schema, columnPreferenceStorage: storage, immediate: false })
  const table = create()
  table.setColumnWidth('id', 1000)
  assert.equal(table.columns.value[0]?.width, 200)
  table.setColumnWidth('id', 10)
  assert.equal(table.columns.value[0].width, 80)
  table.setColumnWidth('id', 152.5)
  table.reorderColumn('id', 'amount', 'after')
  assert.deepEqual(
    table.columns.value.map((column) => column.key),
    ['name', 'amount', 'id'],
  )
  assert.equal(table.columns.value[1]?.hidden, true)
  const restored = create()
  assert.deepEqual(
    restored.columns.value,
    table.columns.value.map((column) => ({ ...column, hidden: column.hidden === true })),
  )
  restored.reorderColumn('id', 'name', 'before')
  assert.equal(restored.columns.value[0]?.key, 'id')
  assert.throws(() => {
    table.setColumnWidth('missing', 100)
  })
  for (const width of [NaN, Infinity, 0, -1])
    assert.throws(() => {
      table.setColumnWidth('id', width)
    })
  for (const column of [
    { width: Infinity },
    { minWidth: 0 },
    { maxWidth: -1 },
    { minWidth: 200, maxWidth: 100 },
    { width: 60, minWidth: 80 },
    { width: 300, maxWidth: 200 },
    { resizable: 'yes' },
  ])
    assert.throws(() =>
      parseUiTableSchema({ ...schema, columns: [{ key: 'id', title: 'ID', ...column }] }),
    )
  const narrowed = useUiTable({
    schema: { ...schema, columns: [{ key: 'id', title: 'ID', maxWidth: 100 }] },
    columnPreferenceStorage: storage,
    immediate: false,
  })
  assert.equal(narrowed.columns.value[0]?.width, 100)
  for (const width of [NaN, Infinity, 0, -1, '100']) {
    stored.set('manipulation', { schemaVersion: 1, columns: [{ key: 'id', hidden: false, width }] })
    assert.deepEqual(create().columns.value, schema.columns)
  }
  table.resetColumns()
  assert.equal(stored.has('manipulation'), false)
  assert.deepEqual(table.columns.value, schema.columns)
  table.dispose()
  table.setColumnWidth('id', 180)
  table.reorderColumn('id', 'amount', 'after')
  assert.deepEqual(table.columns.value, schema.columns)
  restored.dispose()
  narrowed.dispose()
}

function verifyColumnPreferences(): void {
  const stored = new Map<string, unknown>()
  let writes = 0
  const storage = {
    read: (key: string): unknown => stored.get(key),
    write: (key: string, value: unknown): void => {
      writes++
      stored.set(key, structuredClone(value))
    },
    clear: (key: string): void => {
      stored.delete(key)
    },
  }
  const schema: UiTableSchema = {
    id: 'preferences',
    rowKey: 'id',
    source: { kind: 'local' },
    columnPreferenceKey: 'first',
    columns: [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
      { key: 'old', title: 'Old' },
    ],
  }
  const create = (configuration = schema) =>
    useUiTable({ schema: configuration, columnPreferenceStorage: storage, immediate: false })
  const first = create()
  assert.equal(writes, 0)
  first.moveColumn('name', 'up')
  first.setColumnVisibility('old', false)
  assert.deepEqual(stored.get('first'), {
    schemaVersion: 1,
    columns: [
      { key: 'name', hidden: false },
      { key: 'id', hidden: false },
      { key: 'old', hidden: true },
    ],
  })
  first.dispose()
  first.resetColumns()
  assert.equal(stored.has('first'), true)
  const restored = create()
  assert.deepEqual(
    restored.columns.value.map((c) => c.key),
    ['name', 'id', 'old'],
  )
  assert.equal(restored.columns.value[2]?.hidden, true)
  assert.equal(writes, 2)
  const independent = create({ ...schema, columnPreferenceKey: 'second' })
  assert.deepEqual(independent.columns.value, schema.columns)
  const changed = create({
    ...schema,
    columns: [
      { key: 'id', title: 'New ID', width: 123 },
      { key: 'name', title: 'New Name' },
      { key: 'added', title: 'Added', hidden: true },
    ],
  })
  assert.deepEqual(
    changed.columns.value.map((c) => c.key),
    ['name', 'id', 'added'],
  )
  assert.equal(changed.columns.value[1]?.width, 123)
  assert.equal(changed.columns.value[2]?.hidden, true)
  stored.set('first', {
    schemaVersion: 1,
    columns: [
      { key: 'id', hidden: true },
      { key: 'name', hidden: true },
      { key: 'old', hidden: true },
    ],
  })
  assert.ok(create().columns.value.some((c) => !c.hidden))
  for (const invalid of [
    null,
    'bad',
    { schemaVersion: 2, columns: [] },
    { schemaVersion: 1, columns: [{ key: 'id', hidden: 'yes' }] },
    {
      schemaVersion: 1,
      columns: [
        { key: 'id', hidden: true },
        { key: 'id', hidden: false },
      ],
    },
  ]) {
    stored.set('first', invalid)
    assert.deepEqual(create().columns.value, schema.columns)
  }
  restored.resetColumns()
  assert.equal(stored.has('first'), false)
  assert.deepEqual(create().columns.value, schema.columns)
  assert.throws(() => useUiTable({ schema }), /storage port/)
  assert.throws(() => parseUiTableSchema({ ...schema, columnPreferenceKey: ' ' }))
  const unavailable = useUiTable({
    schema,
    columnPreferenceStorage: {
      read() {
        throw new Error('unavailable')
      },
      write() {
        throw new Error('quota')
      },
      clear() {
        throw new Error('denied')
      },
    },
    immediate: false,
  })
  unavailable.setColumnVisibility('old', false)
  unavailable.moveColumn('name', 'up')
  unavailable.resetColumns()
  assert.deepEqual(unavailable.columns.value, schema.columns)
  const disabled = create({
    id: schema.id,
    rowKey: schema.rowKey,
    columns: schema.columns,
    source: schema.source,
  })
  disabled.setColumnVisibility('old', false)
  assert.equal(stored.has('first'), false)
}
async function verifyCommonFormFields(): Promise<void> {
  const schema = parseUiFormSchema({
    fields: [
      {
        kind: 'radio',
        name: 'choice',
        label: 'Choice',
        options: [
          { value: 1, label: 'One' },
          { value: '1', label: 'String one' },
        ],
        required: true,
      },
      {
        kind: 'checkbox-group',
        name: 'choices',
        label: 'Choices',
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
        rules: { minLength: 2 },
      },
      { kind: 'date-range', name: 'period', label: 'Period', required: true },
      { kind: 'time', name: 'time', label: 'Time', required: true },
    ],
  })
  const form = useUiForm({
    formId: 'common-fields',
    schema,
    initial: { draftId: 'sample', values: { choice: null, choices: [], period: null, time: null } },
    copy: formCopy,
  })
  assert.equal(await form.validate(), 'invalid')
  assert.equal(form.field('choice').setValue(1), 'applied')
  assert.equal(form.field('choices').setValue([1, 2]), 'applied')
  assert.equal(form.field('period').setValue(['2026-11-01', '2026-11-30']), 'applied')
  assert.equal(form.field('time').setValue('09:30:00'), 'applied')
  assert.equal(await form.validate(), 'valid')
  assert.equal(form.field('choice').selectedOptions[0]?.option?.label, 'One')
  for (const [kind, invalid] of [
    ['time', '24:00:00'],
    ['time', '09:30'],
    ['date-range', ['2026-11-30', '2026-11-01']],
    ['date-range', ['2026-02-30', '2026-03-01']],
    ['date-range', ['2026-11-01']],
  ])
    assert.throws(() =>
      parseUiFormSchema({
        fields: [{ kind, name: 'invalid', label: 'Invalid', defaultValue: invalid }],
      }),
    )
  assert.throws(() =>
    parseUiFormSchema({
      fields: [
        {
          kind: 'checkbox-group',
          name: 'invalid',
          label: 'Invalid',
          options: [],
          defaultValue: [1, 1],
        },
      ],
    }),
  )
  form.dispose()
}
async function verifyFormSteps(): Promise<void> {
  assert.throws(() =>
    parseUiFormSchema({
      fields: [
        { kind: 'text', name: 'a', label: 'A' },
        { kind: 'text', name: 'b', label: 'B' },
      ],
      steps: [{ name: 'one', label: 'One', fields: ['a'] }],
    }),
  )
  assert.throws(() =>
    parseUiFormSchema({
      fields: [{ kind: 'text', name: 'a', label: 'A' }],
      steps: [
        { name: 'one', label: 'One', fields: ['a'] },
        { name: 'two', label: 'Two', fields: ['a'] },
      ],
    }),
  )
  const schema = parseUiFormSchema({
    fields: [
      { kind: 'text', name: 'name', label: 'Name', required: true },
      {
        kind: 'text',
        name: 'phone',
        label: 'Phone',
        required: { field: 'needsPhone', operator: 'eq', value: true },
        hidden: { field: 'needsPhone', operator: 'eq', value: false },
      },
      { kind: 'switch', name: 'needsPhone', label: 'Need phone' },
      { kind: 'text', name: 'city', label: 'City', required: true },
    ],
    steps: [
      { name: 'identity', label: 'Identity', fields: ['name', 'needsPhone', 'phone'] },
      { name: 'location', label: 'Location', fields: ['city'] },
    ],
  })
  const form = useUiForm({
    formId: 'form-steps',
    schema,
    initial: {
      draftId: 'steps',
      values: { name: '', needsPhone: false, phone: '', city: '' },
    },
    copy: {
      ...formCopy,
      previousStep: () => 'Previous',
      nextStep: () => 'Next',
    },
  })
  assert.equal(form.activeStepIndex.value, 0)
  assert.equal(await form.goNextStep(), 'invalid')
  assert.equal(form.activeStepIndex.value, 0)
  assert.ok(form.issues.value.some((issue) => issue.field === 'name'))
  assert.equal(form.setValue('name', 'Ada'), 'applied')
  assert.equal(await form.goNextStep(), 'applied')
  assert.equal(form.activeStepIndex.value, 1)
  assert.equal(form.getValue('name'), 'Ada')
  assert.equal(await form.goBackStep(), 'applied')
  assert.equal(form.activeStepIndex.value, 0)
  assert.equal(form.getValue('name'), 'Ada')
  assert.equal(await form.goNextStep(), 'applied')
  assert.equal(await form.validate(), 'invalid')
  assert.equal(form.activeStepIndex.value, 1)
  assert.ok(form.issues.value.some((issue) => issue.field === 'city'))
  assert.equal(form.stepIndexForField('city'), 1)
  assert.equal(form.setValue('city', 'London'), 'applied')
  assert.equal(await form.validate(), 'valid')
  assert.equal(form.setValue('needsPhone', true), 'applied')
  assert.equal(await form.setActiveStep(0), 'applied')
  assert.equal(await form.goNextStep(), 'invalid')
  assert.equal(form.activeStepIndex.value, 0)
  assert.ok(form.issues.value.some((issue) => issue.field === 'phone'))
  assert.equal(form.setValue('phone', '123'), 'applied')
  assert.equal(await form.goNextStep(), 'applied')
  assert.equal(await form.setActiveStep(0, { relax: true }), 'applied')
  assert.equal(form.activeStepIndex.value, 0)
  form.reset()
  assert.equal(form.activeStepIndex.value, 0)
  form.dispose()

  const stepCopy = { ...formCopy, previousStep: () => 'Back', nextStep: () => 'Next' }
  const simpleSchema = parseUiFormSchema({
    fields: [
      { kind: 'text', name: 'a', label: 'A', required: true },
      { kind: 'number', name: 'b', label: 'B', required: true },
    ],
    steps: [
      { name: 'first', label: 'First', fields: ['a'] },
      { name: 'second', label: 'Second', fields: ['b'] },
    ],
  })
  let customCalls = 0
  let customIssue: 'current' | 'future' | 'global' = 'current'
  const scoped = useUiForm({
    formId: 'step-validation',
    schema: simpleSchema,
    copy: stepCopy,
    initial: { draftId: 'r', values: { a: 'ready', b: null } },
    validation: () => {
      customCalls += 1
      return [
        {
          field: customIssue === 'global' ? null : customIssue === 'current' ? 'a' : 'b',
          message: () => 'Custom rejection',
        },
      ]
    },
  })
  assert.equal(await scoped.goNextStep(), 'invalid')
  assert.equal(customCalls, 1)
  assert.equal(scoped.activeStepIndex.value, 0)
  assert.deepEqual(
    scoped.issues.value.map((issue) => issue.field),
    ['a'],
  )
  customIssue = 'global'
  assert.equal(await scoped.goNextStep(), 'invalid')
  assert.deepEqual(
    scoped.issues.value.map((issue) => issue.field),
    [null],
  )
  customIssue = 'future'
  assert.equal(await scoped.goNextStep(), 'applied')
  assert.equal(scoped.issues.value.length, 0)
  assert.equal(await scoped.goBackStep(), 'applied')
  scoped.field('a').blur()
  for (let tick = 0; tick < 12; tick += 1) await nextTick()
  assert.equal(scoped.issues.value.length, 0, 'Blur must not publish unseen step errors')
  scoped.dispose()

  const buffered = useUiForm({
    formId: 'step-pending',
    schema: simpleSchema,
    copy: stepCopy,
    initial: { draftId: 'r', values: { a: 'ready', b: null } },
  })
  assert.equal(await buffered.goNextStep(), 'applied')
  const control = buffered.field('b')
  let commits = 0
  control.setCommitTarget(() => {
    commits += 1
    return false
  })
  control.setPendingInput(true)
  assert.equal(await buffered.goBackStep(), 'blocked')
  assert.equal(commits, 1)
  assert.equal(buffered.activeStepIndex.value, 1)
  assert.equal(buffered.hasPendingInput.value, true)
  assert.equal(await buffered.setActiveStep(0, { relax: true }), 'blocked')
  assert.equal(buffered.activeStepIndex.value, 1)
  control.setCommitTarget(() => {
    control.setValue(42)
    control.setPendingInput(false)
    return true
  })
  assert.equal(await buffered.goBackStep(), 'applied')
  assert.equal(buffered.getValue('b'), 42)
  assert.equal(buffered.hasPendingInput.value, false)
  control.setCommitTarget(null)
  assert.equal(await buffered.setActiveStep(1, { relax: true }), 'applied')
  buffered.setValue('a', '')
  assert.equal(await buffered.submit(), 'invalid')
  assert.equal(
    buffered.activeStepIndex.value,
    0,
    'Submit must reveal an off-step error despite temporary submission locking',
  )
  buffered.dispose()

  let finishValidation: (() => void) | undefined
  const race = useUiForm({
    formId: 'step-race',
    schema: simpleSchema,
    copy: stepCopy,
    initial: { draftId: 'r', values: { a: 'ready', b: 1 } },
    validation: () =>
      new Promise((resolve) => {
        finishValidation = () => {
          resolve([])
        }
      }),
  })
  const advance = race.goNextStep()
  for (let tick = 0; tick < 8; tick += 1) await nextTick()
  assert.ok(finishValidation)
  race.reset()
  finishValidation()
  assert.equal(await advance, 'cancelled')
  assert.equal(race.activeStepIndex.value, 0, 'A stale validation must not advance a reset record')
  race.dispose()
}
async function verifyMultipleSorting(): Promise<void> {
  const records = [
    { id: 1, category: 'low', amount: 2 },
    { id: 2, category: 'high', amount: 3 },
    { id: 3, category: 'high', amount: 1 },
    { id: 4, category: 'low', amount: 2 },
  ]
  const config: UiTableSchema = {
    id: 'multi-sort',
    rowKey: 'id',
    source: { kind: 'local' },
    sorting: 'multiple',
    pagination: { pageSize: 10 },
    columns: [
      { key: 'category', title: 'Category', sortable: true, sortComparator: 'priority' },
      { key: 'amount', title: 'Amount', sortable: true },
    ],
  }
  const table = useUiTable({
    schema: parseUiTableSchema(JSON.parse(JSON.stringify(config))),
    rows: records,
    sortComparators: {
      priority: (left, right) => Number(left === 'low') - Number(right === 'low'),
    },
  })
  await table.setSorts([
    { key: 'category', order: 'ascend' },
    { key: 'amount', order: 'descend' },
  ])
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [2, 3, 1, 4],
  )
  assert.deepEqual(table.query.value.sort, table.query.value.sorts[0])
  await table.setSorts([
    { key: 'category', order: 'ascend' },
    { key: 'amount', order: 'ascend' },
  ])
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [3, 2, 1, 4],
  )
  const query = table.query.value
  assert.throws(
    () =>
      table.setSorts([
        { key: 'amount', order: 'ascend' },
        { key: 'amount', order: 'descend' },
      ]),
    /duplicate/u,
  )
  assert.throws(() => table.setSorts([{ key: 'amount', order: 'invalid' as 'ascend' }]), /Invalid/u)
  assert.equal(table.query.value, query)
  await table.setSort({ key: 'amount', order: 'ascend' })
  assert.equal(table.query.value.sorts.length, 1)
  await table.reset()
  assert.deepEqual(table.query.value.sorts, [])
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1, 2, 3, 4],
  )
  table.dispose()
  assert.throws(() => useUiTable({ schema: config }), /Unknown table sort comparator/u)
  assert.throws(() => parseUiTableSchema({ ...config, sorting: 'unexpected' }))
  assert.throws(() =>
    parseUiTableSchema({
      ...config,
      columns: [{ key: 'amount', title: 'Amount', sortComparator: 'priority' }],
    }),
  )
  assert.throws(
    () =>
      parseUiTableSchema({
        ...config,
        source: { kind: 'remote', request: { api: '/rows', method: 'GET' } },
      }),
    /server/u,
  )
  const bad = useUiTable({
    schema: config,
    rows: records,
    sortComparators: { priority: () => NaN },
  })
  await bad.setSort({ key: 'category', order: 'ascend' })
  assert.match(bad.error.value?.message ?? '', /finite/u)
  bad.dispose()
  const single = useUiTable({
    schema: {
      ...config,
      sorting: 'single',
      columns: [{ key: 'amount', title: 'Amount', sortable: true }],
    },
    rows: records,
  })
  assert.throws(
    () =>
      single.setSorts([
        { key: 'amount', order: 'ascend' },
        { key: 'category', order: 'ascend' },
      ]),
    /Multiple sorting/u,
  )
  single.dispose()
  let received: UiTableResolvedRequest | undefined
  const remote = useUiTable({
    schema: {
      ...config,
      columns: config.columns.map(({ key, title }) => ({ key, title, sortable: true })),
      source: {
        kind: 'remote',
        request: {
          api: '/rows',
          method: 'POST',
          body: { sorting: { from: 'sorts' }, primary: { from: 'sort.key' } },
        },
      },
    },
    transport: {
      list: (request) => {
        received = request
        return Promise.resolve({ rows: records, total: records.length })
      },
    },
  })
  await remote.setSorts([
    { key: 'category', order: 'descend' },
    { key: 'amount', order: 'ascend' },
  ])
  assert.ok(received)
  assert.deepEqual(received.body['sorting'], remote.query.value.sorts)
  assert.equal(received.body['primary'], 'category')
  assert.deepEqual(
    remote.rows.value,
    records,
    'Remote ordering must not be replaced by local sorting.',
  )
  await remote.setSorts([])
  assert.deepEqual(received.body['sorting'], [])
  remote.dispose()
}
function verifyColumnGroups(): void {
  const config = {
    id: 'grouped',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'name', title: 'Name', fixed: 'left' },
      { key: 'amount', title: 'Amount', sortable: true },
      { key: 'stock', title: 'Stock' },
      { key: 'other', title: 'Other' },
    ],
    columnGroups: [
      {
        key: 'business',
        title: 'Business',
        children: ['name', { key: 'metrics', title: 'Metrics', children: ['amount', 'stock'] }],
      },
    ],
  }
  const schema = parseUiTableSchema(config)
  const groups = schema.columnGroups ?? []
  const tree = projectTableColumnGroups(schema.columns, groups)
  function leaves(nodes: readonly TableHeaderNode[]): string[] {
    return nodes.flatMap((node) =>
      node.kind === 'column' ? [node.column.key] : leaves(node.children),
    )
  }
  assert.deepEqual(leaves(tree), ['name', 'amount', 'stock', 'other'])
  assert.equal(tree.length, 3, 'Pinned and center group sections remain separate.')
  assert.equal(tree[0]?.kind === 'group' && tree[0].fixed, 'left')
  const amount = schema.columns[1]
  const stock = schema.columns[2]
  const other = schema.columns[3]
  assert.ok(amount && stock && other)
  const split = projectTableColumnGroups([amount, other, stock], groups)
  assert.equal(split.length, 3, 'Separated members must not reorder unrelated columns.')
  assert.deepEqual(leaves(split), ['amount', 'other', 'stock'])
  const hidden = projectTableColumnGroups(
    schema.columns.map((col) => ({ ...col, hidden: col.key !== 'other' })),
    groups,
  )
  assert.deepEqual(hidden, [{ kind: 'column', column: { ...other, hidden: false } }])
  assert.deepEqual(leaves(projectTableColumnGroups([stock, amount], groups)), ['stock', 'amount'])
  for (const columnGroups of [
    [{ key: 'group', title: 'Group', children: ['missing'] }],
    [{ key: 'group', title: 'Group', children: ['amount', 'amount'] }],
    [{ key: 'amount', title: 'Group', children: ['stock'] }],
    [{ key: 'group', title: 'Group', children: [] }],
    [{ key: 'group', title: 'Group', children: ['amount'], fixed: 'left' }],
    [
      {
        key: 'group',
        title: 'Group',
        children: [{ key: 'group', title: 'Nested', children: ['stock'] }],
      },
    ],
  ])
    assert.throws(() => parseUiTableSchema({ ...config, columnGroups }))
  const table = useUiTable({
    schema,
    rows: [
      { id: 1, amount: 2 },
      { id: 2, amount: 1 },
    ],
  })
  table.setColumnVisibility('stock', false)
  assert.equal(
    leaves(projectTableColumnGroups(table.columns.value, groups)).includes('stock'),
    false,
  )
  table.moveColumn('amount', 'down')
  assert.deepEqual(
    leaves(projectTableColumnGroups(table.columns.value, groups)),
    table.columns.value.filter((col) => !col.hidden).map((col) => col.key),
  )
  table.resetColumns()
  assert.deepEqual(leaves(projectTableColumnGroups(table.columns.value, groups)), [
    'name',
    'amount',
    'stock',
    'other',
  ])
  table.dispose()
}
async function verifyCsvExport(): Promise<void> {
  const schema: UiTableSchema = {
    id: 'csv',
    rowKey: 'id',
    source: { kind: 'local' },
    selection: 'multiple',
    pagination: { pageSize: 2 },
    csvExport: { fileName: '中文.csv', scopes: ['page', 'selected'] },
    columns: [
      { key: 'name', title: '名称' },
      { key: 'amount', title: '金额', sortable: true },
      { key: 'profile.note', title: '备注' },
      { key: 'secret', title: 'Hidden', hidden: true },
    ],
  }
  const table = useUiTable({
    schema,
    immediate: false,
    rows: [
      {
        id: 1,
        name: '中文,"引号"\n换行',
        amount: -2,
        profile: { note: '=SUM(A1)' },
        secret: 'not exported',
      },
      { id: 2, name: ' @formula', amount: 3, profile: { note: '\t=1+1' } },
      { id: 3, name: 'third', amount: 1, profile: { note: null } },
    ],
  })
  assert.throws(() => table.exportCsv('page'), /No rows/)
  await table.refresh()
  const file = table.exportCsv('page')
  assert.equal(file.fileName, '中文.csv')
  assert.equal(file.mimeType, 'text/csv;charset=utf-8')
  assert.equal(file.rowCount, 2)
  assert.equal(
    file.content,
    '\uFEFF"名称","金额","备注"\r\n"中文,""引号""\n换行","-2","\'=SUM(A1)"\r\n"\' @formula","3","\'\t=1+1"\r\n',
  )
  assert.ok(!file.content.includes('not exported'))
  assert.throws(() => table.exportCsv('selected'), /No rows/)
  table.setSelection([2])
  assert.equal(table.exportCsv('selected').rowCount, 1)
  table.moveColumn('amount', 'up')
  table.setColumnVisibility('profile.note', false)
  assert.ok(table.exportCsv('page').content.startsWith('\uFEFF"金额","名称"'))
  await table.setSort({ key: 'amount', order: 'descend' })
  assert.ok(table.exportCsv('page').content.includes('"third"'))
  assert.throws(() => table.exportCsv('selected'), /No rows/)
  await table.setPage(2)
  assert.equal(table.exportCsv('page').rowCount, 1)
  table.dispose()
  assert.throws(() => table.exportCsv('page'), /not ready/)
  for (const invalid of [
    { ...schema, csvExport: { fileName: '../data.csv', scopes: ['page'] } },
    { ...schema, csvExport: { fileName: 'data.csv', scopes: ['all'] } },
    { ...schema, csvExport: { fileName: 'data.csv', scopes: ['page', 'page'] } },
    { ...schema, selection: 'none', csvExport: { fileName: 'data.csv', scopes: ['selected'] } },
  ])
    assert.throws(() => parseUiTableSchema(invalid))
  let requests = 0
  const remote = useUiTable({
    schema: { ...schema, source: { kind: 'remote', request: { api: '/rows', method: 'GET' } } },
    immediate: false,
    transport: {
      list: () => {
        requests += 1
        return Promise.resolve({ rows: [{ id: 1, name: 'remote' }], total: 200 })
      },
    },
  })
  await remote.refresh()
  assert.equal(remote.exportCsv('page').rowCount, 1)
  assert.equal(requests, 1, 'CSV export never fetches other pages')
  remote.dispose()
}
async function verifyInlineEditing(): Promise<void> {
  const original = [
    { id: 1, title: 'Original', stock: 9 },
    { id: 2, title: 'Other', stock: 3 },
  ]
  const schema: UiTableSchema = {
    id: 'inline-probe',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [{ key: 'title', title: 'Title', sortable: true }],
    pagination: { pageSize: 1 },
    editor: {
      form: {
        fields: [
          { kind: 'text', name: 'title', label: 'Title', required: true },
          { kind: 'number', name: 'stock', label: 'Stock', required: true, min: 0 },
        ],
      },
      update: {
        api: '/update',
        method: 'PATCH',
        body: {
          id: { from: 'row.id' },
          title: { from: 'form.title' },
          stock: { from: 'form.stock' },
        },
      },
    },
  }
  const table = useUiTable({ schema, rows: original, immediate: false })
  await table.refresh()
  let fail = true
  const calls: UiTableResolvedRequest[] = []
  const session = useUiTableForm({
    table,
    copy: formCopy,
    transport: {
      list: () => Promise.resolve({ rows: original, total: original.length }),
      mutate: (request) => {
        calls.push(request)
        return fail ? Promise.reject(new Error('Offline')) : Promise.resolve()
      },
    },
  })
  assert.equal(await session.show('edit', original[0], { fields: ['title'] }), true)
  assert.equal(Object.isFrozen(session.row.value), true)
  const form = session.form.value
  assert.ok(form)
  assert.equal(form.fields.length, 1)
  form.field('title').setValue('')
  await form.submit()
  assert.equal(calls.length, 0, 'Invalid cell never submits')
  form.field('title').setValue('Changed')
  await table.setPage(2)
  await table.setSort({ key: 'title', order: 'descend' })
  await form.submit()
  assert.equal(session.open.value, true, 'Failure keeps the draft open')
  assert.ok(form.field('title').value === 'Changed')
  assert.deepEqual(
    calls[0]?.body,
    { id: 1, title: 'Changed', stock: 9 },
    'Stable identity and untouched values survive query changes',
  )
  assert.equal(session.close(), false, 'Dirty draft cannot be silently replaced')
  fail = false
  await form.submit()
  await nextTick()
  assert.equal(session.open.value, false)
  session.release()
  assert.equal(await session.show('edit', original[0], { fields: ['title', 'stock'] }), true)
  session.form.value?.field('stock').setValue(25)
  assert.equal(session.close(true), true)
  session.release()
  assert.equal(original[0]?.stock, 9, 'Cancel never changes source records')
  assert.equal(await session.show('edit', original[0], { fields: ['missing'] }), false)
  assert.ok(session.error.value)
  session.dispose()
  table.dispose()
}
async function verifyConfiguredInlineEditing(): Promise<void> {
  const schema: UiTableSchema = {
    id: 'configured-inline',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'name', title: 'Name' },
      { key: 'count', title: 'Count' },
    ],
    editor: {
      inline: { mode: 'cell', fields: ['name', 'count'] },
      form: {
        fields: [
          { kind: 'text', name: 'name', label: 'Name', required: true },
          { kind: 'number', name: 'count', label: 'Count' },
        ],
        steps: [
          { name: 'name-step', label: 'Name', fields: ['name'] },
          { name: 'count-step', label: 'Count', fields: ['count'] },
        ],
      },
      update: {
        api: '/rows/{id}',
        method: 'PATCH',
        path: { id: { from: 'row.id' } },
        body: { name: { from: 'form.name' }, count: { from: 'form.count' } },
      },
    },
  }
  const row = { id: 1, name: 'Before', count: 4 }
  const table = useUiTable({ schema, rows: [row], immediate: false })
  const requests: UiTableResolvedRequest[] = []
  const session = useUiTableForm({
    table,
    copy: formCopy,
    transport: {
      list: () => Promise.resolve({ rows: [row], total: 1 }),
      mutate: (value) => {
        requests.push(value)
        return Promise.resolve()
      },
    },
  })
  assert.equal(await session.showInline(row, 'name'), true)
  assert.equal(session.isInlineEditing(row, 'name'), true)
  assert.equal(session.isInlineEditing({ ...row, id: 2 }, 'name'), false)
  assert.equal(session.isInlineEditing(row, 'count'), false)
  assert.equal(
    await session.showInline({ ...row, id: 2 }),
    false,
    'Active inline draft cannot be replaced',
  )
  assert.equal(
    session.form.value?.schema.steps,
    undefined,
    'Scoped editing does not retain an invalid step partition',
  )
  session.form.value?.field('name').setValue('')
  assert.equal(await session.saveInline(), 'invalid')
  assert.equal(requests.length, 0)
  session.form.value?.field('name').setValue('After')
  await session.saveInline()
  await nextTick()
  assert.deepEqual(requests[0]?.body, { name: 'After', count: 4 })
  assert.equal(session.open.value, false)
  assert.equal(session.inlineFields.value.length, 0)
  assert.equal(await session.showInline(row), true)
  assert.equal(session.isInlineEditing(row, 'count'), true)
  session.form.value?.field('count').setValue(10)
  assert.equal(session.close(true), true)
  session.release()
  assert.equal(row.count, 4)
  await assert.rejects(session.showInline(row, 'missing'))
  for (const inline of [
    { fields: [] },
    { fields: ['name', 'name'] },
    { fields: ['missing'] },
    { mode: 'popup', fields: ['name'] },
  ])
    assert.throws(() => {
      parseUiTableSchema({ ...schema, editor: { ...schema.editor, inline } })
    })
  session.dispose()
  table.dispose()
}
function verifySelectionLimit(): void {
  const schema: UiTableSchema = {
    id: 'selection-cap',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [{ key: 'id', title: 'ID' }],
    selection: 'multiple',
    maxSelection: 2,
  }
  const table = useUiTable({ schema, rows: [{ id: 1 }, { id: 2 }, { id: 3 }], immediate: false })
  // Local data is loaded synchronously during refresh's local branch.
  void table.refresh()
  assert.equal(table.setSelection([1, 2]), true)
  assert.equal(table.setSelection([1, 2, 3]), false)
  assert.deepEqual(table.selectedKeys.value, [1, 2])
  assert.equal(table.setSelection([2]), true)
  assert.equal(table.setSelection([2, 3]), true)
  assert.equal(table.setSelection([]), true)
  for (const maxSelection of [0, -1, 1.5, Infinity])
    assert.throws(() => {
      parseUiTableSchema({ ...schema, maxSelection })
    })
  assert.throws(() => {
    parseUiTableSchema({ ...schema, selection: 'single' })
  })
  table.dispose()
  assert.equal(table.setSelection([1]), false)
}
verifySelectionLimit()
async function verifyKeywordSearch(): Promise<void> {
  const schema: UiTableSchema = {
    id: 'keyword',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [
      { key: 'name', title: 'Name' },
      { key: 'category', title: 'Category' },
    ],
    keywordSearch: { parameter: 'keyword', fields: ['name', 'category'] },
    pagination: { pageSize: 1 },
  }
  const table = useUiTable({
    schema,
    rows: [
      { id: 1, name: 'Alpha', category: 'Design' },
      { id: 2, name: 'Beta', category: 'Engineering' },
      { id: 3, name: 'Gamma', category: 'Design' },
    ],
    immediate: false,
  })
  await table.search({ keyword: '  DESIGN  ' })
  assert.equal(table.total.value, 2)
  await table.setPage(2)
  assert.equal(table.rows.value[0]?.['id'], 3)
  await table.search({ keyword: 'beta' })
  assert.equal(table.query.value.page, 1)
  assert.equal(table.rows.value[0]['id'], 2)
  await table.search({ keyword: 'Design', name: 'Gamma' })
  assert.equal(table.total.value, 1)
  await table.reset()
  assert.equal(table.total.value, 3)
  for (const keywordSearch of [
    { parameter: 'nested.q', fields: ['name'] },
    { parameter: 'q', fields: ['missing'] },
    { parameter: 'q', fields: ['name', 'name'] },
  ])
    assert.throws(() => {
      parseUiTableSchema({ ...schema, keywordSearch })
    })
  table.dispose()
}
await verifyKeywordSearch()
await verifyConfiguredInlineEditing()
await verifyInlineEditing()
await verifyCsvExport()
verifyColumnGroups()
await verifyMultipleSorting()
await verifyCommonFormFields()
await verifyFormSteps()
verifyColumnPreferences()
verifyColumnManipulation()
verifyColumnDisplay()
verifyPublicValueTypes()
await verifyFormValueBoundaries()
await verifyTableFormSources()
await verifyTableReadonlySnapshots()
await verifyFormBindingLifecycle()
await verifyGroupedQueries()
verifyParser()
verifyTableColors()
verifySortIconMotion()
await verifyLocal()
await verifySorting()
await verifyRemote()
await verifyTreeTable()
await verifyTreeFailureBoundaries()
await verifyTableQueryLinks()
console.info(
  'Form schema/value types, table option sources and readonly snapshots, UiForm binding lifetimes, grouped table queries, UiTable theme contrast, reading states, summary parser, local calculations, sort icon motion, three-state sorting, state preservation, remote races and tree rows passed.',
)

async function verifyTreeTable(): Promise<void> {
  assert.throws(
    () =>
      parseUiTableSchema({
        id: 'tree-sort',
        rowKey: 'id',
        source: { kind: 'local' },
        columns: [{ key: 'name', title: 'Name', sortable: true }],
        tree: {},
      }),
    /sorting/i,
  )
  assert.throws(
    () =>
      parseUiTableSchema({
        id: 'tree-summary',
        rowKey: 'id',
        source: { kind: 'local' },
        columns: [{ key: 'name', title: 'Name' }],
        summary: [{ key: 'total', cells: { name: { kind: 'text', text: 'Total' } } }],
        tree: {},
      }),
    /summary/i,
  )
  assert.throws(
    () =>
      parseUiTableSchema({
        id: 'tree-local-query',
        rowKey: 'id',
        source: { kind: 'local' },
        columns: [{ key: 'name', title: 'Name' }],
        query: { form: { fields: [{ kind: 'text', name: 'name', label: 'Name' }] } },
        tree: {},
      }),
    /query/i,
  )
  const flat = useUiTable({
    schema: {
      id: 'flat-control',
      rowKey: 'id',
      source: { kind: 'local' },
      selection: 'multiple',
      pagination: { pageSize: 10 },
      columns: [{ key: 'name', title: 'Name' }],
    },
    rows: [
      { id: 1, name: 'A', children: [{ id: 2, name: 'Nested' }] },
      { id: 3, name: 'B' },
    ],
  })
  await flat.refresh()
  assert.deepEqual(
    flat.rows.value.map((row) => row['id']),
    [1, 3],
  )
  flat.setSelection([1, 2])
  assert.deepEqual(flat.selectedKeys.value, [1], 'Flat tables ignore nested children fields.')
  assert.deepEqual(flat.expandedKeys.value, [])
  flat.dispose()

  let childCalls = 0
  const tree = useUiTable({
    schema: {
      id: 'tree-demo',
      rowKey: 'id',
      source: { kind: 'local' },
      selection: 'multiple',
      pagination: { pageSize: 10 },
      columns: [
        { key: 'name', title: 'Name' },
        { key: 'stock', title: 'Stock', kind: 'number' },
      ],
      tree: {
        childrenKey: 'children',
        leafKey: 'isLeaf',
        selectionCascade: true,
        defaultExpandedKeys: ['root'],
        childrenRequest: {
          api: 'local/children',
          method: 'POST',
          body: { parentId: { from: 'row.id' } },
        },
      },
      csvExport: { fileName: 'tree.csv', scopes: ['page', 'selected'] },
    },
    rows: [
      {
        id: 'root',
        name: 'Root',
        stock: 2,
        isLeaf: false,
        children: [
          { id: 'static-child', name: 'Static', stock: 1, isLeaf: true },
          { id: 'lazy-parent', name: 'Lazy', stock: 1, isLeaf: false },
        ],
      },
    ],
    transport: {
      list(request) {
        childCalls += 1
        assert.equal(request.body['parentId'], 'lazy-parent')
        return Promise.resolve({
          rows: [{ id: 'lazy-child', name: 'Loaded', stock: 1, isLeaf: true }],
          total: 1,
        })
      },
    },
  })
  await tree.refresh()
  assert.deepEqual(tree.expandedKeys.value, ['root'])
  tree.setSelection(['root', 'static-child'])
  assert.deepEqual(tree.selectedKeys.value, ['root', 'static-child'])
  const before = tree.exportCsv('page')
  assert.match(before.content, /Static/)
  assert.doesNotMatch(before.content, /Loaded/)
  const rootChildren = tree.rows.value[0]?.['children'] as UiTableReadonlyRecord[] | undefined
  const lazyParentRow = rootChildren?.[1]
  assert.ok(lazyParentRow)
  await tree.loadTreeChildren(lazyParentRow)
  assert.equal(childCalls, 1)
  const loaded = tree.rows.value[0]?.['children'] as UiTableReadonlyRecord[] | undefined
  const lazyParent = loaded?.find((row) => row['id'] === 'lazy-parent')
  assert.deepEqual(
    (lazyParent?.['children'] as UiTableReadonlyRecord[] | undefined)?.map((row) => row['id']),
    ['lazy-child'],
  )
  tree.setSelection(['lazy-child'])
  assert.deepEqual(tree.selectedKeys.value, ['lazy-child'])
  const after = tree.exportCsv('selected')
  assert.match(after.content, /Loaded/)
  tree.dispose()
}

// Editor hints are collected from the same parser branches as runtime validation.
const formInspection = inspectUiFormSchema({
  fields: [{ kind: 'text', name: 'name', label: 'Name' }],
})
assert.equal(formInspection.valid, true)
assert.ok(formInspection.hints.some((hint) => hint.choices?.includes('date-range')))
assert.equal(
  inspectUiFormSchema({ fields: [{ kind: 'invalid', name: 'name', label: 'Name' }] }).valid,
  false,
)
assert.match(
  inspectUiFormSchema({ fields: [{ kind: 'text', name: 'name', label: 'Name', extra: true }] })
    .issue ?? '',
  /fields.*0.*extra/,
)
const inspectedTable = {
  id: 'inspect',
  rowKey: 'id',
  columns: [{ key: 'id', title: 'ID' }],
  source: { kind: 'local' },
  sorting: 'multiple',
}
const tableInspection = inspectUiTableSchema(inspectedTable)
assert.equal(tableInspection.valid, true)
assert.deepEqual(tableInspection.hints.find((hint) => hint.path.join('.') === 'sorting')?.choices, [
  'single',
  'multiple',
])
assert.equal(inspectedTable.sorting, 'multiple')
assert.match(inspectUiTableSchema({ ...inspectedTable, sorting: 'invalid' }).issue ?? '', /sorting/)
assert.equal(inspectUiTableSchema(null).valid, false)

async function verifyTreeFailureBoundaries(): Promise<void> {
  const schema: UiTableSchema = {
    id: 'tree-boundaries',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [{ key: 'name', title: 'Name' }],
    selection: 'multiple',
    tree: { childrenRequest: { api: 'children', method: 'GET' } },
    batchActions: [
      {
        id: 'update',
        label: 'Update',
        request: {
          api: 'batch',
          method: 'POST',
          body: { items: { from: 'selection.rows' } },
        },
      },
    ],
  }
  const batch = useUiTable({
    schema,
    immediate: false,
    rows: [{ id: 'root', children: [{ id: 'child', name: 'Child' }] }],
    transport: { list: () => Promise.resolve({ rows: [], total: 0 }) },
  })
  await batch.refresh()
  batch.setSelection(['child'])
  const actions = useUiTableActions({
    table: batch,
    transport: {
      list: () => Promise.resolve({ rows: [], total: 0 }),
      mutate: (request) => {
        assert.deepEqual(request.body['items'], [{ id: 'child', name: 'Child' }])
        return Promise.resolve()
      },
    },
  })
  assert.equal(
    await actions.execute('update', (_action, selection) => {
      assert.deepEqual(selection.keys, ['child'])
      assert.deepEqual(selection.rows, [{ id: 'child', name: 'Child' }])
      return true
    }),
    true,
  )
  actions.dispose()
  batch.dispose()

  let fail = true
  const retry = useUiTable({
    schema,
    immediate: false,
    rows: [{ id: 'root' }],
    transport: {
      list: () => {
        if (fail) return Promise.reject(new Error('Child service unavailable'))
        return Promise.resolve({ rows: [{ id: 'loaded' }], total: 1 })
      },
    },
  })
  await retry.refresh()
  const parent = retry.rows.value[0]
  assert.ok(parent)
  await assert.rejects(retry.loadTreeChildren(parent), /Child service/)
  assert.equal(retry.error.value, null, 'A child failure must not fail the root list.')
  assert.equal(retry.treeLoadErrors.value[0]?.key, 'root')
  retry.setExpandedKeys(['root'])
  assert.deepEqual(retry.expandedKeys.value, [], 'Failed onLoad must not falsely expand.')
  fail = false
  await retry.loadTreeChildren(parent)
  assert.deepEqual(retry.treeLoadErrors.value, [])
  retry.setExpandedKeys(['root'])
  assert.deepEqual(retry.expandedKeys.value, ['root'])
  retry.dispose()

  let resolveChild: (page: UiTablePage) => void = () => {
    throw new Error('Child request not created')
  }
  let resolveRoot: (page: UiTablePage) => void = () => {
    throw new Error('Root request not created')
  }
  const childResponse = new Promise<UiTablePage>((resolve) => {
    resolveChild = resolve
  })
  const rootResponse = new Promise<UiTablePage>((resolve) => {
    resolveRoot = resolve
  })
  let roots = 0
  let childSignal: AbortSignal | undefined
  const race = useUiTable({
    schema: { ...schema, source: { kind: 'remote', request: { api: 'roots', method: 'GET' } } },
    immediate: false,
    transport: {
      list: (request, signal) => {
        if (request.api === 'children') {
          childSignal = signal
          return childResponse
        }
        roots += 1
        return roots === 1
          ? Promise.resolve({ rows: [{ id: 'root', name: 'Old' }], total: 1 })
          : rootResponse
      },
    },
  })
  await race.refresh()
  const oldRoot = race.rows.value[0]
  assert.ok(oldRoot)
  const loadingChild = race.loadTreeChildren(oldRoot)
  const refreshing = race.refresh()
  assert.equal(childSignal?.aborted, true, 'Root refresh must cancel children immediately.')
  resolveChild({ rows: [{ id: 'stale' }], total: 1 })
  await loadingChild
  assert.deepEqual(
    race.rows.value,
    [{ id: 'root', name: 'Old' }],
    'Even abort-ignoring transports cannot write stale children.',
  )
  resolveRoot({ rows: [{ id: 'root', name: 'New' }], total: 1 })
  await refreshing
  assert.deepEqual(race.treeLoadErrors.value, [], 'Cancellation is not a user-facing error.')
  race.dispose()
}

async function verifyTableQueryLinks(): Promise<void> {
  const codec = tableQuerySharingCodec
  const state = {
    page: 2,
    pageSize: 5,
    filters: { title: 'PAVP', category: 'Design', privateToken: 'never-share' },
    sorts: [
      { key: 'price', order: 'descend' as const },
      { key: 'id', order: 'ascend' as const },
    ],
  }
  const link = codec.encode(state)
  assert.ok(!JSON.stringify(link).includes('privateToken'))
  assert.ok(!JSON.stringify(link).includes('never-share'))
  assert.deepEqual(codec.decode(link), { ...state, filters: { title: 'PAVP', category: 'Design' } })
  assert.deepEqual(codec.encode(codec.decode({})), {})
  for (const value of [
    { table: '{' },
    { table: ['{}'] },
    { token: 'private' },
    { table: JSON.stringify({ ...state, page: 0 }) },
    { table: JSON.stringify({ ...state, pageSize: 999 }) },
    {
      table: JSON.stringify({
        ...state,
        filters: { title: 'x', category: null, token: 'private' },
      }),
    },
    { table: JSON.stringify({ ...state, sorts: [{ key: 'secret', order: 'ascend' }] }) },
    { table: JSON.stringify({ ...state, filters: { title: 'x'.repeat(81), category: null } }) },
  ])
    assert.equal(codec.querySchema.safeParse(value).success, false)
  let calls = 0
  const table = useUiTable({
    immediate: false,
    schema: {
      id: 'query-restore',
      rowKey: 'id',
      sorting: 'multiple',
      source: { kind: 'remote', request: { api: 'records', method: 'GET' } },
      columns: [
        { key: 'price', title: 'Price', sortable: true },
        { key: 'id', title: 'ID', sortable: true },
      ],
      pagination: { pageSize: 10 },
      query: {
        mode: 'submit',
        form: { fields: [{ name: 'title', kind: 'text', label: 'Title' }] },
      },
    },
    transport: {
      list() {
        calls++
        return Promise.resolve({ rows: [{ id: 1, price: 2 }], total: 60 })
      },
    },
  })
  const form = useUiTableQuery(table, formCopy)
  await table.applyQuery(codec.decode(link))
  await nextTick()
  assert.equal(calls, 1, 'Atomic query hydration must issue exactly one request.')
  assert.equal(table.query.value.page, 2)
  assert.equal(table.queryChangeReason.value, 'change')
  assert.equal(table.query.value.sort?.key, 'price')
  assert.equal(form.getValue('title'), 'PAVP', 'History restoration must update the query form.')
  const before = table.query.value
  assert.throws(() => table.applyQuery({ ...codec.decode(link), page: 0 }), /pagination/u)
  assert.throws(
    () => table.applyQuery({ ...codec.decode(link), sorts: [{ key: 'missing', order: 'ascend' }] }),
    /sortable/u,
  )
  assert.equal(
    table.query.value,
    before,
    'Invalid restore must be atomic and leave state untouched.',
  )
  assert.equal(calls, 1)
  await table.setPage(3)
  assert.equal(calls, 2)
  form.setValue('title', 'unfinished')
  await table.setPage(4)
  await nextTick()
  assert.equal(
    form.getValue('title'),
    'unfinished',
    'Paging must not erase unsubmitted filter drafts.',
  )
  await table.applyQuery(codec.decode({}))
  await nextTick()
  assert.equal(form.getValue('title'), '')
  assert.equal(table.query.value.page, 1)
  form.dispose()
  await table.applyQuery({ ...codec.decode(link), filters: { title: 'PAVP' } })
  const linkedForm = useUiTableQuery(table, formCopy)
  linkedForm.reset()
  await nextTick()
  linkedForm.reset()
  await nextTick()
  assert.equal(
    linkedForm.getValue('title'),
    '',
    'Repeated reset must not restore the original shared filters.',
  )
  assert.deepEqual(table.query.value.filters, {})
  linkedForm.dispose()
  await table.applyQuery({ ...codec.decode({}), page: 999 })
  assert.equal(table.query.value.page, 6)
  assert.equal(table.queryChangeReason.value, 'page-correction')
  await table.setPage(2)
  assert.equal(
    table.queryChangeReason.value,
    'change',
    'A user page decrease is not automatic normalization.',
  )
  table.dispose()
}

await verifyFormSpecialFields(formCopy)

await verifyFormBuilderFields()

async function verifyContinuousLoading(): Promise<void> {
  const schema: UiTableSchema = {
    id: 'continuous',
    rowKey: 'id',
    source: { kind: 'local' },
    columns: [{ key: 'id', title: 'ID' }],
    pagination: { mode: 'load-more', pageSize: 2 },
  }
  const table = useUiTable({
    schema,
    rows: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    immediate: false,
  })
  await table.refresh()
  assert.equal(table.rows.value.length, 2)
  assert.equal(table.hasMore.value, true)
  await table.loadMore()
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1, 2, 3, 4],
  )
  assert.equal(table.query.value.page, 2)
  await table.loadMore()
  assert.equal(table.rows.value.length, 5)
  assert.equal(table.hasMore.value, false)
  await table.loadMore()
  assert.equal(table.query.value.page, 3)
  await table.refresh()
  assert.equal(table.query.value.page, 1)
  assert.equal(table.rows.value.length, 2)
  await table.search({ id: 5 })
  assert.equal(table.rows.value.length, 1)
  table.dispose()
  let fail = true
  const remote = useUiTable({
    schema: {
      ...schema,
      source: {
        kind: 'remote',
        request: { api: '/records', method: 'GET', params: { page: { from: 'page' } } },
      },
    },
    immediate: false,
    transport: {
      async list(request) {
        await Promise.resolve()
        const page = request.params['page']
        if (page === 2 && fail) throw new Error('retryable')
        return { rows: page === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 3 }], total: 3 }
      },
    },
  })
  await remote.refresh()
  await remote.loadMore()
  assert.equal(remote.error.value?.message, 'retryable')
  assert.equal(remote.query.value.page, 1)
  assert.equal(remote.rows.value.length, 2)
  fail = false
  await remote.loadMore()
  assert.equal(remote.rows.value.length, 3)
  assert.equal(remote.query.value.page, 2)
  remote.dispose()
}
await verifyContinuousLoading()

async function verifyContinuousRace(): Promise<void> {
  let resolvePage: ((page: UiTablePage) => void) | undefined
  let pendingSignal: AbortSignal | undefined
  let requests = 0
  const table = useUiTable({
    schema: {
      id: 'continuous-race',
      rowKey: 'id',
      columns: [{ key: 'id', title: 'ID' }],
      pagination: { mode: 'load-more', pageSize: 1 },
      source: {
        kind: 'remote',
        request: { api: '/records', method: 'GET', params: { page: { from: 'page' } } },
      },
    },
    immediate: false,
    transport: {
      list(request, signal) {
        requests++
        if (request.params['page'] === 1) return Promise.resolve({ rows: [{ id: 1 }], total: 3 })
        pendingSignal = signal
        return new Promise<UiTablePage>((resolve) => {
          resolvePage = resolve
        })
      },
    },
  })
  await table.refresh()
  const pending = table.loadMore()
  await table.loadMore()
  assert.equal(requests, 2, 'Overlapping loadMore is ignored.')
  await table.search({ q: 'new' })
  assert.equal(pendingSignal?.aborted, true)
  resolvePage?.({ rows: [{ id: 2 }], total: 3 })
  await pending
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1],
  )
  assert.equal(table.query.value.page, 1)
  const disposedPending = table.loadMore()
  table.dispose()
  assert.equal(pendingSignal.aborted, true)
  resolvePage?.({ rows: [{ id: 3 }], total: 3 })
  await disposedPending
  assert.deepEqual(
    table.rows.value.map((row) => row['id']),
    [1],
  )
}
await verifyContinuousRace()

verifyDateTime()

verifyDashboard()
