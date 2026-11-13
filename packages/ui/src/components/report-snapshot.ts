import type { UiG2ChartHandle } from './g2-chart-contracts'
import type { UiReportChartSection, UiReportSnapshot, UiReportSection } from './report-contracts'
import { parseRichTextDocument } from './rich-text-document'
import { freezeDraftValue } from '../composables/form-draft-values'

export async function captureUiChartReport(
  chart: UiG2ChartHandle,
  options: { readonly title: string; readonly alt: string; readonly signal?: AbortSignal },
): Promise<UiReportChartSection> {
  options.signal?.throwIfAborted()
  // exportImage copies the ready canvas synchronously before encoding it asynchronously.
  const image = await chart.exportImage()
  options.signal?.throwIfAborted()
  if (image.type !== 'image/png' || image.size === 0)
    throw new TypeError('Chart reports require a nonempty PNG snapshot.')
  return Object.freeze({
    kind: 'chart',
    title: options.title,
    alt: options.alt,
    image: image.slice(0, image.size, image.type),
  })
}

/** Defensive copy: subsequent edits to caller arrays cannot alter the preview or print snapshot. */
export function createUiReportSnapshot(input: {
  readonly title: string
  readonly sections: readonly UiReportSection[]
  readonly capturedAt?: string
}): UiReportSnapshot {
  const capturedAt = input.capturedAt ?? new Date().toISOString()
  if (!Number.isFinite(Date.parse(capturedAt))) throw new TypeError('Invalid report capture time.')
  const sections = input.sections.map((section): UiReportSection => {
    if (section.kind === 'chart') {
      if (section.image.type !== 'image/png' || section.image.size === 0)
        throw new TypeError('Report images must be nonempty PNG snapshots.')
      return Object.freeze({
        ...section,
        image: section.image.slice(0, section.image.size, section.image.type),
      })
    }
    if (section.kind === 'table')
      return Object.freeze({
        ...section,
        columns: Object.freeze(section.columns.map((column) => Object.freeze({ ...column }))),
        rows: Object.freeze(
          section.rows.map((row) => {
            if (
              row.length !== section.columns.length ||
              row.some((cell) => typeof cell !== 'string')
            )
              throw new TypeError('Report cells must match the visible columns.')
            return Object.freeze([...row])
          }),
        ),
      })
    return Object.freeze({
      ...section,
      fields: Object.freeze(
        section.fields.map((field) =>
          Object.freeze({
            ...field,
            ...(field.richText
              ? { richText: freezeDraftValue(parseRichTextDocument(field.richText)) }
              : {}),
          }),
        ),
      ),
    })
  })
  return Object.freeze({ title: input.title, capturedAt, sections: Object.freeze(sections) })
}
