<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NSwitch } from 'naive-ui/es/switch'
import { UiScrollArea, UiSection, UiRadioCardGroup, type UiScrollController } from '@platform/ui'
import { tokenNames } from '@platform/design-system'
import { useConsoleI18n } from '../shared/i18n'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import TokenGallery from '../app/workbench/TokenGallery.vue'
defineOptions({ name: 'WorkbenchInteractionsPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const enabled = ref(true)
const selected = ref('primary')
const options = computed(() => [
  { value: 'primary', label: t('workbench.primary') },
  { value: 'success', label: t('workbench.success') },
  { value: 'warning', label: t('workbench.warning') },
])
const motionCopy = {
  full: 'workbench.motion.full',
  reduced: 'workbench.motion.reduced',
  none: 'workbench.motion.none',
} as const
const replayed = ref(false)
const scroll = shallowRef<UiScrollController | null>(null)
function connect(controller: UiScrollController | null): void {
  scroll.value = controller
}
const names = tokenNames.filter(
  (name) =>
    name.startsWith('interaction.motion.') ||
    name === 'interaction.shadow.panel' ||
    name.startsWith('layout.z.'),
)
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <section
      class="wb-interaction-grid grid gap-content-gap layout-narrow:grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2"
    >
      <NCard
        class="col-span-full"
        :bordered="false"
      >
        <UiSection
          :title="t('workbench.states')"
          :description="t('workbench.statesHint')"
        >
          <div
            class="grid gap-content-gap layout-narrow:grid-cols-1 layout-regular:grid-cols-2 layout-wide:grid-cols-2"
          >
            <div
              class="rounded-control grid content-start bg-surface-page gap-content-gap p-page-inline"
            >
              <div class="wb-control-examples flex flex-wrap items-center gap-content-gap">
                <NButton type="primary">
                  {{ t('workbench.primary') }}
                </NButton>
                <NButton type="info">
                  {{ t('workbench.info') }}
                </NButton>
                <NButton type="success">
                  {{ t('workbench.success') }}
                </NButton>
                <NButton type="warning">
                  {{ t('workbench.warning') }}
                </NButton>
                <NButton type="error">
                  {{ t('workbench.error') }}
                </NButton>
                <NButton disabled>
                  {{ t('workbench.disabled') }}
                </NButton>
              </div>
              <div class="flex items-center justify-between gap-content-gap text-text-secondary">
                <span>{{ t('workbench.switchLabel') }}</span>
                <div class="flex items-center gap-content-gap">
                  <span class="text-caption">{{
                    t(enabled ? 'showcase.on' : 'showcase.off')
                  }}</span>
                  <NSwitch
                    :value="enabled"
                    :aria-label="t('workbench.toggle')"
                    @update:value="enabled = $event"
                  />
                </div>
              </div>
            </div>
            <div
              class="rounded-control grid content-start bg-surface-page gap-content-gap p-page-inline"
            >
              <span class="text-text-secondary">{{ t('workbench.choiceLabel') }}</span>
              <UiRadioCardGroup
                class="layout-regular:grid-cols-2 layout-wide:grid-cols-2"
                :accessible-label="t('workbench.choice')"
                :options="options"
                :model-value="selected"
                @update:model-value="selected = $event"
              />
            </div>
          </div>
        </UiSection>
      </NCard>
      <NCard :bordered="false">
        <UiSection
          :title="t('workbench.motionLabel')"
          :description="t('workbench.motionHint')"
        >
          <div
            class="wb-motion-stage rounded-control grid items-center overflow-hidden bg-surface-page p-page-inline"
            :data-replayed="replayed"
          >
            <span
              class="wb-motion-object rounded-control w-min block bg-action-primary min-h-target-enhanced min-w-target-enhanced"
            />
          </div>
          <div class="wb-page-actions flex flex-wrap items-center justify-between gap-content-gap">
            <NButton @click="replayed = !replayed">
              {{ t('workbench.replay') }}
            </NButton>
            <span class="text-text-secondary">
              {{ t(motionCopy[appearance.snapshot.value.motion]) }}
            </span>
          </div>
        </UiSection>
      </NCard>
      <NCard :bordered="false">
        <UiSection
          :title="t('workbench.scroll')"
          :description="t('workbench.scrollHint')"
        >
          <div class="wb-scroll-example">
            <UiScrollArea
              class="rounded-control bg-surface-page"
              owner-id="workbench-scroll-specimen"
              @controller="connect"
            >
              <div
                v-for="row in 12"
                :key="row"
                class="wb-scroll-row flex justify-between gap-content-gap min-h-target-enhanced p-page-inline text-text-secondary"
              >
                {{ t('workbench.scrollRow') }} {{ String(row).padStart(2, '0') }}
                <span
                  class="text-control-primary"
                  aria-hidden="true"
                >
                  ↗
                </span>
              </div>
            </UiScrollArea>
          </div>
          <div class="wb-page-actions flex flex-wrap items-center justify-between gap-content-gap">
            <NButton @click="scroll?.scrollToStart({ behavior: 'smooth' })">
              {{ t('workbench.toStart') }}
            </NButton>
            <NButton @click="scroll?.scrollToEnd({ behavior: 'smooth' })">
              {{ t('workbench.toEnd') }}
            </NButton>
          </div>
        </UiSection>
      </NCard>
    </section>
    <TokenGallery
      :names="names"
      :label="t('workbench.interactions')"
    />
  </WorkbenchPage>
</template>
