import { inject, onActivated, onDeactivated, onScopeDispose, watch } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { createCinematicController } from '../adapters/motion/cinematic-controller'
import type { UiMotionController } from '../motion/motion-contracts'

/** Developer-chosen cinematic recipes, governed by the nearest PAVP appearance scope. */
export function useUiMotion(): UiMotionController {
  const appearance = inject(pavpNaiveAppearanceKey)
  if (appearance === undefined) throw new Error('useUiMotion requires UiProvider.')
  let active = true
  const runtime = createCinematicController(
    () => appearance.value,
    () => active,
  )
  watch(
    appearance,
    () => {
      runtime.interrupt('preference-changed')
    },
    { flush: 'sync' },
  )
  onDeactivated(() => {
    active = false
    runtime.interrupt('deactivated')
  })
  onActivated(() => {
    active = true
  })
  onScopeDispose(() => {
    runtime.dispose()
  })
  return runtime.controller
}
