import type { UiAppearanceSnapshot } from '@platform/design-system'
import type { UiMotionOptions } from '../../motion/motion-contracts'

export interface CinematicPlayback {
  readonly finished: Promise<void>
  readonly presentation?: 'full' | 'fallback'
  readonly viewportBound?: boolean
  cancel(): void
}
export interface ThemeRiftInput {
  readonly options: UiMotionOptions
  readonly appearance: UiAppearanceSnapshot
  readonly durationMs: number
  readonly reduced: boolean
  readonly fallback: boolean
  readonly decorate?: boolean
}

/** Content stays live. Only presentation is masked; no snapshots, clones or layout writes. */
export function playThemeRift(target: HTMLElement, input: ThemeRiftInput): CinematicPlayback {
  const { options, durationMs, reduced, fallback } = input
  const bounds = target.getBoundingClientRect()
  const ratio = (value: number, start: number, length: number) =>
    Math.max(0, Math.min(1, (value - start) / length))
  const x =
    options.origin === undefined ? 0.5 : ratio(options.origin.clientX, bounds.left, bounds.width)
  const y =
    options.origin === undefined ? 0.5 : ratio(options.origin.clientY, bounds.top, bounds.height)
  // A tilted, narrow fissure opens around the initiating point, then resolves to the full surface.
  const seam = `${String(x * 100)}%`
  const closed = `polygon(${seam} 0%, ${seam} 0%, ${seam} ${String(y * 100)}%, ${seam} 100%, ${seam} 100%, ${seam} ${String(y * 100)}%)`
  const middle = `polygon(${String(Math.max(0, x * 100 - 18))}% 0%, ${String(Math.min(100, x * 100 + 28))}% 0%, ${String(Math.min(100, x * 100 + 18))}% ${String(y * 100)}%, ${String(Math.min(100, x * 100 + 28))}% 100%, ${String(Math.max(0, x * 100 - 28))}% 100%, ${String(Math.max(0, x * 100 - 18))}% ${String(y * 100)}%)`
  const opened = 'polygon(0% 0%, 100% 0%, 100% 50%, 100% 100%, 0% 100%, 0% 50%)'
  const entering = options.phase === 'enter'
  const frames: Keyframe[] =
    reduced || fallback
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { clipPath: closed, offset: 0 },
          { clipPath: middle, offset: 0.36 },
          { clipPath: opened, offset: 1 },
        ]
  if (!entering) {
    frames.reverse()
    for (const frame of frames)
      if (typeof frame.offset === 'number') frame.offset = 1 - frame.offset
  }
  const animations: Animation[] = []
  const own = (animation: Animation): void => {
    animations.push(animation)
    // Cancellation rejects native finished promises; the controller reports its own result.
    void animation.finished.catch(() => undefined)
  }
  let decoration: SVGSVGElement | undefined
  let cancelled = false
  const cancel = (): void => {
    if (cancelled) return
    cancelled = true
    for (const animation of animations) animation.cancel()
    decoration?.remove()
    decoration = undefined
  }
  try {
    own(
      target.animate(frames, {
        duration: durationMs,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      }),
    )
    if (!reduced && !fallback && input.decorate !== false && durationMs > 0) {
      const document = target.ownerDocument
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      decoration = svg
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('data-pavp-motion-decoration', 'theme-rift')
      svg.setAttribute('focusable', 'false')
      svg.setAttribute('viewBox', `0 0 ${String(bounds.width)} ${String(bounds.height)}`)
      svg.style.position = 'fixed'
      svg.style.pointerEvents = 'none'
      svg.style.left = `${String(bounds.left)}px`
      svg.style.top = `${String(bounds.top)}px`
      svg.style.width = `${String(bounds.width)}px`
      svg.style.height = `${String(bounds.height)}px`
      svg.style.overflow = 'hidden'
      svg.style.zIndex = getComputedStyle(target).getPropertyValue('--ui-z-overlay')
      const primary = input.appearance.colorPalette.roles.primary
      for (const direction of [-1, 1]) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        const originX = x * bounds.width
        const bend = Math.min(bounds.width, bounds.height) * 0.035
        path.setAttribute(
          'd',
          `M ${String(originX)} 0 L ${String(originX + direction * bend)} ${String(y * bounds.height)} L ${String(originX)} ${String(bounds.height)}`,
        )
        path.setAttribute('fill', 'none')
        path.setAttribute('stroke', primary.foreground.default)
        path.setAttribute('stroke-width', '2')
        svg.append(path)
        const edgeFrames: Keyframe[] = [
          { transform: 'translateX(0px)', opacity: 0 },
          {
            transform: `translateX(${String(direction * bounds.width * 0.12)}px)`,
            opacity: 0.8,
            offset: 0.18,
          },
          { transform: `translateX(${String(direction * bounds.width)}px)`, opacity: 0 },
        ]
        if (!entering) {
          edgeFrames.reverse()
          for (const frame of edgeFrames)
            if (typeof frame.offset === 'number') frame.offset = 1 - frame.offset
        }
        own(
          path.animate(edgeFrames, {
            duration: durationMs,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          }),
        )
      }
      document.body.append(svg)
    }
    return {
      viewportBound: decoration !== undefined,
      finished: Promise.all(animations.map((animation) => animation.finished)).then(() => {
        decoration?.remove()
        decoration = undefined
      }),
      cancel,
    }
  } catch (error) {
    cancel()
    throw error
  }
}
