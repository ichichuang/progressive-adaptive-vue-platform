<script setup lang="ts">
import { computed, ref, type ButtonHTMLAttributes, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NFlex } from 'naive-ui/es/flex'
import { NIcon } from 'naive-ui/es/icon'
import { NProgress } from 'naive-ui/es/progress'
import { NText } from 'naive-ui/es/typography'
import { useConsoleI18n } from '../../../shared/i18n'
import WorkbenchPage from '../WorkbenchPage.vue'

defineProps<{
  readonly title: string
  readonly message: string
  readonly variant:
    'admin' | 'admin-footer' | 'header' | 'header-footer' | 'content-footer' | 'content'
}>()
const { t } = useConsoleI18n()
const expanded = ref(false)
const selected = ref(1)
const modules = computed(() =>
  Array.from({ length: expanded.value ? 12 : 4 }, (_, index) => index + 1),
)
function setExpanded(value: boolean): void {
  expanded.value = value
  if (!value && selected.value > 4) selected.value = 1
}
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
    class="gap-content-gap"
  >
    <template #actions>
      <NFlex
        :size="8"
        v-bind="{ 'aria-label': t('layoutPreview.content') } satisfies HTMLAttributes"
      >
        <NButton
          :type="!expanded ? 'primary' : 'default'"
          v-bind="{ 'aria-pressed': !expanded } satisfies ButtonHTMLAttributes"
          @click="setExpanded(false)"
        >
          {{ t('layoutPreview.compact') }}
        </NButton>
        <NButton
          :type="expanded ? 'primary' : 'default'"
          v-bind="{ 'aria-pressed': expanded === true } satisfies ButtonHTMLAttributes"
          @click="setExpanded(true)"
        >
          {{ t('layoutPreview.expanded') }}
        </NButton>
      </NFlex>
    </template>
    <NFlex
      class="layout-preview-grid grid-cols-1 min-w-0 items-start layout-regular:grid-cols-3 layout-wide:grid-cols-3"
      v-bind="
        { role: 'region', 'aria-label': t('layoutPreview.workspace') } satisfies HTMLAttributes
      "
    >
      <NCard
        :bordered="false"
        class="min-w-0 bg-surface-panel layout-regular:order-last layout-wide:order-last"
        content-class="flex flex-col gap-content-gap"
      >
        <NText
          tag="h2"
          strong
          class="font-title-weight m-0 text-subheading text-text-primary"
        >
          {{ t('layoutPreview.detail') }}
        </NText>
        <NFlex
          vertical
          :size="4"
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
      </NCard>
      <NFlex
        vertical
        :size="12"
        class="min-w-0 layout-regular:col-span-2 layout-wide:col-span-2"
        v-bind="
          { role: 'region', 'aria-label': t('layoutPreview.modules') } satisfies HTMLAttributes
        "
      >
        <NText
          tag="h2"
          strong
          class="font-title-weight m-0 text-subheading text-text-primary"
        >
          {{ t('layoutPreview.modules') }}
        </NText>
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
      </NFlex>
    </NFlex>
  </WorkbenchPage>
</template>

<style scoped>
.layout-preview-grid,
.layout-preview-modules {
  display: grid !important;
  gap: var(--ui-space-content-gap) !important;
}
</style>
