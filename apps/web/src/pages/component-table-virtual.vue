<script setup lang="ts">
import { ref } from 'vue'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { useTableShowcase } from '../app/workbench/tables/table-showcase'
import TableDataCapabilities from '../app/workbench/tables/TableDataCapabilities.vue'
const continuous = ref(false)
const { t } = useTableShowcase()
defineOptions({ name: 'ComponentTableVirtualPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableDataCapabilities
    :key="String(continuous)"
    :continuous="continuous"
    :title="title"
    :message="message"
    example="virtual"
  >
    <template #controls>
      <NCheckbox v-model:checked="continuous">
        {{ t('tableShowcase.continuous') }}
      </NCheckbox>
    </template>
  </TableDataCapabilities>
</template>
