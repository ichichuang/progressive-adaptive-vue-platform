<script setup lang="ts">
import {
  builtInAppearanceThemePreviews,
  colorModePreferenceSchema,
  contrastPreferenceSchema,
  fontScaleValues,
  materialPreferenceSchema,
  motionPreferenceSchema,
  ProductPreferenceDefault,
  projectAccessibleCustomAppearanceThemePreviews,
  type AppearanceThemePreviewProjection,
  type AppearanceThemePreviewSwatches,
  type ExplicitThemePreference,
  type ThemeReference,
} from '@platform/design-system'
import {
  UiButton,
  UiDescriptionList,
  UiPageHeader,
  UiRadioCardGroup,
  UiSection,
  UiSegmentedControl,
  UiStatusBadge,
  type UiDescriptionItem,
  type UiSegmentedOption,
} from '@platform/ui'
import { computed, ref } from 'vue'

import { useWorkspaceContentRevision } from '../app/workspace/workspace-content'
import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import {
  consoleLocaleRegistry,
  useConsoleI18n,
  type ConsoleLocaleNotice,
  type ConsoleMessageKey,
} from '../shared/i18n'

const language = useConsoleI18n()
const { t, locale, pendingLocale, notice } = language
const languageOptions = Object.freeze(
  consoleLocaleRegistry.map((record) => ({
    value: record.id,
    label: record.id === 'zh-CN' ? '简体中文' : 'English',
  })),
)
const languageNoticeKeys = {
  none: 'i18n.none',
  loading: 'i18n.loading',
  applied: 'i18n.applied',
  'not-saved': 'i18n.not-saved',
  'saved-choice-unavailable': 'i18n.saved-choice-unavailable',
  'preference-unavailable': 'i18n.preference-unavailable',
  'unsupported-locale': 'i18n.unsupported-locale',
  'message-load-failed': 'i18n.message-load-failed',
  'commit-failed': 'i18n.commit-failed',
} as const satisfies Readonly<Record<ConsoleLocaleNotice, ConsoleMessageKey>>

defineOptions({ name: 'AppearanceManagementPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

type FeedbackMessage =
  'appearance.feedback.saved' | 'appearance.feedback.rejected' | 'appearance.feedback.reset'

interface DisplayThemePreview extends AppearanceThemePreviewProjection {
  readonly displayLabel: string
}

const materialStageTitle = computed(() => t('appearance.material-stage-title'))
const materialStageSummary = computed(() => t('appearance.material-stage-summary'))
const motionStageTitle = computed(() => t('appearance.motion-stage-title'))
const colorModeOptions = computed(() =>
  Object.freeze([
    Object.freeze({
      label: t('appearance.system'),
      value: colorModePreferenceSchema.parse('system'),
    }),
    Object.freeze({
      label: t('appearance.light'),
      value: colorModePreferenceSchema.parse('light'),
    }),
    Object.freeze({ label: t('appearance.dark'), value: colorModePreferenceSchema.parse('dark') }),
  ] as const satisfies readonly UiSegmentedOption[]),
)
const contrastOptions = computed(() =>
  Object.freeze([
    Object.freeze({
      label: t('appearance.standard'),
      value: contrastPreferenceSchema.parse('standard'),
    }),
    Object.freeze({
      label: t('appearance.enhanced'),
      value: contrastPreferenceSchema.parse('enhanced'),
    }),
  ] as const satisfies readonly UiSegmentedOption[]),
)
const materialOptions = computed(() =>
  Object.freeze([
    Object.freeze({
      label: t('appearance.adaptive'),
      value: materialPreferenceSchema.parse('adaptive'),
    }),
    Object.freeze({
      label: t('appearance.reduced-material'),
      value: materialPreferenceSchema.parse('reduced'),
    }),
    Object.freeze({ label: t('appearance.solid'), value: materialPreferenceSchema.parse('solid') }),
  ] as const satisfies readonly UiSegmentedOption[]),
)
const fontScaleLabels = Object.freeze({
  '0.9': '90%',
  '1': '100%',
  '1.1': '110%',
  '1.2': '120%',
} as const)
const fontScaleOptions = Object.freeze(
  fontScaleValues.map((value) =>
    Object.freeze({
      label: fontScaleLabels[String(value) as keyof typeof fontScaleLabels],
      value: String(value),
    }),
  ),
) satisfies readonly UiSegmentedOption[]
const motionOptions = computed(() =>
  Object.freeze([
    Object.freeze({
      label: t('appearance.full-motion'),
      value: motionPreferenceSchema.parse('full'),
    }),
    Object.freeze({
      label: t('appearance.reduced-motion'),
      value: motionPreferenceSchema.parse('reduced'),
    }),
    Object.freeze({
      label: t('appearance.no-motion'),
      value: motionPreferenceSchema.parse('none'),
    }),
  ] as const satisfies readonly UiSegmentedOption[]),
)
const previewViewOptions = computed(() =>
  Object.freeze([
    Object.freeze({ label: t('appearance.overview'), value: 'overview' }),
    Object.freeze({ label: t('appearance.details'), value: 'details' }),
  ] as const satisfies readonly UiSegmentedOption[]),
)

const effective = useAppearanceReadBoundary()
const mutation = useAppearanceMutationBoundary()
const preference = computed(() => mutation.preference.value)
const previewView = ref<'overview' | 'details'>('overview')
const motionSequence = ref(0)
const feedbackSequence = ref(0)
const feedbackMessage = ref<FeedbackMessage | ''>('')
const feedbackPhase = computed(() => (feedbackSequence.value % 2 === 0 ? 'even' : 'odd'))

const themePreviews = computed<readonly DisplayThemePreview[]>(() => [
  ...builtInAppearanceThemePreviews.map((theme) => ({
    ...theme,
    displayLabel: theme.label,
  })),
  ...projectAccessibleCustomAppearanceThemePreviews(mutation.customThemeRegistry.value ?? []).map(
    (theme) => ({
      ...theme,
      displayLabel: theme.label,
    }),
  ),
])

useWorkspaceContentRevision(() => [
  previewView.value,
  motionSequence.value,
  feedbackSequence.value,
  feedbackMessage.value,
  pendingLocale.value,
  notice.value,
  locale.value,
  preference.value,
  themePreviews.value,
])

function themeReferenceKey(reference: ThemeReference): string {
  return `${reference.registryKind}:${reference.themeId}`
}

const themePreviewByValue = computed(
  () =>
    new Map(
      themePreviews.value.map((theme) => [themeReferenceKey(theme.reference), theme] as const),
    ),
)
const themeSelectionOptions = computed<readonly UiSegmentedOption[]>(() =>
  themePreviews.value.map((theme) =>
    Object.freeze({
      label: theme.displayLabel,
      value: themeReferenceKey(theme.reference),
    }),
  ),
)
const selectedThemeValue = computed(() =>
  preference.value === null ? '' : themeReferenceKey(preference.value.appearance.theme),
)

function referencesEqual(left: ThemeReference, right: ThemeReference): boolean {
  return left.registryKind === right.registryKind && left.themeId === right.themeId
}

function themePreviewForValue(value: string): DisplayThemePreview {
  const theme = themePreviewByValue.value.get(value)

  if (theme === undefined) {
    throw new Error('Appearance theme option is not present in the canonical preview projection.')
  }

  return theme
}

function currentSwatches(theme: AppearanceThemePreviewProjection): AppearanceThemePreviewSwatches {
  const snapshot = effective.snapshot.value
  return theme.planes[snapshot.colorMode][snapshot.contrast]
}

function currentPreferenceCandidate(): ExplicitThemePreference | null {
  const current = preference.value

  if (current === null) {
    return null
  }

  return {
    schemaVersion: current.schemaVersion,
    appearance: {
      colorMode: current.appearance.colorMode,
      theme:
        current.appearance.theme.registryKind === 'built-in'
          ? {
              registryKind: 'built-in',
              themeId: current.appearance.theme.themeId,
            }
          : {
              registryKind: 'custom',
              themeId: current.appearance.theme.themeId,
            },
      contrast: current.appearance.contrast,
      material: current.appearance.material,
      density: current.appearance.density,
      fontScale: current.appearance.fontScale,
      motion: current.appearance.motion,
    },
  }
}

function announceFeedback(message: FeedbackMessage): void {
  feedbackMessage.value = message
  feedbackSequence.value += 1
}

function announceRejectedMutation(): void {
  announceFeedback('appearance.feedback.rejected')
}

function commitCandidate(
  candidate: ExplicitThemePreference,
  successMessage: Extract<
    FeedbackMessage,
    'appearance.feedback.saved' | 'appearance.feedback.reset'
  >,
): void {
  const result = mutation.commitPreference(candidate)
  announceFeedback(result.status === 'committed' ? successMessage : 'appearance.feedback.rejected')
}

function commitAxis(update: (candidate: ExplicitThemePreference) => void): void {
  const candidate = currentPreferenceCandidate()

  if (candidate === null) {
    announceRejectedMutation()
    return
  }

  update(candidate)
  commitCandidate(candidate, 'appearance.feedback.saved')
}

function updateTheme(reference: ThemeReference): void {
  const availableTheme = themePreviews.value.find((theme) =>
    referencesEqual(theme.reference, reference),
  )

  if (availableTheme === undefined) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.theme =
      availableTheme.reference.registryKind === 'built-in'
        ? {
            registryKind: 'built-in',
            themeId: availableTheme.reference.themeId,
          }
        : {
            registryKind: 'custom',
            themeId: availableTheme.reference.themeId,
          }
  })
}

function updateThemeSelection(value: string): void {
  const theme = themePreviewByValue.value.get(value)

  if (theme === undefined) {
    announceRejectedMutation()
    return
  }

  updateTheme(theme.reference)
}

function updateColorMode(value: string): void {
  const parsed = colorModePreferenceSchema.safeParse(value)

  if (!parsed.success) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.colorMode = parsed.data
  })
}

function updateContrast(value: string): void {
  const parsed = contrastPreferenceSchema.safeParse(value)

  if (!parsed.success) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.contrast = parsed.data
  })
}

function updateMaterial(value: string): void {
  const parsed = materialPreferenceSchema.safeParse(value)

  if (!parsed.success) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.material = parsed.data
  })
}

function updateFontScale(value: string): void {
  const parsed = fontScaleValues.find((candidate) => String(candidate) === value)

  if (parsed === undefined) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.fontScale = parsed
  })
}

function updateMotion(value: string): void {
  const parsed = motionPreferenceSchema.safeParse(value)

  if (!parsed.success) {
    announceRejectedMutation()
    return
  }

  commitAxis((candidate) => {
    candidate.appearance.motion = parsed.data
  })
}

function resetVisibleAppearanceAxes(): void {
  const candidate = currentPreferenceCandidate()

  if (candidate === null) {
    announceRejectedMutation()
    return
  }

  const currentDensity = candidate.appearance.density
  candidate.appearance = {
    colorMode: ProductPreferenceDefault.colorMode,
    theme: { ...ProductPreferenceDefault.theme },
    contrast: ProductPreferenceDefault.contrast,
    material: ProductPreferenceDefault.material,
    density: currentDensity,
    fontScale: ProductPreferenceDefault.fontScale,
    motion: ProductPreferenceDefault.motion,
  }
  commitCandidate(candidate, 'appearance.feedback.reset')
}

function updatePreviewView(value: string): void {
  if (value === 'overview' || value === 'details') {
    previewView.value = value
  }
}

function replayMotion(): void {
  motionSequence.value += 1
}

function effectiveColorModeLabel(): string {
  return effective.snapshot.value.colorMode === 'light'
    ? t('appearance.light')
    : t('appearance.dark')
}

function effectiveContrastLabel(): string {
  return effective.snapshot.value.contrast === 'standard'
    ? t('appearance.standard')
    : t('appearance.enhanced')
}

function effectiveMaterialLabel(): string {
  switch (effective.snapshot.value.material) {
    case 'adaptive':
      return t('appearance.adaptive')
    case 'reduced':
      return t('appearance.reduced-material')
    case 'solid':
      return t('appearance.solid')
  }
}

function effectiveMotionLabel(): string {
  switch (effective.snapshot.value.motion) {
    case 'full':
      return t('appearance.full-motion')
    case 'reduced':
      return t('appearance.reduced-motion')
    case 'none':
      return t('appearance.no-motion')
  }
}

const currentThemeLabel = computed(
  () =>
    themePreviews.value.find((theme) =>
      referencesEqual(theme.reference, effective.snapshot.value.theme),
    )?.displayLabel ?? t('appearance.current-theme'),
)
const currentPlaneLabel = computed(
  () => `${effectiveColorModeLabel()} · ${effectiveContrastLabel()}`,
)
const previewDescriptionItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: t('appearance.theme'), value: currentThemeLabel.value },
  { label: t('appearance.display'), value: currentPlaneLabel.value },
  { label: t('appearance.material'), value: effectiveMaterialLabel() },
  {
    label: t('appearance.font-size'),
    value: `${String(Math.round(effective.snapshot.value.fontScale * 100))}%`,
  },
  { label: t('appearance.motion'), value: effectiveMotionLabel() },
])
</script>

<template>
  <UiPageHeader
    :breadcrumb="breadcrumb"
    :summary="message"
    :title="title"
  />

  <UiSection
    class="pavp-appearance-theme-section"
    :description="
      t('appearance.gallery.description', { count: builtInAppearanceThemePreviews.length })
    "
    :title="t('appearance.gallery.title')"
  >
    <div class="pavp-appearance-theme-toolbar">
      <div class="pavp-appearance-theme-toolbar__summary">
        <span class="pavp-appearance-eyebrow">{{ t('appearance.current-theme') }}</span>
        <strong>{{ currentThemeLabel }}</strong>
      </div>
      <div class="pavp-appearance-theme-toolbar__meta">
        <span class="text-text-secondary">{{ t('appearance.apply-immediately') }}</span>
        <UiStatusBadge
          :label="currentPlaneLabel"
          tone="active"
        />
      </div>
    </div>
    <div
      :aria-label="t('appearance.swatch-roles')"
      class="pavp-appearance-theme-legend text-text-secondary"
    >
      <span>{{ t('appearance.page') }}</span>
      <span>{{ t('appearance.panel') }}</span>
      <span>{{ t('appearance.action-fill') }}</span>
      <span>{{ t('appearance.control-foreground') }}</span>
      <span>{{ t('appearance.border') }}</span>
      <span>{{ t('appearance.focus') }}</span>
    </div>

    <UiRadioCardGroup
      :accessible-label="t('appearance.choose-theme')"
      class="pavp-appearance-theme-gallery"
      data-appearance-axis="theme"
      :model-value="selectedThemeValue"
      :options="themeSelectionOptions"
      @update:model-value="updateThemeSelection"
    >
      <template #option="{ option, selected }">
        <span class="pavp-appearance-theme-option__heading">
          <strong class="pavp-appearance-theme-option__title">{{ option.label }}</strong>
          <span
            :aria-hidden="!selected"
            class="pavp-appearance-theme-option__status"
            :data-visible="selected"
          >
            <UiStatusBadge
              :label="t('appearance.current-theme')"
              tone="active"
            />
          </span>
        </span>
        <span
          aria-hidden="true"
          class="pavp-appearance-theme-swatches"
        >
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .surfacePage,
            }"
          />
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .surfacePanel,
            }"
          />
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .actionPrimary,
            }"
          />
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .controlPrimary,
            }"
          />
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .borderDefault,
            }"
          />
          <span
            class="pavp-appearance-theme-swatch"
            :style="{
              ['--pavp-appearance-swatch']: currentSwatches(themePreviewForValue(option.value))
                .focusRing,
            }"
          />
        </span>
        <span class="pavp-appearance-theme-option__meta text-text-secondary">
          <span>
            {{
              themePreviewForValue(option.value).registryKind === 'built-in'
                ? t('appearance.built-in')
                : t('appearance.project')
            }}
          </span>
          <span>{{ currentPlaneLabel }}</span>
        </span>
      </template>
    </UiRadioCardGroup>
  </UiSection>

  <div class="pavp-appearance-workspace">
    <div class="pavp-appearance-controls">
      <UiSection
        :description="t('appearance.preferences.description')"
        :title="t('appearance.preferences.title')"
      >
        <div
          class="pavp-appearance-control"
          data-appearance-axis="color-mode"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('appearance.color-mode') }}</strong>
            <span class="text-text-secondary">{{ t('appearance.color-mode-description') }}</span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('appearance.color-mode')"
            :model-value="preference?.appearance.colorMode ?? ''"
            :options="colorModeOptions"
            @update:model-value="updateColorMode"
          />
        </div>
        <div
          class="pavp-appearance-control"
          data-appearance-axis="contrast"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('appearance.contrast') }}</strong>
            <span class="text-text-secondary">{{ t('appearance.contrast-description') }}</span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('appearance.contrast')"
            :model-value="preference?.appearance.contrast ?? ''"
            :options="contrastOptions"
            @update:model-value="updateContrast"
          />
        </div>
        <div
          class="pavp-appearance-control"
          data-appearance-axis="material"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('appearance.material') }}</strong>
            <span class="text-text-secondary">{{ t('appearance.material-description') }}</span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('appearance.material')"
            :model-value="preference?.appearance.material ?? ''"
            :options="materialOptions"
            @update:model-value="updateMaterial"
          />
        </div>
        <div
          class="pavp-appearance-control"
          data-appearance-axis="font-scale"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('appearance.font-size') }}</strong>
            <span class="text-text-secondary">{{ t('appearance.font-size-description') }}</span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('appearance.font-size')"
            :model-value="preference === null ? '' : String(preference.appearance.fontScale)"
            :options="fontScaleOptions"
            @update:model-value="updateFontScale"
          />
        </div>
        <div
          class="pavp-appearance-control"
          data-appearance-axis="motion"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('appearance.motion') }}</strong>
            <span class="text-text-secondary">{{ t('appearance.motion-description') }}</span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('appearance.motion')"
            :model-value="preference?.appearance.motion ?? ''"
            :options="motionOptions"
            @update:model-value="updateMotion"
          />
        </div>

        <div
          class="pavp-appearance-control"
          :aria-busy="pendingLocale !== null"
        >
          <span class="pavp-appearance-control__copy">
            <strong>{{ t('i18n.language-label') }}</strong>
            <span class="text-text-secondary">{{ t('i18n.language-description') }}</span>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              class="text-text-secondary"
            >
              {{ t(languageNoticeKeys[notice]) }}
            </span>
          </span>
          <UiSegmentedControl
            :accessible-label="t('i18n.language-label')"
            :model-value="pendingLocale ?? locale"
            :options="languageOptions"
            @update:model-value="language.switchLocale($event)"
          />
        </div>
        <div class="pavp-appearance-actions">
          <UiButton
            variant="ghost"
            @press="resetVisibleAppearanceAxes"
          >
            {{ t('appearance.reset') }}
          </UiButton>
        </div>
        <div
          aria-atomic="true"
          aria-live="polite"
          class="pavp-appearance-feedback"
          :data-feedback-phase="feedbackPhase"
        >
          <span
            v-if="feedbackMessage"
            :key="feedbackSequence"
            class="pavp-appearance-feedback__message text-text-secondary"
          >
            {{ t(feedbackMessage) }}
          </span>
        </div>
      </UiSection>
    </div>

    <aside class="pavp-appearance-preview-column">
      <UiSection
        :description="t('appearance.preview.description')"
        :title="t('appearance.preview.title')"
      >
        <div
          class="pavp-appearance-preview"
          :data-material-preview="effective.snapshot.value.material"
          :data-motion-preview="effective.snapshot.value.motion"
        >
          <section
            aria-labelledby="pavp-material-stage-title"
            class="pavp-material-stage"
          >
            <div class="pavp-appearance-stage-heading">
              <div>
                <h3
                  id="pavp-material-stage-title"
                  class="leading-title font-title-weight m-0 text-text-primary"
                >
                  {{ materialStageTitle }}
                </h3>
                <p class="leading-body m-0 text-body text-text-secondary">
                  {{ materialStageSummary }}
                </p>
              </div>
              <UiStatusBadge
                :label="
                  t('appearance.preview.current-material', { material: effectiveMaterialLabel() })
                "
                tone="active"
              />
            </div>

            <div class="pavp-material-stage__canvas">
              <div
                aria-hidden="true"
                class="pavp-material-stage__environment"
              >
                <span />
                <span />
              </div>
              <div class="pavp-material-stage__frame">
                <header class="pavp-material-stage__header">
                  <span class="pavp-material-stage__identity">
                    <span class="pavp-material-stage__mark">PAVP</span>
                    <strong>{{ t('appearance.workspace') }}</strong>
                  </span>
                  <UiStatusBadge
                    :label="t('appearance.live-sync')"
                    tone="complete"
                  />
                </header>

                <div class="pavp-material-stage__body">
                  <nav
                    :aria-label="t('appearance.preview.navigation')"
                    class="pavp-material-stage__navigation"
                    :data-preview-view="previewView"
                  >
                    <UiSegmentedControl
                      :accessible-label="t('appearance.preview.switch')"
                      :model-value="previewView"
                      :options="previewViewOptions"
                      @update:model-value="updatePreviewView"
                    />
                    <span
                      :key="`navigation-${previewView}-${String(motionSequence)}`"
                      aria-hidden="true"
                      class="pavp-material-stage__navigation-indicator"
                    />
                  </nav>

                  <div class="pavp-material-stage__content">
                    <div
                      :key="`content-${String(motionSequence)}`"
                      class="pavp-material-stage__content-entry"
                    >
                      <h4>
                        {{
                          previewView === 'overview'
                            ? t('appearance.preview.overview')
                            : t('appearance.preview.details')
                        }}
                      </h4>
                      <p class="text-text-primary">
                        {{ t('appearance.preview.primary-text') }}
                      </p>
                      <p class="text-text-secondary">
                        {{ t('appearance.preview.secondary-text') }}
                      </p>
                    </div>

                    <UiDescriptionList :items="previewDescriptionItems" />

                    <div class="pavp-material-stage__actions">
                      <UiButton
                        variant="primary"
                        @press="replayMotion"
                      >
                        {{ t('appearance.preview.run') }}
                      </UiButton>
                      <UiButton
                        class="pavp-material-stage__focus-example"
                        variant="secondary"
                        @press="replayMotion"
                      >
                        {{ t('appearance.preview.keyboard') }}
                      </UiButton>
                    </div>
                  </div>

                  <aside
                    :aria-label="t('appearance.preview.overlay')"
                    class="pavp-material-stage__floating"
                  >
                    <strong>{{ t('appearance.preview.quick-actions') }}</strong>
                    <span class="text-text-secondary">{{
                      t('appearance.preview.overlay-description')
                    }}</span>
                  </aside>
                </div>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="pavp-motion-stage-title"
            class="pavp-motion-stage"
          >
            <div class="pavp-appearance-stage-heading">
              <div>
                <h3
                  id="pavp-motion-stage-title"
                  class="leading-title font-title-weight m-0 text-text-primary"
                >
                  {{ motionStageTitle }}
                </h3>
                <p class="text-text-secondary">
                  {{ t('appearance.preview.motion-description') }}
                </p>
              </div>
              <UiButton
                variant="secondary"
                @press="replayMotion"
              >
                {{ t('appearance.preview.replay') }}
              </UiButton>
            </div>
            <div
              :key="`motion-${String(motionSequence)}`"
              class="pavp-motion-stage__demo"
            >
              <span class="pavp-motion-stage__indicator">{{
                t('appearance.preview.selected')
              }}</span>
              <span class="pavp-motion-stage__content text-text-secondary">{{
                t('appearance.preview.entered')
              }}</span>
              <UiButton
                variant="ghost"
                @press="replayMotion"
              >
                {{ t('appearance.preview.button') }}
              </UiButton>
            </div>
          </section>
        </div>
      </UiSection>
    </aside>
  </div>
</template>

<style scoped>
.pavp-appearance-theme-section {
  overflow: hidden;
}

.pavp-appearance-theme-toolbar,
.pavp-appearance-theme-toolbar__summary,
.pavp-appearance-theme-toolbar__meta,
.pavp-appearance-theme-option__heading,
.pavp-appearance-theme-option__meta,
.pavp-appearance-actions,
.pavp-appearance-stage-heading,
.pavp-material-stage__header,
.pavp-material-stage__identity,
.pavp-material-stage__actions,
.pavp-motion-stage__demo {
  display: flex;
  align-items: center;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-theme-toolbar {
  flex-wrap: wrap;
  justify-content: space-between;
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-material-overlay-background);
}

.pavp-appearance-theme-toolbar__summary,
.pavp-appearance-control__copy {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-theme-toolbar__meta {
  flex-wrap: wrap;
}

.pavp-appearance-theme-legend {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--ui-space-content-gap);
  padding-inline: var(--ui-space-content-gap);
  font-size: var(--ui-font-size-body);
  text-align: center;
}

.pavp-appearance-eyebrow {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-appearance-theme-option__heading,
.pavp-appearance-theme-option__meta,
.pavp-appearance-stage-heading,
.pavp-material-stage__header {
  justify-content: space-between;
}

.pavp-appearance-theme-option__meta {
  color: var(--ui-color-text-secondary);
}

.pavp-appearance-theme-option__title {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.pavp-appearance-theme-option__status {
  flex: none;
  visibility: hidden;
}

.pavp-appearance-theme-option__status[data-visible='true'] {
  visibility: visible;
}

.pavp-appearance-theme-swatches {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  overflow: hidden;
  border-radius: var(--ui-radius-panel);
}

.pavp-appearance-theme-swatch {
  block-size: calc(var(--ui-control-height) / 2);
  background: var(--pavp-appearance-swatch);
}

.pavp-appearance-workspace,
.pavp-appearance-controls,
.pavp-appearance-preview,
.pavp-appearance-control,
.pavp-material-stage,
.pavp-material-stage__frame,
.pavp-material-stage__body,
.pavp-material-stage__content,
.pavp-motion-stage {
  display: grid;
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-control {
  padding-block: var(--ui-space-content-gap);
  border-block-end-color: var(--ui-color-border-default);
  border-block-end-style: solid;
}

.pavp-appearance-control__copy {
  min-inline-size: 0;
}

.pavp-appearance-actions,
.pavp-material-stage__actions,
.pavp-motion-stage__demo {
  flex-wrap: wrap;
}

.pavp-appearance-actions {
  justify-content: flex-end;
  padding-block-start: var(--ui-space-content-gap);
}

.pavp-appearance-feedback {
  min-block-size: var(--ui-control-height);
}

.pavp-appearance-feedback:has(.pavp-appearance-feedback__message) {
  display: flex;
  align-items: center;
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-surface-panel);
}

.pavp-appearance-feedback[data-feedback-phase='odd'] {
  box-shadow: none;
}

.pavp-appearance-feedback[data-feedback-phase='even'] {
  box-shadow: none;
}

.pavp-appearance-feedback__message {
  animation: pavp-setting-commit var(--ui-motion-duration) var(--ui-motion-easing) both;
}

.pavp-appearance-preview {
  inline-size: 100%;
  max-inline-size: var(--ui-layout-content-max-width);
  justify-self: center;
}

.pavp-material-stage__canvas {
  display: grid;
  overflow: hidden;
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-surface-page);
}

.pavp-material-stage__environment,
.pavp-material-stage__frame {
  grid-area: 1 / 1;
}

.pavp-material-stage__environment {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: start;
  pointer-events: none;
}

.pavp-material-stage__environment > * {
  block-size: calc(var(--ui-control-height) / 4);
}

.pavp-material-stage__environment > :first-child {
  background: var(--ui-color-action-primary);
}

.pavp-material-stage__environment > :last-child {
  background: var(--ui-color-surface-panel);
}

.pavp-material-stage__frame {
  position: relative;
  padding: var(--ui-space-content-gap);
}

.pavp-material-stage__header,
.pavp-material-stage__navigation {
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-material-chrome-background);
  box-shadow: var(--ui-shadow-panel);
}

.pavp-material-stage__identity {
  min-inline-size: 0;
  flex-wrap: wrap;
}

.pavp-material-stage__mark {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-material-stage__body {
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--ui-layout-admin-content-minimum-inline-size)), 1fr)
  );
  align-items: start;
}

.pavp-material-stage__navigation {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
}

.pavp-material-stage__navigation-indicator {
  display: block;
  flex: none;
  inline-size: var(--ui-control-height);
  block-size: 0;
  border-block-end-color: currentColor;
  border-block-end-style: solid;
  border-block-end-width: calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-control-primary);
}

.pavp-material-stage__content {
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-surface-panel);
}

.pavp-material-stage__content h4,
.pavp-material-stage__content p,
.pavp-appearance-stage-heading h3,
.pavp-appearance-stage-heading p {
  margin: 0;
}

.pavp-material-stage__content h4,
.pavp-appearance-stage-heading h3 {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-material-stage__floating {
  display: grid;
  align-content: start;
  justify-self: stretch;
  gap: var(--ui-space-content-gap);
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-material-overlay-background);
  box-shadow: var(--ui-shadow-panel);
}

.pavp-appearance-preview[data-material-preview='adaptive']
  :where(
    .pavp-material-stage__header,
    .pavp-material-stage__navigation,
    .pavp-material-stage__floating
  ) {
  -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
}

.pavp-appearance-preview[data-material-preview='reduced']
  :where(
    .pavp-material-stage__header,
    .pavp-material-stage__navigation,
    .pavp-material-stage__floating
  ),
.pavp-appearance-preview[data-material-preview='solid']
  :where(
    .pavp-material-stage__header,
    .pavp-material-stage__navigation,
    .pavp-material-stage__floating
  ) {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
}

.pavp-motion-stage {
  padding-block-start: var(--ui-space-content-gap);
  border-block-start-color: var(--ui-color-border-default);
  border-block-start-style: solid;
}

.pavp-motion-stage__demo {
  justify-content: space-between;
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-surface-panel);
}

.pavp-motion-stage__indicator {
  padding: var(--ui-space-content-gap);
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-text-on-action);
  background: var(--ui-color-action-primary);
}

.pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__navigation-indicator,
.pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__indicator {
  animation: pavp-appearance-indicator-enter var(--ui-motion-duration) var(--ui-motion-easing) both;
}

.pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__content-entry,
.pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__content {
  animation: pavp-appearance-content-enter var(--ui-motion-duration) var(--ui-motion-easing) both;
}

.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-material-stage__navigation-indicator,
.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-motion-stage__indicator {
  animation: pavp-appearance-indicator-enter-reduced calc(var(--ui-motion-duration) / 2)
    var(--ui-motion-easing) both;
}

.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-material-stage__content-entry,
.pavp-appearance-preview[data-motion-preview='reduced'] .pavp-motion-stage__content {
  animation: pavp-appearance-content-enter-reduced calc(var(--ui-motion-duration) / 2)
    var(--ui-motion-easing) both;
}

.pavp-appearance-preview[data-motion-preview='none']
  :where(
    .pavp-material-stage__navigation-indicator,
    .pavp-material-stage__content-entry,
    .pavp-motion-stage__indicator,
    .pavp-motion-stage__content
  ) {
  animation: none;
  transform: none;
  transition: none;
}

:global(.pavp-admin-shell[data-layout-profile='regular']) .pavp-appearance-workspace,
:global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-workspace {
  grid-template-columns: var(--ui-layout-admin-drawer-maximum-inline-size) minmax(0, 1fr);
  align-items: start;
}

:global(.pavp-admin-shell[data-layout-profile='regular']) .pavp-appearance-control,
:global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-control {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

:global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-theme-gallery {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

@keyframes pavp-setting-commit {
  from {
    color: var(--ui-color-text-primary);
    transform: translateY(var(--ui-space-content-gap));
  }

  to {
    color: var(--ui-color-text-secondary);
    transform: translateY(0);
  }
}

@keyframes pavp-setting-commit-reduced {
  from {
    color: var(--ui-color-text-primary);
  }

  to {
    color: var(--ui-color-text-secondary);
  }
}

@keyframes pavp-appearance-indicator-enter {
  from {
    transform: translateX(calc(var(--ui-space-content-gap) * -1));
  }

  to {
    transform: translateX(0);
  }
}

@keyframes pavp-appearance-indicator-enter-reduced {
  from {
    transform: translateX(calc(var(--ui-space-content-gap) / -4));
  }

  to {
    transform: translateX(0);
  }
}

@keyframes pavp-appearance-content-enter {
  from {
    transform: translateY(var(--ui-space-content-gap));
  }

  to {
    transform: translateY(0);
  }
}

@keyframes pavp-appearance-content-enter-reduced {
  from {
    transform: translateY(calc(var(--ui-space-content-gap) / 4));
  }

  to {
    transform: translateY(0);
  }
}

:global(html[data-motion='reduced']) .pavp-appearance-feedback__message {
  animation-name: pavp-setting-commit-reduced;
  animation-duration: calc(var(--ui-motion-duration) / 2);
}

:global(html[data-motion='none']) .pavp-appearance-feedback__message {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  :global(html[data-motion='full']) .pavp-appearance-feedback__message {
    animation-name: pavp-setting-commit-reduced;
    animation-duration: calc(var(--ui-motion-duration) / 2);
  }

  .pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__navigation-indicator,
  .pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__indicator {
    animation-name: pavp-appearance-indicator-enter-reduced;
    animation-duration: calc(var(--ui-motion-duration) / 2);
  }

  .pavp-appearance-preview[data-motion-preview='full'] .pavp-material-stage__content-entry,
  .pavp-appearance-preview[data-motion-preview='full'] .pavp-motion-stage__content {
    animation-name: pavp-appearance-content-enter-reduced;
    animation-duration: calc(var(--ui-motion-duration) / 2);
  }
}

@media (prefers-reduced-transparency: reduce) {
  .pavp-appearance-preview
    :where(
      .pavp-material-stage__header,
      .pavp-material-stage__navigation,
      .pavp-material-stage__floating
    ) {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .pavp-appearance-theme-swatches,
  .pavp-material-stage__canvas {
    border-style: solid;
  }

  .pavp-appearance-preview
    :where(
      .pavp-material-stage__header,
      .pavp-material-stage__navigation,
      .pavp-material-stage__floating
    ) {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
