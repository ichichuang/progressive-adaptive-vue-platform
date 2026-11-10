<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m, type MotionProps } from 'motion-v'
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { projectMotionPolicy } from './motion-policy'
import {
  createMotionFeatureRuntime,
  createMotionInterruptionOwner,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

defineOptions({ name: 'FormValidationFeedback' })
const props = defineProps<{
  readonly motion: EffectiveAppearanceState['motion']
  readonly revision: number
  readonly active: boolean
  readonly errors: readonly unknown[]
}>()
defineSlots<{ default: () => unknown }>()
const { dispose, featureReady, features, startAfterStableMount } = createMotionFeatureRuntime()
const policy = computed(() => projectMotionPolicy(props.motion, featureReady.value))
const interruption = createMotionInterruptionOwner(() => policy.value)
const target = shallowRef<NonNullable<MotionProps['animate']>>({
  x: 0,
  transition: { duration: 0 },
})
let pending = 0
// Only a newly completed explicit validation attempt can play. Changes to errors,
// preferences, availability or visibility settle the same live input instance.
watch(
  () => [props.revision, props.active, props.errors, props.motion] as const,
  async ([revision, active], previous) => {
    const current = ++pending
    interruption.settle(policy.value)
    target.value = { x: 0, transition: { duration: 0 } }
    if (revision <= 0 || revision === previous[0] || !active || !policy.value.movement) return
    await nextTick()
    if (current !== pending || typeof document === 'undefined' || document.hidden) return
    target.value = policy.value.formFeedback
  },
  { flush: 'post' },
)
onMounted(() => {
  void startAfterStableMount()
})
onBeforeUnmount(() => {
  pending += 1
  interruption.dispose(projectMotionPolicy('none'))
  dispose()
})
</script>

<template>
  <LazyMotion
    :features="features"
    strict
  >
    <MotionConfig
      :reduced-motion="policy.reducedMotion"
      :skip-animations="policy.skipAnimations"
    >
      <m.div
        :ref="(element: unknown) => interruption.bind('control', element)"
        class="min-w-0 w-full"
        :initial="false"
        :animate="target"
      >
        <slot />
      </m.div>
    </MotionConfig>
  </LazyMotion>
</template>
