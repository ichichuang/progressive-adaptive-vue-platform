<script setup lang="ts">
import { ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NProgress } from 'naive-ui/es/progress'
import { UiCopyAction, UiSection, useUiInteraction } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'

const { t } = useConsoleI18n()
const tapTarget = ref<HTMLElement | null>(null)
const holdTarget = ref<HTMLElement | null>(null)
const swipeTarget = ref<HTMLElement | null>(null)
const dragTarget = ref<HTMLElement | null>(null)
const taps = ref(0)
const held = ref(false)
const slide = ref(0)
const progress = ref(40)
let dragOrigin = 40
const tap = useUiInteraction(tapTarget, {
  onTap: () => {
    taps.value += 1
  },
})
const hold = useUiInteraction(holdTarget, {
  onLongPress: () => {
    held.value = !held.value
  },
})
function nextSlide(direction: number): void {
  slide.value = (slide.value + direction + 3) % 3
}
useUiInteraction(swipeTarget, {
  directions: ['left', 'right'],
  onSwipe: (direction) => {
    nextSlide(direction === 'left' ? 1 : -1)
  },
})
useUiInteraction(dragTarget, {
  onDrag: ({ delta }) => {
    const width = dragTarget.value?.getBoundingClientRect().width ?? 1
    progress.value = Math.round(Math.min(100, Math.max(0, dragOrigin + (delta.x / width) * 100)))
  },
  onDragEnd: () => {
    dragOrigin = progress.value
  },
  onCancel: () => {
    dragOrigin = progress.value
  },
})
function keyboardProgress(): void {
  progress.value = (progress.value + 10) % 110
  dragOrigin = progress.value
}
function reset(): void {
  taps.value = 0
  held.value = false
  slide.value = 0
  progress.value = 40
  dragOrigin = 40
}
</script>
<template>
  <NCard :bordered="false">
    <UiSection
      :title="t('interactionGestures.title')"
      :description="t('interactionGestures.hint')"
    >
      <div
        class="grid gap-content-gap layout-narrow:grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2"
      >
        <div class="rounded-control grid bg-surface-page gap-content-gap p-page-inline">
          <span class="font-title-weight text-text-primary">{{
            t('interactionGestures.tap')
          }}</span>
          <div ref="tapTarget">
            <NButton
              block
              size="large"
              :type="tap.phase.value === 'pressing' ? 'primary' : 'default'"
              @click="
                (event: MouseEvent) => {
                  if (event.detail === 0) taps += 1
                }
              "
            >
              {{ t('interactionGestures.tapAction') }} · {{ taps }}
            </NButton>
          </div>
        </div>
        <div class="rounded-control grid bg-surface-page gap-content-gap p-page-inline">
          <span class="font-title-weight text-text-primary">{{
            t('interactionGestures.hold')
          }}</span>
          <div
            ref="holdTarget"
            class="touch-pan-y"
          >
            <NButton
              block
              size="large"
              :type="held ? 'primary' : 'default'"
              :aria-pressed="held"
              @click="
                (event: MouseEvent) => {
                  if (event.detail === 0) held = !held
                }
              "
            >
              {{
                t(
                  hold.phase.value === 'pressing'
                    ? 'interactionGestures.holding'
                    : held
                      ? 'interactionGestures.selected'
                      : 'interactionGestures.holdAction',
                )
              }}
            </NButton>
          </div>
        </div>
        <div class="rounded-control grid bg-surface-page gap-content-gap p-page-inline">
          <span class="font-title-weight text-text-primary">{{
            t('interactionGestures.swipe')
          }}</span>
          <div
            ref="swipeTarget"
            class="touch-pan-y"
          >
            <NButton
              block
              size="large"
              type="primary"
              secondary
              @click="
                (event: MouseEvent) => {
                  if (event.detail === 0) nextSlide(1)
                }
              "
            >
              {{ t('interactionGestures.slide') }} {{ slide + 1 }} / 3
            </NButton>
          </div>
          <div class="flex justify-between gap-content-gap">
            <NButton
              secondary
              @click="nextSlide(-1)"
            >
              {{ t('interactionGestures.previous') }}
            </NButton>
            <NButton
              secondary
              @click="nextSlide(1)"
            >
              {{ t('interactionGestures.next') }}
            </NButton>
          </div>
        </div>
        <div class="rounded-control grid bg-surface-page gap-content-gap p-page-inline">
          <span class="font-title-weight text-text-primary">{{
            t('interactionGestures.drag')
          }}</span>
          <div
            ref="dragTarget"
            class="touch-pan-y"
          >
            <NButton
              block
              size="large"
              @click="
                (event: MouseEvent) => {
                  if (event.detail === 0) keyboardProgress()
                }
              "
            >
              {{ t('interactionGestures.dragAction') }} · {{ progress }}%
            </NButton>
          </div>
          <NProgress
            type="line"
            :percentage="progress"
            :show-indicator="false"
          />
          <span class="text-caption text-text-secondary">{{
            t('interactionGestures.keyboardHint')
          }}</span>
        </div>
      </div>
      <div class="flex flex-wrap justify-between gap-content-gap">
        <NButton @click="reset">
          {{ t('interactionGestures.reset') }}
        </NButton>
        <UiCopyAction
          variant="tertiary"
          value="useUiInteraction · tap / swipe / drag / longPress"
          :label="t('formShowcase.copyAI')"
          :copy-label="t('formShowcase.copyAI')"
          :success-label="t('workbench.copied')"
          :failure-label="t('workbench.copyFailed')"
        />
      </div>
    </UiSection>
  </NCard>
</template>
