<script setup lang="ts">
import { NModal } from 'naive-ui/es/modal'
import { useConsoleI18n } from '../../shared/i18n'

defineProps<{
  readonly action: 'refresh' | 'close'
  readonly workspaceName: string
  readonly accept: () => void
  readonly cancel: () => void
}>()
const { t } = useConsoleI18n()
</script>

<template>
  <NModal
    class="pavp-workspace-discard-dialog"
    :show="true"
    to="#pavp-overlay-root"
    preset="dialog"
    type="warning"
    :title="`${t('shell.unsavedChangesTitle')} · ${workspaceName}`"
    :content="t(action === 'refresh' ? 'shell.unsavedChangesRefresh' : 'shell.unsavedChangesClose')"
    :positive-text="t('shell.unsavedChangesDiscard')"
    :negative-text="t('shell.unsavedChangesCancel')"
    @positive-click="accept"
    @negative-click="cancel"
    @close="cancel"
    @esc="cancel"
    @mask-click="cancel"
    @update:show="!$event && cancel()"
  />
</template>

<style>
.pavp-workspace-discard-dialog.pavp-workspace-discard-dialog {
  width: min(
    calc(100vw - 2 * var(--ui-space-page-inline)),
    calc(2 * var(--ui-layout-admin-drawer-maximum-inline-size))
  );
  max-width: calc(100vw - 2 * var(--ui-space-page-inline));
}
</style>
