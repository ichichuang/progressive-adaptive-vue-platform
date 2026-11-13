import type { UiFormSchema, UiTableSchema } from '@platform/ui'
export const reportExampleForm = {
  columns: 1,
  fields: [
    {
      kind: 'text',
      name: 'title',
      label: 'reportExample.titleLabel',
      required: true,
      defaultValue: 'PAVP',
      rules: { maxLength: 80 },
    },
    {
      kind: 'textarea',
      name: 'notes',
      label: 'reportExample.notesLabel',
      rules: { maxLength: 600 },
    },
  ],
} as const satisfies UiFormSchema
export const reportExampleTable: UiTableSchema = {
  id: 'report-example',
  rowKey: 'id',
  source: { kind: 'local' },
  selection: 'multiple',
  columnSettings: true,
  pagination: { pageSize: 5, pageSizes: [5, 10] },
  appearance: { striped: false, rowDividers: true, columnDividers: true },
  columns: [
    { key: 'name', title: 'reportExample.item', sortable: true },
    { key: 'value', title: 'reportExample.value', kind: 'number', sortable: true },
  ],
}
