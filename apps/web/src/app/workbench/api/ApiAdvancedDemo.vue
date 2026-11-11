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
import { NSelect } from 'naive-ui/es/select'
import { NTag } from 'naive-ui/es/tag'
import { UiScrollArea, type UiScrollController } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import { routerScrollControllerKey } from '../../router/router-scroll-controller'
import {
  runAdvancedHooks,
  runAdvancedBatch,
  runAdvancedStream,
  type AdvancedHookEvidence,
  type AdvancedBatchProgress,
  type AdvancedStreamRow,
  type AdvancedStreamMode,
  type AdvancedStreamScenario,
} from './api-advanced-scenarios'
import type { ApiResult } from '../../../shared/api'

const capability = ref<'hooks' | 'batch' | 'stream'>('hooks')
const { t } = useConsoleI18n()
const active = ref(true)
const pending = ref(false)
const sampleTitle = ref('  PAVP sample  ')
const sampleHeader = ref('showcase')
const conversion = ref<'normalize' | 'raw'>('normalize')
const concurrency = ref(2)
const streamMode = ref<AdvancedStreamMode>('sse')
const streamScenario = ref<AdvancedStreamScenario>('valid')
const result = shallowRef<ApiResult<unknown, unknown> | null>(null)
const hooks = shallowRef<AdvancedHookEvidence | null>(null)
const batch = shallowRef<readonly ApiResult<unknown, unknown>[]>([])
const progress = shallowRef<AdvancedBatchProgress>({ calls: 0, finished: 0, inFlight: 0, peak: 0 })
const rows = shallowRef<readonly AdvancedStreamRow[]>([])
const interrupted = ref(false)
const unexpected = ref(false)
const conversionOptions = computed(() => [
  { value: 'normalize', label: t('apiShowcase.advanced.normalize') },
  { value: 'raw', label: t('apiShowcase.advanced.raw') },
])
const streamOptions = [
  { value: 'sse', label: 'SSE' },
  { value: 'ndjson', label: 'NDJSON' },
]
const scenarioOptions = computed(() => [
  { value: 'valid', label: t('apiShowcase.advanced.validStream') },
  { value: 'malformed', label: t('apiShowcase.advanced.malformedStream') },
  { value: 'schema', label: t('apiShowcase.advanced.schemaStream') },
])
const capabilityOptions = computed(() => [
  { value: 'hooks', label: t('apiShowcase.advanced.hooks') },
  { value: 'batch', label: t('apiShowcase.advanced.batch') },
  { value: 'stream', label: t('apiShowcase.advanced.stream') },
])
const concurrencyOptions = [1, 2, 4].map((value) => ({ value, label: String(value) }))
const hint = computed(() =>
  capability.value === 'hooks'
    ? t('apiShowcase.advanced.hooksHint')
    : capability.value === 'batch'
      ? t('apiShowcase.advanced.batchHint')
      : t('apiShowcase.advanced.streamHint'),
)
function resultLabel(value: ApiResult<unknown, unknown>): string {
  return value.status === 'failure'
    ? `${t('apiShowcase.advanced.failure')} · ${value.error.category}${value.error.httpStatus ? ` · HTTP ${String(value.error.httpStatus)}` : ''}`
    : `${value.status === 'accepted' ? t('apiShowcase.advanced.accepted') : t('apiShowcase.advanced.success')} · HTTP ${String(value.httpStatus)}`
}
const status = computed(() =>
  pending.value
    ? t('apiShowcase.advanced.running')
    : unexpected.value
      ? t('apiShowcase.advanced.unexpected')
      : interrupted.value
        ? t('apiShowcase.advanced.incomplete')
        : result.value
          ? resultLabel(result.value)
          : batch.value.length
            ? t('apiShowcase.advanced.batchComplete')
            : t('apiShowcase.advanced.idle'),
)
const incomplete = computed(
  () =>
    capability.value === 'stream' &&
    rows.value.length > 0 &&
    (interrupted.value || unexpected.value || result.value?.status === 'failure'),
)
let generation = 0
let controller: AbortController | undefined
function cancel(): void {
  controller?.abort()
}
function stop(): void {
  generation++
  if (pending.value) interrupted.value = true
  cancel()
  controller = undefined
  pending.value = false
}
function reset(): void {
  stop()
  result.value = null
  hooks.value = null
  batch.value = []
  rows.value = []
  progress.value = { calls: 0, finished: 0, inFlight: 0, peak: 0 }
  interrupted.value = false
  unexpected.value = false
}
async function run(): Promise<void> {
  if (pending.value) return
  reset()
  const current = ++generation
  const request = new AbortController()
  controller = request
  pending.value = true
  try {
    if (capability.value === 'hooks') {
      const outcome = await runAdvancedHooks({
        signal: request.signal,
        title: sampleTitle.value,
        header: sampleHeader.value,
        conversion: conversion.value,
      })
      if (current !== generation) return
      result.value = outcome.result
      hooks.value = outcome.evidence
    } else if (capability.value === 'batch') {
      const outcome = await runAdvancedBatch(request.signal, concurrency.value, (value) => {
        if (current === generation) progress.value = value
      })
      if (current !== generation) return
      batch.value = outcome
    } else {
      const outcome = await runAdvancedStream(
        request.signal,
        streamMode.value,
        streamScenario.value,
        (value) => {
          if (current === generation && rows.value.length < 6) rows.value = [...rows.value, value]
        },
      )
      if (current !== generation) return
      result.value = outcome
    }
    if (request.signal.aborted) interrupted.value = true
  } catch {
    if (current === generation) unexpected.value = true
  } finally {
    if (current === generation) {
      pending.value = false
      controller = undefined
    }
  }
}
watch(capability, reset)
const register = inject(routerScrollControllerKey)
if (!register) throw new Error('API advanced demo requires the Router Scroll Controller port.')
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
  <section
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
    :data-api-advanced-demo="capability"
  >
    <div class="shrink-0 min-w-0">
      <NSelect
        v-model:value="capability"
        :options="capabilityOptions"
        :aria-label="t('apiShowcase.advanced.mode')"
        to="#pavp-overlay-root"
      />
    </div>
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="connect"
    >
      <div class="grid min-w-0 gap-content-gap">
        <section
          class="wb-form-panel-header rounded-panel grid min-w-0 bg-surface-panel gap-content-gap"
        >
          <h2 class="font-title-weight m-0 text-body text-text-primary">
            {{ t('apiShowcase.advanced.configure') }}
          </h2>
          <p class="m-0 text-caption text-text-secondary">
            {{ hint }}
          </p>
          <div
            v-if="capability === 'hooks'"
            class="grid min-w-0 gap-content-gap layout-regular:grid-cols-3 layout-wide:grid-cols-3"
          >
            <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.sampleTitle') }}
              <NInput
                v-model:value="sampleTitle"
                :disabled="pending"
                :maxlength="64"
                :aria-label="t('apiShowcase.advanced.sampleTitle')"
              />
            </div>
            <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.safeHeader') }}
              <NInput
                v-model:value="sampleHeader"
                :disabled="pending"
                :maxlength="64"
                :aria-label="t('apiShowcase.advanced.safeHeader')"
              />
            </div>
            <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.responseConversion') }}
              <NSelect
                v-model:value="conversion"
                :options="conversionOptions"
                :disabled="pending"
                :aria-label="t('apiShowcase.advanced.responseConversion')"
                to="#pavp-overlay-root"
              />
            </div>
          </div>
          <div
            v-else-if="capability === 'batch'"
            class="grid gap-component-unit text-caption text-text-secondary"
          >
            {{ t('apiShowcase.advanced.concurrency') }}
            <NSelect
              v-model:value="concurrency"
              :options="concurrencyOptions"
              :disabled="pending"
              :aria-label="t('apiShowcase.advanced.concurrency')"
              to="#pavp-overlay-root"
            />
          </div>
          <div
            v-else
            class="grid grid-cols-2 min-w-0 gap-content-gap layout-narrow:grid-cols-1"
          >
            <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.protocol') }}
              <NSelect
                v-model:value="streamMode"
                :options="streamOptions"
                :disabled="pending"
                :aria-label="t('apiShowcase.advanced.protocol')"
                to="#pavp-overlay-root"
              />
            </div>
            <div class="grid min-w-0 gap-component-unit text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.scenario') }}
              <NSelect
                v-model:value="streamScenario"
                :options="scenarioOptions"
                :disabled="pending"
                :aria-label="t('apiShowcase.advanced.scenario')"
                to="#pavp-overlay-root"
              />
            </div>
          </div>
        </section>
        <section
          class="wb-form-panel-header rounded-panel grid min-w-0 bg-surface-panel gap-content-gap"
          :aria-label="t('apiShowcase.result')"
        >
          <h2 class="font-title-weight m-0 text-body text-text-primary">
            {{ t('apiShowcase.result') }}
          </h2>
          <template v-if="capability === 'hooks' && hooks">
            <div
              v-for="entry in [
                { title: t('apiShowcase.advanced.before'), value: hooks.before },
                { title: t('apiShowcase.advanced.sent'), value: hooks.sent },
                { title: t('apiShowcase.advanced.rawResponse'), value: hooks.raw },
                { title: t('apiShowcase.advanced.validated'), value: result },
              ]"
              :key="entry.title"
              class="grid min-w-0 gap-component-unit"
            >
              <h3 class="m-0 text-body text-text-secondary">
                {{ entry.title }}
              </h3>
              <pre
                class="m-0 whitespace-pre-wrap break-anywhere text-caption text-text-primary"
                v-text="JSON.stringify(entry.value, null, 2)"
              />
            </div>
            <p class="m-0 text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.hookOrder') }} {{ hooks.order.join(' → ') }}
            </p>
          </template>
          <template v-else-if="capability === 'batch'">
            <p class="m-0 text-caption text-text-secondary">
              {{ t('apiShowcase.advanced.batchOrder') }}
            </p>
            <ol
              v-if="batch.length"
              class="m-0 p-0 list-none grid gap-content-gap"
            >
              <li
                v-for="(item, index) in batch"
                :key="index"
                class="grid min-w-0 gap-component-unit"
              >
                <div class="flex flex-wrap items-center gap-component-unit">
                  <span
                    class="text-body text-text-primary"
                    v-text="`${t('apiShowcase.advanced.job')} ${index + 1}`"
                  />
                  <NTag
                    size="small"
                    :bordered="false"
                    :type="
                      item.status === 'failure'
                        ? 'error'
                        : item.status === 'accepted'
                          ? 'warning'
                          : 'success'
                    "
                  >
                    {{ resultLabel(item) }}
                  </NTag>
                </div>
                <pre
                  class="m-0 whitespace-pre-wrap break-anywhere text-caption text-text-secondary"
                  v-text="
                    JSON.stringify(item.status === 'failure' ? item.error : item.data, null, 2)
                  "
                />
              </li>
            </ol>
            <p
              v-else
              class="m-0 text-body text-text-secondary"
            >
              {{ t('apiShowcase.advanced.empty') }}
            </p>
          </template>
          <template v-else-if="capability === 'stream'">
            <p
              v-if="incomplete"
              class="m-0 text-body text-control-error"
            >
              {{ t('apiShowcase.advanced.partial') }}
            </p>
            <ol
              v-if="rows.length"
              class="m-0 p-0 list-none grid gap-component-unit"
            >
              <li
                v-for="row in rows"
                :key="row.index"
                class="flex flex-wrap min-w-0 gap-component-unit"
              >
                <NTag
                  size="small"
                  :bordered="false"
                >
                  {{ row.index + 1 }}
                </NTag>
                <span class="min-w-0 break-anywhere text-body text-text-primary">{{
                  row.text
                }}</span>
              </li>
            </ol>
            <p
              v-else
              class="m-0 text-body text-text-secondary"
            >
              {{ t('apiShowcase.advanced.empty') }}
            </p>
            <pre
              v-if="result"
              class="m-0 whitespace-pre-wrap break-anywhere text-caption text-text-secondary"
              v-text="JSON.stringify(result, null, 2)"
            />
          </template>
          <p
            v-else
            class="m-0 text-body text-text-secondary"
          >
            {{ t('apiShowcase.advanced.empty') }}
          </p>
        </section>
      </div>
    </UiScrollArea>
    <footer
      class="shrink-0 grid min-w-0 gap-component-unit"
      data-api-actions
    >
      <p
        class="m-0 text-caption text-text-secondary"
        role="status"
        aria-live="polite"
      >
        {{ status }}
      </p>
      <p
        v-if="capability === 'batch'"
        class="m-0 text-caption text-text-secondary"
      >
        {{ t('apiShowcase.advanced.calls') }} {{ progress.calls }}/5 ·
        {{ t('apiShowcase.advanced.finished') }} {{ progress.finished }} ·
        <span
          v-if="pending"
          v-text="`${t('apiShowcase.advanced.inFlight')} ${progress.inFlight} ·`"
        />
        {{ t('apiShowcase.advanced.peak') }} {{ progress.peak }}
      </p>
      <p
        v-if="capability === 'stream'"
        class="m-0 text-caption text-text-secondary"
      >
        {{ t('apiShowcase.advanced.events') }} {{ rows.length }}
      </p>
      <div class="flex flex-wrap items-center gap-component-unit">
        <NButton
          type="primary"
          class="min-h-target-enhanced"
          :disabled="pending"
          @click="run"
        >
          {{ t('apiShowcase.advanced.run') }}
        </NButton>
        <NButton
          v-if="pending"
          class="min-h-target-enhanced"
          @click="cancel"
        >
          {{ t('apiShowcase.cancel') }}
        </NButton>
        <NButton
          quaternary
          class="min-h-target-enhanced"
          :disabled="pending"
          @click="reset"
        >
          {{ t('apiShowcase.reset') }}
        </NButton>
      </div>
    </footer>
  </section>
</template>
