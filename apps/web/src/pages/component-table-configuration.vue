<script setup lang="ts">
import TableDataExample from '../app/workbench/tables/TableDataExample.vue'
import TableExampleWorkbench from '../app/workbench/tables/TableExampleWorkbench.vue'
defineOptions({ name: 'ComponentTableConfigurationPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableExampleWorkbench
    :title="title"
    :message="message"
    example="configuration"
  >
    <template #default="{ schema, updateConfiguration }">
      <TableDataExample
        :schema="schema"
        @configuration-change="updateConfiguration"
      />
    </template>
  </TableExampleWorkbench>
</template>
