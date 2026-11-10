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
  UiTableResolvedRequest,
  UiTableSchema,
  UiTableSummaryCell,
  UiTableSummaryRow,
} from '../../packages/ui/src/components/table-contracts'
import { parseUiTableSchema } from '../../packages/ui/src/components/table-schema'
import { useUiTable } from '../../packages/ui/src/composables/use-ui-table'
import { useUiForm } from '../../packages/ui/src/composables/use-ui-form'
import { useUiTableQuery } from '../../packages/ui/src/composables/use-ui-table-query'
import { useUiTableForm } from '../../packages/ui/src/composables/use-ui-table-form'
import { parseUiFormSchema } from '../../packages/ui/src/components/form-schema'
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
console.info(
  'Form schema/value types, table option sources and readonly snapshots, UiForm binding lifetimes, grouped table queries, UiTable theme contrast, reading states, summary parser, local calculations, sort icon motion, three-state sorting, state preservation and remote races passed.',
)
