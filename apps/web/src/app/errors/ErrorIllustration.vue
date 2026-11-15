<script setup lang="ts">
import { useUiMotion, type UiMotionController } from '@platform/ui'
import { onMounted, ref } from 'vue'
import { useAppearanceReadBoundary } from '../appearance/appearance-read-boundary'

const props = withDefaults(
  defineProps<{
    readonly code: '400' | '401' | '403' | '404' | '500' | 'OFFLINE' | 'SERVICE' | 'ERROR'
    readonly standalone?: boolean
  }>(),
  { standalone: false },
)

const illustration = ref<HTMLElement | null>(null)
let motion: UiMotionController | undefined
if (props.standalone) {
  try {
    motion = useUiMotion(useAppearanceReadBoundary().snapshot)
  } catch {
    // The error presentation must remain readable if its appearance boundary also failed.
  }
} else {
  motion = useUiMotion()
}
onMounted(() => {
  if (illustration.value === null || motion === undefined) return
  try {
    motion.play(illustration.value, { preset: 'card-expand', phase: 'enter', fallback: 'fade' })
  } catch (error: unknown) {
    if (!props.standalone) throw error
  }
})
</script>

<template>
  <div
    ref="illustration"
    class="mx-auto flex flex-1 min-h-0 min-w-0 w-full items-center justify-center"
    aria-hidden="true"
  >
    <svg
      class="h-full min-h-0 w-full block"
      viewBox="0 0 500 400"
      fill="none"
    >
      <circle
        cx="250"
        cy="200"
        r="154"
        fill="var(--ui-color-expression-accent-a-soft-background)"
      />
      <ellipse
        cx="250"
        cy="200"
        rx="222"
        ry="125"
        transform="rotate(-22 250 200)"
        stroke="var(--ui-color-border-default)"
        stroke-width="2"
        stroke-dasharray="5 10"
      />
      <circle
        cx="58"
        cy="176"
        r="6"
        fill="var(--ui-color-control-primary)"
      />
      <circle
        cx="425"
        cy="99"
        r="9"
        fill="var(--ui-color-control-primary)"
      />
      <path
        d="M424 278v22m-11-11h22M92 86v16m-8-8h16"
        stroke="var(--ui-color-control-primary)"
        stroke-linecap="round"
        stroke-width="3"
      />
      <g transform="rotate(-4 250 200)">
        <rect
          x="110"
          y="84"
          width="280"
          height="232"
          rx="20"
          fill="var(--ui-color-surface-panel)"
          stroke="var(--ui-color-border-default)"
          stroke-width="2"
        />
        <path
          d="M110 118h280"
          stroke="var(--ui-color-border-default)"
        />
        <g fill="var(--ui-color-expression-accent-a-soft-foreground)">
          <circle
            cx="129"
            cy="101"
            r="4"
          />
          <circle
            cx="144"
            cy="101"
            r="4"
          />
          <circle
            cx="159"
            cy="101"
            r="4"
          />
        </g>
        <circle
          cx="250"
          cy="181"
          r="43"
          fill="var(--ui-color-action-primary)"
        />
        <g
          transform="translate(230 161)"
          stroke="var(--ui-color-text-on-action)"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <g v-if="code === '400'">
            <path d="M20 35S8 25 8 17a12 12 0 0 1 24 0c0 8-12 18-12 18Z" />
            <path d="M16 17h8M20 13v8" />
          </g>
          <g v-else-if="code === '401'">
            <circle
              cx="26"
              cy="14"
              r="8"
            />
            <path d="M20 20 8 32v4h5v-4h4v-4h4" />
          </g>
          <g v-else-if="code === '403'">
            <rect
              x="8"
              y="17"
              width="24"
              height="19"
              rx="3"
            />
            <path d="M13 17v-5a7 7 0 0 1 14 0v5M20 24v5" />
          </g>
          <g v-else-if="code === '404'">
            <circle
              cx="20"
              cy="20"
              r="16"
            />
            <path d="m25 15-3 8-8 3 3-8 8-3Z" />
          </g>
          <g v-else-if="code === '500'">
            <path d="M10 29a8 8 0 0 1 1-16 10 10 0 0 1 19 3 7 7 0 0 1 1 13H10Z" />
            <path d="M17 19l6 6m0-6-6 6" />
          </g>
          <g v-else-if="code === 'OFFLINE'">
            <path d="M5 15a23 23 0 0 1 30 0M10 21a15 15 0 0 1 20 0M15 27a8 8 0 0 1 10 0" />
            <path d="M7 6l26 28M20 33h.01" />
          </g>
          <g v-else-if="code === 'SERVICE'">
            <path d="M25 8a9 9 0 0 0-9 12L7 29a4 4 0 0 0 5 5l9-9a9 9 0 0 0 11-11l-6 6-5-5 5-6Z" />
          </g>
          <g v-else>
            <circle
              cx="20"
              cy="20"
              r="16"
            />
            <path d="M20 11v11m0 6h.01" />
          </g>
        </g>
        <text
          x="250"
          y="270"
          text-anchor="middle"
          class="font-title-weight text-title"
          fill="var(--ui-color-text-primary)"
        >
          {{ code }}
        </text>
      </g>
    </svg>
  </div>
</template>
