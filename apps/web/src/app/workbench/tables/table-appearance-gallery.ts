import { uiDensitySchema } from '@platform/design-system'
import type { UiTableAppearance, UiTableRecord, UiTableSchema } from '@platform/ui'
import type { ConsoleMessageKey } from '../../../shared/i18n'

export interface TableAppearanceSpecimen {
  readonly id: string
  readonly label: ConsoleMessageKey
  readonly appearance: UiTableAppearance
}
interface TableAppearanceGroup {
  readonly id: string
  readonly label: ConsoleMessageKey
  readonly description: ConsoleMessageKey
  readonly specimens: readonly TableAppearanceSpecimen[]
}

// A controlled comparison baseline, not a replacement for UiTable defaults.
const plain: UiTableAppearance = {
  bordered: false,
  rowDividers: false,
  columnDividers: false,
  striped: false,
  headerTone: 'neutral',
}
const framed: UiTableAppearance = { ...plain, bordered: true }

export const tableAppearanceGroups = [
  {
    id: 'structure',
    label: 'tableGallery.structure',
    description: 'tableGallery.structureHint',
    specimens: [
      { id: 'borderless', label: 'tableGallery.borderless', appearance: plain },
      {
        id: 'outer-border',
        label: 'tableExamples.appearance.bordered',
        appearance: framed,
      },
      {
        id: 'horizontal',
        label: 'tableExamples.appearance.rowDividers',
        appearance: { ...plain, rowDividers: true },
      },
      {
        id: 'vertical',
        label: 'tableExamples.appearance.columnDividers',
        appearance: { ...plain, columnDividers: true },
      },
      {
        id: 'grid',
        label: 'tableExamples.appearance.grid',
        appearance: { ...framed, rowDividers: true, columnDividers: true },
      },
      {
        id: 'striped',
        label: 'tableExamples.appearance.striped',
        appearance: { ...plain, striped: true },
      },
    ],
  },
  {
    id: 'headers',
    label: 'tableExamples.theme.header',
    description: 'tableGallery.headersHint',
    specimens: [
      { id: 'neutral', label: 'tableExamples.theme.neutral', appearance: framed },
      {
        id: 'soft',
        label: 'tableExamples.theme.soft',
        appearance: { ...framed, headerTone: 'soft' },
      },
      {
        id: 'solid',
        label: 'tableExamples.theme.solid',
        appearance: { ...framed, headerTone: 'solid' },
      },
    ],
  },
  {
    id: 'density',
    label: 'tableExamples.appearance.density',
    description: 'tableGallery.densityHint',
    specimens: [
      {
        id: 'compact',
        label: 'tableExamples.appearance.compact',
        appearance: { ...framed, density: uiDensitySchema.enum.compact },
      },
      {
        id: 'comfortable',
        label: 'tableExamples.appearance.comfortable',
        appearance: { ...framed, density: uiDensitySchema.enum.comfortable },
      },
      {
        id: 'spacious',
        label: 'tableExamples.appearance.spacious',
        appearance: { ...framed, density: uiDensitySchema.enum.spacious },
      },
    ],
  },
] as const satisfies readonly TableAppearanceGroup[]

export const tableAppearanceRows: readonly UiTableRecord[] = [
  { id: '01', name: 'Alpha', value: 24 },
  { id: '02', name: 'Beta', value: 48 },
  { id: '03', name: 'Gamma', value: 32 },
  { id: '04', name: 'Delta', value: 16 },
]

export function tableAppearanceSchema(specimen: TableAppearanceSpecimen): UiTableSchema {
  return {
    id: `table-style-${specimen.id}`,
    rowKey: 'id',
    source: { kind: 'local' },
    height: { mode: 'auto' },
    appearance: specimen.appearance,
    pagination: { pageSize: tableAppearanceRows.length },
    columns: [
      { key: 'id', title: 'tableShowcase.id' },
      { key: 'name', title: 'tableShowcase.title' },
      { key: 'value', title: 'tableGallery.value', kind: 'number' },
    ],
  }
}
