<script setup lang="ts">
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentTableRemotePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="remote"
  >
    <template #default="{ schema }">
      <TableDataExample :schema="schema" />
    </template>
  </TableExampleWorkbench>
</template>
