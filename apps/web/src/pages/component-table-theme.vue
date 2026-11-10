<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UiTableAppearance } from '@platform/ui'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
import { useTableShowcase } from '../app/workbench/tables/table-showcase'

defineOptions({ name: 'ComponentTableThemePage' })
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useTableShowcase()
const headerTone = ref<NonNullable<UiTableAppearance['headerTone']>>('soft')
const appearance = computed<UiTableAppearance>(() => ({ headerTone: headerTone.value }))
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="theme"
    :appearance="appearance"
  >
    <template #controls>
      <div class="grid gap-component-unit">
        <span class="text-caption text-text-secondary">{{ t('tableExamples.theme.header') }}</span>
        <NRadioGroup
          v-model:value="headerTone"
          name="table-header-tone"
          :aria-label="t('tableExamples.theme.header')"
        >
          <NRadioButton value="neutral">
            {{ t('tableExamples.theme.neutral') }}
          </NRadioButton>
          <NRadioButton value="soft">
            {{ t('tableExamples.theme.soft') }}
          </NRadioButton>
          <NRadioButton value="solid">
            {{ t('tableExamples.theme.solid') }}
          </NRadioButton>
        </NRadioGroup>
      </div>
    </template>
    <template #default="{ schema, height }">
      <TableDataExample
        :schema="schema"
        :appearance="appearance"
        v-bind="height ? { height } : {}"
      />
    </template>
  </TableExampleWorkbench>
</template>
