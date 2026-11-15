<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m } from 'motion-v'
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { projectMotionPolicy } from './motion-policy'
import { createMotionFeatureRuntime, LazyMotion, MotionConfig } from './motion-feature-runtime'
const props = defineProps<{ readonly motion: EffectiveAppearanceState['motion'] }>()
// Reuse already-loaded motion on open; never start a usable panel hidden before motion is ready.
const { features, featureReady, startAfterStableMount, dispose } = createMotionFeatureRuntime(true)
const policy = computed(() => projectMotionPolicy(props.motion, featureReady.value))
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
      :skip-animations="policy.skipAnimations"
    >
      <m.div
        :initial="policy.skipAnimations ? false : policy.themePicker.entering"
        :animate="policy.themePicker.visible"
        :transition="policy.themePicker.transition"
      >
        <slot />
      </m.div>
    </MotionConfig>
  </LazyMotion>
</template>
