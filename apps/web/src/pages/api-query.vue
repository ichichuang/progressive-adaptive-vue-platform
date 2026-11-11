<script setup lang="ts">
import ApiQueryDemo from '../app/workbench/api/ApiQueryDemo.vue'
import ApiFeaturePage from '../app/workbench/api/ApiFeaturePage.vue'
defineOptions({ name: 'ApiQueryPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ApiFeaturePage
    :title="title"
    :message="message"
    capability="query"
  >
    <ApiQueryDemo />
  </ApiFeaturePage>
</template>
