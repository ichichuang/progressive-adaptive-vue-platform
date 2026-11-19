<script setup lang="ts">
import {
  ProductPreferenceDefault,
  builtInAppearanceThemePreviews,
  explicitThemePreferenceSchema,
  fontScaleValues,
  projectAccessibleCustomAppearanceThemePreviews,
  projectRegionAppearance,
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
import { NButtonGroup } from 'naive-ui/es/button-group'
import {
  formatUiDateTime,
  UiRadioCardGroup,
  UiScrollArea,
  useUiClock,
  useUiDateTime,
  type UiScrollController,
  type UiScrollOffset,
} from '@platform/ui'
import {
  NMessageProvider,
  type MessageProviderInst,
  type MessageReactive,
} from 'naive-ui/es/message'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NSelect } from 'naive-ui/es/select'
import RuntimeVersionSettings from '../app/workbench/RuntimeVersionSettings.vue'
import ThemeStyleSettings from '../app/workbench/ThemeStyleSettings.vue'
import SettingsField from '../app/workbench/SettingsField.vue'
import SettingsModePreview from '../app/workbench/SettingsModePreview.vue'
import { useSettingsReveal } from '../app/workbench/use-settings-reveal'

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import {
  finishSettingsAppearance,
  playAppearanceTransition,
  readAppearanceTransitionOrigin,
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
let layoutObserver: MutationObserver | undefined
onMounted(() => {
  const shell = page.value?.closest<HTMLElement>('.pavp-admin-shell')
  if (!shell) return
  const synchronizeLayout = (): void => {
    narrowLayout.value = shell.dataset['layoutProfile'] === 'narrow'
  }
  synchronizeLayout()
  layoutObserver = new MutationObserver(synchronizeLayout)
  layoutObserver.observe(shell, { attributes: true, attributeFilter: ['data-layout-profile'] })
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
  {
    id: 'settings-comfort',
    label: 'settings.section.comfort',
  },
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
const animateSections = ref(false)
watch(
  () => effective.snapshot.value.motion,
  () => {
    animateSections.value = false
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
function focusSection(event: KeyboardEvent, section: SectionId): void {
  const current = sections.findIndex((item) => item.id === section)
  const last = sections.length - 1
  const nextKey = narrowLayout.value ? 'ArrowRight' : 'ArrowDown'
  const previousKey = narrowLayout.value ? 'ArrowLeft' : 'ArrowUp'
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? last
        : event.key === nextKey
          ? (current + 1) % sections.length
          : event.key === previousKey
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
  const start = narrowLayout.value ? 'left' : 'top'
  const end = narrowLayout.value ? 'right' : 'bottom'
  const delta =
    bounds[start] < viewport[start]
      ? bounds[start] - viewport[start]
      : bounds[end] > viewport[end]
        ? bounds[end] - viewport[end]
        : 0
  if (delta !== 0) navigationScroll.value?.scrollBy({ [start]: delta, behavior: 'instant' })
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
  animateSections.value = effective.snapshot.value.motion !== 'none'
  const revision = ++sectionRevision
  await nextTick()
  if (disposed || revision !== sectionRevision) return
  renderedSection = section
  controller?.scrollTo({ ...(positions[section] ?? { left: 0, top: 0 }), behavior: 'instant' })
  reveals.refresh()
}
const themePreviews = computed(() => [
  ...builtInAppearanceThemePreviews,
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []),
])
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
const colorModeTheme = computed(() => {
  const { roles } = projectRegionAppearance(effective.snapshot.value, 'content').appearance
    .colorPalette
  return {
    buttonColor: roles.neutral.soft.background.default,
    buttonTextColor: roles.neutral.soft.foreground,
    buttonColorActive: roles.primary.soft.background.default,
    buttonTextColorActive: roles.primary.soft.foreground,
    buttonBorderColor: 'transparent',
    buttonBorderColorActive: 'transparent',
    buttonBorderColorHover: 'transparent',
    buttonBoxShadow: 'none',
    buttonBoxShadowHover: 'none',
  }
})
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
  boolean: [
    { value: false, label: t('settings.option.off') },
    { value: true, label: t('settings.option.on') },
  ],
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
const workspaceSettings = computed(() => [
  {
    id: 'settings-navigation-collapsed',
    label: t('settings.navigation-collapsed'),
    value: navigation.wideNavigationCollapsed,
    update: (value: boolean) => {
      updateNavigation('collapsed', value)
    },
  },
  {
    id: 'settings-navigation-accordion',
    label: t('settings.navigation-accordion'),
    value: navigation.accordion,
    update: (value: boolean) => {
      updateNavigation('accordion', value)
    },
  },
  {
    id: 'settings-scroll-restoration',
    label: t('settings.scroll-restoration'),
    value: scroll.restoreOnRefresh,
    update: updateScroll,
  },
])
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

function transitionSetting(
  commit: () => boolean,
  isCurrent: (() => boolean) | undefined,
  origin: AppearanceTransitionOrigin | undefined,
): void {
  playAppearanceTransition({
    kind: 'settings',
    origin,
    readSnapshot: () => effective.snapshot.value,
    ...(isCurrent === undefined ? {} : { isCurrent }),
    commit,
  })
}

function updateAppearance(axis: AppearanceAxis, value: unknown): void {
  const origin = takeAppearanceOrigin()
  const isCurrent = () => appearanceValue(axis) === value
  if (axis === 'motion') {
    if (isCurrent()) return
    finishSettingsAppearance()
    commitAppearance({ motion: value }, { animateSize: false })
    return
  }
  transitionSetting(
    () => {
      const change =
        axis === 'density'
          ? { density: { ...preference.value?.appearance.density, preset: value } }
          : { [axis]: value }
      return commitAppearance(change, { animateSize: false })
    },
    isCurrent,
    origin,
  )
}

function selectedTheme(reference: ThemeReference): boolean {
  const current = preference.value?.appearance.theme
  return current?.registryKind === reference.registryKind && current.themeId === reference.themeId
}

let appearanceActivation:
  { readonly origin: AppearanceTransitionOrigin | undefined; readonly time: number } | undefined
function captureAppearanceOrigin(event: MouseEvent | KeyboardEvent): void {
  if (event instanceof MouseEvent && event.button !== 0) return
  appearanceActivation = { origin: readAppearanceTransitionOrigin(event), time: performance.now() }
}

function takeAppearanceOrigin(): AppearanceTransitionOrigin | undefined {
  const activation = appearanceActivation
  appearanceActivation = undefined
  return activation !== undefined && performance.now() - activation.time < 1500
    ? activation.origin
    : undefined
}

function chooseMode(value: string): void {
  const origin = takeAppearanceOrigin()
  playAppearanceTransition({
    kind: 'mode',
    origin,
    isCurrent: () => preference.value?.appearance.colorMode === value,
    readSnapshot: () => effective.snapshot.value,
    commit: () => commitAppearance({ colorMode: value }),
  })
}

function chooseTheme(reference: ThemeReference, event: MouseEvent): void {
  playAppearanceTransition({
    kind: 'palette',
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
  }
}

function resetAppearance(event: MouseEvent): void {
  transitionSetting(
    () => {
      const result = mutation.resetPreference()
      announce(result.status === 'committed' ? null : 'settings.feedback.rejected')
      return result.status === 'committed'
    },
    undefined,
    readAppearanceTransitionOrigin(event),
  )
}

function chooseStyle(style: ColorStyle): void {
  transitionSetting(
    () => commitAppearance({ colorStyle: style }),
    () => style === preference.value?.appearance.colorStyle,
    takeAppearanceOrigin(),
  )
}

function chooseMonochrome(enabled: boolean): void {
  transitionSetting(
    () =>
      commitAppearance({
        colorStyle: enabled ? 'monochrome' : ProductPreferenceDefault.colorStyle,
      }),
    () => (preference.value?.appearance.colorStyle === 'monochrome') === enabled,
    takeAppearanceOrigin(),
  )
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
  transitionSetting(
    () => {
      const result =
        axis === 'collapsed'
          ? navigation.setWideNavigationCollapsed(value)
          : navigation.setNavigationAccordion(
              value,
              value
                ? []
                : consoleNavigationRegistry
                    .filter((group) => group.items.length !== 0)
                    .map((group) => group.id),
            )
      announcePersistence(result)
      return result.status === 'applied'
    },
    undefined,
    takeAppearanceOrigin(),
  )
}

function updateScroll(value: boolean): void {
  announcePersistence(scroll.setRestoreOnRefresh(value))
}

function updateDateTime(
  axis: keyof Omit<typeof dateTimeStore.preference, 'schemaVersion'>,
  value: unknown,
): void {
  transitionSetting(
    () => {
      const current = dateTimeStore.preference
      dateTimeStore.update({ ...current, [axis]: value })
      return current !== dateTimeStore.preference
    },
    () => dateTimeStore.preference[axis] === value,
    takeAppearanceOrigin(),
  )
}

async function updateLanguage(value: unknown): Promise<void> {
  announce(null)
  const revision = feedbackRevision.value
  const origin = takeAppearanceOrigin()
  const result = await language.switchLocale(value, (commit) => {
    if (
      disposed ||
      page.value?.isConnected !== true ||
      activeSection.value !== 'settings-reading'
    ) {
      commit()
      return
    }
    transitionSetting(commit, undefined, origin)
  })
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
      class="flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-content-gap p-panel-narrow"
    >
      <h1
        id="control-center-heading"
        class="leading-title font-title-weight m-0 min-w-0 wrap-anywhere text-heading layout-wide:text-title"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ t('settings.title') }}
      </h1>
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
          <template #icon>
            <span
              class="i-lucide-rotate-ccw"
              aria-hidden="true"
            />
          </template>
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

    <div
      class="flex flex-1 min-h-0 min-w-0"
      :class="narrowLayout ? 'flex-col' : 'flex-row'"
    >
      <UiScrollArea
        class="wb-settings-tabs-scroll shrink-0 min-w-0 layout-wide:w-admin-sidebar-expanded"
        :class="narrowLayout ? 'w-full' : 'w-fit'"
        owner-id="settings-category-tabs"
        :x-scrollable="narrowLayout"
        @controller="navigationScroll = $event"
        @viewport="navigationViewport = $event"
      >
        <nav
          ref="sectionNavigation"
          class="flex gap-component-unit p-panel-narrow"
          :class="narrowLayout ? 'min-w-max' : 'flex-col'"
          role="tablist"
          :aria-label="t('settings.section-navigation')"
          :aria-orientation="narrowLayout ? 'horizontal' : 'vertical'"
          @focusout="focusedSection = activeSection"
        >
          <NButton
            v-for="section in sections"
            :key="section.id"
            data-settings-control
            :type="activeSection === section.id ? 'primary' : 'default'"
            :secondary="activeSection === section.id"
            :quaternary="activeSection !== section.id"
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
            class="wb-section-link min-h-target-enhanced min-w-target-enhanced"
            :data-section-tab="section.id"
            @click="activateSection(section.id)"
          >
            <template #icon>
              <span
                :class="{
                  'i-lucide-palette': section.id === 'settings-theme',
                  'i-lucide-sliders-horizontal': section.id === 'settings-comfort',
                  'i-lucide-languages': section.id === 'settings-reading',
                  'i-lucide-layout-grid': section.id === 'settings-workspace',
                }"
                aria-hidden="true"
              />
            </template>
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
        <div class="settings-content min-w-0 w-full p-panel-narrow">
          <div
            class="wb-settings-panel-motion min-w-0"
            :data-entering="animateSections ? '' : undefined"
          >
            <section
              v-show="activeSection === 'settings-theme'"
              id="settings-theme"
              class="wb-settings-section grid min-w-0 gap-field-gap"
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

              <SettingsField
                id="settings-style"
                choice
                :label="t('settings.styles.title')"
              >
                <template #default="field">
                  <ThemeStyleSettings
                    v-if="preference !== null"
                    :model-value="preference.appearance.colorStyle"
                    :appearance="effective.snapshot.value"
                    :disabled="returning"
                    :labelled-by="field.labelledBy"
                    v-bind="{
                      onPointerdownCapture: captureAppearanceOrigin,
                      onKeydownCapture: captureAppearanceOrigin,
                    }"
                    @update:model-value="chooseStyle"
                  />
                </template>
              </SettingsField>
              <SettingsField
                id="settings-color-mode"
                choice
                :label="t('settings.color-mode')"
              >
                <template #default="field">
                  <div
                    class="min-w-0 w-fit"
                    v-bind="{
                      onPointerdownCapture: captureAppearanceOrigin,
                      onKeydownCapture: captureAppearanceOrigin,
                    }"
                  >
                    <UiRadioCardGroup
                      class="wb-mode-options-compact"
                      data-settings-control
                      :accessible-label="t('settings.color-mode')"
                      :model-value="preference?.appearance.colorMode ?? 'system'"
                      :options="colorModeOptions"
                      :theme-overrides="colorModeTheme"
                      :disabled="preference === null || returning"
                      v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                      @update:model-value="chooseMode"
                    >
                      <template #option="{ option }">
                        <SettingsModePreview
                          :mode="option.value as ColorModePreference"
                          :title="option.label"
                        />
                        <span class="sr-only">{{ option.label }}</span>
                      </template>
                    </UiRadioCardGroup>
                  </div>
                </template>
              </SettingsField>
              <SettingsField
                id="settings-theme-color"
                :label="t('settings.choose-theme')"
                choice
              >
                <template #default="field">
                  <div
                    class="flex flex-wrap min-w-0 gap-component-unit"
                    role="group"
                    :aria-labelledby="field.labelledBy"
                  >
                    <NButton
                      v-for="theme in themePreviews"
                      :key="`${theme.registryKind}:${theme.themeId}`"
                      data-settings-control
                      :type="selectedTheme(theme.reference) ? 'primary' : 'default'"
                      :secondary="selectedTheme(theme.reference)"
                      :quaternary="!selectedTheme(theme.reference)"
                      :bordered="false"
                      :theme-overrides="themeChoiceLayout"
                      class="wb-theme-option max-w-full min-h-target-enhanced min-w-target-enhanced"
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
                      <span
                        class="wb-theme-swatch size-icon-large"
                        aria-hidden="true"
                      />
                      <span class="min-w-0 whitespace-normal wrap-anywhere">{{ theme.label }}</span>
                    </NButton>
                  </div>
                </template>
              </SettingsField>
            </section>

            <section
              v-show="activeSection === 'settings-comfort'"
              id="settings-comfort"
              data-motion="none"
              class="wb-settings-section wb-settings-form grid grid-cols-1 min-w-0 items-start gap-content-gap layout-wide:grid-cols-2"
              role="tabpanel"
              aria-labelledby="settings-comfort-tab"
              v-bind="{
                onPointerdownCapture: captureAppearanceOrigin,
                onKeydownCapture: captureAppearanceOrigin,
              }"
            >
              <h2
                id="settings-comfort-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.comfort') }}
              </h2>
              <div
                class="rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap p-panel-narrow"
              >
                <SettingsField
                  id="settings-monochrome"
                  choice
                  :label="t('settings.styles.monochrome')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="min-w-0"
                      name="settings-monochrome"
                      :value="preference?.appearance.colorStyle === 'monochrome'"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="chooseMonochrome($event === true)"
                    >
                      <NRadioButton
                        v-for="option in choices.boolean"
                        :key="String(option.value)"
                        class="min-h-target-enhanced min-w-target-enhanced"
                        data-settings-control
                        :value="option.value"
                      >
                        {{ option.label }}
                      </NRadioButton>
                    </NRadioGroup>
                  </template>
                </SettingsField>
                <SettingsField
                  id="settings-contrast"
                  choice
                  :label="t('settings.contrast')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="min-w-0"
                      name="settings-contrast"
                      :value="appearanceValue('contrast')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="updateAppearance('contrast', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.contrast"
                        :key="option.value"
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
                      class="min-w-0"
                      name="settings-font-scale"
                      :value="String(appearanceValue('fontScale') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="updateAppearance('fontScale', Number($event))"
                    >
                      <NRadioButton
                        v-for="option in choices.fontScale"
                        :key="option.value"
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
                      class="min-w-0"
                      name="settings-density"
                      :value="String(appearanceValue('density') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="updateAppearance('density', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.density"
                        :key="option.value"
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
                class="rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap p-panel-narrow"
              >
                <SettingsField
                  id="settings-material"
                  choice
                  :label="t('settings.material')"
                >
                  <template #default="field">
                    <NRadioGroup
                      class="min-w-0"
                      name="settings-material"
                      :value="String(appearanceValue('material') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="updateAppearance('material', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.material"
                        :key="option.value"
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
                        class="min-w-0"
                        name="settings-radius"
                        :value="String(appearanceValue('radius') ?? '')"
                        :disabled="preference === null || returning"
                        v-bind="{
                          role: 'radiogroup',
                          'aria-labelledby': field.labelledBy,
                          'aria-describedby': hasCustomRadius
                            ? 'settings-radius-custom'
                            : undefined,
                        }"
                        @update:value="updateAppearance('radius', Number($event))"
                      >
                        <NRadioButton
                          v-for="option in choices.radius"
                          :key="option.value"
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
                      class="min-w-0"
                      name="settings-motion"
                      :value="String(appearanceValue('motion') ?? '')"
                      :disabled="preference === null || returning"
                      v-bind="{
                        role: 'radiogroup',
                        'aria-labelledby': field.labelledBy,
                      }"
                      @update:value="updateAppearance('motion', $event)"
                    >
                      <NRadioButton
                        v-for="option in choices.motion"
                        :key="option.value"
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
              class="wb-settings-section wb-settings-form grid grid-cols-1 min-w-0 items-start gap-content-gap layout-wide:grid-cols-2"
              data-motion="none"
              role="tabpanel"
              aria-labelledby="settings-reading-tab"
              v-bind="{
                onPointerdownCapture: captureAppearanceOrigin,
                onKeydownCapture: captureAppearanceOrigin,
              }"
            >
              <h2
                id="settings-reading-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.reading') }}
              </h2>
              <div
                class="rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap p-panel-narrow"
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
                class="rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap p-panel-narrow"
              >
                <SettingsField
                  id="settings-time-zone"
                  choice
                  :label="t('dateShowcase.zone')"
                >
                  <template #default="field">
                    <NSelect
                      :show-checkmark="false"
                      class="w-full max-w-admin-drawer"
                      :value="dateTimeStore.preference.timeZone"
                      :options="dateZones"
                      :bordered="false"
                      :disabled="returning"
                      :input-props="{ 'aria-labelledby': field.labelledBy }"
                      @update:value="updateDateTime('timeZone', $event)"
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
                      :show-checkmark="false"
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
                      @update:value="updateDateTime('dateFormat', $event)"
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
                          class="min-w-0"
                          name="settings-hour-cycle"
                          :value="dateTimeStore.preference.hourCycle"
                          :disabled="returning"
                          v-bind="
                            {
                              role: 'radiogroup',
                              'aria-labelledby': field.labelledBy,
                            } satisfies HTMLAttributes
                          "
                          @update:value="updateDateTime('hourCycle', $event)"
                        >
                          <NRadioButton
                            data-settings-control
                            value="h12"
                          >
                            <span v-text="'12h'" />
                          </NRadioButton>
                          <NRadioButton
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
              class="wb-settings-section wb-settings-form wb-settings-workspace grid grid-cols-1 min-w-0 items-start gap-content-gap layout-wide:grid-cols-2"
              role="tabpanel"
              aria-labelledby="settings-workspace-tab"
              v-bind="{
                onPointerdownCapture: captureAppearanceOrigin,
                onKeydownCapture: captureAppearanceOrigin,
              }"
            >
              <h2
                id="settings-workspace-title"
                class="sr-only"
                tabindex="-1"
              >
                {{ t('settings.section.workspace') }}
              </h2>
              <div
                class="rounded-panel grid min-w-0 content-start bg-surface-panel gap-content-gap p-panel-narrow"
              >
                <SettingsField
                  v-for="setting in workspaceSettings"
                  :id="setting.id"
                  :key="setting.id"
                  choice
                  :label="setting.label"
                >
                  <template #default="field">
                    <NButtonGroup
                      class="min-w-0"
                      data-pavp-exclusive-selection
                      v-bind="{
                        role: 'group',
                        'aria-labelledby': field.labelledBy,
                      }"
                    >
                      <NButton
                        v-for="option in choices.boolean"
                        :key="String(option.value)"
                        class="min-h-target-enhanced min-w-target-enhanced"
                        data-settings-control
                        :disabled="returning"
                        v-bind="
                          {
                            'aria-pressed': setting.value === option.value,
                          } satisfies ButtonHTMLAttributes
                        "
                        @click="
                          () => {
                            if (setting.value !== option.value) setting.update(option.value)
                          }
                        "
                      >
                        {{ option.label }}
                      </NButton>
                    </NButtonGroup>
                  </template>
                </SettingsField>
              </div>
              <RuntimeVersionSettings
                class="rounded-panel min-w-0 bg-surface-panel p-panel-narrow"
                :messages="messageProvider"
              />
            </section>
          </div>
        </div>
      </UiScrollArea>
    </div>

    <NMessageProvider
      ref="messageProvider"
      to="#pavp-overlay-root"
    />
  </div>
</template>

<style scoped>
html[data-pavp-settings-appearance~='content'] .wb-settings-page {
  transition: background-color var(--pavp-settings-appearance-duration) var(--ui-motion-easing);
}
.wb-settings-tabs-scroll {
  block-size: auto;
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
html[data-motion='full'] .wb-settings-panel-motion[data-entering] > .wb-settings-section {
  animation: wb-settings-section-enter var(--ui-motion-duration) var(--ui-motion-easing);
}
html[data-motion='reduced'] .wb-settings-panel-motion[data-entering] > .wb-settings-section {
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
.wb-mode-options-compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.wb-mode-options-compact :deep(.pavp-radio-card-group__content) {
  padding: var(--ui-space-content-gap);
}
@media (forced-colors: active) {
  .wb-theme-option[aria-pressed='true'] {
    border-color: Highlight;
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }
}
</style>
