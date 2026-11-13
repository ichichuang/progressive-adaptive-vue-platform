<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { NModal } from 'naive-ui/es/modal'
import { NCard } from 'naive-ui/es/card'
import { NButton } from 'naive-ui/es/button'
import type Cropper from 'cropperjs'
import type { UiFormImageProcessing, UiFormMediaCopy } from '../../components/form-contracts'
import UiScrollArea from '../../components/UiScrollArea.vue'
import {
  assertStaticRasterImage,
  encodeProcessedImage,
  validateRasterImage,
} from './image-processing'

const props = defineProps<{ copy: UiFormMediaCopy }>()
const show = ref(false)
const busy = ref(false)
const host = ref<HTMLElement>()
let cropper: Cropper | undefined
let url: string | undefined
let finish: ((value: File | null) => void) | undefined
let rejectCurrent: ((reason: unknown) => void) | undefined
let removeAbort: (() => void) | undefined
let current: { file: File; options: UiFormImageProcessing; signal: AbortSignal } | undefined
let generation = 0
let entered = false
let imageReady = false

function cleanup(): void {
  generation++
  entered = false
  imageReady = false
  show.value = false
  busy.value = false
  cropper = undefined
  host.value?.replaceChildren()
  if (url) URL.revokeObjectURL(url)
  url = undefined
  removeAbort?.()
  removeAbort = undefined
  current = undefined
}
function cancel(): void {
  const resolve = finish
  finish = undefined
  rejectCurrent = undefined
  cleanup()
  resolve?.(null)
}
function fail(error: unknown): void {
  const reject = rejectCurrent
  finish = undefined
  rejectCurrent = undefined
  cleanup()
  reject?.(error)
}
async function process(
  file: File,
  options: UiFormImageProcessing,
  signal: AbortSignal,
): Promise<File | null> {
  cancel()
  signal.throwIfAborted()
  const ticket = generation
  return new Promise((resolve, reject) => {
    finish = resolve
    rejectCurrent = reject
    current = { file, options, signal }
    const abort = () => {
      fail(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
    removeAbort = () => {
      signal.removeEventListener('abort', abort)
    }
    void (async () => {
      await assertStaticRasterImage(file, signal)
      await validateRasterImage(file, signal)
      if (!options.crop) {
        const bitmap = await createImageBitmap(file)
        try {
          signal.throwIfAborted()
          const canvas = document.createElement('canvas')
          canvas.width = bitmap.width
          canvas.height = bitmap.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Image canvas unavailable.')
          context.drawImage(bitmap, 0, 0)
          const encoded = await encodeProcessedImage(canvas, file, options.output, signal)
          if (ticket !== generation) return
          const complete = finish
          finish = undefined
          rejectCurrent = undefined
          cleanup()
          complete(encoded)
        } finally {
          bitmap.close()
        }
        return
      }
      const { default: Constructor } = await import('cropperjs')
      if (ticket !== generation) return
      show.value = true
      busy.value = true
      await nextTick()
      if (ticket !== generation || !host.value) return
      url = URL.createObjectURL(file)
      const image = new Image()
      image.src = url
      host.value.append(image)
      cropper = new Constructor(image, {
        container: host.value,
        template: `<cropper-canvas><cropper-image rotatable scalable translatable></cropper-image><cropper-shade theme-color="var(--ui-color-surface-panel)"></cropper-shade><cropper-handle action="select" plain></cropper-handle><cropper-selection initial-coverage="1" movable resizable><cropper-grid theme-color="var(--ui-color-border-default)" bordered covered></cropper-grid><cropper-crosshair theme-color="var(--ui-color-text-primary)" centered></cropper-crosshair><cropper-handle action="move" theme-color="transparent"></cropper-handle>${['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map((direction) => `<cropper-handle action="${direction}-resize" theme-color="var(--ui-color-text-primary)"></cropper-handle>`).join('')}</cropper-selection></cropper-canvas>`,
      })
      await cropper.getCropperImage()?.$ready()
      if (ticket !== generation) return
      const selection = cropper.getCropperSelection()
      if (selection && options.crop.aspectRatio) selection.aspectRatio = options.crop.aspectRatio
      imageReady = true
      fitImage()
    })().catch((error: unknown) => {
      if (ticket === generation) fail(error)
    })
  })
}
async function confirm(): Promise<void> {
  const request = current
  const instance = cropper
  if (!request || !instance) return
  const ticket = generation
  busy.value = true
  try {
    const selection = instance.getCropperSelection()
    const transform = instance.getCropperImage()?.$getTransform()
    const scale = transform ? Math.hypot(transform[0] ?? 1, transform[1] ?? 0) : 1
    if (!selection || scale <= 0) throw new Error('Invalid image selection.')
    const nativeWidth = selection.width / scale
    const nativeHeight = selection.height / scale
    const limit = Math.min(
      1,
      (request.options.output?.maxWidth ?? nativeWidth) / nativeWidth,
      (request.options.output?.maxHeight ?? nativeHeight) / nativeHeight,
    )
    const canvas = await selection.$toCanvas({
      width: Math.max(1, Math.round(nativeWidth * limit)),
      height: Math.max(1, Math.round(nativeHeight * limit)),
    })
    const file = await encodeProcessedImage(
      canvas,
      request.file,
      request.options.output,
      request.signal,
    )
    if (ticket !== generation) return
    const resolve = finish
    finish = undefined
    rejectCurrent = undefined
    cleanup()
    resolve?.(file)
  } catch (error) {
    if (ticket === generation) fail(error)
  }
}
function fitImage(): void {
  if (!entered || !imageReady || !cropper) return
  const image = cropper.getCropperImage()
  const canvas = cropper.getCropperCanvas()
  const selection = cropper.getCropperSelection()
  if (!image || !canvas || !selection) return
  image.$center('contain')
  const imageBounds = image.getBoundingClientRect()
  const canvasBounds = canvas.getBoundingClientRect()
  let width = imageBounds.width
  let height = imageBounds.height
  const ratio = current?.options.crop?.aspectRatio
  if (ratio) {
    if (width / height > ratio) width = height * ratio
    else height = width / ratio
  }
  selection.$change(
    imageBounds.left - canvasBounds.left + (imageBounds.width - width) / 2,
    imageBounds.top - canvasBounds.top + (imageBounds.height - height) / 2,
    width,
    height,
    ratio,
  )
  busy.value = false
}
function afterEnter(): void {
  entered = true
  fitImage()
}
function rotate(angle: number): void {
  cropper?.getCropperImage()?.$rotate(angle)
  fitImage()
}
function reset(): void {
  cropper?.getCropperImage()?.$resetTransform()
  fitImage()
}
onBeforeUnmount(cancel)
defineExpose({ process })
</script>

<template>
  <NModal
    :show="show"
    to="#pavp-overlay-root"
    :mask-closable="false"
    @after-enter="afterEnter"
    @update:show="
      (value) => {
        if (!value) cancel()
      }
    "
  >
    <NCard
      class="pavp-image-processor min-h-0 min-w-0"
      :title="props.copy.cropTitle()"
      role="dialog"
      aria-modal="true"
      :aria-label="props.copy.cropTitle()"
      content-class="min-h-0 min-w-0"
    >
      <UiScrollArea owner-id="image-processing-workspace">
        <div
          ref="host"
          class="pavp-image-processor__canvas"
        />
      </UiScrollArea>
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-content-gap">
          <div class="flex flex-wrap gap-content-gap">
            <NButton
              :disabled="busy"
              @click="rotate(-Math.PI / 2)"
            >
              {{ props.copy.rotateLeft() }}
            </NButton>
            <NButton
              :disabled="busy"
              @click="rotate(Math.PI / 2)"
            >
              {{ props.copy.rotateRight() }}
            </NButton>
            <NButton
              :disabled="busy"
              @click="reset"
            >
              {{ props.copy.reset() }}
            </NButton>
          </div>
          <div class="flex gap-content-gap">
            <NButton @click="cancel">
              {{ props.copy.cancel() }}
            </NButton>
            <NButton
              type="primary"
              :loading="busy"
              @click="confirm"
            >
              {{ props.copy.confirm() }}
            </NButton>
          </div>
        </div>
      </template>
    </NCard>
  </NModal>
</template>

<style scoped>
.pavp-image-processor {
  width: min(
    calc(100vw - 2 * var(--ui-space-page-inline)),
    calc(2 * var(--ui-layout-admin-drawer-maximum-inline-size))
  ) !important;
  max-height: 100%;
}
.pavp-image-processor__canvas {
  height: min(50dvh, var(--ui-layout-admin-drawer-maximum-inline-size));
}
.pavp-image-processor__canvas :deep(cropper-canvas) {
  width: 100%;
  height: 100%;
}
</style>
