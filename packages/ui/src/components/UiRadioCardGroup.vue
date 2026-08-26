<script setup lang="ts">
import { useId } from 'vue'

import { PavpRadioButtonPrimitive, PavpRadioGroupPrimitive } from '../adapters/naive/naive-radio'
import type { UiSegmentedOption } from './contracts'

defineOptions({ name: 'UiRadioCardGroup' })

defineProps<{
  readonly accessibleLabel: string
  readonly modelValue: string
  readonly options: readonly UiSegmentedOption[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

defineSlots<{
  option?: (props: Readonly<{ option: UiSegmentedOption; selected: boolean }>) => unknown
}>()

const groupName = `pavp-radio-card-group-${useId()}`
const radioCardThemeOverrides = Object.freeze({
  buttonBoxShadow: 'none',
  buttonBoxShadowFocus: 'none',
  buttonBoxShadowHover: 'none',
})
</script>

<template>
  <PavpRadioGroupPrimitive
    :aria-label="accessibleLabel"
    class="pavp-radio-card-group"
    data-ui-radio-card-group
    :name="groupName"
    :theme-overrides="radioCardThemeOverrides"
    :value="modelValue"
    @update:value="emit('update:modelValue', String($event))"
  >
    <PavpRadioButtonPrimitive
      v-for="option in options"
      :key="option.value"
      class="pavp-radio-card-group__option min-h-target-enhanced"
      :data-selected="option.value === modelValue"
      data-ui-radio-card-option
      :label="option.value"
      :value="option.value"
    >
      <div class="pavp-radio-card-group__content">
        <slot
          name="option"
          :option="option"
          :selected="option.value === modelValue"
        >
          {{ option.label }}
        </slot>
      </div>
    </PavpRadioButtonPrimitive>
  </PavpRadioGroupPrimitive>
</template>

<style scoped>
.pavp-radio-card-group[data-ui-radio-card-group] {
  --n-label-padding: 0;

  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--ui-layout-admin-content-minimum-inline-size)), 1fr)
  );
  inline-size: 100%;
  height: auto;
  block-size: auto;
  gap: var(--ui-space-content-gap);
  line-height: var(--ui-font-line-height-body);
  white-space: normal;
}

.pavp-radio-card-group[data-ui-radio-card-group] > :not(.pavp-radio-card-group__option) {
  display: none;
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > .pavp-radio-card-group__option[data-ui-radio-card-option] {
  box-sizing: border-box;
  display: grid;
  inline-size: 100%;
  height: auto;
  block-size: auto;
  min-inline-size: 0;
  overflow: hidden;
  padding: 0;
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-width: var(--ui-admin-border-width);
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-text-primary);
  line-height: var(--ui-font-line-height-body);
  white-space: normal;
  background: var(--ui-color-surface-panel);
  box-shadow: none;
  transition:
    background-color var(--ui-motion-duration) var(--ui-motion-easing),
    box-shadow var(--ui-motion-duration) var(--ui-motion-easing),
    color var(--ui-motion-duration) var(--ui-motion-easing);
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > .pavp-radio-card-group__option[data-ui-radio-card-option]:hover {
  border-color: var(--ui-color-border-default);
  color: var(--ui-color-text-primary);
  background: var(--ui-color-surface-page);
  box-shadow: none;
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true'] {
  border-color: var(--ui-color-border-default);
  border-style: solid;
  color: var(--ui-color-text-primary);
  background: var(--ui-color-surface-page);
  box-shadow: none;
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > .pavp-radio-card-group__option:focus-within[data-ui-radio-card-option] {
  box-shadow: var(--ui-admin-shadow-focus-ring);
}

.pavp-radio-card-group__content {
  display: grid;
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
  padding: var(--ui-space-page-inline);
}

@media (forced-colors: active) {
  .pavp-radio-card-group[data-ui-radio-card-group]
    > .pavp-radio-card-group__option[data-ui-radio-card-option] {
    border-style: solid;
  }
}
</style>
