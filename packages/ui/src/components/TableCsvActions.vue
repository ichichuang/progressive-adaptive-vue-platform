<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import UiCopyAction from './UiCopyAction.vue'
import type { UiTableController, UiTableCopy, UiTableCsvScope } from './table-contracts'

const props = defineProps<{ readonly table: UiTableController; readonly copy: UiTableCopy }>()
const failed = ref(false)
function isDisabled(scope: UiTableCsvScope): boolean {
  if (props.table.canOutput) return !props.table.canOutput('csv', scope)
  return (
    props.table.loading.value ||
    !!props.table.error.value ||
    (scope === 'page'
      ? props.table.rows.value.length === 0
      : props.table.selectedKeys.value.length === 0)
  )
}
function deliverFile(file: ReturnType<UiTableController['exportCsv']>): void {
  let url: string | undefined
  let link: HTMLAnchorElement | undefined
  try {
    url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }))
    link = document.createElement('a')
    link.href = url
    link.download = file.fileName
    link.hidden = true
    document.body.appendChild(link)
    link.click()
  } finally {
    link?.remove()
    // Defer revocation so the browser can start consuming the object URL.
    if (url) {
      const objectUrl = url
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
      }, 1000)
    }
  }
}
function download(scope: UiTableCsvScope): void {
  failed.value = false
  try {
    if (props.table.deliverOutput) {
      failed.value = !props.table.deliverOutput('csv', scope, deliverFile)
    } else deliverFile(props.table.exportCsv(scope))
  } catch {
    failed.value = true
  }
}
function resolveCopy(scope: UiTableCsvScope) {
  let result: { readonly value: string; isCurrent(): boolean } | undefined
  props.table.deliverOutput?.('copy', scope, (file, isCurrent) => {
    result = { value: file.content, isCurrent }
  })
  return result
}
</script>
<template>
  <NButton
    v-for="scope in table.schema.csvExport?.scopes"
    :key="scope"
    quaternary
    class="min-h-target-enhanced min-w-target-enhanced"
    :disabled="isDisabled(scope)"
    @click="download(scope)"
  >
    <span class="flex items-center gap-component-unit">
      <span
        class="i-lucide-download shrink-0"
        aria-hidden="true"
      />
      {{ scope === 'page' ? copy.exportPage() : copy.exportSelected() }}
    </span>
  </NButton>
  <template v-if="table.deliverOutput">
    <template
      v-for="scope in table.schema.csvExport?.scopes"
      :key="scope"
    >
      <UiCopyAction
        v-if="
          (scope === 'page' ? copy.copyPage : copy.copySelected) && table.canOutput?.('copy', scope)
        "
        class="min-h-target-enhanced min-w-target-enhanced"
        variant="tertiary"
        value=""
        :label="(scope === 'page' ? copy.copyPage?.() : copy.copySelected?.()) ?? ''"
        :copy-label="copy.actions()"
        :success-label="copy.copySucceeded?.() ?? ''"
        :failure-label="copy.error()"
        :resolve-value="() => resolveCopy(scope)"
      />
    </template>
  </template>
  <span
    v-if="failed"
    role="alert"
    class="text-caption text-control-error"
  >
    {{ copy.error() }}
  </span>
</template>
