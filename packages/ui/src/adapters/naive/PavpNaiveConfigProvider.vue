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
    .n-button .n-base-wave,
    .n-button .n-icon-slot,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio__label,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close
  ) {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion] .n-radio__dot::before {
  transition-duration: var(--ui-motion-duration);
  transition-timing-function: var(--ui-motion-easing);
}

html[data-motion] .n-button .n-icon-slot {
  transition-duration: var(--ui-motion-duration) !important;
  transition-timing-function: var(--ui-motion-easing) !important;
}

html[data-motion] .n-button .n-base-wave {
  animation-duration: var(--ui-motion-duration);
  animation-timing-function: var(--ui-motion-easing);
}

.n-button:focus-visible {
  box-shadow: var(--ui-admin-shadow-focus-ring);
}

@media (forced-colors: active) {
  .n-button:focus-visible,
  .n-radio-button--focus {
    outline: var(--ui-admin-border-focus);
    outline-offset: var(--ui-admin-focus-outline-offset);
  }
}

html[data-motion='reduced']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-button .n-base-wave,
    .n-button .n-icon-slot,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio__label,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close
  ) {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-radio__dot::before {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-button .n-icon-slot {
  transition-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='reduced'] .n-button .n-base-wave {
  animation-duration: calc(var(--ui-motion-duration) / 2) !important;
}

html[data-motion='none']
  :where(
    .n-button,
    .n-button__border,
    .n-button__state-border,
    .n-button .n-base-wave,
    .n-button .n-icon-slot,
    .n-breadcrumb-item,
    .n-breadcrumb-item .n-icon,
    .n-breadcrumb-item__link,
    .n-breadcrumb-item__separator,
    .n-descriptions-header,
    .n-descriptions-table-wrapper,
    .n-descriptions-table-row,
    .n-descriptions-table-header,
    .n-descriptions-table-content,
    .n-descriptions-table-content__content,
    .n-descriptions__label,
    .n-radio-group__splitor,
    .n-radio__dot,
    .n-radio__label,
    .n-radio-button,
    .n-radio-button__state-border,
    .n-tag,
    .n-tag__border,
    .n-tag__icon,
    .n-tag__close
  ) {
  animation: none !important;
  transition: none !important;
}

html[data-motion='none'] .n-radio__dot::before,
html[data-motion='none'] .n-button .n-icon-slot,
html[data-motion='none'] .n-button .n-base-wave {
  animation: none !important;
  transition: none !important;
}
</style>
