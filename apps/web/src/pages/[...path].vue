<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { useConsoleI18n } from '../shared/i18n'
import {
  useApplicationNavigation,
  useApplicationLinkActivation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'

defineOptions({ name: 'RouteNotFoundPage' })
defineProps<{
  readonly title: string
  readonly message: string
}>()

const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const destination = registeredRouteDestination({ name: 'workbench-welcome' })
</script>

<template>
  <main
    class="leading-body font-body-family grid place-items-center min-h-dvh bg-surface-page px-page-inline py-section-block text-body text-text-primary"
  >
    <section class="wb-api mx-auto grid min-w-0 w-full items-stretch gap-content-gap max-w-content">
      <div
        class="rounded-panel grid content-center justify-items-center bg-action-primary gap-content-gap p-page-inline py-section-block text-text-on-action"
      >
        <span
          class="i-lucide-circle-alert size-icon-large"
          aria-hidden="true"
        />
        <span class="leading-title font-title-weight text-title">404</span>
      </div>
      <div class="grid min-w-0 content-center justify-items-start gap-content-gap p-page-inline">
        <h1
          class="leading-title font-title-weight m-0 text-title"
          data-route-focus="primary-heading"
          tabindex="-1"
        >
          {{ title }}
        </h1>
        <p class="m-0 text-pretty text-text-secondary">
          {{ message }}
        </p>
        <NButton
          tag="a"
          type="primary"
          class="min-h-target-enhanced"
          :href="navigation.resolveHref(destination)"
          @click="activate($event, destination)"
        >
          <template #icon>
            <span
              class="i-lucide-arrow-left"
              aria-hidden="true"
            />
          </template>
          {{ t('error.backToWorkbench') }}
        </NButton>
      </div>
    </section>
  </main>
</template>
