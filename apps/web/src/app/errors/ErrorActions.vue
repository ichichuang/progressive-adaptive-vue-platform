<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import type { AnchorHTMLAttributes } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../router/application-navigation'
import { homeRouteDestination } from '../router/route-input'

const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
</script>

<template>
  <NButton
    tag="a"
    text
    :bordered="false"
    size="large"
    native-focus-behavior
    class="error-scene__action"
    v-bind="{ href: navigation.resolveHref(homeRouteDestination) } satisfies AnchorHTMLAttributes"
    @click="activate($event, homeRouteDestination)"
  >
    <span class="error-scene__action-arrival inline-flex min-w-0 pointer-events-none">
      <span class="error-scene__action-surface">
        <span
          class="error-scene__action-arrow i-lucide-arrow-left"
          aria-hidden="true"
        />
        {{ t('error.backToHome') }}
      </span>
    </span>
  </NButton>
</template>
