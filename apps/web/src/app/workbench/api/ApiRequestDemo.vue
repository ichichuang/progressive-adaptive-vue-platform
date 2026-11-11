<script setup lang="ts">
import {
  computed,
  inject,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
} from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSelect } from 'naive-ui/es/select'
import { NTag } from 'naive-ui/es/tag'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { UiCopyAction, UiScrollArea, type UiScrollController } from '@platform/ui'
import WorkbenchPage from '../WorkbenchPage.vue'
import ApiResponseView from './ApiResponseView.vue'
import {
  apiDemoScenarioGroups,
  runApiDemo,
  type ApiDemoScenario,
  type ApiDemoOutcome,
} from './api-demo-scenarios'
import { apiShowcasePages, apiScenarioLabels, type ApiShowcaseCapability } from './api-showcase'
import { createApiClient } from '../../../shared/api'
import { readUapiWorldTime } from '../../../shared/services/uapi-world-time'
import { useConsoleI18n } from '../../../shared/i18n'
import { useApiReadBoundary } from '../../api/api-read-boundary'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly capability: Exclude<ApiShowcaseCapability, 'query' | 'integration' | 'advanced'>
}>()
const { t } = useConsoleI18n()
const boundary = useApiReadBoundary()
type Scenario = ApiDemoScenario | 'world-time'
const available = computed<readonly Scenario[]>(() =>
  props.capability === 'basics'
    ? [...apiDemoScenarioGroups.basics, 'world-time', ...apiDemoScenarioGroups.parameters]
    : apiDemoScenarioGroups[props.capability],
)
const scenario = ref<Scenario>(available.value[0] ?? 'json')
const options = computed(() =>
  available.value.map((value) => ({ value, label: t(apiScenarioLabels[value]) })),
)
const productId = ref(1)
const search = ref('phone')
const city = ref('Shanghai')
const panel = ref('request')
const active = ref(true)
const pending = ref(false)
const elapsed = ref(0)
const outcome = shallowRef<ApiDemoOutcome | null>(null)
const previous = shallowRef<ApiDemoOutcome | null>(null)
const sent = ref('')
const signature = computed(() =>
  JSON.stringify({
    scenario: scenario.value,
    productId: productId.value,
    search: search.value,
    city: city.value,
  }),
)
const changed = computed(() => sent.value !== '' && sent.value !== signature.value)
const remote = computed(() => ['product', 'search', 'world-time'].includes(scenario.value))
const hint = computed(() =>
  scenario.value === 'world-time'
    ? 'apiShowcase.timeHint'
    : (apiShowcasePages.find((page) => page.id === props.capability)?.hint ??
      'apiShowcase.localHint'),
)
const copy = computed(() =>
  [
    t('apiShowcase.copyIntro'),
    props.title,
    t(apiScenarioLabels[scenario.value]),
    t(remote.value ? 'apiShowcase.publicHint' : 'apiShowcase.localHint'),
    t('apiShowcase.copyBoundary'),
    'createApiClient · ApiEndpoint · ApiResult · AbortSignal',
    'apps/web/src/shared/api/index.ts',
    'apps/web/src/app/workbench/api/api-demo-scenarios.ts',
    scenario.value === 'world-time'
      ? "readUapiWorldTime(client, 'Shanghai', signal) · apps/web/src/shared/services/uapi-world-time.ts"
      : `runApiDemo('${scenario.value}', { signal, productId: 1, search: 'phone' })`,
  ].join('\n\n'),
)
let controller: AbortController | undefined
let timer: ReturnType<typeof setInterval> | undefined
let revision = 0
function clearTimer(): void {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}
function cancel(): void {
  controller?.abort()
}
function stop(): void {
  revision++
  cancel()
  controller = undefined
  clearTimer()
  pending.value = false
}
function reset(): void {
  stop()
  outcome.value = null
  previous.value = null
  elapsed.value = 0
  sent.value = ''
  panel.value = 'request'
}
async function send(): Promise<void> {
  stop()
  const current = ++revision
  const request = new AbortController()
  controller = request
  const selected = scenario.value
  const id = productId.value
  const term = search.value
  const selectedCity = city.value
  sent.value = signature.value
  pending.value = true
  elapsed.value = 0
  panel.value = 'result'
  const started = performance.now()
  timer = setInterval(() => {
    elapsed.value = performance.now() - started
  }, 100)
  try {
    let next: ApiDemoOutcome
    if (selected === 'world-time') {
      const result = await readUapiWorldTime(
        createApiClient({
          configuration: boundary.configuration,
          ...(boundary.origin ? { origin: boundary.origin } : {}),
        }),
        selectedCity,
        request.signal,
      )
      next = {
        result,
        elapsedMilliseconds: performance.now() - started,
        evidence: {
          transport: 'public',
          method: 'GET',
          url: 'v1/misc/worldtime?city=' + encodeURIComponent(selectedCity),
          bodyKind: 'none',
          bodyPreview: null,
          calls: null,
          authorization: null,
        },
      }
    } else
      next = await runApiDemo(selected, { signal: request.signal, productId: id, search: term })
    if (current !== revision || !active.value) return
    outcome.value = next
    if (next.result.status === 'success') previous.value = next
    elapsed.value = next.elapsedMilliseconds
  } finally {
    if (current === revision) {
      clearTimer()
      pending.value = false
      controller = undefined
    }
  }
}
function switchProduct(id: number): void {
  productId.value = id
  scenario.value = 'delay'
  void send()
}
function recover(): void {
  scenario.value = 'recovery'
  void send()
}
watch(
  scenario,
  () => {
    if (pending.value) stop()
  },
  { flush: 'sync' },
)
const status = computed(() =>
  pending.value
    ? 'apiShowcase.pending'
    : outcome.value === null
      ? 'apiShowcase.idle'
      : outcome.value.result.status === 'failure'
        ? outcome.value.result.error.category === 'caller-abort'
          ? 'apiShowcase.cancelled'
          : 'apiShowcase.failed'
        : outcome.value.result.status === 'accepted'
          ? 'apiShowcase.accepted'
          : 'apiShowcase.success',
)
const sendDisabled = computed(
  () =>
    pending.value ||
    (scenario.value === 'world-time' && (!boundary.configured || !city.value.trim())) ||
    (scenario.value === 'product' && !productId.value),
)
const primaryLabel = computed(() =>
  t(
    outcome.value?.result.status === 'failure'
      ? 'apiShowcase.retry'
      : remote.value
        ? 'apiShowcase.send'
        : 'apiShowcase.test',
  ),
)
const statusText = computed(
  () =>
    `${t(changed.value ? 'apiShowcase.changed' : status.value)}${pending.value || outcome.value ? ` · ${(elapsed.value / 1000).toFixed(1)} s` : ''}`,
)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('API showcase requires the Router Scroll Controller port.')
let unregister: (() => void) | undefined
function connect(scroll: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (scroll && active.value) unregister = register?.(scroll)
}
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
  stop()
  connect(null)
})
onScopeDispose(() => {
  stop()
  connect(null)
})
</script>
<template>
  <WorkbenchPage
    contained
    :title="title"
    :message="message"
    class="wb-form-page mx-auto w-full"
    :data-api-capability="capability"
  >
    <template #actions>
      <UiCopyAction
        variant="text"
        :value="copy"
        :label="t('formShowcase.copyAI')"
        :copy-label="t('workbench.copy')"
        :success-label="t('workbench.copied')"
        :failure-label="t('workbench.copyFailed')"
      />
    </template>
    <div class="flex shrink-0 flex-wrap min-w-0 items-center justify-between gap-component-unit">
      <NTag
        size="small"
        :bordered="false"
      >
        {{ t(remote ? 'apiShowcase.public' : 'apiShowcase.local') }}
      </NTag>
      <div class="hidden layout-narrow:block">
        <NRadioGroup
          v-model:value="panel"
          size="small"
          :name="`api-${capability}-panel`"
          :aria-label="t('apiShowcase.result')"
        >
          <NRadioButton value="request">
            {{ t('apiShowcase.request') }}
          </NRadioButton>
          <NRadioButton value="result">
            {{ t('apiShowcase.result') }}
          </NRadioButton>
        </NRadioGroup>
      </div>
    </div>
    <div
      class="flex-1 grid grid-cols-5 grid-rows-1 min-h-0 min-w-0 gap-content-gap layout-narrow:grid-cols-1"
      :data-panel="panel"
    >
      <section
        class="rounded-panel flex flex-col col-span-2 min-h-0 min-w-0 overflow-hidden bg-surface-panel layout-narrow:col-span-1"
        :aria-label="t('apiShowcase.request')"
        :class="panel === 'result' ? 'layout-narrow:hidden' : ''"
      >
        <header class="wb-form-panel-header shrink-0">
          <h2 class="font-title-weight m-0 text-body text-text-primary">
            {{ t('apiShowcase.request') }}
          </h2>
        </header>
        <UiScrollArea
          :owner-id="`api-${capability}-request`"
          :enabled="active"
          class="flex-1 min-h-0"
        >
          <form
            :id="`api-${capability}-form`"
            class="wb-form-scroll-content grid min-w-0 gap-content-gap"
            @submit.prevent="send"
          >
            <div class="grid min-w-0 gap-component-unit">
              <span
                class="text-caption text-text-secondary"
                v-text="t('apiShowcase.scenarioLabel')"
              />
              <NSelect
                v-model:value="scenario"
                :options="options"
                :aria-label="t('apiShowcase.scenarioLabel')"
                to="#pavp-overlay-root"
              />
            </div>
            <div
              v-if="scenario === 'product'"
              class="grid gap-component-unit"
            >
              <span
                class="text-caption text-text-secondary"
                v-text="t('apiShowcase.productId')"
              />
              <NInputNumber
                v-model:value="productId"
                :min="1"
                :max="10000"
                :precision="0"
                :show-button="false"
                :aria-label="t('apiShowcase.productId')"
              />
            </div>
            <div
              v-if="scenario === 'search' || scenario === 'query'"
              class="grid gap-component-unit"
            >
              <span
                class="text-caption text-text-secondary"
                v-text="t('apiShowcase.search')"
              />
              <NInput
                v-model:value="search"
                :maxlength="100"
                :aria-label="t('apiShowcase.search')"
              />
            </div>
            <div
              v-if="scenario === 'world-time'"
              class="grid gap-component-unit"
            >
              <span
                class="text-caption text-text-secondary"
                v-text="t('apiShowcase.city')"
              />
              <NInput
                v-model:value="city"
                :maxlength="100"
                :aria-label="t('apiShowcase.city')"
              />
            </div>
            <p class="m-0 text-body text-text-secondary">
              {{ t(hint) }}
            </p>
            <p
              v-if="hint !== 'apiShowcase.publicHint'"
              class="m-0 text-caption text-text-secondary"
            >
              {{ t(remote ? 'apiShowcase.publicHint' : 'apiShowcase.localHint') }}
            </p>
            <p
              v-if="scenario === 'world-time' && !boundary.configured"
              class="m-0 text-body text-control-error"
            >
              {{ t('apiShowcase.unconfigured') }}
            </p>
            <div
              v-if="capability === 'cancellation'"
              class="grid gap-component-unit"
            >
              <span
                class="text-caption text-text-secondary"
                v-text="t('apiShowcase.quickSwitch')"
              />
              <div class="flex flex-wrap gap-component-unit">
                <NButton
                  v-for="id in [1, 2, 3]"
                  :key="id"
                  :type="productId === id ? 'primary' : 'default'"
                  secondary
                  class="min-h-target-enhanced"
                  @click="switchProduct(id)"
                >
                  {{ t('apiShowcase.productId') }} {{ id }}
                </NButton>
              </div>
              <p class="m-0 text-caption text-text-secondary">
                {{ t('apiShowcase.quickHint') }}
              </p>
            </div>
          </form>
        </UiScrollArea>
      </section>
      <section
        class="rounded-panel flex flex-col col-span-3 min-h-0 min-w-0 overflow-hidden bg-surface-panel layout-narrow:col-span-1"
        :aria-label="t('apiShowcase.result')"
        :class="panel === 'request' ? 'layout-narrow:hidden' : ''"
      >
        <header class="wb-form-panel-header shrink-0">
          <h2 class="font-title-weight m-0 text-body text-text-primary">
            {{ t('apiShowcase.result') }}
          </h2>
        </header>
        <UiScrollArea
          owner-id="architecture-console-content"
          :enabled="active"
          class="flex-1 min-h-0"
          @controller="connect"
        >
          <div class="wb-form-scroll-content">
            <ApiResponseView
              :outcome="outcome"
              :previous="previous"
              :pending="pending"
            />
          </div>
        </UiScrollArea>
      </section>
    </div>
    <footer
      class="flex shrink-0 flex-wrap min-w-0 items-center gap-content-gap"
      data-api-actions
    >
      <NButton
        type="primary"
        attr-type="submit"
        :form="`api-${capability}-form`"
        class="min-h-target-enhanced"
        :disabled="sendDisabled"
      >
        {{ primaryLabel }}
      </NButton>
      <NButton
        v-if="pending"
        class="min-h-target-enhanced"
        @click="cancel"
      >
        {{ t('apiShowcase.cancel') }}
      </NButton>
      <NButton
        v-else-if="capability === 'errors' && scenario !== 'recovery'"
        class="min-h-target-enhanced"
        @click="recover"
      >
        {{ t('apiShowcase.recover') }}
      </NButton>
      <NButton
        quaternary
        class="min-h-target-enhanced"
        :disabled="pending"
        @click="reset"
      >
        {{ t('apiShowcase.reset') }}
      </NButton>
      <p
        class="m-0 min-w-0 text-caption text-text-secondary"
        role="status"
        aria-live="polite"
        v-text="statusText"
      />
    </footer>
  </WorkbenchPage>
</template>
