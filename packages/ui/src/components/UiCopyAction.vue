<script setup lang="ts">
import { computed, inject, onActivated, onDeactivated, onScopeDispose, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

/** Copies the supplied value and exposes localized, layout-stable feedback. */
defineOptions({ name: 'UiCopyAction' })
const props = withDefaults(
  defineProps<{
    readonly value: string
    readonly label: string
    readonly copyLabel: string
    readonly successLabel: string
    readonly failureLabel: string
    readonly variant: 'card' | 'primary' | 'text' | 'tertiary'
    readonly disabled?: boolean
  }>(),
  { disabled: false },
)
defineSlots<{ default?: () => unknown }>()

const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new Error('UiCopyAction requires the PAVP Appearance context.')
const state = ref<'idle' | 'pending' | 'success' | 'failure'>('idle')
const statusMessage = computed(() =>
  state.value === 'success'
    ? props.successLabel
    : state.value === 'failure'
      ? props.failureLabel
      : '',
)
const buttonMessage = computed(() => statusMessage.value || props.label)
let attempt = 0
let active = true
let disposed = false
let feedbackTimer: ReturnType<typeof setTimeout> | undefined
function cancelFeedbackTimer(): void {
  if (feedbackTimer !== undefined) clearTimeout(feedbackTimer)
  feedbackTimer = undefined
}
function clear(): void {
  attempt += 1
  cancelFeedbackTimer()
  state.value = 'idle'
}
watch(() => props.value, clear, { flush: 'sync' })
onActivated(() => {
  active = true
})
onDeactivated(() => {
  active = false
  clear()
})
onScopeDispose(() => {
  disposed = true
  active = false
  clear()
})

function isCurrent(current: number, value: string): boolean {
  return !disposed && active && current === attempt && props.value === value
}

async function copy(): Promise<void> {
  if (props.disabled || disposed || !active || state.value === 'pending') return
  const current = ++attempt
  const value = props.value
  cancelFeedbackTimer()
  state.value = 'pending'
  function finish(result: 'success' | 'failure'): void {
    if (!isCurrent(current, value)) return
    state.value = result
    feedbackTimer = setTimeout(() => {
      if (isCurrent(current, value)) state.value = 'idle'
      feedbackTimer = undefined
    }, 2000)
  }
  try {
    if (!('clipboard' in navigator)) throw new Error('Clipboard unavailable.')
    await navigator.clipboard.writeText(value)
    finish('success')
  } catch {
    finish('failure')
  }
}
</script>

<template>
  <NCard
    v-if="variant === 'card'"
    :bordered="false"
    :hoverable="!disabled"
    :class="{ 'cursor-pointer': !disabled }"
    content-class="flex min-w-0"
    :data-copy-state="state"
    :data-copy-motion="appearance.motion"
    @click="copy"
  >
    <NButton
      attr-type="button"
      text
      class="pavp-copy-card-button font-inherit p-0 text-start border-0 bg-inherit flex-1 min-w-0 text-text-primary"
      :class="{ 'cursor-pointer': !disabled }"
      :disabled="disabled"
      :aria-label="`${copyLabel} · ${label}`"
      :aria-busy="state === 'pending'"
      @click.stop="copy"
    >
      <span class="pavp-copy-card-content grid min-w-0 gap-content-gap">
        <slot />
        <span class="flex min-w-0 items-center gap-content-gap">
          <span
            class="pavp-copy-icon shrink-0 grid size-icon-medium text-control-primary"
            aria-hidden="true"
          >
            <span
              class="pavp-copy-icon__idle i-lucide-copy col-start-1 row-start-1 size-icon-medium"
            />
            <span
              class="pavp-copy-icon__success i-lucide-check col-start-1 row-start-1 size-icon-medium"
            />
            <span
              class="pavp-copy-icon__failure i-lucide-copy-x col-start-1 row-start-1 size-icon-medium"
            />
          </span>
          <span class="leading-body font-title-weight grid min-w-0">
            <span
              v-for="(message, index) in [label, successLabel, failureLabel]"
              :key="index"
              class="col-start-1 row-start-1 invisible"
              aria-hidden="true"
            >
              {{ message }}
            </span>
            <span
              class="col-start-1 row-start-1"
              aria-hidden="true"
            >
              {{ buttonMessage }}
            </span>
            <span
              role="status"
              aria-live="polite"
              class="sr-only"
            >
              {{ statusMessage }}
            </span>
          </span>
        </span>
      </span>
    </NButton>
  </NCard>
  <NButton
    v-else
    :type="variant === 'primary' || variant === 'text' ? 'primary' : 'default'"
    :text="variant === 'text'"
    :tertiary="variant === 'tertiary'"
    :disabled="disabled"
    :data-copy-state="state"
    :data-copy-motion="appearance.motion"
    :aria-label="`${copyLabel} · ${label}`"
    :aria-busy="state === 'pending'"
    @click="copy"
  >
    <span class="inline-flex min-w-0 items-center gap-content-gap">
      <span
        class="pavp-copy-icon shrink-0 grid size-icon-medium"
        aria-hidden="true"
      >
        <span class="pavp-copy-icon__idle i-lucide-copy col-start-1 row-start-1 size-icon-medium" />
        <span
          class="pavp-copy-icon__success i-lucide-check col-start-1 row-start-1 size-icon-medium"
        />
        <span
          class="pavp-copy-icon__failure i-lucide-copy-x col-start-1 row-start-1 size-icon-medium"
        />
      </span>
      <span class="grid min-w-0">
        <span
          v-for="(message, index) in [label, successLabel, failureLabel]"
          :key="index"
          class="col-start-1 row-start-1 invisible"
          aria-hidden="true"
        >
          {{ message }}
        </span>
        <span
          class="col-start-1 row-start-1"
          aria-hidden="true"
        >
          {{ buttonMessage }}
        </span>
        <span
          role="status"
          aria-live="polite"
          class="sr-only"
        >
          {{ statusMessage }}
        </span>
      </span>
    </span>
  </NButton>
</template>

<style scoped>
@layer components {
  .pavp-copy-icon > span {
    opacity: 0;
    transition: opacity var(--ui-motion-duration) var(--ui-motion-easing);
  }
  [data-copy-state='idle'] .pavp-copy-icon__idle,
  [data-copy-state='pending'] .pavp-copy-icon__idle,
  [data-copy-state='success'] .pavp-copy-icon__success,
  [data-copy-state='failure'] .pavp-copy-icon__failure {
    opacity: 1;
  }
  [data-copy-motion='reduced'] .pavp-copy-icon > span {
    transition-duration: calc(var(--ui-motion-duration) / 2);
  }
  [data-copy-motion='none'] .pavp-copy-icon > span {
    transition: none;
  }
  .pavp-copy-card-button:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
  @media (forced-colors: active) {
    .pavp-copy-card-button {
      outline: var(--ui-border-width) solid CanvasText;
    }
  }
}
</style>

<style scoped>
.pavp-copy-card-button.n-button {
  inline-size: 100%;
  block-size: auto;
  white-space: normal;
  color: var(--ui-color-text-primary);
  text-align: start;
  line-height: var(--ui-font-line-height-body);
}
.pavp-copy-card-button.n-button :deep(.n-button__content) {
  display: grid;
  flex: 1;
  min-inline-size: 0;
  line-height: inherit;
}
</style>
