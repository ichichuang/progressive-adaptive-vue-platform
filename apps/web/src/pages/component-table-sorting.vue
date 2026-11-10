<script setup lang="ts">
import { computed, ref } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NSelect } from 'naive-ui/es/select'
import TableDataCapabilities from '../app/workbench/tables/TableDataCapabilities.vue'
import { useConsoleI18n } from '../shared/i18n'
defineOptions({ name: 'ComponentTableSortingPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const mode = ref<'submit' | 'change'>('submit')
const debounce = ref(250)
const options = computed(() =>
  [0, 250, 700].map((value) => ({ value, label: `${String(value)} ms` })),
)
</script>
<template>
  <TableDataCapabilities
    :key="`${mode}-${String(debounce)}`"
    :title="title"
    :message="message"
    example="sorting"
    :query-mode="mode"
    :debounce="debounce"
  >
    <template #controls>
      <NRadioGroup
        v-model:value="mode"
        name="table-query-mode"
        :aria-label="t('tableCapabilities.data.queryMode')"
      >
        <NRadioButton value="submit">
          {{ t('tableCapabilities.data.submitMode') }}
        </NRadioButton>
        <NRadioButton value="change">
          {{ t('tableCapabilities.data.changeMode') }}
        </NRadioButton>
      </NRadioGroup>
      <div
        v-if="mode === 'change'"
        class="flex items-center gap-component-unit"
      >
        <span class="shrink-0 text-caption text-text-secondary">{{
          t('tableCapabilities.data.debounce')
        }}</span>
        <NSelect
          v-model:value="debounce"
          :options="options"
          :aria-label="t('tableCapabilities.data.debounce')"
        />
      </div>
    </template>
  </TableDataCapabilities>
</template>
