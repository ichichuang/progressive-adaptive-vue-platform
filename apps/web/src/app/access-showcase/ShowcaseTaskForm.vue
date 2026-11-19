<script setup lang="ts">
import { UiForm, type UiFormSchema } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { computed, watch } from 'vue'
import { useConsoleI18n } from '../../shared/i18n'
import { useAccessBoundary } from '../access/access-boundary'
import { createScopedApiRead } from '../api/scoped-api-read'
import { useGuardedForm } from '../forms/use-guarded-form'
import { useFormShowcase } from '../workbench/forms/form-showcase'
import { showcaseTaskRead } from './showcase-read'
import {
  fixtureRecordsDomain,
  globalShowcaseScope,
  showcaseRequirement,
  taskCapability,
} from './showcase-requirements'
import { useShowcaseWorld } from './showcase-session'
import { showcaseTaskSave } from './showcase-task-actions'

const props = defineProps<{ readonly recordId: string }>()
const { locale } = useConsoleI18n()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const access = useAccessBoundary()
const world = useShowcaseWorld()
const demo = useFormShowcase()
const read = createScopedApiRead(access, showcaseTaskRead(world))
const label = (name: string) => {
  switch (name) {
    case 'title':
      return say('Confirmed task title', '已确认的任务名称')
    case 'owner':
      return say('Owner', '所有者')
    case 'budget':
      return say('Budget', '预算')
    case 'secret':
      return say('Replacement secret', '替换密钥')
    default:
      return name
  }
}
const schema = {
  fields: [
    { kind: 'text', name: 'title', label: 'title' },
    { kind: 'text', name: 'owner', label: 'owner' },
    { kind: 'text', name: 'budget', label: 'budget' },
    { kind: 'text', name: 'secret', label: 'secret' },
    { kind: 'text', name: 'source', label: 'source', hidden: true },
  ],
} as const satisfies UiFormSchema
const replacement = {
  title: { edit: { read: 'read-field', write: 'write-field' } },
  owner: { edit: { read: 'read-field' } },
  budget: { edit: { read: 'read-field' } },
  secret: { edit: { write: 'write-field' } },
}
const target = computed(() => {
  const confirmed = read.state.value
  if (confirmed.status !== 'ready' || confirmed.data.id !== props.recordId) return
  return {
    id: props.recordId,
    revision: confirmed.data.revision,
    mode: 'edit' as const,
    idempotencyKey: world.issueRevision(),
  }
})
const guarded = useGuardedForm({
  form: { formId: 'showcase-task-editor', schema, copy: demo.copy, translate: label },
  access,
  source: {
    domain: fixtureRecordsDomain,
    resource: 'task',
    scope: globalShowcaseScope,
    selection: 'listed',
    fields: replacement,
  },
  target: () => target.value,
  recordRead: ({ id }) => showcaseRequirement(taskCapability('record', 'read', id)),
  recordWrite: ({ id }) => showcaseRequirement(taskCapability('record', 'save', id)),
  confirmed({ id }) {
    const current = read.state.value
    if (current.status !== 'ready' || id !== current.data.id) return
    return {
      receipt: current.requestId,
      values: current.data.values,
      isCurrent: () => read.isCurrent(current.requestId),
    }
  },
  async validate() {
    await world.wait(world.state.latency)
    return 'valid' as const
  },
  action: (_patch, payload) => showcaseTaskSave(world, payload),
  onOutcome(outcome) {
    if (outcome.status === 'completed' && outcome.applied) {
      const origin = world.currentGeneration()
      setTimeout(() => {
        if (world.currentGeneration() === origin && props.recordId === outcome.targetId)
          void world.invalidateRecord(outcome.targetId).then(() => read.run({ id: props.recordId }))
      }, 0)
    }
  },
})
watch(
  () => [access.readContext(), props.recordId] as const,
  ([context, id]) => {
    if (context.status === 'ready') void read.run({ id })
    else read.clear()
  },
  { immediate: true, flush: 'sync' },
)
const editing = computed(() => guarded.fieldStatus('title', 'write') === 'allow')
const reading = computed(() => guarded.fieldStatus('title', 'read') === 'allow')
</script>

<template>
  <div class="grid gap-content-gap">
    <div class="flex flex-wrap gap-content-gap">
      <NButton @click="() => void read.run({ id: recordId })">
        {{ say('Read confirmed data', '读取确认数据') }}
      </NButton>
      <NButton @click="() => void world.setTitleAccess(recordId, 'write', !editing)">
        {{
          editing
            ? say('Revoke title editing', '撤销名称编辑')
            : say('Restore title editing', '恢复名称编辑')
        }}
      </NButton>
      <NButton @click="() => void world.setTitleAccess(recordId, 'read', !reading)">
        {{
          reading
            ? say('Revoke title reading', '撤销名称读取')
            : say('Restore title reading', '恢复名称读取')
        }}
      </NButton>
    </div>
    <UiForm :form="guarded.form" />
  </div>
</template>
