<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m, type MotionProps } from 'motion-v'
import {
  computed,
  Fragment,
  h,
  onBeforeUnmount,
  onMounted,
  type HTMLAttributes,
  type VNodeChild,
  type VNodeProps,
} from 'vue'

import type { PavpMenuOption } from '../naive/naive-menu'
import {
  createAdminNavigationMotionFeatureRuntime,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
} from './admin-navigation-motion-runtime'

defineOptions({ name: 'AdminNavigationSelectionLens' })

const props = defineProps<{
  readonly isOwner: (option: PavpMenuOption) => boolean
  readonly motion: EffectiveAppearanceState['motion']
  readonly renderBaseIcon: (option: PavpMenuOption) => VNodeChild
}>()

defineSlots<{
  default: (props: {
    readonly featureReady: boolean
    readonly renderIcon: (option: PavpMenuOption) => VNodeChild
  }) => unknown
}>()

const selectionLensLayoutId = 'pavp-admin-navigation-selection-lens'
const selectionLensStyle = Object.freeze({
  zIndex: 'calc(var(--ui-z-base) - 1)',
})
const fullLayoutTransition = Object.freeze({
  layout: Object.freeze({
    bounce: 0.16,
    delay: 0,
    type: 'spring',
    visualDuration: 0.26,
  }),
})
const { dispose, featureReady, features, startAfterStableMount } =
  createAdminNavigationMotionFeatureRuntime()
const reducedMotion = computed(() => (props.motion === 'full' ? 'never' : 'always'))
const skipAnimations = computed(() => props.motion === 'none')

function renderSelectionLens(): VNodeChild {
  const lensProps = {
    'aria-hidden': 'true',
    class: ['pavp-admin-navigation-selection-lens', 'pavp-admin-navigation-selection-lens--full'],
    key: 'pavp-admin-navigation-selection-lens:full',
    style: selectionLensStyle,
  } satisfies MotionProps & HTMLAttributes & VNodeProps

  return h(m.div, {
    ...lensProps,
    initial: false,
    layoutId: selectionLensLayoutId,
    transition: fullLayoutTransition,
  })
}

function renderIcon(option: PavpMenuOption): VNodeChild {
  return h(Fragment, null, [
    featureReady.value && props.motion === 'full' && props.isOwner(option)
      ? renderSelectionLens()
      : null,
    props.renderBaseIcon(option),
  ])
}

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
      :reduced-motion="reducedMotion"
      :skip-animations="skipAnimations"
    >
      <LayoutGroup>
        <slot
          :feature-ready="featureReady"
          :render-icon="renderIcon"
        />
      </LayoutGroup>
    </MotionConfig>
  </LazyMotion>
</template>
