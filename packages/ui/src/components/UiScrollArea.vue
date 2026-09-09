<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  loadScrollEnhancement,
  type ScrollEnhancement,
} from '../adapters/scroll/scroll-enhancement-loader'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import ScrollViewport from '../adapters/motion/ScrollViewport.vue'
import type { UiScrollController, UiScrollInput, UiScrollOffset } from './scroll-contracts'

defineOptions({ name: 'UiScrollArea' })
const props = withDefaults(
  defineProps<{
    readonly ownerId: string
    readonly enabled?: boolean
    readonly xScrollable?: boolean
  }>(),
  { enabled: true, xScrollable: false },
)
const emit = defineEmits<{ controller: [controller: UiScrollController | null] }>()
defineSlots<{ default: (props: Readonly<Record<string, never>>) => unknown }>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiScrollArea requires the PAVP Appearance context.')
const viewport = ref<HTMLElement>()
const content = ref<HTMLElement>()
const host = ref<HTMLElement>()
let enhancement: ScrollEnhancement | undefined
let enhancementGeneration = 0
let disposed = false
let mounted = false

function readState(): ReturnType<UiScrollController['readState']> {
  const view = viewport.value
  const body = content.value
  const style = view === undefined ? undefined : getComputedStyle(view)
  return {
    ready:
      mounted &&
      !disposed &&
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

function canEnhance(): boolean {
  return mounted && !disposed && props.enabled
}

async function enhance(): Promise<void> {
  const generation = ++enhancementGeneration
  enhancement?.dispose()
  enhancement = undefined
  if (!canEnhance()) return
  const runtime = await loadScrollEnhancement()
  if (runtime === undefined || generation !== enhancementGeneration || !canEnhance()) return
  const view = viewport.value
  const body = content.value
  const target = host.value
  if (view === undefined || body === undefined || target === undefined) return
  try {
    enhancement = runtime.createScrollEnhancement({
      host: target,
      viewport: view,
      content: body,
      mainContent: props.ownerId === 'architecture-console-content',
      workspaceTabs: props.ownerId === 'workspace-tabs' && props.xScrollable,
      horizontal: props.xScrollable,
      navigation:
        props.ownerId === 'architecture-console-sidebar' ||
        props.ownerId === 'architecture-console-drawer',
    })
    enhancement.setFullMotion(appearance?.value.motion === 'full')
  } catch {
    enhancement?.dispose()
    enhancement = undefined
    console.warn('PAVP scroll enhancement unavailable; native scrolling remains active.')
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

const controller = Object.freeze<UiScrollController>({
  get ownerId() {
    return props.ownerId
  },
  readState,
  ownsBoundary: (boundary) => viewport.value !== undefined && boundary.contains(viewport.value),
  readOffset,
  cancelMotion() {
    if (disposed) return
    if (enhancement !== undefined) enhancement.cancelMotion()
    else viewport.value?.scrollTo({ ...readOffset(), behavior: 'instant' })
  },
  scrollTo(input) {
    if (!valid(input)) return
    const command = {
      ...input,
      behavior: behavior(input),
    }
    if (enhancement !== undefined) enhancement.scrollTo(command)
    else viewport.value?.scrollTo(command)
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
    disposed = true
    enhancementGeneration += 1
    enhancement?.dispose()
    enhancement = undefined
    emit('controller', null)
  },
})

onMounted(() => {
  mounted = true
  if (props.enabled) emit('controller', controller)
  void enhance()
})
watch(
  () => [props.enabled, props.ownerId, props.xScrollable] as const,
  ([enabled]) => {
    if (mounted && !disposed) {
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
    if (motion !== 'full') controller.cancelMotion()
    enhancement?.setFullMotion(motion === 'full')
  },
  { flush: 'sync' },
)
onBeforeUnmount(controller.dispose)
</script>

<template>
  <div
    ref="host"
    class="pavp-scroll-area"
    :data-enabled="enabled"
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
      >
        <slot />
      </div>
    </ScrollViewport>
  </div>
</template>

<style scoped>
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

.pavp-scroll-area[data-horizontal='true'] .pavp-scroll-area__viewport {
  overflow: auto hidden;
}

.pavp-scroll-area[data-enabled='false'] .pavp-scroll-area__viewport {
  block-size: auto;
  overflow: visible;
}

.pavp-scroll-area__content {
  display: flow-root;
  min-inline-size: 100%;
}

@media (forced-colors: active) {
  .pavp-scroll-area__viewport {
    scrollbar-color: ButtonText Canvas;
  }
}
</style>

<style>
:where(.pavp-scroll-area__viewport) {
  overflow: hidden auto;
  scrollbar-width: thin;
  scrollbar-color: var(--ui-color-text-secondary) var(--ui-color-surface-panel);
}

.pavp-scroll-area .os-theme-pavp {
  --os-size: calc(var(--ui-space-content-gap) / 2);
  --os-track-border-radius: var(--ui-radius-panel);
  --os-track-bg: var(--ui-color-surface-panel);
  --os-track-bg-hover: var(--ui-color-surface-panel);
  --os-track-bg-active: var(--ui-color-surface-panel);
  --os-handle-border-radius: var(--ui-radius-panel);
  --os-handle-bg: var(--ui-color-text-secondary);
  --os-handle-bg-hover: var(--ui-color-text-primary);
  --os-handle-bg-active: var(--ui-color-text-primary);
  --os-handle-interactive-area-offset: calc(var(--ui-space-content-gap) / 2);
}

.pavp-scroll-area[data-horizontal='true'] .os-theme-pavp {
  --os-size: calc(var(--ui-space-content-gap) / 6);
  --os-handle-interactive-area-offset: calc(var(--ui-space-content-gap) * 5 / 6);
}

@media (forced-colors: active) {
  .pavp-scroll-area .os-theme-pavp {
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
