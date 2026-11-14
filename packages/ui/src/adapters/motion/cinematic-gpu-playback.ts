import { playThemeRift, type CinematicPlayback, type ThemeRiftInput } from './cinematic-theme-rift'
import type { CinematicGpuStage } from './cinematic-gpu-stage'

/** Owns the temporary presentation only; never captures DOM or changes application state. */
export function playCinematicGpu(
  target: HTMLElement,
  input: ThemeRiftInput,
  source?: HTMLImageElement,
): CinematicPlayback {
  if (input.reduced || input.fallback) return playThemeRift(target, input)
  const document = target.ownerDocument
  const window = document.defaultView
  let cancelled = false
  let settled = false
  let generation = 0
  let frame: number | undefined
  let stage: CinematicGpuStage | undefined
  let canvas: HTMLCanvasElement | undefined
  let dom: CinematicPlayback | undefined
  let conceal: Animation | undefined
  let presentation: 'full' | 'fallback' = 'full'
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const finished = new Promise<void>((done, fail) => {
    resolve = done
    reject = fail
  })
  const releaseGpu = (): void => {
    if (frame !== undefined) window?.cancelAnimationFrame(frame)
    frame = undefined
    stage?.dispose()
    stage = undefined
    canvas?.remove()
    canvas = undefined
    conceal?.cancel()
    conceal = undefined
  }
  const complete = (): void => {
    if (settled || cancelled) return
    settled = true
    releaseGpu()
    resolve()
  }
  const fallback = (reason: unknown): void => {
    if (cancelled || settled) return
    generation++
    releaseGpu()
    dom?.cancel()
    dom = undefined
    if (input.options.fallback === 'none') {
      settled = true
      reject(reason)
      return
    }
    presentation = 'fallback'
    try {
      dom = playThemeRift(target, { ...input, fallback: true })
      void dom.finished.then(complete, (error: unknown) => {
        if (cancelled || settled) return
        settled = true
        dom?.cancel()
        reject(error)
      })
    } catch (error) {
      settled = true
      reject(error)
    }
  }
  const cancel = (): void => {
    if (cancelled) return
    cancelled = true
    generation++
    releaseGpu()
    dom?.cancel()
    dom = undefined
    if (!settled) {
      settled = true
      reject(new DOMException('Motion cancelled', 'AbortError'))
    }
  }
  const color = (value: string): readonly [number, number, number, number] => {
    const swatch = document.createElement('canvas')
    swatch.width = swatch.height = 1
    const context = swatch.getContext('2d')
    if (context === null) throw new Error('Color resolution unavailable')
    context.fillStyle = value
    context.fillRect(0, 0, 1, 1)
    const rgba = context.getImageData(0, 0, 1, 1).data
    const [red, green, blue, alpha] = rgba
    if (red === undefined || green === undefined || blue === undefined || alpha === undefined)
      throw new Error('Color resolution failed')
    return [red / 255, green / 255, blue / 255, alpha / 255]
  }
  void import('./cinematic-gpu-stage')
    .then(({ createCinematicGpuStage }) => {
      if (cancelled || settled) return
      const bounds = target.getBoundingClientRect()
      if (window === null || !target.isConnected || bounds.width <= 0 || bounds.height <= 0) {
        fallback(new Error('Motion target unavailable'))
        return
      }
      const style = window.getComputedStyle(target)
      if (
        input.options.preset === 'liquid-refraction' &&
        (source === undefined ||
          !source.complete ||
          source.naturalWidth <= 0 ||
          style.transform !== 'none' ||
          style.filter !== 'none' ||
          style.clipPath !== 'none' ||
          style.opacity !== '1' ||
          Math.abs(source.naturalWidth / source.naturalHeight - bounds.width / bounds.height) >
            0.01 ||
          [
            'paddingTop',
            'paddingRight',
            'paddingBottom',
            'paddingLeft',
            'borderTopWidth',
            'borderRightWidth',
            'borderBottomWidth',
            'borderLeftWidth',
          ].some(
            (key) =>
              Number.parseFloat(
                style.getPropertyValue(
                  key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
                ),
              ) > 0,
          ))
      ) {
        fallback(new Error('Liquid refraction requires a loaded, uncropped image surface'))
        return
      }
      const overlay = document.createElement('canvas')
      canvas = overlay
      overlay.setAttribute('aria-hidden', 'true')
      overlay.style.position = 'fixed'
      overlay.style.pointerEvents = 'none'
      overlay.style.left = `${String(bounds.left)}px`
      overlay.style.top = `${String(bounds.top)}px`
      overlay.style.width = `${String(bounds.width)}px`
      overlay.style.height = `${String(bounds.height)}px`
      overlay.style.zIndex = style.getPropertyValue('--ui-z-overlay')
      overlay.style.borderRadius = style.borderRadius
      const normalize = (value: number, start: number, size: number) =>
        Math.max(0, Math.min(1, (value - start) / size))
      const origin = input.options.origin
      const common = {
        width: bounds.width,
        height: bounds.height,
        pixelRatio: window.devicePixelRatio,
        phase: input.options.phase,
        origin: {
          x: origin === undefined ? 0.5 : normalize(origin.clientX, bounds.left, bounds.width),
          y: origin === undefined ? 0.5 : normalize(origin.clientY, bounds.top, bounds.height),
        },
        colors: [
          color(input.appearance.colorPalette.roles.primary.foreground.default),
          color(input.appearance.colorPalette.roles.primary.solid.background.default),
        ] as const,
        onContextLost: () => {
          fallback(new Error('WebGL context lost'))
        },
      }
      const result =
        input.options.preset === 'liquid-refraction' && source !== undefined
          ? createCinematicGpuStage(overlay, { ...common, effect: 'liquid-refraction', source })
          : createCinematicGpuStage(overlay, { ...common, effect: 'particle-scatter' })
      if (result.kind !== 'ready') {
        fallback(new Error(result.reason))
        return
      }
      stage = result.stage
      if (!stage.render(0)) {
        fallback(new Error('GPU frame unavailable'))
        return
      }
      document.body.append(overlay)
      dom = playThemeRift(target, { ...input, decorate: false })
      if (input.options.preset === 'liquid-refraction') {
        conceal = target.animate([{ opacity: 0 }, { opacity: 0 }], {
          duration: input.durationMs,
          fill: 'both',
        })
        void conceal.finished.catch(() => undefined)
      }
      const run = generation
      const start = window.performance.now()
      let gpuComplete = false
      let domComplete = false
      const finishWhenReady = (): void => {
        if (run === generation && gpuComplete && domComplete) complete()
      }
      const draw = (now: number): void => {
        if (cancelled || settled || run !== generation) return
        const progress = Math.min(1, (now - start) / input.durationMs)
        if (stage?.render(progress) !== true) {
          fallback(new Error('GPU frame unavailable'))
          return
        }
        if (progress < 1) frame = window.requestAnimationFrame(draw)
        else {
          gpuComplete = true
          finishWhenReady()
        }
      }
      frame = window.requestAnimationFrame(draw)
      void dom.finished.then(
        () => {
          domComplete = true
          finishWhenReady()
        },
        (error: unknown) => {
          if (run === generation) fallback(error)
        },
      )
    })
    .catch(fallback)
  return {
    viewportBound: true,
    finished,
    cancel,
    get presentation() {
      return presentation
    },
  }
}
