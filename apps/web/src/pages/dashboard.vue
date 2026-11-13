<script setup lang="ts">
import { computed, onDeactivated, onScopeDispose, ref, shallowRef } from 'vue'
import { UiScrollArea, UiStatusBadge, formatUiDateTime, useUiDateTime } from '@platform/ui'
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
import DashboardComposer from '../app/workbench/dashboard/DashboardComposer.vue'
import { NRadioGroup, NRadioButton } from 'naive-ui/es/radio'
const dashboardView = ref<'board' | 'overview'>('board')
defineOptions({ name: 'WorkbenchDashboardPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t, locale } = useConsoleI18n()
const api = useApiReadBoundary()
const client = createApiClient({
  configuration: api.configuration,
  ...(api.origin === undefined ? {} : { origin: api.origin }),
})
const appearance = useAppearanceReadBoundary()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const displayDateTime = useUiDateTime()
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
const clock = computed(() =>
  data.value === null
    ? '—:—:—'
    : (formatUiDateTime(
        { kind: 'timestamp', value: data.value.timestamp_unix, unit: 'seconds' },
        displayDateTime.value ?? {
          locale: locale.value,
          timeZone: worldTimeZone,
          hourCycle: 'h23',
        },
        'time',
      ) ?? '—:—:—'),
)
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
const destinations = [
  {
    name: 'component-form-overview',
    title: 'dashboard.forms',
    hint: 'dashboard.formsHint',
    icon: 'i-lucide-list-checks',
    tone: 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground',
  },
  {
    name: 'component-table-overview',
    title: 'dashboard.tables',
    hint: 'dashboard.tablesHint',
    icon: 'i-lucide-table-2',
    tone: 'bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground',
  },
  {
    name: 'component-charts',
    title: 'dashboard.charts',
    hint: 'dashboard.chartsHint',
    icon: 'i-lucide-chart-no-axes-combined',
    tone: 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground',
  },
] as const
</script>
<template>
  <WorkbenchPage
    :title="title"
    :message="dashboardView === 'overview' ? t('dashboard.lead') : ''"
    contained
  >
    <template #actions>
      <NRadioGroup
        v-model:value="dashboardView"
        name="dashboard-view"
        :aria-label="t('dashboardBoard.view')"
      >
        <NRadioButton value="board">
          {{ t('dashboardBoard.board') }}
        </NRadioButton>
        <NRadioButton value="overview">
          {{ t('dashboardBoard.overview') }}
        </NRadioButton>
      </NRadioGroup>
    </template>
    <DashboardComposer :view="dashboardView">
      <div class="grid gap-content-gap">
        <div class="flex flex-wrap items-center justify-between gap-content-gap">
          <div class="flex flex-wrap items-center gap-component-unit text-body text-text-secondary">
            <span v-text="themeLabel" />
          </div>
          <NButton
            secondary
            @click="navigation.navigate(registeredRouteDestination({ name: 'control-center' }))"
          >
            {{ t('welcome.cta.settings') }}
          </NButton>
        </div>
        <section
          class="wb-home-feature-grid grid min-w-0 gap-content-gap"
          :aria-label="t('workbench.explore')"
        >
          <NCard
            v-for="item in destinations"
            :key="item.name"
            tag="a"
            :href="navigation.resolveHref(registeredRouteDestination({ name: item.name }))"
            :bordered="false"
            hoverable
            class="wb-overview-card wb-link min-w-0"
            @click="activate($event, registeredRouteDestination({ name: item.name }))"
          >
            <div class="grid gap-content-gap">
              <div class="flex items-center justify-between">
                <div
                  class="wb-capability-mark rounded-control inline-flex text-title"
                  :class="
                    item.name === 'component-table-overview'
                      ? 'bg-expression-accent-b-soft-background text-expression-accent-b-soft-foreground'
                      : 'bg-expression-accent-a-soft-background text-expression-accent-a-soft-foreground'
                  "
                >
                  <div
                    :class="
                      item.name === 'component-form-overview'
                        ? 'i-lucide-list-checks'
                        : item.name === 'component-table-overview'
                          ? 'i-lucide-table-2'
                          : 'i-lucide-chart-no-axes-combined'
                    "
                    aria-hidden="true"
                  />
                </div>
                <div
                  class="i-lucide-arrow-right text-text-secondary"
                  aria-hidden="true"
                />
              </div>
              <strong class="text-subheading text-text-primary">{{ t(item.title) }}</strong>
              <p class="m-0 text-body text-text-secondary">
                {{ t(item.hint) }}
              </p>
            </div>
          </NCard>
        </section>
        <section
          class="wb-home-dashboard-grid grid min-w-0 gap-content-gap"
          :aria-label="t('workbench.worldTime')"
        >
          <div class="rounded-panel grid min-w-0 bg-surface-panel gap-content-gap p-page-inline">
            <h2 class="m-0 text-subheading">
              {{ t('dashboard.foundation') }}
            </h2>
            <NButton
              v-for="item in links"
              :key="item.key"
              quaternary
              block
              @click="navigation.navigate(item.destination)"
            >
              <div class="flex w-full items-center justify-between gap-content-gap">
                {{ t(item.key) }}
                <div
                  class="i-lucide-arrow-right"
                  aria-hidden="true"
                />
              </div>
            </NButton>
          </div>
          <div class="rounded-panel grid min-w-0 bg-surface-panel gap-content-gap p-page-inline">
            <div class="flex flex-wrap items-center justify-between gap-content-gap">
              <h2 class="m-0 text-subheading">
                {{ t('workbench.worldTime') }}
              </h2>
              <UiStatusBadge
                :tone="
                  state === 'success' ? 'complete' : state === 'loading' ? 'active' : 'inactive'
                "
                :label="t(apiCopy[state].label)"
              />
            </div>
            <div class="grid min-w-0 gap-content-gap">
              <div class="text-caption text-text-secondary">
                {{ displayDateTime?.timeZone ?? worldTimeZone }}
              </div>
              <time
                class="wb-home-clock leading-title font-title-weight tabular-nums text-expression-accent-b-foreground"
                :datetime="data?.datetime"
                v-text="clock"
              />
              <div class="break-anywhere text-caption text-text-secondary">
                {{ data?.datetime ?? t('workbench.awaitingResponse') }}
              </div>
            </div>
            <div class="wb-feedback">
              <UiScrollArea owner-id="dashboard-feedback">
                <p
                  class="m-0 text-caption text-text-secondary"
                  role="status"
                  aria-live="polite"
                  v-text="detail ? `${stateMessage} · ${detail}` : stateMessage"
                />
              </UiScrollArea>
            </div>
            <div class="flex flex-wrap gap-component-unit">
              <NButton
                type="primary"
                :loading="state === 'loading' && appearance.snapshot.value.motion === 'full'"
                :aria-busy="state === 'loading'"
                :disabled="!api.configured || state === 'loading'"
                @click="load"
              >
                <div v-text="t(data ? 'workbench.refresh' : 'workbench.request')" />
              </NButton>
              <!-- Cancellation remains reachable while the request runs. -->
              <NButton
                v-show="state === 'loading'"
                @click="cancel"
              >
                {{ t('workbench.cancel') }}
              </NButton>
            </div>
          </div>
        </section>
      </div>
    </DashboardComposer>
  </WorkbenchPage>
</template>
