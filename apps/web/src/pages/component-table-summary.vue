<script setup lang="ts">
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentTableSummaryPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="summary"
  >
    <template #default="{ schema, updateConfiguration, updateSummaryRenderer }">
      <TableDataExample
        :schema="schema"
        summary-controls
        @configuration-change="updateConfiguration"
        @summary-renderer-change="updateSummaryRenderer"
      />
    </template>
  </TableExampleWorkbench>
</template>
