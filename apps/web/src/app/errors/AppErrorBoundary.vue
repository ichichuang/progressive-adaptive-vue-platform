<script setup lang="ts">
import { computed, onErrorCaptured, provide, shallowRef, type Component } from 'vue'

import { useConsoleI18n } from '../../shared/i18n'

import {
  appErrorBoundaryHooksKey,
  type AppErrorBoundaryHooks,
  type NormalizedCoreError,
} from './core-error'
import { getCoreErrorMessage } from './core-error-messages'
import { getCoreErrorRecord } from './core-error-registry'
import { normalizeVueComponentFailure, resolveVueLifecyclePhase } from './error-normalizer'
import ErrorIllustration from './ErrorIllustration.vue'

const props = defineProps<{
  rootComponent: Component
  errorHooks: AppErrorBoundaryHooks
}>()

const { t } = useConsoleI18n()
provide(appErrorBoundaryHooksKey, props.errorHooks)
const capturedError = shallowRef<NormalizedCoreError | null>(null)
const message = computed(() => {
  if (capturedError.value === null) {
    return null
  }

  const record = getCoreErrorRecord(capturedError.value.id)
  return getCoreErrorMessage(record.userMessageKey, t)
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
    class="leading-body font-body-family grid min-h-0 place-items-center overflow-hidden h-dvh bg-surface-page px-page-inline py-section-block text-body text-text-primary"
    role="alert"
    aria-live="assertive"
  >
    <section
      class="mx-auto flex flex-col h-full min-h-0 min-w-0 w-full items-center justify-center gap-content-gap max-w-content"
    >
      <ErrorIllustration
        code="ERROR"
        standalone
      />
      <div class="text-center shrink-0 grid min-w-0 w-full justify-items-center gap-content-gap">
        <span
          class="font-title-weight rounded-control bg-action-primary px-button-inline text-text-on-action"
        >
          {{ t('error.eyebrow') }}
        </span>
        <h1 class="leading-title font-title-weight m-0 text-title">
          {{ message?.title }}
        </h1>
        <p class="m-0 text-pretty text-text-secondary">
          {{ message?.description }}
        </p>
      </div>
      <div
        class="flex-1 min-h-0"
        aria-hidden="true"
      />
    </section>
  </main>
</template>
