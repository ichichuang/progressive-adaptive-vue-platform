<script setup lang="ts">
import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import { z } from 'zod'
import { NButton } from 'naive-ui/es/button'
import { NProgress } from 'naive-ui/es/progress'
import { NTag } from 'naive-ui/es/tag'
import {
  UiScrollArea,
  UiForm,
  useUiForm,
  type UiFormAttachment,
  type UiScrollController,
} from '@platform/ui'
import { createApiClient, type ApiEndpoint, type UploadTaskSnapshot } from '../../../shared/api'
import { createFormUploadSource } from '../../forms/create-form-upload-source'
import { useFormShowcase } from '../forms/form-showcase'
import { useConsoleI18n } from '../../../shared/i18n'
const props = defineProps<{ active: boolean }>()
const emit = defineEmits<{ controller: [value: UiScrollController | null] }>()
const { t } = useConsoleI18n()
const statusLabels = computed(() => ({
  queued: t('apiShowcase.upload.queued'),
  uploading: t('apiShowcase.upload.uploading'),
  paused: t('apiShowcase.upload.paused'),
  failed: t('apiShowcase.upload.failed'),
  completed: t('apiShowcase.upload.completed'),
  cancelled: t('apiShowcase.upload.cancelled'),
}))
const tasks = shallowRef<readonly UploadTaskSnapshot<UiFormAttachment>[]>([])
let sample = 0
const client = createApiClient({
  configuration: { status: 'configured', baseUrl: 'https://upload-demo.invalid/' },
  fetch: async (_url, request) => {
    await new Promise<void>((resolve, reject) => {
      const signal = request.signal
      if (signal?.aborted) {
        reject(new DOMException('Cancelled', 'AbortError'))
        return
      }
      const abort = (): void => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
        reject(new DOMException('Cancelled', 'AbortError'))
      }
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort)
        resolve()
      }, 500)
      signal?.addEventListener('abort', abort, { once: true })
    })
    return Response.json({ acknowledged: true })
  },
})
const endpoint: ApiEndpoint<{ acknowledged: boolean }> = {
  id: 'showcase.upload.chunk',
  method: 'POST',
  path: ['chunk'],
  policy: 'standard',
  authentication: 'anonymous',
  response: {
    mode: 'json',
    mimeTypes: ['application/json'],
    schema: z.object({ acknowledged: z.literal(true) }),
  },
}
function createDemoQueue() {
  return createFormUploadSource({
    chunkSize: 1024,
    concurrency: 2,
    onChange(value) {
      tasks.value = value
    },
    adapter: {
      async uploadChunk(input) {
        const result = await client.request(endpoint, {
          signal: input.signal,
          body: { kind: 'native', value: input.chunk },
        })
        if (result.status !== 'success') throw new Error('Chunk was not acknowledged.')
      },
      async complete(input) {
        const result = await client.request(
          { ...endpoint, id: 'showcase.upload.complete', path: ['complete'] },
          { signal: input.signal },
        )
        if (result.status !== 'success') throw new Error('Completion was not acknowledged.')
        return { id: input.taskId, name: input.file.name, size: input.file.size }
      },
    },
  })
}
let uploads = createDemoQueue()
let queue = uploads.queue
const form = useUiForm({
  ...useFormShowcase(),
  formId: 'api-upload-attachment',
  schema: {
    fields: [
      {
        kind: 'attachment',
        name: 'files',
        label: 'apiShowcase.upload.formLabel',
        source: 'chunk-upload',
        maxFiles: 3,
        maxSize: 1024 * 1024,
      },
    ],
  },
  initial: { draftId: 'upload-demo', values: { files: [] as UiFormAttachment[] } },
  attachments: { 'chunk-upload': (file, context) => uploads.source(file, context) },
})
const canPause = computed(() =>
  tasks.value.some((task) => task.status === 'queued' || task.status === 'uploading'),
)
const canResume = computed(() =>
  tasks.value.some((task) => task.status === 'paused' || task.status === 'failed'),
)
const canClear = computed(
  () =>
    tasks.value.length > 0 &&
    tasks.value.every((task) => task.status === 'completed' || task.status === 'cancelled'),
)
function clearFinished(): void {
  if (!canClear.value) return
  queue.dispose()
  tasks.value = []
  uploads = createDemoQueue()
  queue = uploads.queue
}
function add(): void {
  for (let i = 0; i < 3; i++) {
    sample++
    queue.enqueue(new File([new Uint8Array(16 * 1024)], `PAVP-${String(sample)}.bin`))
  }
}
function pauseAll(): void {
  for (const task of tasks.value) queue.pause(task.id)
}
function resumeAll(): void {
  for (const task of tasks.value) queue.resume(task.id)
}
watch(
  () => props.active,
  (active) => {
    if (!active) pauseAll()
  },
)
onScopeDispose(() => {
  queue.dispose()
  form.dispose()
})
</script>
<template>
  <section
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
    data-api-upload-demo
  >
    <p class="m-0 text-caption text-text-secondary">
      {{ t('apiShowcase.upload.hint') }}
    </p>
    <UiScrollArea
      owner-id="architecture-console-content"
      :enabled="active"
      class="flex-1 min-h-0"
      @controller="emit('controller', $event)"
    >
      <div class="grid min-w-0 gap-content-gap">
        <section
          class="wb-form-panel-header rounded-panel grid min-w-0 bg-surface-panel gap-content-gap"
        >
          <p class="m-0 text-caption text-text-secondary">
            {{ t('apiShowcase.upload.formHint') }}
          </p>
          <UiForm :form="form">
            <template #actions />
          </UiForm>
        </section>
        <article
          v-for="task in tasks"
          :key="task.id"
          class="wb-form-panel-header rounded-panel grid min-w-0 bg-surface-panel gap-content-gap"
        >
          <div class="flex flex-wrap items-center justify-between gap-component-unit">
            <span class="text-body text-text-primary">{{ task.name }}</span>
            <NTag
              :bordered="false"
              :type="
                task.status === 'completed'
                  ? 'success'
                  : task.status === 'failed'
                    ? 'error'
                    : 'default'
              "
            >
              {{ statusLabels[task.status] }}
            </NTag>
          </div>
          <NProgress
            type="line"
            :percentage="
              task.size === 0
                ? task.status === 'completed'
                  ? 100
                  : 0
                : Math.round((task.uploadedBytes / task.size) * 100)
            "
          />
          <p class="m-0 text-caption text-text-secondary">
            {{ task.completedChunks }} / {{ task.totalChunks }} {{ t('apiShowcase.upload.chunks') }}
          </p>
          <div class="flex flex-wrap gap-component-unit">
            <NButton
              :disabled="!['uploading', 'queued'].includes(task.status)"
              @click="queue.pause(task.id)"
            >
              {{ t('apiShowcase.upload.pause') }}
            </NButton>
            <NButton
              :disabled="!['paused', 'failed'].includes(task.status)"
              @click="queue.resume(task.id)"
            >
              {{ t('apiShowcase.upload.resume') }}
            </NButton>
            <NButton
              :disabled="['completed', 'cancelled'].includes(task.status)"
              @click="queue.cancel(task.id)"
            >
              {{ t('apiShowcase.upload.cancel') }}
            </NButton>
          </div>
        </article>
        <p
          v-if="tasks.length === 0"
          class="m-0 text-body text-text-secondary"
        >
          {{ t('apiShowcase.upload.empty') }}
        </p>
      </div>
    </UiScrollArea>
    <footer class="flex shrink-0 flex-wrap gap-component-unit">
      <NButton
        type="primary"
        :disabled="tasks.length >= 9"
        @click="add"
      >
        {{ t('apiShowcase.upload.add') }}
      </NButton>
      <NButton
        :disabled="!canPause"
        @click="pauseAll"
      >
        {{ t('apiShowcase.upload.pauseAll') }}
      </NButton>
      <NButton
        :disabled="!canResume"
        @click="resumeAll"
      >
        {{ t('apiShowcase.upload.resumeAll') }}
      </NButton>
      <NButton
        :disabled="!canClear"
        @click="clearFinished"
      >
        {{ t('apiShowcase.upload.clearFinished') }}
      </NButton>
    </footer>
  </section>
</template>
