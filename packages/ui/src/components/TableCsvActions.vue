<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { UiTableController, UiTableCopy, UiTableCsvScope } from './table-contracts'

const props = defineProps<{ readonly table: UiTableController; readonly copy: UiTableCopy }>()
const failed = ref(false)
function isDisabled(scope: UiTableCsvScope): boolean {
  return (
    props.table.loading.value ||
    !!props.table.error.value ||
    (scope === 'page'
      ? props.table.rows.value.length === 0
      : props.table.selectedKeys.value.length === 0)
  )
}
function download(scope: UiTableCsvScope): void {
  failed.value = false
  let url: string | undefined
  let link: HTMLAnchorElement | undefined
  try {
    const file = props.table.exportCsv(scope)
    url = URL.createObjectURL(new Blob([file.content], { type: file.mimeType }))
    link = document.createElement('a')
    link.href = url
    link.download = file.fileName
    link.hidden = true
    document.body.appendChild(link)
    link.click()
  } catch {
    failed.value = true
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
  <span
    v-if="failed"
    role="alert"
    class="text-caption text-control-error"
  >
    {{ copy.error() }}
  </span>
</template>
