<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  PavpScrollbarPrimitive,
  type PavpScrollbarInstance,
} from '../adapters/naive/naive-scrollbar'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
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
const primitive = ref<PavpScrollbarInstance>()
let disposed = false
let mounted = false
let offset: UiScrollOffset = { left: 0, top: 0 }

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
      view.clientHeight > 0 &&
      primitive.value !== undefined,
    width: view?.clientWidth ?? 0,
    height: view?.clientHeight ?? 0,
    contentWidth: body?.scrollWidth ?? 0,
    contentHeight: body?.scrollHeight ?? 0,
    direction: style?.direction ?? '',
    writingMode: style?.writingMode ?? '',
  }
}

function readOffset(): UiScrollOffset {
  // PAVP geometry also observes synchronous native commands before their scroll event.
  // Neither the vendor instance's DOM nor its private container is inspected.
  const state = readState()
  const view = viewport.value?.getBoundingClientRect()
  const body = content.value?.getBoundingClientRect()
  if (state.ready && view !== undefined && body !== undefined)
    offset = {
      left: state.direction === 'rtl' ? view.right - body.right : view.left - body.left,
      top: view.top - body.top,
    }
  return { ...offset }
}

function onScroll(event: Event): void {
  if (!disposed && event.target instanceof HTMLElement)
    offset = { left: event.target.scrollLeft, top: event.target.scrollTop }
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
  scrollTo(input) {
    if (!valid(input)) return
    const current = readOffset()
    primitive.value?.scrollTo({
      left: input.left ?? current.left,
      top: input.top ?? current.top,
      behavior: behavior(input),
    })
  },
  scrollBy(input) {
    if (!valid(input)) return
    primitive.value?.scrollBy({
      left: input.left ?? 0,
      top: input.top ?? 0,
      behavior: behavior(input),
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
    emit('controller', null)
  },
})

onMounted(() => {
  mounted = true
  if (props.enabled) emit('controller', controller)
})
watch(
  () => [props.enabled, props.ownerId] as const,
  ([enabled]) => {
    if (mounted && !disposed) {
      emit('controller', null)
      if (enabled) emit('controller', controller)
    }
  },
  { flush: 'post' },
)
onBeforeUnmount(controller.dispose)
</script>

<template>
  <div
    ref="viewport"
    class="pavp-scroll-area"
    :data-enabled="enabled"
  >
    <PavpScrollbarPrimitive
      ref="primitive"
      class="pavp-scroll-area__primitive"
      :x-scrollable="xScrollable"
      trigger="hover"
      @scroll="onScroll"
    >
      <div
        ref="content"
        class="pavp-scroll-area__content"
      >
        <slot />
      </div>
    </PavpScrollbarPrimitive>
  </div>
</template>

<style scoped>
.pavp-scroll-area {
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

.pavp-scroll-area[data-enabled='false'] .pavp-scroll-area__primitive {
  block-size: auto;
}

.pavp-scroll-area__content {
  display: flow-root;
  min-inline-size: 100%;
}

@media (forced-colors: active) {
  .pavp-scroll-area {
    --pavp-scrollbar-color: ButtonText;
    --pavp-scrollbar-hover: Highlight;
    forced-color-adjust: none;
  }

  .pavp-scroll-area__content {
    forced-color-adjust: auto;
  }
}
</style>
