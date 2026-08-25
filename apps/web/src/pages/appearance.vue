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

const themeGroupLabel = '选择主题'
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

function referencesEqual(left: ThemeReference, right: ThemeReference): boolean {
  return left.registryKind === right.registryKind && left.themeId === right.themeId
}

function isThemeSelected(theme: AppearanceThemePreviewProjection): boolean {
  return (
    preference.value !== null && referencesEqual(preference.value.appearance.theme, theme.reference)
  )
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
    description="七套内置主题会按当前明暗模式与对比度即时投影。"
    title="主题画廊"
  >
    <fieldset
      aria-labelledby="pavp-appearance-theme-legend"
      class="pavp-appearance-theme-fieldset"
      data-appearance-axis="theme"
    >
      <legend
        id="pavp-appearance-theme-legend"
        class="pavp-appearance-theme-legend"
      >
        {{ themeGroupLabel }}
      </legend>
      <div class="pavp-appearance-theme-gallery">
        <label
          v-for="(theme, themeIndex) in themePreviews"
          :key="`${theme.registryKind}:${theme.themeId}`"
          class="pavp-appearance-theme-option min-h-target-enhanced"
          :data-selected="isThemeSelected(theme)"
          :for="`appearance-theme-${String(themeIndex)}`"
        >
          <span class="pavp-appearance-theme-option__heading">
            <span class="pavp-appearance-theme-option__identity">
              <!-- prettier-ignore -->
              <input
                :id="`appearance-theme-${String(themeIndex)}`"
                :checked="isThemeSelected(theme)"
                name="appearance-theme"
                type="radio"
                :value="`${theme.registryKind}:${theme.themeId}`"
                @change="updateTheme(theme.reference)"
              >
              <strong>{{ theme.displayLabel }}</strong>
            </span>
            <span
              v-if="isThemeSelected(theme)"
              class="pavp-appearance-theme-option__selected"
            >
              已选
            </span>
          </span>
          <span
            aria-hidden="true"
            class="pavp-appearance-theme-swatches"
          >
            <span
              class="pavp-appearance-theme-swatch"
              :style="{ ['--pavp-appearance-swatch']: currentSwatches(theme).surfacePage }"
            />
            <span
              class="pavp-appearance-theme-swatch"
              :style="{ ['--pavp-appearance-swatch']: currentSwatches(theme).surfacePanel }"
            />
            <span
              class="pavp-appearance-theme-swatch"
              :style="{ ['--pavp-appearance-swatch']: currentSwatches(theme).actionPrimary }"
            />
            <span
              class="pavp-appearance-theme-swatch"
              :style="{ ['--pavp-appearance-swatch']: currentSwatches(theme).borderDefault }"
            />
            <span
              class="pavp-appearance-theme-swatch"
              :style="{ ['--pavp-appearance-swatch']: currentSwatches(theme).focusRing }"
            />
          </span>
          <span class="text-text-secondary">{{ currentPlaneLabel }}</span>
        </label>
      </div>
    </fieldset>
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
          <strong>颜色模式</strong>
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
          <strong>对比度</strong>
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
          <strong>材质</strong>
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
          <strong>字号</strong>
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
          <strong>动效</strong>
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
                  <span class="pavp-material-stage__mark">PAVP</span>
                  <strong>外观工作区</strong>
                  <UiStatusBadge
                    label="实时同步"
                    tone="complete"
                  />
                </header>

                <div class="pavp-material-stage__body">
                  <nav
                    aria-label="界面预览导航"
                    class="pavp-material-stage__navigation"
                  >
                    <button
                      :aria-current="previewView === 'overview' ? 'page' : undefined"
                      class="pavp-material-stage__navigation-item min-h-target-enhanced min-w-target-enhanced"
                      type="button"
                      @click="previewView = 'overview'"
                    >
                      <span
                        v-if="previewView === 'overview'"
                        :key="`overview-${String(motionSequence)}`"
                        aria-hidden="true"
                        class="pavp-material-stage__navigation-indicator"
                      />
                      概览
                    </button>
                    <button
                      :aria-current="previewView === 'details' ? 'page' : undefined"
                      class="pavp-material-stage__navigation-item min-h-target-enhanced min-w-target-enhanced"
                      type="button"
                      @click="previewView = 'details'"
                    >
                      <span
                        v-if="previewView === 'details'"
                        :key="`details-${String(motionSequence)}`"
                        aria-hidden="true"
                        class="pavp-material-stage__navigation-indicator"
                      />
                      组件
                    </button>
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

                    <UiSegmentedControl
                      accessible-label="预览内容切换"
                      :model-value="previewView"
                      :options="previewViewOptions"
                      @update:model-value="updatePreviewView"
                    />

                    <div class="pavp-material-stage__actions">
                      <UiButton
                        variant="primary"
                        @press="replayMotion"
                      >
                        运行示例
                      </UiButton>
                      <button
                        class="pavp-material-stage__focus-example min-h-target-enhanced min-w-target-enhanced"
                        type="button"
                        @click="replayMotion"
                      >
                        键盘焦点示例
                      </button>
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
.pavp-appearance-theme-fieldset {
  min-inline-size: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.pavp-appearance-theme-legend {
  margin-block-end: var(--ui-space-content-gap);
  color: var(--ui-color-text-secondary);
}

.pavp-appearance-theme-gallery {
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(min(100%, var(--ui-layout-admin-content-minimum-inline-size)), 1fr)
  );
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-theme-option {
  display: grid;
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
  padding: var(--ui-space-page-inline);
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-surface-panel);
  cursor: pointer;
}

.pavp-appearance-theme-option[data-selected='true'] {
  box-shadow: var(--ui-shadow-panel);
}

.pavp-appearance-theme-option:has(input:focus-visible) {
  outline-color: var(--ui-color-focus-ring);
  outline-style: solid;
}

.pavp-appearance-theme-option__heading,
.pavp-appearance-theme-option__identity,
.pavp-appearance-actions,
.pavp-appearance-stage-heading,
.pavp-material-stage__header,
.pavp-material-stage__actions,
.pavp-motion-stage__demo {
  display: flex;
  align-items: center;
  gap: var(--ui-space-content-gap);
}

.pavp-appearance-theme-option__heading,
.pavp-appearance-stage-heading,
.pavp-material-stage__header {
  justify-content: space-between;
}

.pavp-appearance-theme-option__selected {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-appearance-theme-swatches {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  overflow: hidden;
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-radius: var(--ui-radius-panel);
}

.pavp-appearance-theme-swatch {
  block-size: var(--ui-control-height);
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

.pavp-appearance-actions,
.pavp-material-stage__actions,
.pavp-motion-stage__demo {
  flex-wrap: wrap;
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
  box-shadow: var(--ui-shadow-panel);
}

.pavp-appearance-feedback[data-feedback-phase='even'] {
  box-shadow: none;
}

.pavp-appearance-feedback__message {
  animation: pavp-setting-commit var(--ui-motion-duration) var(--ui-motion-easing) both;
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
  pointer-events: none;
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

.pavp-material-stage__mark {
  color: var(--ui-color-text-primary);
  font-weight: var(--ui-font-weight-title);
}

.pavp-material-stage__body {
  grid-template-columns: var(--ui-layout-admin-sidebar-rail-inline-size) minmax(0, 1fr);
}

.pavp-material-stage__navigation {
  align-content: start;
  display: grid;
  min-inline-size: 0;
  gap: var(--ui-space-content-gap);
}

.pavp-material-stage__navigation-item,
.pavp-material-stage__focus-example {
  position: relative;
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-radius: var(--ui-radius-panel);
  color: var(--ui-color-text-primary);
  background: var(--ui-color-surface-panel);
  cursor: pointer;
}

.pavp-material-stage__navigation-item[aria-current='page'] {
  background: var(--ui-material-overlay-background);
  box-shadow: var(--ui-shadow-panel);
}

.pavp-material-stage__navigation-item:focus-visible,
.pavp-material-stage__focus-example:focus-visible {
  outline-color: var(--ui-color-focus-ring);
  outline-style: solid;
}

.pavp-material-stage__navigation-indicator {
  position: absolute;
  block-size: calc(100% - var(--ui-space-content-gap));
  inline-size: calc(var(--ui-space-content-gap) / 2);
  border-radius: var(--ui-radius-panel);
  background: var(--ui-color-action-primary);
  inset-block-start: calc(var(--ui-space-content-gap) / 2);
  inset-inline-start: 0;
}

.pavp-material-stage__content {
  padding: var(--ui-space-page-inline);
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
  justify-self: end;
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
    .pavp-material-stage__navigation-item[aria-current='page'],
    .pavp-material-stage__floating
  ) {
  -webkit-backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
  backdrop-filter: blur(var(--ui-admin-optical-backdrop-blur));
}

.pavp-appearance-preview[data-material-preview='reduced']
  :where(
    .pavp-material-stage__header,
    .pavp-material-stage__navigation,
    .pavp-material-stage__navigation-item[aria-current='page'],
    .pavp-material-stage__floating
  ),
.pavp-appearance-preview[data-material-preview='solid']
  :where(
    .pavp-material-stage__header,
    .pavp-material-stage__navigation,
    .pavp-material-stage__navigation-item[aria-current='page'],
    .pavp-material-stage__floating
  ) {
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: none;
}

.pavp-motion-stage {
  padding-block-start: var(--ui-space-section-block);
  border-block-start-color: var(--ui-color-border-default);
  border-block-start-style: solid;
}

.pavp-motion-stage__demo {
  justify-content: space-between;
  padding: var(--ui-space-page-inline);
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

:global(.pavp-admin-shell[data-layout-profile='regular']) .pavp-appearance-preview-column,
:global(.pavp-admin-shell[data-layout-profile='wide']) .pavp-appearance-preview-column {
  position: sticky;
  inset-block-start: var(--ui-space-section-block);
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
      .pavp-material-stage__navigation-item[aria-current='page'],
      .pavp-material-stage__floating
    ) {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

@media (forced-colors: active) {
  .pavp-appearance-theme-option,
  .pavp-appearance-theme-swatches,
  .pavp-material-stage__canvas,
  .pavp-material-stage__navigation-item,
  .pavp-material-stage__focus-example {
    border-style: solid;
  }

  .pavp-appearance-preview
    :where(
      .pavp-material-stage__header,
      .pavp-material-stage__navigation,
      .pavp-material-stage__navigation-item[aria-current='page'],
      .pavp-material-stage__floating
    ) {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
</style>
