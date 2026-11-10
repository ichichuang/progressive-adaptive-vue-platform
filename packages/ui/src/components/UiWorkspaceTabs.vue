<script setup lang="ts">
import type { EffectiveAppearanceState } from '@platform/design-system'
import WorkspaceTabsSurface from '../adapters/motion/WorkspaceTabsSurface.vue'
import type { UiWorkspaceTab } from './contracts'

defineOptions({ name: 'UiWorkspaceTabs' })
const props = defineProps<{
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
  viewport: [element: HTMLElement | null]
}>()
</script>

<template>
  <WorkspaceTabsSurface
    v-bind="props"
    @viewport="emit('viewport', $event)"
    @activate="emit('activate', $event)"
    @close="emit('close', $event)"
    @refresh="emit('refresh', $event)"
  />
</template>
