<script setup lang="ts">
import { computed, inject, nextTick, onScopeDispose, ref, useId } from 'vue'

import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import type { UiRadioCardOption } from './contracts'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

defineOptions({ name: 'UiRadioCardGroup' })

const props = withDefaults(
  defineProps<{
    readonly accessibleLabel: string
    readonly modelValue: string
    readonly options: readonly UiRadioCardOption[]
    readonly disabled?: boolean
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const pendingChoice = ref<string | null>(null)
const displayedChoice = computed(() => pendingChoice.value ?? props.modelValue)
let selectionSequence = 0
let disposed = false
function updateChoice(value: string | number | boolean): void {
  if (props.disabled || disposed) return
  const sequence = ++selectionSequence
  const choice = String(value)
  pendingChoice.value = choice
  try {
    emit('update:modelValue', choice)
  } finally {
    // Native radios uncheck their previous sibling before change. Let Naive render
    // the request once, then repaint the authoritative value even after rejection.
    void nextTick(() => {
      if (!disposed && selectionSequence === sequence) pendingChoice.value = null
    })
  }
}
onScopeDispose(() => {
  disposed = true
  selectionSequence += 1
})

const slots = defineSlots<{
  option?: (props: Readonly<{ option: UiRadioCardOption; selected: boolean }>) => unknown
}>()

const groupName = `pavp-radio-card-group-${useId()}`
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined)
  throw new Error('UiRadioCardGroup requires the PAVP Appearance context.')
const radioCardThemeOverrides = computed(() => ({
  buttonColor:
    appearance.value.colorPalette?.roles.neutral.soft.background.default ??
    'var(--ui-color-surface-page)',
  buttonColorActive:
    appearance.value.colorPalette?.roles.primary.solid.background.default ??
    'var(--ui-color-action-primary)',
  buttonTextColor:
    appearance.value.colorPalette?.roles.neutral.soft.foreground ?? 'var(--ui-color-text-primary)',
  buttonTextColorActive:
    appearance.value.colorPalette?.roles.primary.solid.foreground ??
    'var(--ui-color-text-on-action)',
  buttonTextColorHover:
    appearance.value.colorPalette?.roles.primary.soft.foreground ?? 'var(--ui-color-surface-panel)',
  buttonBorderColor: 'transparent',
  buttonBorderColorActive: 'transparent',
  buttonBorderRadius: 'var(--ui-radius-panel)',
  buttonBoxShadow: 'none',
  buttonBoxShadowFocus: 'none',
  buttonBoxShadowHover: 'none',
}))
const radioCardStyle = computed(() => ({
  '--pavp-radio-card-hover-surface':
    appearance.value.colorPalette?.roles.primary.soft.background.hover ??
    'var(--ui-color-text-primary)',
  '--pavp-radio-card-selected-hover-surface':
    appearance.value.colorPalette?.roles.primary.solid.background.hover ??
    'var(--ui-color-text-on-action)',
  '--pavp-radio-card-selected-hover-foreground':
    appearance.value.colorPalette?.roles.primary.solid.foreground ??
    'var(--ui-color-action-primary)',
}))
</script>

<template>
  <NRadioGroup
    :aria-label="accessibleLabel"
    class="pavp-radio-card-group min-w-0 grid-cols-auto-fit-admin-content"
    data-ui-radio-card-group
    :data-disabled="disabled"
    :style="radioCardStyle"
    :name="groupName"
    :theme-overrides="radioCardThemeOverrides"
    :value="displayedChoice"
    :disabled="disabled"
    @update:value="updateChoice"
  >
    <NRadioButton
      v-for="option in options"
      :key="option.value"
      class="pavp-radio-card-group__option min-h-target-enhanced"
      :data-selected="option.value === displayedChoice"
      data-ui-radio-card-option
      :label="option.value"
      :value="option.value"
    >
      <div
        class="pavp-radio-card-group__content wrap-anywhere"
        :class="slots.option === undefined ? 'px-button-inline' : 'p-page-inline'"
      >
        <slot
          name="option"
          :option="option"
          :selected="option.value === displayedChoice"
        >
          <span class="text-center flex min-w-0 items-center justify-center gap-content-gap">
            <span
              class="i-lucide-check shrink-0"
              :class="{ invisible: option.value !== displayedChoice }"
              aria-hidden="true"
            />
            <span>{{ option.label }}</span>
            <span
              class="i-lucide-check shrink-0 invisible"
              aria-hidden="true"
            />
          </span>
        </slot>
      </div>
    </NRadioButton>
  </NRadioGroup>
</template>

<style scoped>
@layer components {
  .pavp-radio-card-group[data-ui-radio-card-group] {
    --n-label-padding: 0;
    inline-size: 100%;
    gap: var(--ui-space-content-gap);
  }

  .pavp-radio-card-group[data-ui-radio-card-group]
    > :not(.pavp-radio-card-group__option):not(.n-radio-group__splitor) {
    display: none;
  }

  .pavp-radio-card-group[data-ui-radio-card-group]
    > .pavp-radio-card-group__option[data-ui-radio-card-option] {
    box-sizing: border-box;
    inline-size: 100%;
    min-inline-size: 0;
    overflow: hidden;
    border-style: none;
    border-radius: var(--ui-radius-panel);
    box-shadow: none;
  }

  .pavp-radio-card-group__content {
    display: grid;
    min-inline-size: 0;
    gap: var(--ui-space-content-gap);
  }

  @media (forced-colors: active) {
    .pavp-radio-card-group[data-ui-radio-card-group]
      > .pavp-radio-card-group__option[data-ui-radio-card-option] {
      border-style: solid;
    }
  }
}
.pavp-radio-card-group[data-ui-radio-card-group] {
  display: grid;
  height: auto;
  block-size: auto;
  line-height: var(--ui-font-line-height-body);
  white-space: normal;
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > .pavp-radio-card-group__option[data-ui-radio-card-option] {
  display: grid;
  align-items: center;
  height: auto;
  block-size: auto;
  padding: 0;
  line-height: var(--ui-font-line-height-body);
  white-space: normal;
  transition:
    background-color var(--ui-motion-duration) var(--ui-motion-easing),
    box-shadow var(--ui-motion-duration) var(--ui-motion-easing),
    color var(--ui-motion-duration) var(--ui-motion-easing);
}

.pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']
  > .pavp-radio-card-group__option[data-ui-radio-card-option]:not(.n-radio-button--disabled):hover {
  background: var(--pavp-radio-card-hover-surface);
}

.pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']
  > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']:not(
    .n-radio-button--disabled
  ):hover {
  background: var(--pavp-radio-card-selected-hover-surface);
  color: var(--pavp-radio-card-selected-hover-foreground);
}

.pavp-radio-card-group[data-ui-radio-card-group]
  > :deep(.n-radio-group__splitor:not(.pavp-radio-card-group__option)) {
  display: none;
}

@media (forced-colors: active) {
  .pavp-radio-card-group[data-ui-radio-card-group]
    > .pavp-radio-card-group__option[data-ui-radio-card-option] {
    background: Canvas;
    color: CanvasText;
  }

  .pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']
    > .pavp-radio-card-group__option[data-ui-radio-card-option]:not(
      .n-radio-button--disabled
    ):hover {
    background: CanvasText;
    color: Canvas;
  }

  .pavp-radio-card-group[data-ui-radio-card-group]
    > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true'] {
    background: Highlight;
    color: HighlightText;
  }

  .pavp-radio-card-group[data-ui-radio-card-group][data-disabled='false']
    > .pavp-radio-card-group__option[data-ui-radio-card-option][data-selected='true']:not(
      .n-radio-button--disabled
    ):hover {
    background: HighlightText;
    color: Highlight;
  }
}
</style>
