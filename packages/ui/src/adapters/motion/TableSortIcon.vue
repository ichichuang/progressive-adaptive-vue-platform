<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { projectMotionPolicy } from './motion-policy'
import {
  createMotionFeatureRuntime,
  createMotionInterruptionOwner,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

const props = defineProps<{
  readonly motion: EffectiveAppearanceState['motion']
  readonly order: 'ascend' | 'descend' | false
}>()
const orders = [false, 'descend', 'ascend'] as const
const { dispose, featureReady, features, startAfterStableMount } = createMotionFeatureRuntime()
const policy = computed(() => projectMotionPolicy(props.motion, featureReady.value))
const interruption = createMotionInterruptionOwner(() => policy.value)
watch(
  () => props.motion,
  () => {
    interruption.settle(policy.value)
  },
  { flush: 'post' },
)
onMounted(() => {
  void startAfterStableMount()
})
onBeforeUnmount(() => {
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
      <!-- Persistent layers retarget immediately; the focused button never remounts. -->
      <span
        aria-hidden="true"
        class="inline-flex pointer-events-none relative size-icon-medium"
      >
        <m.span
          v-for="state in orders"
          :key="String(state)"
          :ref="(element: unknown) => interruption.bind(String(state), element)"
          :class="[
            'absolute inset-0 size-icon-medium',
            state === 'ascend'
              ? 'i-lucide-arrow-up'
              : state === 'descend'
                ? 'i-lucide-arrow-down'
                : 'i-lucide-arrow-up-down',
          ]"
          :initial="false"
          :animate="order === state ? policy.tableSortIcon.visible : policy.tableSortIcon.hidden"
          :transition="policy.tableSortIcon.transition"
        />
      </span>
    </MotionConfig>
  </LazyMotion>
</template>
