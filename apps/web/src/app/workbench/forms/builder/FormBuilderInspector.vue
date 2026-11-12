<script setup lang="ts">
import { computed, useId } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NInput } from 'naive-ui/es/input'
import FormBuilderNumber from './FormBuilderNumber.vue'
import { NSelect } from 'naive-ui/es/select'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { NTimePicker } from 'naive-ui/es/time-picker'
import { NSwitch } from 'naive-ui/es/switch'
import FormBuilderDate from './FormBuilderDate.vue'
import type { UiFormFlag, UiFormOption, UiFormValue } from '@platform/ui'
import { useConsoleI18n } from '../../../../shared/i18n'
import FormBuilderCondition from './FormBuilderCondition.vue'
import {
  type BuilderEditableNode,
  type BuilderReference,
  type useFormBuilder,
} from './use-form-builder'

const props = defineProps<{
  readonly node: BuilderEditableNode
  readonly references: readonly BuilderReference[]
  readonly editor: ReturnType<typeof useFormBuilder>['editor']
}>()
const emit = defineEmits<{
  update: [node: BuilderEditableNode]
}>()
const { t } = useConsoleI18n()
const inspectorId = useId()
function labelId(property: string): string {
  return `${inspectorId}-${property}`
}
function isChoice(
  node: BuilderEditableNode,
): node is Extract<
  BuilderEditableNode,
  { kind: 'select' | 'radio' | 'multi-select' | 'checkbox-group' }
> {
  return ['select', 'radio', 'multi-select', 'checkbox-group'].includes(node.kind)
}
function hasLength(
  node: BuilderEditableNode,
): node is Extract<
  BuilderEditableNode,
  { kind: 'text' | 'textarea' | 'multi-select' | 'checkbox-group' }
> {
  return ['text', 'textarea', 'multi-select', 'checkbox-group'].includes(node.kind)
}
const leaf = computed(() => props.node.kind !== 'group' && props.node.kind !== 'repeat')
const isText = computed(() => props.node.kind === 'text' || props.node.kind === 'textarea')
const choices = computed<readonly UiFormOption[]>(() =>
  (props.node.kind === 'select' ||
    props.node.kind === 'radio' ||
    props.node.kind === 'multi-select' ||
    props.node.kind === 'checkbox-group') &&
  Array.isArray(props.node.options)
    ? props.node.options
    : [],
)
const defaultChoices = computed(() =>
  choices.value.map((option) => ({
    ...option,
    label: `${option.label} (${typeof option.value === 'number' ? t('formBuilder.numberValue') : t('formBuilder.stringValue')}: ${String(option.value)})`,
  })),
)
const valueTypes = computed(() => [
  { value: 'string', label: t('formBuilder.stringValue') },
  { value: 'number', label: t('formBuilder.numberValue') },
])
const spans = computed(() => [
  { value: 1, label: t('formBuilder.oneColumn') },
  { value: 2, label: t('formBuilder.twoColumns') },
])
function patch(property: string, value: unknown): void {
  const remaining = Object.fromEntries(
    Object.entries(props.node).filter(([key]) => key !== property),
  )
  emit('update', {
    ...remaining,
    ...(value === undefined ? {} : { [property]: value }),
  } as BuilderEditableNode)
}
function rule(property: string, value: unknown): void {
  if (props.node.kind === 'group' || props.node.kind === 'repeat') return
  const remaining = Object.fromEntries(
    Object.entries(props.node.rules ?? {}).filter(([key]) => key !== property),
  )
  const next = {
    ...remaining,
    ...(value === null || value === '' || value === undefined ? {} : { [property]: value }),
  }
  patch('rules', Object.keys(next).length ? next : undefined)
}
function flag(property: 'hidden' | 'required' | 'disabled' | 'readonly', value: UiFormFlag): void {
  patch(property, value === false ? undefined : value)
}
function defaultValue(value: UiFormValue): void {
  patch('defaultValue', value)
}
function addOption(): void {
  props.editor.addOptionIdentity()
  let number = choices.value.length + 1
  while (choices.value.some((option) => option.value === `option${String(number)}`)) number += 1
  patch('options', [
    ...choices.value,
    { value: `option${String(number)}`, label: `${t('formBuilder.option')} ${String(number)}` },
  ])
}
function changeOption(
  index: number,
  property: 'label' | 'value' | 'disabled',
  value: string | number | boolean | null,
): void {
  if (value === null) return
  patch(
    'options',
    choices.value.map((option, position) =>
      position === index ? { ...option, [property]: value } : option,
    ),
  )
}
function optionType(index: number, type: string): void {
  props.editor.inputState(`option-${String(props.editor.optionIds.value[index])}`).clear()
  const old = choices.value[index]
  if (!old) return
  const converted = type === 'number' ? Number(old.value) : String(old.value)
  changeOption(
    index,
    'value',
    typeof converted === 'number' && !Number.isFinite(converted) ? 0 : converted,
  )
}
function removeOption(index: number): void {
  props.editor.removeOptionIdentity(index)
  patch(
    'options',
    choices.value.filter((_, position) => position !== index),
  )
}
function optionKey(option: UiFormOption): string {
  return `${typeof option.value}:${String(option.value)}`
}
const optionWarning = computed(() => {
  const identities = choices.value.map(optionKey)
  if (new Set(identities).size !== identities.length) return t('formBuilder.duplicateOption')
  if (
    props.node.kind !== 'select' &&
    props.node.kind !== 'radio' &&
    props.node.kind !== 'multi-select' &&
    props.node.kind !== 'checkbox-group'
  )
    return ''
  const current = props.node.defaultValue
  const selected = Array.isArray(current)
    ? current
    : current === undefined || current === null
      ? []
      : [current]
  return selected.some(
    (value) => !choices.value.some((option) => option.value === value && !option.disabled),
  )
    ? t('formBuilder.defaultOptionMissing')
    : ''
})
function removeDefault(): void {
  props.editor.inputState('defaultValue').clear()
  patch('defaultValue', undefined)
}
</script>

<template>
  <section
    class="grid min-w-0 gap-content-gap"
    :aria-label="t('formBuilder.properties')"
    @compositionstart="editor.setComposing(true)"
    @compositionend="editor.setComposing(false)"
  >
    <h3 class="font-title-weight m-0 text-caption text-text-secondary">
      {{ t('formBuilder.basics') }}
    </h3>
    <div class="grid min-w-0 gap-component-unit">
      <span
        :id="labelId('label')"
        class="text-caption text-text-primary"
        v-text="t('formBuilder.label')"
      />
      <NInput
        :value="node.label"
        :input-props="{ 'aria-labelledby': labelId('label') }"
        @update:value="patch('label', $event)"
      />
    </div>
    <div class="grid min-w-0 gap-component-unit">
      <span
        :id="labelId('name')"
        class="text-caption text-text-primary"
        v-text="t('formBuilder.name')"
      />
      <NInput
        :value="node.name"
        :input-props="{ 'aria-labelledby': labelId('name') }"
        @update:value="patch('name', $event)"
      />
    </div>
    <div class="grid min-w-0 gap-component-unit">
      <span
        :id="labelId('description')"
        class="text-caption text-text-primary"
        v-text="t('formBuilder.description')"
      />
      <NInput
        :value="node.description ?? ''"
        :input-props="{ 'aria-labelledby': labelId('description') }"
        @update:value="patch('description', $event || undefined)"
      />
    </div>
    <div
      v-if="leaf"
      class="grid min-w-0 gap-component-unit"
    >
      <span
        :id="labelId('placeholder')"
        class="text-caption text-text-primary"
        v-text="t('formBuilder.placeholder')"
      />
      <NInput
        :value="'placeholder' in node ? (node.placeholder ?? '') : ''"
        :input-props="{ 'aria-labelledby': labelId('placeholder') }"
        @update:value="patch('placeholder', $event || undefined)"
      />
    </div>
    <div class="grid min-w-0 gap-component-unit">
      <span
        class="text-caption text-text-primary"
        v-text="t('formBuilder.span')"
      />
      <NSelect
        :value="node.span ?? (leaf ? 1 : 2)"
        :options="spans"
        :aria-label="t('formBuilder.span')"
        to="#pavp-overlay-root"
        @update:value="patch('span', $event)"
      />
    </div>
    <section
      v-if="leaf"
      class="grid min-w-0 gap-component-unit"
      :aria-label="t('formBuilder.defaultValue')"
    >
      <h4
        :id="labelId('defaultValue')"
        class="font-title-weight m-0 text-body text-text-primary"
      >
        {{ t('formBuilder.defaultValue') }}
      </h4>
      <NInput
        v-if="node.kind === 'text' || node.kind === 'textarea'"
        :value="node.defaultValue ?? ''"
        :type="node.kind === 'textarea' ? 'textarea' : 'text'"
        :input-props="{ 'aria-labelledby': labelId('defaultValue') }"
        @update:value="defaultValue"
      />
      <FormBuilderNumber
        v-else-if="node.kind === 'number'"
        :value="node.defaultValue ?? null"
        :label="t('formBuilder.defaultValue')"
        :labelled-by="labelId('defaultValue')"
        :input="editor.inputState('defaultValue')"
        @update:value="defaultValue"
      />
      <NSwitch
        v-else-if="node.kind === 'switch'"
        :value="node.defaultValue ?? false"
        :aria-label="t('formBuilder.defaultValue')"
        @update:value="defaultValue"
      />
      <FormBuilderDate
        v-else-if="node.kind === 'date'"
        :value="node.defaultValue ?? null"
        :label="t('formBuilder.defaultValue')"
        :labelled-by="labelId('defaultValue')"
        :input="editor.inputState('defaultValue')"
        @update:value="defaultValue"
      />
      <NDatePicker
        v-else-if="node.kind === 'date-range'"
        type="daterange"
        :formatted-value="node.defaultValue ?? null"
        value-format="yyyy-MM-dd"
        clearable
        :aria-label="t('formBuilder.defaultValue')"
        to="#pavp-overlay-root"
        @update:formatted-value="defaultValue"
      />
      <NTimePicker
        v-else-if="node.kind === 'time'"
        :formatted-value="node.defaultValue ?? null"
        value-format="HH:mm:ss"
        clearable
        :aria-label="t('formBuilder.defaultValue')"
        to="#pavp-overlay-root"
        @update:formatted-value="defaultValue"
      />
      <NSelect
        v-else-if="isChoice(node)"
        :value="node.defaultValue ?? null"
        :multiple="node.kind === 'multi-select' || node.kind === 'checkbox-group'"
        :options="defaultChoices"
        clearable
        :aria-label="t('formBuilder.defaultValue')"
        to="#pavp-overlay-root"
        @update:value="defaultValue"
      />
      <NButton
        text
        :disabled="
          !Object.hasOwn(node, 'defaultValue') && !editor.inputState('defaultValue').invalid
        "
        @click="removeDefault"
      >
        {{ t('formBuilder.removeDefault') }}
      </NButton>
    </section>
    <section
      v-if="isChoice(node)"
      class="wb-builder-property-group grid min-w-0 gap-content-gap"
      :aria-label="t('formBuilder.options')"
    >
      <div class="flex flex-wrap items-center justify-between gap-component-unit">
        <h4 class="font-title-weight m-0 text-body text-text-primary">
          {{ t('formBuilder.options') }}
        </h4>
        <NButton
          secondary
          @click="addOption"
        >
          {{ t('formBuilder.addOption') }}
        </NButton>
      </div>
      <div
        v-for="(option, index) in choices"
        :key="editor.optionIds.value[index]"
        class="wb-builder-option rounded-control grid min-w-0 bg-surface-page gap-component-unit"
      >
        <NInput
          :value="option.label"
          :input-props="{ 'aria-label': `${t('formBuilder.optionLabel')} ${String(index + 1)}` }"
          :placeholder="t('formBuilder.optionLabel')"
          @update:value="changeOption(index, 'label', $event)"
        />
        <NSelect
          :value="typeof option.value"
          :options="valueTypes"
          :aria-label="`${t('formBuilder.valueType')} ${String(index + 1)}`"
          to="#pavp-overlay-root"
          @update:value="optionType(index, $event)"
        />
        <FormBuilderNumber
          v-if="typeof option.value === 'number'"
          required
          :value="option.value"
          :label="`${t('formBuilder.optionValue')} ${String(index + 1)}`"
          :input="editor.inputState(`option-${String(editor.optionIds.value[index])}`)"
          @update:value="changeOption(index, 'value', $event)"
        />
        <NInput
          v-else
          :value="option.value"
          :input-props="{ 'aria-label': `${t('formBuilder.optionValue')} ${String(index + 1)}` }"
          @update:value="changeOption(index, 'value', $event)"
        />
        <div class="flex flex-wrap items-center justify-between gap-component-unit">
          <NSwitch
            :value="option.disabled ?? false"
            :aria-label="`${t('formBuilder.disabled')} ${option.label}`"
            @update:value="changeOption(index, 'disabled', $event)"
          >
            <template #checked>
              {{ t('formBuilder.disabled') }}
            </template>
            <template #unchecked>
              {{ t('formBuilder.enabled') }}
            </template>
          </NSwitch>
          <NButton
            tertiary
            @click="removeOption(index)"
          >
            {{ t('formBuilder.removeOption') }}
          </NButton>
        </div>
      </div>
      <p
        v-if="optionWarning"
        class="m-0 text-caption text-control-error"
        role="alert"
      >
        {{ optionWarning }}
      </p>
    </section>
    <section
      v-if="node.kind === 'number'"
      class="wb-builder-property-group grid grid-cols-2 min-w-0 gap-content-gap"
      :aria-label="t('formBuilder.numberBounds')"
    >
      <h4 class="font-title-weight m-0 col-span-full text-body text-text-primary">
        {{ t('formBuilder.numberBounds') }}
      </h4>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('minimum')"
          v-text="t('formBuilder.minimum')"
        /><FormBuilderNumber
          :value="node.min ?? null"
          :label="t('formBuilder.minimum')"
          :labelled-by="labelId('minimum')"
          :input="editor.inputState('minimum')"
          @update:value="patch('min', $event ?? undefined)"
        />
      </div>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('maximum')"
          v-text="t('formBuilder.maximum')"
        /><FormBuilderNumber
          :value="node.max ?? null"
          :label="t('formBuilder.maximum')"
          :labelled-by="labelId('maximum')"
          :input="editor.inputState('maximum')"
          @update:value="patch('max', $event ?? undefined)"
        />
      </div>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('step')"
          v-text="t('formBuilder.step')"
        /><FormBuilderNumber
          :value="node.step ?? null"
          :label="t('formBuilder.step')"
          :labelled-by="labelId('step')"
          :input="editor.inputState('step')"
          @update:value="patch('step', $event ?? undefined)"
        />
      </div>
    </section>
    <section
      v-if="node.kind === 'repeat'"
      class="wb-builder-property-group grid grid-cols-2 min-w-0 gap-content-gap"
      :aria-label="t('formBuilder.repeatBounds')"
    >
      <h4 class="font-title-weight m-0 col-span-full text-body text-text-primary">
        {{ t('formBuilder.repeatBounds') }}
      </h4>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('minItems')"
          v-text="t('formBuilder.minItems')"
        /><FormBuilderNumber
          :value="node.minItems ?? null"
          integer
          :label="t('formBuilder.minItems')"
          :labelled-by="labelId('minItems')"
          :input="editor.inputState('minItems')"
          @update:value="patch('minItems', $event ?? undefined)"
        />
      </div>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('maxItems')"
          v-text="t('formBuilder.maxItems')"
        /><FormBuilderNumber
          :value="node.maxItems ?? null"
          integer
          :label="t('formBuilder.maxItems')"
          :labelled-by="labelId('maxItems')"
          :input="editor.inputState('maxItems')"
          @update:value="patch('maxItems', $event ?? undefined)"
        />
      </div>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('addLabel')"
          v-text="t('formBuilder.addLabel')"
        /><NInput
          :value="node.addLabel ?? ''"
          :input-props="{ 'aria-labelledby': labelId('addLabel') }"
          @update:value="patch('addLabel', $event || undefined)"
        />
      </div>
      <div class="grid gap-component-unit">
        <span
          :id="labelId('itemLabel')"
          v-text="t('formBuilder.itemLabel')"
        /><NInput
          :value="node.itemLabel ?? ''"
          :input-props="{ 'aria-labelledby': labelId('itemLabel') }"
          @update:value="patch('itemLabel', $event || undefined)"
        />
      </div>
    </section>
    <section
      class="wb-builder-property-group grid min-w-0 gap-content-gap"
      :aria-label="t('formBuilder.behavior')"
    >
      <h4 class="font-title-weight m-0 text-body text-text-primary">
        {{ t('formBuilder.behavior') }}
      </h4>
      <FormBuilderCondition
        v-if="leaf"
        :label="t('formBuilder.required')"
        :value="'required' in node ? node.required : undefined"
        :references="references"
        path="required"
        :editor="editor"
        @update="flag('required', $event)"
      />
      <FormBuilderCondition
        :label="t('formBuilder.hidden')"
        :value="node.hidden"
        :references="references"
        path="hidden"
        :editor="editor"
        @update="flag('hidden', $event)"
      />
      <FormBuilderCondition
        :label="t('formBuilder.disabled')"
        :value="node.disabled"
        :references="references"
        path="disabled"
        :editor="editor"
        @update="flag('disabled', $event)"
      />
      <FormBuilderCondition
        :label="t('formBuilder.readonly')"
        :value="node.readonly"
        :references="references"
        path="readonly"
        :editor="editor"
        @update="flag('readonly', $event)"
      />
      <p
        v-if="!references.length"
        class="m-0 text-caption text-text-secondary"
      >
        {{ t('formBuilder.noReferences') }}
      </p>
    </section>
    <section
      v-if="leaf"
      class="wb-builder-property-group grid grid-cols-2 min-w-0 gap-content-gap"
      :aria-label="t('formBuilder.validation')"
    >
      <h4 class="font-title-weight m-0 col-span-full text-body text-text-primary">
        {{ t('formBuilder.validation') }}
      </h4>
      <template v-if="hasLength(node)">
        <div class="grid gap-component-unit">
          <span
            :id="labelId('minLength')"
            v-text="
              t(
                node.kind === 'multi-select' || node.kind === 'checkbox-group'
                  ? 'formBuilder.minChoices'
                  : 'formBuilder.minLength',
              )
            "
          /><FormBuilderNumber
            :value="node.rules?.minLength ?? null"
            integer
            :labelled-by="labelId('minLength')"
            :label="
              t(
                node.kind === 'multi-select' || node.kind === 'checkbox-group'
                  ? 'formBuilder.minChoices'
                  : 'formBuilder.minLength',
              )
            "
            :input="editor.inputState('minLength')"
            @update:value="rule('minLength', $event)"
          />
        </div>
        <div class="grid gap-component-unit">
          <span
            :id="labelId('maxLength')"
            v-text="
              t(
                node.kind === 'multi-select' || node.kind === 'checkbox-group'
                  ? 'formBuilder.maxChoices'
                  : 'formBuilder.maxLength',
              )
            "
          /><FormBuilderNumber
            :value="node.rules?.maxLength ?? null"
            integer
            :labelled-by="labelId('maxLength')"
            :label="
              t(
                node.kind === 'multi-select' || node.kind === 'checkbox-group'
                  ? 'formBuilder.maxChoices'
                  : 'formBuilder.maxLength',
              )
            "
            :input="editor.inputState('maxLength')"
            @update:value="rule('maxLength', $event)"
          />
        </div>
      </template>
      <template v-if="node.kind === 'number'">
        <div class="grid gap-component-unit">
          <span
            :id="labelId('ruleMin')"
            v-text="t('formBuilder.ruleMin')"
          /><FormBuilderNumber
            :value="node.rules?.min ?? null"
            :label="t('formBuilder.ruleMin')"
            :labelled-by="labelId('ruleMin')"
            :input="editor.inputState('ruleMin')"
            @update:value="rule('min', $event)"
          />
        </div>
        <div class="grid gap-component-unit">
          <span
            :id="labelId('ruleMax')"
            v-text="t('formBuilder.ruleMax')"
          /><FormBuilderNumber
            :value="node.rules?.max ?? null"
            :label="t('formBuilder.ruleMax')"
            :labelled-by="labelId('ruleMax')"
            :input="editor.inputState('ruleMax')"
            @update:value="rule('max', $event)"
          />
        </div>
      </template>
      <div
        v-if="isText"
        class="flex flex-wrap col-span-full items-center justify-between gap-component-unit"
      >
        <span v-text="t('formBuilder.email')" /><NSwitch
          :value="'rules' in node && node.rules?.format === 'email'"
          :aria-label="t('formBuilder.email')"
          @update:value="rule('format', $event ? 'email' : undefined)"
        />
      </div>
      <div class="grid col-span-full gap-component-unit">
        <span
          :id="labelId('errorMessage')"
          v-text="t('formBuilder.errorMessage')"
        /><NInput
          :value="'rules' in node ? (node.rules?.message ?? '') : ''"
          :input-props="{ 'aria-labelledby': labelId('errorMessage') }"
          @update:value="rule('message', $event)"
        />
      </div>
    </section>
  </section>
</template>
