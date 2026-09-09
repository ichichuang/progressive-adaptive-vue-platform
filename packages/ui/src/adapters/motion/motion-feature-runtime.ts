import { LayoutGroup, LazyMotion, MotionConfig, type domMax } from 'motion-v'
import { nextTick, readonly, ref, type Ref } from 'vue'

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

export { LayoutGroup, LazyMotion, MotionConfig }
