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
const feedback = ref<ConsoleMessageKey>()

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
    </template>
  </CapabilityRoadmapContent>
</template>
