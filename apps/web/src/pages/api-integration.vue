<script setup lang="ts">
import ApiIntegrationDemo from '../app/workbench/api/ApiIntegrationDemo.vue'
import ApiFeaturePage from '../app/workbench/api/ApiFeaturePage.vue'
defineOptions({ name: 'ApiIntegrationPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ApiFeaturePage
    :title="title"
    :message="message"
    capability="integration"
  >
    <ApiIntegrationDemo />
  </ApiFeaturePage>
</template>
