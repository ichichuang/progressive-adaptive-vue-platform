<script setup lang="ts">
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NFlex } from 'naive-ui/es/flex'
import { NIcon } from 'naive-ui/es/icon'
import { NProgress } from 'naive-ui/es/progress'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NText } from 'naive-ui/es/typography'
import { useConsoleI18n } from '../../../shared/i18n'
import WorkbenchPage from '../WorkbenchPage.vue'
import WorkbenchSection from '../WorkbenchSection.vue'

defineProps<{
  readonly title: string
  readonly message: string
  readonly variant:
    'admin' | 'admin-footer' | 'header' | 'header-footer' | 'content-footer' | 'content'
}>()
const { t } = useConsoleI18n()
const contentGroupName = `layout-preview-content-${useId()}`
const active = ref(true)
const registerScroll = inject(routerScrollControllerKey)
let unregisterScroll: (() => void) | undefined
function connectScroll(controller: UiScrollController | null): void {
  unregisterScroll?.()
  unregisterScroll = controller === null ? undefined : registerScroll?.(controller)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  connectScroll(null)
})
onScopeDispose(() => {
  connectScroll(null)
})
const expanded = ref(false)
const selected = ref(1)
const modules = computed(() =>
  Array.from({ length: expanded.value ? 12 : 4 }, (_, index) => index + 1),
)
function setExpanded(value: string | number | boolean): void {
  if (typeof value !== 'boolean') return
  expanded.value = value
  if (!value && selected.value > 4) selected.value = 1
}
</script>

<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    :data-variant="variant"
    class="gap-content-gap"
  >
    <template #actions>
      <NRadioGroup
        :name="contentGroupName"
        :value="expanded"
        v-bind="
          {
            role: 'radiogroup',
            'aria-label': t('layoutPreview.content'),
          } satisfies HTMLAttributes
        "
        @update:value="setExpanded"
      >
        <NRadioButton :value="false">
          {{ t('layoutPreview.compact') }}
        </NRadioButton>
        <NRadioButton :value="true">
          {{ t('layoutPreview.expanded') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="connectScroll"
    >
      <NFlex
        class="layout-preview-grid grid-cols-1 min-w-0 items-start layout-regular:grid-cols-3 layout-wide:grid-cols-3"
        v-bind="
          {
            role: 'region',
            'aria-label': t('layoutPreview.workspace'),
          } satisfies HTMLAttributes
        "
      >
        <WorkbenchSection :title="t('layoutPreview.detail')">
          <NFlex
            vertical
            :size="4"
            class="rounded-control bg-surface-page p-panel-narrow"
            v-bind="{ 'aria-live': 'polite', 'aria-atomic': 'true' } satisfies HTMLAttributes"
          >
            <NText depth="3">
              {{ t('layoutPreview.selected') }}
            </NText>
            <NText
              strong
              class="leading-title font-title-weight text-control-primary text-title"
            >
              {{ t('layoutPreview.moduleTitle') }} {{ selected }}
            </NText>
          </NFlex>
          <NFlex
            vertical
            :size="8"
          >
            <NText depth="3">
              {{ t('layoutPreview.progress') }}
            </NText>
            <NProgress
              type="line"
              :percentage="Math.min(100, 24 + selected * 6)"
              :show-indicator="true"
              v-bind="{ 'aria-label': t('layoutPreview.progress') } satisfies HTMLAttributes"
            />
          </NFlex>
        </WorkbenchSection>
        <WorkbenchSection
          class="layout-regular:col-span-2 layout-wide:col-span-2"
          :title="t('layoutPreview.modules')"
        >
          <NFlex
            class="layout-preview-modules grid-cols-1 min-w-0 layout-regular:grid-cols-2 layout-wide:grid-cols-2"
          >
            <NButton
              v-for="id in modules"
              :key="id"
              class="min-h-target-enhanced"
              :type="selected === id ? 'primary' : 'default'"
              :secondary="selected === id"
              v-bind="{ 'aria-pressed': selected === id } satisfies ButtonHTMLAttributes"
              @click="selected = id"
            >
              <template #icon>
                <NIcon
                  v-bind="{ 'aria-hidden': 'true' } satisfies HTMLAttributes"
                  class="i-lucide-panels-top-left"
                />
              </template>
              {{ t('layoutPreview.moduleTitle') }} {{ id }}
            </NButton>
          </NFlex>
        </WorkbenchSection>
      </NFlex>
    </UiScrollArea>
  </WorkbenchPage>
</template>

<style scoped>
.layout-preview-grid,
.layout-preview-modules {
  display: grid !important;
  gap: var(--ui-space-content-gap) !important;
}
</style>
