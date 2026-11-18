<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { computed, ref, watch } from 'vue'
import ShowcaseFrame from '../app/access-showcase/ShowcaseFrame.vue'
import ShowcaseReport from '../app/access-showcase/ShowcaseReport.vue'
import ShowcaseTaskForm from '../app/access-showcase/ShowcaseTaskForm.vue'
import ShowcaseTaskTable from '../app/access-showcase/ShowcaseTaskTable.vue'
import { organizations } from '../app/access-showcase/showcase-data'
import { useShowcaseWorld } from '../app/access-showcase/showcase-session'
import { useAccessBoundary } from '../app/access/access-boundary'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'AccessShowcaseProjectsRoute' })

const world = useShowcaseWorld()
const access = useAccessBoundary()
const { locale, t } = useConsoleI18n()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const editingPreset = [2, 3, 4, 5, 8, 9, 10, 11, 12].includes(world.state.preset)
const initialContext = access.readContext()
const selectedId = ref(
  editingPreset && initialContext.status === 'ready'
    ? world.state.tasks.find(
        (task) => task.project === world.projectFor(initialContext.snapshot)?.id,
      )?.id
    : undefined,
)
const presentation = ref<'modal' | 'drawer' | 'page'>('modal')
const containers = computed(() => [
  { value: 'modal', label: say('Modal editor', '弹窗编辑器') },
  { value: 'drawer', label: say('Drawer editor', '抽屉编辑器') },
  { value: 'page', label: say('Dedicated page editor', '独立页面编辑器') },
])
function selectPresentation(value: 'modal' | 'drawer' | 'page') {
  presentation.value = value
}
watch(
  () => access.readContext(),
  () => {
    selectedId.value = undefined
  },
  { flush: 'sync' },
)
const task = computed(() => {
  const context = access.readContext()
  if (context.status !== 'ready' || selectedId.value === undefined) return
  return world.taskFor(selectedId.value, context.snapshot)
})
function switchScope() {
  void world.selectOrganization(
    world.state.organization === organizations[0].id ? organizations[1].id : organizations[0].id,
  )
}
</script>

<template>
  <ShowcaseFrame
    :title="t('route-title.access-showcase-projects')"
    :summary="t('route-message.access-showcase-projects-summary')"
    :copy="`UiForm · useGuardedForm · listed field controls, confirmed values and write-only replacements. UiTable · useGuardedTable · scoped rows and fields. executeGuardedAction · all and partial. UiG2Chart and UiChartTimeRange · guarded window. ResourceSharingDialog and AccessRequestDialog · explicit host commands. ${world.profile} profile.`"
  >
    <NCard :title="say('Team tasks', '团队任务')">
      <div
        role="group"
        class="grid gap-component-unit"
      >
        <span id="showcase-projects-label-1">{{ say('Editor container', '编辑器容器') }}</span>
        <NSelect
          :input-props="{ 'aria-labelledby': 'showcase-projects-label-1' }"
          :value="presentation"
          :options="containers"
          @update:value="selectPresentation"
        />
      </div>
      <ShowcaseTaskTable
        :key="presentation"
        :presentation="presentation"
        @select="(id) => (selectedId = id)"
      />
    </NCard>
    <NCard
      v-if="task"
      :title="say('Task editor', '任务编辑器')"
    >
      <ShowcaseTaskForm
        :key="task.id"
        :record-id="task.id"
      />
    </NCard>
    <NCard :title="say('Report, workflow and sharing', '报表、工作流与分享')">
      <ShowcaseReport />
    </NCard>
    <template #actions>
      <NButton @click="switchScope">
        {{ say('Switch organization', '切换组织') }}
      </NButton>
      <NButton @click="() => void world.setProjectAccess(false)">
        {{ say('Revoke project navigation', '撤销项目访问') }}
      </NButton>
      <NButton @click="() => void world.select(1)">
        {{ say('Reset demonstration', '重置演示') }}
      </NButton>
    </template>
  </ShowcaseFrame>
</template>
