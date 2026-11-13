<script setup lang="ts">
import { nextTick, onBeforeUnmount, onDeactivated, ref, shallowRef, watch } from 'vue'
import { NModal } from 'naive-ui/es/modal'
import { NCard } from 'naive-ui/es/card'
import { NButton } from 'naive-ui/es/button'
import { NImage } from 'naive-ui/es/image'
import UiScrollArea from '../../components/UiScrollArea.vue'
import type {
  UiFormAttachment,
  UiFormAttachmentResolver,
  UiFormMediaCopy,
} from '../../components/form-contracts'
import { detectAttachmentMedia, validateRasterImage } from './image-processing'
import { createPdfPreview, createPdfPreviewFeedback } from './pdf-preview'

const props = defineProps<{ copy: UiFormMediaCopy }>()
const visible = ref(false)
const busy = ref(false)
const failed = ref(false)
const title = ref('')
const image = ref('')
const canvas = ref<HTMLCanvasElement>()
const viewport = ref<HTMLElement | null>(null)
const page = ref(1)
const zoom = ref(1)
const pdf = shallowRef<Awaited<ReturnType<typeof createPdfPreview>>>()
let controller: AbortController | undefined
let detach: (() => void) | undefined
const feedback = createPdfPreviewFeedback((value) => {
  failed.value = value
})
function close() {
  feedback.invalidate()
  visible.value = false
  controller?.abort()
  controller = undefined
  detach?.()
  detach = undefined
  pdf.value?.destroy()
  pdf.value = undefined
  if (image.value) URL.revokeObjectURL(image.value)
  image.value = ''
}
async function draw() {
  const document = pdf.value
  const target = canvas.value
  const session = controller
  if (!document || !target || !session) return
  await feedback.draw(session.signal, () =>
    document.draw(target, page.value, zoom.value, {
      width: Math.max(1, viewport.value?.clientWidth ?? 1),
      height: Math.max(1, viewport.value?.clientHeight ?? 1),
      dpr: window.devicePixelRatio || 1,
    }),
  )
}

async function open(
  attachment: UiFormAttachment,
  resolver: UiFormAttachmentResolver,
  context: { field: string; signal: AbortSignal },
  types: readonly ('image' | 'pdf')[],
): Promise<void> {
  close()
  if (context.signal.aborted) return
  const current = new AbortController()
  controller = current
  context.signal.addEventListener('abort', close, { once: true })
  detach = () => {
    context.signal.removeEventListener('abort', close)
  }
  visible.value = true
  busy.value = true
  failed.value = false
  title.value = attachment.name
  page.value = 1
  zoom.value = 1
  try {
    const blob = await resolver(attachment, { field: context.field, signal: current.signal })
    current.signal.throwIfAborted()
    if (!blob.size || blob.size > 32 * 1024 * 1024)
      throw new RangeError('Preview byte limit exceeded.')
    const type = await detectAttachmentMedia(blob)
    current.signal.throwIfAborted()
    if (type === 'unsupported' || !types.includes(type)) throw new TypeError('Unsupported preview.')
    if (type === 'image') {
      await validateRasterImage(blob, current.signal)
      current.signal.throwIfAborted()
      image.value = URL.createObjectURL(blob)
    } else {
      const result = await createPdfPreview(blob, current.signal)
      if (current.signal.aborted) {
        result.destroy()
        return
      }
      pdf.value = result
      await nextTick()
      await draw()
    }
  } catch {
    if (!current.signal.aborted) failed.value = true
  } finally {
    if (controller === current) busy.value = false
  }
}
watch([page, zoom], () => {
  void draw()
})
onBeforeUnmount(close)
onDeactivated(close)
defineExpose({ open, close })
</script>

<template>
  <NModal
    :show="visible"
    to="#pavp-overlay-root"
    @update:show="close"
  >
    <NCard
      class="pavp-attachment-preview flex flex-col min-h-0"
      :title="title || props.copy.previewTitle()"
      content-class="min-h-0 flex-1 overflow-hidden"
      role="dialog"
      aria-modal="true"
      :aria-label="props.copy.previewTitle()"
    >
      <UiScrollArea
        owner-id="attachment-preview"
        contained
        x-scrollable
        class="h-full"
        @viewport="viewport = $event"
      >
        <p
          v-if="busy"
          role="status"
        >
          {{ props.copy.loading() }}
        </p>
        <p
          v-if="failed"
          role="alert"
        >
          {{ props.copy.failed() }}
        </p>
        <div
          v-if="image"
          class="flex min-w-0 justify-center"
        >
          <NImage
            class="max-w-full"
            :src="image"
            :alt="title"
            :img-props="{ class: 'h-auto max-w-full object-contain' }"
            preview-disabled
          />
        </div>
        <canvas
          v-if="pdf"
          ref="canvas"
          class="mx-auto block"
          :aria-label="title"
        />
      </UiScrollArea>
      <template #footer>
        <div class="gap-control flex flex-wrap items-center justify-end">
          <template v-if="pdf">
            <NButton
              :disabled="page <= 1"
              @click="page--"
            >
              {{ props.copy.previousPage() }}
            </NButton>
            <span>{{ page }} / {{ pdf.pages }}</span>
            <NButton
              :disabled="page >= pdf.pages"
              @click="page++"
            >
              {{ props.copy.nextPage() }}
            </NButton>
            <NButton
              :disabled="zoom <= 0.5"
              @click="zoom = Math.max(0.5, zoom - 0.25)"
            >
              {{ props.copy.zoomOut() }}
            </NButton>
            <NButton
              :disabled="zoom >= 3"
              @click="zoom = Math.min(3, zoom + 0.25)"
            >
              {{ props.copy.zoomIn() }}
            </NButton>
          </template>
          <NButton @click="close">
            {{ props.copy.cancel() }}
          </NButton>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.pavp-attachment-preview {
  width: calc(100vw - 2 * var(--ui-space-page-inline));
  height: calc(100dvh - 2 * var(--ui-space-page-inline));
}
</style>
