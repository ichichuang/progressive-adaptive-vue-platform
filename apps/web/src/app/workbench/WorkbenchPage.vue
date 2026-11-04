<script setup lang="ts">
import { UiPageHeader } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'
defineProps<{ readonly title: string; readonly message?: string }>()
defineSlots<{ default: () => unknown; actions?: () => unknown }>()
const { t } = useConsoleI18n()
</script>
<template>
  <div class="wb-page grid min-w-0">
    <header class="wb-page-head flex flex-wrap items-start justify-between gap-content-gap">
      <UiPageHeader
        :breadcrumb="t('workbench.label')"
        :title="title"
        :summary="message ?? ''"
      />
      <div
        v-if="$slots['actions']"
        class="wb-page-actions flex flex-wrap items-center justify-between gap-content-gap"
      >
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </div>
</template>
