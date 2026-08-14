import './app/styles/layers.css'
import 'virtual:uno.css'
import App from './App.vue'
import type { AppearanceSafetyRestorationAuthority } from './app/appearance/appearance-bootstrap'
import { startRuntimeKernel, type RunningApplicationHandle } from './app/bootstrap/runtime-kernel'

interface RuntimeKernelHotData {
  runningApplicationHandle?: RunningApplicationHandle
}

const hotContext = import.meta.hot
const runtimeKernelHotData = hotContext?.data as RuntimeKernelHotData | undefined
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
  retainedConfigurationRetriesUsed,
  retainedAppearanceSafetyRestorationAuthority,
)

if (hotContext !== undefined) {
  const hotData = hotContext.data as RuntimeKernelHotData
  hotData.runningApplicationHandle = runningApplicationHandle
  hotContext.accept()
  // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Vite awaits HMR dispose callbacks before importing the update.
  hotContext.dispose(async (data) => {
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
