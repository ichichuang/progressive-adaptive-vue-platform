<script setup lang="ts">
import { ref } from 'vue'
import { UiDisplayStage, type UiDisplayRatio, type UiDisplayStageSize } from '@platform/ui'
import DisplayLayoutPreview from '../app/workbench/layout/DisplayLayoutPreview.vue'
import DisplayOperationsBoard from '../app/workbench/layout/DisplayOperationsBoard.vue'

defineOptions({ name: 'LayoutPreviewFixedDisplayPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const ratio = ref<UiDisplayRatio>({ width: 16, height: 9 })
const stageSize = ref<UiDisplayStageSize>({ width: 0, height: 0 })
</script>
<template>
  <DisplayLayoutPreview
    v-model:ratio="ratio"
    :title="title"
    :message="message"
    fixed
  >
    <template #default>
      <UiDisplayStage
        :ratio="ratio"
        :label="title"
        @resize="stageSize = $event"
      >
        <DisplayOperationsBoard :stage-size="stageSize" />
      </UiDisplayStage>
    </template>
  </DisplayLayoutPreview>
</template>
