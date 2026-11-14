import { playDomFrames } from './cinematic-dom-playback'
import type { CinematicPlayback, ThemeRiftInput } from './cinematic-theme-rift'

/** Live semantic text is never split, cloned, replaced or made inaccessible. */
export function playTextRecipe(
  target: HTMLElement,
  input: ThemeRiftInput,
  preset: 'text-reveal' | 'text-dust',
): CinematicPlayback {
  const playback = playDomFrames(
    target,
    input,
    preset === 'text-reveal'
      ? [
          { clipPath: 'inset(0 100% 0 0)', opacity: 0.35 },
          { clipPath: 'inset(0 0% 0 0)', opacity: 1 },
        ]
      : [
          { clipPath: 'inset(0 100% 0 0)', opacity: 0, filter: 'blur(5px)' },
          { clipPath: 'inset(0 18% 0 0)', opacity: 0.9, filter: 'blur(1px)', offset: 0.7 },
          { clipPath: 'inset(0 0% 0 0)', opacity: 1, filter: 'blur(0px)' },
        ],
  )
  // The dust is a decorative type-stage accent, not a claim to disintegrate arbitrary DOM glyphs.
  if (preset === 'text-reveal' || target.childElementCount > 0) return playback
  const document = target.ownerDocument
  const bounds = target.getBoundingClientRect()
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const animations: Animation[] = []
  const cancel = (): void => {
    playback.cancel()
    for (const animation of animations) animation.cancel()
    svg.remove()
  }
  try {
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('data-pavp-motion-decoration', 'text-dust')
    svg.setAttribute('viewBox', `0 0 ${String(bounds.width)} ${String(bounds.height)}`)
    svg.style.position = 'fixed'
    svg.style.pointerEvents = 'none'
    svg.style.left = `${String(bounds.left)}px`
    svg.style.top = `${String(bounds.top)}px`
    svg.style.width = `${String(bounds.width)}px`
    svg.style.height = `${String(bounds.height)}px`
    svg.style.overflow = 'hidden'
    svg.style.zIndex = getComputedStyle(target).getPropertyValue('--ui-z-overlay')
    const fill = input.appearance.colorPalette.roles.primary.foreground.default
    for (let index = 0; index < 36; index++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      const x = ((index + 0.5) / 36) * bounds.width
      const y = bounds.height * (0.25 + ((index * 13) % 17) / 34)
      circle.setAttribute('cx', String(x))
      circle.setAttribute('cy', String(y))
      circle.setAttribute('r', String(0.8 + (index % 3) * 0.4))
      circle.setAttribute('fill', fill)
      svg.append(circle)
      const frames: Keyframe[] = [
        {
          opacity: 0,
          transform: `translate(${String(bounds.width * 0.08)}px, ${String((index % 2 ? -1 : 1) * bounds.height * 0.3)}px)`,
        },
        { opacity: 0.7, offset: 0.35 },
        { opacity: 0, transform: 'translate(0px, 0px)' },
      ]
      if (input.options.phase === 'exit') {
        frames.reverse()
        for (const frame of frames)
          if (typeof frame.offset === 'number') frame.offset = 1 - frame.offset
      }
      const animation = circle.animate(frames, {
        duration: input.durationMs * 0.55,
        delay: (input.durationMs * 0.4 * index) / 36,
        fill: 'both',
        easing: 'ease-out',
      })
      void animation.finished.catch(() => undefined)
      animations.push(animation)
    }
    document.body.append(svg)
    return {
      viewportBound: true,
      finished: Promise.all([
        playback.finished,
        ...animations.map((animation) => animation.finished),
      ]).then(() => {
        svg.remove()
      }),
      cancel,
    }
  } catch (error) {
    cancel()
    throw error
  }
}
