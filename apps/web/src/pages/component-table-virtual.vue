<script setup lang="ts">
import TableDataCapabilities from '../app/workbench/tables/TableDataCapabilities.vue'
defineOptions({ name: 'ComponentTableVirtualPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableDataCapabilities
    :title="title"
    :message="message"
    example="virtual"
  />
</template>
