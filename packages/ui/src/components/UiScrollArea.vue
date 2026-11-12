<script setup lang="ts">
import { inject, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue'
import {
  loadScrollEnhancement,
  type ScrollEnhancement,
} from '../adapters/scroll/scroll-enhancement-loader'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import ScrollViewport from '../adapters/motion/ScrollViewport.vue'
import { registerScrollTargetOwner, type ScrollTargetReceipt } from './scroll-target-owner'
import type { UiScrollController, UiScrollInput, UiScrollOffset } from './scroll-contracts'

defineOptions({ name: 'UiScrollArea' })
const props = withDefaults(
  defineProps<{
    readonly ownerId: string
    readonly enabled?: boolean
    readonly contained?: boolean
    readonly xScrollable?: boolean
  }>(),
  { enabled: true, contained: false, xScrollable: false },
)
const emit = defineEmits<{
  controller: [controller: UiScrollController | null]
  viewport: [element: HTMLElement | null]
}>()
defineSlots<{ default: (props: Readonly<Record<string, never>>) => unknown }>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiScrollArea requires appearance.')
const viewport = ref<HTMLElement>()
const content = ref<HTMLElement>()
const host = ref<HTMLElement>()
const enhancementPending = ref(true)
let enhancement: ScrollEnhancement | undefined
let enhancementGeneration = 0
let disposed = false
let mounted = false
let deactivated = false
let retainedOffset: UiScrollOffset | undefined
let releaseTarget: (() => void) | undefined
let pendingTarget: ScrollTargetReceipt | undefined
let targetCommand = false

function readState(): ReturnType<UiScrollController['readState']> {
  const view = viewport.value
  const body = content.value
  const style = view === undefined ? undefined : getComputedStyle(view)
  return {
    ready:
      mounted &&
      !disposed &&
      !deactivated &&
      props.enabled &&
      view?.isConnected === true &&
      body?.isConnected === true &&
      view.closest('[inert]') === null &&
      view.clientWidth > 0 &&
      view.clientHeight > 0,
    width: view?.clientWidth ?? 0,
    height: view?.clientHeight ?? 0,
    contentWidth: body?.scrollWidth ?? 0,
    contentHeight: body?.scrollHeight ?? 0,
    direction: style?.direction ?? '',
    writingMode: style?.writingMode ?? '',
  }
}

function readOffset(): UiScrollOffset {
  return { left: viewport.value?.scrollLeft ?? 0, top: viewport.value?.scrollTop ?? 0 }
}

function captureRetainedOffset(): void {
  const view = viewport.value
  if (
    !disposed &&
    !deactivated &&
    props.enabled &&
    view?.isConnected === true &&
    view.clientWidth > 0 &&
    view.clientHeight > 0
  )
    retainedOffset = readOffset()
}

function canEnhance(): boolean {
  return mounted && !disposed && !deactivated && props.enabled
}

async function enhance(): Promise<void> {
  const generation = ++enhancementGeneration
  enhancement?.dispose()
  enhancement = undefined
  enhancementPending.value = canEnhance()
  if (!canEnhance()) return
  const runtime = await loadScrollEnhancement()
  if (generation !== enhancementGeneration || !canEnhance()) return
  if (runtime === undefined) {
    enhancementPending.value = false
    return
  }
  const view = viewport.value
  const body = content.value
  const target = host.value
  if (view === undefined || body === undefined || target === undefined) {
    enhancementPending.value = false
    return
  }
  try {
    pendingTarget?.cancel()
    enhancement = runtime.createScrollEnhancement({
      host: target,
      viewport: view,
      content: body,
      horizontal: props.xScrollable,
    })
    enhancement.setFullMotion(appearance?.value.motion === 'full')
  } catch {
    enhancement?.dispose()
    enhancement = undefined
    console.warn('PAVP scroll: native fallback.')
  } finally {
    enhancementPending.value = false
  }
}

function behavior(input: UiScrollInput): 'smooth' | 'instant' {
  return input.behavior === 'smooth' && appearance?.value.motion === 'full' ? 'smooth' : 'instant'
}

function valid(input: UiScrollInput): boolean {
  return (
    readState().ready &&
    (input.left === undefined || Number.isFinite(input.left)) &&
    (input.top === undefined || Number.isFinite(input.top))
  )
}

// This nearest mounted owner alone measures and reveals a form target. Keep the
// same nested-overflow boundary as scrollToAnchor, without scrolling the document.
function measureTarget(target: HTMLElement, label?: HTMLElement) {
  const view = viewport.value
  const body = content.value
  const state = readState()
  if (
    !state.ready ||
    view?.ownerDocument.hidden === true ||
    view === undefined ||
    body === undefined ||
    !body.contains(target) ||
    !target.isConnected ||
    target.getClientRects().length === 0 ||
    target.closest('[inert]') !== null ||
    ['hidden', 'collapse'].includes(getComputedStyle(target).visibility)
  )
    return undefined
  for (
    let parent = target.parentElement;
    parent !== null && parent !== body;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent)
    if (
      /(auto|scroll|hidden)/u.test(style.overflowX + style.overflowY) &&
      (parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight)
    )
      return undefined
  }
  const box = target.getBoundingClientRect()
  const heading =
    label !== undefined && body.contains(label) && label.getClientRects().length > 0
      ? label.getBoundingClientRect()
      : box
  const frame = view.getBoundingClientRect()
  let top = Math.min(box.top, heading.top)
  let bottom = Math.max(box.bottom, heading.bottom)
  let left = Math.min(box.left, heading.left)
  let right = Math.max(box.right, heading.right)
  let frameTop = Math.max(0, frame.top + view.clientTop)
  let frameLeft = Math.max(0, frame.left + view.clientLeft)
  let frameBottom = Math.min(
    frame.top + view.clientTop + state.height,
    view.ownerDocument.documentElement.clientHeight,
  )
  let frameRight = Math.min(
    frame.left + view.clientLeft + state.width,
    view.ownerDocument.documentElement.clientWidth,
  )
  // An inner viewport can itself be clipped by outer owners. Intersect visible
  // rectangles, but never command those ancestors or the document to scroll.
  for (let parent = view.parentElement; parent !== null; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    const clip = parent.getBoundingClientRect()
    if (/(auto|scroll|hidden|clip)/u.test(style.overflowY)) {
      frameTop = Math.max(frameTop, clip.top + parent.clientTop)
      frameBottom = Math.min(frameBottom, clip.top + parent.clientTop + parent.clientHeight)
    }
    if (/(auto|scroll|hidden|clip)/u.test(style.overflowX)) {
      frameLeft = Math.max(frameLeft, clip.left + parent.clientLeft)
      frameRight = Math.min(frameRight, clip.left + parent.clientLeft + parent.clientWidth)
    }
  }
  const visibleHeight = frameBottom - frameTop
  const visibleWidth = frameRight - frameLeft
  if (visibleHeight <= 0 || visibleWidth <= 0) return undefined
  // Keep the label with its control when they fit. Otherwise prioritize the
  // control in that axis, rather than accept a visible label and clipped input.
  if (bottom - top > visibleHeight) {
    top = box.top
    bottom = box.bottom
  }
  if (right - left > visibleWidth) {
    left = box.left
    right = box.right
  }
  // Oversized targets reveal their start, never the bottom of an entire group.
  const nearest = (start: number, end: number, edge: number, size: number): number =>
    start < edge
      ? start - edge
      : end - start > size
        ? start >= edge + size
          ? start - edge
          : 0
        : end > edge + size
          ? end - edge - size
          : 0
  const dy = nearest(top, bottom, frameTop, visibleHeight)
  const dx = props.xScrollable ? nearest(left, right, frameLeft, visibleWidth) : 0
  const current = readOffset()
  const maxTop = Math.max(0, state.contentHeight - state.height)
  const maxLeft = Math.max(0, state.contentWidth - state.width)
  const nextTop = Math.min(maxTop, Math.max(0, current.top + dy))
  const nextLeft =
    state.direction === 'rtl'
      ? Math.min(0, Math.max(-maxLeft, current.left + dx))
      : Math.min(maxLeft, Math.max(0, current.left + dx))
  const canReveal = (
    start: number,
    end: number,
    edge: number,
    size: number,
    delta: number,
  ): boolean =>
    start - delta >= edge - 1 &&
    (end - start > size ? start - delta < edge + size : end - delta <= edge + size + 1)
  if (
    !canReveal(top, bottom, frameTop, visibleHeight, nextTop - current.top) ||
    !canReveal(
      left,
      right,
      frameLeft,
      visibleWidth,
      props.xScrollable ? nextLeft - current.left : 0,
    )
  )
    return undefined
  return {
    visible: Math.abs(dy) < 1 && Math.abs(dx) < 1,
    top: nextTop,
    left: props.xScrollable ? nextLeft : current.left,
  }
}

function revealTarget(
  target: HTMLElement,
  label: HTMLElement | undefined,
  scroll: boolean,
): ScrollTargetReceipt | undefined {
  const measured = measureTarget(target, label)
  const view = viewport.value
  if (measured === undefined || view === undefined || (!scroll && !measured.visible))
    return undefined
  pendingTarget?.cancel()
  if (measured.visible && !enhancement?.hasPendingSmoothScroll())
    return {
      settled: Promise.resolve(true),
      cancel() {
        /* Already settled; no observer remains. */
      },
    }
  const goal = measured
  let resolve!: (ready: boolean) => void
  let finished = false
  const document = view.ownerDocument
  const receipt: ScrollTargetReceipt = {
    settled: new Promise<boolean>((done) => {
      resolve = done
    }),
    cancel: () => {
      finish(false, true)
    },
  }
  function finish(ready: boolean, stop = false): void {
    if (finished) return
    finished = true
    view?.removeEventListener('scrollend', complete)
    document.removeEventListener('visibilitychange', visibility)
    for (const event of ['pointerdown', 'wheel', 'touchstart', 'keydown', 'input'])
      document.removeEventListener(event, interrupt, true)
    if (pendingTarget === receipt) pendingTarget = undefined
    if (stop) controller.cancelMotion()
    resolve(ready)
  }
  function complete(): void {
    // Lenis emits scrollend at its real completion. Ignore native scrollend
    // events emitted between its writes while that engine is still active.
    if (enhancement?.hasPendingSmoothScroll()) return
    const actual = readOffset()
    const visible = measureTarget(target, label)?.visible === true
    finish(visible && Math.abs(actual.top - goal.top) < 1 && Math.abs(actual.left - goal.left) < 1)
  }
  function interrupt(): void {
    receipt.cancel()
  }
  function visibility(): void {
    if (document.hidden) receipt.cancel()
  }
  pendingTarget = receipt
  view.addEventListener('scrollend', complete)
  document.addEventListener('visibilitychange', visibility)
  for (const event of ['pointerdown', 'wheel', 'touchstart', 'keydown', 'input'])
    document.addEventListener(event, interrupt, { capture: true, passive: true })
  if (!measured.visible) {
    targetCommand = true
    try {
      controller.scrollTo({
        top: measured.top,
        ...(props.xScrollable ? { left: measured.left } : {}),
        behavior: 'smooth',
      })
    } finally {
      targetCommand = false
    }
  }
  const actual = readOffset()
  if (
    !enhancement?.hasPendingSmoothScroll() &&
    Math.abs(actual.top - measured.top) < 1 &&
    Math.abs(actual.left - measured.left) < 1
  )
    complete()
  else if (!('onscrollend' in view) && !enhancement?.hasPendingSmoothScroll()) finish(false) // Native fallback can still scroll; unsupported completion stays static.
  return receipt
}

function registerTarget(): void {
  pendingTarget?.cancel()
  releaseTarget?.()
  releaseTarget = undefined
  const view = viewport.value
  if (mounted && !disposed && props.enabled && view !== undefined)
    releaseTarget = registerScrollTargetOwner(view, revealTarget, controller)
}

const controller = Object.freeze<UiScrollController>({
  get ownerId() {
    return props.ownerId
  },
  readState,
  ownsBoundary: (boundary) => {
    const view = viewport.value
    const body = content.value
    return (
      mounted &&
      !disposed &&
      props.enabled &&
      view?.isConnected === true &&
      body?.isConnected === true &&
      boundary.contains(view) &&
      view.contains(body)
    )
  },
  readOffset,
  cancelMotion() {
    if (disposed) return
    if (pendingTarget !== undefined) {
      pendingTarget.cancel()
      return
    }
    if (enhancement !== undefined) enhancement.cancelMotion()
    else viewport.value?.scrollTo({ ...readOffset(), behavior: 'instant' })
  },
  scrollTo(input) {
    if (!valid(input)) return
    if (!targetCommand) pendingTarget?.cancel()
    const command = {
      ...input,
      behavior: behavior(input),
    }
    if (enhancement !== undefined) enhancement.scrollTo(command)
    else viewport.value?.scrollTo(command)
    captureRetainedOffset()
  },
  scrollBy(input) {
    if (!valid(input)) return
    const current = readOffset()
    controller.scrollTo({
      ...input,
      ...(input.left === undefined ? {} : { left: current.left + input.left }),
      ...(input.top === undefined ? {} : { top: current.top + input.top }),
    })
  },
  scrollToStart(options = {}) {
    controller.scrollTo({ ...options, left: 0, top: 0 })
  },
  scrollToEnd(options = {}) {
    const state = readState()
    const width = Math.max(0, state.contentWidth - state.width)
    controller.scrollTo({
      ...options,
      left: state.direction === 'rtl' ? -width : width,
      top: Math.max(0, state.contentHeight - state.height),
    })
  },
  scrollToAnchor(anchorId, options = {}) {
    const body = content.value
    const view = viewport.value
    if (!readState().ready || body === undefined || view === undefined)
      return { kind: 'rejected', reason: 'unavailable' }
    const matches = [...body.querySelectorAll('[id]')].filter((target) => target.id === anchorId)
    if (matches.length > 1) return { kind: 'rejected', reason: 'duplicate' }
    const target = matches[0]
    if (target === undefined) return { kind: 'rejected', reason: 'missing' }
    if (!Number.isFinite(options.blockOffset ?? 0))
      return { kind: 'rejected', reason: 'unavailable' }
    for (
      let parent = target.parentElement;
      parent !== null && parent !== body;
      parent = parent.parentElement
    ) {
      const style = getComputedStyle(parent)
      if (
        /(auto|scroll|hidden)/u.test(style.overflowX + style.overflowY) &&
        (parent.scrollWidth > parent.clientWidth || parent.scrollHeight > parent.clientHeight)
      )
        return { kind: 'rejected', reason: 'nested' }
    }
    controller.scrollTo({
      top:
        readOffset().top +
        target.getBoundingClientRect().top -
        view.getBoundingClientRect().top -
        (options.blockOffset ?? 0),
      behavior: options.behavior ?? 'instant',
    })
    return { kind: 'scrolled' }
  },
  dispose() {
    if (disposed) return
    emit('viewport', null)
    pendingTarget?.cancel()
    disposed = true
    enhancementPending.value = false
    releaseTarget?.()
    releaseTarget = undefined
    enhancementGeneration += 1
    enhancement?.dispose()
    enhancement = undefined
    viewport.value?.removeEventListener('scroll', captureRetainedOffset)
    emit('controller', null)
  },
})

onMounted(() => {
  mounted = true
  registerTarget()
  if (props.enabled) emit('controller', controller)
  // Let owner defaults settle first, then expose the viewport for application restoration.
  emit('viewport', viewport.value ?? null)
  void enhance()
})
watch(
  () => [props.enabled, props.ownerId, props.xScrollable] as const,
  ([enabled, ownerId], [, previousOwnerId]) => {
    if (ownerId !== previousOwnerId) retainedOffset = undefined
    if (mounted && !disposed) {
      registerTarget()
      emit('controller', null)
      if (enabled) emit('controller', controller)
      void enhance()
    }
  },
  { flush: 'post' },
)
watch(
  () => appearance.value.motion,
  (motion) => {
    pendingTarget?.cancel()
    if (motion !== 'full') controller.cancelMotion()
    enhancement?.setFullMotion(motion === 'full')
  },
  { flush: 'sync' },
)
watch(
  viewport,
  (element, previous) => {
    previous?.removeEventListener('scroll', captureRetainedOffset)
    element?.addEventListener('scroll', captureRetainedOffset, { passive: true })
    registerTarget()
    if (mounted && !disposed) emit('viewport', element ?? null)
  },
  { flush: 'post' },
)
onBeforeUnmount(controller.dispose)
onDeactivated(() => {
  // KeepAlive detaches the viewport before this hook; its native offset can already be zero.
  // Preserve the last connected sample and stop vendors from sampling the detached layout.
  deactivated = true
  pendingTarget?.cancel()
  void enhance()
})
onActivated(() => {
  if (!deactivated) return
  deactivated = false
  if (retainedOffset !== undefined) controller.scrollTo({ ...retainedOffset, behavior: 'instant' })
  void enhance()
})
</script>

<template>
  <div
    ref="host"
    class="pavp-scroll-area"
    :data-enabled="enabled"
    :data-enhancement-pending="enabled && enhancementPending"
    :data-contained="contained"
    :data-horizontal="xScrollable"
  >
    <ScrollViewport
      class="pavp-scroll-area__viewport"
      :horizontal="xScrollable"
      @viewport="viewport = $event ?? undefined"
    >
      <div
        ref="content"
        class="pavp-scroll-area__content"
        :data-main-content="enabled && ownerId === 'architecture-console-content'"
      >
        <slot />
      </div>
    </ScrollViewport>
  </div>
</template>

<style scoped>
@layer components {
  .pavp-scroll-area {
    position: relative;
    block-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
    overscroll-behavior: contain;
  }

  .pavp-scroll-area[data-enabled='false'] {
    block-size: auto;
    overflow: visible;
  }

  .pavp-scroll-area__viewport {
    block-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    overscroll-behavior: contain;
  }

  /* Native offsets remain usable while the optional rail presentation loads. */
  .pavp-scroll-area[data-enhancement-pending='true'] > .pavp-scroll-area__viewport {
    scrollbar-width: none;
  }

  .pavp-scroll-area[data-horizontal='true'] > .pavp-scroll-area__viewport {
    overflow: auto hidden;
  }

  .pavp-scroll-area[data-enabled='false'] > .pavp-scroll-area__viewport {
    block-size: auto;
    overflow: visible;
  }

  .pavp-scroll-area__content {
    display: flow-root;
    min-inline-size: 100%;
  }

  .pavp-scroll-area__content[data-main-content='true'] {
    display: flex;
    flex-direction: column;
    min-block-size: 100%;
    min-inline-size: 0;
  }

  .pavp-scroll-area[data-enabled='true'][data-contained='true']
    > .pavp-scroll-area__viewport
    > .pavp-scroll-area__content {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  .pavp-scroll-area[data-enabled='false'][data-contained='true'],
  .pavp-scroll-area[data-enabled='false'][data-contained='true'] > .pavp-scroll-area__viewport,
  .pavp-scroll-area[data-enabled='false'][data-contained='true']
    > .pavp-scroll-area__viewport
    > .pavp-scroll-area__content {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: hidden;
  }

  @media (forced-colors: active) {
    .pavp-scroll-area__viewport {
      scrollbar-color: ButtonText Canvas;
    }
  }
}
</style>

<style>
@layer components {
  :where(.pavp-scroll-area__viewport) {
    overflow: hidden auto;
    scrollbar-width: thin;
    scrollbar-color: var(--ui-color-border-default) var(--ui-color-surface-panel);
  }
}

[data-pavp-scroll-position] {
  position: relative;
}

[data-pavp-naive-scroll] > [data-scrollbar-rail] {
  visibility: hidden;
}

body[data-pavp-document-scroll] > .os-scrollbar {
  z-index: var(--ui-z-base);
}

[data-pavp-textarea-scroll] > [data-scrollbar-rail][data-pavp-textarea-rail] > div {
  width: calc(var(--ui-space-content-gap) / 2 - var(--ui-border-width));
  cursor: grab;
  transition:
    width var(--ui-motion-duration) var(--ui-motion-easing),
    background-color var(--ui-motion-duration) var(--ui-motion-easing),
    transform var(--ui-motion-duration) var(--ui-motion-easing),
    opacity var(--ui-motion-duration) var(--ui-motion-easing);
}

[data-pavp-textarea-scroll] > [data-scrollbar-rail][data-pavp-textarea-rail] > div:hover {
  width: calc(var(--ui-space-content-gap) / 2);
}

[data-pavp-textarea-scroll] > [data-scrollbar-rail][data-pavp-textarea-rail] > div:active {
  cursor: grabbing;
}

html[data-motion='full']
  [data-pavp-textarea-scroll]
  > [data-scrollbar-rail][data-pavp-textarea-rail]
  > :is(.fade-in-transition-enter-from, .fade-in-transition-leave-to) {
  transform: translateX(100%);
}

html[data-motion='full']
  [data-pavp-textarea-scroll]:dir(rtl)
  > [data-scrollbar-rail][data-pavp-textarea-rail]
  > :is(.fade-in-transition-enter-from, .fade-in-transition-leave-to) {
  transform: translateX(-100%);
}

:is(html[data-motion='reduced'], html[data-motion='none'])
  [data-pavp-textarea-scroll]
  > [data-scrollbar-rail][data-pavp-textarea-rail]
  > div {
  transition: none !important;
}

:is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll]) .os-theme-pavp {
  --os-size: calc(var(--ui-space-content-gap) / 2);
  --os-track-border-radius: var(--ui-radius-small);
  --os-track-bg: var(--ui-color-surface-panel);
  --os-track-bg-hover: var(--ui-color-surface-panel);
  --os-track-bg-active: var(--ui-color-surface-panel);
  --os-handle-border-radius: var(--ui-radius-small);
  --os-handle-bg: var(--ui-color-border-default);
  --os-handle-bg-hover: var(--ui-color-text-secondary);
  --os-handle-bg-active: var(--ui-color-text-secondary);
  --os-handle-perpendicular-size: calc(100% - var(--ui-border-width));
  --os-handle-interactive-area-offset: calc(var(--ui-space-content-gap) / 2);
  transition:
    opacity var(--ui-motion-duration) var(--ui-motion-easing),
    visibility var(--ui-motion-duration) var(--ui-motion-easing),
    transform var(--ui-motion-duration) var(--ui-motion-easing);
}

:is(
    .pavp-scroll-area,
    [data-pavp-naive-scroll],
    [data-pavp-document-scroll]
  )[data-horizontal='true']
  .os-theme-pavp {
  --os-size: calc(var(--ui-space-content-gap) / 6);
  --os-handle-interactive-area-offset: calc(var(--ui-space-content-gap) * 5 / 6);
}

:is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp.os-scrollbar-unusable {
  visibility: hidden;
}

:is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])[data-pavp-scroll-idle]
  .os-theme-pavp.os-scrollbar-visible:not(.os-scrollbar-interaction) {
  opacity: 0;
  visibility: hidden;
}

html[data-motion='full']
  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp.os-scrollbar-horizontal.os-scrollbar-auto-hide-hidden:not(
    .os-scrollbar-interaction
  ),
html[data-motion='full']
  :is(
    .pavp-scroll-area,
    [data-pavp-naive-scroll],
    [data-pavp-document-scroll]
  )[data-pavp-scroll-idle]
  .os-theme-pavp.os-scrollbar-horizontal:not(.os-scrollbar-interaction) {
  transform: translateY(100%);
}

html[data-motion='full']
  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp.os-scrollbar-vertical.os-scrollbar-auto-hide-hidden:not(.os-scrollbar-interaction),
html[data-motion='full']
  :is(
    .pavp-scroll-area,
    [data-pavp-naive-scroll],
    [data-pavp-document-scroll]
  )[data-pavp-scroll-idle]
  .os-theme-pavp.os-scrollbar-vertical:not(.os-scrollbar-interaction) {
  transform: translateX(100%);
}

html[data-motion='full']
  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp.os-scrollbar-vertical.os-scrollbar-rtl.os-scrollbar-auto-hide-hidden:not(
    .os-scrollbar-interaction
  ),
html[data-motion='full']
  :is(
    .pavp-scroll-area,
    [data-pavp-naive-scroll],
    [data-pavp-document-scroll]
  )[data-pavp-scroll-idle]
  .os-theme-pavp.os-scrollbar-vertical.os-scrollbar-rtl:not(.os-scrollbar-interaction) {
  transform: translateX(-100%);
}

html[data-motion='reduced']
  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp,
html[data-motion='none']
  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp {
  transition: none;
}

:is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp
  .os-scrollbar-handle {
  cursor: grab;
}

html[data-motion='reduced'] .os-theme-pavp .os-scrollbar-handle,
html[data-motion='none'] .os-theme-pavp .os-scrollbar-handle {
  transition: none;
}

:is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll])
  .os-theme-pavp
  .os-scrollbar-handle:active {
  cursor: grabbing;
}

@media (forced-colors: active) {
  [data-pavp-textarea-scroll] > [data-scrollbar-rail][data-pavp-textarea-rail] > div {
    background: ButtonText;
  }

  [data-pavp-textarea-scroll] > [data-scrollbar-rail][data-pavp-textarea-rail] > div:hover {
    background: Highlight;
  }

  :is(.pavp-scroll-area, [data-pavp-naive-scroll], [data-pavp-document-scroll]) .os-theme-pavp {
    --os-track-bg: Canvas;
    --os-track-bg-hover: Canvas;
    --os-track-bg-active: Canvas;
    --os-handle-bg: ButtonText;
    --os-handle-bg-hover: Highlight;
    --os-handle-bg-active: Highlight;
    forced-color-adjust: none;
  }
}
</style>
