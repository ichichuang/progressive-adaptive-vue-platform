<script setup lang="ts">
import { tokens } from '@platform/design-system'

defineOptions({ name: 'RouteInvalidInputPage' })

defineProps<{
  readonly title: string
  readonly message: string
}>()

const panelPadding = tokens['spacing.page.inline']
const contentGap = tokens['spacing.content.gap']
</script>

<template>
  <main
    class="leading-body font-body-family min-h-dvh bg-surface-page px-page-inline py-section-block text-body text-text-primary"
  >
    <section
      class="mx-auto border rounded-panel shadow-panel bg-surface-panel border-border-default max-w-content"
      :style="{ padding: panelPadding }"
    >
      <h1
        class="leading-title font-title-weight m-0 text-title"
        data-route-focus="primary-heading"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <p
        class="text-text-secondary"
        :style="{ marginBlockStart: contentGap }"
      >
        {{ message }}
      </p>
    </section>
  </main>
</template>
