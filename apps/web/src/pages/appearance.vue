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

import { useAppearanceMutationBoundary } from '../app/appearance/appearance-mutation-boundary'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'

defineOptions({ name: 'AppearanceManagementPage' })

defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

type FeedbackMessage = '设置已保存' | '无法应用此设置，已恢复原状态' | '已恢复默认设置'

interface DisplayThemePreview extends AppearanceThemePreviewProjection {
  readonly displayLabel: string
}

const materialStageTitle = '材质效果'
const materialStageSummary = '功能区域使用当前材质，内容区域保持稳定清晰。'
const motionStageTitle = '动效效果'
const colorModeOptions = Object.freeze([
  Object.freeze({ label: '跟随系统', value: colorModePreferenceSchema.parse('system') }),
  Object.freeze({ label: '浅色', value: colorModePreferenceSchema.parse('light') }),
  Object.freeze({ label: '深色', value: colorModePreferenceSchema.parse('dark') }),
] as const satisfies readonly UiSegmentedOption[])
const contrastOptions = Object.freeze([
  Object.freeze({ label: '标准', value: contrastPreferenceSchema.parse('standard') }),
  Object.freeze({ label: '增强', value: contrastPreferenceSchema.parse('enhanced') }),
] as const satisfies readonly UiSegmentedOption[])
const materialOptions = Object.freeze([
  Object.freeze({ label: '自适应', value: materialPreferenceSchema.parse('adaptive') }),
  Object.freeze({ label: '弱化', value: materialPreferenceSchema.parse('reduced') }),
  Object.freeze({ label: '纯色', value: materialPreferenceSchema.parse('solid') }),
] as const satisfies readonly UiSegmentedOption[])
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
const motionOptions = Object.freeze([
  Object.freeze({ label: '完整', value: motionPreferenceSchema.parse('full') }),
  Object.freeze({ label: '减少', value: motionPreferenceSchema.parse('reduced') }),
  Object.freeze({ label: '关闭', value: motionPreferenceSchema.parse('none') }),
] as const satisfies readonly UiSegmentedOption[])
const previewViewOptions = Object.freeze([
  Object.freeze({ label: '概览', value: 'overview' }),
  Object.freeze({ label: '详情', value: 'details' }),
] as const satisfies readonly UiSegmentedOption[])

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
  announceFeedback('无法应用此设置，已恢复原状态')
}

function commitCandidate(
  candidate: ExplicitThemePreference,
  successMessage: Extract<FeedbackMessage, '设置已保存' | '已恢复默认设置'>,
): void {
  const result = mutation.commitPreference(candidate)
  announceFeedback(result.status === 'committed' ? successMessage : '无法应用此设置，已恢复原状态')
}

function commitAxis(update: (candidate: ExplicitThemePreference) => void): void {
  const candidate = currentPreferenceCandidate()

  if (candidate === null) {
    announceRejectedMutation()
    return
  }

  update(candidate)
  commitCandidate(candidate, '设置已保存')
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
  commitCandidate(candidate, '已恢复默认设置')
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
  return effective.snapshot.value.colorMode === 'light' ? '浅色' : '深色'
}

function effectiveContrastLabel(): string {
  return effective.snapshot.value.contrast === 'standard' ? '标准' : '增强'
}

function effectiveMaterialLabel(): string {
  switch (effective.snapshot.value.material) {
    case 'adaptive':
      return '自适应'
    case 'reduced':
      return '弱化'
    case 'solid':
      return '纯色'
  }
}

function effectiveMotionLabel(): string {
  switch (effective.snapshot.value.motion) {
    case 'full':
      return '完整'
    case 'reduced':
      return '减少'
    case 'none':
      return '关闭'
  }
}

const currentThemeLabel = computed(
  () =>
    themePreviews.value.find((theme) =>
      referencesEqual(theme.reference, effective.snapshot.value.theme),
    )?.displayLabel ?? '当前主题',
)
const currentPlaneLabel = computed(
  () => `${effectiveColorModeLabel()} · ${effectiveContrastLabel()}`,
)
const previewDescriptionItems = computed<readonly UiDescriptionItem[]>(() => [
  { label: '主题', value: currentThemeLabel.value },
  { label: '显示', value: currentPlaneLabel.value },
  { label: '材质', value: effectiveMaterialLabel() },
  {
    label: '字号',
    value: `${String(Math.round(effective.snapshot.value.fontScale * 100))}%`,
  },
  { label: '动效', value: effectiveMotionLabel() },
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
    description="从十四套内置主题中选择界面基调，色板会随明暗模式与对比度即时投影。"
    title="主题画廊"
  >
    <div class="pavp-appearance-theme-toolbar">
      <div class="pavp-appearance-theme-toolbar__summary">
        <span class="pavp-appearance-eyebrow">当前主题</span>
        <strong>{{ currentThemeLabel }}</strong>
      </div>
      <div class="pavp-appearance-theme-toolbar__meta">
        <span class="text-text-secondary">选择后即时应用</span>
        <UiStatusBadge
          :label="currentPlaneLabel"
          tone="active"
        />
      </div>
    </div>
    <div
      aria-label="主题色板角色"
      class="pavp-appearance-theme-legend text-text-secondary"
    >
      <span>页面</span>
      <span>面板</span>
      <span>操作填充</span>
      <span>控件前景</span>
      <span>边框</span>
      <span>焦点</span>
    </div>

    <UiRadioCardGroup
      accessible-label="选择主题"
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
              label="当前主题"
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
            {{ themePreviewForValue(option.value).registryKind === 'built-in' ? '内置' : '项目' }}
          </span>
          <span>{{ currentPlaneLabel }}</span>
        </span>
      </template>
    </UiRadioCardGroup>
  </UiSection>

  <div class="pavp-appearance-workspace">
    <div class="pavp-appearance-controls">
      <UiSection
        description="调整任一选项后，实时预览与实际界面会同步更新。"
        title="显示偏好"
      >
        <div
          class="pavp-appearance-control"
          data-appearance-axis="color-mode"
        >
          <span class="pavp-appearance-control__copy">
            <strong>颜色模式</strong>
            <span class="text-text-secondary">跟随环境，或固定界面的明暗表现。</span>
          </span>
          <UiSegmentedControl
            accessible-label="颜色模式"
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
            <strong>对比度</strong>
            <span class="text-text-secondary">增强文字、边框与交互状态的区分。</span>
          </span>
          <UiSegmentedControl
            accessible-label="对比度"
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
            <strong>材质</strong>
            <span class="text-text-secondary">调整功能区域的通透感与表面层次。</span>
          </span>
          <UiSegmentedControl
            accessible-label="材质"
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
            <strong>字号</strong>
            <span class="text-text-secondary">同步调整界面文字的阅读尺寸。</span>
          </span>
          <UiSegmentedControl
            accessible-label="字号"
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
            <strong>动效</strong>
            <span class="text-text-secondary">控制反馈节奏，并尊重系统减少动态效果设置。</span>
          </span>
          <UiSegmentedControl
            accessible-label="动效"
            :model-value="preference?.appearance.motion ?? ''"
            :options="motionOptions"
            @update:model-value="updateMotion"
          />
        </div>

        <div class="pavp-appearance-actions">
          <UiButton
            variant="ghost"
            @press="resetVisibleAppearanceAxes"
          >
            恢复默认设置
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
            {{ feedbackMessage }}
          </span>
        </div>
      </UiSection>
    </div>

    <aside class="pavp-appearance-preview-column">
      <UiSection
        description="这里使用当前真实外观快照与已启用的 PAVP 界面组件。"
        title="实时预览"
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
                :label="`当前：${effectiveMaterialLabel()}`"
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
                    <strong>外观工作区</strong>
                  </span>
                  <UiStatusBadge
                    label="实时同步"
                    tone="complete"
                  />
                </header>

                <div class="pavp-material-stage__body">
                  <nav
                    aria-label="界面预览导航"
                    class="pavp-material-stage__navigation"
                    :data-preview-view="previewView"
                  >
                    <UiSegmentedControl
                      accessible-label="预览内容切换"
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
                      <h4>{{ previewView === 'overview' ? '界面概览' : '组件详情' }}</h4>
                      <p class="text-text-primary">
                        主要文字会随主题、明暗模式、对比度与字号同步变化。
                      </p>
                      <p class="text-text-secondary">
                        次要文字继续保持清晰层级，并使用同一套设计令牌。
                      </p>
                    </div>

                    <UiDescriptionList :items="previewDescriptionItems" />

                    <div class="pavp-material-stage__actions">
                      <UiButton
                        variant="primary"
                        @press="replayMotion"
                      >
                        运行示例
                      </UiButton>
                      <UiButton
                        class="pavp-material-stage__focus-example"
                        variant="secondary"
                        @press="replayMotion"
                      >
                        键盘焦点示例
                      </UiButton>
                    </div>
                  </div>

                  <aside
                    aria-label="浮层示例"
                    class="pavp-material-stage__floating"
                  >
                    <strong>快捷操作</strong>
                    <span class="text-text-secondary">浮层同样使用当前材质投影。</span>
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
                  导航指示、内容进入与按钮交互会按当前动效偏好运行。
                </p>
              </div>
              <UiButton
                variant="secondary"
                @press="replayMotion"
              >
                重新播放动效
              </UiButton>
            </div>
            <div
              :key="`motion-${String(motionSequence)}`"
              class="pavp-motion-stage__demo"
            >
              <span class="pavp-motion-stage__indicator">已选导航</span>
              <span class="pavp-motion-stage__content text-text-secondary">内容已进入</span>
              <UiButton
                variant="ghost"
                @press="replayMotion"
              >
                交互按钮
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
