<script setup lang="ts">
defineProps<{
  readonly title: string
  readonly message?: string
  readonly contained?: boolean
}>()
defineSlots<{ default: () => unknown; actions?: () => unknown }>()
</script>
<template>
  <div
    class="wb-page min-w-0"
    :class="contained ? 'flex flex-1 flex-col min-h-0 w-full gap-content-gap' : 'grid'"
  >
    <header class="shrink-0 grid min-w-0 gap-component-unit">
      <h1
        class="sr-only"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <div class="flex flex-wrap min-w-0 items-center justify-between gap-content-gap">
        <p
          class="leading-title font-title-weight m-0 text-text-primary text-title"
          aria-hidden="true"
        >
          {{ title }}
        </p>
        <div
          v-if="$slots['actions']"
          class="shrink-0"
        >
          <slot name="actions" />
        </div>
      </div>
      <p
        v-if="message"
        class="m-0 text-pretty text-body text-text-secondary"
      >
        {{ message }}
      </p>
    </header>
    <slot />
  </div>
</template>
