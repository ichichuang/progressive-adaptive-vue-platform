<script setup lang="ts">
import {
  computed,
  onMounted,
  onActivated,
  onDeactivated,
  onScopeDispose,
  provide,
  ref,
  shallowRef,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NModal } from 'naive-ui/es/modal'
import { compiledBuildIdentity, type CompiledBuildIdentity } from '../config/runtime-configuration'
import { createRuntimeUpdateMonitor } from '../config/runtime-update-monitor'
import { useRuntimeUpdateReload } from '../config/use-runtime-update-reload'
import { provideWorkspaceUnsavedChanges } from '../workspace/workspace-unsaved-changes'
import { workspaceInstanceKey } from '../workspace/workspace-content'
import type {
  LiveWorkspaceEntry,
  WorkspaceIdentity,
  WorkspaceInstanceIdentity,
} from '../workspace/workspace.store'
import { registeredRouteDestination } from '../router/route-input'
import { useConsoleI18n } from '../../shared/i18n'
import SettingsField from './SettingsField.vue'
import RuntimeVersionDraft from './RuntimeVersionDraft.vue'

const { t } = useConsoleI18n()
let changedResponse = true
const draft = ref('')
const status = ref<
  'idle' | 'checking' | 'current' | 'available' | 'unavailable' | 'applied' | 'later'
>('idle')
const statusMessages = computed(() => ({
  idle: t('shell.versionDemoStatus.idle'),
  checking: t('shell.versionDemoStatus.checking'),
  current: t('shell.versionDemoStatus.current'),
  available: t('shell.versionDemoStatus.available'),
  unavailable: t('shell.versionDemoStatus.unavailable'),
  applied: t('shell.versionDemoStatus.applied'),
  later: t('shell.versionDemoStatus.later'),
}))
const candidate = shallowRef<CompiledBuildIdentity | null>(null)
// Isolated example workspace. Never registered in the real workspace and never persisted.
const entry: LiveWorkspaceEntry = {
  identity: 'version-example' as WorkspaceIdentity,
  instance: Symbol('version-example') as WorkspaceInstanceIdentity,
  state: 'live',
  componentName: 'RuntimeVersionDraft',
  destination: registeredRouteDestination({ name: 'workbench-welcome' }),
}
provide(workspaceInstanceKey, entry.instance)
const guard = provideWorkspaceUnsavedChanges(
  { entries: [entry], canDiscard: () => true },
  { protectDocument: false },
)
const { reloadConfirmation } = guard
let monitor: ReturnType<typeof createRuntimeUpdateMonitor> | undefined
const { reload, busy } = useRuntimeUpdateReload({
  candidate: () => candidate.value,
  requestReload: guard.requestReload,
  reloadDocument: () => {
    // The real guarded reload flow ends here; only this disposable draft is reset.
    draft.value = ''
    monitor?.dismiss()
    status.value = 'applied'
  },
})
function dispose(): void {
  monitor?.dispose()
  monitor = undefined
  reloadConfirmation.value?.cancel()
  candidate.value = null
  draft.value = ''
  status.value = 'idle'
}
function start(): void {
  dispose()
  // The monitor receives a local response, not a global fetch override or deployment change.
  monitor = createRuntimeUpdateMonitor({
    document,
    window,
    automatic: false,
    fetch: () =>
      Promise.resolve(
        Response.json({
          schemaVersion: 2,
          environment: compiledBuildIdentity.environment,
          deploymentBase: import.meta.env.BASE_URL,
          releaseSha: changedResponse
            ? compiledBuildIdentity.releaseSha === 'a'.repeat(40)
              ? 'b'.repeat(40)
              : 'a'.repeat(40)
            : compiledBuildIdentity.releaseSha,
          buildVersion: compiledBuildIdentity.buildVersion,
          api: { status: 'unconfigured' },
        }),
      ),
    onStatus: (value) => {
      status.value = value
    },
    onCandidate: (value) => {
      candidate.value = value
    },
  })
}
function check(changed: boolean): void {
  changedResponse = changed
  void monitor?.check()
}
function later(): void {
  monitor?.dismiss()
  status.value = 'later'
}
onMounted(start)
onActivated(() => {
  if (!monitor) start()
})
onDeactivated(dispose)
onScopeDispose(dispose)
</script>
<template>
  <SettingsField
    id="settings-version-example"
    class="wb-settings-choice-field"
    :label="t('shell.versionDemoTitle')"
  >
    <div class="grid min-w-0 gap-content-gap">
      <span class="text-caption text-text-secondary">{{ t('shell.versionDemoDescription') }}</span>
      <RuntimeVersionDraft v-model="draft" />
      <div class="grid min-w-0 text-caption text-text-secondary">
        <span
          v-for="(message, key) in statusMessages"
          :key="key"
          aria-hidden="true"
          class="col-start-1 row-start-1 invisible"
          v-text="message"
        />
        <span
          role="status"
          class="col-start-1 row-start-1"
          v-text="statusMessages[status]"
        />
      </div>
      <div class="flex flex-wrap items-center gap-content-gap">
        <NButton
          :loading="status === 'checking'"
          :disabled="busy"
          @click="check(true)"
        >
          {{ t('shell.versionDemoCheck') }}
        </NButton>
        <NButton
          :disabled="busy || status === 'checking'"
          @click="check(false)"
        >
          {{ t('shell.versionDemoSame') }}
        </NButton>
        <NButton
          :disabled="!candidate || busy"
          @click="later"
        >
          {{ t('shell.versionDemoLater') }}
        </NButton>
        <NButton
          type="primary"
          :disabled="!candidate"
          :loading="busy"
          @click="reload"
        >
          {{ t('shell.versionDemoApply') }}
        </NButton>
        <NButton
          :disabled="busy"
          @click="start"
        >
          {{ t('shell.versionDemoReset') }}
        </NButton>
      </div>
    </div>
  </SettingsField>
  <NModal
    :show="Boolean(reloadConfirmation)"
    to="#pavp-overlay-root"
    preset="dialog"
    type="warning"
    :title="t('shell.versionDemoConfirmTitle')"
    :content="t('shell.versionDemoConfirmContent')"
    :positive-text="t('shell.versionDemoConfirm')"
    :negative-text="t('shell.unsavedChangesCancel')"
    @positive-click="reloadConfirmation?.accept()"
    @negative-click="reloadConfirmation?.cancel()"
    @update:show="!$event && reloadConfirmation?.cancel()"
  />
</template>
