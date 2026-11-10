<script setup lang="ts">
import { onBeforeUnmount, onDeactivated, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { useLoadingBar } from 'naive-ui/es/loading-bar'
import { useMessage } from 'naive-ui/es/message'
import { useModal } from 'naive-ui/es/modal'
import { useNotification } from 'naive-ui/es/notification'
import { useConsoleI18n } from '../../shared/i18n'
import ComponentSpecimen from './ComponentSpecimen.vue'

const { t } = useConsoleI18n()
const loading = useLoadingBar()
const message = useMessage()
const modal = useModal()
const notification = useNotification()
const loadingActive = ref(false)

function startLoading(): void {
  loading.start()
  loadingActive.value = true
}
function finishLoading(): void {
  loading.finish()
  loadingActive.value = false
}
function closeFeedback(): void {
  message.destroyAll()
  modal.destroyAll()
  notification.destroyAll()
  loading.finish()
  loadingActive.value = false
}
onDeactivated(closeFeedback)
onBeforeUnmount(closeFeedback)
</script>

<template>
  <ComponentSpecimen name="NMessageProvider">
    <NButton @click="message.success(t('showcase.operationSuccess'))">
      {{ t('showcase.showMessage') }}
    </NButton>
  </ComponentSpecimen>
  <ComponentSpecimen name="NNotificationProvider">
    <NButton
      @click="
        notification.info({
          title: t('showcase.notificationTitle'),
          content: t('showcase.notificationBody'),
        })
      "
    >
      {{ t('showcase.showNotification') }}
    </NButton>
  </ComponentSpecimen>
  <ComponentSpecimen name="NModalProvider">
    <NButton
      @click="
        modal.create({
          preset: 'card',
          class: 'wb-provider-modal',
          title: t('showcase.dialogTitle'),
          content: t('showcase.dialogBody'),
        })
      "
    >
      {{ t('showcase.openDialog') }}
    </NButton>
  </ComponentSpecimen>
  <ComponentSpecimen
    name="NLoadingBarProvider"
    span="wide"
  >
    <NButton @click="startLoading">
      {{ t('showcase.loadingStart') }}
    </NButton>
    <NButton @click="finishLoading">
      {{ t('showcase.loadingFinish') }}
    </NButton>
    <span class="text-text-secondary">{{
      t(loadingActive ? 'showcase.loadingAtTop' : 'showcase.loadingReady')
    }}</span>
  </ComponentSpecimen>
</template>
