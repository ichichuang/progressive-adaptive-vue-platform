import type { CinematicPlayback, ThemeRiftInput } from './cinematic-theme-rift'

/** A single animation lease. The controller owns observers and the lifetime of the final exit. */
export function playDomFrames(
  target: HTMLElement,
  input: ThemeRiftInput,
  enteringFrames: readonly Keyframe[],
): CinematicPlayback {
  const frames = enteringFrames.map((frame) => ({ ...frame }))
  if (input.options.phase === 'exit') {
    frames.reverse()
    for (const frame of frames)
      if (typeof frame.offset === 'number') frame.offset = 1 - frame.offset
  }
  const animation = target.animate(frames, {
    duration: input.durationMs,
    // Mirror the reveal curve as well as its frames: preserve the old scene until commit.
    easing:
      input.options.phase === 'exit'
        ? 'cubic-bezier(0.64, 0, 0.78, 0)'
        : 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'both',
  })
  const finished = animation.finished.then(() => undefined)
  void finished.catch(() => undefined)
  return {
    finished,
    cancel: () => {
      animation.cancel()
    },
  }
}

export function motionOrigin(target: HTMLElement, input: ThemeRiftInput): { x: number; y: number } {
  const bounds = target.getBoundingClientRect()
  const origin = input.options.origin
  return {
    x: origin ? Math.max(0, Math.min(1, (origin.clientX - bounds.left) / bounds.width)) : 0.5,
    y: origin ? Math.max(0, Math.min(1, (origin.clientY - bounds.top) / bounds.height)) : 0.5,
  }
}
