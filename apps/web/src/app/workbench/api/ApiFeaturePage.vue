<script setup lang="ts">
import { computed } from 'vue'
import { UiCopyAction } from '@platform/ui'
import { NTag } from 'naive-ui/es/tag'
import WorkbenchPage from '../WorkbenchPage.vue'
import { useConsoleI18n } from '../../../shared/i18n'
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly capability: 'query' | 'integration' | 'advanced'
}>()
defineSlots<{ default: () => unknown }>()
const { t } = useConsoleI18n()
const feature = computed(
  () =>
    (
      ({
        query: {
          hint: 'apiShowcase.queryHint',
          source: 'apiShowcase.querySource',
          entry: 'createApiQueryRuntime · apps/web/src/shared/query/index.ts',
          component: 'ApiQueryDemo',
        },
        integration: {
          hint: 'apiShowcase.integrationHint',
          source: 'apiShowcase.integrationSource',
          entry: 'UiForm / UiTable / createTableHttpTransport · apps/web/src/shared/table/index.ts',
          component: 'ApiIntegrationDemo',
        },
        advanced: {
          hint: 'apiShowcase.advanced.hint',
          source: 'apiShowcase.local',
          entry: 'createApiClient · apps/web/src/shared/api/index.ts',
          component: 'ApiAdvancedDemo',
        },
      }) as const
    )[props.capability],
)
const copy = computed(() =>
  [
    t('apiShowcase.copyIntro'),
    props.title,
    t(feature.value.hint),
    t('apiShowcase.copyBoundary'),
    feature.value.entry,
    `apps/web/src/app/workbench/api/${feature.value.component}.vue`,
  ].join('\n\n'),
)
</script>
<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copy"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <div class="shrink-0">
      <NTag
        size="small"
        :bordered="false"
      >
        {{ t(feature.source) }}
      </NTag>
    </div>
    <slot />
  </WorkbenchPage>
</template>
