<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import {
  computed,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  useId,
  watch,
  type ButtonHTMLAttributes,
} from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from './access-boundary'
import type { BusinessConstraint } from './business-availability'
import { executeGuardedAction, type ActionTarget, type GuardedAction } from './guarded-action'
import { useActionEligibility } from './use-action-eligibility'

interface Selection {
  readonly action: GuardedAction<unknown>
  readonly target: ActionTarget
}
const props = defineProps<{
  readonly selection?: Selection | undefined
  readonly disabled?: boolean
  readonly type?: 'primary' | 'default' | 'error'
  readonly recovery?: {
    readonly forKind: Exclude<BusinessConstraint['kind'], 'assurance'>
    readonly label: string
    readonly selection: Selection
  }
}>()
const emit = defineEmits<{ activate: [] }>()
const { t } = useConsoleI18n()
const restricted = computed(() => ({
  feature: t('accessInteraction.blocked.feature'),
  entitlement: t('accessInteraction.blocked.entitlement'),
  quota: t('accessInteraction.blocked.quota'),
  workflow: t('accessInteraction.blocked.workflow'),
}))
const access = useAccessBoundary()
const { assessment, actionable } = useActionEligibility(access, () => props.selection)
const recoverySelection = computed(() => {
  const primary = assessment.value?.primary
  const recovery = props.recovery
  return recovery && primary?.status === 'restricted' && primary.kind === recovery.forKind
    ? recovery.selection
    : undefined
})
const { actionable: canRecover } = useActionEligibility(access, () => recoverySelection.value)
const recoveryFailure = shallowRef(false)
let recoveryAttempt: AbortController | undefined
function cancelRecovery(): void {
  recoveryAttempt?.abort()
  recoveryAttempt = undefined
  recoveryFailure.value = false
}
watch(() => [recoverySelection.value, access.readContext()] as const, cancelRecovery, {
  flush: 'sync',
})
onDeactivated(cancelRecovery)
onScopeDispose(cancelRecovery)
async function recover(): Promise<void> {
  const selected = recoverySelection.value
  if (!canRecover.value || !selected || recoveryAttempt) return
  const operation = new AbortController()
  recoveryAttempt = operation
  recoveryFailure.value = false
  try {
    const [result] = await executeGuardedAction(access, selected.action, {
      signal: operation.signal,
      targets: [selected.target],
    })
    if (!operation.signal.aborted) recoveryFailure.value = result?.status !== 'completed'
  } catch {
    if (!operation.signal.aborted) recoveryFailure.value = true
  } finally {
    if (recoveryAttempt === operation) recoveryAttempt = undefined
  }
}
const reasonId = useId()
const quota = computed(() => assessment.value?.results.find(({ kind }) => kind === 'quota'))
const reason = computed(() => {
  if (props.disabled || props.selection === undefined) return ''
  const result = assessment.value
  if (result?.state.status !== 'allow') {
    return t(
      result?.state.status === 'deny'
        ? 'accessInteraction.denied'
        : 'accessInteraction.unavailable',
    )
  }
  const primary = result.primary
  if (primary?.status === 'restricted' && primary.kind && primary.kind !== 'assurance')
    return restricted.value[primary.kind]
  if (primary?.status === 'challenge') return t('accessInteraction.assurance')
  if (primary || !actionable.value) return t('accessInteraction.unavailable')
  return ''
})
</script>

<template>
  <div class="gap-control grid min-w-0">
    <NButton
      :type="type ?? 'default'"
      :disabled="disabled || !actionable"
      v-bind="{ 'aria-describedby': reason ? reasonId : undefined } satisfies ButtonHTMLAttributes"
      @click="emit('activate')"
    >
      <slot />
    </NButton>
    <span
      v-if="reason"
      :id="reasonId"
      role="status"
      class="text-caption text-text-secondary"
      v-text="reason"
    />
    <span
      v-if="quota"
      class="text-caption text-text-secondary"
    >
      {{
        quota.allowance
          ? `${t('accessInteraction.remaining')} ${quota.allowance.remaining === 'unlimited' ? t('accessInteraction.unlimited') : quota.allowance.remaining} ${quota.allowance.unit} · ${t('accessInteraction.requested')} ${quota.allowance.requested} ${quota.allowance.unit} · ${quota.allowance.period}`
          : t('accessInteraction.allowanceUnknown')
      }}
    </span>
    <NButton
      v-if="recovery && canRecover && !disabled"
      @click="recover"
    >
      {{ recovery.label }}
    </NButton>
    <span
      v-if="canRecover && recoveryFailure"
      class="text-caption text-control-error"
      role="alert"
      v-text="t('accessInteraction.failed')"
    />
  </div>
</template>
