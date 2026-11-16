<script setup lang="ts">
import { inject, onScopeDispose, ref, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { MessageProviderInst, MessageReactive } from 'naive-ui/es/message'
import { runtimeUpdateKey } from '../config/runtime-update-context'
import { useConsoleI18n } from '../../shared/i18n'
import SettingsField from './SettingsField.vue'
const { t } = useConsoleI18n()
const props = defineProps<{ readonly messages: MessageProviderInst | undefined }>()
const runtimeUpdate = inject(runtimeUpdateKey)
const checking = ref(false)
let pendingTimer: ReturnType<typeof setTimeout> | undefined
let pendingMessage: MessageReactive | undefined
let disposed = false
function clearPending(): void {
  clearTimeout(pendingTimer)
  pendingMessage?.destroy()
  pendingMessage = undefined
}
onScopeDispose(() => {
  disposed = true
  clearPending()
})

async function checkVersion(): Promise<void> {
  if (!runtimeUpdate || checking.value) return
  checking.value = true
  pendingTimer = setTimeout(() => {
    pendingMessage = props.messages?.info(t('shell.versionChecking'), { duration: 0 })
  }, 350)
  let outcome: Awaited<ReturnType<typeof runtimeUpdate.check>>
  try {
    outcome = await runtimeUpdate.check()
  } finally {
    clearPending()
    checking.value = false
  }
  if (disposed) return
  switch (outcome) {
    case 'current':
      props.messages?.success(t('shell.versionCurrent'))
      break
    case 'available':
      props.messages?.info(t('shell.releaseChanged'))
      break
    case 'unavailable':
      props.messages?.warning(t('shell.versionUnavailable'))
      break
  }
}
</script>
<template>
  <SettingsField
    v-if="runtimeUpdate"
    id="settings-version"
    choice
    :label="t('shell.versionLabel')"
  >
    <NButton
      class="min-h-target-enhanced"
      data-settings-control
      v-bind="
        (checking
          ? { 'aria-busy': true, 'aria-disabled': true }
          : { 'aria-busy': false, 'aria-disabled': false }) satisfies HTMLAttributes
      "
      @click="checkVersion"
    >
      {{ t('shell.versionCheck') }}
    </NButton>
  </SettingsField>
</template>
