<script setup lang="ts">
import {
  computed,
  effectScope,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import {
  UiForm,
  UiScrollArea,
  UiCopyAction,
  useUiForm,
  type UiFormSchema,
  type UiFormValue,
  type UiFormReadonlyValue,
  type UiScrollController,
} from '@platform/ui'
import { routerScrollControllerKey } from '../../../router/router-scroll-controller'
import { useFormShowcase, useFormExampleCheck } from '../form-showcase'
import { useFormExampleUndo } from '../use-form-example-undo'
import { builderKinds, type BuilderKind } from './use-form-builder'
import { previewValues } from './form-preview-values'
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
const { t, copy } = useFormShowcase()
const resetFields = ref<readonly string[]>([])
const resetNotice = computed(() =>
  resetFields.value.length ? `${t('formBuilder.valuesReset')} ${resetFields.value.join('、')}` : '',
)
function createPreview(schema: UiFormSchema) {
  const form = useUiForm({
    formId: 'visual-builder-preview',
    schema,
    initial: { draftId: 'visual-builder-preview', values: {} },
    copy,
  })
  const defaults = JSON.parse(JSON.stringify(form.values.value)) as Readonly<
    Record<string, UiFormReadonlyValue>
  >
  return { sourceSchema: schema, form, defaults, ...useFormExampleCheck(form) }
}
// A controller's schema is immutable. Keep its mounted controls while any raw input is pending.
let formScope = effectScope()
const initialPreview = formScope.run(() => createPreview(props.schema))
if (!initialPreview) throw new Error('The form builder preview scope is unavailable.')
// Recovery changes current values, never the schema-owned reset baseline.
if (props.initialValues) initialPreview.form.replaceValues(props.initialValues)
const preview = shallowRef(initialPreview)
let disposed = false
const controls = ref<HTMLElement | null>(null)
const controlsFocused = ref(false)
function ownsFocus(target: EventTarget | null): boolean {
  return (
    preview.value.form.schema.fields.length > 0 &&
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
  () => [props.schema, preview.value.form.hasPendingInput.value, controlsFocused.value] as const,
  ([schema, pendingInput, focused]) => {
    const previous = preview.value
    if (disposed || pendingInput || focused || schema === previous.sourceSchema) return
    const values = JSON.parse(JSON.stringify(previous.form.values.value)) as Readonly<
      Record<string, UiFormReadonlyValue>
    >
    const nextScope = effectScope()
    const next = nextScope.run(() => createPreview(schema))
    if (!next) throw new Error('The form builder preview scope is unavailable.')
    const reset: string[] = []
    next.form.setValues(
      previewValues(
        previous.form.schema.fields,
        schema.fields,
        values,
        previous.defaults,
        next.defaults,
        reset,
      ),
    )
    if (reset.length) resetFields.value = [...new Set(reset)]
    const previousScope = formScope
    formScope = nextScope
    preview.value = next
    previousScope.stop()
  },
  // Let the input's synchronous commit/reset finish before replacing its controller.
  { flush: 'post' },
)
onScopeDispose(() => {
  disposed = true
  formScope.stop()
})
const previewHeld = computed(() => props.schema !== preview.value.sourceSchema)
const previewHint = computed(() =>
  previewHeld.value
    ? t('formBuilder.previewHeld')
    : preview.value.form.hasPendingInput.value
      ? t('formBuilder.previewPendingHint')
      : '',
)
const modelNotice = computed(() =>
  previewHeld.value
    ? t('formBuilder.previewHeldShort')
    : preview.value.form.hasPendingInput.value
      ? t('formBuilder.previewPendingShort')
      : resetNotice.value,
)
const form = computed(() => preview.value.form)
const history = useFormExampleUndo(() => form.value)
async function startField(): Promise<void> {
  emit('add', 'text')
  await nextTick()
  controls.value?.querySelector<HTMLInputElement>('input')?.focus()
}
watch(
  () => [form.value.hasPendingInput.value, form.value.revision.value],
  () => {
    emit('change', {
      schema: preview.value.sourceSchema,
      values: form.value.getValues(),
      pending: form.value.hasPendingInput.value,
      revision: form.value.revision.value,
    })
  },
  { immediate: true, flush: 'sync' },
)
const checked = computed(() => preview.value.checked.value)
const modelHint = computed(
  () =>
    previewHint.value ||
    (form.value.issues.value.length
      ? t('formShowcase.checkInvalid')
      : checked.value === 'valid'
        ? t('formShowcase.checkValid')
        : ''),
)
const validate = () => preview.value.validate()
const clearCheck = () => {
  preview.value.clearCheck()
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
function toggleMode(): void {
  if (!form.value.hasPendingInput.value) mode.value = mode.value === 'edit' ? 'detail' : 'edit'
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
        class="wb-form-panel-header flex shrink-0 min-w-0 items-center overflow-x-auto gap-component-unit"
      >
        <h2 class="font-title-weight m-0 mr-auto text-body text-text-primary layout-narrow:hidden">
          {{ t('formBuilder.preview') }}
        </h2>
        <NButton
          tertiary
          :aria-pressed="mode === 'detail'"
          :disabled="form.hasPendingInput.value"
          :title="previewHint || undefined"
          @click="toggleMode"
        >
          {{ t(mode === 'edit' ? 'formBuilder.view' : 'formBuilder.edit') }}
        </NButton>
      </header>
      <UiScrollArea
        class="flex-1 min-h-0 min-w-0"
        owner-id="architecture-console-content"
        :enabled="active"
        @controller="connect"
        @dragenter.prevent="acceptField"
        @dragover.prevent="acceptField"
        @drop.prevent="dropField"
      >
        <div
          ref="controls"
          class="wb-form-scroll-content grid min-w-0 gap-content-gap"
          @focusin="updateFocus"
          @focusout="afterFocusOut"
        >
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
          :form="form.formId"
          :disabled="mode === 'detail' || !form.schema.fields.length || form.phase.value !== 'idle'"
          @pointerdown.prevent
        >
          {{ t('formBuilder.check') }}
        </NButton>
        <NButton
          secondary
          :disabled="
            !form.schema.fields.length || form.hasPendingInput.value || form.phase.value !== 'idle'
          "
          :title="form.hasPendingInput.value ? t('formBuilder.previewPendingHint') : undefined"
          @click="reset"
        >
          {{ t('configuredForm.reset') }}
        </NButton>
        <NButton
          secondary
          :disabled="!history.canUndo.value"
          :title="
            form.hasPendingInput.value
              ? t('formBuilder.previewPendingHint')
              : t('formShowcase.undoHint')
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
              data-builder-schema
              v-text="json"
            />
            <pre
              class="m-0 min-w-0 hidden whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:block"
              data-builder-schema-compact
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
              :aria-hidden="previewHint ? true : undefined"
              variant="text"
              :disabled="Boolean(previewHint)"
              :value="model"
              :label="t('formBuilder.modelTitle')"
              :copy-label="t('formShowcase.copyData')"
              :success-label="t('formBuilder.copySuccess')"
              :failure-label="t('formBuilder.copyFailure')"
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
                data-builder-model
                v-text="model"
              />
              <pre
                class="m-0 min-w-0 hidden whitespace-pre-wrap break-all text-caption text-text-primary layout-narrow:block"
                data-builder-model-compact
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
