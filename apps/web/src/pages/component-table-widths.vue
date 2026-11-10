<script setup lang="ts">
import TableLayoutExample from '../app/workbench/tables/TableLayoutExample.vue'
defineOptions({ name: 'ComponentTableWidthsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableLayoutExample
    :title="title"
    :message="message"
    example="widths"
  />
</template>
