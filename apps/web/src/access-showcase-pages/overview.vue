<script setup lang="ts">
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NSelect } from 'naive-ui/es/select'
import { computed } from 'vue'
import ShowcaseFrame from '../app/access-showcase/ShowcaseFrame.vue'
import {
  members,
  organizations,
  type FixtureIdentity,
  type Organization,
} from '../app/access-showcase/showcase-data'
import { showcasePresets } from '../app/access-showcase/showcase-presets'
import { useShowcaseWorld } from '../app/access-showcase/showcase-session'
import { useApplicationNavigation } from '../app/router/application-navigation'
import { useConsoleI18n } from '../shared/i18n'

defineOptions({ name: 'AccessShowcaseOverviewRoute' })

const world = useShowcaseWorld()
const { state } = world
const { locale, t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const say = (en: string, zh: string) => (locale.value === 'zh-CN' ? zh : en)
const presetOptions = computed(() =>
  showcasePresets.map((preset) => ({
    value: preset.id,
    label: say(preset.en, preset.zh),
  })),
)
const scenario = computed(() => showcasePresets.find(({ id }) => id === state.preset))
const identities = computed(() => [
  { value: 'anonymous', label: say('Anonymous', '匿名') },
  ...members.map(({ id, label }) => ({ value: id, label })),
])
const scopes = computed(() =>
  organizations.map(({ id, en, zh }) => ({ value: id, label: say(en, zh) })),
)
const launch = {
  projects: 'access-showcase-projects',
  diagnostics: 'access-showcase-diagnostics',
} as const
const cards = [
  {
    name: 'login',
    en: 'Login presentation',
    zh: '登录模板',
    description: 'Standalone template with direct welcome navigation.',
    detail: '独立模板，主操作直接返回欢迎页。',
  },
  {
    name: 'access-showcase-projects',
    en: 'Navigation and project workspace',
    zh: '导航与项目工作区',
    description: 'Scoped records, editing, batches, reports, workflow and sharing.',
    detail: '范围记录、编辑、批量、报表、工作流和分享。',
  },
  {
    name: 'access-showcase-diagnostics',
    en: 'Rules, asynchronous changes and adapters',
    zh: '规则、异步变化与适配器',
    description: 'Review decision states, relationship snapshots and safe restoration.',
    detail: '查看访问决定、关系快照和安全恢复。',
  },
  {
    name: 'administration-policies',
    en: 'Administration workbench',
    zh: '管理工作台',
    description: 'Save policy drafts and confirm effective policy in the local host.',
    detail: '向本地宿主保存策略草案并确认生效。',
  },
] as const
async function select(value: number) {
  const preset = showcasePresets.find(({ id }) => id === value)
  if (preset) await world.select(preset.id)
}
const destination = computed(() => {
  const selected = scenario.value
  return selected && selected.view !== 'overview' ? { name: launch[selected.view] } : undefined
})
const canLaunch = computed(
  () => destination.value !== undefined && navigation.canShow(destination.value),
)
function openScenario() {
  if (destination.value !== undefined) void navigation.navigate(destination.value)
}
function setIdentity(value: FixtureIdentity) {
  void world.selectIdentity(value)
}
function setScope(value: Organization) {
  void world.selectOrganization(value)
}
</script>

<template>
  <ShowcaseFrame
    :title="t('route-title.access-showcase')"
    :summary="t('route-message.access-showcase-summary')"
    :copy="`PAVP AccessHost · ${world.profile} profile. UiAdminShell and UiWorkspaceTabs use the Route Registry. useGuardedForm, useGuardedTable and useGuardedChart consume context-bound access. AdministrationPage is an optional composition.`"
  >
    <NCard :title="say('Local demonstration', '本地演示')">
      <div class="grid gap-content-gap sm:grid-cols-3">
        <div
          role="group"
          class="grid gap-component-unit"
        >
          <span id="showcase-overview-label-1">{{ say('Scenario', '场景') }}</span>
          <NSelect
            :input-props="{ 'aria-labelledby': 'showcase-overview-label-1' }"
            :value="state.preset"
            :options="presetOptions"
            filterable
            @update:value="select"
          />
        </div>
        <div
          role="group"
          class="grid gap-component-unit"
        >
          <span id="showcase-overview-label-2">{{
            say('Demonstration identity', '演示身份')
          }}</span>
          <NSelect
            :input-props="{ 'aria-labelledby': 'showcase-overview-label-2' }"
            :value="state.identity"
            :options="identities"
            @update:value="setIdentity"
          />
        </div>
        <div
          role="group"
          class="grid gap-component-unit"
        >
          <span id="showcase-overview-label-3">{{ say('Organization', '组织') }}</span>
          <NSelect
            :input-props="{ 'aria-labelledby': 'showcase-overview-label-3' }"
            :value="state.organization"
            :options="scopes"
            @update:value="setScope"
          />
        </div>
      </div>
      <div class="gap-control flex flex-wrap">
        <NButton
          v-if="canLaunch"
          type="primary"
          @click="openScenario"
        >
          {{ say('Open scenario', '打开场景') }}
        </NButton>
        <NButton
          v-if="state.preset === 1 && state.identity === 'anonymous'"
          @click="setIdentity(members[0].id)"
        >
          {{ say('Confirm example member', '确认演示成员') }}
        </NButton>
      </div>
    </NCard>
    <div class="grid gap-content-gap sm:grid-cols-2">
      <NCard
        v-for="card in cards"
        :key="card.name"
        :title="say(card.en, card.zh)"
      >
        <p>{{ say(card.description, card.detail) }}</p>
        <NButton
          :disabled="!navigation.canShow({ name: card.name })"
          @click="() => void navigation.navigate({ name: card.name })"
        >
          {{ say('Open', '打开') }}
        </NButton>
      </NCard>
    </div>
    <template #actions>
      <NButton @click="() => void world.select(1)">
        {{ say('Reset demonstration', '重置演示') }}
      </NButton>
    </template>
  </ShowcaseFrame>
</template>
