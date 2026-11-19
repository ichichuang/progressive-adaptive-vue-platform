<script setup lang="ts">
import type { MotionPreference } from '@platform/design-system'
import { onMounted, onScopeDispose, shallowRef, watch } from 'vue'
import { sampleErrorParticles } from './error-particle-data'
import { errorParticleLayout, type ErrorArtworkViewport } from './error-particle-layout'
import { paintErrorParticles, paintParticleAtlas } from './error-particle-paint'
import type { createErrorParticles } from './error-particles'
import type { ErrorArtworkColors, ErrorSceneCode } from './error-scene'
import { appendErrorStaticDots } from './error-static-dots'

const props = defineProps<{
  readonly code: ErrorSceneCode
  readonly colors: ErrorArtworkColors
  readonly motion: MotionPreference
  readonly active: boolean
}>()

const surface = shallowRef<HTMLElement | null>(null)
const focal = shallowRef<HTMLElement | null>(null)
let disposeArtwork: (() => void) | undefined

function connectArtwork(host: HTMLElement, focal: HTMLElement): () => void {
  const staticCanvas = document.createElement('canvas')
  staticCanvas.setAttribute('data-error-static', '')
  const context = staticCanvas.getContext('2d')
  const atlas = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (context === null || atlas === null) throw new Error('Canvas 2D is unavailable.')
  const paintContext = context
  const atlasContext = atlas
  const description = sampleErrorParticles(props.code, getComputedStyle(focal))
  const listeners = new AbortController()
  const options = { signal: listeners.signal }
  let pending: AbortController | undefined
  let renderer: ReturnType<typeof createErrorParticles> | undefined
  let canvasEvents: AbortController | undefined
  let viewport: ErrorArtworkViewport = { width: 0, height: 0, glyphHeight: 0 }
  let pixelRatio = 0
  let layout: ReturnType<typeof errorParticleLayout> | undefined
  let palette: ErrorArtworkColors | undefined
  let image: ImageData | undefined
  let frame = 0
  let previousFrame = 0
  let recoveryTimer = 0
  let lost = false
  let restored = false
  let failed = false
  let previousPointer: { x: number; y: number; time: number } | undefined

  function visible(): boolean {
    return props.active && !document.hidden && layout !== undefined
  }

  function showParticles(show: boolean): void {
    if (renderer !== undefined) renderer.canvas.hidden = !show
    staticCanvas.hidden = show
    host.dataset['rendering'] = show ? 'particles' : 'static'
  }

  function clearPointer(): void {
    previousPointer = undefined
    renderer?.setPointer(null)
  }

  function stop(): void {
    window.cancelAnimationFrame(frame)
    frame = 0
    previousFrame = 0
    clearPointer()
  }

  function release(): void {
    stop()
    pending?.abort()
    pending = undefined
    canvasEvents?.abort()
    canvasEvents = undefined
    window.clearTimeout(recoveryTimer)
    showParticles(false)
    renderer?.canvas.remove()
    renderer?.dispose()
    renderer = undefined
    lost = false
  }

  function fail(): void {
    failed = true
    release()
  }

  function draw(now: number): void {
    frame = 0
    if (renderer === undefined || props.motion !== 'full' || !visible() || lost) return
    const delta = previousFrame === 0 ? 0 : Math.min((now - previousFrame) / 1000, 0.05)
    previousFrame = now
    try {
      renderer.draw(delta)
    } catch {
      if (renderer.isContextLost()) {
        stop()
        showParticles(false)
      } else fail()
      return
    }
    frame = window.requestAnimationFrame(draw)
  }

  function onContextLost(event: Event): void {
    if (restored || pending !== undefined) {
      fail()
      return
    }
    event.preventDefault()
    lost = true
    showParticles(false)
    stop()
    recoveryTimer = window.setTimeout(fail, 1800)
  }

  function onContextRestored(): void {
    if (renderer === undefined || !lost) return
    window.clearTimeout(recoveryTimer)
    restored = true
    lost = false
    synchronize()
  }

  function present(): void {
    if (renderer === undefined || layout === undefined || image === undefined) return
    renderer.setPalette(image)
    renderer.resize(layout)
    renderer.present()
    if (!renderer.canvas.isConnected) host.append(renderer.canvas)
    showParticles(true)
    if (frame === 0) frame = window.requestAnimationFrame(draw)
  }

  async function prepare(request: AbortController): Promise<void> {
    try {
      const { createErrorParticles: create } = await import('./error-particles')
      if (request.signal.aborted || !visible() || props.motion !== 'full' || image === undefined)
        return

      renderer = create(description, props.code, image)
      canvasEvents = new AbortController()
      const canvas = renderer.canvas
      canvas.hidden = true
      canvas.addEventListener('webglcontextlost', onContextLost, { signal: canvasEvents.signal })
      canvas.addEventListener('webglcontextrestored', onContextRestored, {
        signal: canvasEvents.signal,
      })
      await renderer.prepare()
      request.signal.throwIfAborted()

      // An import or shader warm-up can outlive a resize, theme switch or activation.
      // Re-read the current paint inputs and make both layers current before taking ownership.
      pending = undefined
      synchronize()
    } catch {
      if (!request.signal.aborted) fail()
    } finally {
      if (pending === request) pending = undefined
    }
  }

  function synchronize(): void {
    const { width, height } = host.getBoundingClientRect()
    const glyphHeight = focal.getBoundingClientRect().height
    const scaleChanged =
      width !== viewport.width ||
      height !== viewport.height ||
      glyphHeight !== viewport.glyphHeight ||
      pixelRatio !== window.devicePixelRatio
    if (scaleChanged) {
      viewport = { width, height, glyphHeight }
      pixelRatio = window.devicePixelRatio
      clearPointer()
      layout =
        width > 0 && height > 0 && glyphHeight > 0
          ? errorParticleLayout(
              viewport,
              pixelRatio,
              description.focal.capacity,
              description.environment.capacity,
            )
          : undefined
    }

    const recolor = palette?.ink !== props.colors.ink || palette.accent !== props.colors.accent
    if (layout !== undefined) {
      const updateAtlas = recolor || image === undefined
      if (updateAtlas) {
        palette = props.colors
        image = paintParticleAtlas(atlasContext, palette)
      }
      if (updateAtlas || scaleChanged || !staticCanvas.isConnected) {
        paintErrorParticles(paintContext, atlasContext.canvas, description, layout)
        if (!staticCanvas.isConnected) host.append(staticCanvas)
      }
    }

    if (props.motion !== 'full' || layout === undefined) {
      if (renderer !== undefined || pending !== undefined) release()
      return
    }
    if (!visible()) {
      stop()
      if (pending !== undefined) release()
      return
    }
    if (failed || lost || pending !== undefined) return
    if (renderer !== undefined) {
      if (scaleChanged || recolor || frame === 0) {
        try {
          present()
        } catch {
          if (renderer.isContextLost()) {
            stop()
            showParticles(false)
          } else fail()
        }
      }
    } else {
      pending = new AbortController()
      void prepare(pending)
    }
  }

  function move(event: PointerEvent): void {
    if (renderer === undefined || frame === 0 || event.pointerType === 'touch') return
    const rect = host.getBoundingClientRect()
    const { glyphHeight: scale } = viewport
    if (scale <= 0 || rect.width <= 0 || rect.height <= 0) return
    const dx = event.clientX - rect.left
    const dy = event.clientY - rect.top
    if (dx < 0 || dx > rect.width || dy < 0 || dy > rect.height) {
      clearPointer()
      return
    }
    const x = (dx - rect.width / 2) / scale
    const y = (rect.height / 2 - dy) / scale
    const previous = previousPointer
    const dt = previous === undefined ? 0 : (event.timeStamp - previous.time) / 1000
    const velocity = (distance: number): number => Math.max(-2.2, Math.min(2.2, distance / dt))
    const recent = previous !== undefined && dt >= 0.004 && dt < 0.085
    renderer.setPointer({
      x,
      y,
      vx: recent ? velocity(x - previous.x) : 0,
      vy: recent ? velocity(y - previous.y) : 0,
    })
    previousPointer = { x, y, time: event.timeStamp }
  }

  synchronize()

  const observer =
    typeof ResizeObserver === 'function' ? new ResizeObserver(synchronize) : undefined
  observer?.observe(host)
  observer?.observe(focal)
  window.addEventListener('resize', synchronize, options)
  window.addEventListener('pageshow', synchronize, options)
  document.addEventListener('visibilitychange', synchronize, options)
  window.addEventListener('pointermove', move, { ...options, passive: true })
  window.addEventListener('pointercancel', clearPointer, options)
  window.addEventListener('blur', clearPointer, options)
  window.addEventListener(
    'pointerout',
    (event) => {
      if (event.relatedTarget === null) clearPointer()
    },
    options,
  )
  const stopWatch = watch(() => [props.active, props.motion, props.colors] as const, synchronize, {
    flush: 'post',
  })

  return () => {
    stopWatch()
    observer?.disconnect()
    listeners.abort()
    release()
  }
}

onMounted(() => {
  if (surface.value === null || focal.value === null) return
  try {
    disposeArtwork = connectArtwork(surface.value, focal.value)
  } catch {
    try {
      appendErrorStaticDots(surface.value, props.code)
    } catch {
      // Decorative drawing must not block recovery controls.
    }
  }
})

onScopeDispose(() => disposeArtwork?.())
</script>

<template>
  <div
    class="error-scene__artwork pointer-events-none"
    aria-hidden="true"
  >
    <div
      ref="surface"
      class="error-scene__glyph"
      data-rendering="static"
      :data-compact="code === 'OFFLINE' || code === 'SERVICE' ? '' : undefined"
    >
      <div
        ref="focal"
        class="error-scene__focal"
      />
    </div>
  </div>
</template>
