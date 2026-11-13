<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m } from 'motion-v'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { projectMotionPolicy } from './motion-policy'
import { createMotionFeatureRuntime, LazyMotion, MotionConfig } from './motion-feature-runtime'
const props = defineProps<{ readonly motion: EffectiveAppearanceState['motion'] }>()
const policy = computed(() => projectMotionPolicy(props.motion))
const { features, startAfterStableMount, dispose } = createMotionFeatureRuntime()
onMounted(() => {
  void startAfterStableMount()
})
onBeforeUnmount(dispose)
</script>
<template>
  <LazyMotion
    :features="features"
    strict
  >
    <MotionConfig
      :reduced-motion="policy.reducedMotion"
      :skip-animations="motion === 'none'"
    >
      <m.div
        :initial="motion === 'none' ? false : policy.themePicker.entering"
        :animate="policy.themePicker.visible"
        :transition="policy.themePicker.transition"
      >
        <slot />
      </m.div>
    </MotionConfig>
  </LazyMotion>
</template>
