<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { useConsoleI18n } from '../../../../shared/i18n'
import type { useDraftSession } from '../../../forms/use-draft-session'
import { formDraftStatusMessages } from '../../../forms/form-draft-messages'
import type { BuilderSnapshot } from './form-builder-document'
import type { useFormBuilder } from './use-form-builder'

const props = defineProps<{
  readonly builder: ReturnType<typeof useFormBuilder>
  readonly session: ReturnType<typeof useDraftSession<BuilderSnapshot>>
  readonly trialState: 'held' | 'pending' | null
}>()
const { t } = useConsoleI18n()
const fileNotice = ref('')
const reading = ref(false)
let active = true
onScopeDispose(() => {
  active = false
})
const status = computed(() => {
  const current = props.session.status.value
  // Storage failures must remain visible even while an input or schema change is held.
  if (current === 'unavailable') return t('formBuilder.draftUnavailable')
  if (['invalid', 'incompatible', 'expired', 'conflict'].includes(current))
    return t(formDraftStatusMessages[current])
  return t(
    props.builder.hasActiveComposition.value
      ? 'formBuilder.composingUnsaved'
      : props.trialState === 'held'
        ? 'formBuilder.previewHeldShort'
        : props.trialState === 'pending'
          ? 'formBuilder.previewPendingShort'
          : formDraftStatusMessages[current],
  )
})
function chooseFile(): void {
  if (reading.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.addEventListener(
    'change',
    (event) => {
      void importFile(event)
    },
    { once: true },
  )
  input.click()
}
async function importFile(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file || reading.value) return
  if (file.size > 1024 * 1024) {
    fileNotice.value = t('formBuilder.importTooLarge')
    return
  }
  reading.value = true
  fileNotice.value = ''
  const before = JSON.stringify(props.builder.snapshot())
  try {
    const raw = await file.text()
    if (!active) return
    // A slow file read must not replace changes made after the picker closed.
    if (before !== JSON.stringify(props.builder.snapshot())) {
      fileNotice.value = t('formBuilder.importChanged')
      return
    }
    if (!props.builder.importJson(raw)) fileNotice.value = props.builder.notice.value
  } catch {
    if (active) fileNotice.value = t('formBuilder.importFailed')
  } finally {
    reading.value = false
  }
}
function exportFile(): void {
  if (props.builder.pending.value) return
  const url = URL.createObjectURL(
    new Blob([props.builder.json.value], { type: 'application/json' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'form-schema.json'
  anchor.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
</script>
<template>
  <div class="flex min-w-0 items-center gap-component-unit">
    <span
      class="wb-form-draft-status truncate text-caption text-text-secondary layout-narrow:hidden"
      :title="status"
      role="status"
      aria-live="polite"
      v-text="status"
    />
    <NPopover
      class="wb-form-draft-popover"
      scrollable
      trigger="click"
      to="#pavp-overlay-root"
    >
      <template #trigger>
        <NButton secondary>
          {{ t('formBuilder.actions') }}
        </NButton>
      </template>
      <div class="wb-form-draft-menu grid gap-component-unit">
        <p
          class="m-0 text-caption text-text-secondary"
          role="status"
        >
          {{ status }}
        </p>
        <NPopconfirm
          class="wb-form-draft-popover"
          scrollable
          to="#pavp-overlay-root"
          :positive-text="t('formBuilder.importJson')"
          :negative-text="t('formBuilder.cancel')"
          @positive-click="chooseFile"
        >
          <template #trigger>
            <NButton :loading="reading">
              {{ t('formBuilder.importJson') }}
            </NButton>
          </template>
          {{ t('formBuilder.importConfirm') }} {{ t('formBuilder.importConfirmHint') }}
        </NPopconfirm>
        <NButton
          :disabled="builder.pending.value"
          @click="exportFile"
        >
          {{ t('formBuilder.exportJson') }}
        </NButton>
        <p
          v-if="fileNotice"
          class="m-0 text-caption text-control-error"
          role="alert"
        >
          {{ fileNotice }}
        </p>
      </div>
    </NPopover>
  </div>
</template>
