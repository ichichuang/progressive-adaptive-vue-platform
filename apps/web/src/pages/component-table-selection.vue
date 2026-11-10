<script setup lang="ts">
import TableSelectionExample from '../app/workbench/tables/TableSelectionExample.vue'
defineOptions({ name: 'ComponentTableSelectionPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableSelectionExample
    :title="title"
    :message="message"
  />
</template>
