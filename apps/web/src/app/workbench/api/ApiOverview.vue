<script setup lang="ts">
import { computed } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NTag } from 'naive-ui/es/tag'
import { UiCopyAction } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import { apiShowcasePages } from './api-showcase'
import { useConsoleI18n } from '../../../shared/i18n'
import { getRouteRecord } from '../../router/route-registry'
import { registeredRouteDestination } from '../../router/route-input'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../../router/application-navigation'

defineProps<{ readonly title: string; readonly message: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const sections = computed(() =>
  apiShowcasePages.map((page) => ({
    ...page,
    title: t(getRouteRecord(page.route).meta.titleKey),
    destination: registeredRouteDestination({ name: page.route }),
  })),
)
const copy = computed(() =>
  [
    t('apiShowcase.copyIntro'),
    t('apiShowcase.copyBoundary'),
    ...sections.value.map((section) => `${section.title}: ${t(section.hint)}`),
    'apps/web/src/shared/api/index.ts',
    'apps/web/src/shared/query/index.ts',
    'apps/web/src/app/workbench/api/',
  ].join('\n\n'),
)
</script>
<template>
  <WorkbenchPage
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
    <div
      class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
      data-api-overview
    >
      <NCard
        v-for="section in sections"
        :key="section.id"
        :bordered="false"
        class="min-w-0"
        content-class="flex flex-col items-start gap-content-gap"
      >
        <span
          class="i-lucide-network text-subheading text-text-secondary"
          aria-hidden="true"
        />
        <div class="grid min-w-0 gap-component-unit">
          <h2 class="font-title-weight m-0 text-subheading text-text-primary">
            {{ section.title }}
          </h2>
          <p class="m-0 text-body text-text-secondary">
            {{ t(section.hint) }}
          </p>
        </div>
        <NTag
          size="small"
          :bordered="false"
        >
          {{
            t(
              section.id === 'basics' || section.id === 'integration'
                ? 'apiShowcase.public'
                : 'apiShowcase.local',
            )
          }}
        </NTag>
        <NButton
          tag="a"
          text
          type="primary"
          class="mt-auto min-h-target-enhanced"
          :href="navigation.resolveHref(section.destination)"
          @click="activate($event, section.destination)"
        >
          {{ t('apiShowcase.explore')
          }}<span
            class="i-lucide-arrow-up-right"
            aria-hidden="true"
          />
        </NButton>
      </NCard>
    </div>
  </WorkbenchPage>
</template>
