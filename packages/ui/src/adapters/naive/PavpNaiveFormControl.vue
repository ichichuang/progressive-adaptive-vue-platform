<script setup lang="ts" generic="I, K extends UiFormKey<I>">
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSelect } from 'naive-ui/es/select'
import { NSwitch } from 'naive-ui/es/switch'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { computed, inject } from 'vue'
import type {
  UiFormController,
  UiFormFieldBinding,
  UiFormKey,
} from '../../components/form-contracts'
import { useFormControl } from './use-form-control'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-theme'

defineOptions({ name: 'PavpNaiveFormControl', inheritAttrs: false })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding<I, K>
}>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('Form controls require UiProvider.')
const theme = computed(() => createPavpNaiveFormThemeProjection(appearance.value))
const {
  config,
  textValue,
  numberValue,
  selectValue,
  optionItems,
  selectedText,
  unknownSelection,
  selectDisabled,
  readonlyComposite,
  validationProps,
  numberHints,
  composing,
  captureInput,
  update,
  blurNumber,
  dateDisabled,
} = useFormControl(props)
</script>

<template>
  <div
    ref="root"
    class="pavp-form-control"
    :data-kind="config.kind"
    @input.capture="captureInput"
    @compositionstart.capture="composing = true"
    @compositionend.capture="composing = false"
  >
    <div
      v-if="readonlyComposite && config.kind === 'switch'"
      data-form-readonly
      role="checkbox"
      :aria-checked="binding.value === true"
      aria-readonly="true"
      :tabindex="binding.disabled ? -1 : 0"
    >
      <span aria-hidden="true">{{ binding.value ? '✓' : '—' }}</span>
    </div>
    <div
      v-else-if="readonlyComposite"
      role="textbox"
      aria-readonly="true"
      data-form-readonly
      :tabindex="binding.disabled ? -1 : 0"
    >
      {{ config.kind === 'date' ? textValue : selectedText }}
    </div>
    <NInput
      v-else-if="config.kind === 'text' || config.kind === 'textarea'"
      :type="config.kind"
      :value="textValue"
      :placeholder="config.placeholder?.() ?? ''"
      :readonly="binding.readonly"
      :disabled="binding.disabled"
      :theme-overrides="theme.Input"
      v-bind="validationProps"
      @update:value="update"
      @blur="binding.blur()"
    />
    <NInputNumber
      v-else-if="config.kind === 'number'"
      :value="numberValue"
      :readonly="binding.readonly"
      :disabled="binding.disabled"
      placeholder=""
      :theme-overrides="theme.InputNumber"
      v-bind="{ ...validationProps, ...numberHints }"
      @update:value="update"
      @blur="blurNumber"
    />
    <NSelect
      v-else-if="config.kind === 'select' || config.kind === 'multi-select'"
      :value="selectValue"
      :multiple="config.kind === 'multi-select'"
      :options="optionItems"
      :menu-props="{ class: 'pavp-form-select-menu' }"
      :fallback-option="false"
      :disabled="selectDisabled"
      :loading="binding.optionsState === 'loading'"
      clearable
      placeholder=""
      to="#pavp-overlay-root"
      :theme-overrides="theme.Select"
      v-bind="validationProps"
      @update:value="update"
      @blur="binding.blur()"
    >
      <template #empty>
        {{ form.copy.noOptions() }}
      </template>
    </NSelect>
    <NSwitch
      v-else-if="config.kind === 'switch'"
      :value="binding.value === true"
      :disabled="binding.disabled"
      :theme-overrides="theme.Switch"
      @update:value="update"
      @blur="binding.blur()"
    />
    <NDatePicker
      v-else-if="config.kind === 'date'"
      type="date"
      :formatted-value="binding.value === null ? null : textValue"
      format="yyyy-MM-dd"
      value-format="yyyy-MM-dd"
      clearable
      placeholder=""
      to="#pavp-overlay-root"
      :disabled="binding.disabled"
      :is-date-disabled="dateDisabled"
      :theme-overrides="theme.DatePicker"
      v-bind="validationProps"
      @update:formatted-value="update"
      @blur="binding.blur()"
    />
    <template v-if="config.kind === 'select' || config.kind === 'multi-select'">
      <p v-if="!readonlyComposite && unknownSelection">
        {{ unknownSelection }}
      </p>
      <p v-if="binding.optionsState === 'loading'">
        {{ form.copy.loadingOptions() }}
      </p>
      <p v-else-if="binding.optionsState === 'failed'">
        {{ form.copy.optionsFailed() }}
        <button
          type="button"
          :disabled="form.submitting.value || binding.disabled"
          @click="binding.retryOptions()"
        >
          {{ form.copy.retryOptions() }}
        </button>
      </p>
      <p v-else-if="binding.optionsState === 'ready' && !binding.options.length">
        {{ form.copy.noOptions() }}
      </p>
    </template>
  </div>
</template>

<style>
.pavp-form-control {
  inline-size: 100%;
  min-inline-size: 0;
}
.pavp-form-control .n-switch,
.pavp-form-control [data-form-readonly],
.pavp-form-control button {
  min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
}
.pavp-form-control [data-form-readonly] {
  display: inline-flex;
  align-items: center;
  white-space: pre-wrap;
  color: var(--ui-color-text-primary);
}
.pavp-form-control p {
  color: var(--ui-color-text-secondary);
}
.pavp-form-control button {
  color: var(--ui-color-text-primary);
  background: var(--ui-color-surface-panel);
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-width: var(--ui-admin-border-width);
}
.pavp-form-control [data-form-readonly]:focus-visible,
.pavp-form-control button:focus-visible {
  outline: var(--ui-admin-border-focus);
  outline-offset: var(--ui-admin-focus-outline-offset);
}
</style>
