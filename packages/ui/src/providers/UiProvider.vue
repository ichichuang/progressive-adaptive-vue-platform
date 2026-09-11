<script setup lang="ts">
import type { UiLocale } from '../components/contracts'
import type { UiAppearanceSnapshot } from '@platform/design-system'

import PavpNaiveConfigProvider from '../adapters/naive/PavpNaiveConfigProvider.vue'

defineOptions({ name: 'UiProvider' })

defineProps<{
  readonly appearance: UiAppearanceSnapshot
  readonly locale: UiLocale
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()
</script>

<template>
  <div id="pavp-overlay-root" />
  <PavpNaiveConfigProvider
    :appearance="appearance"
    :locale="locale"
  >
    <slot />
  </PavpNaiveConfigProvider>
</template>
