<script setup lang="ts">
import { computed, inject } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { runtimeUpdateKey } from '../config/runtime-update-context'
import { useConsoleI18n } from '../../shared/i18n'
import SettingsField from './SettingsField.vue'
const { t } = useConsoleI18n()
const runtimeUpdate = inject(runtimeUpdateKey)
const updateStatus = computed(() => runtimeUpdate?.status.value ?? 'idle')
const updateMessage = computed(() => {
  switch (updateStatus.value) {
    case 'checking':
      return t('shell.versionChecking')
    case 'current':
      return t('shell.versionCurrent')
    case 'available':
      return t('shell.releaseChanged')
    case 'unavailable':
      return t('shell.versionUnavailable')
    default:
      return t('shell.versionIdle')
  }
})
</script>
<template>
  <SettingsField
    v-if="runtimeUpdate"
    id="settings-version"
    :label="t('shell.versionLabel')"
  >
    <div class="flex flex-wrap items-center gap-content-gap">
      <NButton
        :loading="updateStatus === 'checking'"
        :disabled="updateStatus === 'checking'"
        @click="runtimeUpdate.check"
      >
        {{ t('shell.versionCheck') }}
      </NButton>
      <span
        role="status"
        class="text-caption text-text-secondary"
        v-text="updateMessage"
      />
    </div>
  </SettingsField>
</template>
