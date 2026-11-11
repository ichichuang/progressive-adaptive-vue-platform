<script setup lang="ts">
import ApiOverview from '../app/workbench/api/ApiOverview.vue'
defineOptions({ name: 'ApiOverviewPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ApiOverview
    :title="title"
    :message="message"
  />
</template>
