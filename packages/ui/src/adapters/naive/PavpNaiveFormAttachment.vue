<script setup lang="ts" generic="I">
import { NUpload, type UploadFileInfo } from 'naive-ui/es/upload'
import { NButton } from 'naive-ui/es/button'
import { computed, onDeactivated } from 'vue'
import type {
  UiFormController,
  UiFormFieldBinding,
  UiFormFieldConfig,
} from '../../components/form-contracts'
import { isFormAttachment } from '../../components/form-special-values'
import { useFormAttachments } from '../../composables/use-form-attachments'

defineOptions({ name: 'PavpNaiveFormAttachment' })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly binding: UiFormFieldBinding
  readonly config: Extract<UiFormFieldConfig, { kind: 'attachment' }>
}>()
const { busy, failed, choose: chooseFile, remove: removeFile, cancel } = useFormAttachments(props)
onDeactivated(cancel)
const files = computed<UploadFileInfo[]>(() =>
  Array.isArray(props.binding.value)
    ? props.binding.value
        .filter(isFormAttachment)
        .map((item) => ({ id: item.id, name: item.name, status: 'finished' }))
    : [],
)
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
      :file-list="files"
      :accept="config.accept ?? ''"
      :default-upload="false"
      :disabled="binding.disabled || busy"
      :show-download-button="false"
      :show-preview-button="false"
      @before-upload="choose"
      @remove="remove"
    >
      <NButton
        :loading="busy"
        :type="failed ? 'error' : 'default'"
        :disabled="
          binding.disabled || (config.maxFiles !== undefined && files.length >= config.maxFiles)
        "
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
  </div>
</template>
