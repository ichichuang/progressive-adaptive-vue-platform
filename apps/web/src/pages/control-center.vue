<script setup lang="ts">
import {
  builtInAppearanceThemePreviews,
  explicitThemePreferenceSchema,
  fontScaleValues,
  projectAccessibleCustomAppearanceThemePreviews,
  type AppearanceThemePreviewProjection,
  type ColorStyle,
  type ColorModePreference,
  type ExplicitThemePreference,
  type ThemeReference,
} from '@platform/design-system'
import {
  type ButtonHTMLAttributes,
  computed,
  inject,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type HTMLAttributes,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import {
  formatUiDateTime,
  UiRadioCardGroup,
  UiScrollArea,
  useUiClock,
  useUiDateTime,
  useUiMotion,
  type UiScrollController,
  type UiScrollOffset,
} from '@platform/ui'
import {
  NMessageProvider,
  type MessageProviderInst,
  type MessageReactive,
} from 'naive-ui/es/message'
import { NPopover } from 'naive-ui/es/popover'
import { NModal } from 'naive-ui/es/modal'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NSelect } from 'naive-ui/es/select'
import { NSwitch } from 'naive-ui/es/switch'
import RuntimeVersionSettings from '../app/workbench/RuntimeVersionSettings.vue'
import ThemeStyleSettings from '../app/workbench/ThemeStyleSettings.vue'
import SettingsField from '../app/workbench/SettingsField.vue'
import SettingsModePreview from '../app/workbench/SettingsModePreview.vue'
import { useSettingsReveal } from '../app/workbench/use-settings-reveal'

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import {
  finishSettingsAppearance,
  interruptAppearanceTransition,
  playAppearanceTransition,
  playSettingsComfortTransition,
  readAppearanceTransitionOrigin,
  reconcileSettingsAppearance,
  type AppearanceTransitionOrigin,
} from '../app/appearance/appearance-transition'
import { useNavigationPreferenceStore } from '../app/navigation/navigation-preference.store'
import { consoleNavigationRegistry } from '../app/router/route-registry'
import { useSettingsReturn } from '../app/router/settings-return'
import {
  routerScrollControllerKey,
  routerSettingsScrollKey,
  type SettingsSectionId,
  type SettingsScrollPosition,
} from '../app/router/router-scroll-controller'
import { useScrollPreferenceStore } from '../app/scroll/scroll-preference.store'
import { useDateTimeStore } from '../app/date-time/date-time.store'
import { consoleLocaleRegistry, useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'

defineOptions({ name: 'ControlCenterPage' })

type AppearanceAxis = Exclude<
  keyof ExplicitThemePreference['appearance'],
  'colorMode' | 'theme' | 'colorStyle'
>
type FeedbackKey = Extract<ConsoleMessageKey, `settings.feedback.${string}`>

const mutation = useAppearanceMutationBoundary()
const effective = useAppearanceReadBoundary()
const comfortMotion = useUiMotion(effective.snapshot)
watch(effective.snapshot, reconcileSettingsAppearance)
const navigation = useNavigationPreferenceStore()
const scroll = useScrollPreferenceStore()
const dateTimeStore = useDateTimeStore()
const dateTimeContext = useUiDateTime()
const now = useUiClock({ interval: 60000 })
const liveDateTime = computed(() =>
  dateTimeContext.value === undefined
    ? '—'
    : (formatUiDateTime(
        { kind: 'timestamp', value: now.value, unit: 'milliseconds' },
        dateTimeContext.value,
      ) ?? '—'),
)
const dateZones = computed(() => [
  { value: 'system', label: t('dateShowcase.system') },
  ...[
    ...new Set([
      'Asia/Shanghai',
      'UTC',
      'America/New_York',
      'Europe/London',
      ...(dateTimeStore.preference.timeZone === 'system'
        ? []
        : [dateTimeStore.preference.timeZone]),
    ]),
  ].map((value) => ({
    value,
    label: value,
  })),
])
const language = useConsoleI18n()
const settingsReturn = useSettingsReturn()
const { t } = language
const preference = mutation.preference
const page = ref<HTMLElement | null>(null)
const sectionNavigation = ref<HTMLElement | null>(null)
const navigationViewport = shallowRef<HTMLElement | null>(null)
const navigationScroll = shallowRef<UiScrollController | null>(null)
const narrowLayout = ref(false)
const styleChooserModal = ref(false)
let layoutObserver: MutationObserver | undefined
let styleViewportObserver: ResizeObserver | undefined
onMounted(() => {
  void nextTick(() => {
    const navigationElement = sectionNavigation.value
    if (!navigationElement) return
    positionIndicator()
    sectionResizeObserver = new ResizeObserver(positionIndicator)
    sectionResizeObserver.observe(navigationElement)
    for (const item of navigationElement.querySelectorAll<HTMLElement>('[data-section-tab]'))
      sectionResizeObserver.observe(item)
    void document.fonts.ready.then(() => {
      if (!disposed) positionIndicator()
    })
  })
  const shell = page.value?.closest<HTMLElement>('.pavp-admin-shell')
  if (!shell) return
  const synchronizeLayout = (): void => {
    narrowLayout.value = shell.dataset['layoutProfile'] === 'narrow'
    const modal = shouldUseStyleChooserModal()
    if (styleChooserModal.value !== modal && styleChooserOpen.value) {
      styleChooserOpen.value = false
      void nextTick(restoreStyleChooserFocus)
    }
    styleChooserModal.value = modal
  }
  synchronizeLayout()
  layoutObserver = new MutationObserver(synchronizeLayout)
  layoutObserver.observe(shell, { attributes: true, attributeFilter: ['data-layout-profile'] })
  styleViewportObserver = new ResizeObserver(synchronizeLayout)
  styleViewportObserver.observe(shell)
})
const contentScroll = shallowRef<UiScrollController | null>(null)
const registerScrollController = inject(routerScrollControllerKey)
const settingsScroll = inject(routerSettingsScrollKey)
if (registerScrollController === undefined)
  throw new Error('System settings require the Router Scroll Controller port.')
if (settingsScroll === undefined)
  throw new Error('System settings require the settings scroll port.')
const initialSettings = settingsScroll.initial()
const positions: Partial<Record<SettingsSectionId, UiScrollOffset>> = {}
let unregisterScrollController: (() => void) | undefined
function connectContentScroll(controller: UiScrollController | null): void {
  unregisterScrollController?.()
  unregisterScrollController = undefined
  contentScroll.value = controller
  if (controller !== null) {
    unregisterScrollController = registerScrollController?.(controller)
    const restored = settingsScroll?.restore(controller)
    if (restored !== undefined) Object.assign(positions, restored.positions)
  }
}
const feedback = ref<FeedbackKey | null>(null)
const feedbackRevision = ref(0)
const returning = ref(false)
const localeNoticeKeys = {
  none: 'i18n.none',
  loading: 'i18n.loading',
  applied: 'i18n.applied',
  'not-saved': 'i18n.not-saved',
  'saved-choice-unavailable': 'i18n.saved-choice-unavailable',
  'preference-unavailable': 'i18n.preference-unavailable',
  'unsupported-locale': 'i18n.unsupported-locale',
  'message-load-failed': 'i18n.message-load-failed',
  'commit-failed': 'i18n.commit-failed',
} as const
const sections = [
  { id: 'settings-theme', label: 'settings.section.theme' },
  { id: 'settings-comfort', label: 'settings.section.comfort' },
  { id: 'settings-reading', label: 'settings.section.reading' },
  {
    id: 'settings-workspace',
    label: 'settings.section.workspace',
  },
] as const satisfies readonly {
  readonly id: string
  readonly label: ConsoleMessageKey
}[]
type SectionId = SettingsSectionId
const activeSection = ref<SectionId>(initialSettings?.section ?? 'settings-theme')
const focusedSection = ref<SectionId>(activeSection.value)
const sectionEntering = ref(false)
watch(
  () => effective.snapshot.value.motion,
  () => {
    sectionEntering.value = false
  },
)
const reveals = useSettingsReveal({
  page,
  section: activeSection,
  motion: () => effective.snapshot.value.motion,
  restored: initialSettings !== undefined,
})
let renderedSection = activeSection.value
let sectionRevision = 0
const unregisterSettingsScroll = settingsScroll.register((offset): SettingsScrollPosition => {
  return { section: renderedSection, positions: { ...positions, [renderedSection]: offset } }
})
const indicatorStyle = ref<Record<string, string>>({})
let sectionResizeObserver: ResizeObserver | undefined
function positionIndicator(): void {
  const navigationElement = sectionNavigation.value
  const selected = navigationElement?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (selected?.offsetParent !== navigationElement) return
  const width = selected.offsetWidth
  const left = selected.offsetLeft
  if (!Number.isFinite(width) || !Number.isFinite(left) || width <= 0) return
  indicatorStyle.value = {
    width: `${String(width)}px`,
    transform: `translateX(${String(left)}px)`,
  }
}
function focusSection(event: KeyboardEvent, section: SectionId): void {
  const current = sections.findIndex((item) => item.id === section)
  const last = sections.length - 1
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === 'ArrowRight'
          ? (current + 1) % sections.length
          : event.key === 'ArrowLeft'
            ? (current + last) % sections.length
            : -1
  if (index < 0) return
  event.preventDefault()
  const target = sections[index]
  if (target === undefined) return
  focusedSection.value = target.id
  const button = sectionNavigation.value?.querySelector<HTMLElement>(
    `[data-section-tab="${target.id}"]`,
  )
  if (!button) return
  button.focus({ preventScroll: true })
  const bounds = button.getBoundingClientRect()
  const viewport = navigationViewport.value?.getBoundingClientRect()
  if (!viewport) return
  const delta =
    bounds.left < viewport.left
      ? bounds.left - viewport.left
      : bounds.right > viewport.right
        ? bounds.right - viewport.right
        : 0
  if (delta !== 0) navigationScroll.value?.scrollBy({ left: delta, behavior: 'instant' })
}
async function activateSection(section: SectionId): Promise<void> {
  if (activeSection.value === section) return
  finishSettingsAppearance()
  const controller = contentScroll.value
  controller?.cancelMotion()
  if (controller !== null && renderedSection === activeSection.value)
    positions[activeSection.value] = controller.readOffset()
  activeSection.value = section
  focusedSection.value = section
  const revision = ++sectionRevision
  await nextTick()
  if (disposed || revision !== sectionRevision) return
  renderedSection = section
  controller?.scrollTo({ ...(positions[section] ?? { left: 0, top: 0 }), behavior: 'instant' })
  // The carrier survives a selection. An in-flight entrance already has the correct
  // destination, so changing its content does not restart or rewind it.
  if (effective.snapshot.value.motion !== 'none') sectionEntering.value = true
  reveals.refresh()
  positionIndicator()
}
watch(
  [
    activeSection,
    () => language.locale.value,
    () => effective.snapshot.value.fontScale,
    () => effective.snapshot.value.density,
  ],
  () => {
    void nextTick(positionIndicator)
  },
)
const themePreviews = computed(() => [
  ...builtInAppearanceThemePreviews,
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []),
])
const activePreview = computed(() =>
  themePreviews.value.find(
    (theme) =>
      theme.registryKind === effective.snapshot.value.theme.registryKind &&
      theme.themeId === effective.snapshot.value.theme.themeId,
  ),
)
const styleChooserOpen = ref(false)
const styleChooserTrigger = ref<HTMLElement | null>(null)
const showSaveError = computed(() => feedback.value !== null)
const feedbackMessage = computed(() => {
  const current = feedback.value
  if (
    current !== null &&
    ['not-saved', 'unsupported-locale', 'message-load-failed', 'commit-failed'].includes(
      language.notice.value,
    )
  )
    return `${t(current)} · ${t(localeNoticeKeys[language.notice.value])}`
  if (
    feedbackRevision.value === 0 &&
    ['preference-unavailable', 'saved-choice-unavailable'].includes(language.notice.value)
  )
    return t(localeNoticeKeys[language.notice.value])
  return current === null ? null : t(current)
})
const messageProvider = ref<MessageProviderInst>()
let feedbackNotice: MessageReactive | undefined
watch(
  [messageProvider, feedbackMessage, feedbackRevision],
  ([provider, message]) => {
    if (message === null) {
      feedbackNotice?.destroy()
      feedbackNotice = undefined
    } else if (feedbackNotice) {
      feedbackNotice.content = message
    } else if (provider) {
      const notice = provider.warning(message, {
        duration: 0,
        closable: true,
        onClose: () => {
          if (feedbackNotice === notice) feedbackNotice = undefined
        },
      })
      feedbackNotice = notice
    }
  },
  { immediate: true, flush: 'post' },
)
const colorModes = [
  { value: 'system', label: 'settings.system' },
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
] as const
const themeChoiceLayout = {
  heightMedium: 'auto',
  paddingMedium: 'var(--ui-space-component-unit)',
}
const colorModeOptions = computed(() =>
  colorModes.map((mode) => ({ value: mode.value, label: t(mode.label) })),
)
const radiusPresets = [
  { value: 0, label: 'settings.radius-square' },
  { value: 4, label: 'settings.radius-subtle' },
  { value: 8, label: 'settings.radius-rounded' },
  { value: 16, label: 'settings.radius-generous' },
] as const satisfies readonly { readonly value: number; readonly label: ConsoleMessageKey }[]
const hasCustomRadius = computed(() => {
  const radius = preference.value?.appearance.radius
  return radius !== undefined && !radiusPresets.some((preset) => preset.value === radius)
})
const choices = computed(() => ({
  contrast: [
    { value: 'standard', label: t('settings.standard') },
    { value: 'enhanced', label: t('settings.enhanced') },
  ],
  language: consoleLocaleRegistry.map((record) => ({
    value: record.id,
    label: record.id === 'zh-CN' ? t('settings.chinese') : t('settings.english'),
  })),
  fontScale: fontScaleValues.map((value) => ({
    value: String(value),
    label: `${String(Math.round(value * 100))}%`,
  })),
  density: [
    { value: 'compact', label: t('settings.compact') },
    { value: 'comfortable', label: t('settings.comfortable') },
    { value: 'spacious', label: t('settings.spacious') },
  ],
  material: [
    { value: 'adaptive', label: t('settings.adaptive') },
    { value: 'reduced', label: t('settings.reduced') },
    { value: 'solid', label: t('settings.solid') },
  ],
  motion: [
    { value: 'full', label: t('settings.motion-full') },
    { value: 'reduced', label: t('settings.motion-reduced') },
    { value: 'none', label: t('settings.motion-none') },
  ],
  radius: radiusPresets.map((preset) => ({
    value: String(preset.value),
    label: t(preset.label),
  })),
}))
let disposed = false

function announce(key: FeedbackKey | null): void {
  if (disposed) return
  feedback.value = key
  feedbackRevision.value += 1
}

function commitAppearance(
  change: Readonly<Record<string, unknown>>,
  options?: Parameters<typeof mutation.commitPreference>[1],
): boolean {
  const current = explicitThemePreferenceSchema.safeParse(preference.value)
  if (!current.success) {
    announce('settings.feedback.unavailable')
    return false
  }
  const candidate = {
    ...current.data,
    appearance: { ...current.data.appearance, ...change },
  }
  const result = mutation.commitPreference(candidate, options)
  announce(result.status === 'committed' ? null : 'settings.feedback.rejected')
  return result.status === 'committed'
}

function appearanceValue(axis: AppearanceAxis): string | number | null {
  const appearance = preference.value?.appearance
  if (appearance === undefined) return null
  return axis === 'density' ? appearance.density.preset : appearance[axis]
}

function updateAppearance(axis: AppearanceAxis, value: unknown): void {
  const origin = takeAppearanceOrigin()
  if (appearanceValue(axis) === value) return
  const change =
    axis === 'density'
      ? { density: { ...preference.value?.appearance.density, preset: value } }
      : { [axis]: value }
  void playSettingsComfortTransition({
    scene: page.value,
    player: comfortMotion,
    origin,
    changesMotion: axis === 'motion',
    readSnapshot: () => effective.snapshot.value,
    commit: () => commitAppearance(change, { animateSize: false }),
  })
}

function selectedTheme(reference: ThemeReference): boolean {
  const current = preference.value?.appearance.theme
  return current?.registryKind === reference.registryKind && current.themeId === reference.themeId
}

let appearanceActivation:
  { readonly origin: AppearanceTransitionOrigin; readonly time: number } | undefined
function captureAppearanceOrigin(event: MouseEvent | KeyboardEvent): void {
  if (event instanceof MouseEvent && event.button !== 0) return
  const origin = readAppearanceTransitionOrigin(event)
  appearanceActivation = origin === undefined ? undefined : { origin, time: performance.now() }
}

function takeAppearanceOrigin(): AppearanceTransitionOrigin | undefined {
  const activation = appearanceActivation
  appearanceActivation = undefined
  return activation !== undefined && performance.now() - activation.time < 1500
    ? activation.origin
    : undefined
}

function chooseMode(value: string): void {
  playAppearanceTransition({
    kind: 'mode',
    motion: effective.snapshot.value.motion,
    origin: takeAppearanceOrigin(),
    isCurrent: () => preference.value?.appearance.colorMode === value,
    readSnapshot: () => effective.snapshot.value,
    commit: () => commitAppearance({ colorMode: value }),
  })
}

function chooseTheme(reference: ThemeReference, event: MouseEvent): void {
  playAppearanceTransition({
    kind: 'palette',
    motion: effective.snapshot.value.motion,
    origin: readAppearanceTransitionOrigin(event),
    isCurrent: () => selectedTheme(reference),
    readSnapshot: () => effective.snapshot.value,
    commit: () => commitAppearance({ theme: { ...reference } }),
  })
}

function themeStyle(theme: AppearanceThemePreviewProjection): Readonly<Record<string, string>> {
  const snapshot = effective.snapshot.value
  const swatches = theme.planes[snapshot.colorMode][snapshot.contrast]
  return {
    '--pavp-settings-theme-color': swatches.actionPrimary,
    '--pavp-settings-theme-accent-a': swatches.accentA,
    '--pavp-settings-theme-accent-b': swatches.accentB,
  }
}

function resetAppearance(): void {
  interruptAppearanceTransition()
  const result = mutation.resetPreference()
  announce(result.status === 'committed' ? null : 'settings.feedback.rejected')
}

function chooseStyle(style: ColorStyle): void {
  interruptAppearanceTransition()
  if (style !== preference.value?.appearance.colorStyle) commitAppearance({ colorStyle: style })
}

function closeStyleChooser(): void {
  styleChooserOpen.value = false
  if (!styleChooserModal.value) restoreStyleChooserFocus()
}

function restoreStyleChooserFocus(): void {
  styleChooserTrigger.value?.querySelector<HTMLButtonElement>('button')?.focus({
    preventScroll: true,
  })
}

function handleStyleChooserKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  closeStyleChooser()
}

function focusCurrentStyle(): void {
  if (!styleChooserOpen.value) return
  document.querySelector<HTMLButtonElement>('#settings-style-gallery [data-current-style]')?.focus()
}

function shouldUseStyleChooserModal(): boolean {
  const trigger = styleChooserTrigger.value
  if (narrowLayout.value || trigger === null) return narrowLayout.value
  const preview = trigger.parentElement?.querySelector('.theme-style-scene')
  const previewHeight = preview?.getBoundingClientRect().height ?? 0
  // Leave room for a usable preview, the heading and the popover's surrounding space.
  return document.documentElement.clientHeight / 2 < previewHeight + 3 * trigger.offsetHeight
}

function toggleStyleChooser(): void {
  if (styleChooserOpen.value) {
    closeStyleChooser()
    return
  }
  styleChooserModal.value = shouldUseStyleChooserModal()
  void updateStyleChooser(true)
}

async function updateStyleChooser(open: boolean): Promise<void> {
  styleChooserOpen.value = open
  if (!open) {
    if (!styleChooserModal.value) await nextTick(restoreStyleChooserFocus)
    return
  }
  await nextTick()
  focusCurrentStyle()
}

function announcePersistence(result: {
  readonly status: 'not-ready' | 'busy' | 'applied'
  readonly persistence?: 'saved' | 'failed'
}): void {
  if (result.status !== 'applied') {
    announce('settings.feedback.unavailable')
    return
  }
  announce(result.persistence === 'saved' ? null : 'settings.feedback.applied-not-saved')
}

function updateNavigation(axis: 'collapsed' | 'accordion', value: boolean): void {
  announcePersistence(
    axis === 'collapsed'
      ? navigation.setWideNavigationCollapsed(value)
      : navigation.setNavigationAccordion(
          value,
          value
            ? []
            : consoleNavigationRegistry
                .filter((group) => group.items.length !== 0)
                .map((group) => group.id),
        ),
  )
}

function updateScroll(value: boolean): void {
  announcePersistence(scroll.setRestoreOnRefresh(value))
}

async function updateLanguage(value: unknown): Promise<void> {
  announce(null)
  const revision = feedbackRevision.value
  const result = await language.switchLocale(value)
  if (disposed) return
  if (feedbackRevision.value !== revision && showSaveError.value) return
  if (result.status === 'applied') announcePersistence(result)
  else if (result.status === 'failed') announce('settings.feedback.language-failed')
}

async function finish(): Promise<void> {
  if (returning.value) return
  returning.value = true
  try {
    const result = await settingsReturn.finish()
    if (
      result.kind !== 'duplicated' &&
      !(result.kind === 'allow' && result.presentation === 'page')
    ) {
      announce('settings.feedback.return-failed')
    }
  } catch {
    announce('settings.feedback.return-failed')
  } finally {
    if (!disposed) returning.value = false
  }
}

onScopeDispose(() => {
  disposed = true
  finishSettingsAppearance()
  layoutObserver?.disconnect()
  styleViewportObserver?.disconnect()
  sectionResizeObserver?.disconnect()
  feedbackNotice?.destroy()
  unregisterScrollController?.()
  unregisterSettingsScroll()
})
</script>
<template>
  <div
    ref="page"
    class="wb-page wb-settings-page flex flex-1 flex-col gap-0 h-full min-h-0 min-w-0 bg-surface-page"
    @focusin.capture="reveals.expose"
    @pointerdown.capture="reveals.expose"
  >
    <header
      class="wb-settings-header flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-component-unit"
    >
      <h1
        id="control-center-heading"
        class="sr-only"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ t('settings.title') }}
      </h1>
      <span
        class="wb-settings-heading leading-title font-title-weight min-w-0 wrap-anywhere text-heading"
        aria-hidden="true"
      >
        {{ t('settings.title') }}
      </span>
      <div class="flex flex-wrap max-w-full min-w-0 items-center gap-component-unit">
        <span
          id="settings-reset-note"
          class="sr-only"
          v-text="t('settings.reset-note')"
        />
        <NButton
          data-settings-control
          quaternary
          class="min-h-target-enhanced"
          :disabled="preference === null || returning"
          v-bind="
            {
              'aria-label': t(
                narrowLayout
                  ? 'settings.reset-appearance-compact-aria'
                  : 'settings.reset-appearance',
              ),
              'aria-describedby': 'settings-reset-note',
              title: t('settings.reset-appearance'),
            } satisfies ButtonHTMLAttributes
          "
          @click="resetAppearance"
        >
          {{ t(narrowLayout ? 'settings.reset-appearance-compact' : 'settings.reset-appearance') }}
        </NButton>
        <NButton
          data-settings-control
          secondary
          class="min-h-target-enhanced"
          :loading="returning && effective.snapshot.value.motion === 'full'"
          :disabled="returning"
          v-bind="
            (returning ? { 'aria-busy': true } : { 'aria-busy': false }) satisfies HTMLAttributes
          "
          @click="finish"
        >
          <template #icon>
            <span
              class="i-lucide-arrow-left"
              aria-hidden="true"
            />
          </template>
          {{ t('settings.done') }}
        </NButton>
        <span
          class="sr-only"
          role="status"
          v-text="returning ? t('settings.returning') : ''"
        />
      </div>
    </header>

    <div class="flex flex-1 flex-col min-h-0 min-w-0">
      <UiScrollArea
        class="wb-settings-tabs-scroll shrink-0 min-w-0"
        owner-id="settings-category-tabs"
        x-scrollable
        @controller="navigationScroll = $event"
        @viewport="navigationViewport = $event"
      >
        <nav
          ref="sectionNavigation"
          class="wb-settings-tabs flex min-w-max items-center gap-content-gap"
          role="tablist"
          :aria-label="t('settings.section-navigation')"
          @focusout="focusedSection = activeSection"
        >
          <span
            class="wb-settings-tab-indicator"
            :style="indicatorStyle"
            aria-hidden="true"
          />
          <NButton
            v-for="section in sections"
            :key="section.id"
            data-settings-control
            text
            attr-type="button"
            v-bind="
              {
                id: `${section.id}-tab`,
                role: 'tab',
                tabindex: focusedSection === section.id ? 0 : -1,
                'aria-selected': activeSection === section.id,
                'aria-controls': section.id,
                onFocus: () => {
                  focusedSection = section.id
                },
                onKeydown: (event: KeyboardEvent) => focusSection(event, section.id),
              } satisfies ButtonHTMLAttributes
            "
            class="wb-section-link wb-settings-tab px-button-inline"
            :data-section-tab="section.id"
            @click="activateSection(section.id)"
          >
            {{ t(section.label) }}
          </NButton>
        </nav>
      </UiScrollArea>

      <UiScrollArea
        class="flex-1 min-h-0 min-w-0"
        owner-id="architecture-console-content"
        @controller="connectContentScroll"
        @viewport="reveals.connect"
      >
        <div class="settings-content min-w-0 w-full">
          <div
            class="wb-settings-panel-motion min-w-0"
            :data-entering="sectionEntering ? '' : undefined"
            @animationend.self="sectionEntering = false"
            @animationcancel.self="sectionEntering = false"
          >
            <section
              v-show="activeSection === 'settings-theme'"
              id="settings-theme"
              class="wb-settings-section grid min-w-0 gap-content-gap"
              role="tabpanel"
              aria-labelledby="settings-theme-tab"
            >
              <h2
                id="settings-theme-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.theme') }}
              </h2>

              <div class="wb-settings-appearance grid min-w-0 items-start gap-content-gap">
                <div
                  class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
                >
                  <SettingsField
                    id="settings-color-mode"
                    choice
                    :label="t('settings.color-mode')"
                  >
                    <template #default="field">
                      <div
                        class="wb-mode-layout min-w-0"
                        v-bind="{
                          onPointerdownCapture: captureAppearanceOrigin,
                          onKeydownCapture: captureAppearanceOrigin,
                        }"
                      >
                        <UiRadioCardGroup
                          v-if="activePreview !== undefined"
                          class="wb-mode-preview-options"
                          data-settings-control
                          :accessible-label="t('settings.color-mode')"
                          :model-value="preference?.appearance.colorMode ?? 'system'"
                          :options="colorModeOptions"
                          :disabled="preference === null || returning"
                          v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                          @update:model-value="chooseMode"
                        >
                          <template #option="{ option }">
                            <SettingsModePreview
                              :theme="activePreview"
                              :mode="option.value as ColorModePreference"
                              :contrast="effective.snapshot.value.contrast"
                            />
                            <span class="wb-mode-caption">{{ option.label }}</span>
                          </template>
                        </UiRadioCardGroup>
                      </div>
                      <p class="m-0 text-caption text-text-secondary">
                        {{
                          t(
                            effective.snapshot.value.colorMode === 'dark'
                              ? 'settings.current-dark'
                              : 'settings.current-light',
                          )
                        }}
                      </p>
                    </template>
                  </SettingsField>

                  <SettingsField
                    id="settings-theme-color"
                    :label="t('settings.choose-theme')"
                    choice
                  >
                    <template #default="field">
                      <div
                        class="wb-theme-options grid min-w-0 gap-component-unit"
                        role="group"
                        :aria-labelledby="field.labelledBy"
                      >
                        <NButton
                          v-for="theme in themePreviews"
                          :key="`${theme.registryKind}:${theme.themeId}`"
                          data-settings-control
                          text
                          :bordered="false"
                          :theme-overrides="themeChoiceLayout"
                          class="wb-theme-option min-h-target-enhanced min-w-target-enhanced"
                          :style="themeStyle(theme)"
                          v-bind="
                            {
                              'aria-pressed': selectedTheme(theme.reference),
                              'aria-label': theme.label,
                            } satisfies ButtonHTMLAttributes
                          "
                          :disabled="preference === null || returning"
                          @click="chooseTheme(theme.reference, $event)"
                        >
                          <span class="wb-theme-option-content flex min-w-0 items-center">
                            <span
                              class="wb-theme-samples"
                              aria-hidden="true"
                            >
                              <i class="wb-theme-swatch size-icon-medium" />
                              <i class="wb-theme-accent-a" />
                              <i class="wb-theme-accent-b" />
                            </span>
                            <span class="min-w-0 whitespace-normal wrap-anywhere">{{
                              theme.label
                            }}</span>
                          </span>
                        </NButton>
                      </div>
                    </template>
                  </SettingsField>
                </div>
                <div
                  class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
                >
                  <SettingsField
                    id="settings-style"
                    choice
                    :label="t('settings.styles.title')"
                  >
                    <div class="grid min-w-0 justify-items-start gap-content-gap">
                      <ThemeStyleSettings
                        v-if="preference !== null"
                        :model-value="preference.appearance.colorStyle"
                        :appearance="effective.snapshot.value"
                        preview-only
                      >
                        <template #preview-label="{ label }">
                          <span>{{ label }}</span>
                        </template>
                      </ThemeStyleSettings>
                      <NPopover
                        trigger="manual"
                        placement="bottom-start"
                        :show="styleChooserOpen && !styleChooserModal"
                        :disabled="styleChooserModal"
                        :show-arrow="false"
                        :animated="effective.snapshot.value.motion === 'full'"
                        class="wb-settings-gallery-popover"
                        to="#pavp-overlay-root"
                        @clickoutside="closeStyleChooser"
                      >
                        <template #trigger>
                          <span ref="styleChooserTrigger">
                            <NButton
                              data-settings-control
                              secondary
                              class="min-h-target-enhanced"
                              :disabled="preference === null || returning"
                              v-bind="
                                {
                                  'aria-haspopup': 'dialog',
                                  'aria-expanded': styleChooserOpen ? 'true' : 'false',
                                  'aria-controls': 'settings-style-gallery',
                                  onKeydown: handleStyleChooserKeydown,
                                } satisfies ButtonHTMLAttributes
                              "
                              @click="toggleStyleChooser"
                            >
                              {{ t('settings.styles.change') }}
                            </NButton>
                          </span>
                        </template>
                        <div
                          v-if="!styleChooserModal"
                          id="settings-style-gallery"
                          class="wb-settings-gallery-panel grid min-w-0 gap-content-gap"
                          role="dialog"
                          :aria-label="t('settings.styles.title')"
                        >
                          <div class="flex min-w-0 items-center justify-between gap-content-gap">
                            <strong>{{ t('settings.styles.title') }}</strong>
                            <NButton
                              data-settings-control
                              quaternary
                              v-bind="
                                {
                                  'aria-label': t('settings.styles.close'),
                                  onKeydown: handleStyleChooserKeydown,
                                } satisfies ButtonHTMLAttributes
                              "
                              @click="closeStyleChooser"
                            >
                              <span
                                class="i-lucide-x"
                                aria-hidden="true"
                              />
                            </NButton>
                          </div>
                          <UiScrollArea
                            class="wb-settings-gallery-scroll"
                            owner-id="settings-style-gallery-scroll"
                          >
                            <ThemeStyleSettings
                              v-if="preference !== null"
                              :model-value="preference.appearance.colorStyle"
                              :appearance="effective.snapshot.value"
                              :disabled="returning"
                              @update:model-value="chooseStyle"
                              @keydown.esc.stop.prevent="closeStyleChooser"
                            />
                          </UiScrollArea>
                        </div>
                      </NPopover>
                    </div>
                  </SettingsField>
                </div>
              </div>
            </section>

            <section
              v-show="activeSection === 'settings-comfort'"
              id="settings-comfort"
              class="wb-settings-section wb-settings-form grid min-w-0 gap-content-gap"
              role="tabpanel"
              aria-labelledby="settings-comfort-tab"
            >
              <h2
                id="settings-comfort-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.comfort') }}
              </h2>
              <div
                class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
              >
                <SettingsField
                  id="settings-contrast"
                  choice
                  :label="t('settings.contrast')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                      name="settings-contrast"
                      :value="appearanceValue('contrast')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        'aria-labelledby': field.labelledBy,
                        onPointerdownCapture: captureAppearanceOrigin,
                        onKeydownCapture: captureAppearanceOrigin,
                      }"
                      @update:value="updateAppearance('contrast', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.contrast"
                        :key="option.value"
                        class="wb-settings-segment"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>
                <SettingsField
                  id="settings-font-scale"
                  choice
                  :label="t('settings.font-scale')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                      name="settings-font-scale"
                      :value="String(appearanceValue('fontScale') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        'aria-labelledby': field.labelledBy,
                        onPointerdownCapture: captureAppearanceOrigin,
                        onKeydownCapture: captureAppearanceOrigin,
                      }"
                      @update:value="updateAppearance('fontScale', Number($event))"
                    >
                      <NRadioButton
                        v-for="option in choices.fontScale"
                        :key="option.value"
                        class="wb-settings-segment"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>

                <SettingsField
                  id="settings-density"
                  choice
                  :label="t('settings.density')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                      name="settings-density"
                      :value="String(appearanceValue('density') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        'aria-labelledby': field.labelledBy,
                        onPointerdownCapture: captureAppearanceOrigin,
                        onKeydownCapture: captureAppearanceOrigin,
                      }"
                      @update:value="updateAppearance('density', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.density"
                        :key="option.value"
                        class="wb-settings-segment"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>
              </div>
              <div
                class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
              >
                <SettingsField
                  id="settings-material"
                  choice
                  :label="t('settings.material')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                      name="settings-material"
                      :value="String(appearanceValue('material') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        'aria-labelledby': field.labelledBy,
                        onPointerdownCapture: captureAppearanceOrigin,
                        onKeydownCapture: captureAppearanceOrigin,
                      }"
                      @update:value="updateAppearance('material', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.material"
                        :key="option.value"
                        class="wb-settings-segment"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>

                <SettingsField
                  id="settings-radius"
                  choice
                  :label="t('settings.radius')"
                >
                  <template #default="field">
                    <div class="grid min-w-0 gap-component-unit">
                      <NRadioGroup
                        class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                        name="settings-radius"
                        :value="String(appearanceValue('radius') ?? '')"
                        :disabled="preference === null || returning"
                        v-bind="{
                          'aria-labelledby': field.labelledBy,
                          'aria-describedby': hasCustomRadius
                            ? 'settings-radius-custom'
                            : undefined,
                          onPointerdownCapture: captureAppearanceOrigin,
                          onKeydownCapture: captureAppearanceOrigin,
                        }"
                        @update:value="updateAppearance('radius', Number($event))"
                      >
                        <NRadioButton
                          v-for="option in choices.radius"
                          :key="option.value"
                          class="wb-settings-segment"
                          data-settings-control
                          :value="option.value"
                        >
                          {{ option.label }}
                        </NRadioButton>
                      </NRadioGroup>
                      <p
                        v-if="hasCustomRadius"
                        id="settings-radius-custom"
                        class="m-0 text-caption text-text-secondary"
                      >
                        {{ t('settings.radius-custom') }}
                      </p>
                    </div>
                  </template>
                </SettingsField>

                <SettingsField
                  id="settings-motion"
                  choice
                  :label="t('settings.motion')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                      name="settings-motion"
                      :value="String(appearanceValue('motion') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        'aria-labelledby': field.labelledBy,
                        onPointerdownCapture: captureAppearanceOrigin,
                        onKeydownCapture: captureAppearanceOrigin,
                      }"
                      @update:value="updateAppearance('motion', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.motion"
                        :key="option.value"
                        class="wb-settings-segment"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>
              </div>
            </section>

            <section
              v-show="activeSection === 'settings-reading'"
              id="settings-reading"
              class="wb-settings-section wb-settings-form grid min-w-0 gap-content-gap"
              role="tabpanel"
              aria-labelledby="settings-reading-tab"
            >
              <h2
                id="settings-reading-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.reading') }}
              </h2>
              <div
                class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
              >
                <SettingsField
                  id="settings-language"
                  choice
                  :label="t('settings.language')"
                >
                  <template #default="field">
                    <div class="wb-language-options min-w-0">
                      <UiRadioCardGroup
                        v-bind="
                          {
                            id: field.inputProps.id,
                            'aria-labelledby': field.labelledBy,
                            'aria-busy': language.pendingLocale.value !== null,
                          } satisfies HTMLAttributes
                        "
                        class="wb-setting-choice"
                        data-settings-control
                        :accessible-label="t('settings.language')"
                        :model-value="language.pendingLocale.value ?? language.locale.value"
                        :options="choices.language"
                        :disabled="returning || language.pendingLocale.value !== null"
                        @update:model-value="updateLanguage"
                      >
                        <template #option="{ option }">
                          <span>{{ option.label }}</span>
                        </template>
                      </UiRadioCardGroup>
                    </div>
                  </template>
                </SettingsField>
              </div>
              <div
                class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
              >
                <SettingsField
                  id="settings-time-zone"
                  choice
                  :label="t('dateShowcase.zone')"
                >
                  <template #default="field">
                    <NSelect
                      class="w-full max-w-admin-drawer"
                      :value="dateTimeStore.preference.timeZone"
                      :options="dateZones"
                      :bordered="false"
                      :disabled="returning"
                      :input-props="{ 'aria-labelledby': field.labelledBy }"
                      @update:value="
                        dateTimeStore.update({ ...dateTimeStore.preference, timeZone: $event })
                      "
                    />
                  </template>
                </SettingsField>

                <SettingsField
                  id="settings-date-format"
                  choice
                  :label="t('dateShowcase.dateFormat')"
                >
                  <template #default="field">
                    <NSelect
                      class="w-full max-w-admin-drawer"
                      :value="dateTimeStore.preference.dateFormat"
                      :options="[
                        { value: 'locale', label: t('dateShowcase.localeFormat') },
                        { value: 'ymd', label: t('dateShowcase.ymd') },
                        { value: 'dmy', label: t('dateShowcase.dmy') },
                        { value: 'mdy', label: t('dateShowcase.mdy') },
                      ]"
                      :bordered="false"
                      :disabled="returning"
                      :input-props="{ 'aria-labelledby': field.labelledBy }"
                      @update:value="
                        dateTimeStore.update({ ...dateTimeStore.preference, dateFormat: $event })
                      "
                    />
                  </template>
                </SettingsField>

                <SettingsField
                  id="settings-hour-cycle"
                  choice
                  :label="t('dateShowcase.hours')"
                >
                  <template #default="field">
                    <div class="grid min-w-0 gap-component-unit">
                      <div class="flex flex-wrap min-w-0 items-center gap-content-gap">
                        <NRadioGroup
                          class="wb-settings-segments flex flex-wrap h-auto max-w-full min-w-0 items-center"
                          name="settings-hour-cycle"
                          :value="dateTimeStore.preference.hourCycle"
                          :disabled="returning"
                          v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                          @update:value="
                            dateTimeStore.update({ ...dateTimeStore.preference, hourCycle: $event })
                          "
                        >
                          <NRadioButton
                            class="wb-settings-segment"
                            data-settings-control
                            value="h12"
                          >
                            <span v-text="'12h'" />
                          </NRadioButton>
                          <NRadioButton
                            class="wb-settings-segment"
                            data-settings-control
                            value="h23"
                          >
                            <span v-text="'24h'" />
                          </NRadioButton>
                        </NRadioGroup>
                        <time
                          class="min-w-0 wrap-anywhere tabular-nums text-caption text-text-secondary"
                          :datetime="new Date(now).toISOString()"
                        >
                          {{ liveDateTime }}
                        </time>
                      </div>
                      <span
                        v-if="dateTimeStore.persistenceFailed"
                        class="text-caption"
                        role="status"
                        v-text="t('dateShowcase.notSaved')"
                      />
                    </div>
                  </template>
                </SettingsField>
              </div>
            </section>

            <section
              v-show="activeSection === 'settings-workspace'"
              id="settings-workspace"
              class="wb-settings-section wb-settings-form wb-settings-workspace grid min-w-0 gap-content-gap"
              role="tabpanel"
              aria-labelledby="settings-workspace-tab"
            >
              <h2
                id="settings-workspace-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.workspace') }}
              </h2>
              <div
                class="wb-settings-group rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap"
              >
                <SettingsField
                  id="settings-navigation-collapsed"
                  :label="t('settings.navigation-collapsed')"
                >
                  <template #default="field">
                    <NSwitch
                      data-settings-control
                      :value="navigation.wideNavigationCollapsed"
                      :disabled="returning"
                      v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                      @update:value="updateNavigation('collapsed', $event)"
                    />
                  </template>
                </SettingsField>
                <SettingsField
                  id="settings-navigation-accordion"
                  :label="t('settings.navigation-accordion')"
                >
                  <template #default="field">
                    <NSwitch
                      data-settings-control
                      :value="navigation.accordion"
                      :disabled="returning"
                      v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                      @update:value="updateNavigation('accordion', $event)"
                    />
                  </template>
                </SettingsField>
                <SettingsField
                  id="settings-scroll-restoration"
                  :label="t('settings.scroll-restoration')"
                >
                  <template #default="field">
                    <NSwitch
                      data-settings-control
                      :value="scroll.restoreOnRefresh"
                      :disabled="returning"
                      v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                      @update:value="updateScroll"
                    />
                  </template>
                </SettingsField>
                <RuntimeVersionSettings :messages="messageProvider" />
              </div>
            </section>
          </div>
        </div>
      </UiScrollArea>
    </div>

    <NModal
      v-if="styleChooserModal"
      :show="styleChooserOpen"
      to="#pavp-overlay-root"
      @update:show="updateStyleChooser"
      @after-enter="focusCurrentStyle"
      @after-leave="restoreStyleChooserFocus"
    >
      <NCard
        class="wb-provider-modal wb-settings-gallery-modal flex flex-col"
        content-class="flex flex-col min-h-0"
        :title="t('settings.styles.title')"
        v-bind="
          {
            role: 'dialog',
            'aria-modal': true,
            'aria-label': t('settings.styles.title'),
          } satisfies HTMLAttributes
        "
      >
        <template #header-extra>
          <NButton
            data-settings-control
            quaternary
            v-bind="{ 'aria-label': t('settings.styles.close') } satisfies ButtonHTMLAttributes"
            @click="closeStyleChooser"
          >
            <span
              class="i-lucide-x"
              aria-hidden="true"
            />
          </NButton>
        </template>
        <UiScrollArea
          id="settings-style-gallery"
          class="wb-settings-gallery-scroll"
          owner-id="settings-style-gallery-scroll"
        >
          <ThemeStyleSettings
            v-if="preference !== null"
            :model-value="preference.appearance.colorStyle"
            :appearance="effective.snapshot.value"
            :disabled="returning"
            @update:model-value="chooseStyle"
            @keydown.esc.stop.prevent="closeStyleChooser"
          />
        </UiScrollArea>
      </NCard>
    </NModal>

    <NMessageProvider
      ref="messageProvider"
      to="#pavp-overlay-root"
    />
  </div>
</template>

<style scoped>
.wb-settings-page {
  container: settings-page / inline-size;
}
html[data-pavp-settings-appearance~='content'] .wb-settings-page {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
.wb-settings-header,
.wb-settings-tabs-scroll,
.settings-content {
  padding-inline: var(--ui-space-panel-padding-narrow);
}
.wb-settings-header {
  padding-block: var(--ui-space-panel-padding-narrow);
}
.wb-settings-tabs-scroll {
  block-size: auto;
}
.settings-content {
  max-inline-size: var(--ui-layout-content-max-width);
  padding-block-start: var(--ui-space-content-gap);
  padding-block-end: var(--ui-space-panel-padding);
}
.wb-settings-group {
  padding: var(--ui-space-panel-padding-narrow);
}
.wb-settings-form {
  container: settings-form / inline-size;
  max-inline-size: calc(var(--ui-font-size-body) * 44);
}
.wb-settings-tabs {
  position: relative;
  inline-size: max-content;
}
.wb-settings-tab {
  color: var(--ui-color-text-secondary);
  min-inline-size: var(--ui-layout-target-enhanced-minimum-inline-size);
}
.wb-settings-tab[aria-selected='true'],
.wb-settings-tab:hover {
  color: var(--ui-color-control-primary);
}
.wb-language-options {
  max-inline-size: calc(var(--ui-layout-target-enhanced-minimum-inline-size) * 6);
}
.wb-setting-choice {
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, calc(var(--ui-font-size-body) * 7)), 1fr)
  );
}
.wb-setting-choice :deep(.pavp-radio-card-group__content) {
  padding-block: var(--ui-space-component-unit);
  padding-inline: var(--ui-space-button-inline);
  text-align: center;
}
.wb-settings-tab-indicator {
  position: absolute;
  inset-block-end: 0;
  left: 0;
  block-size: var(--ui-border-width);
  color: var(--ui-color-control-primary);
  background: currentColor;
  pointer-events: none;
}
html[data-motion='full'] .wb-settings-tab-indicator {
  transition:
    transform calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing),
    width calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing);
}
html[data-ui-size-transition='instant'] .wb-settings-tab-indicator {
  transition: none;
}
html[data-motion='full'][data-pavp-settings-appearance~='indicator'] .wb-settings-tab-indicator {
  transition:
    transform calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing),
    width calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing),
    color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
html[data-motion='reduced'][data-pavp-settings-appearance~='indicator'] .wb-settings-tab-indicator {
  transition: color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
:global(html[data-motion='full'] .wb-settings-gallery-popover.popover-transition-enter-active),
:global(
  html[data-motion='full'] .wb-settings-gallery-modal.fade-in-scale-up-transition-enter-active
) {
  transition:
    opacity calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing),
    transform calc(var(--ui-motion-duration) * 1.5) var(--ui-motion-easing);
}
:global(html[data-motion='full'] .wb-settings-gallery-popover.popover-transition-leave-active),
:global(
  html[data-motion='full'] .wb-settings-gallery-modal.fade-in-scale-up-transition-leave-active
) {
  transition:
    opacity var(--ui-motion-duration) var(--ui-motion-easing),
    transform var(--ui-motion-duration) var(--ui-motion-easing);
}
html[data-motion='full'] .wb-settings-panel-motion[data-entering] {
  animation: wb-settings-section-enter var(--ui-motion-duration) var(--ui-motion-easing);
}
html[data-motion='reduced'] .wb-settings-panel-motion[data-entering] {
  animation: wb-settings-section-fade calc(var(--ui-motion-duration) / 2) var(--ui-motion-easing);
}
@keyframes wb-settings-section-enter {
  from {
    opacity: 0.96;
    transform: translateY(var(--ui-space-component-unit));
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes wb-settings-section-fade {
  from {
    opacity: 0.96;
  }
  to {
    opacity: 1;
  }
}
:global(html[data-motion='reduced'] .wb-settings-gallery-modal),
:global(html[data-motion='none'] .wb-settings-gallery-modal) {
  transform: none !important;
}
:global(html[data-motion='reduced'] .wb-settings-gallery-modal) {
  transition: opacity calc(var(--ui-motion-duration) / 2) var(--ui-motion-easing) !important;
}
:global(html[data-motion='none'] .wb-settings-gallery-modal) {
  transition: none !important;
}
:deep([data-settings-reveal-state='pending'] > [data-settings-reveal-content]) {
  opacity: 0;
}
:global(
  html[data-motion='full']
    .settings-content
    [data-settings-reveal-state='pending']
    > [data-settings-reveal-content]
) {
  transform: translateY(calc(-1 * var(--ui-space-component-unit)));
}
:deep([data-settings-reveal-state='entering'] > [data-settings-reveal-content]) {
  opacity: 1;
  transform: none;
  transition:
    opacity calc(var(--ui-motion-duration) * 2) var(--ui-motion-easing),
    transform calc(var(--ui-motion-duration) * 2) var(--ui-motion-easing);
}
:global(
  html[data-motion='reduced']
    .settings-content
    [data-settings-reveal-state='entering']
    > [data-settings-reveal-content]
) {
  transition: opacity calc(var(--ui-motion-duration) / 2) var(--ui-motion-easing);
}
:deep([data-settings-reveal]:focus-within > [data-settings-reveal-content]) {
  opacity: 1;
  transform: none;
  transition: none;
}
.wb-settings-section :deep(.wb-settings-field) {
  grid-template-columns: minmax(0, 1fr);
}
.wb-settings-workspace :deep(.wb-settings-field) {
  grid-template-columns: minmax(0, 1fr) auto;
}
@container settings-form (min-width: 34em) {
  .wb-settings-form :deep(.wb-settings-field) {
    grid-template-columns: minmax(0, calc(var(--ui-font-size-body) * 11)) minmax(0, 1fr);
  }
}
@container settings-page (min-width: 48em) {
  .wb-settings-header,
  .wb-settings-tabs-scroll,
  .settings-content {
    padding-inline: var(--ui-space-panel-padding);
  }
  .wb-settings-group {
    padding: var(--ui-space-panel-padding);
  }
  .wb-settings-appearance {
    grid-template-columns: minmax(0, 1fr) minmax(0, calc(var(--ui-font-size-body) * 17));
  }
}
.wb-mode-layout {
  container: settings-modes / inline-size;
}
.wb-mode-preview-options {
  grid-template-columns: minmax(0, 1fr);
  max-inline-size: calc(var(--ui-font-size-body) * 36);
}
.wb-mode-preview-options :deep(.pavp-radio-card-group__content) {
  grid-template-columns: minmax(0, calc(var(--ui-font-size-body) * 5)) minmax(0, 1fr);
  align-items: center;
  padding: var(--ui-space-component-unit);
  gap: var(--ui-space-content-gap);
}
.wb-mode-caption {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}
@container settings-modes (min-width: 28em) {
  .wb-mode-preview-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .wb-mode-preview-options :deep(.pavp-radio-card-group__content) {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--ui-space-component-unit);
    text-align: center;
  }
}
.wb-theme-options {
  max-inline-size: calc(var(--ui-font-size-body) * 39);
  grid-template-columns: repeat(
    auto-fill,
    minmax(min(100%, calc(var(--ui-font-size-body) * 12)), 1fr)
  );
}
.wb-theme-option {
  border-width: var(--ui-border-width);
  border-style: solid;
  border-color: var(--ui-color-border-default);
  border-radius: var(--ui-radius-control);
  background-color: var(--ui-color-surface-page);
}
.wb-theme-option[aria-pressed='true'] {
  border-color: currentColor;
  background-color: var(--ui-color-action-primary);
  color: var(--ui-color-text-on-action);
}
.wb-theme-option[aria-pressed='false']:not(:disabled):hover {
  color: var(--ui-color-control-primary);
}
.wb-theme-option-content {
  padding-block: var(--ui-space-component-unit);
  padding-inline: var(--ui-space-button-inline);
  gap: var(--ui-space-content-gap);
}
.wb-theme-samples {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--ui-space-component-unit);
  padding: var(--ui-space-component-unit);
  border-radius: var(--ui-radius-control);
  background-color: var(--ui-color-surface-panel);
}
.wb-theme-samples i:not(.wb-theme-swatch) {
  inline-size: var(--ui-space-component-unit);
  block-size: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-control);
}
.wb-theme-accent-a {
  background: var(--pavp-settings-theme-accent-a);
}
.wb-theme-accent-b {
  background: var(--pavp-settings-theme-accent-b);
}
html[data-pavp-settings-appearance] .wb-theme-samples i {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
html[data-pavp-settings-appearance~='edge']
  .wb-settings-page
  .wb-theme-option[aria-pressed='false'] {
  transition: border-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing) !important;
}
.wb-settings-segments .wb-settings-segment {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--ui-layout-target-enhanced-minimum-block-size);
}
@media (forced-colors: active) {
  .wb-settings-tab[aria-selected='true'] {
    color: Highlight;
  }
  .wb-settings-tab-indicator {
    color: Highlight;
    forced-color-adjust: none;
  }
  .wb-theme-option[aria-pressed='true'],
  .wb-settings-segment:has(input:checked) {
    border-color: Highlight;
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }
}
.wb-settings-gallery-scroll {
  block-size: min(calc(var(--ui-control-height) * 9), 50dvh);
  min-block-size: 0;
}
.wb-settings-gallery-panel {
  grid-template-rows: auto minmax(0, 1fr);
  max-inline-size: min(100%, calc(100dvw - 2 * var(--ui-space-panel-padding)));
  block-size: min(
    calc(var(--ui-control-height) * 10),
    calc(
      50dvh - var(--ui-control-height) - var(--ui-space-panel-padding) - var(--ui-space-content-gap)
    )
  );
}
:global(.wb-settings-gallery-modal) {
  max-block-size: calc(100dvh - 2 * var(--ui-space-content-gap));
}
.wb-settings-gallery-panel .wb-settings-gallery-scroll {
  block-size: 100%;
}
</style>
