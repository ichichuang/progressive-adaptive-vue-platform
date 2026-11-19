<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from 'vue'
import { NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NTag } from 'naive-ui/es/tag'
import { useConsoleI18n } from '../../../shared/i18n'
import { apiErrorLabels } from './api-showcase'
import type { ApiDemoOutcome } from './api-demo-scenarios'
const props = defineProps<{
  readonly outcome: ApiDemoOutcome | null
  readonly previous: ApiDemoOutcome | null
  readonly pending: boolean
}>()
const { t } = useConsoleI18n()
const view = ref('readable')
const viewChoiceId = useId()
function displayData(value: unknown): unknown {
  if (value instanceof Blob) return { type: value.type, bytes: value.size }
  if (value instanceof ArrayBuffer)
    return { bytes: value.byteLength, sample: Array.from(new Uint8Array(value).slice(0, 32)) }
  return value
}
const result = computed(() => props.outcome?.result)
const error = computed(() => (result.value?.status === 'failure' ? result.value.error : null))
const outcomeLabel = computed(() => {
  if (error.value) return t(apiErrorLabels[error.value.category])
  return t(result.value?.status === 'accepted' ? 'apiShowcase.accepted' : 'apiShowcase.success')
})
const responsePresentation = computed(() => {
  const requestId =
    result.value?.status === 'failure' ? result.value.error.requestId : result.value?.requestId
  return requestId === undefined
    ? props.pending
      ? 'pending'
      : 'idle'
    : `${requestId}:${view.value}`
})

function retireResponse(element: Element): void {
  if (element instanceof HTMLElement) element.inert = true
}

const visible = computed(() =>
  result.value?.status === 'success' || result.value?.status === 'accepted'
    ? result.value
    : props.previous?.result.status === 'success'
      ? props.previous.result
      : null,
)
const data = computed(() => displayData(visible.value?.data))
const fields = computed(() =>
  typeof data.value === 'object' && data.value !== null && !Array.isArray(data.value)
    ? Object.entries(data.value)
    : [],
)
const json = computed(() => JSON.stringify(data.value ?? null, null, 2))
function format(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}
const requestDetails = computed(() =>
  props.outcome
    ? [
        [t('apiShowcase.method'), props.outcome.evidence.method],
        [t('apiShowcase.endpoint'), props.outcome.evidence.url ?? t('apiShowcase.noFetch')],
        [t('apiShowcase.calls'), props.outcome.evidence.calls ?? '—'],
        [t('apiShowcase.format'), props.outcome.evidence.bodyKind],
        [
          t('apiShowcase.requestId'),
          result.value?.status === 'failure'
            ? result.value.error.requestId
            : result.value?.requestId,
        ],
        ...(props.outcome.evidence.bodyPreview === null
          ? []
          : [[t('apiShowcase.body'), props.outcome.evidence.bodyPreview]]),
        ...(props.outcome.evidence.authorization === null
          ? []
          : [[t('apiShowcase.authorization'), props.outcome.evidence.authorization]]),
      ]
    : [],
)
</script>
<template>
  <div
    class="grid min-w-0 gap-content-gap"
    data-api-response
  >
    <div class="min-w-0">
      <NRadioGroup
        v-model:value="view"
        size="small"
        :name="`api-response-view-${viewChoiceId}`"
        class="min-w-0"
        v-bind="
          { role: 'radiogroup', 'aria-label': t('apiShowcase.result') } satisfies HTMLAttributes
        "
      >
        <NRadioButton value="readable">
          {{ t('apiShowcase.readable') }}
        </NRadioButton>
        <NRadioButton value="json">
          {{ t('apiShowcase.json') }}
        </NRadioButton>
        <NRadioButton value="details">
          {{ t('apiShowcase.details') }}
        </NRadioButton>
      </NRadioGroup>
    </div>
    <div
      class="rounded-control min-w-0 relative overflow-clip bg-surface-page"
      :aria-busy="pending"
    >
      <Transition
        name="api-response-content"
        @before-leave="retireResponse"
      >
        <div
          :key="responsePresentation"
          class="grid min-w-0 gap-content-gap p-panel-narrow"
        >
          <div
            v-if="!outcome"
            class="text-center grid justify-items-center gap-component-unit p-panel-narrow"
            role="status"
          >
            <span
              class="i-lucide-braces size-icon-large text-text-secondary"
              aria-hidden="true"
            />
            <p class="m-0 text-body text-text-secondary">
              {{ t(pending ? 'apiShowcase.pending' : 'apiShowcase.initial') }}
            </p>
          </div>
          <template v-else>
            <div class="flex flex-wrap items-center gap-component-unit">
              <NTag
                :type="
                  error
                    ? error.category === 'caller-abort'
                      ? 'default'
                      : 'error'
                    : result?.status === 'accepted'
                      ? 'warning'
                      : 'success'
                "
                :bordered="false"
              >
                {{ outcomeLabel }}
              </NTag>
              <span
                class="text-caption text-text-secondary"
                v-text="
                  `${t('apiShowcase.httpStatus')} ${error?.httpStatus ?? (result?.status !== 'failure' ? result?.httpStatus : '—')}`
                "
              />
              <span
                class="tabular-nums text-caption text-text-secondary"
                v-text="`${Math.round(outcome.elapsedMilliseconds)} ms`"
              />
            </div>
            <p
              v-if="error?.retryAfterSeconds !== undefined"
              class="m-0 text-body text-text-secondary"
            >
              {{ t('apiShowcase.retryAfter') }}: {{ error.retryAfterSeconds }}
            </p>
            <dl
              v-if="view === 'details'"
              class="m-0 grid min-w-0 gap-content-gap"
            >
              <div
                v-for="[label, value] in requestDetails"
                :key="String(label)"
                class="grid min-w-0 gap-component-unit"
              >
                <dt class="text-caption text-text-secondary">
                  {{ label }}
                </dt>
                <dd
                  class="m-0 min-w-0 whitespace-pre-wrap break-anywhere text-body text-text-primary"
                >
                  {{ format(value) }}
                </dd>
              </div>
            </dl>
            <template v-else>
              <p
                v-if="error && visible"
                class="m-0 text-caption text-text-secondary"
              >
                {{ t('apiShowcase.previous') }}
              </p>
              <p
                v-if="!visible"
                class="m-0 text-body text-text-secondary"
              >
                {{ t('apiShowcase.noPrevious') }}
              </p>
              <p
                v-else-if="visible.data === undefined"
                class="m-0 text-body text-text-secondary"
              >
                {{ t('apiShowcase.empty') }}
              </p>
              <pre
                v-else-if="view === 'json'"
                class="m-0 min-w-0 whitespace-pre-wrap break-anywhere text-caption text-text-primary"
                v-text="json"
              />
              <dl
                v-else-if="fields.length"
                class="m-0 grid min-w-0 gap-content-gap"
              >
                <div
                  v-for="[key, value] in fields"
                  :key="key"
                  class="grid min-w-0 gap-component-unit"
                >
                  <dt class="text-caption text-text-secondary">
                    {{ key }}
                  </dt>
                  <dd
                    class="m-0 min-w-0 whitespace-pre-wrap break-anywhere text-body text-text-primary"
                  >
                    {{ format(value) }}
                  </dd>
                </div>
              </dl>
              <p
                v-else
                class="m-0 min-w-0 whitespace-pre-wrap break-anywhere text-body text-text-primary"
              >
                {{ format(data) }}
              </p>
            </template>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style>
@layer components {
  .api-response-content-leave-active {
    position: absolute;
    inset-inline: 0;
    inset-block-start: 0;
  }
  html[data-motion='full'] .api-response-content-enter-active {
    transition:
      opacity var(--ui-motion-duration) var(--ui-motion-easing),
      transform var(--ui-motion-duration) var(--ui-motion-easing);
  }
  html[data-motion='reduced'] .api-response-content-enter-active,
  html:is([data-motion='full'], [data-motion='reduced']) .api-response-content-leave-active {
    transition: opacity calc(var(--ui-motion-duration) / 2) var(--ui-motion-easing);
  }
  html:is([data-motion='full'], [data-motion='reduced']) .api-response-content-enter-from,
  html:is([data-motion='full'], [data-motion='reduced']) .api-response-content-leave-to,
  html[data-motion='none'] .api-response-content-leave-active {
    opacity: 0;
  }
  html[data-motion='full'] .api-response-content-enter-from {
    transform: translateY(var(--ui-space-component-unit));
  }
}
</style>
