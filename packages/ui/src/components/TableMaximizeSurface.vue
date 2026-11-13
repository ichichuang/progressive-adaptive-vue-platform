<script setup lang="ts">
import { inject, onDeactivated, ref } from 'vue'
import { NModal } from 'naive-ui/es/modal'
import { NCard } from 'naive-ui/es/card'
import { NButton } from 'naive-ui/es/button'
import { pavpOverlayTargetKey } from '../adapters/naive/pavp-naive-runtime-context'

/** Move one live table, rather than creating a second controller or losing its slots. */
const props = defineProps<{
  readonly expanded: boolean
  readonly label: string
  readonly restoreLabel: string
}>()
const emit = defineEmits<{ 'update:expanded': [value: boolean]; settled: [] }>()
const target = ref<HTMLElement>()
const overlayTarget = inject(pavpOverlayTargetKey, '#pavp-overlay-root')
function close(): void {
  emit('update:expanded', false)
}
onDeactivated(close)
</script>

<template>
  <NModal
    :show="expanded"
    :to="overlayTarget"
    :mask-closable="false"
    @after-enter="emit('settled')"
    @after-leave="emit('settled')"
    @update:show="emit('update:expanded', $event)"
  >
    <NCard
      class="pavp-table-maximize-surface"
      :title="label"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      content-class="flex flex-1 min-h-0 min-w-0 flex-col"
    >
      <template #header-extra>
        <NButton
          quaternary
          :aria-label="restoreLabel"
          :title="restoreLabel"
          @click="close"
        >
          <span
            class="size-icon i-lucide-minimize-2"
            aria-hidden="true"
          />
        </NButton>
      </template>
      <div
        ref="target"
        class="flex flex-1 flex-col min-h-0 min-w-0"
      />
    </NCard>
  </NModal>
  <Teleport
    :to="target ?? overlayTarget"
    :disabled="!props.expanded || !target"
  >
    <slot />
  </Teleport>
</template>

<style scoped>
@layer vendor-overrides {
  .pavp-table-maximize-surface {
    width: calc(100vw - 2 * var(--ui-space-page-inline)) !important;
    height: calc(100dvh - 2 * var(--ui-space-page-inline));
    margin: var(--ui-space-page-inline);
  }
}
</style>
