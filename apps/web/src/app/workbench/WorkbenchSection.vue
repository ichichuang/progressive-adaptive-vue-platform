<script setup lang="ts">
import { NCard } from 'naive-ui/es/card'
import { UiSection } from '@platform/ui'

defineProps<{ readonly title: string; readonly description?: string }>()
defineSlots<{ default: () => unknown }>()
</script>

<template>
  <NCard
    :bordered="false"
    class="min-w-0 shadow-panel"
  >
    <UiSection
      class="min-w-0"
      :title="title"
      :description="description ?? ''"
      :aria-label="title"
    >
      <slot />
    </UiSection>
  </NCard>
</template>
