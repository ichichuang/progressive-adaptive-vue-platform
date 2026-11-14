<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import { useConsoleI18n, type ConsoleMessageKey } from '../../../shared/i18n'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { useApplicationNavigation } from '../../router/application-navigation'
import type { ValidatedRouteInput } from '../../router/route-input'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import {
  routeTransitionShowcasePresetIds,
  cinematicRoutePresetIds,
  isCinematicRoutePreset,
  type RouteTransitionShowcasePreset,
  type RouteTransitionShowcaseRouteName,
} from '../../router/route-transition/route-transition-showcase'
import WorkbenchPage from '../WorkbenchPage.vue'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly stage: 'a' | 'b'
  readonly routeInput: ValidatedRouteInput<RouteTransitionShowcaseRouteName>
}>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const appearance = useAppearanceReadBoundary()
const selected = ref<RouteTransitionShowcasePreset>('route-transition.content-crossfade')
watch(
  () => props.routeInput.query.preset,
  (value) => {
    selected.value = value ?? 'route-transition.content-crossfade'
  },
  { immediate: true },
)
const copy: Record<
  RouteTransitionShowcasePreset,
  { readonly title: ConsoleMessageKey; readonly description: ConsoleMessageKey }
> = {
  'route-transition.none': {
    title: 'routeMotion.none',
    description: 'routeMotion.noneDescription',
  },
  'route-transition.content-crossfade': {
    title: 'routeMotion.crossfade',
    description: 'routeMotion.crossfadeDescription',
  },
  'route-transition.axis-inline-soft': {
    title: 'routeMotion.axis',
    description: 'routeMotion.axisDescription',
  },
  'route-transition.drill-soft': {
    title: 'routeMotion.drill',
    description: 'routeMotion.drillDescription',
  },
  'route-transition.sheet-soft': {
    title: 'routeMotion.sheet',
    description: 'routeMotion.sheetDescription',
  },
  'mosaic-burst': { title: 'routeMotion.mosaic', description: 'routeMotion.mosaicDescription' },
  'ink-surge': { title: 'routeMotion.ink', description: 'routeMotion.inkDescription' },
  'paper-turn': { title: 'routeMotion.paper', description: 'routeMotion.paperDescription' },
  'theme-rift': { title: 'routeMotion.rift', description: 'routeMotion.riftDescription' },
}
const presetGroups = [
  {
    label: 'routeMotion.basic' as const,
    presets: routeTransitionShowcasePresetIds.filter((preset) => !isCinematicRoutePreset(preset)),
  },
  { label: 'routeMotion.cinematic' as const, presets: cinematicRoutePresetIds },
]
const active = ref(true)
const busy = ref(false)
const failed = ref(false)
const scrollBoundary = inject(routerScrollControllerKey)
let controller: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(next: UiScrollController | null): void {
  controller = next
  unregister?.()
  unregister = next && active.value ? scrollBoundary?.(next) : undefined
}
onActivated(() => {
  active.value = true
  connect(controller)
})
onDeactivated(() => {
  active.value = false
  unregister?.()
  unregister = undefined
})
onScopeDispose(() => {
  unregister?.()
})
const support = computed(() => {
  if (appearance.snapshot.value.motion === 'none' || selected.value === 'route-transition.none')
    return t('routeMotion.instant')
  if (appearance.snapshot.value.motion === 'reduced') return t('routeMotion.reduced')
  return t(
    isCinematicRoutePreset(selected.value) ? 'routeMotion.actual' : 'routeMotion.unsupported',
  )
})
const copyValue = computed(() =>
  [
    t('routeMotion.copyRequest'),
    t(copy[selected.value].title),
    selected.value,
    t('routeMotion.copyBoundary'),
  ].join('\n'),
)
async function navigate(event: MouseEvent): Promise<void> {
  if (busy.value) return
  busy.value = true
  failed.value = false
  try {
    const result = await navigation.navigate(
      {
        name:
          props.stage === 'a'
            ? 'component-motion-route-preview'
            : 'component-motion-route-transitions',
        query: { preset: selected.value },
      },
      {
        visual: isCinematicRoutePreset(selected.value)
          ? {
              preset: selected.value,
              origin:
                event.detail === 0 ? 'center' : { clientX: event.clientX, clientY: event.clientY },
            }
          : { preset: selected.value },
      },
    )
    failed.value =
      result.kind !== 'allow' && result.kind !== 'duplicated' && result.kind !== 'cancel'
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
    contained
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="rounded-panel flex flex-1 flex-col min-h-0 min-w-0 shadow-panel overflow-hidden bg-surface-panel"
      :aria-label="title"
    >
      <div
        class="wb-form-panel-header flex shrink-0 flex-wrap gap-component-unit"
        role="group"
        :aria-label="t('routeMotion.choose')"
      >
        <div
          v-for="group in presetGroups"
          :key="group.label"
          class="flex flex-wrap items-center gap-component-unit"
          role="group"
          :aria-label="t(group.label)"
        >
          <span class="text-caption text-text-secondary">{{ t(group.label) }}</span>
          <NButton
            v-for="preset in group.presets"
            :key="preset"
            :type="selected === preset ? 'primary' : 'default'"
            :secondary="selected !== preset"
            :aria-pressed="selected === preset"
            :disabled="busy"
            @click="selected = preset"
          >
            {{ t(copy[preset].title) }}
          </NButton>
        </div>
      </div>
      <UiScrollArea
        class="flex-1 min-h-0"
        owner-id="architecture-console-content"
        :enabled="active"
        @controller="connect"
      >
        <div class="wb-form-panel-header grid gap-content-gap">
          <p class="m-0 text-body text-text-secondary">
            {{ t(copy[selected].description) }}
          </p>
          <div
            class="wb-cinematic-stage rounded-panel grid place-items-center p-page-inline"
            :class="
              stage === 'a'
                ? 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground'
                : 'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground'
            "
          >
            <div
              class="grid min-w-0 w-full gap-content-gap"
              :class="stage === 'b' ? 'justify-items-end text-right' : 'justify-items-start'"
            >
              <span class="font-title-weight text-caption">{{ t('routeMotion.preview') }}</span>
              <span class="font-title-weight text-title">{{
                stage === 'a' ? t('routeMotion.sceneA') : t('routeMotion.sceneB')
              }}</span>
              <div
                class="grid w-full gap-content-gap"
                :class="stage === 'a' ? 'grid-cols-3' : 'grid-cols-2'"
                aria-hidden="true"
              >
                <span
                  class="rounded-control min-h-target-enhanced"
                  :class="
                    stage === 'a'
                      ? 'bg-expression-accent-a-solid-background col-span-2'
                      : 'bg-surface-panel'
                  "
                />
                <span
                  class="rounded-control min-h-target-enhanced"
                  :class="
                    stage === 'b'
                      ? 'bg-expression-accent-a-soft-background'
                      : 'bg-expression-accent-b-solid-background'
                  "
                />
              </div>
              <p class="m-0 text-body">
                {{ stage === 'a' ? t('routeMotion.sceneAHint') : t('routeMotion.sceneBHint') }}
              </p>
            </div>
          </div>
        </div>
      </UiScrollArea>
      <footer
        class="wb-form-panel-header flex shrink-0 flex-wrap items-center justify-between gap-content-gap"
      >
        <p
          class="m-0 text-caption text-text-secondary"
          role="status"
        >
          {{ failed ? t('routeMotion.failed') : support }}
        </p>
        <NButton
          type="primary"
          :loading="busy"
          @click="navigate"
        >
          {{ stage === 'a' ? t('routeMotion.open') : t('routeMotion.back') }}
        </NButton>
      </footer>
    </section>
  </WorkbenchPage>
</template>
