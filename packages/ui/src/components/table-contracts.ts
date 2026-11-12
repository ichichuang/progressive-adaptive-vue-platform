import type { Ref } from 'vue'
import type { UiDensity } from '@platform/design-system'
import type { UiFormReadonlyValue, UiFormRecord, UiFormSchema, UiFormValue } from './form-contracts'

export type UiTableRecord = UiFormRecord
export type UiTableReadonlyRecord = Readonly<Record<string, UiFormReadonlyValue>>
export type UiTableKey = string | number
/** Bindings are data paths, never executable expressions. */
export type UiTableParameter = { readonly value: UiFormValue } | { readonly from: string }
export interface UiTableRequest {
  readonly api: string
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly path?: Readonly<Record<string, UiTableParameter>>
  readonly params?: Readonly<Record<string, UiTableParameter>>
  readonly body?: Readonly<Record<string, UiTableParameter>>
}
export interface UiTableColumn {
  readonly key: string
  readonly title: string
  readonly kind?: 'text' | 'number' | 'boolean' | 'date' | 'tag'
  readonly width?: number
  readonly fixed?: 'left' | 'right'
  readonly sortable?: boolean
  /** Trusted comparator registry name for local data; never executable JSON. */
  readonly sortComparator?: string
  readonly hidden?: boolean
}
/** Nested groups reference existing leaf column keys; unlisted columns remain ungrouped. */
export interface UiTableColumnGroup {
  readonly key: string
  readonly title: string
  readonly children: readonly (string | UiTableColumnGroup)[]
}
export type UiTableSummaryValue = string | number | null
export interface UiTableSummaryFormat {
  readonly decimalPlaces?: number
  readonly prefix?: string
  readonly suffix?: string
}
/** Summary configuration is JSON. Render functions belong in UiTable's summaryCell slot. */
export type UiTableSummaryCell =
  | { readonly kind: 'text'; readonly text: string }
  | {
      readonly kind: 'value'
      readonly value: UiTableSummaryValue
      readonly from?: never
      readonly format?: UiTableSummaryFormat
    }
  | {
      readonly kind: 'value'
      /** A safe path in the accepted response's summary data. Only text and numbers are displayed. */
      readonly from: string
      readonly value?: never
      readonly format?: UiTableSummaryFormat
    }
  | {
      readonly kind: 'aggregate'
      readonly operation: 'sum' | 'avg' | 'min' | 'max'
      /** Defaults to the column key where this cell is placed. Only finite numbers participate. */
      readonly field?: string
      /** filtered means all matching local rows, before pagination. It is invalid for remote data. */
      readonly scope: 'page' | 'filtered'
      readonly format?: UiTableSummaryFormat
    }
  | {
      readonly kind: 'aggregate'
      /** Counts records, regardless of their field values. */
      readonly operation: 'count'
      readonly field?: never
      readonly scope: 'page' | 'filtered'
      readonly format?: UiTableSummaryFormat
    }
export interface UiTableSummaryRow {
  readonly key: string
  /** Keys must name configured columns. Hidden and reordered columns retain their own cells. */
  readonly cells: Readonly<Record<string, UiTableSummaryCell>>
}
export interface UiTableResolvedSummaryRow {
  readonly key: string
  readonly cells: Readonly<
    Record<string, { readonly value: UiTableSummaryValue; readonly text: string }>
  >
}
export interface UiTableBatchAction {
  readonly id: string
  readonly label: string
  readonly request: UiTableRequest
}
export interface UiTableSelection {
  readonly keys: readonly UiTableKey[]
  readonly rows: readonly UiTableReadonlyRecord[]
}
/** Auto follows content; fixed reserves body pixels; fill consumes an allocated parent region. */
export type UiTableHeight =
  | { readonly mode: 'auto' }
  | { readonly mode: 'fixed'; readonly bodyHeight: number }
  | { readonly mode: 'fill' }
/** Local presentation choices; colors and dimensions always follow the active theme. */
export interface UiTableAppearance {
  /** Defaults to true. */
  readonly bordered?: boolean
  /** Body row separators. The native header boundary remains visible. Defaults to false. */
  readonly rowDividers?: boolean
  /** Defaults to false. */
  readonly columnDividers?: boolean
  /** Defaults to true. */
  readonly striped?: boolean
  /** Neutral surface, soft primary pair, or solid primary pair. Defaults to soft. */
  readonly headerTone?: 'neutral' | 'soft' | 'solid'
  /** Defaults to the provider density. Changes cell padding, never text size. */
  readonly density?: UiDensity
}
export type UiTableCsvScope = 'page' | 'selected'
/** Exports only loaded page rows; selected means selected rows on that page. */
export interface UiTableCsvConfiguration {
  readonly fileName: string
  readonly scopes: readonly UiTableCsvScope[]
}
export interface UiTableCsvFile {
  readonly fileName: string
  readonly content: string
  readonly mimeType: 'text/csv;charset=utf-8'
  readonly rowCount: number
}
export interface UiTableSchema {
  readonly csvExport?: UiTableCsvConfiguration
  /** Defaults to auto. The page owns a definite available height when using fill. */
  readonly height?: UiTableHeight
  readonly appearance?: UiTableAppearance
  /** Column-aligned rows remain below the data viewport and above pagination, including empty data. */
  readonly summary?: readonly UiTableSummaryRow[]
  readonly id: string
  readonly rowKey: string
  readonly columns: readonly UiTableColumn[]
  readonly columnGroups?: readonly UiTableColumnGroup[]
  readonly source:
    { readonly kind: 'local' } | { readonly kind: 'remote'; readonly request: UiTableRequest }
  readonly query?: {
    readonly form: UiFormSchema
    readonly mode?: 'submit' | 'change'
    readonly debounce?: number
  }
  readonly pagination?: { readonly pageSize?: number; readonly pageSizes?: readonly number[] }
  /** Defaults to single. Multiple retains click order as sort priority. */
  readonly sorting?: 'single' | 'multiple'
  readonly columnSettings?: boolean
  /** Opt-in stable identity; use a distinct key for each independent table. */
  readonly columnPreferenceKey?: string
  readonly batchActions?: readonly UiTableBatchAction[]
  readonly selection?: 'none' | 'single' | 'multiple'
  readonly editor?: {
    readonly form: UiFormSchema
    readonly presentation?: 'modal' | 'drawer' | 'page'
    readonly create?: UiTableRequest
    readonly update?: UiTableRequest
    readonly detail?: UiTableRequest
    readonly remove?: UiTableRequest
  }
}
export interface UiTableSort {
  readonly key: string
  readonly order: 'ascend' | 'descend'
}
/** Return a finite ascending comparison. Direction is applied by the table. */
export type UiTableSortComparator = (
  left: UiFormReadonlyValue | undefined,
  right: UiFormReadonlyValue | undefined,
  context: {
    readonly column: UiTableColumn
    readonly leftRow: UiTableReadonlyRecord
    readonly rightRow: UiTableReadonlyRecord
  },
) => number
export interface UiTableQuery {
  readonly page: number
  readonly pageSize: number
  readonly filters: UiTableReadonlyRecord
  /** Complete priority-ordered list; sort is its primary projection for existing bindings. */
  readonly sorts: readonly UiTableSort[]
  readonly sort: UiTableSort | null
}
export interface UiTableRequestContext extends UiTableQuery {
  readonly selection?: UiTableSelection
  readonly context: UiTableReadonlyRecord
  readonly row: UiTableReadonlyRecord
  readonly form: UiTableReadonlyRecord
}
export interface UiTableResolvedRequest {
  readonly api: string
  readonly method: UiTableRequest['method']
  readonly params: UiTableRecord
  readonly body: UiTableRecord
}
export interface UiTablePage {
  readonly rows: readonly UiTableReadonlyRecord[]
  readonly total: number
  /** Server-computed data from this response, never a total reconstructed from loaded pages. */
  readonly summary?: UiTableRecord
}
/** The application owns HTTP, authentication and conversion of its backend response. */
export interface UiTableTransport {
  list(request: UiTableResolvedRequest, signal: AbortSignal): Promise<UiTablePage>
  detail?(request: UiTableResolvedRequest, signal: AbortSignal): Promise<UiTableRecord>
  mutate?(request: UiTableResolvedRequest, signal: AbortSignal): Promise<void>
}
/** Only column keys and visibility are persisted, never row or query data. */
export interface UiTableColumnPreference {
  readonly schemaVersion: 1
  readonly columns: readonly { readonly key: string; readonly hidden: boolean }[]
}
/** Synchronous restoration before the first render. Application owns browser storage. */
export interface UiTableColumnPreferenceStorage {
  read(key: string): unknown
  write(key: string, preference: UiTableColumnPreference): void
  clear(key: string): void
}
export interface UiTableInput {
  readonly sortComparators?: Readonly<Record<string, UiTableSortComparator>>
  readonly columnPreferenceStorage?: UiTableColumnPreferenceStorage
  readonly schema: UiTableSchema
  readonly rows?: readonly UiTableReadonlyRecord[]
  readonly transport?: UiTableTransport
  readonly filters?: UiTableReadonlyRecord
  readonly context?: UiTableReadonlyRecord
  readonly immediate?: boolean
  readonly translate?: (text: string) => string
  readonly onQueryChange?: (query: UiTableQuery) => void
  readonly onSelectionChange?: (keys: readonly UiTableKey[]) => void
}
export interface UiTableController {
  readonly schema: UiTableSchema
  readonly columns: Readonly<Ref<readonly UiTableColumn[]>>
  /** The effective configuration, initially schema.summary. Copy this after setSummary. */
  readonly summary: Readonly<Ref<readonly UiTableSummaryRow[]>>
  readonly summaryRows: Readonly<Ref<readonly UiTableResolvedSummaryRow[]>>
  readonly rows: Readonly<Ref<readonly UiTableReadonlyRecord[]>>
  readonly total: Readonly<Ref<number>>
  readonly query: Readonly<Ref<UiTableQuery>>
  readonly loading: Readonly<Ref<boolean>>
  readonly error: Readonly<Ref<Error | null>>
  readonly selectedKeys: Readonly<Ref<readonly UiTableKey[]>>
  text(value: string): string
  refresh(): Promise<void>
  search(filters: UiTableReadonlyRecord): Promise<void>
  reset(): Promise<void>
  setPage(page: number): Promise<void>
  setPageSize(size: number): Promise<void>
  /** Replaces the complete sort with zero or one column, even in multiple mode. */
  setSort(sort: UiTableQuery['sort']): Promise<void>
  /** Replaces the priority-ordered list. Multiple entries require sorting: multiple. */
  setSorts(sorts: readonly UiTableSort[]): Promise<void>
  setSelection(keys: readonly UiTableKey[]): void
  setColumnVisibility(key: string, visible: boolean): void
  moveColumn(key: string, direction: 'up' | 'down'): void
  resetColumns(): void
  /** Produces a safe CSV snapshot; does not fetch or download data. */
  exportCsv(scope: UiTableCsvScope): UiTableCsvFile
  /** Replaces only summary configuration, preserving query, pagination, selection and columns. */
  setSummary(summary: readonly UiTableSummaryRow[]): void
  setRows(rows: readonly UiTableReadonlyRecord[]): Promise<void>
  dispose(): void
}
export interface UiTableCopy {
  readonly exportPage: () => string
  readonly exportSelected: () => string
  /** Current sort state and next action, used by the keyboard-accessible icon button. */
  readonly sortLabel: (title: string, order: 'ascend' | 'descend' | false) => string
  readonly columns: () => string
  readonly resetColumns: () => string
  readonly moveColumn: (title: string, direction: 'up' | 'down') => string
  readonly actions: () => string
  readonly refresh: () => string
  readonly loading: () => string
  readonly empty: () => string
  readonly error: () => string
  readonly retry: () => string
  readonly boolean: (value: boolean) => string
}
export interface UiTableProps {
  readonly table: UiTableController
  readonly copy: UiTableCopy
  /** Presentation override of schema.height, without recreating the data controller. */
  readonly height?: UiTableHeight
  /** Defined fields override schema.appearance without recreating the data controller. */
  readonly appearance?: UiTableAppearance
  /** Requires fixed or fill height. */
  readonly virtualScroll?: boolean
  /** Fixed action column width in CSS pixels. Defaults to 160; adjust to the slot's actions. */
  readonly rowActionsWidth?: number
  /** Legacy fixed body height. Cannot be combined with height or schema.height. */
  readonly maxHeight?: number
}
export interface UiTableEditorCopy {
  readonly cancel: () => string
  readonly save: () => string
  readonly continueEditing: () => string
  readonly discardChanges: () => string
  readonly title: (mode: 'create' | 'edit' | 'detail') => string
  readonly close: () => string
  readonly loading: () => string
  readonly error: () => string
  readonly closeBlocked: () => string
}
