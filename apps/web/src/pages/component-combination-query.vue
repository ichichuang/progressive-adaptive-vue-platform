<script setup lang="ts">
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import QueryTableExample from '../app/workbench/tables/QueryTableExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentCombinationQueryPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="query"
  >
    <template #default="{ schema }">
      <TableDataExample :schema="schema">
        <template #query="{ table }">
          <QueryTableExample :table="table" />
        </template>
      </TableDataExample>
    </template>
  </TableExampleWorkbench>
</template>
