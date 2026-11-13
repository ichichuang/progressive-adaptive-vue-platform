<script setup lang="ts" generic="I">
import { computed, inject } from 'vue'
import { uiDateTimeContext } from '../date-time/date-time-context'
import { formatUiDateTime } from '../date-time/date-time'
import { formPresentation } from '../composables/form-presentation'
import UiScrollArea from './UiScrollArea.vue'
import PavpNaiveFormChoice from '../adapters/naive/PavpNaiveFormChoice.vue'
import { NTag } from 'naive-ui/es/tag'
import PavpNaiveFormField from '../adapters/naive/PavpNaiveFormField.vue'
import PavpNaiveFormControl from '../adapters/naive/PavpNaiveFormControl.vue'
import { useFormFieldPresentation } from './form-field-presentation'
import type { UiFormFieldProps, UiFormFieldSlots } from './form-contracts'

defineOptions({ name: 'UiFormField', inheritAttrs: false })
const props = withDefaults(defineProps<UiFormFieldProps<I>>(), { mode: 'edit' })
const slots = defineSlots<UiFormFieldSlots>()
const { binding, config, controlScopeKey } = useFormFieldPresentation(
  props,
  () => slots.default !== undefined,
)
const feedbackRevision = computed(() => {
  const target = formPresentation(props.form).feedbackTarget.value
  return target?.identity === controlScopeKey.value ? target.revision : 0
})
const detail = computed(() => props.mode === 'detail' || binding.value.readonly)
const choice = computed(
  () =>
    config.value.kind === 'select' ||
    config.value.kind === 'multi-select' ||
    config.value.kind === 'radio' ||
    config.value.kind === 'checkbox-group',
)
const dateTime = inject(uiDateTimeContext, undefined)
const displayValues = computed(() => {
  const value = binding.value.value
  if (choice.value)
    return binding.value.selectedOptions.map((item) =>
      item.option === null ? String(item.value) : props.form.text(item.option.label),
    )
  if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) return []
  const context = dateTime?.value
  if (
    context &&
    (config.value.kind === 'date' || config.value.kind === 'time') &&
    typeof value === 'string'
  )
    return [
      formatUiDateTime({ kind: config.value.kind, value }, context) ?? props.form.copy.empty(),
    ]
  if (context && config.value.kind === 'date-range' && Array.isArray(value))
    return [
      value
        .map((item) =>
          typeof item === 'string'
            ? (formatUiDateTime({ kind: 'date', value: item }, context) ?? props.form.copy.empty())
            : props.form.copy.empty(),
        )
        .join(' – '),
    ]
  if (typeof value === 'boolean') return [value ? props.form.copy.yes() : props.form.copy.no()]
  if (config.value.kind === 'date-range' && Array.isArray(value)) return [value.join(' – ')]
  if (config.value.kind === 'attachment' && Array.isArray(value))
    return value.map((item: unknown) =>
      typeof item === 'object' && item !== null && 'name' in item ? String(item.name) : '',
    )
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'object') return [JSON.stringify(value)]
  return [String(value)]
})
</script>

<template>
  <div
    v-if="!binding.hidden"
    :data-span="config.span"
    :class="config.span === 2 ? 'col-span-full' : ''"
    class="min-w-0"
  >
    <div
      v-if="detail"
      class="grid min-w-0 gap-component-unit"
    >
      <div
        :id="binding.labelId"
        class="text-caption text-text-secondary"
      >
        {{ form.text(config.label) }}
      </div>
      <div
        :aria-labelledby="binding.labelId"
        class="min-w-0 whitespace-pre-wrap break-words text-body text-text-primary"
      >
        <PavpNaiveFormChoice
          v-if="choice"
          readonly
          :form="form"
          :binding="binding"
          :label="form.text(config.label)"
        >
          <template #default="{ statusText }">
            <slot
              v-if="slots.detail"
              name="detail"
              v-bind="binding"
            />
            <div
              v-else
              class="pavp-form-choice-detail"
            >
              <UiScrollArea
                :owner-id="`${binding.controlId}-choice-values`"
                x-scrollable
                contained
              >
                <div
                  class="pavp-form-choice-detail__values flex w-max whitespace-nowrap items-center gap-component-unit"
                >
                  <span
                    v-if="displayValues.length === 0"
                    class="text-text-secondary"
                  >
                    {{ statusText || form.copy.empty() }}
                  </span>
                  <NTag
                    v-for="(value, index) in displayValues"
                    :key="index"
                    :bordered="false"
                    size="small"
                  >
                    {{ value }}
                  </NTag>
                </div>
              </UiScrollArea>
            </div>
          </template>
        </PavpNaiveFormChoice>
        <slot
          v-else
          name="detail"
          v-bind="binding"
        >
          <span
            v-if="displayValues.length === 0"
            class="text-text-secondary"
            v-text="form.copy.empty()"
          />
          <NTag
            v-else-if="config.kind === 'switch'"
            :bordered="false"
            size="small"
          >
            {{ displayValues[0] }}
          </NTag>
          <span v-else>{{ displayValues.join(', ') }}</span>
        </slot>
      </div>
      <p
        v-if="config.description"
        class="m-0 text-caption text-text-secondary"
      >
        {{ form.text(config.description) }}
      </p>
    </div>
    <PavpNaiveFormField
      v-else
      :key="controlScopeKey"
      :binding="binding"
      :feedback-revision="feedbackRevision"
      :config="{
        ...config,
        label: form.text(config.label),
        ...(config.description === undefined ? {} : { description: form.text(config.description) }),
      }"
      :copy="form.copy"
    >
      <slot
        v-if="config.kind === 'custom'"
        v-bind="binding"
      />
      <PavpNaiveFormControl
        v-else
        :form="form"
        :binding="binding"
      />
    </PavpNaiveFormField>
  </div>
</template>

<style>
@layer components {
  .pavp-form-choice-detail,
  .pavp-form-choice-detail__values {
    block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  }
}
</style>
