<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

const props = defineProps<{
  readonly title: string
  readonly message?: string
  readonly contained?: boolean
  readonly hideHeading?: boolean
}>()
defineSlots<{ default: () => unknown; actions?: () => unknown }>()

const sticky = computed(() => !props.contained && !props.hideHeading)
const heading = useTemplateRef<HTMLElement>('heading')

function revealFocusedControl({ target }: FocusEvent): void {
  const card = heading.value
  if (
    sticky.value &&
    card !== null &&
    target instanceof HTMLElement &&
    !card.contains(target) &&
    target.matches(':focus-visible') &&
    target.getBoundingClientRect().top < card.getBoundingClientRect().bottom
  )
    target.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'instant' })
}
</script>
<template>
  <div
    class="wb-page min-w-0"
    :class="[
      contained
        ? 'wb-page--contained flex flex-1 flex-col min-h-0 w-full gap-content-gap'
        : 'grid gap-field-gap',
      { isolate: sticky },
    ]"
    @focusin="revealFocusedControl"
  >
    <header
      ref="heading"
      :class="[
        hideHeading
          ? 'sr-only'
          : 'wb-page-heading shrink-0 rounded-panel grid min-w-0 shadow-panel bg-surface-panel gap-content-gap',
        { 'top-0 sticky z-overlay': sticky },
      ]"
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
        class="flex flex-wrap min-w-0 justify-between"
        :class="sticky ? 'items-center gap-component-unit' : 'items-start gap-content-gap'"
      >
        <div :class="sticky ? 'contents' : 'grid min-w-0 gap-component-unit'">
          <p
            class="wb-page-heading__title leading-title font-title-weight m-0 text-text-primary"
            :class="{ 'flex-1 min-w-0': sticky }"
            aria-hidden="true"
          >
            {{ title }}
          </p>
          <p
            v-if="message"
            class="m-0 text-pretty text-body text-text-secondary"
            :class="{ 'order-last basis-full': sticky }"
          >
            {{ message }}
          </p>
        </div>
        <div
          v-if="$slots['actions']"
          class="flex shrink-0 flex-wrap items-center gap-component-unit"
        >
          <slot name="actions" />
        </div>
      </div>
    </header>
    <slot />
  </div>
</template>
