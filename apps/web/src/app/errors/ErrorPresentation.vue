<script setup lang="ts">
import { projectRegionAppearance } from '@platform/design-system'
import { UiScrollArea, useErrorForegroundMotion, type UiScrollController } from '@platform/ui'
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onMounted,
  onScopeDispose,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'
import { useRouteRevealBoundary } from '../router/route-transition/route-motion-player'
import { routerScrollControllerKey } from '../router/router-scroll-controller'
import { errorArtwork, type ErrorSceneCode } from './error-scene'
import ErrorActions from './ErrorActions.vue'
import ErrorIllustration from './ErrorIllustration.vue'

const props = withDefaults(
  defineProps<{
    readonly code: ErrorSceneCode
    readonly title: string
    readonly message: string
    readonly focusTarget?: string
    readonly focusTabIndex?: number
    readonly contained?: boolean
    readonly animateEntrance?: boolean
  }>(),
  { focusTarget: 'primary-heading', focusTabIndex: -1, contained: false, animateEntrance: true },
)

const rootAppearance = useAppearanceReadBoundary().snapshot
const appearance = computed(() => {
  const root = rootAppearance.value
  if (!props.contained || root.colorStyle === 'unified') return root
  const projection = projectRegionAppearance(root, 'content')
  return projection.isCustomized ? projection.appearance : root
})
const artwork = computed(() => errorArtwork[props.code])
const tone = computed(() => {
  const { role, accent } = artwork.value
  return role === 'neutral' ? accent : role
})
const colors = computed(() => {
  const { colorPalette } = appearance.value
  const { role, accent } = artwork.value
  return {
    ink: colorPalette.roles[role].foreground.default,
    accent:
      accent === 'expression'
        ? colorPalette.expression.accentA.foreground
        : colorPalette.roles[accent].foreground.default,
  }
})

const active = shallowRef(true)
const heading = useTemplateRef<HTMLHeadingElement>('heading')
const description = useTemplateRef<HTMLParagraphElement>('description')
const actions = useTemplateRef<HTMLDivElement>('actions')
const reveal = useRouteRevealBoundary()
const motion = useErrorForegroundMotion()
const entering = shallowRef(
  props.animateEntrance &&
    motion.available &&
    appearance.value.motion === 'full' &&
    !document.hidden,
)
const actionVisible = shallowRef(false)
type ForegroundPlayback = ReturnType<typeof motion.play>
const running: ForegroundPlayback[] = []
let actionPlayback: ForegroundPlayback | undefined

function settleEntrance(): void {
  entering.value = false
  for (const playback of running.splice(0)) playback.finish()
  actionPlayback = undefined
}

function revealFocusedAction(event: FocusEvent): void {
  if (
    !entering.value ||
    !(event.target instanceof HTMLElement) ||
    !event.target.matches(':focus-visible')
  )
    return
  actionVisible.value = true
  try {
    actionPlayback?.finish()
  } catch {
    settleEntrance()
  }
}

function settleWhenHidden(): void {
  if (document.hidden) settleEntrance()
}

onMounted(async () => {
  document.addEventListener('visibilitychange', settleWhenHidden)
  try {
    await reveal.whenRevealed()
    if (!entering.value || document.hidden) return

    const title = heading.value
    const message = description.value
    const action = actions.value?.querySelector<HTMLElement>('.error-scene__action-arrival')
    if (!title?.isConnected || !message?.isConnected || !action?.isConnected) return

    running.push(motion.play('heading', title))
    running.push(motion.play('description', message))
    if (!actionVisible.value) {
      actionPlayback = motion.play('action', action)
      running.push(actionPlayback)
    }
    await Promise.all(running.map((playback) => playback.finished))
  } catch {
    // Foreground motion is optional. Reveal the existing content if playback fails.
  } finally {
    settleEntrance()
    document.removeEventListener('visibilitychange', settleWhenHidden)
  }
})

watch(
  () => appearance.value.motion,
  (motion) => {
    if (motion !== 'full') settleEntrance()
  },
  { flush: 'sync' },
)

const scrollController = shallowRef<UiScrollController | null>(null)
const registerScrollController = inject(routerScrollControllerKey)
function connectScrollController(controller: UiScrollController | null): void {
  scrollController.value = controller
}
watch(
  [active, scrollController],
  ([isActive, controller], _, onCleanup) => {
    if (!isActive || controller === null) return
    const unregister = registerScrollController?.(controller)
    if (unregister !== undefined) onCleanup(unregister)
  },
  { flush: 'post' },
)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  settleEntrance()
})
onScopeDispose(() => {
  active.value = false
  settleEntrance()
  document.removeEventListener('visibilitychange', settleWhenHidden)
})
</script>

<template>
  <div
    class="error-scene grid"
    :class="contained ? 'error-scene--contained' : 'error-scene--document'"
    :data-error-tone="tone"
  >
    <div class="error-scene__composition grid min-h-0 min-w-0 relative">
      <ErrorIllustration
        :key="code"
        :code="code"
        :colors="colors"
        :motion="appearance.motion"
        :active="active"
      />
      <div
        class="error-scene__content grid min-w-0"
        :data-foreground-pending="entering ? '' : undefined"
        :data-action-visible="actionVisible ? '' : undefined"
      >
        <component
          :is="contained ? UiScrollArea : 'div'"
          :owner-id="contained ? 'architecture-console-content' : undefined"
          :enabled="contained ? active : undefined"
          class="error-scene__reading min-h-0 min-w-0"
          @controller="connectScrollController"
        >
          <div class="error-scene__copy grid gap-content-gap">
            <h1
              ref="heading"
              class="leading-title m-0"
              :data-route-focus="focusTarget"
              :tabindex="focusTabIndex"
            >
              {{ title }}
            </h1>
            <p
              ref="description"
              class="m-0 text-pretty text-body text-text-secondary"
            >
              {{ message }}
            </p>
          </div>
        </component>
        <div
          ref="actions"
          class="error-scene__actions flex min-w-0"
          @focusin="revealFocusedAction"
        >
          <ErrorActions />
        </div>
      </div>
    </div>
  </div>
</template>
