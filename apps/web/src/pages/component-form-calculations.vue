<script setup lang="ts">
import { computed } from 'vue'
import { UiForm, useUiForm, type UiFormSchema } from '@platform/ui'
import FormCapabilityWorkbench from '../app/workbench/forms/FormCapabilityWorkbench.vue'
import FormExampleActions from '../app/workbench/forms/FormExampleActions.vue'
import { useFormShowcase } from '../app/workbench/forms/form-showcase'
import { useFormExampleUndo } from '../app/workbench/forms/use-form-example-undo'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'ComponentFormCalculationsPage' })
defineProps<{ readonly title: string; readonly message: string }>()
const demo = useFormShowcase()
const { t } = demo
const { locale } = useConsoleI18n()
const plans = [
  { value: 'starter', label: 'formCapabilities.calculations.starter', cents: 4900 },
  { value: 'team', label: 'formCapabilities.calculations.team', cents: 12900 },
  { value: 'studio', label: 'formCapabilities.calculations.studio', cents: 24900 },
] as const
const schema = {
  columns: 2,
  fields: [
    {
      kind: 'select',
      name: 'plan',
      label: 'formCapabilities.calculations.plan',
      required: true,
      options: plans.map(({ value, label }) => ({ value, label })),
    },
    {
      kind: 'number',
      name: 'quantity',
      label: 'formCapabilities.calculations.quantity',
      required: true,
      min: 1,
      max: 1000,
      step: 1,
      rules: { min: 1, max: 1000 },
    },
    {
      kind: 'number',
      name: 'discount',
      label: 'formCapabilities.calculations.discount',
      required: true,
      min: 0,
      max: 100,
      step: 1,
      rules: { min: 0, max: 100 },
    },
    { kind: 'textarea', name: 'note', label: 'formCapabilities.calculations.note', span: 2 },
  ],
} as const satisfies UiFormSchema
const form = useUiForm({
  ...demo,
  formId: 'form-calculations',
  schema,
  initial: {
    draftId: 'local-quote',
    values: { plan: 'team', quantity: 5, discount: 10, note: '' },
  },
  validation: (values) =>
    !Number.isInteger(values.quantity)
      ? [{ field: 'quantity', message: () => t('formCapabilities.calculations.integerError') }]
      : [],
})
const history = useFormExampleUndo(() => form)
// Derived presentation stays in trusted frontend code, never in the JSON schema or draft.
const quote = computed(() => {
  const { plan, quantity, discount } = form.values.value
  const selected = plans.find((candidate) => candidate.value === plan)
  if (
    form.hasPendingInput.value ||
    selected === undefined ||
    typeof quantity !== 'number' ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 1000 ||
    typeof discount !== 'number' ||
    !Number.isFinite(discount) ||
    discount < 0 ||
    discount > 100
  )
    return null
  const subtotal = selected.cents * quantity
  const savings = Math.round((subtotal * discount) / 100)
  return { unit: selected.cents, subtotal, savings, total: subtotal - savings }
})
const currency = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
)
function money(cents: number | undefined): string {
  return cents === undefined ? t('configuredForm.empty') : currency.value.format(cents / 100)
}
</script>

<template>
  <FormCapabilityWorkbench
    :title="title"
    :message="message"
    capability="calculations"
    :form="form"
  >
    <p class="m-0 text-body text-text-secondary">
      {{ t('formCapabilities.calculations.intro') }}
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
      <section
        class="rounded-panel grid min-w-0 bg-surface-page gap-content-gap p-page-inline"
        :aria-label="t('formCapabilities.calculations.preview')"
      >
        <h3 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('formCapabilities.calculations.preview') }}
        </h3>
        <div
          class="flex flex-wrap items-baseline justify-between gap-component-unit"
          role="status"
          aria-live="polite"
        >
          <span class="font-title-weight text-body text-text-primary">{{
            t('formCapabilities.calculations.total')
          }}</span>
          <strong class="font-title-weight text-subheading text-text-primary">{{
            money(quote?.total)
          }}</strong>
        </div>
        <dl class="m-0 grid grid-cols-2 gap-component-unit text-body">
          <dt class="text-text-secondary">
            {{ t('formCapabilities.calculations.unit') }}
          </dt>
          <dd class="m-0 text-right text-text-primary">
            {{ money(quote?.unit) }}
          </dd>
          <dt class="text-text-secondary">
            {{ t('formCapabilities.calculations.subtotal') }}
          </dt>
          <dd class="m-0 text-right text-text-primary">
            {{ money(quote?.subtotal) }}
          </dd>
          <dt class="text-text-secondary">
            {{ t('formCapabilities.calculations.savings') }}
          </dt>
          <dd class="m-0 text-right text-text-primary">
            {{ money(quote?.savings) }}
          </dd>
        </dl>

        <p class="m-0 text-caption text-text-secondary">
          {{
            t(
              quote === null
                ? 'formCapabilities.calculations.invalid'
                : 'formCapabilities.calculations.rounding',
            )
          }}
        </p>
      </section>
    </template>
    <template #insight>
      <p class="m-0 text-caption text-text-secondary">
        {{ t('formCapabilities.calculations.boundary') }}
      </p>
    </template>
    <template #actions>
      <FormExampleActions
        :form="form"
        :history="history"
      />
    </template>
  </FormCapabilityWorkbench>
</template>
