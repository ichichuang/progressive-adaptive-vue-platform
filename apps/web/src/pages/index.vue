<script setup lang="ts">
import { computed, onDeactivated, onScopeDispose, ref, shallowRef } from 'vue'
import { UiStatusBadge } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { builtInAppearanceThemePreviews } from '@platform/design-system'
import { useConsoleI18n } from '../shared/i18n'
import { createApiClient } from '../shared/api'
import { useApiReadBoundary } from '../app/api/api-read-boundary'
import { readUapiWorldTime, type UapiWorldTime } from '../shared/services/uapi-world-time'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import {
  useApplicationNavigation,
  useApplicationLinkActivation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
defineOptions({ name: 'WorkbenchDashboardPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const api = useApiReadBoundary()
const client = createApiClient({
  configuration: api.configuration,
  ...(api.origin === undefined ? {} : { origin: api.origin }),
})
const appearance = useAppearanceReadBoundary()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const worldTimeZone = 'Asia/Shanghai'
const state = ref<
  'unconfigured' | 'idle' | 'loading' | 'success' | 'accepted' | 'cancelled' | 'error'
>(api.configured ? 'idle' : 'unconfigured')
const data = shallowRef<UapiWorldTime | null>(null)
const detail = ref('')
let request: AbortController | null = null
function cancel(): void {
  request?.abort()
  request = null
  if (state.value === 'loading') state.value = 'cancelled'
}
onScopeDispose(cancel)
onDeactivated(cancel)
async function load(): Promise<void> {
  if (!api.configured || state.value === 'loading') return
  const attempt = new AbortController()
  request = attempt
  state.value = 'loading'
  detail.value = ''
  try {
    const result = await readUapiWorldTime(client, worldTimeZone, attempt.signal)
    if (request !== attempt) return
    request = null
    if (result.status === 'failure') {
      state.value = result.error.category === 'caller-abort' ? 'cancelled' : 'error'
      detail.value = result.error.category
    } else if (result.status === 'accepted') {
      state.value = 'accepted'
    } else {
      data.value = result.data
      state.value = 'success'
    }
  } catch {
    if (request !== attempt) return
    request = null
    state.value = 'error'
    detail.value = 'network'
  }
}
const clock = computed(() => data.value?.datetime.match(/\d{2}:\d{2}:\d{2}/u)?.[0] ?? '—:—:—')
const themeLabel = computed(
  () =>
    builtInAppearanceThemePreviews.find(
      (theme) => theme.reference.themeId === appearance.snapshot.value.theme.themeId,
    )?.label ?? appearance.snapshot.value.theme.themeId,
)
const apiCopy = {
  unconfigured: { message: 'workbench.api.unconfigured', label: 'workbench.apiLabel.unconfigured' },
  idle: { message: 'workbench.api.idle', label: 'workbench.apiLabel.idle' },
  loading: { message: 'workbench.api.loading', label: 'workbench.apiLabel.loading' },
  success: { message: 'workbench.api.success', label: 'workbench.apiLabel.success' },
  accepted: { message: 'workbench.api.accepted', label: 'workbench.apiLabel.accepted' },
  cancelled: { message: 'workbench.api.cancelled', label: 'workbench.apiLabel.cancelled' },
  error: { message: 'workbench.api.error', label: 'workbench.apiLabel.error' },
} as const
const stateMessage = computed(() => t(apiCopy[state.value].message))
const links = [
  {
    key: 'workbench.colors',
    caption: 'workbench.colorsShort',
    destination: registeredRouteDestination({ name: 'workbench-colors' }),
  },
  {
    key: 'workbench.sizes',
    caption: 'workbench.sizesShort',
    destination: registeredRouteDestination({ name: 'workbench-sizes' }),
  },
  {
    key: 'workbench.typography',
    caption: 'workbench.typeShort',
    destination: registeredRouteDestination({ name: 'workbench-typography' }),
  },
  {
    key: 'workbench.interactions',
    caption: 'workbench.interactionsShort',
    destination: registeredRouteDestination({ name: 'workbench-interactions' }),
  },
] as const
const payload = computed(() =>
  data.value ? JSON.stringify(data.value, null, 2) : t('workbench.noResponse'),
)
const settings = registeredRouteDestination({ name: 'control-center' })
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <template #actions>
      <NButton
        tag="a"
        quaternary
        class="wb-link min-h-target-enhanced"
        :href="navigation.resolveHref(settings)"
        @click="activate($event, settings)"
      >
        {{ t('workbench.settings') }} ↗
      </NButton>
    </template>
    <section
      class="wb-api grid items-start gap-content-gap"
      :aria-label="t('workbench.worldTime')"
    >
      <div
        class="wb-clock-plane rounded-panel grid relative overflow-hidden isolate bg-action-primary p-page-inline text-text-on-action"
      >
        <div
          class="wb-clock-top flex flex-wrap items-center justify-between relative gap-content-gap"
        >
          <span> UApi / {{ t('workbench.worldTime') }} </span>
          <span> GET </span>
        </div>
        <div
          class="wb-clock-content grid content-center justify-items-start relative gap-content-gap py-section-block"
        >
          <span class="wb-kicker font-title-weight m-0">
            {{ t('workbench.beijing') }}
          </span>
          <time
            class="wb-clock leading-title font-title-weight block tabular-nums layout-narrow:text-title layout-regular:text-title"
            :datetime="data?.datetime"
          >
            {{ clock }}
          </time>
          <span class="text-body">
            {{ data?.datetime ?? t('workbench.awaitingResponse') }}
          </span>
        </div>
        <div
          class="wb-clock-bottom flex flex-wrap items-center justify-between relative gap-content-gap"
        >
          <span>
            {{ data?.timezone ?? '—' }}
          </span>
          <span>
            {{ data?.offset_string ?? '—' }}
          </span>
        </div>
      </div>
      <NCard
        :bordered="false"
        class="min-w-0"
        content-class="wb-api-inspector grid min-w-0 gap-content-gap"
      >
        <div class="wb-section-head flex flex-wrap items-center justify-between gap-content-gap">
          <div>
            <p class="wb-kicker font-title-weight m-0 text-text-secondary">
              {{ t('workbench.realRequest') }}
            </p>
            <h2 class="leading-title font-title-weight m-0 text-title">
              {{ t('workbench.response') }}
            </h2>
          </div>
          <UiStatusBadge
            :tone="state === 'success' ? 'complete' : state === 'loading' ? 'active' : 'inactive'"
            :label="t(apiCopy[state].label)"
          />
        </div>
        <code class="text-text-secondary"> GET /v1/misc/worldtime?city={{ worldTimeZone }} </code>
        <p
          class="wb-feedback m-0 flex flex-wrap items-center gap-content-gap text-text-secondary"
          role="status"
          aria-live="polite"
        >
          {{ stateMessage }}
          <span v-if="detail"> · {{ detail }} </span>
        </p>
        <div class="wb-page-actions flex flex-wrap items-center justify-between gap-content-gap">
          <NButton
            type="primary"
            :loading="state === 'loading' && appearance.snapshot.value.motion === 'full'"
            :aria-busy="state === 'loading'"
            :disabled="!api.configured || state === 'loading'"
            @click="load"
          >
            {{ t(data ? 'workbench.refresh' : 'workbench.request') }}
          </NButton>
          <NButton
            v-show="state === 'loading'"
            @click="cancel"
          >
            {{ t('workbench.cancel') }}
          </NButton>
        </div>
        <pre
          class="wb-payload m-0 rounded-control whitespace-pre-wrap break-anywhere overflow-auto bg-surface-page p-page-inline text-text-primary"
          tabindex="0"
          :aria-label="t('workbench.response')"
          v-text="payload"
        />
      </NCard>
    </section>
    <section
      class="grid gap-content-gap"
      :aria-label="t('workbench.explore')"
    >
      <div class="wb-section-head flex flex-wrap items-center justify-between gap-content-gap">
        <h2 class="leading-title font-title-weight m-0 text-title">
          {{ t('workbench.explore') }}
        </h2>
        <span class="text-text-secondary">
          {{ themeLabel }}
        </span>
      </div>
      <div class="wb-capability-links grid gap-content-gap">
        <NCard
          v-for="item in links"
          :key="item.key"
          tag="a"
          :bordered="false"
          hoverable
          class="wb-link wb-capability-link no-underline min-w-0 text-text-primary"
          content-class="wb-capability-content grid min-w-0 items-center gap-content-gap"
          :href="navigation.resolveHref(item.destination)"
          @click="activate($event, item.destination)"
        >
          <span
            class="wb-capability-mark font-title-weight text-control-primary text-title"
            aria-hidden="true"
          >
            <span
              v-if="item.key === 'workbench.colors'"
              class="i-lucide-palette"
            />
            <span
              v-else-if="item.key === 'workbench.sizes'"
              class="i-lucide-ruler"
            />
            <span
              v-else-if="item.key === 'workbench.typography'"
              class="i-lucide-type"
            />
            <span
              v-else
              class="i-lucide-sparkles"
            />
          </span>
          <strong class="font-title-weight">
            {{ t(item.key) }}
          </strong>
          <span class="col-start-2 text-text-secondary">
            {{ t(item.caption) }}
          </span>
          <span
            class="col-start-3 row-start-1"
            aria-hidden="true"
          >
            ↗
          </span>
        </NCard>
      </div>
    </section>
  </WorkbenchPage>
</template>
