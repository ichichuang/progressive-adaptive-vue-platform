import { LayoutGroup, LazyMotion, MotionConfig, type domMax } from 'motion-v'
import { nextTick, readonly, ref, type Ref } from 'vue'

type AdminNavigationDomMaxFeaturePackage = typeof domMax

let adminNavigationDomMaxPromise:
  Promise<AdminNavigationDomMaxFeaturePackage | undefined> | undefined

function loadAdminNavigationDomMax(): Promise<AdminNavigationDomMaxFeaturePackage | undefined> {
  adminNavigationDomMaxPromise ??= import('./admin-navigation-dom-max')
    .then(({ default: features }) => features)
    .catch(() => undefined)

  return adminNavigationDomMaxPromise
}

export function createAdminNavigationMotionFeatureRuntime(): {
  readonly dispose: () => void
  readonly featureReady: Readonly<Ref<boolean>>
  readonly features: Promise<AdminNavigationDomMaxFeaturePackage>
  readonly startAfterStableMount: () => Promise<void>
} {
  const mutableFeatureReady = ref(false)
  const featureReady: Readonly<Ref<boolean>> = readonly(mutableFeatureReady)
  const runtimeState = {
    disposed: false,
    started: false,
  }
  let resolveFeatures!: (features: AdminNavigationDomMaxFeaturePackage) => void
  const features = new Promise<AdminNavigationDomMaxFeaturePackage>((resolve) => {
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

    const loadedFeatures = await loadAdminNavigationDomMax()

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
