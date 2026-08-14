<script setup lang="ts">
import { computed, onErrorCaptured, shallowRef, type Component } from 'vue'

import type { AppErrorBoundaryHooks, NormalizedCoreError } from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'
import { normalizeVueComponentFailure, resolveVueLifecyclePhase } from './error-normalizer'

const props = defineProps<{
  rootComponent: Component
  errorHooks: AppErrorBoundaryHooks
}>()

const capturedError = shallowRef<NormalizedCoreError | null>(null)
const message = computed(() => {
  if (capturedError.value === null) {
    return null
  }

  const record = getCoreErrorRecord(capturedError.value.id)
  return getCoreErrorMessage(record.userMessageKey)
})

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
    class="leading-body font-body-family min-h-dvh bg-surface-page px-page-inline py-section-block text-body text-text-primary"
    role="alert"
    aria-live="assertive"
  >
    <section
      class="mx-auto border rounded-panel shadow-panel bg-surface-panel border-border-default max-w-content"
    >
      <h1 class="leading-title font-title-weight m-0 text-title">
        {{ message?.title }}
      </h1>
      <p class="text-text-secondary">
        {{ message?.description }}
      </p>
    </section>
  </main>
</template>
