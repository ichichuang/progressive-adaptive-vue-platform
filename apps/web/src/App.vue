<script setup lang="ts">
import { tokens } from '@platform/design-system'

const pageBackground = tokens['color.surface.page']
</script>

<template>
  <main
    class="text-body text-text-primary font-body-family px-page-inline py-section-block min-h-dvh"
    :style="{ backgroundColor: pageBackground }"
  >
    <section
      class="mx-auto p-page-inline border border-border-default rounded-panel bg-surface-panel max-w-[var(--ui-layout-content-max-width)] shadow-panel"
    >
      <h1 class="text-title leading-title font-title-weight m-0">
        Progressive Adaptive Vue Platform
      </h1>
      <p class="text-text-secondary mt-content-gap">
        Phase 1A token contract and deterministic build foundation.
      </p>
    </section>
  </main>
</template>
