<script setup lang="ts">
import { computed } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import type { AdministrationModule } from './administration-routes'
import AdministrationWorkspace from './AdministrationWorkspace.vue'

const props = defineProps<{ readonly module: AdministrationModule }>()
const access = useAccessBoundary()
const { t } = useConsoleI18n()
const provider = computed(() => access.administration?.()?.[props.module])
const title = computed(
  () =>
    ({
      directory: t('route-title.administration-directory'),
      groups: t('route-title.administration-groups'),
      roles: t('route-title.administration-roles'),
      relationships: t('route-title.administration-relationships'),
      policies: t('route-title.administration-policies'),
      requests: t('route-title.administration-requests'),
      audit: t('route-title.administration-audit'),
      diagnostics: t('route-title.administration-diagnostics'),
    })[props.module],
)
</script>

<template>
  <section class="flex flex-col min-h-0 min-w-0 px-page-inline">
    <h1
      tabindex="-1"
      data-route-focus="architecture-console-page-heading"
    >
      {{ title }}
    </h1>
    <AdministrationWorkspace
      v-if="provider"
      :key="module"
      :module="module"
      :host="provider"
    />
    <p
      v-else
      role="status"
    >
      {{ t('administration.configurationError') }}
    </p>
  </section>
</template>
