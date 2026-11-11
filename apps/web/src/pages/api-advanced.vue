<script setup lang="ts">
import ApiAdvancedDemo from '../app/workbench/api/ApiAdvancedDemo.vue'
import ApiFeaturePage from '../app/workbench/api/ApiFeaturePage.vue'
defineOptions({ name: 'ApiAdvancedPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ApiFeaturePage
    :title="title"
    :message="message"
    capability="advanced"
  >
    <ApiAdvancedDemo />
  </ApiFeaturePage>
</template>
