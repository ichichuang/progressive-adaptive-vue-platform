<script setup lang="ts" generic="I">
import { NUpload, type UploadFileInfo } from 'naive-ui/es/upload'
import { NButton } from 'naive-ui/es/button'
import { computed, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import PavpImageProcessor from '../media/PavpImageProcessor.vue'
import PavpAttachmentPreview from '../media/PavpAttachmentPreview.vue'
import { sameDraftValue } from '../../composables/form-draft-values'
import { formPresentation } from '../../composables/form-presentation'
import type {
  UiFormController,
  UiFormAttachment,
  UiFormImageProcessing,
  UiFormAttachmentResolver,
  UiFormFieldBinding,
  UiFormFieldConfig,
} from '../../components/form-contracts'
import { isFormAttachment } from '../../components/form-special-values'
import { useFormAttachments } from '../../composables/use-form-attachments'

defineOptions({ name: 'PavpNaiveFormAttachment' })
const props = defineProps<{
  readonly readonly?: boolean
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
  readonly config: Extract<UiFormFieldConfig, { kind: 'attachment' }>
}>()
const processor = ref<{
  process(file: File, options: UiFormImageProcessing, signal: AbortSignal): Promise<File | null>
}>()
const preview = ref<{
  close(): void
  open(
    attachment: UiFormAttachment,
    resolver: UiFormAttachmentResolver,
    context: { field: string; signal: AbortSignal },
    types: readonly ('image' | 'pdf')[],
  ): Promise<void>
}>()
const {
  busy,
  failed,
  choose: chooseFile,
  remove: removeFile,
  cancel,
} = useFormAttachments({
  get form() {
    return props.form
  },
  get binding() {
    return props.binding
  },
  get config() {
    return props.config
  },
  processImage: (file, options, signal) => {
    if (!processor.value) throw new TypeError('Image processor unavailable.')
    return processor.value.process(file, options, signal)
  },
})
let previewRequest: AbortController | undefined
function closePreview() {
  previewRequest?.abort()
  previewRequest = undefined
  preview.value?.close()
}
async function openPreview(attachment: UiFormAttachment) {
  const resolver = formPresentation(props.form).attachmentPreview(props.config.source)
  if (!resolver || !props.config.preview || props.binding.hidden) return
  closePreview()
  const request = new AbortController()
  previewRequest = request
  await preview.value?.open(
    attachment,
    resolver,
    { signal: request.signal, field: props.binding.name },
    props.config.preview.types,
  )
}
watch(
  [
    () => props.binding.controlId,
    () => props.binding.hidden,
    () => formPresentation(props.form).generation.value,
  ],
  closePreview,
  { flush: 'sync' },
)
watch(
  () => props.binding.value,
  (value, previous) => {
    if (!sameDraftValue(value, previous)) closePreview()
  },
  { flush: 'sync' },
)
onDeactivated(closePreview)
onScopeDispose(closePreview)
const references = computed(() =>
  Array.isArray(props.binding.value) ? props.binding.value.filter(isFormAttachment) : [],
)
onDeactivated(cancel)
const files = computed<UploadFileInfo[]>(() =>
  Array.isArray(props.binding.value)
    ? props.binding.value
        .filter(isFormAttachment)
        .map((item) => ({ id: item.id, name: item.name, status: 'finished' }))
    : [],
)
const cannotChoose = computed(
  () =>
    props.binding.disabled ||
    props.binding.readonly ||
    (props.config.maxFiles !== undefined && files.value.length >= props.config.maxFiles),
)
const picker = computed(() => formPresentation(props.form).attachmentPicker(props.config.source))
async function pickFile(): Promise<void> {
  const source = picker.value
  if (!source || cannotChoose.value) return
  await chooseFile((signal) => source.select({ signal, field: props.binding.name }))
}
async function choose({ file }: { readonly file: UploadFileInfo }): Promise<boolean> {
  if (file.file) await chooseFile(file.file)
  return false // NUpload never submits or stores raw File objects in the model.
}
function remove({ file }: { readonly file: UploadFileInfo }): boolean {
  removeFile(file.id)
  return false
}
</script>
<template>
  <div class="grid min-w-0 gap-component-unit">
    <NUpload
      v-if="!readonly"
      :file-list="files"
      :accept="config.accept ?? ''"
      :default-upload="false"
      :disabled="binding.disabled || binding.readonly || busy"
      :show-download-button="false"
      :show-preview-button="false"
      @before-upload="choose"
      @remove="remove"
    >
      <NButton
        :loading="busy"
        :type="failed ? 'error' : 'default'"
        :disabled="cannotChoose"
        secondary
      >
        {{
          busy
            ? form.copy.uploadingAttachment?.()
            : failed
              ? form.copy.attachmentFailed?.()
              : form.copy.chooseAttachment?.()
        }}
      </NButton>
    </NUpload>
    <NButton
      v-if="!readonly && picker"
      secondary
      :disabled="cannotChoose || busy"
      :aria-label="picker.label()"
      @click="pickFile"
    >
      {{ picker.label() }}
    </NButton>
    <div
      v-if="config.preview || readonly"
      class="flex flex-wrap gap-component-unit"
    >
      <NButton
        v-for="attachment in references"
        :key="attachment.id"
        secondary
        :disabled="!config.preview"
        @click="openPreview(attachment)"
      >
        {{ attachment.name }}
      </NButton>
      <span
        v-if="references.length === 0 && readonly"
        class="text-text-secondary"
        v-text="form.copy.empty()"
      />
    </div>
    <PavpImageProcessor
      v-if="config.imageProcessing && form.copy.media"
      ref="processor"
      :copy="form.copy.media"
    />
    <PavpAttachmentPreview
      v-if="config.preview && form.copy.media"
      ref="preview"
      :copy="form.copy.media"
    />
  </div>
</template>
