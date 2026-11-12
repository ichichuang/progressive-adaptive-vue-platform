<script setup lang="ts">
import {
  builtInAppearanceThemePreviews,
  colorModePreferenceSchema,
  explicitThemePreferenceSchema,
  fontScaleValues,
  ProductPreferenceDefault,
  projectAccessibleCustomAppearanceThemePreviews,
  type AppearanceThemePreviewProjection,
  type ExplicitThemePreference,
  type ThemeReference,
} from '@platform/design-system'
import { computed, inject, onScopeDispose, ref, shallowRef } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { UiRadioCardGroup, UiScrollArea, type UiScrollController } from '@platform/ui'
import { NCard } from 'naive-ui/es/card'
import { NScrollbar } from 'naive-ui/es/scrollbar'
import { NSwitch } from 'naive-ui/es/switch'
import ThemeStyleSettings from '../app/workbench/ThemeStyleSettings.vue'
import SettingsField from '../app/workbench/SettingsField.vue'
import ColorModePreview from '../app/workbench/ColorModePreview.vue'

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import { useNavigationPreferenceStore } from '../app/navigation/navigation-preference.store'
import { consoleNavigationRegistry } from '../app/router/route-registry'
import { useSettingsReturn } from '../app/router/settings-return'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import { useScrollPreferenceStore } from '../app/scroll/scroll-preference.store'
import { consoleLocaleRegistry, useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'

defineOptions({ name: 'ControlCenterPage' })

type AppearanceAxis = Exclude<keyof ExplicitThemePreference['appearance'], 'theme' | 'colorStyle'>
type FeedbackKey = Extract<ConsoleMessageKey, `settings.feedback.${string}`>
type FeedbackTone = 'neutral' | 'success' | 'warning' | 'error'

const mutation = useAppearanceMutationBoundary()
const effective = useAppearanceReadBoundary()
const navigation = useNavigationPreferenceStore()
const scroll = useScrollPreferenceStore()
const language = useConsoleI18n()
const settingsReturn = useSettingsReturn()
const { t } = language
const preference = mutation.preference
const page = ref<HTMLElement | null>(null)
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
const feedback = ref<{ readonly key: FeedbackKey; readonly tone: FeedbackTone }>({
  key: 'settings.feedback.automatic',
  tone: 'neutral',
})
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
  { id: 'settings-style', label: 'settings.styles.title' },
  { id: 'settings-reading', label: 'settings.section.reading' },
  { id: 'settings-layout', label: 'settings.section.layout' },
  { id: 'settings-comfort', label: 'settings.section.comfort' },
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
const themePreviews = computed(() => [
  ...builtInAppearanceThemePreviews,
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []),
])
const activePreview = computed(() =>
  themePreviews.value.find(
    (theme) =>
      theme.reference.registryKind === effective.snapshot.value.theme.registryKind &&
      theme.themeId === effective.snapshot.value.theme.themeId,
  ),
)
const showSaveError = computed(
  () => feedback.value.tone === 'error' || feedback.value.tone === 'warning',
)
const feedbackMessage = computed(() => {
  if (returning.value) return t('settings.returning')
  if (language.pendingLocale.value !== null)
    return showSaveError.value
      ? `${t(feedback.value.key)} · ${t('i18n.loading')}`
      : t('i18n.loading')
  if (
    showSaveError.value &&
    ['not-saved', 'unsupported-locale', 'message-load-failed', 'commit-failed'].includes(
      language.notice.value,
    )
  )
    return `${t(feedback.value.key)} · ${t(localeNoticeKeys[language.notice.value])}`
  if (
    feedbackRevision.value === 0 &&
    ['preference-unavailable', 'saved-choice-unavailable'].includes(language.notice.value)
  )
    return t(localeNoticeKeys[language.notice.value])
  return t(feedback.value.key)
})
const colorModes = [
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
  { value: 'system', label: 'settings.system' },
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

function announce(key: FeedbackKey, tone: FeedbackTone): void {
  if (disposed) return
  feedback.value = { key, tone }
  feedbackRevision.value += 1
}

function commitAppearance(change: Readonly<Record<string, unknown>>): boolean {
  const current = explicitThemePreferenceSchema.safeParse(preference.value)
  if (!current.success) {
    announce('settings.feedback.unavailable', 'error')
    return false
  }
  const candidate = {
    ...current.data,
    appearance: { ...current.data.appearance, ...change },
  }
  const result = mutation.commitPreference(candidate)
  announce(
    result.status === 'committed' ? 'settings.feedback.saved' : 'settings.feedback.rejected',
    result.status === 'committed' ? 'success' : 'error',
  )
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

function chooseTheme(reference: ThemeReference): void {
  commitAppearance({ theme: { ...reference } })
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
  const current = explicitThemePreferenceSchema.safeParse(preference.value)
  if (!current.success) {
    announce('settings.feedback.unavailable', 'error')
    return
  }
  const restored = {
    ...ProductPreferenceDefault,
    theme: { ...ProductPreferenceDefault.theme },
    density: {
      ...current.data.appearance.density,
      preset: ProductPreferenceDefault.density.preset,
    },
  }
  if (commitAppearance(restored)) announce('settings.feedback.reset', 'success')
}

function announcePersistence(result: {
  readonly status: 'not-ready' | 'busy' | 'applied'
  readonly persistence?: 'saved' | 'failed'
}): void {
  if (result.status !== 'applied') {
    announce('settings.feedback.unavailable', 'error')
    return
  }
  announce(
    result.persistence === 'saved'
      ? 'settings.feedback.saved'
      : 'settings.feedback.applied-not-saved',
    result.persistence === 'saved' ? 'success' : 'warning',
  )
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
  announce('settings.feedback.automatic', 'neutral')
  const revision = feedbackRevision.value
  const result = await language.switchLocale(value)
  if (disposed) return
  if (feedbackRevision.value !== revision && showSaveError.value) return
  if (result.status === 'applied') announcePersistence(result)
  else if (result.status === 'unchanged')
    announce('settings.feedback.language-unchanged', 'neutral')
  else if (result.status === 'failed') announce('settings.feedback.language-failed', 'error')
  else announce('settings.feedback.cancelled', 'neutral')
}

function jumpTo(id: SectionId): void {
  const section = page.value?.querySelector<HTMLElement>(`#${id}`)
  if (section === undefined || section === null) return
  pendingSection = id
  const result = contentScroll.value?.scrollToAnchor(id, { behavior: 'smooth' })
  if (result?.kind !== 'scrolled') {
    pendingSection = undefined
    announce('settings.feedback.unavailable', 'error')
    return
  }
  activeSection.value = id
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
      announce('settings.feedback.return-failed', 'error')
    }
  } catch {
    announce('settings.feedback.return-failed', 'error')
  } finally {
    if (!disposed) returning.value = false
  }
}

function synchronizeViewport(viewport: HTMLElement): void {
  const top = viewport.getBoundingClientRect().top
  if (pendingSection !== undefined) {
    const target = page.value?.querySelector<HTMLElement>(`#${pendingSection}`)
    if (
      target !== undefined &&
      target !== null &&
      Math.abs(target.getBoundingClientRect().top - top) > 1
    )
      return
    pendingSection = undefined
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
  unregisterScrollController?.()
})
</script>
<template>
  <div
    ref="page"
    class="wb-page wb-settings flex-1 grid h-full min-h-0 min-w-0 gap-content-gap"
    @scroll.capture="synchronizeSection"
    @wheel.capture="interruptSectionScroll"
    @pointerdown.capture="interruptSectionScroll"
  >
    <UiScrollArea
      class="wb-settings-scroll min-h-0 min-w-0"
      owner-id="architecture-console-content"
      @controller="connectContentScroll"
    >
      <div class="wb-settings-content grid min-w-0 gap-field-gap">
        <header
          class="wb-settings-heading flex flex-wrap items-center justify-between gap-content-gap"
        >
          <h1
            id="control-center-heading"
            class="sr-only"
            data-route-focus="architecture-console-page-heading"
            tabindex="-1"
          >
            {{ t('settings.title') }}
          </h1>
          <p
            class="leading-title font-title-weight m-0 text-title"
            aria-hidden="true"
          >
            {{ t('settings.title') }}
          </p>
          <div
            class="wb-settings-summary flex flex-wrap items-center justify-between gap-content-gap"
          >
            <div class="wb-settings-save">
              <UiScrollArea owner-id="settings-feedback">
                <span
                  class="flex items-center gap-content-gap"
                  :data-tone="feedback.tone"
                  role="status"
                  aria-live="polite"
                >
                  <span
                    v-if="feedback.tone === 'success' && language.pendingLocale.value === null"
                    class="i-lucide-check text-control-success"
                    aria-hidden="true"
                  />
                  <span
                    v-else-if="showSaveError"
                    class="i-lucide-circle-alert text-control-error"
                    aria-hidden="true"
                  />
                  <span :key="feedbackRevision">
                    {{ feedbackMessage }}
                  </span>
                </span>
              </UiScrollArea>
            </div>
          </div>
        </header>

        <NCard
          id="settings-theme"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-theme-title"
        >
          <div
            class="wb-settings-intro flex flex-wrap items-baseline justify-between gap-content-gap"
          >
            <h2
              id="settings-theme-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.theme') }}
            </h2>
            <p class="m-0 text-pretty text-caption text-text-secondary">
              {{ t('settings.color-mode-note') }}
            </p>
          </div>
          <div class="wb-settings-controls grid min-w-0 gap-field-gap">
            <UiRadioCardGroup
              v-if="activePreview && preference !== null"
              class="wb-mode-options wb-mode-options-compact layout-regular:grid-cols-3 layout-wide:grid-cols-3"
              :accessible-label="t('settings.color-mode')"
              :model-value="preference.appearance.colorMode"
              :options="colorModeOptions"
              :disabled="returning"
              @update:model-value="updateAppearance('colorMode', $event)"
            >
              <template #option="{ option, selected }">
                <ColorModePreview
                  class="layout-narrow:hidden"
                  :theme="activePreview"
                  :mode="colorModePreferenceSchema.parse(option.value)"
                  :contrast="effective.snapshot.value.contrast"
                />
                <span
                  class="wb-mode-caption leading-body flex items-center justify-center gap-component-unit text-body"
                >
                  <span
                    v-if="selected"
                    class="i-lucide-circle-check shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    v-else
                    class="i-lucide-circle shrink-0"
                    aria-hidden="true"
                  />
                  <span class="whitespace-nowrap">{{ option.label }}</span>
                </span>
              </template>
            </UiRadioCardGroup>
            <div class="grid min-w-0 gap-content-gap">
              <span class="font-title-weight text-caption text-text-secondary">{{
                t('settings.choose-theme')
              }}</span>
              <div
                class="wb-theme-options flex flex-wrap min-w-0 gap-content-gap"
                role="group"
                :aria-label="t('settings.choose-theme')"
              >
                <NButton
                  v-for="theme in themePreviews"
                  :key="`${theme.registryKind}:${theme.themeId}`"
                  :quaternary="!selectedTheme(theme.reference)"
                  :tertiary="selectedTheme(theme.reference)"
                  :type="selectedTheme(theme.reference) ? 'primary' : 'default'"
                  :bordered="false"
                  :theme-overrides="themeChoiceLayout"
                  class="wb-theme-option"
                  :style="themeStyle(theme)"
                  :aria-pressed="selectedTheme(theme.reference)"
                  :aria-label="theme.label"
                  :disabled="preference === null || returning"
                  @click="chooseTheme(theme.reference)"
                >
                  <span
                    class="wb-theme-swatch grid place-items-center min-h-target-enhanced min-w-target-enhanced"
                    aria-hidden="true"
                  >
                    <span
                      v-if="selectedTheme(theme.reference)"
                      class="i-lucide-check text-title"
                    />
                  </span>
                  <span class="sr-only">{{ theme.label }}</span>
                </NButton>
              </div>
            </div>
            <SettingsField
              id="settings-contrast"
              class="wb-settings-choice-field"
              :label="t('settings.contrast')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.contrast')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="String(appearanceValue('contrast') ?? '')"
                  :options="choices.contrast"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('contrast', $event)"
                />
              </template>
            </SettingsField>
          </div>
        </NCard>
        <NCard
          id="settings-style"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-style-title"
        >
          <h2
            id="settings-style-title"
            class="sr-only"
            tabindex="-1"
          >
            {{ t('settings.styles.title') }}
          </h2>
          <ThemeStyleSettings
            v-if="preference !== null"
            :model-value="preference.appearance.colorStyle"
            :appearance="effective.snapshot.value"
            :disabled="returning"
            @update:model-value="commitAppearance({ colorStyle: $event })"
          />
        </NCard>
        <NCard
          id="settings-reading"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-reading-title"
        >
          <div
            class="wb-settings-intro flex flex-wrap items-baseline justify-between gap-content-gap"
          >
            <h2
              id="settings-reading-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.reading') }}
            </h2>
          </div>
          <div class="wb-settings-controls grid min-w-0 gap-field-gap">
            <SettingsField
              id="settings-language"
              class="wb-settings-choice-field"
              :label="t('settings.language')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.language')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="language.pendingLocale.value ?? language.locale.value"
                  :options="choices.language"
                  :disabled="returning || language.pendingLocale.value !== null"
                  :aria-busy="language.pendingLocale.value !== null"
                  @update:model-value="updateLanguage"
                />
              </template>
            </SettingsField>
            <SettingsField
              id="settings-font-scale"
              class="wb-settings-choice-field"
              :label="t('settings.font-scale')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.font-scale')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="String(appearanceValue('fontScale') ?? '')"
                  :options="choices.fontScale"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('fontScale', Number($event))"
                />
              </template>
            </SettingsField>
          </div>
        </NCard>
        <NCard
          id="settings-layout"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-layout-title"
        >
          <div
            class="wb-settings-intro flex flex-wrap items-baseline justify-between gap-content-gap"
          >
            <h2
              id="settings-layout-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.layout') }}
            </h2>
          </div>
          <div class="wb-settings-controls grid min-w-0 gap-field-gap">
            <SettingsField
              id="settings-density"
              class="wb-settings-choice-field"
              :label="t('settings.density')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.density')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="String(appearanceValue('density') ?? '')"
                  :options="choices.density"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('density', $event)"
                />
              </template>
            </SettingsField>
            <SettingsField
              id="settings-navigation-collapsed"
              :label="t('settings.navigation-collapsed')"
            >
              <template #default="field">
                <NSwitch
                  :value="navigation.wideNavigationCollapsed"
                  :aria-labelledby="field.labelledBy"
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
                  :value="navigation.accordion"
                  :aria-labelledby="field.labelledBy"
                  @update:value="updateNavigation('accordion', $event)"
                />
              </template>
            </SettingsField>
          </div>
        </NCard>
        <NCard
          id="settings-comfort"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-comfort-title"
        >
          <div
            class="wb-settings-intro flex flex-wrap items-baseline justify-between gap-content-gap"
          >
            <h2
              id="settings-comfort-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.comfort') }}
            </h2>
          </div>
          <div class="wb-settings-controls grid min-w-0 gap-field-gap">
            <SettingsField
              id="settings-material"
              class="wb-settings-choice-field"
              :label="t('settings.material')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.material')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="String(appearanceValue('material') ?? '')"
                  :options="choices.material"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('material', $event)"
                />
              </template>
            </SettingsField>
            <SettingsField
              id="settings-radius"
              class="wb-settings-choice-field"
              :label="t('settings.radius')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.radius')"
                  :aria-labelledby="field.labelledBy"
                  :aria-describedby="hasCustomRadius ? 'settings-radius-custom' : undefined"
                  :model-value="String(appearanceValue('radius') ?? '')"
                  :options="choices.radius"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('radius', Number($event))"
                />
                <p
                  v-if="hasCustomRadius"
                  id="settings-radius-custom"
                  class="mb-0 text-text-secondary"
                >
                  {{ t('settings.radius-custom') }}
                </p>
              </template>
            </SettingsField>
            <SettingsField
              id="settings-motion"
              class="wb-settings-choice-field"
              :label="t('settings.motion')"
            >
              <template #default="field">
                <UiRadioCardGroup
                  :id="field.inputProps.id"
                  class="wb-setting-choice"
                  :accessible-label="t('settings.motion')"
                  :aria-labelledby="field.labelledBy"
                  :model-value="String(appearanceValue('motion') ?? '')"
                  :options="choices.motion"
                  :disabled="preference === null || returning"
                  @update:model-value="updateAppearance('motion', $event)"
                />
              </template>
            </SettingsField>
          </div>
        </NCard>
        <NCard
          id="settings-workspace"
          tag="section"
          :bordered="false"
          class="wb-settings-section min-w-0"
          content-class="wb-settings-section-body grid min-w-0 gap-field-gap"
          aria-labelledby="settings-workspace-title"
        >
          <div
            class="wb-settings-intro flex flex-wrap items-baseline justify-between gap-content-gap"
          >
            <h2
              id="settings-workspace-title"
              class="font-title-weight m-0 text-subheading"
              tabindex="-1"
            >
              {{ t('settings.section.workspace') }}
            </h2>
          </div>
          <div class="wb-settings-controls grid min-w-0 gap-field-gap">
            <SettingsField
              id="settings-scroll-restoration"
              :label="t('settings.scroll-restoration')"
            >
              <template #default="field">
                <NSwitch
                  :value="scroll.restoreOnRefresh"
                  :aria-labelledby="field.labelledBy"
                  @update:value="updateScroll"
                />
              </template>
            </SettingsField>
            <div class="wb-settings-actions grid gap-content-gap">
              <NButton
                quaternary
                class="min-h-target-enhanced"
                @click="resetAppearance"
              >
                {{ t('settings.reset-appearance') }}
              </NButton>
              <span class="text-text-secondary">
                {{ t('settings.reset-note') }}
              </span>
            </div>
          </div>
        </NCard>
        <div
          class="wb-settings-tail"
          aria-hidden="true"
        />
      </div>
    </UiScrollArea>
    <aside
      class="wb-settings-navigation rounded-panel grid min-h-0 min-w-0 items-center order-first bg-surface-panel gap-content-gap layout-regular:order-last layout-wide:order-last layout-regular:p-panel-narrow layout-wide:p-panel-narrow"
    >
      <NScrollbar
        class="min-h-0 min-w-0"
        content-class="h-full"
      >
        <nav
          class="wb-section-nav flex min-h-0 min-w-0 justify-center gap-content-gap layout-regular:flex-col layout-wide:flex-col layout-regular:min-h-full layout-wide:min-h-full layout-narrow:gap-component-unit"
          :aria-label="t('settings.section-navigation')"
        >
          <NButton
            v-for="section in sections"
            :key="section.id"
            :quaternary="activeSection !== section.id"
            :type="activeSection === section.id ? 'primary' : 'default'"
            :bordered="false"
            :aria-label="t(section.label)"
            class="wb-section-link"
            :aria-current="activeSection === section.id ? 'location' : undefined"
            :aria-controls="section.id"
            @click="jumpTo(section.id)"
          >
            <span class="flex items-center gap-content-gap">
              <span
                v-if="section.id === 'settings-theme'"
                class="i-lucide-palette"
                aria-hidden="true"
              />
              <span
                v-else-if="section.id === 'settings-style'"
                class="i-lucide-panels-top-left"
                aria-hidden="true"
              />
              <span
                v-else-if="section.id === 'settings-reading'"
                class="i-lucide-type"
                aria-hidden="true"
              />
              <span
                v-else-if="section.id === 'settings-layout'"
                class="i-lucide-panels-top-left"
                aria-hidden="true"
              />
              <span
                v-else-if="section.id === 'settings-comfort'"
                class="i-lucide-sparkles"
                aria-hidden="true"
              />
              <span
                v-else
                class="i-lucide-layout-dashboard"
                aria-hidden="true"
              />
              <span class="layout-narrow:sr-only">{{ t(section.label) }}</span>
            </span>
          </NButton>
        </nav>
      </NScrollbar>
      <NButton
        class="wb-done min-h-target-enhanced"
        type="primary"
        :loading="returning && effective.snapshot.value.motion === 'full'"
        :aria-busy="returning"
        :aria-label="returning ? t('settings.returning') : t('settings.done')"
        :disabled="returning"
        @click="finish"
      >
        <span class="flex items-center gap-content-gap">
          <span
            class="i-lucide-check"
            aria-hidden="true"
          />
          <span class="layout-narrow:sr-only">{{
            returning ? t('settings.returning') : t('settings.done')
          }}</span>
        </span>
      </NButton>
    </aside>
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
.wb-mode-options-compact {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wb-mode-options-compact :deep(.pavp-radio-card-group__content) {
  padding: var(--ui-space-content-gap);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
}

.wb-mode-options-compact :deep(.wb-mode-preview) {
  inline-size: calc(var(--ui-control-height) * 2);
  block-size: calc(var(--ui-control-height) * 1.25);
}
.wb-mode-options-compact :deep(.wb-mode-caption) {
  font-size: var(--ui-font-size-body);
}
:global([data-layout-profile='narrow'] .wb-mode-options-compact .pavp-radio-card-group__content) {
  grid-template-columns: minmax(0, 1fr);
  padding: var(--ui-space-component-unit);
}
:global([data-layout-profile='narrow'] .wb-mode-options-compact .wb-mode-caption) {
  font-size: var(--ui-font-size-caption);
}
</style>
