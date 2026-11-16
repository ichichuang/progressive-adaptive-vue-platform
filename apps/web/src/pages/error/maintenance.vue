<script setup lang="ts">
import { useConsoleI18n } from '../../shared/i18n'
import ErrorActions from '../../app/errors/ErrorActions.vue'
import ErrorIllustration from '../../app/errors/ErrorIllustration.vue'

defineOptions({ name: 'RouteMaintenancePage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()

const { t } = useConsoleI18n()
</script>

<template>
  <main
    class="leading-body font-body-family grid min-h-0 place-items-center overflow-hidden h-dvh bg-surface-page px-page-inline py-section-block text-body text-text-primary"
  >
    <section
      class="mx-auto flex flex-col h-full min-h-0 min-w-0 w-full items-center justify-center gap-content-gap max-w-content"
    >
      <ErrorIllustration
        code="SERVICE"
        display-code="503"
      />
      <div class="text-center shrink-0 grid min-w-0 w-full justify-items-center gap-content-gap">
        <span
          class="font-title-weight inline-flex items-center gap-control-segment-gap text-control-primary"
        >
          <span
            class="i-lucide-sparkles"
            aria-hidden="true"
          />
          {{ t('error.eyebrow') }}
        </span>
        <h1
          class="leading-title font-title-weight m-0 text-title"
          data-route-focus="primary-heading"
          tabindex="-1"
        >
          {{ title }}
        </h1>
        <p class="m-0 text-pretty text-text-secondary">
          {{ message }}
        </p>
        <p class="m-0 text-pretty text-text-secondary">
          {{ t('error.adviceService') }}
        </p>
        <ErrorActions code="503" />
      </div>
      <div
        class="flex-1 min-h-0"
        aria-hidden="true"
      />
    </section>
  </main>
</template>
