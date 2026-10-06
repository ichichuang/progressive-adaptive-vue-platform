<script setup lang="ts">
import { computed } from 'vue'

import { NTag, type TagProps } from 'naive-ui/es/tag'
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
const toneColor = computed<NonNullable<TagProps['color']>>(() => {
  if (props.tone === 'complete') {
    return completeColor
  }

  return {
    textColor:
      props.tone === 'active' ? 'var(--ui-color-text-primary)' : 'var(--ui-color-text-secondary)',
  }
})
</script>

<template>
  <NTag
    bordered
    :color="toneColor"
    :class="toneClass"
  >
    {{ label }}
  </NTag>
</template>
