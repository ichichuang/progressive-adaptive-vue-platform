<script setup lang="ts">
import TableTreeExample from '../app/workbench/tables/TableTreeExample.vue'
defineOptions({ name: 'ComponentTableTreePage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <TableTreeExample
    :title="title"
    :message="message"
  />
</template>
