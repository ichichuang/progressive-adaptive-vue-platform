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
import { z } from 'zod'
import { NButton } from 'naive-ui/es/button'
import { NSelect } from 'naive-ui/es/select'
import { NTag } from 'naive-ui/es/tag'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { createApiClient, type ApiFetch } from '../../../shared/api'
import {
  createApiQueryRuntime,
  ApiQueryAccepted,
  ApiQueryError,
  type ApiReadEndpoint,
} from '../../../shared/query'
import { useConsoleI18n } from '../../../shared/i18n'

import { routerScrollControllerKey } from '../../router/router-scroll-controller'

const { t } = useConsoleI18n()
const active = ref(true)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('API query requires the Router Scroll Controller port.')
let unregister: (() => void) | undefined
function connect(controller: UiScrollController | null): void {
  unregister?.()
  unregister = undefined
  if (controller && active.value) unregister = register?.(controller)
}
onActivated(() => {
  active.value = true
})
const productId = ref(1)
const responseMode = ref('success')
const calls = ref(0)
const operationCalls = ref(0)
const pending = ref(false)
const secondVisible = ref(true)
const notice = ref<'idle' | 'success' | 'failure' | 'accepted' | 'cancelled' | 'invalidated'>(
  'idle',
)
const schema = z.object({ id: z.number(), title: z.string(), revision: z.number() })
type Product = z.infer<typeof schema>
const endpoint: ApiReadEndpoint<Product> = {
  id: 'showcase.query.product',
  method: 'GET',
  path: ['products'],
  policy: 'standard',
  authentication: 'anonymous',
  response: { mode: 'json', mimeTypes: ['application/json'], schema },
}
const fetcher: ApiFetch = async (url, input) => {
  const revision = ++calls.value
  const mode = responseMode.value
  await new Promise<void>((resolve, reject) => {
    const signal = input.signal
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, 800)
    const abort = () => {
      clearTimeout(timer)
      cleanup()
      reject(new DOMException('Cancelled', 'AbortError'))
    }
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
  const id = Number(url.searchParams.get('id'))
  return Response.json(
    { id, title: `PAVP ${String(id)}`, revision },
    { status: mode === 'failure' ? 503 : mode === 'accepted' ? 202 : 200 },
  )
}
const runtime = createApiQueryRuntime(
  createApiClient({
    configuration: { status: 'configured', baseUrl: 'https://query-demo.invalid/' },
    fetch: fetcher,
  }),
)
const options = computed(() => runtime.queryOptions(endpoint, { query: { id: productId.value } }))
const data = shallowRef<Product>()
const invalidated = ref(false)
function sync(): void {
  data.value = runtime.queryClient.getQueryData(options.value.queryKey)
  invalidated.value =
    runtime.queryClient.getQueryState(options.value.queryKey)?.isInvalidated ?? false
}
const unsubscribe = runtime.queryClient.getQueryCache().subscribe(sync)
watch(productId, () => {
  notice.value = 'idle'
  operationCalls.value = 0
  sync()
})
let sequence = 0
let startCalls = 0
async function read(): Promise<void> {
  if (pending.value) return
  const current = ++sequence
  const before = calls.value
  startCalls = before
  operationCalls.value = 0
  pending.value = true
  const captured = options.value
  try {
    await Promise.all(
      (secondVisible.value ? [1, 2] : [1]).map(() => runtime.queryClient.query(captured)),
    )
    if (current === sequence) notice.value = 'success'
  } catch (error) {
    if (current === sequence)
      notice.value =
        error instanceof ApiQueryAccepted
          ? 'accepted'
          : error instanceof ApiQueryError
            ? 'failure'
            : 'cancelled'
  } finally {
    if (current === sequence) {
      pending.value = false
      operationCalls.value = calls.value - before
      sync()
    }
  }
}
async function cancel(): Promise<void> {
  ++sequence
  await runtime.queryClient.cancelQueries()
  pending.value = false
  notice.value = 'cancelled'
  operationCalls.value = calls.value - startCalls
  sync()
}
async function invalidate(): Promise<void> {
  await runtime.queryClient.invalidateQueries({
    queryKey: options.value.queryKey,
    exact: true,
    refetchType: 'none',
  })
  notice.value = 'invalidated'
}
onDeactivated(() => {
  active.value = false
  connect(null)
  if (pending.value) void cancel()
})
onScopeDispose(() => {
  connect(null)
  ++sequence
  unsubscribe()
  void runtime.dispose()
})
const noticeLabels = {
  idle: 'apiShowcase.query.idle',
  success: 'apiShowcase.query.success',
  failure: 'apiShowcase.query.failure',
  accepted: 'apiShowcase.query.accepted',
  cancelled: 'apiShowcase.query.cancelled',
  invalidated: 'apiShowcase.query.invalidated',
} as const
const status = computed(() => t(noticeLabels[notice.value]))
const productOptions = [1, 2].map((value) => ({ value, label: `PAVP ${String(value)}` }))
const modeOptions = computed(() => [
  { value: 'success', label: t('apiShowcase.query.validResponse') },
  { value: 'failure', label: 'HTTP 503' },
  { value: 'accepted', label: 'HTTP 202' },
])
</script>
<template>
  <section
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
    data-api-query-demo
  >
    <div class="shrink-0 grid grid-cols-2 min-w-0 gap-component-unit">
      <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
        {{ t('apiShowcase.query.parameter') }}
        <NSelect
          v-model:value="productId"
          :options="productOptions"
          :disabled="pending"
          :aria-label="t('apiShowcase.query.parameter')"
        />
      </div>
      <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
        {{ t('apiShowcase.query.nextResponse') }}
        <NSelect
          v-model:value="responseMode"
          :options="modeOptions"
          :disabled="pending"
          :aria-label="t('apiShowcase.query.nextResponse')"
        />
      </div>
    </div>
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="connect"
    >
      <div class="grid min-w-0 gap-content-gap">
        <div
          class="grid grid-cols-1 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        >
          <section
            v-for="consumer in secondVisible ? [1, 2] : [1]"
            :key="consumer"
            class="wb-form-panel-header rounded-panel grid bg-surface-panel gap-component-unit"
            :aria-label="`${t('apiShowcase.query.consumer')} ${consumer}`"
          >
            <h2 class="font-title-weight m-0 text-body">
              {{ t('apiShowcase.query.consumer') }} {{ consumer }}
            </h2>
            <template v-if="data">
              <p class="m-0 text-text-primary text-title">
                {{ data.title }}
              </p>
              <p class="m-0 text-caption text-text-secondary">
                {{ t('apiShowcase.query.revision') }} {{ data.revision }}
              </p>
              <NTag
                size="small"
                :bordered="false"
              >
                {{
                  invalidated
                    ? t('apiShowcase.query.invalidatedTag')
                    : t('apiShowcase.query.cached')
                }}
              </NTag>
            </template>
            <p
              v-else
              class="m-0 text-body text-text-secondary"
            >
              {{ t('apiShowcase.query.empty') }}
            </p>
          </section>
        </div>
        <p class="m-0 text-body text-text-primary">
          {{ t('apiShowcase.query.calls') }} {{ calls }} ·
          {{ t('apiShowcase.query.operationCalls') }} {{ operationCalls }}
        </p>
        <p class="m-0 text-caption text-text-secondary">
          {{ t('apiShowcase.query.policy') }}
        </p>
        <p class="m-0 break-anywhere text-caption text-text-secondary">
          {{ JSON.stringify(options.queryKey) }}
        </p>
        <NButton
          class="justify-self-start"
          :disabled="pending"
          @click="secondVisible = !secondVisible"
        >
          {{ secondVisible ? t('apiShowcase.query.unmount') : t('apiShowcase.query.remount') }}
        </NButton>
      </div>
    </UiScrollArea>
    <footer class="shrink-0 grid gap-component-unit">
      <p
        class="m-0 text-caption text-text-secondary"
        role="status"
        aria-live="polite"
      >
        {{ pending ? t('apiShowcase.query.loading') : status }}
      </p>
      <div class="flex flex-wrap items-center gap-component-unit">
        <NButton
          type="primary"
          :disabled="pending"
          @click="read"
        >
          {{ t('apiShowcase.query.read') }}
        </NButton>
        <NButton
          :disabled="pending || !data"
          @click="invalidate"
        >
          {{ t('apiShowcase.query.invalidate') }}
        </NButton>
        <NButton
          v-if="pending"
          @click="cancel"
        >
          {{ t('apiShowcase.query.cancel') }}
        </NButton>
      </div>
    </footer>
  </section>
</template>
