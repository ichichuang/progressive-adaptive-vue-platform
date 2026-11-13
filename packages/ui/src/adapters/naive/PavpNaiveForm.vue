<script setup lang="ts" generic="I">
import { NForm } from 'naive-ui/es/form'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  ref,
  useAttrs,
  useTemplateRef,
  watchPostEffect,
  type ComponentPublicInstance,
} from 'vue'
import {
  revealOwnedScrollTarget,
  type ScrollTargetReceipt,
} from '../../components/scroll-target-owner'
import type { UiFormController, UiFormMode } from '../../components/form-contracts'
import { formNativeAttributes } from '../../components/form-native-attributes'
import { useFormPresentation } from '../../composables/form-presentation'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-form-theme'

defineOptions({ name: 'PavpNaiveForm', inheritAttrs: false })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly columns: 1 | 2
  readonly mode: UiFormMode
}>()
defineSlots<{ default: () => unknown; actions: () => unknown }>()
const attrs = useAttrs()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiForm requires UiProvider.')
const theme = computed(() => createPavpNaiveFormThemeProjection(appearance.value).Form)
const { announcement, presentation, canFocus, label } = useFormPresentation(props)
const summary = useTemplateRef<InstanceType<typeof NButton>>('summary')
const formElement = useTemplateRef<ComponentPublicInstance>('formElement')
const summaryExpanded = ref(false)
const summaryDetails = useTemplateRef<HTMLElement>('summaryDetails')
const feedbackLabel = computed(() =>
  props.form.issues.value.length
    ? `${props.form.copy.errorSummary(props.form.issues.value.length)} (${String(props.form.issues.value.length)})`
    : announcement.value,
)
async function showSummary(show: boolean): Promise<void> {
  summaryExpanded.value = show
  if (show) {
    await nextTick()
    summaryDetails.value?.focus({ preventScroll: true })
  }
}
function closeSummary(): void {
  summaryExpanded.value = false
  focusSummary()
}
function focusSummary(): void {
  const element: unknown = summary.value?.$el
  if (element instanceof HTMLElement) element.focus({ preventScroll: true })
}
function canNavigateIssue(field: string | null): field is string {
  if (field === null) return false
  if (canFocus(field)) return true
  if (props.form.stepIndexForField(field) === null) return false
  const state = props.form.nodeState(field)
  return !state.hidden && !state.disabled && !state.readonly
}
async function focusIssue(field: string): Promise<void> {
  const form = props.form
  const owner = presentation.value
  const step = form.stepIndexForField(field)
  if (step !== null && step !== form.activeStepIndex.value) {
    const outcome = await form.setActiveStep(step, { relax: true })
    if (outcome !== 'applied') return
  }
  summaryExpanded.value = false
  cancelFeedback()
  const current = request
  await nextTick()
  await nextTick()
  if (current !== request || props.form !== form || presentation.value !== owner) return
  const located = locateFirstIssue(true, field)
  if (located === undefined) return
  receipt = located.receipt
  const ready = await receipt.settled
  if (current !== request || props.form !== form || presentation.value !== owner) return
  receipt = undefined
  if (!ready) return
  owner.focusField(field)
  owner.requestFeedback(field, owner.feedbackRevision.value)
}
function locateFirstIssue(
  scroll: boolean,
  selectedField?: string,
): { field: string; receipt: ScrollTargetReceipt } | undefined {
  const root: unknown = formElement.value?.$el
  if (!(root instanceof HTMLElement)) return undefined
  const elements = [...root.querySelectorAll<HTMLElement>('[id]')]
  for (const issue of props.form.issues.value) {
    if (selectedField !== undefined && issue.field !== selectedField) continue
    if (!canFocus(issue.field)) continue
    const scope = presentation.value.feedbackScope.value
    if (selectedField === undefined && scope !== undefined && !issue.field.startsWith(scope))
      continue
    const id = presentation.value.nodeControlId(issue.field)
    const matches = elements.filter((element) => element.id === id)
    const target = matches.length === 1 ? matches[0] : undefined
    if (
      target === undefined ||
      target.getClientRects().length === 0 ||
      target.closest('[inert]') !== null ||
      target.matches(':disabled') ||
      ['hidden', 'collapse'].includes(getComputedStyle(target).visibility)
    )
      continue
    const labelId = target.getAttribute('aria-labelledby')
    const label = elements.find((element) => element.id === labelId)
    // Group/repeat sections may be taller than the viewport. Their heading is
    // the useful location, while leaf fields reveal their label and control.
    const receipt = revealOwnedScrollTarget(
      target.tagName === 'SECTION' && label !== undefined ? label : target,
      target.tagName === 'SECTION' ? undefined : label,
      scroll,
    )
    if (receipt !== undefined) return { field: issue.field, receipt }
  }
}
let feedbackOwner = presentation.value
let focusedRevision = -1
let feedbackRevision = -1
let receipt: ScrollTargetReceipt | undefined
let request = 0
function cancelFeedback(): void {
  request += 1
  receipt?.cancel()
  receipt = undefined
}
watchPostEffect(() => {
  const owner = presentation.value
  if (owner !== feedbackOwner) {
    cancelFeedback()
    feedbackOwner = owner
    focusedRevision = -1
    feedbackRevision = -1
  }
  const summaryRevision = owner.summaryRevision.value
  const revision = owner.feedbackRevision.value
  // Reading values and phase makes edits, reset and a superseding attempt cancel
  // an old receipt even before its replacement validation result arrives.
  void props.form.values.value
  void props.form.phase.value
  if (props.mode !== 'edit' || !owner.isFeedbackCurrent(revision)) cancelFeedback()
  if (props.mode !== 'edit' || !feedbackLabel.value) summaryExpanded.value = false
  // Summary focus can blur an input and briefly start an automatic check.
  // Keep this failure's reveal intent when that check settles; focusing the
  // summary is a one-time action, not the lifetime of the reveal request.
  const revealFailure = props.mode === 'edit' && owner.isSummaryCurrent(summaryRevision)
  if (revealFailure && summaryRevision !== focusedRevision && summary.value !== null) {
    focusedRevision = summaryRevision
    const root: unknown = formElement.value?.$el
    // Keep active form input intact: moving focus could make vendor controls
    // discard an unfinished edit buffer while reporting its input issue.
    if (!(root instanceof HTMLElement) || !root.contains(document.activeElement)) focusSummary()
  }
  if (props.mode !== 'edit' || revision === feedbackRevision || !owner.isFeedbackCurrent(revision))
    return
  feedbackRevision = revision
  cancelFeedback()
  // Wait for step field remounts after activeStepIndex changes with the feedback.
  const current = ++request
  void nextTick()
    .then(() => nextTick())
    .then(() => {
      if (current !== request || !owner.isFeedbackCurrent(revision) || presentation.value !== owner)
        return
      const located = locateFirstIssue(revealFailure)
      if (located === undefined) return
      receipt = located.receipt
      void located.receipt.settled.then((ready) => {
        if (current !== request) return
        receipt = undefined
        if (
          ready &&
          props.mode === 'edit' &&
          presentation.value === owner &&
          owner.isFeedbackCurrent(revision)
        )
          owner.requestFeedback(located.field, revision)
      })
    })
})
onBeforeUnmount(cancelFeedback)
</script>

<template>
  <NForm
    v-bind="formNativeAttributes(attrs)"
    :id="form.formId"
    ref="formElement"
    class="pavp-form"
    :data-columns="columns"
    novalidate
    label-placement="top"
    :show-require-mark="false"
    :theme-overrides="theme"
    @submit.prevent="mode === 'edit' && form.submit()"
    @reset.prevent="mode === 'edit' && form.reset()"
  >
    <div>
      <slot />
    </div>
    <div
      v-if="mode === 'edit'"
      class="pavp-form__actions"
    >
      <div class="flex flex-wrap min-w-0 gap-content-gap">
        <slot name="actions" />
      </div>
      <div class="pavp-form__feedback-slot">
        <NPopover
          :show="summaryExpanded"
          trigger="click"
          placement="top-start"
          :animated="false"
          :show-arrow="false"
          to="#pavp-overlay-root"
          class="pavp-form-feedback-popover"
          scrollable
          @update:show="showSummary"
          @keydown.esc.stop.prevent="closeSummary"
        >
          <template #trigger>
            <NButton
              ref="summary"
              attr-type="button"
              text
              class="pavp-form__summary leading-body p-0 border-0 bg-transparent flex h-full w-full items-center justify-center gap-component-unit text-caption"
              :class="feedbackLabel ? '' : 'invisible'"
              :tabindex="feedbackLabel ? 0 : -1"
              :aria-hidden="!feedbackLabel"
              :aria-label="feedbackLabel"
              :aria-expanded="summaryExpanded"
              :aria-controls="`${form.formId}-summary`"
              aria-haspopup="dialog"
            >
              <span
                v-if="form.issues.value.length < 100"
                :class="form.issues.value.length ? 'i-lucide-circle-alert' : 'i-lucide-info'"
                class="shrink-0 size-icon-extra-small"
                aria-hidden="true"
              />
              <span
                v-if="form.issues.value.length"
                aria-hidden="true"
                v-text="form.issues.value.length > 99 ? '99+' : form.issues.value.length"
              />
            </NButton>
          </template>
          <div
            :id="`${form.formId}-summary`"
            ref="summaryDetails"
            class="pavp-form__summary-details grid gap-content-gap"
            role="dialog"
            tabindex="-1"
            :aria-label="feedbackLabel"
          >
            <p class="leading-body font-title-weight m-0 text-body">
              {{ feedbackLabel }}
            </p>
            <ul
              v-if="form.issues.value.length"
              class="leading-body m-0 p-0 list-inside grid break-words gap-content-gap text-body"
            >
              <li
                v-for="(issue, index) in form.issues.value"
                :key="index"
              >
                <NButton
                  v-if="canNavigateIssue(issue.field)"
                  tag="a"
                  text
                  :href="`#${presentation.nodeControlId(issue.field)}`"
                  class="pavp-form__issue-link text-inherit underline"
                  @click.prevent="focusIssue(issue.field)"
                >
                  {{ `${label(issue.field)}: ${issue.message()}` }}
                </NButton>
                <span v-else>{{ label(issue.field) }} {{ issue.message() }}</span>
              </li>
            </ul>
            <p
              v-if="form.issues.value.length && announcement"
              class="leading-body m-0 break-words text-body"
            >
              {{ announcement }}
            </p>
          </div>
        </NPopover>
      </div>
    </div>
    <p
      v-if="mode === 'edit'"
      class="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {{ feedbackLabel }}
    </p>
  </NForm>
</template>

<style>
@layer components {
  .pavp-form__actions {
    display: flex;
    align-items: flex-end;
    gap: var(--ui-space-content-gap);
  }

  .pavp-form__feedback-slot {
    inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
    block-size: var(--ui-layout-target-enhanced-minimum-block-size);
    flex-shrink: 0;
  }
  .pavp-form__summary {
    color: var(--ui-color-text-primary);
    cursor: pointer;
  }
  .pavp-form__summary:focus-visible,
  .pavp-form__summary-details:focus-visible,
  .pavp-form__summary-details a:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
}
@layer vendor-overrides {
  .pavp-form-feedback-popover {
    max-block-size: calc(
      (100dvh - var(--ui-layout-target-enhanced-minimum-block-size)) / 2 -
        var(--ui-space-content-gap)
    );
    max-inline-size: min(
      var(--ui-layout-content-max-width),
      calc(100vw - var(--ui-space-page-inline) * 2)
    );
  }
}
</style>

<style>
.pavp-form__summary.n-button {
  inline-size: 100%;
  block-size: 100%;
  color: var(--ui-color-text-primary);
}
.pavp-form__summary.n-button .n-button__content {
  gap: var(--ui-space-component-unit);
}
.pavp-form__issue-link.n-button,
.pavp-form__issue-link.n-button .n-button__content {
  max-inline-size: 100%;
  block-size: auto;
  white-space: normal;
  overflow-wrap: anywhere;
  text-align: start;
  line-height: var(--ui-font-line-height-body);
}
</style>
