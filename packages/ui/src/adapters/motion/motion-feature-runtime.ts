import { LayoutGroup, LazyMotion, MotionConfig, mountedStates, type domMax } from 'motion-v'
import { nextTick, readonly, ref, type Ref } from 'vue'
import { projectMotionPolicy, type MotionPolicy } from './motion-policy'

type MotionDomMaxFeaturePackage = typeof domMax

let motionDomMaxPromise: Promise<MotionDomMaxFeaturePackage | undefined> | undefined

function loadMotionDomMax(): Promise<MotionDomMaxFeaturePackage | undefined> {
  motionDomMaxPromise ??= import('./admin-navigation-dom-max')
    .then(({ default: features }) => features)
    .catch(() => undefined)

  return motionDomMaxPromise
}

export function createMotionFeatureRuntime(): {
  readonly dispose: () => void
  readonly featureReady: Readonly<Ref<boolean>>
  readonly features: Promise<MotionDomMaxFeaturePackage>
  readonly startAfterStableMount: () => Promise<void>
} {
  const mutableFeatureReady = ref(false)
  const featureReady: Readonly<Ref<boolean>> = readonly(mutableFeatureReady)
  const runtimeState = {
    disposed: false,
    started: false,
  }
  let resolveFeatures!: (features: MotionDomMaxFeaturePackage) => void
  const features = new Promise<MotionDomMaxFeaturePackage>((resolve) => {
    resolveFeatures = resolve
  })

  function isDisposed(): boolean {
    return runtimeState.disposed
  }

  async function startAfterStableMount(): Promise<void> {
    if (runtimeState.started) {
      return
    }

    runtimeState.started = true
    await nextTick()

    if (isDisposed()) {
      return
    }

    const loadedFeatures = await loadMotionDomMax()

    if (loadedFeatures === undefined) {
      return
    }

    if (isDisposed()) {
      return
    }

    resolveFeatures(loadedFeatures)
    await nextTick()

    if (!isDisposed()) {
      mutableFeatureReady.value = true
    }
  }

  function dispose(): void {
    runtimeState.disposed = true
  }

  return {
    dispose,
    featureReady,
    features,
    startAfterStableMount,
  }
}

type MotionState = NonNullable<ReturnType<typeof mountedStates.get>>
type VisualElement =
  MotionState['visualElement']['children'] extends Set<infer Child> ? Child : never

interface OwnedProjection {
  readonly currentAnimation?: unknown
  readonly pendingAnimation?: unknown
  isAnimationBlocked: boolean
  readonly isProjecting: () => boolean
  readonly startAnimation: (options: { readonly type: false; readonly duration: 0 }) => void
  readonly finishAnimation: () => void
  readonly clearMeasurements: () => void
}

function isOwnedProjection(value: unknown): value is OwnedProjection {
  if (value === null || typeof value !== 'object') return false
  const projection = value as Readonly<Record<string, unknown>>
  return ['isProjecting', 'startAnimation', 'finishAnimation', 'clearMeasurements'].every(
    (method) => typeof projection[method] === 'function',
  )
}

// Register actual Motion roots through Vue refs; never search or remount native targets.
export function createMotionInterruptionOwner(readPolicy: () => MotionPolicy) {
  const roots = new Map<string, Element>()
  let documentTarget: Document | undefined
  let detachVisibility: (() => void) | undefined
  let disposed = false

  function observeVisibility(element: Element): void {
    if (documentTarget === element.ownerDocument) return
    detachVisibility?.()
    documentTarget = element.ownerDocument
    const target = documentTarget
    const update = (): void => {
      settle(readPolicy())
    }
    target.addEventListener('visibilitychange', update)
    detachVisibility = () => {
      target.removeEventListener('visibilitychange', update)
    }
  }

  function bind(id: string, candidate: unknown): void {
    if (disposed) return
    const element =
      candidate !== null && typeof candidate === 'object' && '$el' in candidate
        ? candidate.$el
        : candidate
    if (typeof Element !== 'undefined' && element instanceof Element) {
      roots.set(id, element)
      observeVisibility(element)
      if (documentTarget?.visibilityState === 'hidden') settle(readPolicy())
    } else roots.delete(id)
  }

  function settle(requestedPolicy: MotionPolicy): void {
    if (disposed) return
    const policy =
      documentTarget?.visibilityState === 'hidden' ? projectMotionPolicy('none') : requestedPolicy
    const seen = new Set<VisualElement>()
    const visit = (visual: VisualElement): void => {
      if (seen.has(visual)) return
      seen.add(visual)
      for (const child of visual.children) visit(child)
      const state =
        typeof Element !== 'undefined' && visual.current instanceof Element
          ? mountedStates.get(visual.current)
          : undefined
      const options = visual.getProps()
      let target: unknown = state?.isExiting === true ? options.exit : options.animate
      if (typeof target === 'string') target = visual.getVariant(target)
      if (target === undefined || target === false) target = visual.getVariant('rest')
      const values =
        target !== null && typeof target === 'object' && !Array.isArray(target)
          ? (target as Readonly<Record<string, unknown>>)
          : {}
      visual.shouldReduceMotion = !policy.movement
      visual.shouldSkipAnimations = policy.skipAnimations
      const projection: unknown = visual.projection
      if (isOwnedProjection(projection)) {
        // startAnimation replaces a queued projection using its public cancellation path.
        // The zero-duration finalization completes on the vendor's next frame.
        if (
          projection.isProjecting() ||
          projection.currentAnimation !== undefined ||
          projection.pendingAnimation !== undefined
        )
          projection.startAnimation({ type: false, duration: 0 })
        projection.finishAnimation()
        projection.clearMeasurements()
        projection.isAnimationBlocked = !policy.movement
      }
      visual.values.forEach((value, key) => {
        value.stop()
        const terminal =
          key === 'scale' || key === 'scaleX' || key === 'scaleY'
            ? 1
            : ['x', 'y', 'z', 'rotate', 'rotateX', 'rotateY', 'skewX', 'skewY'].includes(key)
              ? 0
              : values[key]
        if (typeof terminal === 'string' || typeof terminal === 'number') value.jump(terminal)
      })
      visual.render()
      if (state?.isExiting === true) state.setActive('exit', true)
    }
    for (const element of roots.values()) {
      const visual = mountedStates.get(element)?.visualElement
      if (visual !== undefined) visit(visual)
    }
  }

  return {
    bind,
    settle,
    dispose(policy: MotionPolicy): void {
      if (disposed) return
      detachVisibility?.()
      detachVisibility = undefined
      settle(policy)
      roots.clear()
      documentTarget = undefined
      disposed = true
    },
  }
}

export { LayoutGroup, LazyMotion, MotionConfig }
