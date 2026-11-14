import type { uiMotionPresets } from './motion-registry'

export type UiMotionPreset = keyof typeof uiMotionPresets
export type UiMotionPhase<P extends UiMotionPreset = UiMotionPreset> =
  (typeof uiMotionPresets)[P]['phases'][number]
export type UiMotionTarget<P extends UiMotionPreset = UiMotionPreset> = {
  readonly element: HTMLElement
  readonly image: HTMLImageElement
}[(typeof uiMotionPresets)[P]['target']]

/** Viewport CSS coordinates from the accepted initiating pointer event. Omit for keyboard actions. */
export interface UiMotionOrigin {
  readonly clientX: number
  readonly clientY: number
}
export interface UiMotionOptions<P extends UiMotionPreset = UiMotionPreset> {
  readonly preset: P
  readonly phase: UiMotionPhase<P>
  readonly durationMs?: number
  readonly origin?: UiMotionOrigin
  readonly fallback?: 'fade' | 'none'
}
export type UiMotionCancelReason =
  | 'requested'
  | 'superseded'
  | 'deactivated'
  | 'disposed'
  | 'hidden-document'
  | 'preference-changed'
  | 'target-detached'
  | 'geometry-changed'
export type UiMotionSkipReason =
  | 'motion-disabled'
  | 'hidden-document'
  | 'inactive-owner'
  | 'missing-target'
  | 'unsupported-browser'
export type UiMotionResult<P extends UiMotionPreset = UiMotionPreset> = Readonly<{
  readonly preset: P
  readonly phase: UiMotionPhase<P>
}> &
  (
    | Readonly<{ kind: 'completed'; presentation: 'full' | 'reduced' | 'fallback' }>
    | Readonly<{ kind: 'cancelled'; reason: UiMotionCancelReason }>
    | Readonly<{ kind: 'skipped'; reason: UiMotionSkipReason }>
    | Readonly<{ kind: 'failed'; error: unknown }>
  )
export interface UiMotionHandle<P extends UiMotionPreset = UiMotionPreset> {
  readonly finished: Promise<UiMotionResult<P>>
  /** Releases visual ownership, including an already completed exit. Never changes application state. */
  cancel(): void
}
export interface UiMotionController {
  /** Exit holds its final mask until cancelled, replaced on this target, or its Vue owner stops. */
  play<P extends UiMotionPreset>(
    target: UiMotionTarget<NoInfer<P>>,
    options: UiMotionOptions<P>,
  ): UiMotionHandle<P>
}
