<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { NForm, NFormItem } from 'naive-ui/es/form'
import { NInput } from 'naive-ui/es/input'
import { NModal } from 'naive-ui/es/modal'
import { NSelect } from 'naive-ui/es/select'
import { computed, shallowRef, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from './access-boundary'
import {
  parseAccessRequestView,
  requestProposal,
  type AccessRequestInteractionHost,
} from './access-request-interaction'
import GuardedOperationButton from './GuardedOperationButton.vue'
import { observeNativeRequirement } from './native-requirement'
import { useAccessInteractionCopy } from './use-access-interaction-copy'
import { useResourceInteraction } from './resource-interaction'

const props = defineProps<{ readonly host: AccessRequestInteractionHost }>()
const show = defineModel<boolean>('show', { required: true })
const { t } = useConsoleI18n()
const copy = useAccessInteractionCopy()
const access = useAccessBoundary()
const scope = shallowRef<string | null>(null)
const reason = shallowRef('')
const { current, status, activity, operation, run } = useResourceInteraction(
  access,
  () => props.host,
  () => show.value,
  () => {
    show.value = false
  },
  parseAccessRequestView,
)
watch(
  show,
  () => {
    scope.value = null
    reason.value = ''
  },
  { flush: 'sync' },
)
const effective = shallowRef(false)
const expired = shallowRef(false)
watch(
  () => [current.value, props.host.effectiveRequirement] as const,
  ([view, requirement], _, onCleanup) => {
    effective.value = false
    expired.value = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let released = false
    function expire(): void {
      if (view?.expiresAt === undefined) return
      const delay = view.expiresAt - Date.now()
      if (delay <= 0) expired.value = true
      else timer = setTimeout(expire, Math.min(delay, 2_147_483_647))
    }
    expire()
    const checked =
      view?.status === 'effective' && requirement
        ? observeNativeRequirement(access, requirement, () => {
            effective.value = false
            queueMicrotask(() => {
              if (!released) void refresh()
            })
          })
        : undefined
    async function refresh(): Promise<void> {
      await checked?.evaluate()
      if (!released) effective.value = checked?.permit()?.isCurrent() === true
    }
    onCleanup(() => {
      released = true
      checked?.dispose()
      clearTimeout(timer)
    })
    if (checked) void refresh()
  },
  { flush: 'sync', immediate: true },
)
const displayed = computed(() =>
  expired.value
    ? 'expired'
    : current.value?.status === 'effective' && props.host.effectiveRequirement && !effective.value
      ? 'provisioning'
      : current.value?.status,
)
const busy = computed(() => activity.value === 'working')
const scopeOptions = computed(() =>
  props.host.scopes.map(({ id, label }) => ({ value: id, label })),
)
const canRequest = computed(
  () =>
    props.host.commands?.request !== undefined &&
    ['requestable', 'rejected', 'cancelled', 'expired', 'revoked'].some(
      (state) => state === displayed.value,
    ),
)
const request = computed(() => {
  const selectedScope = scope.value
  const selectedReason = reason.value
  return canRequest.value
    ? operation(
        'request',
        requestProposal(props.host, selectedScope, selectedReason),
        () => scope.value === selectedScope && reason.value === selectedReason,
      )
    : undefined
})
const commands = computed(() => {
  const declared = {
    cancel:
      displayed.value === 'pending' ||
      displayed.value === 'approved' ||
      displayed.value === 'provisioning',
    approve: displayed.value === 'pending',
    reject: displayed.value === 'pending',
    revoke: displayed.value === 'effective',
  }
  const order = ['cancel', 'reject', 'approve', 'revoke'] as const
  return order.flatMap((id) => {
    const selection = declared[id] ? operation(id, {}) : undefined
    return selection ? [{ id, selection }] : []
  })
})
</script>

<template>
  <NModal
    v-model:show="show"
    preset="card"
    to="#pavp-overlay-root"
    :title="t('accessInteraction.requestAccess')"
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
        {{ displayed ? `${host.label} · ${copy.status[displayed]}` : copy.read[status] }}
      </p>
      <p
        v-if="activity !== 'idle' && activity !== 'working'"
        class="m-0 text-caption"
        role="status"
      >
        {{ copy.activity[activity] }}
      </p>
      <NForm
        v-if="canRequest"
        :disabled="busy"
      >
        <NFormItem :label="t('accessInteraction.requestedScope')">
          <NSelect
            v-model:value="scope"
            :options="scopeOptions"
            :placeholder="t('accessInteraction.requestedScope')"
          />
        </NFormItem>
        <NFormItem :label="t('accessInteraction.reason')">
          <NInput
            v-model:value="reason"
            type="textarea"
            :maxlength="500"
            :placeholder="t('accessInteraction.reason')"
          />
        </NFormItem>
      </NForm>
      <div class="gap-control flex flex-wrap items-start justify-end">
        <NButton @click="show = false">
          {{ t('accessInteraction.close') }}
        </NButton>
        <GuardedOperationButton
          v-if="canRequest"
          type="primary"
          :selection="request"
          :disabled="busy"
          @activate="run(request)"
        >
          {{ t('accessInteraction.request') }}
        </GuardedOperationButton>
        <GuardedOperationButton
          v-for="command in commands"
          :key="command.id"
          :selection="command.selection"
          :disabled="busy"
          @activate="run(command.selection)"
        >
          {{ copy.command[command.id] }}
        </GuardedOperationButton>
      </div>
    </div>
  </NModal>
</template>
