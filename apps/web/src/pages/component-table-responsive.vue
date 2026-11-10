<script setup lang="ts">
import TableLayoutExample from '../app/workbench/tables/TableLayoutExample.vue'
defineOptions({ name: 'ComponentTableResponsivePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableLayoutExample
    :title="title"
    :message="message"
    example="responsive"
  />
</template>
