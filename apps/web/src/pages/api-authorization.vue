<script setup lang="ts">
import ApiRequestDemo from '../app/workbench/api/ApiRequestDemo.vue'
defineOptions({ name: 'ApiAuthorizationPage' })
defineProps<{ readonly title: string; readonly message: string }>()
</script>
<template>
  <ApiRequestDemo
    :title="title"
    :message="message"
    capability="authorization"
  />
</template>
