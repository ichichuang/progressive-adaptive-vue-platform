<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NImage } from 'naive-ui/es/image'
import {
  uiMotionPresets,
  UiCopyAction,
  UiScrollArea,
  useUiMotion,
  type UiMotionHandle,
  type UiMotionPreset,
  type UiScrollController,
} from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../../router/application-navigation'
import { registeredRouteDestination } from '../../router/route-input'
import WorkbenchPage from '../WorkbenchPage.vue'
import {
  cinematicPresets,
  cinematicCopy,
  cinematicStatusCopy,
  type CinematicCategory,
} from './cinematic-showcase'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly category: CinematicCategory
}>()
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const motion = useUiMotion()
const navigation = useApplicationNavigation()
const activateLink = useApplicationLinkActivation()
const routeExample = registeredRouteDestination({ name: 'component-motion-route-transitions' })
const presets = computed(() => cinematicPresets(props.category))
const selected = ref<UiMotionPreset>('theme-rift')
const target = ref<HTMLElement>()
const textTarget = ref<HTMLElement>()
const imageTarget = ref<HTMLImageElement>()
const active = ref(true)
const busy = ref(false)
const phase = ref<'enter' | 'exit'>('enter')
const status = ref<'ready' | 'playing' | 'held' | 'fallback' | 'reduced' | 'none' | 'failed'>(
  'ready',
)
let handle: UiMotionHandle | undefined
let sequence = 0
let choiceController: UiScrollController | null = null
let choiceViewport: HTMLElement | null = null
function connectChoices(value: UiScrollController | null): void {
  choiceController = value
}
function connectChoiceViewport(value: HTMLElement | null): void {
  choiceViewport = value
}
async function revealChoice(event: FocusEvent): Promise<void> {
  const element = event.currentTarget
  await nextTick()
  if (!(element instanceof HTMLElement) || choiceViewport === null || choiceController === null)
    return
  const bounds = element.getBoundingClientRect()
  const frame = choiceViewport.getBoundingClientRect()
  const delta =
    bounds.left < frame.left
      ? bounds.left - frame.left
      : bounds.right > frame.left + choiceViewport.clientWidth
        ? bounds.right - frame.left - choiceViewport.clientWidth
        : 0
  if (delta !== 0) choiceController.scrollBy({ left: delta, behavior: 'instant' })
}
const scrollBoundary = inject(routerScrollControllerKey)
let controller: UiScrollController | null = null
let unregister: (() => void) | undefined
function connect(next: UiScrollController | null): void {
  controller = next
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = scrollBoundary?.(controller)
}
const titleFor = (preset: UiMotionPreset) => t(cinematicCopy[preset].title)
const description = computed(() => t(cinematicCopy[selected.value].description))
const imageMode = computed(() => selected.value === 'liquid-refraction')
const textMode = computed(() => uiMotionPresets[selected.value].category === 'text')
const copyValue = computed(() =>
  [
    t('cinematic.copyRequest'),
    titleFor(selected.value),
    description.value,
    `useUiMotion().play(target, { preset: '${selected.value}', phase: '${phase.value}' })`,
    t('cinematic.copyConstraints'),
  ].join('\n'),
)
function restore(): void {
  sequence++
  handle?.cancel()
  handle = undefined
  busy.value = false
  status.value = 'ready'
}
function choose(preset: UiMotionPreset): void {
  restore()
  selected.value = preset
}
function loaded(event: Event): void {
  if (event.target instanceof HTMLImageElement) imageTarget.value = event.target
}
async function play(nextPhase: 'enter' | 'exit', event: MouseEvent): Promise<void> {
  restore()
  const generation = sequence
  phase.value = nextPhase
  await nextTick()
  if (generation !== sequence || !active.value) return
  const element = imageMode.value
    ? imageTarget.value
    : textMode.value
      ? textTarget.value
      : target.value
  if (element === undefined) {
    status.value = 'failed'
    return
  }
  busy.value = true
  status.value = 'playing'
  const origin = event.detail === 0 ? undefined : { clientX: event.clientX, clientY: event.clientY }
  const options = { phase: nextPhase, ...(origin === undefined ? {} : { origin }) }
  const preset = selected.value
  if (preset === 'liquid-refraction') {
    if (!(element instanceof HTMLImageElement)) {
      busy.value = false
      status.value = 'failed'
      return
    }
    handle = motion.play(element, { ...options, preset })
  } else {
    handle = motion.play(element, { ...options, preset })
  }
  const result = await handle.finished
  if (generation !== sequence) return
  busy.value = false
  status.value =
    result.kind === 'failed'
      ? 'failed'
      : result.kind === 'skipped'
        ? appearance.snapshot.value.motion === 'none'
          ? 'none'
          : 'ready'
        : result.kind === 'cancelled'
          ? 'ready'
          : result.presentation === 'fallback'
            ? 'fallback'
            : result.presentation === 'reduced'
              ? 'reduced'
              : nextPhase === 'exit'
                ? 'held'
                : 'ready'
}
watch(
  presets,
  (values) => {
    restore()
    if (values[0] !== undefined) selected.value = values[0]
  },
  { immediate: true },
)
watch(() => appearance.snapshot.value, restore)
onActivated(() => {
  active.value = true
  connect(controller)
})
onDeactivated(() => {
  active.value = false
  connect(controller)
  restore()
})
onScopeDispose(() => {
  restore()
  unregister?.()
})
</script>

<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copyValue"
        :label="t('formShowcase.copyAI')"
        :copy-label="titleFor(selected)"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <section
      class="rounded-panel flex flex-1 flex-col min-h-0 min-w-0 shadow-panel overflow-hidden bg-surface-panel"
      :aria-label="title"
      :aria-busy="busy"
      data-cinematic-workbench
    >
      <div
        class="wb-form-panel-header flex shrink-0 flex-wrap gap-component-unit"
        role="group"
        :aria-label="t('cinematic.presets')"
      >
        <UiScrollArea
          v-if="category === 'overview'"
          owner-id="cinematic-preset-choices"
          :enabled="active"
          x-scrollable
          class="w-full"
          @controller="connectChoices"
          @viewport="connectChoiceViewport"
        >
          <div
            class="flex min-w-full w-max items-stretch gap-component-unit"
            role="group"
            :aria-label="t('cinematic.presets')"
          >
            <NButton
              v-for="preset in presets"
              :key="preset"
              class="wb-cinematic-choice rounded-panel shrink-0"
              :type="selected === preset ? 'primary' : 'default'"
              :secondary="selected !== preset"
              :aria-pressed="selected === preset"
              @focus="revealChoice"
              @click="choose(preset)"
            >
              <span class="grid justify-items-start gap-component-unit">
                <span
                  :class="{
                    'i-lucide-scan-line': uiMotionPresets[preset].category === 'reveal',
                    'i-lucide-layers': uiMotionPresets[preset].category === 'spatial',
                    'i-lucide-droplets': uiMotionPresets[preset].category === 'material',
                    'i-lucide-sparkles': uiMotionPresets[preset].category === 'particles',
                    'i-lucide-type': uiMotionPresets[preset].category === 'text',
                  }"
                  class="text-title"
                  aria-hidden="true"
                />
                <span class="font-title-weight text-body">{{ titleFor(preset) }}</span>
              </span>
            </NButton>
          </div>
        </UiScrollArea>
        <NButton
          v-for="preset in category === 'overview' ? [] : presets"
          :key="preset"
          :type="selected === preset ? 'primary' : 'default'"
          :secondary="selected !== preset"
          :aria-pressed="selected === preset"
          @click="choose(preset)"
        >
          {{ titleFor(preset) }}
        </NButton>
      </div>
      <UiScrollArea
        class="flex-1 min-h-0"
        owner-id="architecture-console-content"
        :enabled="active"
        @controller="connect"
      >
        <div class="wb-form-panel-header flex flex-1 flex-col min-w-0 gap-content-gap">
          <p class="m-0 text-body text-text-secondary">
            {{ description }}
          </p>
          <NButton
            v-if="category === 'overview'"
            text
            tag="a"
            :href="navigation.resolveHref(routeExample)"
            @click="activateLink($event, routeExample)"
          >
            {{ t('cinematic.routeExample') }}
          </NButton>
          <div
            class="wb-cinematic-stage rounded-panel flex-1 grid place-items-center bg-surface-page p-page-inline"
            :aria-label="t('cinematic.stage')"
          >
            <NImage
              v-if="imageMode"
              class="wb-cinematic-art"
              :img-props="{ class: 'w-full h-auto rounded-panel' }"
              src="/motion-study.svg"
              :alt="t('cinematic.imageAlt')"
              preview-disabled
              @load="loaded"
            />
            <div
              v-else
              ref="target"
              class="wb-cinematic-art rounded-panel grid min-w-0 bg-expression-accent-a-soft-background gap-content-gap p-page-inline text-expression-accent-a-soft-foreground"
              :data-text="textMode"
            >
              <span class="font-title-weight text-caption">PAVP / MOTION</span>
              <h2
                ref="textTarget"
                class="font-title-weight m-0 text-pretty text-subheading layout-regular:text-title layout-wide:text-title"
              >
                {{ textMode ? t('cinematic.textArt') : t('cinematic.artTitle') }}
              </h2>
              <p
                v-if="!textMode"
                class="m-0 text-body"
              >
                {{ t('cinematic.artSubtitle') }}
              </p>
              <div
                v-if="!textMode"
                class="grid grid-cols-3 gap-component-unit"
                aria-hidden="true"
              >
                <div class="rounded-control bg-action-primary min-h-target-enhanced" />
                <div
                  class="rounded-control bg-expression-accent-a-solid-background min-h-target-enhanced"
                />
                <div
                  class="rounded-control bg-expression-accent-b-solid-background min-h-target-enhanced"
                />
              </div>
            </div>
          </div>
        </div>
      </UiScrollArea>
      <footer class="wb-form-panel-header shrink-0 grid gap-component-unit">
        <span
          class="min-h-control flex items-center text-caption text-text-secondary"
          role="status"
          aria-live="polite"
          v-text="t(cinematicStatusCopy[status])"
        />
        <div class="flex flex-wrap justify-end gap-component-unit">
          <NButton @click="restore">
            {{ t('cinematic.restore') }}
          </NButton>
          <NButton
            secondary
            @click="play('exit', $event)"
          >
            {{ t('cinematic.exit') }}
          </NButton>
          <NButton
            type="primary"
            @click="play('enter', $event)"
          >
            {{ t('cinematic.enter') }}
          </NButton>
        </div>
      </footer>
    </section>
  </WorkbenchPage>
</template>
