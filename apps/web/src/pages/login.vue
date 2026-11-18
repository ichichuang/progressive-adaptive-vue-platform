<script setup lang="ts">
import {
  inject,
  onBeforeUnmount,
  shallowRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NFormItem } from 'naive-ui/es/form'
import { NInput } from 'naive-ui/es/input'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { useApplicationNavigation } from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'
import { routerScrollControllerKey } from '../app/router/router-scroll-controller'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'StandaloneLoginPage' })
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const welcome = registeredRouteDestination({ name: 'workbench-welcome' })
const registerScroll = inject(routerScrollControllerKey)
const id = useId()
const account = shallowRef('')
const password = shallowRef('')
const passwordVisible = shallowRef(false)
const navigating = shallowRef(false)
const composing = shallowRef(false)
let composingEnter = false
let unregisterScroll: (() => void) | undefined

function connectScroll(controller: UiScrollController | null): void {
  unregisterScroll?.()
  unregisterScroll = controller ? registerScroll?.(controller) : undefined
}

function clearFields(): void {
  account.value = ''
  password.value = ''
  passwordVisible.value = false
}

function recordEnter(event: KeyboardEvent): void {
  // Some IMEs finish composition before dispatching their confirming Enter key.
  if (event.key !== 'Enter') return
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- 229 is the remaining IME compatibility signal.
  composingEnter = composing.value || event.isComposing || event.keyCode === 229
}

function releaseEnter(event: KeyboardEvent): void {
  if (event.key === 'Enter') composingEnter = false
}

const inputBehavior = {
  autocomplete: 'off',
  spellcheck: false,
  onCompositionstart() {
    composing.value = true
  },
  onCompositionend() {
    composing.value = false
  },
  onKeydown: recordEnter,
  onKeyup: releaseEnter,
} satisfies InputHTMLAttributes

async function openWelcome(): Promise<void> {
  if (composing.value || composingEnter || navigating.value) return
  navigating.value = true
  clearFields()
  try {
    await navigation.navigate(welcome)
  } finally {
    navigating.value = false
  }
}

onBeforeUnmount(() => {
  clearFields()
  connectScroll(null)
})
</script>

<template>
  <UiScrollArea
    class="flex-1 min-h-0 min-w-0"
    owner-id="architecture-console-content"
    contained
    @controller="connectScroll"
  >
    <div
      class="mx-auto my-auto shrink-0 grid grid-cols-1 min-w-0 w-full items-center gap-content-gap max-w-content p-panel-narrow layout-regular:grid-cols-5 layout-wide:grid-cols-5 layout-regular:p-panel layout-wide:p-panel"
    >
      <div
        class="rounded-panel grid min-w-0 overflow-clip bg-expression-accent-a-soft-background gap-content-gap p-panel-narrow text-expression-accent-a-soft-foreground layout-regular:col-span-3 layout-wide:col-span-3 layout-regular:p-panel layout-wide:p-panel"
      >
        <div class="flex min-w-0 items-center gap-content-gap">
          <span
            class="rounded-control grid place-items-center bg-expression-accent-a-solid-background min-h-target-enhanced min-w-target-enhanced text-expression-accent-a-solid-foreground"
            aria-hidden="true"
          >
            <span class="i-lucide-layers block text-title" />
          </span>
          <p
            class="font-title-weight m-0 text-title"
            v-text="'PAVP'"
          />
        </div>
        <div
          class="rounded-panel grid grid-cols-5 min-w-0 items-center gap-content-gap p-panel-narrow layout-narrow:hidden"
          aria-hidden="true"
        >
          <div
            class="rounded-panel flex flex-col col-span-3 min-w-0 shadow-panel bg-expression-accent-a-solid-background gap-content-gap p-panel-narrow text-expression-accent-a-solid-foreground"
          >
            <span class="i-lucide-panels-top-left block text-metric" />
            <span class="i-lucide-chart-no-axes-column-increasing block text-heading" />
          </div>
          <div class="grid col-span-2 min-w-0 gap-content-gap">
            <span
              class="rounded-panel grid shadow-panel place-items-center bg-surface-panel min-h-target-enhanced text-control-primary"
            >
              <span class="i-lucide-layout-grid block text-metric" />
            </span>
            <span
              class="rounded-panel grid place-items-center bg-expression-accent-b-soft-background p-panel-narrow text-expression-accent-b-soft-foreground"
            >
              <span class="i-lucide-scan-line block text-heading" />
            </span>
          </div>
        </div>
      </div>

      <form
        class="rounded-panel grid min-w-0 shadow-panel bg-surface-panel gap-content-gap p-panel-narrow text-text-primary layout-regular:col-span-2 layout-wide:col-span-2 layout-regular:p-panel layout-wide:p-panel"
        autocomplete="off"
        novalidate
        :aria-labelledby="`${id}-title`"
        :aria-describedby="`${id}-note`"
        @submit.prevent="openWelcome"
      >
        <h1
          :id="`${id}-title`"
          class="leading-title font-title-weight m-0 text-heading"
          data-route-focus="architecture-console-page-heading"
          tabindex="-1"
        >
          {{ t('route-title.login') }}
        </h1>

        <NFormItem
          :label="t('login.account')"
          :label-props="{ for: `${id}-account` }"
          :show-feedback="false"
          :show-require-mark="false"
        >
          <NInput
            v-model:value="account"
            class="min-w-0 min-h-target-enhanced"
            size="large"
            :input-props="{ ...inputBehavior, id: `${id}-account`, autocapitalize: 'none' }"
          />
        </NFormItem>

        <NFormItem
          :label="t('login.password')"
          :label-props="{ for: `${id}-password` }"
          :show-feedback="false"
          :show-require-mark="false"
        >
          <div class="flex min-w-0 w-full items-center gap-component-unit">
            <NInput
              v-model:value="password"
              class="flex-1 min-w-0 min-h-target-enhanced"
              size="large"
              :type="passwordVisible ? 'text' : 'password'"
              :input-props="{ ...inputBehavior, id: `${id}-password` }"
            />
            <NButton
              quaternary
              attr-type="button"
              class="min-h-target-enhanced min-w-target-enhanced"
              v-bind="{ 'aria-pressed': passwordVisible === true } satisfies ButtonHTMLAttributes"
              @click="passwordVisible = !passwordVisible"
            >
              <template #icon>
                <span
                  v-if="passwordVisible"
                  class="i-lucide-eye-off"
                  aria-hidden="true"
                />
                <span
                  v-else
                  class="i-lucide-eye"
                  aria-hidden="true"
                />
              </template>
              <span class="sr-only">
                {{ t('login.showPassword') }}
              </span>
            </NButton>
          </div>
        </NFormItem>

        <NButton
          type="primary"
          attr-type="submit"
          size="large"
          block
          class="min-h-target-enhanced"
          :disabled="navigating"
        >
          {{ t('route-title.login') }}
        </NButton>
        <p
          :id="`${id}-note`"
          class="m-0 text-caption text-text-secondary"
        >
          {{ t('route-message.login') }}
        </p>
      </form>
    </div>
  </UiScrollArea>
</template>
