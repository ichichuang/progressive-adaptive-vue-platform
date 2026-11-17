<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from './access-boundary'
import { executeDelegationChange } from './delegation-interaction'
import { useActionEligibility } from './use-action-eligibility'

const access = useAccessBoundary()
const { t } = useConsoleI18n()
const active = computed(() => {
  const current = access.readContext()
  const context = current.status === 'ready' ? current.snapshot : undefined
  return context?.delegation && context.identity.kind === 'known'
    ? { context, actor: context.delegation.actorId, principal: context.identity.principalId }
    : undefined
})
const command = computed(() => active.value && access.delegationExit?.(active.value.context))
const description = computed(() => {
  const context = active.value
  return context === undefined
    ? ''
    : `${t('accessInteraction.delegated')} · ${t('accessInteraction.actor')} ${context.actor} · ${t('accessInteraction.principal')} ${context.principal}`
})
const { actionable } = useActionEligibility(access, () => command.value)
const running = shallowRef(false)
const failed = shallowRef(false)
let lifetime: AbortController | undefined
onScopeDispose(() => {
  lifetime?.abort()
})
watch(active, () => {
  failed.value = false
})

async function exit(): Promise<void> {
  if (running.value || !actionable.value || !command.value) return
  const operation = new AbortController()
  lifetime = operation
  running.value = true
  failed.value = false
  try {
    const outcome = await executeDelegationChange(access, command.value, 'exit', operation.signal)
    if (!operation.signal.aborted && active.value && outcome !== 'completed') failed.value = true
  } finally {
    if (!operation.signal.aborted) running.value = false
  }
}
</script>

<template>
  <div
    v-if="active"
    class="gap-control py-control flex flex-wrap min-w-0 items-center justify-between bg-surface-panel px-page-inline text-caption text-text-primary"
  >
    <span
      class="min-w-0 break-all"
      role="status"
      v-text="description"
    />
    <NButton
      v-if="command"
      size="small"
      :disabled="!actionable"
      :loading="running"
      @click="exit"
    >
      {{ t('accessInteraction.exitDelegation') }}
    </NButton>
    <span
      v-if="failed"
      role="alert"
      class="text-control-error"
      v-text="t('accessInteraction.failed')"
    />
  </div>
</template>
