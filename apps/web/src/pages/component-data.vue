<script setup lang="ts">
import { computed, onDeactivated, ref } from 'vue'
import hljs from 'highlight.js/lib/core'
import { NAvatar } from 'naive-ui/es/avatar'
import { NAvatarGroup } from 'naive-ui/es/avatar-group'
import { NBadge } from 'naive-ui/es/badge'
import { NButton } from 'naive-ui/es/button'
import { NCalendar } from 'naive-ui/es/calendar'
import { NCountdown } from 'naive-ui/es/countdown'
import { NDataTable } from 'naive-ui/es/data-table'
import { NDescriptions, NDescriptionsItem } from 'naive-ui/es/descriptions'
import { NEllipsis } from 'naive-ui/es/ellipsis'
import { NHeatmap } from 'naive-ui/es/heatmap'
import { NHighlight } from 'naive-ui/es/highlight'
import { NImage, NImageGroup, NImagePreview } from 'naive-ui/es/image'
import { NLog } from 'naive-ui/es/log'
import { NList, NListItem } from 'naive-ui/es/list'
import { NNumberAnimation } from 'naive-ui/es/number-animation'
import { NProgress } from 'naive-ui/es/progress'
import { NQrCode } from 'naive-ui/es/qr-code'
import { NStatistic } from 'naive-ui/es/statistic'
import { NTable, NTbody, NTd, NTh, NThead, NTr } from 'naive-ui/es/table'
import { NTag } from 'naive-ui/es/tag'
import { NThing } from 'naive-ui/es/thing'
import { NTime } from 'naive-ui/es/time'
import { NTimeline, NTimelineItem } from 'naive-ui/es/timeline'
import { NTree } from 'naive-ui/es/tree'
import { NH2, NH3, NP, NText } from 'naive-ui/es/typography'
import { UiStatusBadge } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentDataPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const imageGroupOpen = ref(false)
const imagePreviewOpen = ref(false)
onDeactivated(() => {
  imageGroupOpen.value = false
  imagePreviewOpen.value = false
})
const avatarOptions = ['林', '陈', '李', '周'].map((label) => ({ src: '/favicon.svg', label }))
const now = Date.now()
const countdownRunning = ref(false)
const logUpdates = ref(0)
const logLines = computed(() => [
  t('showcase.logStarted'),
  t('showcase.logWorking'),
  ...Array.from({ length: logUpdates.value }, () => t('showcase.logUpdate')),
])
const rows = computed(() => [
  { key: 'discover', name: t('showcase.taskDiscover'), value: t('showcase.badgeComplete') },
  { key: 'design', name: t('showcase.taskDesign'), value: t('showcase.badgeComplete') },
  { key: 'build', name: t('showcase.taskBuild'), value: t('showcase.badgeActive') },
  { key: 'review', name: t('showcase.taskReview'), value: t('showcase.badgeActive') },
  { key: 'verify', name: t('showcase.taskVerify'), value: t('showcase.badgeInactive') },
  { key: 'release', name: t('showcase.taskRelease'), value: t('showcase.badgeInactive') },
])
const columns = computed(() => [
  { title: t('showcase.exampleName'), key: 'name' },
  { title: t('showcase.exampleStatus'), key: 'value' },
])
const tree = computed(() => [
  {
    label: t('showcase.planLabel'),
    key: 'plan',
    children: rows.value.slice(0, 4).map((row) => ({ label: row.name, key: row.key })),
  },
])
const heatmap = Array.from({ length: 28 }, (_, index) => ({
  timestamp: now - (27 - index) * 24 * 60 * 60 * 1000,
  value: index % 5,
}))
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <section
      class="wb-page grid min-w-0"
      :aria-label="title"
    >
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataStatusPeople') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NTag · NBadge"
            :modes="['primary', 'success', 'warning', 'error']"
            span="wide"
          >
            <NTag type="primary">
              {{ t('showcase.primary') }}
            </NTag>
            <NTag type="success">
              {{ t('showcase.success') }}
            </NTag>
            <NTag type="warning">
              {{ t('showcase.warning') }}
            </NTag>
            <NTag type="error">
              {{ t('showcase.error') }}
            </NTag>
            <NBadge
              :value="3"
              :max="9"
            >
              <NTag>{{ t('showcase.info') }}</NTag>
            </NBadge>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiStatusBadge"
            pavp
          >
            <UiStatusBadge
              :label="t('showcase.badgeComplete')"
              tone="complete"
            />
            <UiStatusBadge
              :label="t('showcase.badgeActive')"
              tone="active"
            />
            <UiStatusBadge
              :label="t('showcase.badgeInactive')"
              tone="inactive"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NAvatar · NAvatarGroup">
            <NAvatar round>
              {{ avatarOptions[0]?.label }}
            </NAvatar>
            <NAvatarGroup
              :options="avatarOptions"
              :max="3"
            >
              <template #avatar="{ option }">
                <NAvatar round>
                  {{ (option as (typeof avatarOptions)[number]).label }}
                </NAvatar>
              </template>
            </NAvatarGroup>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataSummaries') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NStatistic">
            <NStatistic
              :label="t('showcase.planLabel')"
              :value="rows.length"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NNumberAnimation · NCountdown">
            <div class="grid gap-content-gap">
              <span class="text-text-secondary">{{ t('showcase.metricLabel') }}</span>
              <NNumberAnimation
                :from="0"
                :to="rows.length"
              />
            </div>
            <div class="grid gap-content-gap">
              <span class="text-text-secondary">{{ t('showcase.remainingTime') }}</span>
              <NCountdown
                :duration="60000"
                :active="countdownRunning"
              />
            </div>
            <NButton
              size="small"
              @click="countdownRunning = !countdownRunning"
            >
              {{ countdownRunning ? t('showcase.off') : t('showcase.on') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen name="NEllipsis · NHighlight">
            <NEllipsis :tooltip="false">
              {{ t('showcase.longText') }}
            </NEllipsis>
            <NHighlight
              :text="t('showcase.highlightText')"
              :pattern="t('showcase.highlightMatch')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NThing">
            <NThing
              :title="t('showcase.contentTitle')"
              :description="t('showcase.contentDescription')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NDescriptions · NDescriptionsItem">
            <NDescriptions :column="1">
              <NDescriptionsItem :label="t('showcase.exampleName')">
                {{ t('showcase.contentTitle') }}
              </NDescriptionsItem>
              <NDescriptionsItem :label="t('showcase.exampleStatus')">
                {{ t('showcase.badgeComplete') }}
              </NDescriptionsItem>
            </NDescriptions>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataCollections') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NDataTable"
            span="full"
          >
            <NDataTable
              :columns="columns"
              :data="rows"
              :pagination="{ pageSize: 4 }"
              :bordered="false"
            />
            <template #detail>
              {{ t('showcase.planLabel') }}
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NTable"
            span="wide"
          >
            <NTable
              :bordered="false"
              :single-line="false"
              size="small"
            >
              <NThead>
                <NTr>
                  <NTh>{{ t('showcase.exampleName') }}</NTh>
                  <NTh>{{ t('showcase.exampleStatus') }}</NTh>
                </NTr>
              </NThead>
              <NTbody>
                <NTr
                  v-for="row in rows.slice(0, 3)"
                  :key="row.key"
                >
                  <NTd>{{ row.name }}</NTd>
                  <NTd>{{ row.value }}</NTd>
                </NTr>
              </NTbody>
            </NTable>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NTree"
            top-aligned
          >
            <NTree
              class="w-full"
              block-line
              :data="tree"
              default-expand-all
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NList · NListItem">
            <NList>
              <NListItem
                v-for="row in rows.slice(0, 3)"
                :key="row.key"
              >
                {{ row.name }}
              </NListItem>
            </NList>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataTrends') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NTimeline · NTimelineItem">
            <NTimeline>
              <NTimelineItem
                type="info"
                :title="t('showcase.first')"
              />
              <NTimelineItem
                type="success"
                :title="t('showcase.second')"
              />
              <NTimelineItem
                type="warning"
                :title="t('showcase.third')"
              />
            </NTimeline>
          </ComponentSpecimen>
          <ComponentSpecimen name="NHeatmap">
            <NHeatmap
              :data="heatmap"
              :show-month-labels="false"
              :show-week-labels="false"
            />
            <template #detail>
              {{ t('showcase.localNote') }}
            </template>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataProgressLog') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NProgress"
            :modes="['line', 'circle']"
          >
            <NProgress
              type="line"
              :percentage="60"
            />
            <NProgress
              type="circle"
              :percentage="75"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NLog"
            span="wide"
          >
            <NLog
              :lines="logLines"
              :hljs="hljs"
              :rows="4"
              class="w-full"
            />
            <NButton
              :disabled="logUpdates >= 5"
              @click="logUpdates += 1"
            >
              {{ t('showcase.appendLog') }}
            </NButton>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataMedia') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NImage · NImageGroup · NImagePreview"
            span="wide"
          >
            <div class="rounded-control bg-action-primary p-page-inline">
              <NImageGroup v-model:show="imageGroupOpen">
                <NImage
                  src="/favicon.svg"
                  class="min-h-target-enhanced min-w-target-enhanced"
                  :alt="t('workbench.label')"
                />
                <NImage
                  src="/favicon.svg"
                  class="min-h-target-enhanced min-w-target-enhanced"
                  :alt="t('workbench.label')"
                />
              </NImageGroup>
            </div>
            <NButton @click="imagePreviewOpen = true">
              {{ t('showcase.open') }}
            </NButton>
            <NImagePreview
              v-model:show="imagePreviewOpen"
              src="/favicon.svg"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NQrCode">
            <NQrCode value="https://github.com/ichichuang/progressive-adaptive-vue-platform" />
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.dataDates') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NTime · NText">
            <div>
              <NH2>{{ t('showcase.contentTitle') }}</NH2>
              <NH3>{{ t('showcase.recentUpdate') }}</NH3>
              <NP>
                <NText>{{ t('showcase.contentDescription') }}</NText>
              </NP>
              <NTime
                :time="now"
                type="datetime"
              />
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NCalendar"
            span="full"
            tall
            reserved
          >
            <NCalendar />
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
