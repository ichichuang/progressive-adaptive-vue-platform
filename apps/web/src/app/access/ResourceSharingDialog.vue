<script setup lang="ts">
import { UiCopyAction } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { NForm, NFormItem } from 'naive-ui/es/form'
import { NModal } from 'naive-ui/es/modal'
import { NSelect } from 'naive-ui/es/select'
import { computed, shallowRef, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from './access-boundary'
import GuardedOperationButton from './GuardedOperationButton.vue'
import { useAccessInteractionCopy } from './use-access-interaction-copy'
import { useResourceInteraction } from './resource-interaction'
import {
  parseShareView,
  sharingMode,
  sharingProposal,
  type SharingHost,
  type SharingMode,
} from './resource-sharing'

const props = defineProps<{ readonly host: SharingHost }>()
const show = defineModel<boolean>('show', { required: true })
const { t } = useConsoleI18n()
const copy = useAccessInteractionCopy()
const mode = shallowRef<SharingMode | null>(null)
const scope = shallowRef<string | null>(null)
const recipients = shallowRef<string[]>([])
const expiresAt = shallowRef<number | null>(null)
const revealed = shallowRef(false)
const { current, status, activity, operation, run, isCurrent, replace } = useResourceInteraction(
  useAccessBoundary(),
  () => props.host,
  () => show.value,
  () => {
    show.value = false
  },
  (input) => parseShareView(input, props.host),
)
watch(
  show,
  () => {
    mode.value = null
    scope.value = null
    recipients.value = []
    expiresAt.value = null
  },
  { flush: 'sync' },
)
watch(
  current,
  (value, _, onCleanup) => {
    revealed.value = false
    let timer: ReturnType<typeof setTimeout> | undefined
    function schedule(): void {
      const deadline = value?.expiresAt
      if (deadline === undefined) return
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        if (value) replace(value, { revision: value.revision, status: 'expired' })
      } else timer = setTimeout(schedule, Math.min(remaining, 2_147_483_647))
    }
    schedule()
    onCleanup(() => {
      clearTimeout(timer)
    })
  },
  { flush: 'sync', immediate: true },
)
const modeOptions = computed(() =>
  props.host.modes.map((value) => ({ value, label: copy.value.mode[value] })),
)
const scopeOptions = computed(() =>
  props.host.scopes.map(({ id, label }) => ({ value: id, label })),
)
const memberOptions = computed(
  () => props.host.members?.map(({ id, label }) => ({ value: id, label })) ?? [],
)
const busy = computed(() => activity.value === 'working')
const destination = computed(() =>
  current.value && 'destination' in current.value ? current.value.destination : undefined,
)
const draft = computed(() => ({
  mode: mode.value,
  scope: scope.value,
  recipients: recipients.value,
  expiresAt: expiresAt.value,
}))
const save = computed(() => {
  const selected = draft.value
  return operation(
    'save',
    sharingProposal(props.host, selected),
    () => draft.value === selected && sharingProposal(props.host, selected) !== undefined,
  )
})
const revoke = computed(() =>
  current.value?.status === 'effective' ? operation('revoke', {}) : undefined,
)

function selectMode(value: unknown): void {
  mode.value = sharingMode.safeParse(value).data ?? null
  if (mode.value !== 'selected-members') recipients.value = []
}
function copyLease() {
  const view = current.value
  const target = destination.value
  if (!view || target?.kind !== 'host') return undefined
  return {
    value: target.url,
    isCurrent: () =>
      isCurrent(view) && destination.value === target && (view.expiresAt ?? Infinity) > Date.now(),
  }
}
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    to="#pavp-overlay-root"
    :title="t('accessInteraction.sharing')"
    class="w-full max-w-content"
    display-directive="if"
  >
    <div
      class="grid min-w-0 gap-content-gap"
      :aria-busy="busy"
    >
      <p
        class="m-0 break-words"
        role="status"
      >
        {{ current ? `${host.label} · ${copy.status[current.status]}` : copy.read[status] }}
      </p>
      <p
        v-if="activity !== 'idle' && activity !== 'working'"
        class="m-0 text-caption"
        role="status"
      >
        {{ copy.activity[activity] }}
      </p>
      <template v-if="current">
        <NForm
          v-if="host.commands?.save"
          :disabled="busy"
        >
          <NFormItem :label="t('accessInteraction.audience')">
            <NSelect
              :value="mode"
              :options="modeOptions"
              :placeholder="t('accessInteraction.audience')"
              @update:value="selectMode"
            />
          </NFormItem>
          <NFormItem :label="t('accessInteraction.readScope')">
            <NSelect
              v-model:value="scope"
              :options="scopeOptions"
              :placeholder="t('accessInteraction.readScope')"
            />
          </NFormItem>
          <NFormItem
            v-if="mode === 'selected-members'"
            :label="t('accessInteraction.recipients')"
          >
            <NSelect
              v-model:value="recipients"
              multiple
              :options="memberOptions"
              :placeholder="t('accessInteraction.recipients')"
            />
          </NFormItem>
          <NFormItem
            v-if="host.maxLifetimeMs !== undefined"
            :label="t('accessInteraction.expiry')"
          >
            <NDatePicker
              v-model:value="expiresAt"
              type="datetime"
              clearable
              class="w-full"
            />
          </NFormItem>
        </NForm>
        <p
          v-if="destination?.kind === 'simulation'"
          class="m-0 text-caption"
        >
          {{ t('accessInteraction.simulation') }} {{ destination.reference }}
        </p>
        <div
          v-if="destination?.kind === 'host'"
          class="flex flex-wrap items-center gap-content-gap"
        >
          <NButton @click="revealed = !revealed">
            {{ t(revealed ? 'accessInteraction.hide' : 'accessInteraction.reveal') }}
          </NButton>
          <UiCopyAction
            value=""
            :resolve-value="copyLease"
            variant="text"
            :label="t('accessInteraction.copy')"
            :copy-label="t('accessInteraction.copy')"
            :success-label="t('accessInteraction.copied')"
            :failure-label="t('accessInteraction.failed')"
          />
        </div>
        <p
          v-if="revealed && destination?.kind === 'host'"
          class="m-0 break-all text-caption"
        >
          {{ destination.url }}
        </p>
      </template>
      <div class="flex flex-wrap items-start justify-end gap-content-gap">
        <NButton @click="show = false">
          {{ t('accessInteraction.close') }}
        </NButton>
        <GuardedOperationButton
          v-if="revoke"
          :selection="revoke"
          :disabled="busy"
          @activate="run(revoke)"
        >
          {{ t('accessInteraction.revoke') }}
        </GuardedOperationButton>
        <GuardedOperationButton
          v-if="current && host.commands?.save"
          type="primary"
          :selection="save"
          :disabled="busy"
          @activate="run(save)"
        >
          {{ t('accessInteraction.save') }}
        </GuardedOperationButton>
      </div>
    </div>
  </NModal>
</template>
