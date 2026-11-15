<script setup lang="ts">
import type { AnchorHTMLAttributes } from 'vue'
import { UiCopyAction } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { useConsoleI18n } from '../../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../router/application-navigation'
import { registeredRouteDestination } from '../router/route-input'

defineProps<{ readonly code?: string }>()

const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const destination = registeredRouteDestination({ name: 'workbench-welcome' })
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-content-gap">
    <NButton
      tag="a"
      type="primary"
      class="min-h-target-enhanced"
      v-bind="{ href: navigation.resolveHref(destination) } satisfies AnchorHTMLAttributes"
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
    <UiCopyAction
      v-if="code !== undefined"
      :value="code"
      :copy-label="code"
      :label="t('error.copyCode')"
      :success-label="t('error.codeCopied')"
      :failure-label="t('error.codeCopyFailed')"
      variant="tertiary"
      class="min-h-target-enhanced"
    />
  </div>
</template>
