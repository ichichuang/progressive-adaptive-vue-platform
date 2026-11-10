<script setup lang="ts" generic="I">
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSelect, type SelectInst, type SelectProps } from 'naive-ui/es/select'
import { NSwitch } from 'naive-ui/es/switch'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { computed, inject, nextTick, onScopeDispose, shallowRef, useTemplateRef, watch } from 'vue'
import type { UiFormController, UiFormFieldBinding } from '../../components/form-contracts'
import PavpNaiveFormChoice from './PavpNaiveFormChoice.vue'
import { useFormControl } from './use-form-control'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-form-theme'

defineOptions({ name: 'PavpNaiveFormControl', inheritAttrs: false })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
}>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('Form controls require UiProvider.')
const theme = computed(() => createPavpNaiveFormThemeProjection(appearance.value))
const {
  root,
  config,
  textValue,
  numberValue,
  dateText,
  selectValue,
  optionItems,
  fallbackOption,
  selectedText,
  selectDisabled,
  readonlyComposite,
  validationProps,
  placeholder,
  numberHints,
  numberFormatProps,
  captureComposition,
  captureInput,
  update,
  updateDateText,
  blurNumber,
} = useFormControl(props)
const pagingCopy = computed(() => {
  if (props.binding.optionQuery === null) return null
  const { previousOptionsPage, nextOptionsPage, optionsPage } = props.form.copy
  if (
    previousOptionsPage === undefined ||
    nextOptionsPage === undefined ||
    optionsPage === undefined
  )
    throw new TypeError('Paged form options require pagination copy.')
  return { previousOptionsPage, nextOptionsPage, optionsPage }
})
const searchInputId = computed(() => `${props.binding.controlId}-search`)
let openRequest = 0
watch(
  () => [props.binding, props.binding.name, props.binding.controlId],
  () => {
    openRequest += 1
  },
  { flush: 'sync' },
)
onScopeDispose(() => {
  openRequest += 1
})
function updateSelectShow(show: boolean): void {
  const request = ++openRequest
  if (!show) return
  const binding = props.binding
  const name = binding.name
  const controlId = binding.controlId
  const inputId = searchInputId.value
  const mountedRoot = root.value
  // NSelect emits before changing its internal show state. Wait for that
  // synchronous change before awaiting Vue's render, without a timing guess.
  queueMicrotask(() => {
    void nextTick(() => {
      if (
        request !== openRequest ||
        props.binding !== binding ||
        binding.name !== name ||
        binding.controlId !== controlId ||
        binding.optionQuery === null ||
        mountedRoot === null ||
        root.value !== mountedRoot ||
        !mountedRoot.isConnected
      )
        return
      const input = mountedRoot.ownerDocument.getElementById(inputId)
      if (
        !(input instanceof HTMLInputElement) ||
        !input.isConnected ||
        !mountedRoot.contains(input)
      )
        return
      // A completed close clears Naive's filter, while an interrupted leave may
      // retain it. Read the public input projection instead of keeping query text.
      binding.searchOptions(input.value)
    })
  })
}
const pagedSelectProps = computed<SelectProps>(() =>
  props.binding.optionQuery === null
    ? {}
    : {
        remote: false,
        fallbackOption,
        consistentMenuWidth: false,
        filterable: true,
        filter: () => true,
        clearFilterAfterSelect: false,
        onSearch: (search) => props.binding.searchOptions(search),
        onUpdateShow: updateSelectShow,
      },
)
const queryStatusText = computed(() => {
  if (props.binding.optionQuery === null) return ''
  if (props.binding.optionsState === 'idle' || props.binding.optionsState === 'loading')
    return props.form.copy.loadingOptions()
  if (props.binding.optionsState === 'failed') return props.form.copy.optionsFailed()
  return props.binding.options.length === 0 ? props.form.copy.noOptions() : ''
})
const optionActionsDisabled = computed(
  () =>
    props.binding.disabled || props.form.submitting.value || props.form.phase.value === 'disposed',
)
const pagingDisabled = computed(
  () =>
    optionActionsDisabled.value ||
    props.binding.optionsState === 'idle' ||
    props.binding.optionsState === 'loading',
)
const select = useTemplateRef<SelectInst>('select')
function focusOptionsSearch(available: () => boolean): UiFormFieldBinding | null {
  const binding = props.binding
  const name = binding.name
  const controlId = binding.controlId
  const request = openRequest
  const instance = select.value
  const mountedRoot = root.value
  if (instance === null || mountedRoot === null) return null
  const inputId = searchInputId.value
  const input = mountedRoot.ownerDocument.getElementById(inputId)
  if (!(input instanceof HTMLInputElement)) return null
  const ownsConnectedInput = () =>
    mountedRoot.isConnected &&
    input.isConnected &&
    mountedRoot.contains(input) &&
    mountedRoot.ownerDocument.getElementById(inputId) === input
  if (!available() || !ownsConnectedInput()) return null
  // Loading disables page buttons, and retry removes its button. The official
  // focusInput method keeps the same query text and menu open while returning
  // Arrow/Enter/Escape handling to the search input before either mutation.
  instance.focusInput()
  return available() &&
    request === openRequest &&
    props.binding === binding &&
    binding.name === name &&
    binding.controlId === controlId &&
    select.value === instance &&
    root.value === mountedRoot &&
    ownsConnectedInput() &&
    input.ownerDocument.activeElement === input
    ? binding
    : null
}
function changeOptionsPage(page: number): void {
  focusOptionsSearch(() => !pagingDisabled.value)?.setOptionsPage(page)
}
function retryQueryOptions(): void {
  focusOptionsSearch(
    () => !optionActionsDisabled.value && props.binding.optionsState === 'failed',
  )?.retryOptions('query')
}
const calendarOpen = shallowRef(false)
watch(
  () => props.binding.disabled,
  (disabled) => {
    if (disabled) calendarOpen.value = false
  },
)
function chooseDate(value: string | null): void {
  if (update(value)) calendarOpen.value = false
}
</script>

<template>
  <div
    ref="root"
    class="pavp-form-control"
    :data-kind="config.kind"
    @input.capture="captureInput"
    @compositionstart.capture="captureComposition"
    @compositionend.capture="captureComposition"
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
      :placeholder="placeholder"
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
      :placeholder="placeholder"
      :theme-overrides="theme.InputNumber"
      v-bind="{ ...validationProps, ...numberHints, ...numberFormatProps }"
      @update:value="update"
      @blur="blurNumber"
    />
    <PavpNaiveFormChoice
      v-else-if="config.kind === 'select' || config.kind === 'multi-select'"
      :form="form"
      :binding="binding"
      :label="form.text(config.label)"
    >
      <template #default="{ statusText }">
        <!-- Official overflow and fallback presentation preserve the draft and native icons. -->
        <NSelect
          ref="select"
          :value="selectValue"
          :multiple="config.kind === 'multi-select'"
          :options="optionItems"
          :input-props="binding.optionQuery === null ? {} : { id: searchInputId }"
          max-tag-count="responsive"
          :ellipsis-tag-popover-props="{ to: '#pavp-overlay-root' }"
          :virtual-scroll="false"
          :menu-props="{
            class:
              binding.optionQuery === null
                ? 'pavp-form-select-menu'
                : 'pavp-form-select-menu pavp-form-select-menu--paged',
          }"
          :disabled="selectDisabled"
          :loading="binding.optionsState === 'loading'"
          clearable
          :placeholder="
            binding.invalid ? placeholder : queryStatusText || statusText || placeholder
          "
          to="#pavp-overlay-root"
          :theme-overrides="theme.Select"
          v-bind="{ ...validationProps, ...pagedSelectProps }"
          @update:value="update"
          @blur="binding.blur()"
        >
          <template #empty>
            {{ queryStatusText || form.copy.noOptions() }}
          </template>
          <template
            v-if="binding.optionQuery !== null && pagingCopy !== null"
            #action
          >
            <div class="grid min-w-0 gap-component-unit">
              <span
                role="status"
                aria-live="polite"
                class="min-w-0 whitespace-normal break-all text-caption text-text-secondary"
              >
                {{ pagingCopy.optionsPage(binding.optionQuery.page) }}
              </span>
              <div class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit">
                <NButton
                  circle
                  class="shrink-0 min-h-target-enhanced min-w-target-enhanced"
                  :aria-label="pagingCopy.previousOptionsPage()"
                  :title="pagingCopy.previousOptionsPage()"
                  :disabled="pagingDisabled || binding.optionQuery.page <= 1"
                  @click="changeOptionsPage(binding.optionQuery.page - 1)"
                >
                  <template #icon>
                    <span
                      class="i-lucide-chevron-left"
                      aria-hidden="true"
                    />
                  </template>
                </NButton>
                <NButton
                  circle
                  class="shrink-0 min-h-target-enhanced min-w-target-enhanced"
                  :aria-label="pagingCopy.nextOptionsPage()"
                  :title="pagingCopy.nextOptionsPage()"
                  :disabled="pagingDisabled || !binding.optionQuery.hasNext"
                  @click="changeOptionsPage(binding.optionQuery.page + 1)"
                >
                  <template #icon>
                    <span
                      class="i-lucide-chevron-right"
                      aria-hidden="true"
                    />
                  </template>
                </NButton>
                <NButton
                  v-if="binding.optionsState === 'failed'"
                  circle
                  class="shrink-0 min-h-target-enhanced min-w-target-enhanced"
                  :aria-label="form.copy.retryOptions()"
                  :title="form.copy.retryOptions()"
                  :disabled="optionActionsDisabled"
                  @click="retryQueryOptions"
                >
                  <template #icon>
                    <span
                      class="i-lucide-rotate-cw"
                      aria-hidden="true"
                    />
                  </template>
                </NButton>
              </div>
            </div>
          </template>
        </NSelect>
      </template>
    </PavpNaiveFormChoice>
    <NSwitch
      v-else-if="config.kind === 'switch'"
      :value="binding.value === true"
      :disabled="binding.disabled"
      :theme-overrides="theme.Switch"
      @update:value="update"
      @blur="binding.blur()"
    />
    <div
      v-else-if="config.kind === 'date'"
      class="flex min-w-0 items-center gap-component-unit"
    >
      <NInput
        :value="dateText"
        clearable
        :placeholder="placeholder"
        :disabled="binding.disabled"
        :theme-overrides="theme.Input"
        v-bind="validationProps"
        @update:value="updateDateText"
        @blur="binding.blur()"
      />
      <NPopover
        v-model:show="calendarOpen"
        trigger="click"
        placement="bottom-end"
        to="#pavp-overlay-root"
        :disabled="binding.disabled"
        raw
      >
        <template #trigger>
          <NButton
            secondary
            :disabled="binding.disabled"
            :aria-label="form.text(config.label)"
          >
            <template #icon>
              <span
                class="i-lucide-calendar-days"
                aria-hidden="true"
              />
            </template>
          </NButton>
        </template>
        <NDatePicker
          panel
          type="date"
          :formatted-value="binding.value === null ? null : textValue"
          value-format="yyyy-MM-dd"
          :actions="[]"
          to="#pavp-overlay-root"
          :disabled="binding.disabled"
          :theme-overrides="theme.DatePicker"
          @update:formatted-value="chooseDate"
        />
      </NPopover>
    </div>
  </div>
</template>

<style>
@layer components {
  .pavp-form-select-menu--paged {
    min-inline-size: calc(var(--ui-layout-target-enhanced-minimum-inline-size) * 3);
    max-inline-size: calc(100vw - var(--ui-space-component-unit) * 2);
  }
  .pavp-form-control {
    inline-size: 100%;
    min-inline-size: 0;
  }
  .pavp-form-control .n-switch,
  .pavp-form-control [data-form-readonly] {
    min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
    min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
  }
  .pavp-form-control [data-form-readonly] {
    display: inline-flex;
    align-items: center;
    white-space: pre-wrap;
    color: var(--ui-color-text-primary);
  }
  .pavp-form-control [data-form-readonly]:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
}
</style>
