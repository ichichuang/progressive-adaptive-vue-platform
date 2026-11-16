<script setup lang="ts">
import {
  builtInAppearanceThemePreviews,
  explicitThemePreferenceSchema,
  fontScaleValues,
  projectAccessibleCustomAppearanceThemePreviews,
  type AppearanceThemePreviewProjection,
  type ColorStyle,
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
  type UiScrollController,
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

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import {
  playAppearanceTransition,
  readAppearanceTransitionOrigin,
  type AppearanceTransitionOrigin,
} from '../app/appearance/appearance-transition'
import { useNavigationPreferenceStore } from '../app/navigation/navigation-preference.store'
import { consoleNavigationRegistry } from '../app/router/route-registry'
import { useSettingsReturn } from '../app/router/settings-return'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import { useScrollPreferenceStore } from '../app/scroll/scroll-preference.store'
import { useDateTimeStore } from '../app/date-time/date-time.store'
import { consoleLocaleRegistry, useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'

defineOptions({ name: 'ControlCenterPage' })

type AppearanceAxis = Exclude<keyof ExplicitThemePreference['appearance'], 'theme' | 'colorStyle'>
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
const narrowLayout = ref(false)
let layoutObserver: MutationObserver | undefined
onMounted(() => {
  const shell = page.value?.closest<HTMLElement>('.pavp-admin-shell')
  if (!shell) return
  const synchronizeLayout = (): void => {
    const narrow = shell.dataset['layoutProfile'] === 'narrow'
    if (narrowLayout.value !== narrow && styleChooserOpen.value) {
      styleChooserOpen.value = false
      void nextTick(restoreStyleChooserFocus)
    }
    narrowLayout.value = narrow
  }
  synchronizeLayout()
  layoutObserver = new MutationObserver(synchronizeLayout)
  layoutObserver.observe(shell, { attributes: true, attributeFilter: ['data-layout-profile'] })
})
const contentScroll = shallowRef<UiScrollController | null>(null)
const registerScrollController = inject(routerScrollControllerKey)
if (registerScrollController === undefined)
  throw new Error('System settings require the Router Scroll Controller port.')
let unregisterScrollController: (() => void) | undefined
function connectContentScroll(controller: UiScrollController | null): void {
  unregisterScrollController?.()
  unregisterScrollController = undefined
  contentScroll.value = controller
  if (controller !== null) unregisterScrollController = registerScrollController?.(controller)
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
type SectionId = (typeof sections)[number]['id']
const activeSection = ref<SectionId>('settings-theme')
watch(activeSection, async () => {
  await nextTick()
  const navigationElement = sectionNavigation.value
  const current = navigationElement?.querySelector<HTMLElement>('[aria-current="location"]')
  if (!navigationElement || !current) return
  const bounds = navigationElement.getBoundingClientRect()
  const item = current.getBoundingClientRect()
  if (item.left < bounds.left) navigationElement.scrollLeft -= bounds.left - item.left
  else if (item.right > bounds.right) navigationElement.scrollLeft += item.right - bounds.right
})
const themePreviews = computed(() => [
  ...builtInAppearanceThemePreviews,
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []),
])
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
let pendingSection: SectionId | undefined
let disposed = false

function announce(key: FeedbackKey | null): void {
  if (disposed) return
  feedback.value = key
  feedbackRevision.value += 1
}

function commitAppearance(change: Readonly<Record<string, unknown>>): boolean {
  const current = explicitThemePreferenceSchema.safeParse(preference.value)
  if (!current.success) {
    announce('settings.feedback.unavailable')
    return false
  }
  const candidate = {
    ...current.data,
    appearance: { ...current.data.appearance, ...change },
  }
  const result = mutation.commitPreference(candidate)
  announce(result.status === 'committed' ? null : 'settings.feedback.rejected')
  return result.status === 'committed'
}

function appearanceValue(axis: AppearanceAxis): string | number | null {
  const appearance = preference.value?.appearance
  if (appearance === undefined) return null
  return axis === 'density' ? appearance.density.preset : appearance[axis]
}

function updateAppearance(axis: AppearanceAxis, value: unknown): void {
  commitAppearance(
    axis === 'density'
      ? { density: { ...preference.value?.appearance.density, preset: value } }
      : { [axis]: value },
  )
}

function selectedTheme(reference: ThemeReference): boolean {
  const current = preference.value?.appearance.theme
  return current?.registryKind === reference.registryKind && current.themeId === reference.themeId
}

let modeActivation:
  { readonly origin: AppearanceTransitionOrigin; readonly time: number } | undefined

function captureModeOrigin(event: MouseEvent | KeyboardEvent): void {
  if (!(event.target instanceof Element) || !event.target.closest('.wb-mode-options')) return
  if (event instanceof MouseEvent && event.button !== 0) return
  let origin = readAppearanceTransitionOrigin(event)
  if (origin === undefined && event instanceof KeyboardEvent) {
    const bounds = event.target.closest('label')?.getBoundingClientRect()
    if (bounds) origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  }
  modeActivation = origin === undefined ? undefined : { origin, time: performance.now() }
}

function chooseMode(value: string): void {
  const activation = modeActivation
  modeActivation = undefined
  const origin =
    activation !== undefined && performance.now() - activation.time < 1500
      ? activation.origin
      : undefined
  playAppearanceTransition({
    kind: 'mode',
    motion: effective.snapshot.value.motion,
    origin,
    commit: () => commitAppearance({ colorMode: value }),
  })
}

function chooseTheme(reference: ThemeReference, event: MouseEvent): void {
  playAppearanceTransition({
    kind: 'palette',
    motion: effective.snapshot.value.motion,
    origin: readAppearanceTransitionOrigin(event),
    commit: () => {
      if (!selectedTheme(reference)) commitAppearance({ theme: { ...reference } })
    },
  })
}

function themeStyle(theme: AppearanceThemePreviewProjection): Readonly<Record<string, string>> {
  const snapshot = effective.snapshot.value
  const swatches = theme.planes[snapshot.colorMode][snapshot.contrast]
  return {
    '--pavp-settings-theme-color': swatches.actionPrimary,
    '--pavp-settings-theme-on-color': swatches.onAction,
  }
}

function resetAppearance(): void {
  const result = mutation.resetPreference()
  announce(result.status === 'committed' ? null : 'settings.feedback.rejected')
}

function chooseStyle(style: ColorStyle): void {
  if (style !== preference.value?.appearance.colorStyle) commitAppearance({ colorStyle: style })
}

function closeStyleChooser(): void {
  styleChooserOpen.value = false
  if (!narrowLayout.value) restoreStyleChooserFocus()
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

async function updateStyleChooser(open: boolean): Promise<void> {
  styleChooserOpen.value = open
  if (!open) return
  await nextTick()
  document
    .querySelector<HTMLButtonElement>('#settings-style-gallery [data-style-choice][tabindex="0"]')
    ?.focus()
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

function jumpTo(id: SectionId): void {
  const section = page.value?.querySelector<HTMLElement>(`#${id}`)
  if (section === undefined || section === null) return
  pendingSection = id
  const result = contentScroll.value?.scrollToAnchor(id, {
    behavior: effective.snapshot.value.motion === 'full' ? 'smooth' : 'instant',
  })
  if (result?.kind !== 'scrolled') {
    pendingSection = undefined
    announce('settings.feedback.unavailable')
    return
  }
  activeSection.value = id
  const state = contentScroll.value?.readState()
  const offset = contentScroll.value?.readOffset()
  if (
    state !== undefined &&
    offset !== undefined &&
    (state.contentHeight <= state.height || offset.top >= state.contentHeight - state.height - 1)
  )
    pendingSection = undefined
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

function synchronizeViewport(viewport: HTMLElement): void {
  const top = viewport.getBoundingClientRect().top
  const maximum = Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const atBottom = maximum > 1 && viewport.scrollTop >= maximum - 1
  if (pendingSection !== undefined) {
    const target = page.value?.querySelector<HTMLElement>(`#${pendingSection}`)
    if (
      target !== undefined &&
      target !== null &&
      Math.abs(target.getBoundingClientRect().top - top) > 1 &&
      !atBottom
    )
      return
    activeSection.value = pendingSection
    pendingSection = undefined
    return
  }
  if (atBottom) {
    activeSection.value = 'settings-workspace'
    return
  }
  const section = [...sections].reverse().find((candidate) => {
    const element = page.value?.querySelector<HTMLElement>(`#${candidate.id}`)
    return (
      element !== undefined && element !== null && element.getBoundingClientRect().top <= top + 1
    )
  })
  activeSection.value = section?.id ?? 'settings-theme'
}

function synchronizeSection(event: Event): void {
  const viewport = event.target
  const controller = contentScroll.value
  if (viewport instanceof HTMLElement && controller?.ownsBoundary(viewport) === true)
    synchronizeViewport(viewport)
}

function interruptSectionScroll(event: Event): void {
  if (pendingSection === undefined) return
  const controller = contentScroll.value
  if (controller === null) return
  for (const target of event.composedPath()) {
    if (target === page.value) break
    if (target instanceof HTMLElement && controller.ownsBoundary(target)) {
      pendingSection = undefined
      controller.cancelMotion()
      synchronizeViewport(target)
      return
    }
  }
}

onScopeDispose(() => {
  disposed = true
  layoutObserver?.disconnect()
  feedbackNotice?.destroy()
  unregisterScrollController?.()
})
</script>
<template>
  <div
    ref="page"
    class="wb-page flex flex-1 flex-col gap-0 h-full min-h-0 min-w-0 bg-surface-page"
    @scroll.capture="synchronizeSection"
    @wheel.capture="interruptSectionScroll"
    @pointerdown.capture="interruptSectionScroll"
  >
    <header
      class="flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-content-gap p-panel-narrow"
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
        class="leading-title font-title-weight text-heading"
        aria-hidden="true"
      >
        {{ t('settings.title') }}
      </span>
      <div class="flex flex-wrap max-w-full min-w-0 items-center justify-end gap-component-unit">
        <span
          id="settings-reset-note"
          class="sr-only"
          v-text="t('settings.reset-note')"
        />
        <NButton
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
          class="min-h-target-enhanced"
          type="primary"
          :loading="returning && effective.snapshot.value.motion === 'full'"
          :disabled="returning"
          v-bind="
            (returning
              ? { 'aria-busy': true, 'aria-label': t('settings.returning') }
              : { 'aria-busy': false, 'aria-label': t('settings.done') }) satisfies HTMLAttributes
          "
          @click="finish"
        >
          {{ returning ? t('settings.returning') : t('settings.done') }}
        </NButton>
      </div>
    </header>

    <div class="flex flex-1 flex-col min-h-0 min-w-0 layout-regular:flex-row layout-wide:flex-row">
      <aside
        class="wb-settings-navigation shrink-0 min-h-0 min-w-0 layout-regular:p-panel-narrow layout-wide:p-panel-narrow"
      >
        <nav
          ref="sectionNavigation"
          class="wb-section-nav flex min-h-0 min-w-0 overflow-x-auto gap-component-unit layout-regular:flex-col layout-wide:flex-col layout-regular:overflow-x-hidden layout-regular:overflow-y-auto layout-wide:overflow-x-hidden layout-wide:overflow-y-auto"
          :aria-label="t('settings.section-navigation')"
        >
          <NButton
            v-for="section in sections"
            :key="section.id"
            :quaternary="activeSection !== section.id"
            :tertiary="activeSection === section.id"
            :type="activeSection === section.id ? 'primary' : 'default'"
            :bordered="false"
            v-bind="
              {
                'aria-current': activeSection === section.id ? 'location' : undefined,
                'aria-controls': section.id,
              } satisfies ButtonHTMLAttributes
            "
            class="wb-section-link"
            @click="jumpTo(section.id)"
          >
            <span class="flex items-center gap-component-unit">
              <span
                v-if="activeSection === section.id"
                class="i-lucide-check shrink-0"
                aria-hidden="true"
              />
              {{ t(section.label) }}
            </span>
          </NButton>
        </nav>
      </aside>

      <UiScrollArea
        class="flex-1 min-h-0 min-w-0"
        owner-id="architecture-console-content"
        @controller="connectContentScroll"
      >
        <div
          class="settings-content grid min-w-0 w-full gap-field-gap p-panel layout-narrow:p-panel-narrow"
        >
          <section
            id="settings-theme"
            class="grid min-w-0 gap-content-gap"
            aria-labelledby="settings-theme-title"
          >
            <h2
              id="settings-theme-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.theme') }}
            </h2>

            <SettingsField
              id="settings-color-mode"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.color-mode')"
            >
              <template #default="field">
                <NRadioGroup
                  class="wb-mode-options flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-color-mode"
                  :value="preference?.appearance.colorMode ?? null"
                  :disabled="preference === null || returning"
                  v-bind="
                    {
                      'aria-labelledby': field.labelledBy,
                      onPointerdownCapture: captureModeOrigin,
                      onKeydownCapture: captureModeOrigin,
                    } as HTMLAttributes
                  "
                  @update:value="chooseMode(String($event))"
                >
                  <NRadioButton
                    v-for="option in colorModeOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="preference?.appearance.colorMode === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
                <p
                  v-if="preference?.appearance.colorMode === 'system'"
                  class="m-0 text-caption text-text-secondary"
                >
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
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-theme-color"
              :label="t('settings.choose-theme')"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
            >
              <template #default="field">
                <div
                  class="wb-theme-options flex flex-wrap min-w-0 gap-component-unit"
                  role="group"
                  :aria-labelledby="field.labelledBy"
                >
                  <NButton
                    v-for="theme in themePreviews"
                    :key="`${theme.registryKind}:${theme.themeId}`"
                    :quaternary="!selectedTheme(theme.reference)"
                    :tertiary="selectedTheme(theme.reference)"
                    :type="selectedTheme(theme.reference) ? 'primary' : 'default'"
                    :bordered="false"
                    :theme-overrides="themeChoiceLayout"
                    class="wb-theme-option min-h-target-enhanced"
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
                      class="wb-theme-swatch grid place-items-center size-icon-medium"
                      aria-hidden="true"
                    >
                      <span
                        v-if="selectedTheme(theme.reference)"
                        class="i-lucide-check inline-block"
                      />
                    </span>
                    <span>{{ theme.label }}</span>
                  </NButton>
                </div>
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-style"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.styles.title')"
            >
              <div class="flex flex-wrap min-w-0 items-center gap-content-gap">
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
                  trigger="click"
                  placement="bottom-end"
                  :show="styleChooserOpen && !narrowLayout"
                  :disabled="narrowLayout"
                  :show-arrow="false"
                  :animated="effective.snapshot.value.motion === 'full'"
                  scrollable
                  class="wb-form-draft-popover"
                  to="#pavp-overlay-root"
                  @update:show="updateStyleChooser"
                >
                  <template #trigger>
                    <span ref="styleChooserTrigger">
                      <NButton
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
                        @click="narrowLayout && updateStyleChooser(true)"
                      >
                        {{ t('settings.styles.change') }}
                      </NButton>
                    </span>
                  </template>
                  <div
                    v-if="!narrowLayout"
                    id="settings-style-gallery"
                    class="grid min-w-0 gap-content-gap max-w-admin-drawer"
                    role="dialog"
                    :aria-label="t('settings.styles.title')"
                  >
                    <div class="flex min-w-0 items-center justify-between gap-content-gap">
                      <strong>{{ t('settings.styles.title') }}</strong>
                      <NButton
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
                    <ThemeStyleSettings
                      v-if="preference !== null"
                      :model-value="preference.appearance.colorStyle"
                      :appearance="effective.snapshot.value"
                      :disabled="returning"
                      @update:model-value="chooseStyle"
                      @keydown.esc.stop.prevent="closeStyleChooser"
                    />
                  </div>
                </NPopover>
              </div>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-contrast"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.contrast')"
            >
              <template #default="field">
                <NRadioGroup
                  class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-contrast"
                  :value="appearanceValue('contrast')"
                  :disabled="preference === null || returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateAppearance('contrast', $event)"
                >
                  <NRadioButton
                    v-for="option in choices.contrast"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="appearanceValue('contrast') === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
              </template>
            </SettingsField>
          </section>

          <section
            id="settings-comfort"
            class="grid min-w-0 gap-content-gap"
            aria-labelledby="settings-comfort-title"
          >
            <h2
              id="settings-comfort-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.comfort') }}
            </h2>
            <SettingsField
              id="settings-font-scale"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.font-scale')"
            >
              <template #default="field">
                <NRadioGroup
                  class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-font-scale"
                  :value="String(appearanceValue('fontScale') ?? '')"
                  :disabled="preference === null || returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateAppearance('fontScale', Number($event))"
                >
                  <NRadioButton
                    v-for="option in choices.fontScale"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="String(appearanceValue('fontScale') ?? '') === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-density"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.density')"
            >
              <template #default="field">
                <NRadioGroup
                  class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-density"
                  :value="String(appearanceValue('density') ?? '')"
                  :disabled="preference === null || returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateAppearance('density', $event)"
                >
                  <NRadioButton
                    v-for="option in choices.density"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="appearanceValue('density') === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-material"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.material')"
            >
              <template #default="field">
                <NRadioGroup
                  class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-material"
                  :value="String(appearanceValue('material') ?? '')"
                  :disabled="preference === null || returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateAppearance('material', $event)"
                >
                  <NRadioButton
                    v-for="option in choices.material"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="appearanceValue('material') === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-radius"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.radius')"
            >
              <template #default="field">
                <div class="grid min-w-0 gap-component-unit">
                  <NRadioGroup
                    class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                    name="settings-radius"
                    :value="String(appearanceValue('radius') ?? '')"
                    :disabled="preference === null || returning"
                    v-bind="
                      {
                        'aria-labelledby': field.labelledBy,
                        'aria-describedby': hasCustomRadius ? 'settings-radius-custom' : undefined,
                      } satisfies HTMLAttributes
                    "
                    @update:value="updateAppearance('radius', Number($event))"
                  >
                    <NRadioButton
                      v-for="option in choices.radius"
                      :key="option.value"
                      :value="option.value"
                    >
                      <span
                        v-if="String(appearanceValue('radius') ?? '') === option.value"
                        class="i-lucide-check inline-block"
                        aria-hidden="true"
                      />
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
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-motion"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.motion')"
            >
              <template #default="field">
                <NRadioGroup
                  class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                  name="settings-motion"
                  :value="String(appearanceValue('motion') ?? '')"
                  :disabled="preference === null || returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateAppearance('motion', $event)"
                >
                  <NRadioButton
                    v-for="option in choices.motion"
                    :key="option.value"
                    :value="option.value"
                  >
                    <span
                      v-if="appearanceValue('motion') === option.value"
                      class="i-lucide-check inline-block"
                      aria-hidden="true"
                    />
                    {{ option.label }}
                  </NRadioButton>
                </NRadioGroup>
              </template>
            </SettingsField>
          </section>

          <section
            id="settings-reading"
            class="grid min-w-0 gap-content-gap"
            aria-labelledby="settings-reading-title"
          >
            <div class="flex flex-wrap min-w-0 items-baseline justify-between gap-content-gap">
              <h2
                id="settings-reading-title"
                class="font-title-weight m-0 text-subheading"
                tabindex="-1"
              >
                {{ t('settings.section.reading') }}
              </h2>
              <time
                class="text-caption text-text-secondary"
                :datetime="new Date(now).toISOString()"
              >
                {{ liveDateTime }}
              </time>
            </div>
            <SettingsField
              id="settings-language"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('settings.language')"
            >
              <template #default="field">
                <div class="max-w-full w-admin-sidebar-expanded">
                  <UiRadioCardGroup
                    v-bind="
                      {
                        id: field.inputProps.id,
                        'aria-labelledby': field.labelledBy,
                        'aria-busy': language.pendingLocale.value !== null,
                      } satisfies HTMLAttributes
                    "
                    class="wb-setting-choice wb-mode-options-compact"
                    :accessible-label="t('settings.language')"
                    :model-value="language.pendingLocale.value ?? language.locale.value"
                    :options="choices.language"
                    :disabled="returning || language.pendingLocale.value !== null"
                    @update:model-value="updateLanguage"
                  >
                    <template #option="{ option, selected }">
                      <span
                        class="i-lucide-check shrink-0"
                        :class="{ invisible: !selected }"
                        aria-hidden="true"
                      />
                      <span>{{ option.label }}</span>
                    </template>
                  </UiRadioCardGroup>
                </div>
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-time-zone"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
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
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-date-format"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
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
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />

            <SettingsField
              id="settings-hour-cycle"
              class="wb-settings-choice-field layout-regular:grid-cols-2"
              :label="t('dateShowcase.hours')"
            >
              <template #default="field">
                <div class="grid min-w-0 gap-component-unit">
                  <NRadioGroup
                    class="flex flex-wrap h-auto max-w-full min-w-0 items-center"
                    name="settings-hour-cycle"
                    :value="dateTimeStore.preference.hourCycle"
                    :disabled="returning"
                    v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                    @update:value="
                      dateTimeStore.update({ ...dateTimeStore.preference, hourCycle: $event })
                    "
                  >
                    <NRadioButton value="h12">
                      <span
                        v-if="dateTimeStore.preference.hourCycle === 'h12'"
                        class="i-lucide-check inline-block"
                        aria-hidden="true"
                      />
                      <span v-text="'12h'" />
                    </NRadioButton>
                    <NRadioButton value="h23">
                      <span
                        v-if="dateTimeStore.preference.hourCycle === 'h23'"
                        class="i-lucide-check inline-block"
                        aria-hidden="true"
                      />
                      <span v-text="'24h'" />
                    </NRadioButton>
                  </NRadioGroup>
                  <span
                    class="text-caption"
                    :class="{ invisible: !dateTimeStore.persistenceFailed }"
                    role="status"
                    v-text="t('dateShowcase.notSaved')"
                  />
                </div>
              </template>
            </SettingsField>
          </section>

          <section
            id="settings-workspace"
            class="grid min-w-0 gap-content-gap"
            aria-labelledby="settings-workspace-title"
          >
            <h2
              id="settings-workspace-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.workspace') }}
            </h2>
            <SettingsField
              id="settings-navigation-collapsed"
              :label="t('settings.navigation-collapsed')"
            >
              <template #default="field">
                <NSwitch
                  :value="navigation.wideNavigationCollapsed"
                  :disabled="returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateNavigation('collapsed', $event)"
                />
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />
            <SettingsField
              id="settings-navigation-accordion"
              :label="t('settings.navigation-accordion')"
            >
              <template #default="field">
                <NSwitch
                  :value="navigation.accordion"
                  :disabled="returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateNavigation('accordion', $event)"
                />
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />
            <SettingsField
              id="settings-scroll-restoration"
              :label="t('settings.scroll-restoration')"
            >
              <template #default="field">
                <NSwitch
                  :value="scroll.restoreOnRefresh"
                  :disabled="returning"
                  v-bind="{ 'aria-labelledby': field.labelledBy } satisfies HTMLAttributes"
                  @update:value="updateScroll"
                />
              </template>
            </SettingsField>
            <div
              class="border-solid h-0 border-border-default border-width-default"
              role="separator"
            />
            <RuntimeVersionSettings />
          </section>
        </div>
      </UiScrollArea>
    </div>

    <NModal
      v-if="narrowLayout"
      :show="styleChooserOpen"
      to="#pavp-overlay-root"
      @update:show="updateStyleChooser"
      @after-leave="restoreStyleChooserFocus"
    >
      <NCard
        class="wb-provider-modal flex flex-col max-h-dvh"
        content-class="min-h-0 overflow-auto"
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
        <div id="settings-style-gallery">
          <ThemeStyleSettings
            v-if="preference !== null"
            :model-value="preference.appearance.colorStyle"
            :appearance="effective.snapshot.value"
            :disabled="returning"
            @update:model-value="chooseStyle"
            @keydown.esc.stop.prevent="closeStyleChooser"
          />
        </div>
      </NCard>
    </NModal>

    <NMessageProvider
      ref="messageProvider"
      to="#pavp-overlay-root"
    />
  </div>
</template>

<style scoped>
.wb-setting-choice {
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, calc(var(--ui-font-size-body) * 7)), 1fr)
  );
}
.wb-setting-choice :deep(.pavp-radio-card-group__content) {
  padding-inline: var(--ui-space-component-unit);
  white-space: nowrap;
}
.wb-mode-options-compact :deep(.pavp-radio-card-group__content) {
  padding: var(--ui-space-content-gap);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}
</style>
