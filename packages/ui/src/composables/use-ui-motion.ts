import type { UiAppearanceSnapshot } from '@platform/design-system'
import { inject, isRef, onActivated, onDeactivated, onScopeDispose, watch, type Ref } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { createCinematicController } from '../adapters/motion/cinematic-controller'
import type { UiMotionController } from '../motion/motion-contracts'

export { useErrorForegroundMotion } from '../adapters/motion/error-foreground'

/** Developer-chosen cinematic recipes, governed by an existing PAVP appearance snapshot. */
export function useUiMotion(
  explicitAppearance?: Readonly<Ref<Readonly<UiAppearanceSnapshot>>>,
): UiMotionController {
  if (explicitAppearance !== undefined && !isRef(explicitAppearance))
    throw new TypeError('useUiMotion requires a reactive appearance reference.')
  const appearance = explicitAppearance ?? inject(pavpNaiveAppearanceKey)
  if (appearance === undefined)
    throw new Error('useUiMotion requires UiProvider or an explicit appearance reference.')
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
