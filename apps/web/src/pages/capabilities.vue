<script setup lang="ts">
import { ref } from 'vue'

import CapabilityRoadmapContent from '../app/console/CapabilityRoadmapContent.vue'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'

defineOptions({ name: 'CapabilityRoadmapPage' })
defineProps<{
  readonly breadcrumb: string
  readonly title: string
  readonly message: string
}>()

const { t } = useConsoleI18n()
const destination = { name: 'capability-roadmap-standalone' } as const
const navigation = useApplicationNavigation()
const href = navigation.resolveHref(destination)
const activateLink = useApplicationLinkActivation({ openIn: 'new-page' })
const activateTrackedLink = useApplicationLinkActivation({
  openIn: 'new-page',
  reuse: 'same-destination',
})
const feedback = ref<ConsoleMessageKey>()
const trackedFeedback = ref<ConsoleMessageKey>()
const canRecover = ref(false)

function openStandalone(event: MouseEvent) {
  const result = activateLink(event, destination)
  if (result === undefined) return
  feedback.value = undefined
  return result.then((outcome) => {
    if (outcome.kind === 'invalid-input' && outcome.reason === 'destination')
      feedback.value = 'route-message.error-invalid-route-input'
    else if (outcome.kind === 'invalid-input' || outcome.kind === 'invocation-error')
      feedback.value = 'route-message.error-application-route-failure'
  })
}

function handleTrackedOutcome(
  outcome: Awaited<Exclude<ReturnType<typeof activateTrackedLink>, undefined>>,
) {
  trackedFeedback.value = undefined
  if (outcome.kind === 'invalid-input' && outcome.reason === 'destination')
    trackedFeedback.value = 'route-message.error-invalid-route-input'
  else if (outcome.kind === 'invalid-input')
    trackedFeedback.value = 'route-message.error-application-route-failure'
  else if (outcome.kind === 'invocation-error' && outcome.phase === 'activate')
    trackedFeedback.value = 'capabilities.pageActivationFailure'
  else if (outcome.kind === 'invocation-error')
    trackedFeedback.value = 'route-message.error-application-route-failure'
  else if (outcome.kind === 'association-unavailable' && outcome.reason === 'restoring')
    trackedFeedback.value = 'capabilities.browserPageAssociationRestoring'
  else if (outcome.kind === 'association-unavailable' && outcome.reason === 'recovery-unavailable')
    trackedFeedback.value = 'capabilities.browserPageRecoveryUnavailable'
  else if (
    outcome.kind === 'association-pending' ||
    (outcome.kind === 'association-unavailable' && outcome.reason === 'unconfirmed')
  )
    trackedFeedback.value = 'capabilities.pageAssociationUnconfirmed'
  else if (outcome.kind === 'association-unavailable' || outcome.kind === 'open-unavailable')
    trackedFeedback.value = 'capabilities.pageAssociationUnavailable'
  else if (outcome.action === 'activate')
    trackedFeedback.value = 'capabilities.pageActivationRequested'

  canRecover.value =
    (outcome.kind === 'association-unavailable' && outcome.reason !== 'recovery-unavailable') ||
    outcome.kind === 'open-unavailable' ||
    (outcome.kind === 'invocation-error' && outcome.phase !== 'activate')
}

function reuseStandalone(event: MouseEvent) {
  const result = activateTrackedLink(event, destination)
  if (result === undefined) return
  trackedFeedback.value = undefined
  canRecover.value = false
  return result.then(handleTrackedOutcome)
}

function reopenStandalone() {
  const result = navigation.navigate(destination, {
    openIn: 'new-page',
    reuse: 'same-destination',
    recovery: 'reopen',
  })
  trackedFeedback.value = undefined
  canRecover.value = false
  return result.then(handleTrackedOutcome)
}
</script>

<template>
  <CapabilityRoadmapContent
    :breadcrumb="breadcrumb"
    :message="message"
    :title="title"
  >
    <template #actions>
      <div class="grid gap-content-gap">
        <a
          :href="href"
          target="_blank"
          rel="noopener"
          class="rounded-panel border-solid inline-flex max-w-full min-w-0 whitespace-normal break-words items-center justify-self-start border-border-default border-width-default min-h-target-enhanced px-button-inline text-text-primary focus-visible:underline"
          @click="openStandalone($event)"
        >
          {{ t('capabilities.openStandalone') }}
        </a>
        <p
          class="m-0 text-text-secondary"
          role="status"
        >
          {{ feedback === undefined ? '' : t(feedback) }}
        </p>
      </div>
      <div class="grid gap-content-gap">
        <a
          :href="href"
          target="_blank"
          rel="noopener"
          aria-describedby="capabilities-reuse-hint"
          class="rounded-panel border-solid inline-flex max-w-full min-w-0 whitespace-normal break-words items-center justify-self-start border-border-default border-width-default min-h-target-enhanced px-button-inline text-text-primary focus-visible:underline"
          @click="reuseStandalone($event)"
        >
          {{ t('capabilities.reuseStandalone') }}
        </a>
        <p
          id="capabilities-reuse-hint"
          class="m-0 text-text-secondary"
        >
          {{ t('capabilities.reuseStandaloneHint') }}
        </p>
        <p
          class="m-0 text-text-secondary"
          role="status"
        >
          {{ trackedFeedback === undefined ? '' : t(trackedFeedback) }}
        </p>
        <div
          v-if="canRecover"
          class="grid gap-content-gap"
        >
          <button
            type="button"
            aria-describedby="capabilities-reopen-warning"
            class="rounded-panel border-solid inline-flex max-w-full min-w-0 whitespace-normal break-words items-center justify-self-start bg-surface-panel border-border-default border-width-default min-h-target-enhanced px-button-inline text-text-primary focus-visible:underline"
            @click="reopenStandalone()"
          >
            {{ t('capabilities.reopenStandalone') }}
          </button>
          <p
            id="capabilities-reopen-warning"
            class="m-0 text-text-secondary"
          >
            {{ t('capabilities.reopenStandaloneWarning') }}
          </p>
        </div>
      </div>
    </template>
  </CapabilityRoadmapContent>
</template>
