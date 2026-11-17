<script setup lang="ts">
import { UiForm, type UiFormCopy } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NModal } from 'naive-ui/es/modal'
import { computed, onScopeDispose, shallowRef } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import { GuardedOperationButton } from '../access/advanced-interactions'
import {
  executeGuardedAction,
  type ActionTarget,
  type GuardedActionOutcome,
} from '../access/guarded-action'
import { useGuardedForm } from '../forms/use-guarded-form'
import {
  administrationAction,
  type AdministrationCommand,
  type AdministrationModuleHost,
} from './administration-host'

const props = defineProps<{
  readonly host: AdministrationModuleHost
  readonly command: AdministrationCommand
  readonly target: ActionTarget
  readonly copy: UiFormCopy
  readonly label: string
  readonly activeRevision: string | undefined
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const { t } = useConsoleI18n()
const access = useAccessBoundary()
const initial = access.readContext()
const lifetime = new AbortController()
onScopeDispose(() => {
  lifetime.abort()
})
const status = shallowRef('')
const pending = shallowRef(false)
const uncertain = shallowRef(false)
const conflict = shallowRef(false)
const selected = props.command
const captured = props.target
const baseRevision =
  (selected.kind === 'save' || selected.kind === 'publish') && props.activeRevision !== undefined
    ? { expectedActiveRevision: props.activeRevision }
    : undefined
const boundTarget = Object.freeze({
  ...captured,
  mode: 'edit' as const,
  ...(baseRevision === undefined
    ? {}
    : { proposal: { revision: crypto.randomUUID(), values: baseRevision } }),
})
const ownsDraft = () =>
  !lifetime.signal.aborted && access.readContext() === initial && props.target === captured
const isCurrent = () => ownsDraft() && !uncertain.value && !conflict.value
const action = administrationAction(access, selected, isCurrent)
const selection = computed(() => ({ action, target: boundTarget }))
const receipt = {
  receipt: `administration-draft-${boundTarget.id}`,
  values: {},
  isCurrent: ownsDraft,
}
const form =
  selected.input &&
  useGuardedForm({
    access,
    form: {
      formId: 'administration-mutation',
      copy: props.copy,
      schema: {
        fields: [
          selected.input.choices
            ? {
                kind: 'select',
                name: 'value',
                label: selected.input.label,
                options: selected.input.choices.map((value) => ({ label: value, value })),
              }
            : { kind: 'text', name: 'value', label: selected.input.label },
        ],
      },
    },
    source: {
      domain: props.host.domain,
      resource: props.host.resource,
      scope: props.host.scope,
      selection: 'all',
      fields: { value: { edit: { write: selected.input.writeAction } } },
    },
    target: () => (ownsDraft() ? boundTarget : undefined),
    confirmed: () => receipt,
    recordWrite: action.requirement,
    onOutcome(result) {
      if (result.status === 'completed') {
        queueMicrotask(() => {
          if (isCurrent()) emit('saved')
        })
      } else {
        showOutcome(result)
      }
    },
    proposal: (payload) => ({
      revision: crypto.randomUUID(),
      values: {
        ...baseRevision,
        ...(typeof payload['value'] === 'string' ? { value: payload['value'] } : {}),
      },
    }),
    action() {
      return {
        ...action,
        async dispatch(commands, signal) {
          const result = await action.dispatch(commands, signal)
          return result.map((reply) =>
            reply.status === 'completed' ? { ...reply, value: 'acknowledged' as const } : reply,
          )
        },
        apply(value, command) {
          action.apply?.(value, command)
          return undefined
        },
      }
    },
  })

function showOutcome(result: GuardedActionOutcome | undefined): void {
  conflict.value = result?.failure === 'revision-conflict'
  uncertain.value = result?.status === 'unknown'
  status.value = t(
    conflict.value
      ? 'administration.revisionConflict'
      : uncertain.value
        ? 'accessInteraction.unknown'
        : result?.status === 'denied' || result?.status === 'business-blocked'
          ? 'accessInteraction.denied'
          : 'administration.saveFailed',
  )
}

async function run(): Promise<void> {
  if (pending.value || !isCurrent()) return
  pending.value = true
  try {
    const [result] = await executeGuardedAction(access, action, {
      targets: [boundTarget],
      signal: lifetime.signal,
    })
    if (!isCurrent()) return
    if (result?.status === 'completed') emit('saved')
    else showOutcome(result)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <NModal
    :show="true"
    preset="card"
    :title="command.label"
    class="w-full max-w-content"
    to="#pavp-overlay-root"
    @update:show="!$event && emit('close')"
  >
    <p>{{ label }}</p>
    <UiForm
      v-if="form"
      :form="form.form"
    >
      <template
        v-if="conflict || uncertain"
        #actions
      >
        <NButton
          attr-type="submit"
          type="primary"
          disabled
        >
          {{ copy.submit() }}
        </NButton>
      </template>
    </UiForm>
    <GuardedOperationButton
      v-else
      :selection="selection"
      :disabled="pending || uncertain || conflict"
      @activate="run"
    >
      {{ command.label }}
    </GuardedOperationButton>
    <p
      v-if="status"
      role="alert"
    >
      {{ status }}
    </p>
    <template #footer>
      <NButton
        v-if="conflict || uncertain"
        @click="emit('saved')"
      >
        {{ t('administration.closeAndRefresh') }}
      </NButton>
      <NButton @click="emit('close')">
        {{ t('accessInteraction.close') }}
      </NButton>
    </template>
  </NModal>
</template>
