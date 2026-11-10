<script setup lang="ts">
import { AnimatePresence, LazyMotion, MotionConfig, domMax, M, m, type PanInfo } from 'motion-v'
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { EffectiveAppearanceState } from '@platform/design-system'
import { useConsoleI18n } from '../../shared/i18n'
import type { LibraryEffect } from './motion-example-copy'

const props = defineProps<{
  readonly effect: LibraryEffect
  readonly preference: EffectiveAppearanceState['motion']
  readonly autoplayPreview: boolean
}>()
const { t } = useConsoleI18n()
const full = computed(() => props.preference === 'full')
const instant = computed(() => props.preference === 'none')
const transition = computed(() => ({ duration: instant.value ? 0 : full.value ? 0.32 : 0.08 }))
const springTransition = computed(() =>
  full.value
    ? { type: 'spring' as const, stiffness: 300, damping: 24, mass: 0.8 }
    : transition.value,
)
const selectionId = useId()

const replay = ref(0)
const previewStep = ref(0)
const alternate = computed(() => previewStep.value % 2 === 1)
const policyVersion = ref(0)
const visible = ref(true)
const selected = ref(false)
const dragged = ref(false)
const expanded = ref(false)
const order = ref([1, 2, 3])
const steps = ['motionGallery.received', 'motionGallery.processing', 'motionGallery.ready'] as const
const words = ['motionGallery.wordOne', 'motionGallery.wordTwo', 'motionGallery.wordThree'] as const
const collections = [
  'motionGallery.collectionOne',
  'motionGallery.collectionTwo',
  'motionGallery.collectionThree',
] as const
const selections = [
  'motionGallery.selectionOne',
  'motionGallery.selectionTwo',
  'motionGallery.selectionThree',
] as const
const pressedScale = 0.92
const dragDistance = 48

function settle(): void {
  replay.value = 0
  policyVersion.value += 1
}

function finishDrag(_event: PointerEvent, info: PanInfo): void {
  dragged.value = Math.hypot(info.offset.x, info.offset.y) >= 30
}

function reverseOrder(): void {
  order.value = [...order.value].reverse()
}

function fanTarget(index: number) {
  return {
    x: full.value && alternate.value ? `${String((index - 1) * 80)}%` : '0%',
    y: full.value && alternate.value ? Math.abs(index - 1) * 8 : 0,
    rotate: full.value && alternate.value ? (index - 1) * 12 : 0,
  }
}

function waveTransition(index: number) {
  return full.value
    ? {
        duration: 0.65,
        delay: index * 0.1,
        repeat: 1,
        repeatDelay: 0.2,
        ease: 'easeInOut' as const,
      }
    : transition.value
}

function playExample(): void {
  switch (props.effect) {
    case 'exit':
      visible.value = !visible.value
      break
    case 'expand':
      expanded.value = !expanded.value
      break
    case 'reorder':
      reverseOrder()
      break
    case 'icon-swap':
    case 'selection-lens':
    case 'grid-morph':
    case 'card-fan':
    case 'progress-fill':
      previewStep.value += 1
      break
    case 'press':
    case 'drag':
      break
    default:
      replay.value += 1
  }
}

watch(
  () => props.autoplayPreview,
  (preview) => {
    if (!preview || !full.value) return
    playExample()
  },
)

function onVisibility(): void {
  if (document.visibilityState === 'hidden') settle()
}

watch(() => props.preference, settle, { flush: 'sync' })
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="contents">
    <div
      class="wb-motion-stage wb-bento-reserved rounded-panel grid col-span-full min-w-0 place-items-center overflow-clip bg-surface-page p-page-inline"
      :class="{ 'py-section-block': effect === 'card-fan' }"
    >
      <LazyMotion
        :features="domMax"
        strict
      >
        <MotionConfig
          :key="policyVersion"
          :reduced-motion="full ? 'never' : 'always'"
          :skip-animations="instant"
          :transition="transition"
        >
          <m.div
            v-if="effect === 'enter'"
            :key="replay"
            :initial="replay && !instant ? (full ? { opacity: 0, y: 24 } : { opacity: 0 }) : false"
            :animate="{ opacity: 1, y: 0 }"
            class="rounded-control flex min-w-0 shadow-panel items-center bg-surface-panel gap-content-gap p-page-inline"
          >
            <span
              class="i-lucide-circle-check shrink-0 size-icon-medium text-control-primary"
              aria-hidden="true"
            />
            <div class="grid">
              <strong class="text-text-primary">{{ t('motionGallery.saved') }}</strong>
              <span class="text-text-secondary">{{ t('motionGallery.savedDetail') }}</span>
            </div>
          </m.div>

          <m.div
            v-else-if="effect === 'spring-pop'"
            :key="replay"
            :initial="
              replay && !instant
                ? full
                  ? { opacity: 0, scale: 0.8, y: 20 }
                  : { opacity: 0 }
                : false
            "
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :transition="{ ...springTransition, opacity: transition }"
            class="text-center rounded-panel grid min-w-0 shadow-panel justify-items-center bg-surface-panel gap-content-gap p-page-inline"
          >
            <span
              class="rounded-control shrink-0 grid place-items-center bg-action-primary min-h-target-enhanced min-w-target-enhanced text-text-on-action"
              aria-hidden="true"
            >
              <span class="i-lucide-sparkles size-icon-large" />
            </span>
            <strong class="text-subheading text-text-primary">{{
              t('motionGallery.springReady')
            }}</strong>
            <span class="text-text-secondary">{{ t('motionGallery.springDetail') }}</span>
          </m.div>

          <div
            v-else-if="effect === 'slide-reveal'"
            class="rounded-panel min-w-0 overflow-clip"
          >
            <m.div
              :key="replay"
              :initial="
                replay && !instant ? (full ? { opacity: 0, x: '-100%' } : { opacity: 0 }) : false
              "
              :animate="{ opacity: 1, x: '0%' }"
              :transition="full ? { duration: 0.48, ease: [0.22, 1, 0.36, 1] } : transition"
              class="grid min-w-0 bg-action-primary gap-content-gap p-page-inline text-text-on-action"
            >
              <span
                class="i-lucide-lightbulb size-icon-large"
                aria-hidden="true"
              />
              <strong class="text-subheading">{{ t('motionGallery.slideTitle') }}</strong>
              <span>{{ t('motionGallery.slideDetail') }}</span>
            </m.div>
          </div>

          <p
            v-else-if="effect === 'text-reveal'"
            class="font-title-weight m-0 flex flex-wrap justify-center gap-content-gap text-text-primary text-title"
            :aria-label="words.map((word) => t(word)).join(' ')"
          >
            <span
              v-for="(word, index) in words"
              :key="word"
              class="inline-block overflow-clip"
              aria-hidden="true"
            >
              <m.span
                :key="replay"
                class="inline-block"
                :class="{ 'text-control-primary': index === 1 }"
                :initial="
                  replay && !instant ? (full ? { opacity: 0, y: '100%' } : { opacity: 0 }) : false
                "
                :animate="{ opacity: 1, y: '0%' }"
                :transition="
                  full
                    ? { duration: 0.45, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }
                    : transition
                "
              >
                {{ t(word) }}
              </m.span>
            </span>
          </p>

          <div
            v-else-if="effect === 'exit'"
            class="grid min-w-0 place-items-center"
          >
            <AnimatePresence :initial="false">
              <m.div
                v-if="visible"
                :initial="instant ? false : { opacity: 0 }"
                :animate="{ opacity: 1 }"
                :exit="full ? { opacity: 0, y: 18 } : { opacity: 0 }"
                class="rounded-control flex col-start-1 row-start-1 shadow-panel items-center bg-surface-panel gap-content-gap p-page-inline"
              >
                <span
                  class="i-lucide-inbox shrink-0 size-icon-medium text-control-primary"
                  aria-hidden="true"
                />
                <div class="grid">
                  <strong class="text-text-primary">{{ t('motionGallery.notice') }}</strong>
                  <span class="text-text-secondary">{{ t('motionGallery.noticeDetail') }}</span>
                </div>
              </m.div>
            </AnimatePresence>
          </div>

          <ol
            v-else-if="effect === 'stagger'"
            class="m-0 list-none rounded-control grid shadow-panel bg-surface-panel gap-content-gap p-page-inline"
          >
            <m.li
              v-for="(step, index) in steps"
              :key="`${step}-${replay}`"
              :initial="
                replay && !instant ? (full ? { opacity: 0, y: 12 } : { opacity: 0 }) : false
              "
              :animate="{ opacity: 1, y: 0 }"
              :transition="full ? { ...transition, delay: index * 0.1 } : transition"
              class="flex items-center gap-content-gap text-text-primary"
            >
              <span
                class="i-lucide-circle-check shrink-0 size-icon-small text-control-primary"
                aria-hidden="true"
              />
              {{ t(step) }}
            </m.li>
          </ol>

          <M
            v-else-if="effect === 'press'"
            as-child
            :animate="full && autoplayPreview ? { scale: [1, pressedScale, 1] } : { scale: 1 }"
            :while-press="instant ? {} : full ? { scale: pressedScale } : { opacity: 0.75 }"
          >
            <NButton
              type="primary"
              size="large"
              :aria-pressed="selected"
              @click="selected = !selected"
            >
              <template #icon>
                <span
                  :class="selected ? 'i-lucide-bookmark-check' : 'i-lucide-bookmark'"
                  aria-hidden="true"
                />
              </template>
              {{ t(selected ? 'motionGallery.bookmarked' : 'motionGallery.bookmark') }}
            </NButton>
          </M>

          <m.div
            v-else-if="effect === 'drag'"
            :drag="full ? 'x' : false"
            :animate="full && autoplayPreview ? { x: [0, dragDistance, 0] } : { x: 0 }"
            :drag-constraints="{ left: 0, right: dragDistance }"
            :drag-elastic="0.2"
            drag-snap-to-origin
            class="rounded-control flex min-w-0 shadow-panel items-center bg-surface-panel gap-content-gap p-page-inline text-text-primary"
            :class="{ 'cursor-grab': full }"
            @drag-start="dragged = false"
            @drag-end="finishDrag"
          >
            <span
              class="rounded-control shrink-0 grid place-items-center bg-action-primary min-h-target-enhanced min-w-target-enhanced text-text-on-action"
              aria-hidden="true"
            >
              <span :class="dragged ? 'i-lucide-check' : 'i-lucide-grip-vertical'" />
            </span>
            {{ t(dragged ? 'motionGallery.dragDone' : 'motionGallery.dragAction') }}
          </m.div>

          <m.div
            v-else-if="effect === 'expand'"
            :layout="full"
            class="rounded-control grid min-w-0 shadow-panel bg-surface-panel gap-content-gap p-page-inline"
          >
            <div class="flex items-center gap-content-gap text-text-primary">
              <span
                class="i-lucide-file-text shrink-0 size-icon-medium text-control-primary"
                aria-hidden="true"
              />
              <strong>{{ t('motionGallery.details') }}</strong>
            </div>
            <span
              v-if="expanded"
              class="text-text-secondary"
            >
              {{ t('motionGallery.detailsBody') }}
            </span>
          </m.div>

          <NButton
            v-else-if="effect === 'icon-swap'"
            text
            type="primary"
            :aria-pressed="alternate"
            class="max-w-full min-w-0"
            @click="playExample"
          >
            <span
              class="rounded-panel grid min-w-0 whitespace-normal shadow-panel justify-items-center bg-surface-panel gap-content-gap p-page-inline"
            >
              <span
                class="grid place-items-center"
                aria-hidden="true"
              >
                <AnimatePresence
                  :initial="false"
                  mode="wait"
                >
                  <m.span
                    :key="String(alternate)"
                    class="col-start-1 row-start-1 size-icon-extra-large"
                    :class="alternate ? 'i-lucide-bookmark-check' : 'i-lucide-bookmark'"
                    :initial="
                      instant
                        ? false
                        : full
                          ? { opacity: 0, rotate: -60, scale: 0.65 }
                          : { opacity: 0 }
                    "
                    :animate="{ opacity: 1, rotate: 0, scale: 1 }"
                    :exit="full ? { opacity: 0, rotate: 60, scale: 0.65 } : { opacity: 0 }"
                    :transition="transition"
                  />
                </AnimatePresence>
              </span>
              <strong>{{
                t(alternate ? 'motionGallery.bookmarked' : 'motionGallery.bookmark')
              }}</strong>
            </span>
          </NButton>

          <div
            v-else-if="effect === 'success-draw'"
            class="grid justify-items-center gap-content-gap"
          >
            <span
              class="rounded-control grid shadow-panel place-items-center bg-surface-panel p-page-inline text-control-success"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 48 48"
                class="size-icon-extra-large"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <m.path
                  :key="replay"
                  d="M10 24 20 34 38 14"
                  :initial="
                    replay && !instant
                      ? full
                        ? { pathLength: 0, opacity: 1 }
                        : { pathLength: 1, opacity: 0 }
                      : false
                  "
                  :animate="{ pathLength: 1, opacity: 1 }"
                  :transition="full ? { duration: 0.65, ease: 'easeInOut' } : transition"
                />
              </svg>
            </span>
            <strong class="text-subheading text-text-primary">{{
              t('motionGallery.successLabel')
            }}</strong>
          </div>

          <m.div
            v-else-if="effect === 'error-shake'"
            :key="replay"
            :initial="full && replay ? { x: 0 } : false"
            :animate="full && replay ? { x: [0, -7, 6, -4, 2, 0] } : { x: 0 }"
            :transition="full ? { duration: 0.4, ease: 'easeOut' } : transition"
            class="rounded-control flex min-w-0 shadow-panel items-center bg-surface-panel gap-content-gap p-page-inline"
          >
            <span
              class="i-lucide-circle-alert shrink-0 size-icon-large text-control-error"
              aria-hidden="true"
            />
            <div class="grid min-w-0">
              <strong class="text-text-primary">{{ t('motionGallery.errorLabel') }}</strong>
              <span class="text-text-secondary">{{ t('motionGallery.errorDetail') }}</span>
            </div>
          </m.div>

          <div
            v-else-if="effect === 'selection-lens'"
            role="group"
            :aria-label="t('motionGallery.selectionLens')"
            class="rounded-control flex flex-wrap justify-center bg-surface-page gap-content-gap"
          >
            <NButton
              v-for="(selection, index) in selections"
              :key="selection"
              quaternary
              :aria-pressed="previewStep % selections.length === index"
              class="min-h-target-enhanced min-w-target-enhanced"
              @click="previewStep = index"
            >
              <m.span
                v-if="previewStep % selections.length === index"
                v-bind="full ? { layoutId: selectionId } : {}"
                :transition="springTransition"
                class="rounded-control shadow-panel inset-0 absolute bg-surface-panel"
                aria-hidden="true"
              />
              <span class="relative">{{ t(selection) }}</span>
            </NButton>
          </div>

          <div
            v-else-if="effect === 'grid-morph'"
            class="grid min-w-0 w-full gap-content-gap"
            :class="alternate ? 'grid-cols-1' : 'grid-cols-3 layout-narrow:grid-cols-2'"
          >
            <m.div
              v-for="(collection, index) in collections"
              :key="collection"
              :layout="full"
              :transition="springTransition"
              class="rounded-panel flex min-w-0 shadow-panel items-center bg-surface-panel gap-content-gap p-page-inline text-text-primary"
              :class="[
                alternate ? 'flex-row' : 'flex-col',
                { 'layout-narrow:col-span-2': !alternate && index === collections.length - 1 },
              ]"
            >
              <m.span
                :layout="full ? 'position' : false"
                class="shrink-0 size-icon-large text-control-primary"
                :class="
                  index === 0
                    ? 'i-lucide-lightbulb'
                    : index === 1
                      ? 'i-lucide-palette'
                      : 'i-lucide-leaf'
                "
                aria-hidden="true"
              />
              <m.strong
                :layout="full ? 'position' : false"
                class="text-center min-w-0 break-words"
              >
                {{ t(collection) }}
              </m.strong>
            </m.div>
          </div>

          <div
            v-else-if="effect === 'card-fan'"
            class="grid min-w-0 w-full place-items-center py-section-block"
            :class="!full && alternate ? 'grid-cols-1 gap-content-gap' : 'grid-cols-3'"
          >
            <m.div
              v-for="(collection, index) in collections"
              :key="collection"
              :initial="false"
              :animate="fanTarget(index)"
              :transition="full ? { ...springTransition, delay: index * 0.04 } : transition"
              :aria-hidden="!alternate && index !== collections.length - 1"
              class="rounded-panel grid min-w-0 w-full shadow-panel justify-items-center bg-surface-panel gap-content-gap p-page-inline text-text-primary layout-narrow:px-button-inline"
              :class="{ 'col-start-2 row-start-1': full || !alternate }"
            >
              <span
                class="size-icon-extra-large text-control-primary"
                :class="
                  index === 0
                    ? 'i-lucide-lightbulb'
                    : index === 1
                      ? 'i-lucide-palette'
                      : 'i-lucide-leaf'
                "
                aria-hidden="true"
              />
              <strong class="text-center min-w-0 break-words">{{ t(collection) }}</strong>
            </m.div>
          </div>

          <div
            v-else-if="effect === 'progress-fill'"
            class="rounded-panel grid min-w-0 w-full shadow-panel bg-surface-panel gap-content-gap p-page-inline"
          >
            <div
              class="flex flex-wrap items-center justify-between gap-content-gap text-text-primary"
            >
              <strong>{{ t('motionGallery.progressLabel') }}</strong>
              <span class="font-title-weight text-control-primary text-subheading">{{
                alternate ? '100%' : '32%'
              }}</span>
            </div>
            <div
              role="progressbar"
              :aria-label="t('motionGallery.progressLabel')"
              :aria-valuenow="alternate ? 100 : 32"
              :aria-valuemin="0"
              :aria-valuemax="100"
              class="rounded-control grid overflow-clip bg-surface-page"
            >
              <svg
                viewBox="0 0 100 2"
                class="h-auto w-full text-control-primary"
                aria-hidden="true"
              >
                <m.rect
                  x="0"
                  y="0"
                  width="100"
                  height="2"
                  rx="1"
                  fill="currentColor"
                  :initial="false"
                  :animate="{ scaleX: alternate ? 1 : 0.32, originX: 0 }"
                  :transition="
                    full ? { type: 'spring', stiffness: 90, damping: 22 } : { duration: 0 }
                  "
                />
              </svg>
            </div>
          </div>

          <div
            v-else-if="effect === 'loading-wave'"
            class="grid justify-items-center gap-content-gap"
          >
            <div
              class="flex items-center gap-content-gap p-page-inline"
              aria-hidden="true"
            >
              <m.span
                v-for="number in 5"
                :key="`${number}-${replay}`"
                :initial="full && replay ? { y: 0, scale: 1, opacity: 0.45 } : false"
                :animate="
                  full && replay
                    ? { y: [0, -18, 0], scale: [1, 1.15, 1], opacity: [0.45, 1, 0.45] }
                    : { y: 0, scale: 1, opacity: 1 }
                "
                :transition="waveTransition(number - 1)"
                class="rounded-control bg-action-primary size-icon-small"
              />
            </div>
            <strong class="text-text-primary">{{ t('motionGallery.loadingLabel') }}</strong>
          </div>

          <div
            v-else-if="effect === 'orbit'"
            class="grid min-w-0 w-full justify-items-center gap-content-gap text-control-primary"
          >
            <svg
              viewBox="0 0 240 100"
              class="h-auto w-full"
              aria-hidden="true"
            >
              <circle
                cx="120"
                cy="50"
                r="32"
                fill="none"
                stroke="currentColor"
                stroke-width="1"
                opacity="0.2"
              />
              <circle
                cx="120"
                cy="50"
                r="7"
                fill="currentColor"
              />
              <m.g
                v-for="number in 3"
                :key="`${number}-${replay}`"
                :initial="full && replay ? { rotate: (number - 1) * 120 } : false"
                :animate="
                  full && replay
                    ? { rotate: [(number - 1) * 120, (number - 1) * 120 + 360] }
                    : { rotate: (number - 1) * 120 }
                "
                :transition="full ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0 }"
              >
                <circle
                  cx="120"
                  cy="18"
                  r="4"
                  fill="currentColor"
                />
                <circle
                  cx="120"
                  cy="82"
                  r="4"
                  fill="currentColor"
                  opacity="0"
                />
              </m.g>
            </svg>
            <strong class="text-text-primary">{{ t('motionGallery.orbitLabel') }}</strong>
          </div>

          <div
            v-else-if="effect === 'reorder'"
            class="flex flex-wrap justify-center gap-content-gap"
          >
            <m.div
              v-for="number in order"
              :key="number"
              :layout="full"
              class="rounded-control grid shadow-panel place-items-center bg-surface-panel p-page-inline text-control-primary"
            >
              <span class="font-title-weight text-subheading">{{ number }}</span>
            </m.div>
          </div>
        </MotionConfig>
      </LazyMotion>
    </div>

    <div class="flex flex-wrap gap-content-gap">
      <NButton
        v-if="effect === 'enter' || effect === 'stagger'"
        type="primary"
        @click="replay += 1"
      >
        <template #icon>
          <span
            class="i-lucide-play inline-block"
            aria-hidden="true"
          />
        </template>
        {{ t('motionGallery.replay') }}
      </NButton>
      <NButton
        v-else-if="effect === 'exit'"
        type="primary"
        @click="visible = !visible"
      >
        {{ t(visible ? 'motionGallery.hide' : 'motionGallery.show') }}
      </NButton>
      <NButton
        v-else-if="effect === 'drag'"
        type="primary"
        @click="dragged = !dragged"
      >
        {{ t(dragged ? 'motionGallery.resetDrag' : 'motionGallery.completeDrag') }}
      </NButton>
      <NButton
        v-else-if="effect === 'expand'"
        type="primary"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        {{ t(expanded ? 'motionGallery.collapse' : 'motionGallery.expand') }}
      </NButton>
      <NButton
        v-else-if="effect === 'reorder'"
        type="primary"
        @click="reverseOrder"
      >
        {{ t('motionGallery.reorder') }}
      </NButton>
      <NButton
        v-else-if="effect !== 'press'"
        type="primary"
        @click="playExample"
      >
        {{
          t(
            effect === 'icon-swap' ||
              effect === 'selection-lens' ||
              effect === 'grid-morph' ||
              effect === 'card-fan' ||
              effect === 'progress-fill'
              ? 'motionGallery.switchPreview'
              : 'motionGallery.replay',
          )
        }}
      </NButton>
    </div>
  </div>
</template>
