<script setup lang="ts">
import { computed } from 'vue'

import { PavpTagPrimitive } from '../adapters/naive/naive-tag'
import type { UiStatusTone } from './contracts'

defineOptions({ name: 'UiStatusBadge' })

const props = defineProps<{
  readonly label: string
  readonly tone: UiStatusTone
}>()

const toneClass = computed(() => `pavp-status-badge--${props.tone}`)
</script>

<template>
  <PavpTagPrimitive
    bordered
    :class="toneClass"
  >
    {{ label }}
  </PavpTagPrimitive>
</template>

<style scoped>
.pavp-status-badge--active,
.pavp-status-badge--complete {
  color: var(--ui-color-text-primary);
}

.pavp-status-badge--deferred,
.pavp-status-badge--inactive,
.pavp-status-badge--not-started {
  color: var(--ui-color-text-secondary);
}
</style>
