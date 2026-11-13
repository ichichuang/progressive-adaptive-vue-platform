import type { DeepReadonly } from 'vue'
import type { UiRichTextDocument } from './rich-text-document'
import type { UiDateTimeContext } from '../date-time/date-time'
import type { UiFormValue } from './form-contracts'
import type { UiTableCsvScope } from './table-contracts'

/** Captured presentation only: no live controller, raw hidden values, HTML or remote resource URL. */
export interface UiReportFormSection {
  readonly kind: 'form'
  readonly title: string
  readonly fields: readonly {
    readonly label: string
    readonly group: string
    readonly text: string
    readonly richText?: DeepReadonly<UiRichTextDocument>
  }[]
}
export interface UiReportTableSection {
  readonly kind: 'table'
  readonly title: string
  readonly scope: UiTableCsvScope
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly selectedCount: number
  readonly loadedCount: number
  readonly columns: readonly { readonly key: string; readonly title: string }[]
  readonly rows: readonly (readonly string[])[]
}
export interface UiReportChartSection {
  readonly kind: 'chart'
  readonly title: string
  readonly alt: string
  readonly image: Blob
}
export type UiReportSection = UiReportFormSection | UiReportTableSection | UiReportChartSection
export interface UiReportSnapshot {
  readonly title: string
  readonly capturedAt: string
  readonly sections: readonly UiReportSection[]
}
export interface UiReportFormOptions {
  readonly title: string
  readonly includeFields?: readonly string[]
  readonly dateTime?: UiDateTimeContext
  /** Required for visible custom fields. Must be synchronous and free of side effects. */
  readonly formatCustom?: (field: string, value: UiFormValue) => string
}
export interface UiReportTableOptions {
  readonly title: string
  readonly scope: UiTableCsvScope
  readonly dateTime?: UiDateTimeContext
  readonly empty: string
  readonly boolean: (value: boolean) => string
  /** Explicit text for a custom slot or structured cell; never serialize arbitrary objects. */
  readonly formatCell?: (key: string, value: UiFormValue | undefined) => string
}
export interface UiReportCopy {
  readonly close: () => string
  readonly print: () => string
  readonly preparing: () => string
  readonly failed: () => string
  readonly capturedAt: (value: string) => string
  readonly tableScope: (section: UiReportTableSection) => string
}
