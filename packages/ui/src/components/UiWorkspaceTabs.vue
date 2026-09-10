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
  readonly refreshLabel: string
  readonly closeLabel: string
  readonly panelId: string
  readonly motion: EffectiveAppearanceState['motion']
}>()
const emit = defineEmits<{
  activate: [id: string]
  close: [id: string]
  refresh: [id: string]
}>()
</script>

<template>
  <WorkspaceTabsSurface
    :items="items"
    :active-id="activeId"
    :label="label"
    :previous-label="previousLabel"
    :next-label="nextLabel"
    :refresh-label="refreshLabel"
    :close-label="closeLabel"
    :panel-id="panelId"
    :motion="motion"
    @activate="emit('activate', $event)"
    @close="emit('close', $event)"
    @refresh="emit('refresh', $event)"
  />
</template>
