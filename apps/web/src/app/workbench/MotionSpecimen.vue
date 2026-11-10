<script setup lang="ts">
import { UiCopyAction } from '@platform/ui'
import { useConsoleI18n } from '../../shared/i18n'

defineProps<{
  readonly title: string
  readonly description: string
  readonly request: string
}>()
defineSlots<{ default: () => unknown }>()

const { t } = useConsoleI18n()
</script>

<template>
  <div
    class="grid min-w-0 items-start gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
  >
    <div class="grid col-span-full gap-content-gap">
      <h2 class="font-title-weight m-0 text-subheading text-text-primary">
        {{ title }}
      </h2>
      <p class="m-0 text-caption text-text-secondary">
        {{ description }}
      </p>
    </div>

    <slot />

    <div
      class="flex flex-wrap items-center gap-content-gap layout-regular:flex-row-reverse layout-wide:flex-row-reverse"
    >
      <UiCopyAction
        variant="tertiary"
        :value="request"
        :label="t('motionShowcase.copy')"
        :copy-label="title"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </div>
  </div>
</template>
