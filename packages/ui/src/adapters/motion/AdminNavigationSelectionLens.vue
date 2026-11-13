<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { m, type MotionProps } from 'motion-v'
import {
  computed,
  Fragment,
  h,
  onBeforeUnmount,
  onMounted,
  watch,
  type FunctionalComponent,
  type HTMLAttributes,
  type VNodeChild,
  type VNodeProps,
} from 'vue'

import { projectMotionPolicy } from './motion-policy'

import type { MenuOption } from 'naive-ui/es/menu'
import {
  createMotionFeatureRuntime,
  createMotionInterruptionOwner,
  LayoutGroup,
  LazyMotion,
  MotionConfig,
} from './motion-feature-runtime'

defineOptions({ name: 'AdminNavigationSelectionLens' })

const props = defineProps<{
  readonly isOwner: (option: MenuOption) => boolean
  readonly collapsed: boolean
  readonly motion: EffectiveAppearanceState['motion']
  readonly renderBaseIcon: (option: MenuOption) => VNodeChild
}>()

defineSlots<{
  default: (props: {
    readonly featureReady: boolean
    readonly renderExpandedIcon: (option: MenuOption) => VNodeChild
    readonly renderIcon: (option: MenuOption) => VNodeChild
  }) => unknown
}>()

const selectionLensLayoutId = 'pavp-admin-navigation-selection-lens'
const selectionLensStyle = Object.freeze({
  zIndex: 'calc(var(--ui-z-base) - 1)',
})
const { dispose, featureReady, features, startAfterStableMount } = createMotionFeatureRuntime()
const policy = computed(() => projectMotionPolicy(props.motion, featureReady.value))
const navigationTransition = projectMotionPolicy('full').navigationTransition
const interruption = createMotionInterruptionOwner(() => policy.value)
watch(
  () => props.motion,
  () => {
    interruption.settle(policy.value)
  },
  { flush: 'sync' },
)

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
    transition: navigationTransition,
    ref: (element: unknown) => {
      interruption.bind('selection', element)
    },
  })
}

// Isolate selection reads from Naive Menu's parent render effect.
const SelectionIcon: FunctionalComponent<{ option: MenuOption; expanded: boolean }> = ({
  option,
  expanded,
}) =>
  h(Fragment, null, [
    (!expanded || !props.collapsed) && policy.value.movement && props.isOwner(option)
      ? renderSelectionLens()
      : null,
    props.renderBaseIcon(option),
  ])

function renderIcon(option: MenuOption): VNodeChild {
  return h(SelectionIcon, { option, expanded: false })
}
function renderExpandedIcon(option: MenuOption): VNodeChild {
  return h(SelectionIcon, { option, expanded: true })
}

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
      <LayoutGroup>
        <slot
          :feature-ready="featureReady"
          :render-icon="renderIcon"
          :render-expanded-icon="renderExpandedIcon"
        />
      </LayoutGroup>
    </MotionConfig>
  </LazyMotion>
</template>
