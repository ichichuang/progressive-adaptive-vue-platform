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
const completeColor = Object.freeze({
  color: 'var(--ui-color-status-success)',
  textColor: 'var(--ui-color-text-on-status-success)',
  borderColor: 'var(--ui-color-status-success)',
})
</script>

<template>
  <PavpTagPrimitive
    bordered
    v-bind="tone === 'complete' ? { color: completeColor } : {}"
    :class="toneClass"
  >
    {{ label }}
  </PavpTagPrimitive>
</template>

<style scoped>
.pavp-status-badge--active {
  color: var(--ui-color-text-primary);
}

.pavp-status-badge--deferred,
.pavp-status-badge--inactive,
.pavp-status-badge--not-started {
  color: var(--ui-color-text-secondary);
}
</style>
