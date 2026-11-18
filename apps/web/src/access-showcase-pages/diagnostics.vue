<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { computed, onScopeDispose, ref, watch } from 'vue'
import ShowcaseFrame from '../app/access-showcase/ShowcaseFrame.vue'
import {
  organizations,
  projects,
  reportId,
  type Fault,
  type RelationshipMode,
} from '../app/access-showcase/showcase-data'
import {
  fixtureRelationshipsDomain,
  reportCapability,
  showcaseRequirement,
  showcaseRoleCheck,
  taskCapability,
} from '../app/access-showcase/showcase-requirements'
import { useShowcaseWorld } from '../app/access-showcase/showcase-session'
import { useAccessBoundary } from '../app/access/access-boundary'
import { createScopedApiRead } from '../app/api/scoped-api-read'
import { localShowcaseRead } from '../app/access-showcase/showcase-read'
import { useApplicationNavigation } from '../app/router/application-navigation'
import { routeRegistry } from '../app/router/route-registry'
import { readPublicWorkspaceSession } from '../app/workspace/workspace-session'
import { useConsoleI18n } from '../shared/i18n'
import { z } from 'zod'

defineOptions({ name: 'AccessShowcaseDiagnosticsRoute' })

const world = useShowcaseWorld()
const { state } = world
const access = useAccessBoundary()
const navigation = useApplicationNavigation()
const { locale, t } = useConsoleI18n()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const sharedReportRead = {
  kind: 'record',
  domain: fixtureRelationshipsDomain,
  resource: 'report',
  action: 'read',
  recordId: reportId,
} as const
const checked = [
  showcaseRoleCheck,
  taskCapability('collection', 'list'),
  reportCapability('read', reportId),
  sharedReportRead,
] as const
const checks = checked.map((request) => {
  const check = access.observe(request, () => {
    queueMicrotask(() => {
      void check.evaluate()
    })
  })
  return check
})
watch(
  () => access.readContext(),
  ({ status }) => {
    if (status === 'ready') for (const check of checks) void check.evaluate()
  },
  { immediate: true, flush: 'post' },
)
onScopeDispose(() => {
  for (const check of checks) check.dispose()
})
const statuses = computed(() => checks.map((check) => check.read().status))
const sample = createScopedApiRead(
  access,
  localShowcaseRead(
    world,
    'showcase-list-status',
    z.object({ count: z.number() }),
    () => showcaseRequirement(taskCapability('collection', 'list')),
    (context) => ({
      count:
        state.fault === 'empty-data'
          ? 0
          : state.tasks.filter(({ project }) => project === world.projectFor(context)?.id).length,
    }),
  ),
)
const sharedReport = createScopedApiRead(
  access,
  localShowcaseRead(
    world,
    'showcase-shared-summary',
    z.object({ taskCount: z.number() }),
    () => showcaseRequirement(sharedReportRead),
    () => ({
      taskCount: state.tasks.filter(({ project }) => project === projects[0].id).length,
    }),
  ),
)
const faults = computed(() => [
  { value: 'none', label: say('Complete facts', '完整事实') },
  { value: 'empty-grants', label: say('Empty grants', '空授权集') },
  { value: 'empty-data', label: say('Empty data', '空数据集') },
  { value: 'incomplete', label: say('Incomplete facts', '事实不完整') },
  { value: 'provider-failure', label: say('Provider failure', '提供者故障') },
])
function fault(value: Fault) {
  void world.setFault(value)
}
function relations(value: RelationshipMode) {
  void world.setRelationshipMode(value)
}
const relationshipModes = computed(() => [
  { value: 'complete', label: say('Complete graph', '完整关系快照') },
  { value: 'incomplete', label: say('Incomplete graph', '不完整关系快照') },
  { value: 'cycle', label: say('Inheritance cycle', '继承循环') },
])
const restored = ref<readonly string[]>()
async function restore() {
  await world.selectOrganization(
    state.organization === organizations[0].id ? organizations[1].id : organizations[0].id,
  )
  const registry = new Map<string, (typeof routeRegistry)[number]>(
    routeRegistry.map((route) => [route.name, route]),
  )
  const session = readPublicWorkspaceSession(
    {
      read: () => ({
        status: 'found',
        session: {
          schemaVersion: 1,
          openRouteNames: ['workbench-welcome', 'access-showcase-projects'],
        },
      }),
    },
    (name) => {
      const meta = registry.get(name)?.meta
      return meta?.auth === 'public' && meta.requiredPermissionIds.length === 0
    },
  )
  restored.value = session.names
}
</script>

<template>
  <ShowcaseFrame
    :title="t('route-title.access-showcase-diagnostics')"
    :summary="t('route-message.access-showcase-diagnostics-summary')"
    :copy="`AccessBoundary · native navigation grants, ${world.profile === 'casl' ? 'CASL' : 'declared predicates'} for record decisions, bounded relationship adapter and isolated workspace restoration.`"
  >
    <NCard :title="say('Decision states', '访问决定状态')">
      <div
        role="group"
        class="grid gap-component-unit"
      >
        <span id="showcase-diagnostics-label-1">{{
          say('Local failure input', '本地故障输入')
        }}</span>
        <NSelect
          :input-props="{ 'aria-labelledby': 'showcase-diagnostics-label-1' }"
          :value="state.fault"
          :options="faults"
          @update:value="fault"
        />
      </div>
      <p role="status">
        {{ say('Role graph, collection, record, relationship', '角色图、集合、记录、关系') }} ·
        {{ statuses.join(' / ') }}
      </p>
      <NButton @click="() => void sample.run()">
        {{ say('Read synthetic result', '读取演示结果') }}
      </NButton>
      <p role="status">
        {{ sample.state.value.status }}
        <template v-if="sample.state.value.status === 'ready'">
          · {{ sample.state.value.data.count }}
        </template>
      </p>
    </NCard>
    <NCard :title="say('Bounded relationships', '有界关系')">
      <div
        role="group"
        class="grid gap-component-unit"
      >
        <span id="showcase-diagnostics-label-2">{{
          say('Relationship snapshot', '关系快照')
        }}</span>
        <NSelect
          :input-props="{ 'aria-labelledby': 'showcase-diagnostics-label-2' }"
          :value="state.relationships"
          :options="relationshipModes"
          @update:value="relations"
        />
      </div>
    </NCard>
    <NCard :title="say('Readonly shared report', '只读分享报表')">
      <NButton @click="() => void sharedReport.run()">
        {{ say('Read shared summary', '读取分享摘要') }}
      </NButton>
      <p role="status">
        {{ sharedReport.state.value.status }}
        <template v-if="sharedReport.state.value.status === 'ready'">
          {{ say('Task count', '任务数') }} · {{ sharedReport.state.value.data.taskCount }}
        </template>
      </p>
    </NCard>
    <NCard :title="say('Restoration under a changed context', '访问上下文改变后的恢复')">
      <NButton @click="() => void restore()">
        {{ say('Restore isolated tabs', '恢复隔离标签') }}
      </NButton>
      <p
        v-if="restored"
        role="status"
      >
        {{
          restored.includes('workbench-welcome')
            ? say('Welcome restored.', '欢迎页已恢复。')
            : say('No public tab restored.', '未恢复公开标签。')
        }}
        {{
          restored.includes('access-showcase-projects')
            ? say('Controlled entry present.', '存在受控条目。')
            : say('Controlled entry skipped.', '已跳过受控条目。')
        }}
      </p>
    </NCard>
    <NCard :title="say('Local policy effectiveness', '本地策略生效状态')">
      <p role="status">
        {{
          state.policyDraft
            ? say('Saved, awaiting confirmation', '已保存，等待确认')
            : say('Confirmed revision active', '已使用确认修订')
        }}
      </p>
      <div class="gap-control flex flex-wrap">
        <NButton @click="state.adminConflict = true">
          {{ say('Inject next revision conflict', '模拟下一次修订冲突') }}
        </NButton>
        <NButton @click="state.grantable = !state.grantable">
          {{
            state.grantable
              ? say('Limit grantable scope', '限制可授予范围')
              : say('Restore grantable scope', '恢复可授予范围')
          }}
        </NButton>
        <NButton
          :disabled="!navigation.canShow({ name: 'administration-policies' })"
          @click="() => void navigation.navigate({ name: 'administration-policies' })"
        >
          {{ say('Open policy administration', '打开策略管理') }}
        </NButton>
      </div>
    </NCard>
  </ShowcaseFrame>
</template>
