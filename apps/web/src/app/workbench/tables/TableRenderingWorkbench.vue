<script setup lang="ts">
import { ref } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import TableDataCapabilities from './TableDataCapabilities.vue'
import TableInlineEditingExample from './TableInlineEditingExample.vue'
import { useConsoleI18n } from '../../../shared/i18n'
defineOptions({ name: 'TableRenderingWorkbench' })
defineProps<{ readonly title: string; readonly message: string; readonly breadcrumb?: string }>()
const { t } = useConsoleI18n()
const mode = ref('display')
const editing = ref(false)
function updateEditing(value: boolean): void {
  editing.value = value
}
</script>
<template>
  <component
    :is="mode === 'display' ? TableDataCapabilities : TableInlineEditingExample"
    :title="title"
    :message="message"
    example="rendering"
    v-on="mode === 'inline' ? { editing: updateEditing } : {}"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        :disabled="editing"
        :aria-label="t('tableInline.example')"
      >
        <NRadioButton value="display">
          {{ t('tableInline.display') }}
        </NRadioButton>
        <NRadioButton value="inline">
          {{ t('tableInline.edit') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
  </component>
</template>
