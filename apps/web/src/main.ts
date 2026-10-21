import './app/styles/layers.css'
import 'virtual:uno.css'
import App from './App.vue'
import { nextTick, shallowRef, type ShallowRef } from 'vue'
import type { AppearanceSafetyRestorationAuthority } from './app/appearance/appearance-bootstrap'
import { startRuntimeKernel, type RunningApplicationHandle } from './app/bootstrap/runtime-kernel'

interface RuntimeKernelHotData {
  runningApplicationHandle?: RunningApplicationHandle
  scrollDocumentState?: ShallowRef<{
    readonly reloadEligible: boolean
    readonly workspaceGeneration: number
    readonly workspaceReady: boolean
  }>
}

const hotContext = import.meta.hot
const runtimeKernelHotData = hotContext?.data as RuntimeKernelHotData | undefined
const scrollDocumentState =
  runtimeKernelHotData?.scrollDocumentState ??
  shallowRef({
    reloadEligible: true,
    workspaceGeneration: 0,
    workspaceReady: true,
  })
if (runtimeKernelHotData !== undefined)
  runtimeKernelHotData.scrollDocumentState = scrollDocumentState
let retainedConfigurationRetriesUsed = 0
let retainedAppearanceSafetyRestorationAuthority: AppearanceSafetyRestorationAuthority | undefined

if (runtimeKernelHotData !== undefined) {
  const previousHandle = runtimeKernelHotData.runningApplicationHandle

  if (previousHandle !== undefined) {
    retainedConfigurationRetriesUsed = previousHandle.configurationRetriesUsed
    retainedAppearanceSafetyRestorationAuthority =
      previousHandle.appearanceSafetyRestorationAuthority
    const disposalResult = await previousHandle.dispose('hmr')

    if (disposalResult.failedSteps.length !== 0) {
      throw new Error('Runtime Kernel HMR replacement stopped after incomplete disposal.')
    }
  }
}

const runningApplicationHandle = startRuntimeKernel(
  App,
  {
    readReloadEligible: () => scrollDocumentState.value.reloadEligible,
    readWorkspaceGeneration: () =>
      scrollDocumentState.value.workspaceReady
        ? scrollDocumentState.value.workspaceGeneration
        : undefined,
  },
  retainedConfigurationRetriesUsed,
  retainedAppearanceSafetyRestorationAuthority,
)

if (hotContext !== undefined) {
  const hotData = hotContext.data as RuntimeKernelHotData
  hotData.runningApplicationHandle = runningApplicationHandle
  const invalidateScroll = (): void => {
    scrollDocumentState.value = {
      reloadEligible: false,
      workspaceGeneration: scrollDocumentState.value.workspaceGeneration + 1,
      workspaceReady: false,
    }
  }
  const settleScrollUpdate = (): void => {
    const generation = scrollDocumentState.value.workspaceGeneration
    void nextTick().then(
      () => {
        if (scrollDocumentState.value.workspaceGeneration === generation)
          scrollDocumentState.value = { ...scrollDocumentState.value, workspaceReady: true }
      },
      () => undefined,
    )
  }
  hotContext.on('vite:beforeUpdate', invalidateScroll)
  hotContext.on('vite:beforeFullReload', invalidateScroll)
  hotContext.on('vite:afterUpdate', settleScrollUpdate)
  hotContext.accept()
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Vite awaits HMR dispose callbacks before importing the update.
  hotContext.dispose(async (data) => {
    hotContext.off('vite:beforeUpdate', invalidateScroll)
    hotContext.off('vite:beforeFullReload', invalidateScroll)
    hotContext.off('vite:afterUpdate', settleScrollUpdate)
    const activeHandle = (data as RuntimeKernelHotData).runningApplicationHandle

    if (activeHandle === undefined) {
      return
    }

    const disposalResult = await activeHandle.dispose('hmr')

    if (disposalResult.failedSteps.length !== 0) {
      throw new Error('Runtime Kernel HMR disposal was incomplete.')
    }
  })
}
