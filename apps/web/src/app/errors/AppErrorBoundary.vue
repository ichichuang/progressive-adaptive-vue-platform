<script setup lang="ts">
import type { MotionPreference } from '@platform/design-system'
import { computed, onErrorCaptured, provide, shallowRef, watch, type Component } from 'vue'

import { useConsoleI18n, type ConsoleTranslate } from '../../shared/i18n'

import {
  appErrorBoundaryHooksKey,
  type AppErrorBoundaryHooks,
  type NormalizedCoreError,
} from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'
import ErrorIllustration from './ErrorIllustration.vue'
import { normalizeVueComponentFailure, resolveVueLifecyclePhase } from './error-normalizer'
import type { ErrorArtworkColors } from './error-scene'
import { appendErrorStaticDots } from './error-static-dots'

const props = defineProps<{
  rootComponent: Component
  errorHooks: AppErrorBoundaryHooks
}>()

let translate: ConsoleTranslate | undefined
try {
  translate = useConsoleI18n().t
} catch {
  // Core error messages can render before the application locale is available.
}
provide(appErrorBoundaryHooksKey, props.errorHooks)
const capturedError = shallowRef<NormalizedCoreError | null>(null)
const message = computed(() => {
  if (capturedError.value === null) {
    return null
  }

  const record = getCoreErrorRecord(capturedError.value.id)
  return getCoreErrorMessage(record.userMessageKey, translate)
})

const artwork = shallowRef<HTMLElement | null>(null)
const animatedArtworkAvailable = shallowRef(true)
const artworkColors = shallowRef<ErrorArtworkColors | null>(null)
const artworkMotion = shallowRef<MotionPreference>('none')
watch(
  artwork,
  (host) => {
    if (host === null) return
    try {
      appendErrorStaticDots(host, 'ERROR')
    } catch {
      // The independent root boundary can display its message without decoration.
    }
  },
  { flush: 'post' },
)

watch(
  capturedError,
  (error, _previous, onCleanup) => {
    if (error === null) return

    let observer: MutationObserver | undefined
    const root = document.documentElement
    const synchronizeAppearance = (): void => {
      try {
        const motion = root.getAttribute('data-motion')
        artworkMotion.value = motion === 'full' || motion === 'reduced' ? motion : 'none'
        const style = getComputedStyle(root)
        const ink = style.getPropertyValue('--ui-color-text-secondary').trim()
        const accent = style.getPropertyValue('--ui-color-control-error').trim()
        artworkColors.value = ink && accent ? { ink, accent } : null
      } catch {
        artworkColors.value = null
      }
    }

    synchronizeAppearance()
    try {
      observer = new MutationObserver(synchronizeAppearance)
      observer.observe(root, {
        attributes: true,
        attributeFilter: [
          'data-motion',
          'data-color-mode',
          'data-theme-kind',
          'data-theme',
          'data-contrast',
          'data-pavp-monochrome',
          'style',
        ],
      })
    } catch {
      // Decoration must not prevent the root failure message from rendering.
    }
    onCleanup(() => {
      observer?.disconnect()
    })
  },
  { flush: 'post' },
)

onErrorCaptured((source, _instance, info) => {
  if (props.errorHooks.getStartupState() === 'starting') {
    return undefined
  }

  if (capturedError.value !== null) {
    animatedArtworkAvailable.value = false
    return false
  }

  const error = normalizeVueComponentFailure({
    source,
    startupAttemptId: props.errorHooks.startupAttemptId,
    vueLifecyclePhase: resolveVueLifecyclePhase(info),
    releaseSha: props.errorHooks.releaseSha,
    buildVersion: props.errorHooks.buildVersion,
  })

  props.errorHooks.capture(error)
  capturedError.value = error
  return false
})
</script>

<template>
  <component
    :is="rootComponent"
    v-if="capturedError === null"
  />
  <main
    v-else
    class="error-scene error-scene--document grid"
    data-error-tone="error"
    role="alert"
    aria-live="assertive"
  >
    <section class="error-scene__composition grid min-h-0 min-w-0 relative">
      <ErrorIllustration
        v-if="animatedArtworkAvailable && artworkColors !== null"
        code="ERROR"
        :colors="artworkColors"
        :motion="artworkMotion"
        :active="true"
      />
      <div
        v-else
        class="error-scene__artwork pointer-events-none"
        aria-hidden="true"
      >
        <div
          ref="artwork"
          class="error-scene__glyph"
          data-compact=""
        />
      </div>
      <div class="error-scene__content grid min-w-0">
        <div class="error-scene__copy grid gap-content-gap">
          <h1 class="leading-title m-0 text-heading sm:text-title">
            {{ message?.title }}
          </h1>
          <p class="m-0 text-pretty text-body text-text-secondary">
            {{ message?.description }}
          </p>
        </div>
      </div>
    </section>
  </main>
</template>
