<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'

import PavpNaiveConfigProvider from '../adapters/naive/PavpNaiveConfigProvider.vue'

defineOptions({ name: 'UiProvider' })

defineProps<{
  readonly appearance: EffectiveAppearanceState
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()
</script>

<template>
  <div id="pavp-overlay-root" />
  <PavpNaiveConfigProvider :appearance="appearance">
    <slot />
  </PavpNaiveConfigProvider>
</template>
