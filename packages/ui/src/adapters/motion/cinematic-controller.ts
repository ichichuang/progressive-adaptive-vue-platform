import type { UiAppearanceSnapshot } from '@platform/design-system'
import type {
  UiMotionCancelReason,
  UiMotionController,
  UiMotionHandle,
  UiMotionOptions,
  UiMotionPreset,
  UiMotionResult,
  UiMotionTarget,
} from '../../motion/motion-contracts'
import { playMaskRecipe } from './cinematic-mask-recipes'
import { playSpatialRecipe } from './cinematic-spatial-recipes'
import { playTextRecipe } from './cinematic-text-recipes'
import { playCinematicGpu } from './cinematic-gpu-playback'
import { uiMotionPresets } from '../../motion/motion-registry'
import { playThemeRift, type CinematicPlayback, type ThemeRiftInput } from './cinematic-theme-rift'

function validateOptions(value: unknown): void {
  if (typeof value !== 'object' || value === null)
    throw new TypeError('Motion options must be an object.')
  const options = value as Readonly<Record<string, unknown>>
  const preset = Object.entries(uiMotionPresets).find(([key]) => key === options['preset'])?.[1]
  if (!preset?.phases.some((phase) => phase === options['phase']))
    throw new TypeError('Unknown motion preset or unsupported phase.')
  const duration = options['durationMs']
  if (
    duration !== undefined &&
    (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0)
  )
    throw new TypeError('Motion durationMs must be finite and non-negative.')
  const origin = options['origin']
  if (
    origin !== undefined &&
    (typeof origin !== 'object' ||
      origin === null ||
      !('clientX' in origin) ||
      !('clientY' in origin) ||
      typeof origin.clientX !== 'number' ||
      typeof origin.clientY !== 'number' ||
      !Number.isFinite(origin.clientX) ||
      !Number.isFinite(origin.clientY))
  )
    throw new TypeError('Motion origin must contain finite viewport coordinates.')
  if (
    options['fallback'] !== undefined &&
    options['fallback'] !== 'fade' &&
    options['fallback'] !== 'none'
  )
    throw new TypeError('Unknown motion fallback.')
}

interface OwnedRun {
  release(reason: UiMotionCancelReason): void
}
// Ownership spans composable instances, but does not retain abandoned DOM targets globally.
const targetOwners = new WeakMap<HTMLElement, OwnedRun>()

export interface CinematicPlatform {
  start(target: HTMLElement, input: ThemeRiftInput): CinematicPlayback
  supports(target: HTMLElement): boolean
  supportsMask(preset: UiMotionPreset): boolean
  observe(
    target: HTMLElement,
    cancel: (reason: UiMotionCancelReason) => void,
    viewportBound: boolean,
  ): () => void
}

const browserPlatform: CinematicPlatform = {
  start: (target, input) => {
    if (input.options.preset === 'theme-rift' || input.reduced || input.fallback)
      return playThemeRift(target, input)
    if (input.options.preset === 'liquid-refraction') {
      if (target.tagName !== 'IMG')
        throw new TypeError('Liquid refraction requires an image target.')
      return playCinematicGpu(target, input, target as HTMLImageElement)
    }
    const preset = input.options.preset
    if (preset === 'particle-scatter') return playCinematicGpu(target, input)
    if (preset === 'page-peel' || preset === 'camera-push' || preset === 'card-expand')
      return playSpatialRecipe(target, input, preset)
    if (preset === 'text-reveal' || preset === 'text-dust')
      return playTextRecipe(target, input, preset)
    return playMaskRecipe(target, input, preset)
  },
  supports: (target) => typeof target.animate === 'function',
  supportsMask: (preset) => {
    if (typeof CSS === 'undefined') return false
    if (!CSS.supports('clip-path', 'polygon(0% 0%, 100% 0%, 50% 100%)')) return false
    if (preset === 'pixel-dissolve') return CSS.supports('clip-path', "path('M0 0H1V1H0Z')")
    if (preset === 'page-peel' || preset === 'camera-push' || preset === 'card-expand')
      return CSS.supports('scale', '1') && CSS.supports('rotate', '0deg')
    return true
  },
  observe(target, cancel, viewportBound) {
    const document = target.ownerDocument
    const onVisibility = (): void => {
      if (document.hidden) cancel('hidden-document')
    }
    const measure = (): string => {
      const values: number[] = [target.offsetWidth, target.offsetHeight]
      let element: HTMLElement | null = target
      while (element) {
        values.push(element.offsetLeft, element.offsetTop)
        element = element.offsetParent instanceof HTMLElement ? element.offsetParent : null
      }
      // Local effects move with the target. Only viewport-bound decoration owns scroll geometry.
      if (viewportBound) {
        let ancestor = target.parentElement
        while (ancestor) {
          values.push(ancestor.scrollLeft, ancestor.scrollTop)
          ancestor = ancestor.parentElement
        }
      }
      return values.join(',')
    }
    const geometry = measure()
    const onScroll = (): void => {
      if (measure() !== geometry) cancel('geometry-changed')
    }
    document.addEventListener('visibilitychange', onVisibility)
    if (viewportBound) document.addEventListener('scroll', onScroll, true)
    const observer = new MutationObserver(() => {
      if (!target.isConnected) cancel('target-detached')
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
    const resize = new ResizeObserver(() => {
      if (measure() !== geometry) cancel('geometry-changed')
    })
    resize.observe(target)
    return () => {
      observer.disconnect()
      resize.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      if (viewportBound) document.removeEventListener('scroll', onScroll, true)
    }
  },
}

/** One Vue owner's visual leases. Application updates, routing, focus and scroll remain caller-owned. */
export function createCinematicController(
  readAppearance: () => UiAppearanceSnapshot,
  isActive: () => boolean,
  platform: CinematicPlatform = browserPlatform,
): {
  readonly controller: UiMotionController
  interrupt(reason: UiMotionCancelReason): void
  dispose(): void
} {
  const owned = new Set<OwnedRun>()
  let disposed = false
  function interrupt(reason: UiMotionCancelReason): void {
    for (const run of [...owned]) run.release(reason)
  }
  function play<P extends UiMotionPreset>(
    target: UiMotionTarget<P>,
    options: UiMotionOptions<P>,
  ): UiMotionHandle<P> {
    validateOptions(options)
    if (options.preset === 'liquid-refraction' && target.tagName !== 'IMG')
      throw new TypeError('Liquid refraction requires an image target.')
    const preset = uiMotionPresets[options.preset]
    const durationMs = options.durationMs ?? preset.defaultDurationMs

    targetOwners.get(target)?.release('superseded')
    const base = { preset: options.preset, phase: options.phase } as const
    let resolve!: (result: UiMotionResult<P>) => void
    const finished = new Promise<UiMotionResult<P>>((done) => {
      resolve = done
    })
    let settled = false
    let released = false
    let playback: CinematicPlayback | undefined
    let disconnect: (() => void) | undefined
    const settle = (result: UiMotionResult<P>): void => {
      if (settled) return
      settled = true
      resolve(Object.freeze(result))
    }
    const run: OwnedRun = {
      release(reason) {
        if (released) return
        released = true
        disconnect?.()
        disconnect = undefined
        playback?.cancel()
        playback = undefined
        owned.delete(run)
        if (targetOwners.get(target) === run) targetOwners.delete(target)
        settle({ ...base, kind: 'cancelled', reason })
      },
    }
    const handle: UiMotionHandle<P> = Object.freeze({
      finished,
      cancel: () => {
        run.release('requested')
      },
    })
    const skip = (
      reason: Extract<UiMotionResult, { kind: 'skipped' }>['reason'],
    ): UiMotionHandle<P> => {
      settle({ ...base, kind: 'skipped', reason })
      run.release('requested')
      return handle
    }
    if (disposed || !isActive()) return skip('inactive-owner')
    if (!target.isConnected) return skip('missing-target')
    const bounds = target.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return skip('missing-target')
    if (target.ownerDocument.hidden) return skip('hidden-document')
    const appearance = readAppearance()
    if (appearance.motion === 'none' || durationMs === 0) return skip('motion-disabled')
    if (!platform.supports(target)) return skip('unsupported-browser')
    const reduced = appearance.motion === 'reduced'
    const fallback = !reduced && !platform.supportsMask(options.preset)
    if (fallback && (options.fallback ?? preset.fallback) === 'none')
      return skip('unsupported-browser')
    owned.add(run)
    targetOwners.set(target, run)
    try {
      playback = platform.start(target, {
        options,
        appearance,
        durationMs: reduced ? Math.min(durationMs, preset.reducedDurationMs) : durationMs,
        reduced,
        fallback,
      })
      void playback.finished.catch(() => undefined)
      disconnect = platform.observe(
        target,
        (reason) => {
          run.release(reason)
        },
        playback.viewportBound === true,
      )
      void playback.finished.then(
        () => {
          if (released) return
          if (!target.isConnected) {
            run.release('target-detached')
            return
          }
          settle({
            ...base,
            kind: 'completed',
            presentation: reduced
              ? 'reduced'
              : fallback
                ? 'fallback'
                : (playback?.presentation ?? 'full'),
          })
          // An exit holds only presentation; the next enter/cancel or lifecycle release restores it.
          if (options.phase === 'enter') run.release('requested')
        },
        (error: unknown) => {
          if (released) return
          settle({ ...base, kind: 'failed', error })
          run.release('requested')
        },
      )
    } catch (error) {
      settle({ ...base, kind: 'failed', error })
      run.release('requested')
    }
    return handle
  }
  return {
    controller: Object.freeze({ play }),
    interrupt,
    dispose() {
      if (disposed) return
      disposed = true
      interrupt('disposed')
    },
  }
}
