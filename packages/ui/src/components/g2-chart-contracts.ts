import type { G2Spec } from '@antv/g2'
import type { UiDateTimeColumnFormat } from '../date-time/date-time'

/** Explicit temporal channel semantics; ordinary numeric/category axes remain unchanged. */
export interface UiG2ChartDateTimeChannels {
  readonly x?: UiDateTimeColumnFormat
  readonly y?: UiDateTimeColumnFormat
}

/** Native G2 grammar. The component owns container sizing and motion policy. */
export type UiG2ChartOptions = G2Spec

/** Narrow imperative capability; does not expose the vendor instance or its lifecycle. */
export interface UiG2ChartHandle {
  /** Export the current ready canvas as an opaque themed PNG, at its rendered pixel density.
   * Rejects before ready, during an update, or after deactivation. HTML tooltips and external
   * titles/controls are not part of the image. Does not fetch data or initiate a download.
   */
  exportImage(): Promise<Blob>
  playTour(): void
  pauseTour(): void
  stopTour(): void
  nextTour(): void
  previousTour(): void
}

/** Serializable, stable identity for direct-data interval and point marks. */
export interface UiChartTourTarget {
  readonly id: string
  readonly field: string
  readonly value: string | number
}
export interface UiChartTourConfig {
  readonly targets: readonly UiChartTourTarget[]
  readonly intervalMs?: number
  readonly autoplay?: boolean
  readonly loop?: boolean
}
export interface UiChartTourState {
  readonly status: 'stopped' | 'playing' | 'paused' | 'waiting'
  readonly targetId: string | null
  readonly reason: 'user' | 'interaction' | 'hidden' | 'motion' | 'rendering' | 'empty' | null
}
