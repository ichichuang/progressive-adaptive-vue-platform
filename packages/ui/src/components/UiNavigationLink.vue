<script setup lang="ts">
import { computed, inject, ref, type AnchorHTMLAttributes } from 'vue'
import { NButton, type ButtonSize, type ButtonType } from 'naive-ui/es/button'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

defineOptions({ name: 'UiNavigationLink' })
const props = withDefaults(
  defineProps<{
    readonly href: string
    readonly label: string
    readonly hoverLabel: string
    readonly type?: ButtonType | undefined
    readonly size?: ButtonSize | undefined
    readonly secondary?: boolean | undefined
    readonly tertiary?: boolean | undefined
    readonly quaternary?: boolean | undefined
    readonly ghost?: boolean | undefined
    readonly dashed?: boolean | undefined
    readonly text?: boolean | undefined
    readonly round?: boolean | undefined
    readonly bordered?: boolean | undefined
    readonly strong?: boolean | undefined
    readonly block?: boolean | undefined
  }>(),
  {
    type: 'primary',
    size: 'large',
    secondary: false,
    tertiary: false,
    quaternary: false,
    ghost: false,
    dashed: false,
    text: false,
    round: false,
    bordered: true,
    strong: false,
    block: false,
  },
)
const emit = defineEmits<{ click: [event: MouseEvent] }>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined)
  throw new Error('UiNavigationLink requires the PAVP Appearance context.')
const pointerHover = ref(false)
const compact = computed(() => props.size === 'tiny' || props.size === 'small')

function onPointerEnter(event: PointerEvent): void {
  pointerHover.value = event.pointerType === 'mouse'
}
function clearPointerHover(): void {
  pointerHover.value = false
}
</script>

<template>
  <NButton
    tag="a"
    :type="type"
    :size="size"
    :secondary="secondary"
    :tertiary="tertiary"
    :quaternary="quaternary"
    :ghost="ghost"
    :dashed="dashed"
    :text="text"
    :round="round"
    :bordered="bordered"
    :strong="strong"
    :block="block"
    class="pavp-navigation-link"
    :data-link-motion="appearance.motion"
    :data-link-hover="pointerHover ? '' : undefined"
    v-bind="
      {
        href,
        'aria-label': `${label} · ${hoverLabel}`,
        onPointerenter: onPointerEnter,
        onPointerleave: clearPointerHover,
        onPointercancel: clearPointerHover,
      } satisfies AnchorHTMLAttributes
    "
    @click="emit('click', $event)"
  >
    <span
      class="grid relative"
      aria-hidden="true"
    >
      <svg
        class="my-auto start-0 inset-y-0 absolute"
        :class="compact ? 'size-icon-large' : 'size-icon-extra-large'"
        viewBox="0 0 36 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <g transform="translate(2 0)">
          <path
            class="pavp-navigation-link__shaft"
            d="M0 12h16"
          />
          <path
            class="pavp-navigation-link__tip"
            d="m11 7 5 5-5 5"
          />
        </g>
      </svg>
      <span class="flex col-start-1 row-start-1 items-center gap-component-unit">
        <span
          class="shrink-0"
          :class="compact ? 'size-icon-extra-small' : 'size-icon-medium'"
        />
        <span class="pavp-navigation-link__label">{{ label }}</span>
      </span>
      <span class="flex col-start-1 row-start-1 items-center gap-component-unit">
        <span
          class="shrink-0"
          :class="compact ? 'size-icon-large' : 'size-icon-extra-large'"
        />
        <span class="pavp-navigation-link__hover-label">{{ hoverLabel }}</span>
      </span>
    </span>
  </NButton>
</template>

<style scoped>
@layer components {
  .pavp-navigation-link__hover-label {
    opacity: 0;
  }
  [data-link-motion='full'] :is(.pavp-navigation-link__shaft, .pavp-navigation-link__tip) {
    transition: transform var(--ui-motion-duration) var(--ui-motion-easing);
  }
  [data-link-motion='full'] :is(.pavp-navigation-link__label, .pavp-navigation-link__hover-label) {
    transition:
      transform var(--ui-motion-duration) var(--ui-motion-easing),
      opacity var(--ui-motion-duration) var(--ui-motion-easing);
  }
  [data-link-motion='full'] .pavp-navigation-link__hover-label {
    transform: translateX(-20%);
  }
  [data-link-motion='reduced']
    :is(.pavp-navigation-link__label, .pavp-navigation-link__hover-label) {
    transition: opacity calc(var(--ui-motion-duration) / 2) var(--ui-motion-easing);
  }
  [data-link-motion='full']:is(:focus-visible, [data-link-hover]) .pavp-navigation-link__shaft {
    transform: scaleX(1.875);
  }
  [data-link-motion='full']:is(:focus-visible, [data-link-hover]) .pavp-navigation-link__tip {
    transform: translateX(14px);
  }
  [data-link-motion='full']:is(:focus-visible, [data-link-hover]) .pavp-navigation-link__label {
    transform: translateX(15%);
  }
  [data-link-motion='full']:is(:focus-visible, [data-link-hover])
    .pavp-navigation-link__hover-label {
    transform: none;
  }
  [data-link-motion]:not([data-link-motion='none']):is(:focus-visible, [data-link-hover])
    .pavp-navigation-link__label {
    opacity: 0;
  }
  [data-link-motion]:not([data-link-motion='none']):is(:focus-visible, [data-link-hover])
    .pavp-navigation-link__hover-label {
    opacity: 1;
  }
}
</style>
