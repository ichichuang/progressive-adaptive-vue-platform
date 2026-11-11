<script setup lang="ts" generic="I">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref } from 'vue'
import {
  UiCopyAction,
  UiScrollArea,
  type UiFormController,
  type UiScrollController,
} from '@platform/ui'
import FormLiveResult from './FormLiveResult.vue'
import WorkbenchPage from '../WorkbenchPage.vue'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import { useWorkspaceUnsavedChanges } from '../../workspace/use-workspace-unsaved-changes'
import { useConsoleI18n } from '../../../shared/i18n'
import { formCapabilities, useFormExampleCheck, type FormCapability } from './form-showcase'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly capability: FormCapability
  readonly mode?: 'edit' | 'detail'
  readonly form: UiFormController<I>
  readonly hasUnsavedChanges?: () => boolean
  readonly draftStatus?: string
  readonly submitMode?: 'validate' | 'submit'
}>()
defineSlots<{
  default: () => unknown
  controls?: () => unknown
  actions?: () => unknown
  status?: () => unknown
  insight?: () => unknown
}>()
const { t } = useConsoleI18n()
useWorkspaceUnsavedChanges(
  () => props.hasUnsavedChanges?.() ?? props.form.hasUnsavedChanges.value,
  () => [props.form.revision.value, props.hasUnsavedChanges?.()],
)
const { checked, validate, clearCheck } = useFormExampleCheck(props.form)
function submit(): void {
  if (props.mode === 'detail') return
  if (props.submitMode === 'submit') void props.form.submit()
  else void validate()
}
const capabilityInfo = computed(() => formCapabilities[props.capability])
const schemaJson = computed(() => JSON.stringify(props.form.schema, null, 2))
const copyValue = computed(() =>
  [
    t('formShowcase.aiRequest'),
    props.title,
    t(capabilityInfo.value.purpose),
    t(capabilityInfo.value.try),
    t(capabilityInfo.value.boundary),
    t('formShowcase.localBoundary'),
    capabilityInfo.value.api,
    ...capabilityInfo.value.sources,
    t('formShowcase.aiBoundary'),
    schemaJson.value,
  ].join('\n\n'),
)
const active = ref(true)
const registerScrollController = inject(routerScrollControllerKey)
if (registerScrollController === undefined)
  throw new Error('The form showcase requires the Router Scroll Controller port.')
let unregisterScrollController: (() => void) | undefined
function connectContentScroll(controller: UiScrollController | null): void {
  unregisterScrollController?.()
  unregisterScrollController = undefined
  if (controller !== null && active.value)
    unregisterScrollController = registerScrollController?.(controller)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  connectContentScroll(null)
})
onScopeDispose(() => {
  connectContentScroll(null)
})

const headings = {
  basics: 'formShowcase.basicsCanvas',
  detail: 'formShowcase.detailCanvas',
  dependencies: 'formShowcase.dependenciesCanvas',
  structure: 'formShowcase.structureCanvas',
  validation: 'formShowcase.validationCanvas',
  lifecycle: 'formLifecycle.canvas',
  options: 'formOptions.canvas',
  extension: 'formShowcase.extensionCanvas',
  layout: 'formCapabilities.layout.canvas',
  calculations: 'formCapabilities.calculations.canvas',
  controls: 'formCapabilities.controls.canvas',
  loading: 'formCapabilities.loading.canvas',
  submission: 'formCapabilities.submission.canvas',
} as const
</script>

<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        class="shrink-0"
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <div
      class="wb-form-stage flex-1 grid min-h-0 min-w-0 gap-content-gap layout-narrow:grid-rows-4"
      :data-capability="capability"
    >
      <section
        class="wb-form-canvas rounded-panel flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel layout-narrow:row-span-3"
        :aria-label="t(headings[capability])"
        @input.capture="clearCheck"
        @submit.capture.stop.prevent="submit"
      >
        <div class="flex-1 min-h-0 min-w-0">
          <UiScrollArea
            owner-id="architecture-console-content"
            :enabled="active"
            @controller="connectContentScroll"
          >
            <header
              class="wb-form-panel-header shrink-0 min-h-0 min-w-0 items-center gap-component-unit"
              :class="
                draftStatus
                  ? 'grid grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2'
                  : 'flex'
              "
            >
              <h3
                class="font-title-weight m-0 text-body text-text-primary"
                v-text="t(headings[capability])"
              />
              <div
                v-if="$slots['controls']"
                class="wb-form-controls flex-1 min-w-0"
              >
                <UiScrollArea
                  :owner-id="`${form.formId}-controls`"
                  :enabled="active"
                  x-scrollable
                >
                  <div
                    class="flex min-w-full w-max whitespace-nowrap items-center gap-component-unit"
                    role="group"
                    :aria-label="t(capabilityInfo.controls)"
                  >
                    <slot name="controls" />
                  </div>
                </UiScrollArea>
              </div>
              <span
                v-if="draftStatus"
                class="min-w-0 break-anywhere text-caption text-text-secondary"
                role="status"
                aria-live="polite"
                :title="draftStatus"
                v-text="draftStatus"
              />
            </header>
            <div class="wb-form-scroll-content grid min-w-0 gap-content-gap">
              <slot />
            </div>
          </UiScrollArea>
        </div>
        <footer
          v-if="$slots['actions'] && mode !== 'detail'"
          class="wb-form-panel-header shrink-0 min-w-0 bg-surface-panel"
        >
          <div class="wb-form-controls min-w-0">
            <UiScrollArea
              :owner-id="`${form.formId}-actions`"
              :enabled="active"
              x-scrollable
            >
              <div class="flex min-w-full w-max whitespace-nowrap items-center gap-content-gap">
                <slot name="actions" />
              </div>
            </UiScrollArea>
          </div>
        </footer>
      </section>
      <FormLiveResult
        :form="form"
        :mode="mode ?? 'edit'"
        :checked="checked"
      >
        <template
          v-if="$slots['status']"
          #status
        >
          <slot name="status" />
        </template>
        <template
          v-if="$slots['insight']"
          #insight
        >
          <slot name="insight" />
        </template>
      </FormLiveResult>
    </div>
  </WorkbenchPage>
</template>
