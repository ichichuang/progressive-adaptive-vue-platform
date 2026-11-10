<script setup lang="ts">
import { ref } from 'vue'
import FormBasicControls from '../app/workbench/forms/FormBasicControls.vue'
defineOptions({ name: 'ComponentFormBasicsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const source = ref<'code' | 'json'>('code')
</script>
<template>
  <FormBasicControls
    :key="source"
    :title="title"
    :message="message"
    :source="source"
    @source="source = $event"
  />
</template>
