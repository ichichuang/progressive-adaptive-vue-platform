export interface UiDashboardItemPosition {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}
export interface UiDashboardGridHandle {
  /** Explicitly pack unused space; never changes widget content. */
  compact(): void
  move(id: string, dx: number, dy: number): void
  resize(id: string, dw: number, dh: number): void
}
