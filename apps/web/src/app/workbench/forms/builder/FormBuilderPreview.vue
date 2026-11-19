<script setup lang="ts">
import {
  type HTMLAttributes,
  type ButtonHTMLAttributes,
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  watch,
} from 'vue'

import { NButton } from 'naive-ui/es/button'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import {
  UiForm,
  UiScrollArea,
  UiCopyAction,
  useUiDynamicForm,
  type UiFormSchema,
  type UiFormValue,
  type UiScrollController,
} from '@platform/ui'
import { formDraftSignature } from '../../../forms/form-draft-signature'
import { routerScrollControllerKey } from '../../../router/router-scroll-controller'
import { useFormShowcase, useFormExampleCheck } from '../form-showcase'
import { formatConfigurationList } from '../../configuration/configuration-diagnostic'
import { useFormExampleUndo } from '../use-form-example-undo'
import { builderEntries, builderKinds, type BuilderKind } from './use-form-builder'
import { builderAttachments } from './builder-attachments'
import { builderMigrationPolicy } from './form-preview-values'
import type { BuilderTrialState } from './form-builder-draft'

const props = defineProps<{
  readonly schema: UiFormSchema
  readonly pending: boolean
  readonly initialValues?: Record<string, UiFormValue> | undefined
}>()
const emit = defineEmits<{
  add: [kind: BuilderKind]
  change: [state: BuilderTrialState]
}>()
function acceptField(event: DragEvent): void {
  if (event.dataTransfer)
    event.dataTransfer.dropEffect =
      !props.pending && event.dataTransfer.types.includes('application/x-pavp-form-field')
        ? 'copy'
        : 'none'
}
function dropField(event: DragEvent): void {
  const kind = event.dataTransfer?.getData('application/x-pavp-form-field')
  if (!props.pending && kind && Object.hasOwn(builderKinds, kind)) emit('add', kind as BuilderKind)
}
const { t, copy, locale } = useFormShowcase()
const hasAttachments = computed(() =>
  builderEntries(props.schema).some(({ node }) => node.kind === 'attachment'),
)
const resetFields = ref<readonly string[]>([])
const resetNotice = computed(() =>
  resetFields.value.length
    ? `${t('formBuilder.valuesReset')} ${formatConfigurationList(resetFields.value, locale.value)}`
    : '',
)
const attachmentBlobs = new Map<string, Blob>()
const dynamic = useUiDynamicForm({
  formId: 'visual-builder-preview',
  schema: props.schema,
  initial: { draftId: 'visual-builder-preview', values: {} },
  copy,
  migrationPolicy: builderMigrationPolicy,
  // Imported source names remain JSON references, never executable endpoints.
  resolveRuntime: (schema) => ({ attachments: builderAttachments(schema, attachmentBlobs) }),
})
const form = dynamic.form
// Recovery changes trial values, never the accepted reset baseline.
if (props.initialValues) form.value.replaceValues(props.initialValues)
const check = useFormExampleCheck(() => form.value)
let disposed = false
const isDisposed = () => disposed
const controls = ref<HTMLElement | null>(null)
const controlsFocused = ref(false)
function ownsFocus(target: EventTarget | null): boolean {
  return (
    form.value.schema.fields.length > 0 &&
    target instanceof Node &&
    Boolean(controls.value?.contains(target))
  )
}
function updateFocus(): void {
  controlsFocused.value = ownsFocus(document.activeElement)
}
function afterFocusOut(event: FocusEvent): void {
  if (event.relatedTarget !== null) {
    controlsFocused.value = ownsFocus(event.relatedTarget)
    return
  }
  queueMicrotask(() => {
    if (!disposed) updateFocus()
  })
}
watch(
  [() => props.schema, () => form.value.hasPendingInput.value, () => controlsFocused.value],
  async ([schema, pendingInput, focused]) => {
    if (
      disposed ||
      pendingInput ||
      focused ||
      formDraftSignature(schema) === formDraftSignature(form.value.schema)
    )
      return
    const outcome = await dynamic.replaceSchema(schema)
    if (isDisposed()) return
    if (outcome.status === 'applied' || outcome.status === 'unchanged') {
      if (outcome.status === 'applied') resetFields.value = outcome.resetFields
    }
  },
  // Let synchronous input commitment finish before replacing its controller.
  { flush: 'post' },
)
onScopeDispose(() => {
  disposed = true
  attachmentBlobs.clear()
})
const previewHeld = computed(
  () => formDraftSignature(props.schema) !== formDraftSignature(form.value.schema),
)
const previewHint = computed(() =>
  previewHeld.value
    ? t('formBuilder.previewHeld')
    : form.value.hasPendingInput.value
      ? t('formBuilder.previewPendingHint')
      : '',
)
const modelNotice = computed(() =>
  previewHeld.value
    ? t('formBuilder.previewHeldShort')
    : form.value.hasPendingInput.value
      ? t('formBuilder.previewPendingShort')
      : resetNotice.value,
)
const history = useFormExampleUndo(() => form.value)
async function startField(): Promise<void> {
  emit('add', 'text')
  await nextTick()
  controls.value?.querySelector<HTMLInputElement>('input')?.focus()
}
watch(
  () => [form.value, form.value.hasPendingInput.value, form.value.revision.value],
  () => {
    emit('change', {
      schema: form.value.schema,
      values: form.value.getValues(),
      pending: form.value.hasPendingInput.value,
      revision: form.value.revision.value,
    })
  },
  { immediate: true, flush: 'post' },
)
const checked = check.checked
const modelHint = computed(
  () =>
    previewHint.value ||
    (form.value.issues.value.length
      ? t('formShowcase.checkInvalid')
      : checked.value === 'valid'
        ? t('formShowcase.checkValid')
        : ''),
)
const validate = check.validate
const clearCheck = () => {
  check.clearCheck()
  resetFields.value = []
}
function reset(): void {
  if (form.value.hasPendingInput.value || form.value.phase.value !== 'idle') return
  controlsFocused.value = false
  form.value.reset()
  clearCheck()
}
const model = computed(() => JSON.stringify(form.value.values.value, null, 2))
const json = computed(() => JSON.stringify(props.schema, null, 2))
const compactModel = computed(() => JSON.stringify(form.value.values.value))
const compactJson = computed(() => JSON.stringify(props.schema))
const active = ref(true)
const mode = ref<'edit' | 'detail'>('edit')
const issues = computed(() =>
  form.value.issues.value.map((issue) => ({
    path: issue.field,
    label: `${issue.field === null ? t('configuredForm.errorSummary') : form.value.nodeLabel(issue.field)}: ${issue.message()}`,
    canLocate:
      mode.value === 'edit' && issue.field !== null && form.value.canFocusField(issue.field),
  })),
)
function locate(path: string | null): void {
  if (mode.value === 'edit' && path !== null) form.value.focusField(path)
}
function chooseMode(value: string | number | boolean): void {
  if (!form.value.hasPendingInput.value && (value === 'edit' || value === 'detail'))
    mode.value = value
}
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('The form builder requires the Router Scroll Controller port.')
let release: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  release?.()
  release = undefined
  if (controller && active.value) release = register?.(controller)
}
onActivated(() => {
  active.value = true
  updateFocus()
})
onDeactivated(() => {
  active.value = false
  controlsFocused.value = false
  connect(null)
})
onScopeDispose(() => {
  connect(null)
})
</script>
<template>
  <div
    class="wb-builder-preview-layout grid grid-cols-1 min-h-0 min-w-0 gap-content-gap layout-narrow:grid-cols-1"
  >
    <section
      class="wb-builder-canvas border-0 rounded-panel flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
      :aria-label="t('formBuilder.preview')"
      @submit.capture.stop.prevent="validate"
      @input.capture="clearCheck"
    >
      <header
        class="wb-form-panel-header flex shrink-0 flex-wrap min-w-0 items-center gap-component-unit"
      >
        <h2 class="font-title-weight m-0 mr-auto text-body text-text-primary layout-narrow:hidden">
          {{ t('formBuilder.preview') }}
        </h2>
        <NRadioGroup
          name="form-builder-preview-mode"
          :value="mode"
          :disabled="form.hasPendingInput.value"
          v-bind="
            {
              role: 'radiogroup',
              'aria-label': t('formBuilder.preview'),
              title: previewHint || undefined,
            } satisfies HTMLAttributes
          "
          @update:value="chooseMode"
        >
          <NRadioButton value="edit">
            {{ t('formBuilder.edit') }}
          </NRadioButton>
          <NRadioButton value="detail">
            {{ t('formBuilder.view') }}
          </NRadioButton>
        </NRadioGroup>
      </header>
      <UiScrollArea
        class="flex-1 min-h-0 min-w-0"
        owner-id="architecture-console-content"
        :enabled="active"
        v-bind="
          {
            onDragenter: (event: DragEvent) => {
              event.preventDefault()
              acceptField(event)
            },
            onDragover: (event: DragEvent) => {
              event.preventDefault()
              acceptField(event)
            },
            onDrop: (event: DragEvent) => {
              event.preventDefault()
              dropField(event)
            },
          } satisfies HTMLAttributes
        "
        @controller="connect"
      >
        <div
          ref="controls"
          class="wb-form-scroll-content grid min-w-0 gap-content-gap"
          @focusin="updateFocus"
          @focusout="afterFocusOut"
        >
          <p
            v-if="hasAttachments"
            class="m-0 text-caption text-text-secondary"
          >
            {{ t('formBuilder.attachmentPreview') }}
          </p>
          <div
            v-if="!form.schema.fields.length"
            class="text-center grid min-w-0 justify-items-center gap-content-gap py-section-block text-text-secondary"
          >
            <span
              class="i-lucide-panels-top-left size-icon-large text-control-primary"
              aria-hidden="true"
            />
            <p class="m-0 text-body">
              {{ t('formBuilder.previewEmpty') }}
            </p>
            <NButton
              type="primary"
              :disabled="pending"
              @click="startField"
            >
              <template #icon>
                <span
                  class="i-lucide-plus"
                  aria-hidden="true"
                />
              </template>
              {{ t('formBuilder.startText') }}
            </NButton>
          </div>
          <UiForm
            v-else
            :form="form"
            :mode="mode"
            class="grid min-w-0 gap-content-gap"
          >
            <template #actions>
              <span />
            </template>
          </UiForm>
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap min-w-0 items-center bg-surface-panel gap-content-gap"
      >
        <NButton
          type="primary"
          attr-type="submit"
          v-bind="
            {
              onPointerdown: (event: PointerEvent) => event.preventDefault(),
              form: form.formId,
            } satisfies ButtonHTMLAttributes
          "
          :disabled="mode === 'detail' || !form.schema.fields.length || form.phase.value !== 'idle'"
        >
          {{ t('formBuilder.check') }}
        </NButton>
        <NButton
          secondary
          :disabled="
            !form.schema.fields.length || form.hasPendingInput.value || form.phase.value !== 'idle'
          "
          v-bind="
            {
              title: form.hasPendingInput.value ? t('formBuilder.previewPendingHint') : undefined,
            } satisfies ButtonHTMLAttributes
          "
          @click="reset"
        >
          {{ t('configuredForm.reset') }}
        </NButton>
        <NButton
          secondary
          :disabled="!history.canUndo.value"
          v-bind="
            {
              title: form.hasPendingInput.value
                ? t('formBuilder.previewPendingHint')
                : t('formShowcase.undoHint'),
            } satisfies ButtonHTMLAttributes
          "
          @click="history.undo"
        >
          {{ t('formShowcase.undo') }}
        </NButton>
        <span
          class="min-w-0 break-words text-caption text-text-secondary layout-narrow:hidden"
          role="status"
          aria-live="polite"
        >
          {{ previewHint || t('formBuilder.localOnly') }}
        </span>
      </footer>
    </section>
    <aside
      class="wb-builder-output grid grid-cols-2 grid-rows-1 min-h-0 min-w-0 gap-content-gap layout-narrow:grid-cols-2 layout-narrow:grid-rows-1"
      :aria-label="t('formBuilder.output')"
    >
      <section
        class="wb-builder-code border-0 rounded-panel flex flex-col min-h-0 min-w-0 order-2 overflow-hidden bg-surface-panel"
        :aria-label="t('formBuilder.schema')"
      >
        <header class="wb-builder-code-header flex shrink-0 min-w-0 items-center">
          <h2 class="sr-only">
            {{ t('formBuilder.schemaTitle') }}
          </h2>
          <UiCopyAction
            :key="pending ? 'pending' : 'accepted'"
            variant="text"
            :value="json"
            :label="t('formBuilder.schemaTitle')"
            :copy-label="t('formBuilder.copyJson')"
            :success-label="t('formBuilder.copySuccess')"
            :failure-label="t('formBuilder.copyFailure')"
            :disabled="pending"
          />
        </header>
        <UiScrollArea
          class="flex-1 min-h-0 min-w-0"
          owner-id="form-builder-schema"
          :enabled="active"
        >
          <div class="wb-form-scroll-content min-w-0">
            <pre
              class="m-0 min-w-0 whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:hidden"
              v-bind="{ 'data-builder-schema': '' }"
              v-text="json"
            />
            <pre
              class="m-0 min-w-0 hidden whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:block"
              v-bind="{ 'data-builder-schema-compact': '' }"
              v-text="compactJson"
            />
          </div>
        </UiScrollArea>
      </section>
      <section
        class="wb-builder-code border-0 rounded-panel flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
        :aria-label="t('formBuilder.model')"
      >
        <header class="wb-builder-code-header flex shrink-0 min-w-0 items-center">
          <h2 class="sr-only">
            {{ t('formBuilder.modelTitle') }}
          </h2>
          <div class="grid min-w-0">
            <UiCopyAction
              :key="previewHint ? 'pending' : 'accepted'"
              class="col-start-1 row-start-1"
              :class="{ invisible: Boolean(previewHint) }"
              variant="text"
              :disabled="Boolean(previewHint)"
              :value="model"
              :label="t('formBuilder.modelTitle')"
              :copy-label="t('formShowcase.copyData')"
              :success-label="t('formBuilder.copySuccess')"
              :failure-label="t('formBuilder.copyFailure')"
              v-bind="{ 'aria-hidden': previewHint ? true : undefined } satisfies HTMLAttributes"
            />
            <span
              v-if="previewHint"
              class="col-start-1 row-start-1 min-w-full w-0 truncate self-center text-caption text-text-secondary"
              role="status"
              aria-live="polite"
              :title="previewHint"
              v-text="modelNotice"
            />
          </div>
          <span
            v-if="!previewHint && resetNotice"
            class="ml-auto truncate text-caption text-text-secondary"
            role="status"
            :title="resetNotice"
            v-text="resetNotice"
          />
        </header>
        <UiScrollArea
          class="flex-1 min-h-0 min-w-0"
          owner-id="form-builder-model"
          :enabled="active"
        >
          <div class="wb-form-scroll-content grid min-w-0 gap-component-unit">
            <ul
              v-if="issues.length"
              class="m-0 p-0 list-none grid min-w-0 gap-component-unit"
              :aria-label="t('formShowcase.issues')"
            >
              <li
                v-for="(issue, index) in issues"
                :key="index"
                class="min-w-0 text-caption text-control-error"
              >
                <NButton
                  v-if="issue.canLocate"
                  text
                  type="error"
                  class="max-w-full min-h-target-enhanced"
                  @click="locate(issue.path)"
                >
                  <span
                    class="text-left underline min-w-0 whitespace-normal break-words text-caption"
                    v-text="issue.label"
                  />
                </NButton>
                <span
                  v-else
                  class="break-words"
                  v-text="issue.label"
                />
              </li>
            </ul>
            <div class="min-w-0">
              <pre
                class="m-0 min-w-0 whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:hidden"
                v-bind="{ 'data-builder-model': '' }"
                v-text="model"
              />
              <pre
                class="m-0 min-w-0 hidden whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:block"
                v-bind="{ 'data-builder-model-compact': '' }"
                v-text="compactModel"
              />
            </div>
            <span
              role="status"
              aria-live="polite"
              class="text-caption text-text-secondary"
              :class="{ 'sr-only': !modelHint }"
              v-text="modelHint"
            />
          </div>
        </UiScrollArea>
      </section>
    </aside>
  </div>
</template>
