<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'

defineOptions({ name: 'ComponentFormLoadingPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const schema = {
  columns: 2,
  fields: [
    { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
    {
      kind: 'text',
      name: 'email',
      label: 'configuredForm.email',
      required: true,
      rules: { format: 'email' },
    },
    {
      kind: 'number',
      name: 'capacity',
      label: 'configuredForm.capacity',
      rules: { min: 1, max: 30 },
      description: 'formCapabilities.loading.pendingHint',
    },
    { kind: 'text', name: 'edition', label: 'formCapabilities.loading.edition', readonly: true },
  ],
} as const satisfies UiFormSchema
function snapshot(record: 'record-a' | 'record-b', edition: number) {
  return {
    draftId: record,
    values: {
      name: record === 'record-a' ? 'Aurora Studio' : 'Harbor Studio',
      email: record === 'record-a' ? 'aurora@example.com' : 'harbor@example.com',
      capacity: (record === 'record-a' ? 4 : 8) + edition,
      edition: String(edition),
    },
  }
}
const form = useUiForm({
  ...demo,
  formId: 'form-loading',
  schema,
  initial: snapshot('record-a', 0),
})
const history = useFormExampleUndo(() => form)
const nextEdition = ref(0)
const interrupted = ref(false)
let view = new AbortController()
onActivated(() => {
  if (view.signal.aborted) view = new AbortController()
})
onDeactivated(() => {
  interrupted.value = form.loadState.value === 'loading'
  view.abort()
})
const busy = computed(() => form.loadState.value === 'loading' || form.phase.value !== 'idle')
const loadStateLabels = {
  idle: 'formCapabilities.loading.state.idle',
  loading: 'formCapabilities.loading.state.loading',
  ready: 'formCapabilities.loading.state.ready',
  failed: 'formCapabilities.loading.state.failed',
  blocked: 'formCapabilities.loading.state.blocked',
} as const
const status = computed(() =>
  interrupted.value
    ? t('formCapabilities.loading.interrupted')
    : t(loadStateLabels[form.loadState.value]),
)
const baseline = computed(() => {
  void form.revision.value
  return form.getInitial().values
})

async function load(fail = false, switchRecord = false): Promise<void> {
  if (busy.value || (switchRecord && form.hasUnsavedChanges.value)) return
  interrupted.value = false
  const record = switchRecord
    ? form.draftId.value === 'record-a'
      ? 'record-b'
      : 'record-a'
    : form.draftId.value === 'record-b'
      ? 'record-b'
      : 'record-a'
  const edition = nextEdition.value + 1
  await form.load(
    async ({ signal }) => {
      const request = AbortSignal.any([signal, view.signal])
      await new Promise<void>((resolve, reject) => {
        if (request.aborted) {
          reject(new Error('Local load cancelled'))
          return
        }
        const cancel = () => {
          clearTimeout(timer)
          reject(new Error('Local load cancelled'))
        }
        const timer = setTimeout(() => {
          request.removeEventListener('abort', cancel)
          resolve()
        }, 1400)
        request.addEventListener('abort', cancel, { once: true })
      })
      request.throwIfAborted()
      if (fail) throw new Error('Intentional local load failure')
      nextEdition.value = edition
      return snapshot(record, edition)
    },
    { strategy: 'preserve-dirty' },
  )
}
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="loading"
    :form="form"
  >
    <template #controls>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="busy"
        @click="load()"
      >
        {{
          t(
            form.loadState.value === 'failed'
              ? 'formCapabilities.loading.retry'
              : 'formCapabilities.loading.refresh',
          )
        }}
      </NButton>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="busy"
        @click="load(true)"
      >
        {{ t('formCapabilities.loading.fail') }}
      </NButton>
      <NButton
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :disabled="busy || form.hasUnsavedChanges.value"
        :title="
          form.hasUnsavedChanges.value ? t('formCapabilities.loading.switchBlocked') : undefined
        "
        @click="load(false, true)"
      >
        {{ t('formCapabilities.loading.switchRecord') }}
      </NButton>
    </template>
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formCapabilities.loading.try') }}
    </p>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
    >
      <template #actions>
        <span />
      </template>
    </UiForm>
    <p
      v-if="form.hasUnsavedChanges.value"
      class="m-0 text-caption text-text-secondary"
    >
      {{ t('formCapabilities.loading.switchBlocked') }}
    </p>
    <template #status>
      <p
        class="m-0 text-body text-text-primary"
        role="status"
        aria-live="polite"
      >
        {{ status }}
      </p>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('formCapabilities.loading.record') }}: {{ form.draftId.value }}
      </p>
    </template>
    <template #insight>
      <section
        class="grid min-w-0 gap-component-unit"
        :aria-label="t('formCapabilities.loading.baseline')"
      >
        <h4 class="font-title-weight m-0 text-body text-text-primary">
          {{ t('formCapabilities.loading.baseline') }}
        </h4>
        <p class="m-0 text-caption text-text-secondary">
          {{ t('formCapabilities.loading.resetHint') }}
        </p>
        <dl class="m-0 grid min-w-0 gap-content-gap">
          <div class="grid min-w-0 gap-component-unit">
            <dt class="text-caption text-text-secondary">
              {{ t('configuredForm.name') }}
            </dt>
            <dd class="m-0 min-w-0 break-words text-body text-text-primary">
              {{ baseline.name }}
            </dd>
          </div>
          <div class="grid min-w-0 gap-component-unit">
            <dt class="text-caption text-text-secondary">
              {{ t('configuredForm.capacity') }}
            </dt>
            <dd class="m-0 min-w-0 break-words text-body text-text-primary">
              {{ baseline.capacity }}
            </dd>
          </div>
          <div class="grid min-w-0 gap-component-unit">
            <dt class="text-caption text-text-secondary">
              {{ t('formCapabilities.loading.edition') }}
            </dt>
            <dd class="m-0 min-w-0 break-words text-body text-text-primary">
              {{ baseline.edition }}
            </dd>
          </div>
        </dl>
      </section>
    </template>
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
