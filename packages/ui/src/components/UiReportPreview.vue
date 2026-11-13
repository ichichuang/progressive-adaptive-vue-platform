<script setup lang="ts">
import { nextTick, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { NModal } from 'naive-ui/es/modal'
import { NCard } from 'naive-ui/es/card'
import { NButton } from 'naive-ui/es/button'
import UiScrollArea from './UiScrollArea.vue'
import UiReportContent from '../adapters/naive/PavpReportContent.vue'
import { createReportPrintSession } from '../reports/report-print'
import type { UiReportCopy, UiReportSnapshot } from './report-contracts'
const props = defineProps<{
  show: boolean
  snapshot: UiReportSnapshot | null
  copy: UiReportCopy
}>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()
const host = ref<HTMLElement>()
const ready = ref(false)
const failed = ref(false)
let generation = 0
let session: ReturnType<typeof createReportPrintSession> | undefined
function clear() {
  generation++
  ready.value = false
  session?.dispose()
  session = undefined
}
watch(
  [() => props.show, () => props.snapshot],
  async () => {
    clear()
    failed.value = false
    if (!props.show || !props.snapshot) return
    const revision = generation
    await nextTick()
    const target = host.value
    if (!target) return
    try {
      await document.fonts.ready
      await Promise.all([...target.querySelectorAll('img')].map((image) => image.decode()))
      if (revision !== generation) return
      session = createReportPrintSession(target)
      ready.value = true
    } catch {
      if (revision === generation) failed.value = true
    }
  },
  { immediate: true },
)
function print() {
  if (!ready.value) return
  try {
    session?.print()
  } catch {
    failed.value = true
  }
}
function close() {
  clear()
  emit('update:show', false)
}
onDeactivated(close)
onScopeDispose(clear)
</script>
<template>
  <NModal
    :show="show && snapshot !== null"
    to="#pavp-overlay-root"
    @update:show="close"
  >
    <NCard
      class="pavp-report-preview flex flex-col min-h-0"
      :title="snapshot?.title ?? ''"
      content-class="min-h-0 flex-1 overflow-hidden"
      role="dialog"
      aria-modal="true"
      :aria-label="snapshot?.title ?? ''"
    >
      <UiScrollArea
        owner-id="report-preview"
        contained
        x-scrollable
        class="h-full"
      >
        <UiReportContent
          v-if="snapshot"
          :snapshot="snapshot"
          :copy="copy"
        />
      </UiScrollArea>
      <template #footer>
        <div class="gap-control flex flex-wrap items-center justify-end">
          <span
            role="status"
            class="text-caption text-text-secondary"
            v-text="failed ? copy.failed() : !ready ? copy.preparing() : ''"
          />
          <NButton @click="close">
            {{ copy.close() }}
          </NButton>
          <NButton
            type="primary"
            :disabled="!ready || failed"
            @click="print"
          >
            {{ copy.print() }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
  <Teleport to="body">
    <div
      v-if="show && snapshot"
      ref="host"
      class="pavp-report-print-host"
      aria-hidden="true"
    >
      <UiReportContent
        :snapshot="snapshot"
        :copy="copy"
      />
    </div>
  </Teleport>
</template>
<style scoped>
.pavp-report-preview {
  width: calc(100vw - 2 * var(--ui-space-page-inline));
  height: calc(100dvh - 2 * var(--ui-space-page-inline));
}
</style>
<style>
.pavp-report-print-host {
  display: none;
}
@media print {
  html:has(body[data-report-printing]),
  body[data-report-printing] {
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }
  body[data-report-printing] > :not([data-report-print-active]) {
    display: none !important;
  }
  body[data-report-printing] > [data-report-print-active] {
    display: block;
    color: black;
    background: white;
  }
  [data-report-print-active] * {
    color: black !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  [data-report-print-active] table {
    width: 100%;
    table-layout: fixed;
  }
  [data-report-print-active] thead {
    display: table-header-group;
  }
  [data-report-print-active] tr,
  [data-report-print-active] .pavp-report-field,
  [data-report-print-active] img {
    break-inside: avoid;
  }
  [data-report-print-active] img {
    max-width: 100%;
    height: auto;
  }
}
</style>
