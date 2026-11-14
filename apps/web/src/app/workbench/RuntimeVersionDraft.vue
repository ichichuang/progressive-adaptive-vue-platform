<script setup lang="ts">
import { NInput } from 'naive-ui/es/input'
import { useWorkspaceUnsavedChanges } from '../workspace/use-workspace-unsaved-changes'
import { useConsoleI18n } from '../../shared/i18n'
const value = defineModel<string>({ required: true })
const { t } = useConsoleI18n()
useWorkspaceUnsavedChanges(() => value.value.length > 0, value)
</script>
<template>
  <NInput
    v-model:value="value"
    :placeholder="t('shell.versionDemoDraftPlaceholder')"
    :input-props="{ 'aria-label': t('shell.versionDemoDraft') }"
  />
</template>
