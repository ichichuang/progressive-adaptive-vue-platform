<script setup lang="ts">
import { tokens } from '@platform/design-system'

const pageBackground = tokens['color.surface.page']
const panelPadding = tokens['spacing.page.inline']
const contentGap = tokens['spacing.content.gap']
</script>

<template>
  <main
    class="leading-body font-body-family min-h-dvh px-page-inline py-section-block text-body text-text-primary"
    :style="{ backgroundColor: pageBackground }"
  >
    <section
      class="mx-auto border rounded-panel shadow-panel bg-surface-panel border-border-default max-w-content"
      :style="{ padding: panelPadding }"
    >
      <h1 class="leading-title font-title-weight m-0 text-title">
        Progressive Adaptive Vue Platform
      </h1>
      <p
        class="text-text-secondary"
        :style="{ marginBlockStart: contentGap }"
      >
        Phase 1A token contract and deterministic build foundation.
      </p>
    </section>
  </main>
</template>
