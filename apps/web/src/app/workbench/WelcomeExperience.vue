<script setup lang="ts">
import { useUiMotion, type UiMotionHandle, type UiMotionPreset } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { computed, onActivated, onDeactivated, onMounted, onScopeDispose, ref, watch } from 'vue'
import { LazyMotion, MotionConfig, domMax, m } from 'motion-v'
import { useConsoleI18n } from '../../shared/i18n'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../router/application-navigation'
import { registeredRouteDestination } from '../router/route-input'
import { useRouteRevealBoundary } from '../router/route-transition/route-motion-player'
import WelcomeCapabilityStage from './WelcomeCapabilityStage.vue'

defineOptions({ name: 'WelcomeExperience' })
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const enterWorkbench = useApplicationLinkActivation()
const active = ref(true)
const motion = useUiMotion()
const page = ref<HTMLElement | null>(null)
const selectedExpression = ref<'a' | 'b'>('a')
const waveVisible = ref(false)
let waveGroup: HTMLElement | null = null
// Page-owned score; route completion is a lifecycle signal, never a guessed delay.
// Primary navigation stays visible; focusing a local demo control reveals its entire group.
const reveal = useRouteRevealBoundary()
const entrances = [
  ['.wb-home-eyebrow', 'curtain', 650],
  ['.wb-home-wordmark', 'text-reveal', 1000],
  ['.wb-home-subtitle', 'text-dust', 950],
  ['.wb-home-description', 'curtain', 850],
  ['.wb-home-signature', 'curtain', 750],
  ['.wb-home-preview', 'card-expand', 1100],
  ['.wb-home-palette-card', 'iris', 1000],
  ['.wb-home-feature:nth-child(1)', 'curtain', 850],
  ['.wb-home-feature:nth-child(2)', 'card-expand', 950],
  ['.wb-home-feature:nth-child(3)', 'iris', 1050],
  ['.wb-home-expression > div:first-child', 'curtain', 950],
  ['.wb-home-expression-preview', 'ink-reveal', 1150],
] as const satisfies readonly (readonly [string, UiMotionPreset, number])[]
interface Entrance {
  preset: UiMotionPreset
  durationMs: number
}
const pendingEntrances = new Map<HTMLElement, Entrance>()
const held = new Set<HTMLElement>()
const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>()
const running = new Map<HTMLElement, UiMotionHandle>()
let viewport: HTMLElement | null = null
let entranceObserver: IntersectionObserver | undefined
let arrival = 0
let ready = false
function releaseHeld(): void {
  for (const target of held) target.classList.remove('opacity-0')
  held.clear()
}
function stopEntrances(): void {
  arrival += 1
  ready = false
  waveVisible.value = false
  waveGroup = null
  entranceObserver?.disconnect()
  entranceObserver = undefined
  clearScheduledEntrances()
  for (const handle of running.values()) handle.cancel()
  running.clear()
  viewport = null
  releaseHeld()
  pendingEntrances.clear()
}
function hold(target: HTMLElement): void {
  target.classList.add('opacity-0')
  held.add(target)
}
function clearScheduledEntrances(): void {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
}
function isVisible(target: HTMLElement): boolean {
  if (!target.isConnected || !viewport) return false
  const rect = target.getBoundingClientRect()
  const frame = viewport.getBoundingClientRect()
  const width = Math.max(
    0,
    Math.min(rect.right, frame.right, innerWidth) - Math.max(rect.left, frame.left, 0),
  )
  const height = Math.max(
    0,
    Math.min(rect.bottom, frame.bottom, innerHeight) - Math.max(rect.top, frame.top, 0),
  )
  return width > 0 && height > 0
}
function showGroup(target: HTMLElement): void {
  target.classList.remove('opacity-0')
  held.delete(target)
}
function revealFocusedGroup(event: FocusEvent): void {
  if (!(event.target instanceof Node)) return
  for (const target of [...pendingEntrances.keys(), ...running.keys()]) {
    if (!target.contains(event.target)) continue
    const timer = timers.get(target)
    if (timer !== undefined) clearTimeout(timer)
    timers.delete(target)
    running.get(target)?.cancel()
    running.delete(target)
    pendingEntrances.delete(target)
    entranceObserver?.unobserve(target)
    showGroup(target)
  }
}
function playEntrance(target: HTMLElement, owner: number): void {
  const recipe = pendingEntrances.get(target)
  if (!recipe || owner !== arrival || !active.value || !target.isConnected) return
  pendingEntrances.delete(target)
  if (target === waveGroup) waveVisible.value = true
  else entranceObserver?.unobserve(target)
  showGroup(target)
  const handle = motion.play(target, { ...recipe, phase: 'enter' })
  running.set(target, handle)
  void handle.finished.then(() => {
    if (running.get(target) === handle) running.delete(target)
  })
}
function playInitialEntrances(owner: number): void {
  let offsetMs = 0
  for (const target of pendingEntrances.keys()) {
    if (!isVisible(target)) continue
    if (offsetMs === 0) playEntrance(target, owner)
    else {
      const timer = setTimeout(() => {
        timers.delete(target)
        if (isVisible(target)) playEntrance(target, owner)
      }, offsetMs)
      timers.set(target, timer)
    }
    offsetMs += 190
  }
}
async function beginArrival(): Promise<void> {
  stopEntrances()
  if (
    !active.value ||
    appearance.snapshot.value.motion !== 'full' ||
    typeof IntersectionObserver === 'undefined' ||
    document.hidden
  )
    return
  viewport = page.value?.closest<HTMLElement>('.wb-home-viewport') ?? null
  if (!viewport) return
  waveGroup = page.value?.querySelector<HTMLElement>('.wb-home-feature:nth-child(3)') ?? null
  const owner = arrival
  for (const [selector, preset, durationMs] of entrances) {
    const target = page.value?.querySelector<HTMLElement>(selector)
    if (!target) continue
    pendingEntrances.set(target, { preset, durationMs })
    // Hold decorative content before the incoming route is revealed, without changing layout.
    hold(target)
  }
  entranceObserver = new IntersectionObserver(
    (entries) => {
      if (owner !== arrival || !active.value) return
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) continue
        if (!ready) continue
        const target = entry.target
        if (!entry.isIntersecting) {
          const timer = timers.get(target)
          if (timer !== undefined) clearTimeout(timer)
          timers.delete(target)
          if (target === waveGroup) waveVisible.value = false
          continue
        }
        if (!timers.has(target)) playEntrance(target, owner)
        if (target === waveGroup && !pendingEntrances.has(target)) waveVisible.value = true
      }
    },
    { root: viewport, threshold: 0 },
  )
  for (const target of pendingEntrances.keys()) entranceObserver.observe(target)
  await reveal.whenRevealed()
  if (owner !== arrival) return
  ready = true
  playInitialEntrances(owner)
}
onMounted(() => {
  void beginArrival()
})
onActivated(() => {
  if (active.value) return
  active.value = true
  void beginArrival()
})
onDeactivated(() => {
  active.value = false
  stopEntrances()
})
watch(
  () => appearance.snapshot.value.motion,
  () => {
    stopEntrances()
  },
  { flush: 'sync' },
)
function onVisibility(): void {
  if (document.hidden) stopEntrances()
}
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
})
onScopeDispose(() => {
  stopEntrances()
  document.removeEventListener('visibilitychange', onVisibility)
})
const full = computed(() => active.value && appearance.snapshot.value.motion === 'full')
const instant = computed(() => appearance.snapshot.value.motion === 'none')
const transition = computed(() => ({ duration: instant.value ? 0 : full.value ? 0.75 : 0.12 }))
const dashboard = registeredRouteDestination({ name: 'workbench-dashboard' })
const showcase = registeredRouteDestination({ name: 'component-showcase' })
</script>

<template>
  <div
    ref="page"
    class="wb-page wb-home grid min-w-0"
    @focusin="revealFocusedGroup"
  >
    <LazyMotion :features="domMax">
      <MotionConfig
        :reduced-motion="full ? 'never' : 'always'"
        :skip-animations="instant"
      >
        <div class="wb-home-first-screen grid min-w-0">
          <section
            class="wb-home-hero rounded-panel relative isolate"
            :aria-label="t('welcomeArt.intro')"
          >
            <div class="wb-home-hero-grid grid items-center relative gap-content-gap">
              <div class="wb-home-editorial grid content-center">
                <p class="wb-home-eyebrow m-0 text-caption text-expression-accent-a-foreground">
                  Progressive Adaptive Vue Platform
                </p>
                <h2 class="wb-home-headline font-title-weight m-0">
                  <span
                    class="wb-home-wordmark block"
                    v-text="'PAVP'"
                  />
                  <span
                    class="wb-home-subtitle"
                    v-text="t('welcomeArt.titleTwo')"
                  />
                </h2>
                <p class="wb-home-description m-0 text-body text-text-secondary">
                  {{ t('welcomeArt.description') }}
                </p>
                <div class="flex flex-wrap items-center gap-content-gap">
                  <NButton
                    type="primary"
                    size="large"
                    tag="a"
                    :href="navigation.resolveHref(dashboard)"
                    @click="enterWorkbench($event, dashboard)"
                  >
                    {{ t('welcomeArt.enter') }}
                    <template #icon>
                      <span
                        class="i-lucide-arrow-right"
                        aria-hidden="true"
                      />
                    </template>
                  </NButton>
                  <NButton
                    quaternary
                    size="large"
                    tag="a"
                    :href="navigation.resolveHref(showcase)"
                    @click="activate($event, showcase)"
                  >
                    {{ t('welcomeArt.explore') }}
                  </NButton>
                </div>
                <div
                  class="wb-home-signature flex-wrap items-center gap-content-gap text-caption text-text-secondary"
                >
                  <span>Vue 3</span>
                  <span>TypeScript</span>
                  <span>Naive UI</span>
                  <span>Motion</span>
                  <span>AntV G2</span>
                </div>
              </div>
              <WelcomeCapabilityStage />
            </div>
          </section>
          <section
            class="wb-home-manifesto grid gap-content-gap"
            :aria-label="t('welcomeArt.philosophy')"
          >
            <div class="wb-home-feature-grid grid gap-content-gap">
              <m.article
                class="wb-home-feature grid text-expression-accent-a-soft-foreground"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.systemTitle') }}
                </h3>
                <p class="m-0 text-body">
                  {{ t('welcomeArt.systemBody') }}
                </p>
                <div
                  class="wb-home-swatch-ribbon flex"
                  aria-hidden="true"
                >
                  <span class="bg-data-viz-categorical-series-1" />
                  <span class="bg-data-viz-categorical-series-2" />
                  <span class="bg-data-viz-categorical-series-3" />
                  <span class="bg-data-viz-categorical-series-4" />
                  <span class="bg-data-viz-categorical-series-5" />
                  <span class="bg-data-viz-categorical-series-6" />
                  <span class="bg-data-viz-categorical-series-7" />
                  <span class="bg-data-viz-categorical-series-8" />
                </div>
              </m.article>
              <m.article
                class="wb-home-feature grid"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.composeTitle') }}
                </h3>
                <p class="m-0 text-body text-text-secondary">
                  {{ t('welcomeArt.composeBody') }}
                </p>
                <div class="wb-home-flow flex items-center gap-component-unit text-caption">
                  <span
                    class="rounded-control bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground"
                    v-text="t('welcomeArt.configure')"
                  />
                  <span
                    class="i-lucide-arrow-right"
                    aria-hidden="true"
                  />
                  <span
                    class="rounded-control bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground"
                    v-text="t('welcomeArt.compose')"
                  />
                  <span
                    class="i-lucide-arrow-right"
                    aria-hidden="true"
                  />
                  <span
                    class="rounded-control bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground"
                    v-text="t('welcomeArt.create')"
                  />
                </div>
              </m.article>
              <m.article
                class="wb-home-feature grid text-expression-accent-b-soft-foreground"
                :while-hover="full ? { y: -6 } : {}"
                :transition="transition"
              >
                <h3 class="font-title-weight m-0 text-subheading">
                  {{ t('welcomeArt.motionTitle') }}
                </h3>
                <p class="m-0 text-body">
                  {{ t('welcomeArt.motionBody') }}
                </p>
                <div
                  class="wb-home-motion-wave flex items-end gap-component-unit"
                  aria-hidden="true"
                >
                  <m.span
                    v-for="n in 12"
                    :key="n"
                    class="rounded-control bg-expression-accent-b-solid-background"
                    :animate="
                      full && waveVisible
                        ? { scaleY: [0.3 + (n % 3) * 0.2, 1, 0.3 + (n % 3) * 0.2] }
                        : { scaleY: 0.3 + (n % 4) * 0.2 }
                    "
                    :transition="{
                      duration: 3,
                      repeat: full && waveVisible ? Infinity : 0,
                      delay: n * 0.12,
                      ease: 'easeInOut',
                    }"
                  />
                </div>
              </m.article>
            </div>
          </section>
        </div>
        <section
          class="wb-home-expression rounded-panel grid min-w-0 gap-content-gap"
          :aria-label="t('welcomeArt.expressionTitle')"
        >
          <div class="grid content-center gap-content-gap">
            <p
              class="m-0 text-caption text-expression-accent-b-foreground"
              v-text="'PAVP · DESIGN SYSTEM'"
            />
            <h2 class="font-title-weight m-0 text-title">
              {{ t('welcomeArt.expressionTitle') }}
            </h2>
            <p class="m-0 text-body text-text-secondary">
              {{ t('welcomeArt.expressionBody') }}
            </p>
            <div class="flex flex-wrap gap-component-unit">
              <NButton
                :type="selectedExpression === 'a' ? 'primary' : 'default'"
                :aria-pressed="selectedExpression === 'a'"
                @click="selectedExpression = 'a'"
              >
                {{ t('welcomeArt.expressionA') }}
              </NButton>
              <NButton
                :type="selectedExpression === 'b' ? 'primary' : 'default'"
                :aria-pressed="selectedExpression === 'b'"
                @click="selectedExpression = 'b'"
              >
                {{ t('welcomeArt.expressionB') }}
              </NButton>
            </div>
          </div>
          <div
            class="wb-home-expression-preview rounded-panel grid gap-content-gap"
            :class="
              selectedExpression === 'a'
                ? 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground'
                : 'bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground'
            "
          >
            <div
              class="wb-home-expression-mark rounded-panel grid place-items-center"
              :class="
                selectedExpression === 'a'
                  ? 'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground'
                  : 'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground'
              "
            >
              <m.span
                :key="selectedExpression"
                class="i-lucide-layers"
                :initial="full ? { rotate: -20, scale: 0.75 } : false"
                :animate="{ rotate: 0, scale: 1 }"
                :transition="transition"
                aria-hidden="true"
              />
            </div>
            <h3 class="font-title-weight m-0 text-subheading">
              {{ t('welcomeArt.expressionPreview') }}
            </h3>
            <p class="m-0 text-body">
              {{ t('welcomeArt.expressionDetail') }}
            </p>
            <div
              class="wb-home-swatch-ribbon flex"
              aria-hidden="true"
            >
              <span class="bg-data-viz-categorical-series-1" /><span
                class="bg-data-viz-categorical-series-2"
              /><span class="bg-data-viz-categorical-series-3" /><span
                class="bg-data-viz-categorical-series-4"
              /><span class="bg-data-viz-categorical-series-5" />
            </div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  </div>
</template>
