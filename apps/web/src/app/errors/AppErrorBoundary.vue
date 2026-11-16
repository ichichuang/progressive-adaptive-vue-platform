<script setup lang="ts">
import { computed, onErrorCaptured, provide, shallowRef, watch, type Component } from 'vue'

import { useConsoleI18n, type ConsoleTranslate } from '../../shared/i18n'

import {
  appErrorBoundaryHooksKey,
  type AppErrorBoundaryHooks,
  type NormalizedCoreError,
} from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'
import { normalizeVueComponentFailure, resolveVueLifecyclePhase } from './error-normalizer'
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

onErrorCaptured((source, _instance, info) => {
  if (props.errorHooks.getStartupState() === 'starting') {
    return undefined
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
      <div
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
          <h1 class="leading-title m-0">
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
