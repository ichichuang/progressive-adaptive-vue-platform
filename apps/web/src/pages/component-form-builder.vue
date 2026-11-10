<script setup lang="ts">
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import FormVisualBuilder from '../app/workbench/forms/builder/FormVisualBuilder.vue'
defineOptions({ name: 'ComponentFormBuilderPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
  >
    <FormVisualBuilder />
  </WorkbenchPage>
</template>
