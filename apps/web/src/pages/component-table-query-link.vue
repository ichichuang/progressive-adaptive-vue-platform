<script setup lang="ts">
import TableQueryLinkExample from '../app/workbench/tables/TableQueryLinkExample.vue'
import type { ValidatedRouteInput } from '../app/router/route-input'
defineOptions({ name: 'ComponentTableQueryLinkPage' })
defineProps<{
  readonly title: string
  readonly message: string
  readonly routeInput: ValidatedRouteInput<'component-table-query-link'>
}>()
</script>
<template>
  <TableQueryLinkExample
    :title="title"
    :message="message"
    :route-input="routeInput"
  />
</template>
