<script setup lang="ts">
defineProps<{
  readonly title: string
  readonly message?: string
  readonly contained?: boolean
  readonly hideHeading?: boolean
}>()
defineSlots<{ default: () => unknown; actions?: () => unknown }>()
</script>
<template>
  <div
    class="wb-page min-w-0"
    :class="contained ? 'flex flex-1 flex-col min-h-0 w-full gap-content-gap' : 'grid'"
  >
    <header
      :class="hideHeading ? 'sr-only' : 'wb-page-heading shrink-0 grid min-w-0 gap-content-gap'"
    >
      <h1
        class="sr-only"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <div
        v-if="!hideHeading"
        class="wb-page-heading__row flex flex-wrap min-w-0 items-start justify-between gap-content-gap"
      >
        <div class="wb-page-heading__copy grid min-w-0 gap-component-unit">
          <p
            class="wb-page-heading__title leading-title font-title-weight m-0 text-text-primary text-title"
            aria-hidden="true"
          >
            {{ title }}
          </p>
          <p
            v-if="message"
            class="wb-page-heading__message m-0 text-pretty text-body text-text-secondary"
          >
            {{ message }}
          </p>
        </div>
        <div
          v-if="$slots['actions']"
          class="wb-page-heading__actions flex shrink-0 flex-wrap items-center gap-component-unit"
        >
          <slot name="actions" />
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>
