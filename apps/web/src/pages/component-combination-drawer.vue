<script setup lang="ts">
import TablePlayground from '../app/workbench/tables/TablePlayground.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentCombinationDrawerPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="drawer"
  >
    <template #default="{ schema }">
      <TablePlayground :schema="schema" />
    </template>
  </TableExampleWorkbench>
</template>
