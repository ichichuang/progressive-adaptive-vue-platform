<script setup lang="ts">
import { computed, onDeactivated, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import type { EffectiveAppearanceState } from '@platform/design-system'
import type { RouteTransitionPresetId } from '../router/route-transition/route-transition-types'
import { useConsoleI18n } from '../../shared/i18n'

const props = defineProps<{
  readonly preset: RouteTransitionPresetId
  readonly motion: EffectiveAppearanceState['motion']
  readonly autoplayPreview: boolean
}>()
const { t } = useConsoleI18n()
const direction = ref<'forward' | 'reverse'>('reverse')
const playing = ref(false)
const sequence = ref(0)
let autoplaySequence: number | undefined
const scenes = computed(() => {
  const forward = direction.value === 'forward'
  return [
    ...(playing.value ? [{ incoming: false, detail: !forward }] : []),
    { incoming: true, detail: forward },
  ]
})

function play(nextDirection: 'forward' | 'reverse'): void {
  direction.value = nextDirection
  sequence.value += 1
  playing.value = props.motion !== 'none' && props.preset !== 'route-transition.none'
}
function settle(): void {
  playing.value = false
}
watch(
  () => props.autoplayPreview,
  (preview) => {
    if (preview && props.motion === 'full') {
      play('forward')
      autoplaySequence = sequence.value
    } else if (sequence.value === autoplaySequence) {
      settle()
    }
  },
)
watch(() => props.motion, settle)
onDeactivated(settle)
</script>

<template>
  <div class="contents">
    <div
      class="motion-route-preview wb-motion-stage wb-bento-reserved rounded-panel grid col-span-full overflow-clip bg-surface-page"
      :data-preset="preset"
      :data-motion="motion"
      :data-direction="direction"
      :data-playing="playing"
    >
      <div
        v-for="scene in scenes"
        :key="`${sequence}-${scene.incoming ? 'new' : 'old'}`"
        class="motion-route-preview__layer grid min-w-0 place-items-center bg-surface-page p-page-inline"
        :class="scene.incoming ? 'motion-route-preview__new' : 'motion-route-preview__old'"
        :aria-hidden="!scene.incoming"
        @animationend="!scene.incoming && settle()"
      >
        <div
          class="rounded-control grid shadow-panel bg-surface-panel gap-content-gap p-page-inline"
        >
          <div class="flex items-center gap-content-gap text-text-primary">
            <span
              class="shrink-0 size-icon-medium text-control-primary"
              :class="scene.detail ? 'i-lucide-panel-top' : 'i-lucide-panels-top-left'"
              aria-hidden="true"
            />
            <strong>{{ t(scene.detail ? 'motionShowcase.pageB' : 'motionShowcase.pageA') }}</strong>
          </div>
          <p class="m-0 text-text-secondary">
            {{ t(scene.detail ? 'motionShowcase.pageBDetail' : 'motionShowcase.pageADetail') }}
          </p>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-content-gap">
      <NButton
        secondary
        @click="play('forward')"
      >
        {{ t('motionShowcase.forward') }}
      </NButton>
      <NButton
        secondary
        @click="play('reverse')"
      >
        {{ t('motionShowcase.reverse') }}
      </NButton>
    </div>
  </div>
</template>

<style scoped>
@layer components {
  .motion-route-preview__layer {
    grid-area: 1 / 1;
  }

  .motion-route-preview[data-playing='true'] .motion-route-preview__layer {
    animation-duration: calc(var(--ui-motion-duration) + var(--ui-motion-duration) / 2);
    animation-timing-function: var(--ui-motion-easing);
  }

  .motion-route-preview[data-playing='true'][data-motion='reduced'] .motion-route-preview__layer {
    animation-duration: var(--ui-motion-duration);
  }

  .motion-route-preview[data-playing='true'][data-motion='reduced'] .motion-route-preview__old,
  .motion-route-preview[data-playing='true'][data-preset='route-transition.content-crossfade']
    .motion-route-preview__old {
    animation-name: pavp-route-content-crossfade-old;
  }

  .motion-route-preview[data-playing='true'][data-motion='reduced'] .motion-route-preview__new,
  .motion-route-preview[data-playing='true'][data-preset='route-transition.content-crossfade']
    .motion-route-preview__new {
    animation-name: pavp-route-content-crossfade-new;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.drill-soft'][data-direction='forward']
    .motion-route-preview__old {
    animation-name: pavp-route-drill-forward-old;
    transform-origin: center top;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.drill-soft'][data-direction='forward']
    .motion-route-preview__new {
    animation-name: pavp-route-drill-forward-new;
    transform-origin: center top;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.drill-soft'][data-direction='reverse']
    .motion-route-preview__old {
    animation-name: pavp-route-drill-reverse-old;
    transform-origin: center top;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.drill-soft'][data-direction='reverse']
    .motion-route-preview__new {
    animation-name: pavp-route-drill-reverse-new;
    transform-origin: center top;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.sheet-soft'][data-direction='forward']
    .motion-route-preview__old {
    animation-name: pavp-route-sheet-forward-old;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.sheet-soft'][data-direction='forward']
    .motion-route-preview__new {
    animation-name: pavp-route-sheet-forward-new;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.sheet-soft'][data-direction='reverse']
    .motion-route-preview__old {
    animation-name: pavp-route-sheet-reverse-old;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.sheet-soft'][data-direction='reverse']
    .motion-route-preview__new {
    animation-name: pavp-route-sheet-reverse-new;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='forward']:dir(
      ltr
    )
    .motion-route-preview__old,
  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='reverse']:dir(
      rtl
    )
    .motion-route-preview__old {
    animation-name: pavp-route-axis-inline-old-toward-left;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='forward']:dir(
      ltr
    )
    .motion-route-preview__new,
  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='reverse']:dir(
      rtl
    )
    .motion-route-preview__new {
    animation-name: pavp-route-axis-inline-new-from-right;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='reverse']:dir(
      ltr
    )
    .motion-route-preview__old,
  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='forward']:dir(
      rtl
    )
    .motion-route-preview__old {
    animation-name: pavp-route-axis-inline-old-toward-right;
  }

  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='reverse']:dir(
      ltr
    )
    .motion-route-preview__new,
  .motion-route-preview[data-playing='true'][data-motion='full'][data-preset='route-transition.axis-inline-soft'][data-direction='forward']:dir(
      rtl
    )
    .motion-route-preview__new {
    animation-name: pavp-route-axis-inline-new-from-left;
  }
}
</style>
