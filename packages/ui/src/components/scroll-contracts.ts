export interface UiScrollOffset {
  readonly left: number
  readonly top: number
}

export interface UiScrollOptions {
  readonly behavior?: 'smooth' | 'instant'
}

export interface UiScrollInput extends UiScrollOptions {
  readonly left?: number
  readonly top?: number
}

export type UiScrollCommandResult =
  | { readonly kind: 'scrolled' }
  | {
      readonly kind: 'rejected'
      readonly reason: 'unavailable' | 'missing' | 'duplicate' | 'nested'
    }

export interface UiScrollController {
  readonly ownerId: string
  readState(): {
    readonly ready: boolean
    readonly width: number
    readonly height: number
    readonly contentWidth: number
    readonly contentHeight: number
    readonly direction: string
    readonly writingMode: string
  }
  ownsBoundary(boundary: Element): boolean
  readOffset(): UiScrollOffset
  cancelMotion(): void
  scrollTo(input: UiScrollInput): void
  scrollBy(input: UiScrollInput): void
  scrollToStart(options?: UiScrollOptions): void
  scrollToEnd(options?: UiScrollOptions): void
  scrollToAnchor(
    anchorId: string,
    options?: UiScrollOptions & { readonly blockOffset?: number },
  ): UiScrollCommandResult
  dispose(): void
}
