/** Integer sample windows shared by the plot and its overview navigator. */
export type UiChartTimeRangeValue = readonly [number, number]

export function normalizeUiChartTimeRange(
  range: UiChartTimeRangeValue,
  min: number,
  max: number,
): [number, number] {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min)
    throw new RangeError('Chart time range requires integer bounds with max greater than min.')
  if (!range.every(Number.isFinite)) throw new RangeError('Chart time range values must be finite.')
  const start = Math.max(min, Math.min(max - 1, Math.round(range[0])))
  const end = Math.min(max, Math.max(start + 1, Math.round(range[1])))
  return [start, end]
}

export function panUiChartTimeRange(
  range: UiChartTimeRangeValue,
  delta: number,
  min: number,
  max: number,
): [number, number] {
  const current = normalizeUiChartTimeRange(range, min, max)
  if (!Number.isFinite(delta)) throw new RangeError('Chart time range delta must be finite.')
  const span = current[1] - current[0]
  const start = Math.max(min, Math.min(max - span, Math.round(current[0] + delta)))
  return [start, start + span]
}

export function zoomUiChartTimeRange(
  range: UiChartTimeRangeValue,
  factor: number,
  anchor: number,
  min: number,
  max: number,
): [number, number] {
  const current = normalizeUiChartTimeRange(range, min, max)
  if (!Number.isFinite(factor) || factor <= 0 || !Number.isFinite(anchor))
    throw new RangeError(
      'Chart time range zoom requires a positive finite factor and finite anchor.',
    )
  const span = current[1] - current[0]
  const rounded = Math.round(span * factor)
  // A discrete one-sample window must still zoom back out with a small wheel tick.
  const requested = rounded === span && factor !== 1 ? span + Math.sign(factor - 1) : rounded
  const nextSpan = Math.max(1, Math.min(max - min, requested))
  // Overview pointers can lie outside the selected window; keep their actual anchor.
  const focus = anchor
  const start = Math.max(
    min,
    Math.min(max - nextSpan, Math.round(current[0] + (span - nextSpan) * focus)),
  )
  return [start, start + nextSpan]
}
