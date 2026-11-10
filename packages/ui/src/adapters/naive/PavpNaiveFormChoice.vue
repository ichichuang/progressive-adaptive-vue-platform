<script setup lang="ts" generic="I">
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { computed, nextTick, onMounted, onScopeDispose, ref, useTemplateRef, watch } from 'vue'
import type { UiFormController, UiFormFieldBinding } from '../../components/form-contracts'

defineOptions({ name: 'PavpNaiveFormChoice' })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
  readonly label: string
  readonly readonly?: boolean
}>()
defineSlots<{ default: (props: { statusText: string }) => unknown }>()
const expanded = ref(false)
const root = useTemplateRef<HTMLElement>('root')
const details = useTemplateRef<HTMLElement>('details')
const content = useTemplateRef<HTMLElement>('content')
const overflow = ref(false)
const paged = computed(() => props.binding.optionQuery !== null)
const selected = computed(() => props.binding.selectedOptions.map((item) => item.value))
const labels = computed(() =>
  props.binding.selectedOptions.map((item) =>
    item.option === null ? String(item.value) : props.form.text(item.option.label),
  ),
)
const unknownValues = computed(() =>
  props.binding.selectedOptions
    .filter((item) => item.status === 'missing')
    .map((item) => item.value),
)
const unknown = computed(() => unknownValues.value.length > 0)
const failed = computed(() =>
  paged.value
    ? props.binding.selectedOptions.some((item) => item.status === 'failed')
    : props.binding.optionsState === 'failed',
)
const statusText = computed(() => {
  if (paged.value) {
    if (failed.value) return props.form.copy.optionsFailed()
    if (
      props.binding.selectedOptions.some(
        (item) => item.status === 'idle' || item.status === 'loading',
      )
    )
      return props.form.copy.loadingOptions()
    return unknown.value ? props.form.copy.invalidValue() : ''
  }
  if (props.binding.optionsState === 'idle' || props.binding.optionsState === 'loading')
    return props.form.copy.loadingOptions()
  if (failed.value) return props.form.copy.optionsFailed()
  if (unknown.value) return props.form.copy.invalidValue()
  return props.binding.options.length === 0 ? props.form.copy.noOptions() : ''
})
const needsDetails = computed(
  () =>
    failed.value ||
    unknown.value ||
    (selected.value.length > 0 &&
      (paged.value
        ? props.binding.selectedOptions.some(
            (item) => item.status === 'idle' || item.status === 'loading',
          )
        : props.binding.optionsState === 'idle' || props.binding.optionsState === 'loading')) ||
    overflow.value,
)
const showAction = computed(() => needsDetails.value || expanded.value)

// Measure the rendered selection at the full available width, without the action.
// Otherwise adding the action can create the overflow that keeps itself visible.
// A short-lived inert clone also makes Naive's display:none responsive tags
// measurable without changing the live control, its focus, or its resize state.
function measureOverflow(): void {
  const owner = root.value
  const source = content.value
  if (!owner?.isConnected || source === null || owner.clientWidth === 0) return
  if (
    selected.value.length === 0 ||
    source.querySelector('.n-select, .pavp-form-choice-detail__values') === null
  ) {
    overflow.value = false
    return
  }
  const copy = source.cloneNode(true) as HTMLElement
  copy.inert = true
  copy.setAttribute('aria-hidden', 'true')
  copy.removeAttribute('id')
  copy.querySelectorAll('[id]').forEach((element) => {
    element.removeAttribute('id')
  })
  copy.classList.add('absolute', 'inset-0', 'w-full', 'invisible', 'pointer-events-none')
  owner.append(copy)
  try {
    const tags = copy.querySelector<HTMLElement>('.n-base-selection-tags .v-overflow')
    if (tags !== null) {
      const items = Array.from(
        tags.querySelectorAll<HTMLElement>(':scope > .n-base-selection-tag-wrapper'),
      ).slice(0, selected.value.length)
      Array.from(tags.children).forEach((item) => {
        if (!items.includes(item as HTMLElement)) item.setAttribute('v-hidden', '')
      })
      items.forEach((item) => {
        item.removeAttribute('v-hidden')
      })
      const width = items.reduce((sum, item) => sum + item.getBoundingClientRect().width, 0)
      overflow.value =
        items.length === selected.value.length &&
        tags.clientWidth > 0 &&
        (width > tags.clientWidth ||
          items.some((item) => {
            const label = item.querySelector<HTMLElement>('.n-tag__content')
            return label !== null && label.clientWidth > 0 && label.scrollWidth > label.clientWidth
          }))
      return
    }
    const label = copy.querySelector<HTMLElement>(
      '.n-base-selection-input__content, .n-base-selection-label__render-label .n-base-selection-overlay__wrapper',
    )
    const values = copy.querySelector<HTMLElement>('.pavp-form-choice-detail__values')
    // Custom detail slots have no shared truncation contract. Do not infer it
    // from label length or show an empty/unmeasured information action.
    overflow.value =
      label !== null
        ? label.clientWidth > 0 && label.scrollWidth > label.clientWidth
        : values !== null && values.getBoundingClientRect().width > owner.clientWidth
  } finally {
    copy.remove()
  }
}
let measurementFrame: number | undefined
let resizeObserver: ResizeObserver | undefined
let mutationObserver: MutationObserver | undefined
function scheduleMeasurement(): void {
  if (measurementFrame !== undefined) return
  measurementFrame = requestAnimationFrame(() => {
    measurementFrame = undefined
    measureOverflow()
  })
}
onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleMeasurement)
  if (root.value !== null) resizeObserver.observe(root.value)
  mutationObserver = new MutationObserver(scheduleMeasurement)
  if (content.value !== null)
    mutationObserver.observe(content.value, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    })
  document.fonts.addEventListener('loadingdone', scheduleMeasurement)
  scheduleMeasurement()
})
onScopeDispose(() => {
  resizeObserver?.disconnect()
  mutationObserver?.disconnect()
  document.fonts.removeEventListener('loadingdone', scheduleMeasurement)
  if (measurementFrame !== undefined) cancelAnimationFrame(measurementFrame)
})
function focusContent(): void {
  const target =
    content.value?.querySelector<HTMLElement>('[tabindex="0"], input:not(:disabled)') ??
    content.value
  target?.focus({ preventScroll: true })
}
watch(showAction, (show) => {
  if (!show && root.value?.querySelector('.pavp-form-choice__status') === document.activeElement)
    focusContent()
})
const description = computed(
  () => [statusText.value, ...labels.value].filter(Boolean).join(' · ') || props.form.copy.empty(),
)
const canRetry = computed(() => failed.value || (paged.value && unknown.value))
const directRetry = computed(() => failed.value && !paged.value)
const retryDisabled = computed(
  () =>
    props.binding.disabled || props.form.submitting.value || props.form.phase.value === 'disposed',
)
const canRemoveUnknown = computed(
  () => unknown.value && !props.readonly && !props.binding.readonly && !retryDisabled.value,
)
// Complete-list mutation retains its existing disabled-option rule. Paged recovery
// may retain disabled selected evidence while removing only missing identities.
const remainingValues = computed(() =>
  selected.value.filter((value) => !unknownValues.value.includes(value)),
)
const removalBlocked = computed(
  () =>
    new Set(remainingValues.value).size !== remainingValues.value.length ||
    (!paged.value &&
      remainingValues.value.some((value) =>
        props.binding.options.some((option) => option.value === value && option.disabled === true),
      )),
)
const blockedRemovalTitle = computed(() =>
  removalBlocked.value
    ? `${props.form.copy.invalidValue()}: ${
        props.binding.selectedOptions
          .flatMap((item) =>
            item.option?.disabled === true ? [props.form.text(item.option.label)] : [],
          )
          .join(', ') || remainingValues.value.join(', ')
      }`
    : undefined,
)
let focusRequest = 0
async function showDetails(show: boolean): Promise<void> {
  const request = ++focusRequest
  expanded.value = show
  if (show) {
    await nextTick()
    if (request === focusRequest && expanded.value && details.value?.isConnected)
      details.value.focus({ preventScroll: true })
  }
}
async function closeDetails(): Promise<void> {
  const request = ++focusRequest
  expanded.value = false
  await nextTick()
  const trigger = root.value?.querySelector<HTMLButtonElement>('.pavp-form-choice__status')
  if (request !== focusRequest) return
  if (trigger?.isConnected) trigger.focus({ preventScroll: true })
  else focusContent()
}
function removeUnknown(): void {
  if (!canRemoveUnknown.value || removalBlocked.value) return
  const result = props.binding.setValue(
    Array.isArray(props.binding.value) ? [...remainingValues.value] : null,
  )
  if (result === 'applied' || result === 'unchanged') void closeDetails()
}
function retry(): void {
  if (retryDisabled.value) return
  void closeDetails()
  if (paged.value) props.binding.retryOptions('selection')
  else props.binding.retryOptions()
}
</script>

<template>
  <div
    ref="root"
    class="pavp-form-choice flex min-w-0 w-full items-start relative gap-component-unit"
    :data-options-state="binding.optionsState"
    :data-options-empty="binding.optionsState === 'ready' && binding.options.length === 0"
  >
    <div
      ref="content"
      class="flex-1 min-w-0"
      tabindex="-1"
      :aria-label="label"
    >
      <slot :status-text="statusText" />
    </div>
    <NPopover
      v-if="showAction"
      :show="expanded"
      trigger="manual"
      placement="bottom-end"
      :animated="false"
      :show-arrow="false"
      to="#pavp-overlay-root"
      class="pavp-form-feedback-popover"
      scrollable
      @clickoutside="expanded = false"
      @keydown.esc.stop.prevent="closeDetails"
    >
      <template #trigger>
        <NButton
          attr-type="button"
          text
          class="pavp-form-choice__status p-0 rounded-control flex shrink-0 cursor-pointer items-center justify-center text-caption"
          :class="
            failed ? 'text-text-primary bg-surface-panel' : 'text-text-secondary bg-transparent'
          "
          :data-failed="failed"
          :aria-label="`${label}: ${description}${directRetry ? ` · ${form.copy.retryOptions()}` : ''}`"
          :title="`${label}: ${description}`"
          :aria-expanded="expanded"
          :aria-controls="`${binding.controlId}-option-details`"
          :aria-haspopup="directRetry ? undefined : 'dialog'"
          :aria-disabled="directRetry && retryDisabled"
          @click="directRetry ? retry() : showDetails(!expanded)"
        >
          <span
            v-if="directRetry"
            class="truncate"
            v-text="form.copy.retryOptions()"
          />
          <span
            v-else
            :class="statusText ? 'i-lucide-info' : 'i-lucide-list-checks'"
            class="size-icon-small"
            aria-hidden="true"
          />
        </NButton>
      </template>
      <div
        :id="`${binding.controlId}-option-details`"
        ref="details"
        class="pavp-form-choice__details grid min-w-0 gap-content-gap text-body"
        role="dialog"
        tabindex="-1"
        :aria-label="label"
      >
        <p class="font-title-weight m-0">
          {{ label }}
        </p>
        <p
          v-if="statusText"
          class="m-0 break-words"
        >
          {{ statusText }}
        </p>
        <ul
          v-if="labels.length"
          class="m-0 p-0 list-inside grid break-words gap-component-unit"
        >
          <li
            v-for="(value, index) in labels"
            :key="index"
          >
            {{ value }}
          </li>
        </ul>
        <p
          v-else-if="!statusText"
          class="m-0"
        >
          {{ form.copy.empty() }}
        </p>
        <p
          v-if="unknown"
          class="m-0 break-words"
        >
          {{ form.copy.invalidValue() }}: {{ unknownValues.join(', ') }}
        </p>
        <NButton
          v-if="canRemoveUnknown"
          class="min-h-target-enhanced min-w-target-enhanced"
          :aria-label="`${label}: ${form.copy.removeItem()} · ${unknownValues.join(', ')}`"
          :disabled="removalBlocked"
          :title="blockedRemovalTitle"
          @click="removeUnknown"
        >
          {{ form.copy.removeItem() }}
        </NButton>
        <NButton
          v-if="canRetry"
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="retryDisabled"
          @click="retry"
        >
          {{ form.copy.retryOptions() }}
        </NButton>
      </div>
    </NPopover>
    <p
      :id="`${binding.controlId}-options`"
      class="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ description }}
    </p>
  </div>
</template>

<style>
@layer components {
  .pavp-form-choice__status {
    inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
    block-size: var(--ui-layout-target-enhanced-minimum-block-size);
    border-color: var(--ui-color-border-default);
    border-style: solid;
    border-width: var(--ui-admin-border-width);
  }
  .pavp-form-choice__status:focus-visible,
  .pavp-form-choice__details:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
}
</style>

<style>
.pavp-form-choice__status.n-button {
  inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
  block-size: var(--ui-layout-target-enhanced-minimum-block-size);
  color: var(--ui-color-text-secondary);
  border-width: var(--ui-admin-border-width);
  border-style: solid;
  border-color: var(--ui-color-border-default);
  border-radius: var(--ui-radius-control);
}
.pavp-form-choice__status.n-button[data-failed='true'] {
  color: var(--ui-color-text-primary);
  background-color: var(--ui-color-surface-panel);
}
</style>
