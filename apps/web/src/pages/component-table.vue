<script setup lang="ts">
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentTablePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="basics"
  >
    <template #default="{ schema, height }">
      <TableDataExample
        :schema="schema"
        v-bind="height ? { height } : {}"
        demo-states
      />
    </template>
  </TableExampleWorkbench>
</template>
