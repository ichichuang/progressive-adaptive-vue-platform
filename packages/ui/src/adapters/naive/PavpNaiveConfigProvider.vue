<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import { NConfigProvider } from 'naive-ui/es/config-provider'
import { computed } from 'vue'

import { createPavpNaiveThemeProjection } from './pavp-naive-theme'

defineOptions({ name: 'PavpNaiveConfigProvider' })

const props = defineProps<{
  readonly appearance: Readonly<EffectiveAppearanceState>
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()

const projection = computed(() => createPavpNaiveThemeProjection(props.appearance))
</script>

<template>
  <NConfigProvider
    :theme="projection.theme"
    :theme-overrides="projection.themeOverrides"
  >
    <slot />
  </NConfigProvider>
</template>

<style>
html[data-motion]
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag
  ) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion='reduced']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag
  ) {
  transition-duration: calc(var(--ui-motion-duration) / 2);
}

html[data-motion='none']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag
  ) {
  transition: none;
}
</style>
