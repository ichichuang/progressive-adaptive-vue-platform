<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import WorkspaceTabsSurface from '../adapters/motion/WorkspaceTabsSurface.vue'
import type { UiWorkspaceTab } from './contracts'

defineOptions({ name: 'UiWorkspaceTabs' })
defineProps<{
  readonly items: readonly UiWorkspaceTab[]
  readonly activeId: string | null
  readonly label: string
  readonly previousLabel: string
  readonly nextLabel: string
  readonly panelId: string
  readonly motion: EffectiveAppearanceState['motion']
}>()
const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
}>()
</script>

<template>
  <WorkspaceTabsSurface
    :items="items"
    :active-id="activeId"
    :label="label"
    :previous-label="previousLabel"
    :next-label="nextLabel"
    :panel-id="panelId"
    :motion="motion"
    @activate="emit('activate', $event)"
    @close="emit('close', $event)"
  />
</template>
