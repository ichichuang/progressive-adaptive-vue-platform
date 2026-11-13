<script setup lang="ts" generic="I">
import PavpNaiveForm from '../adapters/naive/PavpNaiveForm.vue'
import UiFormFields from './UiFormFields.vue'
import { NButton } from 'naive-ui/es/button'
import { NStep, NSteps } from 'naive-ui/es/steps'
import type { UiFormProps, UiFormSlots } from './form-contracts'
import { computed, inject, provide } from 'vue'
import { uiDateTimeContext } from '../date-time/date-time-context'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

/** A single native submit boundary; draft and mutation ownership stay in useUiForm. */
defineOptions({ name: 'UiForm', inheritAttrs: false })
const props = withDefaults(defineProps<UiFormProps<I>>(), { mode: 'edit' })
const slots = defineSlots<UiFormSlots<I>>()
const inheritedDateTime = inject(uiDateTimeContext, undefined)
provide(
  uiDateTimeContext,
  computed(() => props.dateTime ?? inheritedDateTime?.value),
)
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiForm requires UiProvider.')

const steps = computed(() => props.form.schema.steps)
const activeStepIndex = computed(() => props.form.activeStepIndex.value)
const activeNodes = computed(() => {
  const configured = steps.value
  const index = activeStepIndex.value
  if (configured === undefined || index === null) return props.form.schema.fields
  const roots = new Set(configured[index]?.fields ?? [])
  return props.form.schema.fields.filter((node) => roots.has(node.name))
})
const isLastStep = computed(() => {
  const configured = steps.value
  const index = activeStepIndex.value
  return configured !== undefined && index !== null && index >= configured.length - 1
})
const canGoBack = computed(() => {
  const index = activeStepIndex.value
  return index !== null && index > 0
})
const stepStatus = computed(() => {
  const configured = steps.value
  const index = activeStepIndex.value
  if (configured === undefined || index === null) return []
  return configured.map((_, stepIndex) => {
    if (stepIndex < index) return 'finish' as const
    if (stepIndex === index) return 'process' as const
    return 'wait' as const
  })
})
const stepIndicators = computed(() => {
  const configured = steps.value
  if (configured === undefined) return []
  return configured.map((step, index) => ({
    name: step.name,
    title: props.form.text(step.label),
    description: step.description === undefined ? '' : props.form.text(step.description),
    status: stepStatus.value[index] ?? ('wait' as const),
  }))
})

function selectStep(index: number): void {
  if (props.form.submitting.value || props.form.phase.value === 'disposed') return
  void props.form.setActiveStep(index, { relax: props.mode === 'detail' })
}
function goBack(): void {
  void props.form.goBackStep()
}
function goNext(): void {
  void props.form.goNextStep()
}
</script>

<template>
  <PavpNaiveForm
    :form="form"
    :columns="columns ?? form.schema.columns ?? 1"
    :mode="mode"
    v-bind="$attrs"
  >
    <slot :form="form">
      <div class="grid min-w-0 gap-content-gap">
        <div
          v-if="steps !== undefined && activeStepIndex !== null"
          class="pavp-form-steps flex flex-col min-w-0 gap-content-gap"
        >
          <NSteps
            class="pavp-form-steps__indicator min-w-0"
            size="small"
            :current="activeStepIndex + 1"
          >
            <NStep
              v-for="(step, index) in stepIndicators"
              :key="step.name"
              :title="step.title"
              :description="step.description"
              :status="step.status"
              class="min-w-0 cursor-pointer"
              role="button"
              :tabindex="form.submitting.value || form.phase.value === 'disposed' ? -1 : 0"
              :aria-current="index === activeStepIndex ? 'step' : undefined"
              :aria-disabled="form.submitting.value || form.phase.value === 'disposed'"
              @click="selectStep(index)"
              @keydown.enter.prevent="selectStep(index)"
              @keydown.space.prevent="selectStep(index)"
            />
          </NSteps>
        </div>
        <UiFormFields
          :form="form"
          :nodes="activeNodes"
          prefix=""
          :mode="mode"
          :columns="columns ?? form.schema.columns ?? 1"
        >
          <template
            v-if="slots.field"
            #field="binding"
          >
            <slot
              name="field"
              v-bind="binding"
            />
          </template>
          <template
            v-if="slots.detail"
            #detail="binding"
          >
            <slot
              name="detail"
              v-bind="binding"
            />
          </template>
        </UiFormFields>
      </div>
    </slot>
    <template #actions>
      <slot
        name="actions"
        :form="form"
      >
        <template v-if="steps !== undefined && activeStepIndex !== null">
          <NButton
            v-if="canGoBack"
            class="min-h-target-enhanced min-w-target-enhanced"
            attr-type="button"
            secondary
            :bordered="false"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
            @click="goBack"
          >
            {{ form.copy.previousStep!() }}
          </NButton>
          <NButton
            v-if="mode === 'edit' && !isLastStep"
            class="min-h-target-enhanced min-w-target-enhanced"
            attr-type="button"
            type="primary"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
            @click="goNext"
          >
            {{ form.copy.nextStep!() }}
          </NButton>
          <NButton
            v-else-if="mode === 'edit'"
            class="min-h-target-enhanced min-w-target-enhanced"
            attr-type="submit"
            :aria-busy="form.submitting.value"
            type="primary"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
          >
            {{ form.copy.submit() }}
          </NButton>
          <NButton
            v-if="mode === 'edit'"
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
            secondary
            :bordered="false"
            @click="form.reset()"
          >
            {{ form.copy.reset() }}
          </NButton>
        </template>
        <template v-else>
          <NButton
            class="min-h-target-enhanced min-w-target-enhanced"
            attr-type="submit"
            :aria-busy="form.submitting.value"
            type="primary"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
          >
            {{ form.copy.submit() }}
          </NButton>
          <NButton
            class="min-h-target-enhanced min-w-target-enhanced"
            :disabled="form.submitting.value || form.phase.value === 'disposed'"
            secondary
            :bordered="false"
            @click="form.reset()"
          >
            {{ form.copy.reset() }}
          </NButton>
        </template>
      </slot>
    </template>
  </PavpNaiveForm>
</template>
