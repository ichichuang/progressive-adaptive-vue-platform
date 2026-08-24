<script setup lang="ts">
defineOptions({ name: 'UiSection' })

defineProps<{
  readonly description?: string
  readonly title: string
}>()

defineSlots<{
  default: (props: Readonly<Record<string, never>>) => unknown
}>()
</script>

<template>
  <section class="pavp-section border rounded-panel bg-surface-panel border-border-default">
    <div class="pavp-section__heading">
      <h2 class="leading-title font-title-weight m-0 text-text-primary text-title">
        {{ title }}
      </h2>
      <p
        v-if="description"
        class="leading-body m-0 text-body text-text-secondary"
      >
        {{ description }}
      </p>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.pavp-section,
.pavp-section__heading {
  display: grid;
  gap: var(--ui-space-content-gap);
}

.pavp-section {
  padding: var(--ui-space-page-inline);
}
</style>
