<script setup lang="ts">
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  useId,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import type { RouteTransitionPresetId } from '../app/router/route-transition/route-transition-types'
import MotionGallery from '../app/workbench/MotionGallery.vue'
import { libraryCopy, type LibraryEffect } from '../app/workbench/motion-example-copy'
import MotionRoutePreview from '../app/workbench/MotionRoutePreview.vue'
import MotionSpecimen from '../app/workbench/MotionSpecimen.vue'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'

defineOptions({ name: 'WorkbenchMotionPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()

const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const motion = computed(() => appearance.snapshot.value.motion)
const limitedMotionCopy = {
  reduced: 'workbench.motion.reduced',
  none: 'workbench.motion.none',
} as const

interface EffectCopy {
  readonly title: ConsoleMessageKey
  readonly description: ConsoleMessageKey
}

const routeCopy = {
  'route-transition.none': {
    title: 'motionShowcase.immediate',
    description: 'motionShowcase.immediateHint',
  },
  'route-transition.content-crossfade': {
    title: 'motionShowcase.crossfade',
    description: 'motionShowcase.crossfadeHint',
  },
  'route-transition.axis-inline-soft': {
    title: 'motionShowcase.axis',
    description: 'motionShowcase.axisHint',
  },
  'route-transition.drill-soft': {
    title: 'motionShowcase.drill',
    description: 'motionShowcase.drillHint',
  },
  'route-transition.sheet-soft': {
    title: 'motionShowcase.sheet',
    description: 'motionShowcase.sheetHint',
  },
} as const satisfies Record<RouteTransitionPresetId, EffectCopy>

const groups = {
  presence: {
    title: 'motionGallery.presence',
    effects: ['enter', 'spring-pop', 'slide-reveal', 'text-reveal', 'stagger', 'exit'],
  },
  gesture: {
    title: 'motionGallery.gesture',
    effects: ['press', 'icon-swap', 'success-draw', 'error-shake', 'drag'],
  },
  layout: {
    title: 'motionGallery.layout',
    effects: ['selection-lens', 'grid-morph', 'card-fan', 'expand', 'reorder'],
  },
  rhythm: {
    title: 'motionGallery.rhythm',
    effects: ['progress-fill', 'loading-wave', 'orbit'],
  },
  routes: {
    title: 'motionShowcase.routes',
    effects: [
      'route-transition.content-crossfade',
      'route-transition.axis-inline-soft',
      'route-transition.drill-soft',
      'route-transition.sheet-soft',
      'route-transition.none',
    ],
  },
} as const satisfies Record<
  string,
  {
    readonly title: ConsoleMessageKey
    readonly effects: readonly [
      LibraryEffect | RouteTransitionPresetId,
      ...(LibraryEffect | RouteTransitionPresetId)[],
    ]
  }
>

type Group = keyof typeof groups
type Effect = LibraryEffect | RouteTransitionPresetId

const group = ref<Group>('presence')
const categoryMenuOpen = ref(false)
const categoryOptions = computed(() =>
  Object.entries(groups).map(([value, category]) => ({ value, label: t(category.title) })),
)
const effect = ref<Effect>(groups.presence.effects[0])
const pageId = useId()
const direction = ref<'forward' | 'reverse'>('forward')
const copy = { ...libraryCopy, ...routeCopy }
const playbackOrder = (Object.keys(groups) as Group[]).flatMap((category) =>
  groups[category].effects.map((id) => ({ category, id })),
)
watch(
  effect,
  (next, previous) => {
    direction.value =
      playbackOrder.findIndex(({ id }) => id === next) >=
      playbackOrder.findIndex(({ id }) => id === previous)
        ? 'forward'
        : 'reverse'
  },
  { flush: 'sync' },
)

function disableLeavingScene(element: Element): void {
  element.setAttribute('data-leave-direction', direction.value)
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}

function enableEnteringScene(element: Element): void {
  element.removeAttribute('data-leave-direction')
  element.removeAttribute('inert')
  element.removeAttribute('aria-hidden')
}
// Hold the initial scene and leave time to read after each preview.
const sceneLeadTime = 600
const sceneReadingTime = 3400
const autoplay = ref(false)
const previewCue = ref(false)
let playbackTimer: number | undefined
let opened = false

function stopPlayback(): void {
  window.clearTimeout(playbackTimer)
  playbackTimer = undefined
  autoplay.value = false
  previewCue.value = false
}

function queuePreview(nextIndex?: number): void {
  previewCue.value = false
  playbackTimer = window.setTimeout(() => {
    playbackTimer = undefined
    previewCue.value = true
    if (nextIndex !== undefined) {
      playbackTimer = window.setTimeout(() => {
        showPlaybackEffect(nextIndex)
      }, sceneReadingTime)
    }
  }, sceneLeadTime)
}

function showPlaybackEffect(index: number): void {
  const entry = playbackOrder[index]
  if (!entry) {
    stopPlayback()
    return
  }
  group.value = entry.category
  effect.value = entry.id
  queuePreview(index + 1)
}

function togglePlayback(): void {
  if (autoplay.value) {
    stopPlayback()
    return
  }
  if (motion.value !== 'full' || document.hidden) return
  stopPlayback()
  autoplay.value = true
  showPlaybackEffect(0)
}

function selectEffect(next: Effect): void {
  stopPlayback()
  effect.value = next
  if (motion.value === 'full' && !document.hidden) queuePreview()
}

function selectGroup(next: string): void {
  if (!Object.hasOwn(groups, next)) return
  categoryMenuOpen.value = false
  if (next === group.value) {
    stopPlayback()
    return
  }
  group.value = next as Group
  selectEffect(groups[group.value].effects[0])
}

function onVisibility(): void {
  if (document.hidden) stopPlayback()
}

function isRouteEffect(id: Effect): id is RouteTransitionPresetId {
  return Object.hasOwn(routeCopy, id)
}

const request = computed(() => {
  const selection = effect.value
  const description = t(copy[selection].description)
  return isRouteEffect(selection)
    ? `${t('motionShowcase.requestPrefix')}${selection}${t('motionShowcase.requestSeparator')}${description}${t('motionShowcase.requestSuffix')}`
    : `${t('motionGallery.requestPrefix')}${t(copy[selection].title)}${t('motionGallery.requestSeparator')}${description}${t('motionGallery.requestSuffix')}`
})

const active = ref(true)
const registerScrollController = inject(routerScrollControllerKey)
if (registerScrollController === undefined)
  throw new Error('The animation showcase requires the Router Scroll Controller port.')
let unregisterScrollController: (() => void) | undefined
function connectContentScroll(controller: UiScrollController | null): void {
  unregisterScrollController?.()
  unregisterScrollController = undefined
  if (controller !== null && active.value)
    unregisterScrollController = registerScrollController?.(controller)
}
watch(motion, stopPlayback, { flush: 'sync' })
onActivated(() => {
  active.value = true
  document.addEventListener('visibilitychange', onVisibility)
  if (!opened) {
    opened = true
    togglePlayback()
  }
})
onDeactivated(() => {
  active.value = false
  categoryMenuOpen.value = false
  connectContentScroll(null)
  document.removeEventListener('visibilitychange', onVisibility)
  stopPlayback()
})
onScopeDispose(() => {
  connectContentScroll(null)
  document.removeEventListener('visibilitychange', onVisibility)
  stopPlayback()
})
</script>

<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
  >
    <NCard
      tag="section"
      :bordered="false"
      class="wb-motion-page flex-1 min-h-0 min-w-0"
      :data-motion="motion"
      :data-active="active"
      :data-direction="direction"
      content-class="wb-page flex flex-col min-h-0 min-w-0 layout-narrow:gap-content-gap"
    >
      <div class="flex shrink-0 flex-wrap items-center justify-between gap-content-gap">
        <span
          v-if="motion !== 'full'"
          class="text-text-secondary"
        >
          {{ t(limitedMotionCopy[motion]) }}
        </span>
        <NButton
          v-if="motion === 'full'"
          type="primary"
          secondary
          @click="togglePlayback"
        >
          <template #icon>
            <span
              :class="autoplay ? 'i-lucide-pause' : 'i-lucide-play'"
              aria-hidden="true"
            />
          </template>
          {{ t(autoplay ? 'motionShowcase.pausePlayback' : 'motionShowcase.playAll') }}
        </NButton>
        <div
          role="tablist"
          :aria-label="t('motionGallery.categories')"
          class="flex flex-1 flex-wrap min-w-0 gap-content-gap layout-narrow:hidden"
        >
          <NButton
            v-for="(category, id) in groups"
            :id="`${pageId}-category-${id}`"
            :key="id"
            role="tab"
            quaternary
            :type="id === group ? 'primary' : 'default'"
            :aria-selected="id === group"
            :aria-controls="`${pageId}-effects`"
            @click="selectGroup(id)"
          >
            <span class="relative">
              {{ t(category.title) }}
              <span
                class="wb-motion-tab-marker"
                :data-selected="id === group"
                aria-hidden="true"
              />
            </span>
          </NButton>
        </div>
        <div class="flex-1 min-w-0 hidden layout-narrow:block">
          <NSelect
            :value="group"
            :options="categoryOptions"
            :show="active && categoryMenuOpen"
            :aria-label="t('motionGallery.categories')"
            to="#pavp-overlay-root"
            @update:value="selectGroup"
            @update:show="categoryMenuOpen = $event"
            @pointerdown.capture="stopPlayback"
          />
        </div>
      </div>

      <UiScrollArea
        class="flex-1 min-h-0 min-w-0"
        owner-id="architecture-console-content"
        :enabled="active"
        @controller="connectContentScroll"
      >
        <div class="wb-page grid min-w-0 items-start layout-narrow:gap-content-gap">
          <div
            :id="`${pageId}-effects`"
            role="tabpanel"
            :aria-labelledby="`${pageId}-category-${group}`"
            class="min-w-0"
          >
            <div
              role="tablist"
              :aria-label="t('motionGallery.effects')"
              class="flex flex-wrap min-w-0 gap-content-gap"
            >
              <NButton
                v-for="id in groups[group].effects"
                :id="`${pageId}-effect-${id}`"
                :key="id"
                role="tab"
                quaternary
                :type="id === effect ? 'primary' : 'default'"
                :aria-selected="id === effect"
                :aria-controls="`${pageId}-preview`"
                @click="selectEffect(id)"
              >
                <span class="relative">
                  {{ t(copy[id].title) }}
                  <span
                    class="wb-motion-tab-marker"
                    :data-selected="id === effect"
                    aria-hidden="true"
                  />
                </span>
              </NButton>
            </div>
          </div>

          <div
            :id="`${pageId}-preview`"
            role="tabpanel"
            :aria-labelledby="`${pageId}-effect-${effect}`"
            class="grid min-w-0 items-start relative"
          >
            <Transition
              name="wb-motion-scene"
              :css="active && motion !== 'none'"
              @before-leave="disableLeavingScene"
              @before-enter="enableEnteringScene"
              @leave-cancelled="enableEnteringScene"
            >
              <MotionSpecimen
                :key="effect"
                :title="t(copy[effect].title)"
                :description="t(copy[effect].description)"
                :request="request"
                class="col-start-1 row-start-1 min-w-0"
                @pointerdown.capture="stopPlayback"
                @click.capture="stopPlayback"
              >
                <MotionRoutePreview
                  v-if="isRouteEffect(effect)"
                  :preset="effect"
                  :motion="motion"
                  :autoplay-preview="previewCue"
                />
                <MotionGallery
                  v-else-if="active"
                  :effect="effect"
                  :preference="motion"
                  :autoplay-preview="previewCue"
                />
              </MotionSpecimen>
            </Transition>
          </div>
        </div>
      </UiScrollArea>
    </NCard>
  </WorkbenchPage>
</template>
