<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'

defineOptions({ name: 'ComponentFormSubmissionPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const scenarios = ['success', 'fieldFailure', 'formFailure'] as const
const scenarioLabels = {
  success: 'formCapabilities.submission.scenarios.success',
  fieldFailure: 'formCapabilities.submission.scenarios.fieldFailure',
  formFailure: 'formCapabilities.submission.scenarios.formFailure',
} as const
const scenario = ref<(typeof scenarios)[number]>('success')
const attempts = ref(0)
let view = new AbortController()
onActivated(() => {
  if (view.signal.aborted) view = new AbortController()
})
onDeactivated(() => {
  view.abort()
})
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'text',
      name: 'name',
      label: 'configuredForm.name',
      required: true,
      rules: { minLength: 2 },
      description: 'formCapabilities.submission.normalizeHint',
    },
    {
      kind: 'text',
      name: 'email',
      label: 'configuredForm.email',
      required: true,
      rules: { format: 'email' },
    },
    { kind: 'text', name: 'alias', label: 'formShowcase.alias', required: true },
    { kind: 'textarea', name: 'notes', label: 'formCapabilities.submission.notes', span: 2 },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  copy: {
    ...demo.copy,
    submitting: () => t('formCapabilities.submission.running'),
    submitSucceeded: () => t('formCapabilities.submission.succeeded'),
    submitFailed: () => t('formCapabilities.submission.failed'),
  },
  formId: 'form-submission',
  schema,
  initial: {
    draftId: 'local-submission',
    values: { name: '  Aurora Studio  ', email: 'HELLO@example.com', alias: 'aurora', notes: '' },
  },
  onSubmit: async (values, { signal }) => {
    const selected = scenario.value
    attempts.value += 1
    const request = AbortSignal.any([signal, view.signal])
    try {
      await new Promise<void>((resolve, reject) => {
        if (request.aborted) {
          reject(new Error('Local submission cancelled'))
          return
        }
        const cancel = () => {
          clearTimeout(timer)
          reject(new Error('Local submission cancelled'))
        }
        const timer = setTimeout(() => {
          request.removeEventListener('abort', cancel)
          resolve()
        }, 1400)
        request.addEventListener('abort', cancel, { once: true })
      })
      request.throwIfAborted()
    } catch {
      return { status: 'failure', message: () => t('formCapabilities.submission.interrupted') }
    }
    if (selected === 'fieldFailure')
      return {
        status: 'failure',
        message: () => t('formCapabilities.submission.fieldFailed'),
        issues: [{ field: 'alias', message: () => t('formCapabilities.submission.aliasRejected') }],
      }
    if (selected === 'formFailure')
      return {
        status: 'failure',
        message: () => t('formCapabilities.submission.failed'),
        issues: [{ field: null, message: () => t('formCapabilities.submission.formRejected') }],
      }
    return {
      status: 'success',
      initial: {
        draftId: 'local-submission',
        values: {
          ...values,
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          notes: values.notes.trim(),
        },
      },
    }
  },
})
const history = useFormExampleUndo(() => form)
const baseline = computed(() => {
  void form.revision.value
  return form.getInitial().values
})
const status = computed(() =>
  form.submitting.value
    ? t('formCapabilities.submission.running')
    : (form.notice.value?.() ?? t('formCapabilities.submission.ready')),
)
function choose(value: (typeof scenarios)[number]): void {
  if (form.phase.value === 'idle') scenario.value = value
}
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="submission"
    :form="form"
    submit-mode="submit"
  >
    <template #controls>
      <NButton
        v-for="option in scenarios"
        :key="option"
        class="min-h-target-enhanced min-w-target-enhanced"
        secondary
        :bordered="false"
        :type="scenario === option ? 'primary' : 'default'"
        :aria-pressed="scenario === option"
        :disabled="form.phase.value !== 'idle'"
        @click="choose(option)"
      >
        {{ t(scenarioLabels[option]) }}
      </NButton>
    </template>
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formCapabilities.submission.try') }}
    </p>
    <UiForm
      class="grid gap-content-gap"
      :form="form"
    >
      <template #actions>
        <span />
      </template>
    </UiForm>
    <template #status>
      <p
        class="m-0 text-body text-text-primary"
        role="status"
        aria-live="polite"
      >
        {{ status }}
      </p>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('formCapabilities.submission.attempts') }}: {{ attempts }}
      </p>
    </template>
    <template #insight>
      <section
        class="grid min-w-0 gap-component-unit"
        :aria-label="t('formCapabilities.submission.baseline')"
      >
        <h4 class="font-title-weight m-0 text-body text-text-primary">
          {{ t('formCapabilities.submission.baseline') }}
        </h4>
        <p class="m-0 text-caption text-text-secondary">
          {{ t('formCapabilities.submission.boundary') }}
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
              {{ t('configuredForm.email') }}
            </dt>
            <dd class="m-0 min-w-0 break-words text-body text-text-primary">
              {{ baseline.email }}
            </dd>
          </div>
        </dl>
      </section>
    </template>
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
        :submit-label="t('formCapabilities.submission.submit')"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
