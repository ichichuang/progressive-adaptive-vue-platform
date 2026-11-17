<script setup lang="ts">
import { NModal } from 'naive-ui/es/modal'
import { useConsoleI18n } from '../../shared/i18n'

defineProps<{ readonly show: boolean; readonly verifying: boolean }>()
const emit = defineEmits<{ accept: []; cancel: [] }>()
const { t } = useConsoleI18n()

function accept(): false {
  emit('accept')
  // The prompt owner closes the modal when the asynchronous host verification settles.
  return false
}
</script>

<template>
  <NModal
    :show="show"
    preset="dialog"
    to="#pavp-overlay-root"
    :title="t('accessInteraction.assurance')"
    :content="t('accessInteraction.assuranceDescription')"
    :positive-text="t('accessInteraction.verify')"
    :negative-text="t('accessInteraction.cancel')"
    :loading="verifying"
    @positive-click="accept"
    @negative-click="emit('cancel')"
    @update:show="!$event && emit('cancel')"
  />
</template>
