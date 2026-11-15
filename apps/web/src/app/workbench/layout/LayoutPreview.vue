<script setup lang="ts">
import { computed, ref, type ButtonHTMLAttributes, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NProgress } from 'naive-ui/es/progress'
import { NTag } from 'naive-ui/es/tag'
import { useConsoleI18n } from '../../../shared/i18n'
import WorkbenchPage from '../WorkbenchPage.vue'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly variant:
    'admin' | 'admin-footer' | 'header' | 'header-footer' | 'content-footer' | 'content'
}>()
const { t } = useConsoleI18n()
const expanded = ref(false)
const selected = ref(1)
const regions = computed(() => [
  ...(props.variant.startsWith('admin') ? (['layoutPreview.navigation'] as const) : []),
  ...(props.variant.startsWith('admin') || props.variant.startsWith('header')
    ? (['layoutPreview.header'] as const)
    : []),
  'layoutPreview.content' as const,
  ...(props.variant.endsWith('footer') ? (['layoutPreview.footer'] as const) : []),
])
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
  >
    <template #actions>
      <div
        class="flex flex-wrap gap-component-unit"
        :aria-label="t('layoutPreview.content')"
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
      </div>
    </template>
    <section
      class="grid min-w-0 gap-content-gap"
      :aria-label="t('layoutPreview.workspace')"
    >
      <NCard
        :bordered="false"
        content-class="flex flex-wrap items-center justify-between gap-content-gap"
      >
        <div class="grid min-w-0 gap-component-unit">
          <span class="text-caption text-text-secondary">{{ t('layoutPreview.regions') }}</span>
          <div class="flex flex-wrap items-center gap-component-unit">
            <NTag
              v-for="region in regions"
              :key="region"
              type="primary"
              :bordered="false"
            >
              {{ t(region) }}
            </NTag>
          </div>
        </div>
        <p class="m-0 text-caption text-text-secondary">
          {{ t('layoutPreview.responsive') }}
        </p>
      </NCard>
      <div class="grid grid-cols-1 min-w-0 items-start gap-content-gap layout-wide:grid-cols-3">
        <section
          class="grid min-w-0 gap-content-gap layout-wide:col-span-2"
          :aria-label="t('layoutPreview.modules')"
        >
          <div class="flex items-center justify-between gap-content-gap">
            <h2 class="font-title-weight m-0 text-subheading text-text-primary">
              {{ t('layoutPreview.modules') }}
            </h2>
            <NTag
              :bordered="false"
              size="small"
            >
              {{ modules.length }}
            </NTag>
          </div>
          <div
            class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
          >
            <NCard
              v-for="id in modules"
              :key="id"
              :bordered="false"
              content-class="grid min-w-0 gap-content-gap"
            >
              <div class="flex items-center justify-between gap-content-gap">
                <span class="font-title-weight text-subheading text-text-primary">{{
                  String(id).padStart(2, '0')
                }}</span>
                <span
                  aria-hidden="true"
                  class="i-lucide-panels-top-left size-icon-large text-control-primary"
                />
              </div>
              <NButton
                :type="selected === id ? 'primary' : 'default'"
                :secondary="selected === id"
                v-bind="{ 'aria-pressed': selected === id } satisfies ButtonHTMLAttributes"
                @click="selected = id"
              >
                {{ t('layoutPreview.moduleTitle') }} {{ id }}
              </NButton>
            </NCard>
          </div>
        </section>
        <NCard
          :title="t('layoutPreview.detail')"
          :bordered="false"
          content-class="grid min-w-0 gap-content-gap"
        >
          <NTag
            type="info"
            :bordered="false"
          >
            {{ t('layoutPreview.sampleLabel') }}
          </NTag>
          <div
            class="grid gap-component-unit"
            aria-live="polite"
            aria-atomic="true"
          >
            <span class="text-caption text-text-secondary">{{ t('layoutPreview.selected') }}</span>
            <strong
              class="font-title-weight text-text-primary text-title"
              v-text="`${t('layoutPreview.moduleTitle')} ${selected}`"
            />
          </div>
          <div class="grid gap-component-unit">
            <span class="text-caption text-text-secondary">{{ t('layoutPreview.progress') }}</span>
            <NProgress
              type="line"
              :percentage="Math.min(100, 24 + selected * 6)"
              :show-indicator="true"
              v-bind="{ 'aria-label': t('layoutPreview.progress') } satisfies HTMLAttributes"
            />
          </div>
        </NCard>
      </div>
    </section>
  </WorkbenchPage>
</template>
