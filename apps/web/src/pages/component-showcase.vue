<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NInput } from 'naive-ui/es/input'
import { UiCopyAction, UiStatusBadge } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import {
  registeredRouteDestination,
  type RegisteredRouteDestination,
} from '../app/router/route-input'
import { consoleNavigationRegistry, getRouteRecord } from '../app/router/route-registry'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'
import { discoverCapabilities } from '../app/workbench/capability-discovery'
import { componentPurposeKeys } from '../app/workbench/component-purpose-keys'

defineOptions({ name: 'ComponentShowcasePage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const search = ref('')
const capabilities = computed(() => discoverCapabilities(search.value, t))
const searchTerm = computed(() => search.value.trim().toLocaleLowerCase())
const livePavpNames = 'UiProvider · UiAdminShell · UiWorkspaceTabs'
const liveNaiveNames = 'NConfigProvider · NLayoutSider'
function purposeSearchText(names: string): string {
  return names
    .split(/[^A-Za-z0-9]+/u)
    .flatMap((name) => {
      const key = componentPurposeKeys[name]
      return key === undefined ? [] : [t(key)]
    })
    .join(' ')
}
const showLivePavp = computed(() =>
  `${livePavpNames} ${purposeSearchText(livePavpNames)}`
    .toLocaleLowerCase()
    .includes(searchTerm.value),
)
const showLiveNaive = computed(() =>
  `${liveNaiveNames} ${purposeSearchText(liveNaiveNames)}`
    .toLocaleLowerCase()
    .includes(searchTerm.value),
)
const componentGroup = consoleNavigationRegistry.find((group) => group.id === 'components')
if (componentGroup === undefined) throw new TypeError('Component navigation is unavailable.')
const hints = {
  'component-actions': 'showcase.category.actions',
  'component-inputs': 'showcase.category.inputs',
  'component-selection': 'showcase.category.selection',
  'component-navigation': 'showcase.category.navigation',
  'component-data': 'showcase.category.data',
  'component-feedback': 'showcase.category.feedback',
  'component-layout': 'showcase.category.layout',
} as const
// Discovery terms describe the specimens on each page; route identity still belongs to the router.
const componentNames = {
  'component-showcase': livePavpNames,
  'component-actions':
    'UiCopyAction NButton NButtonGroup NIcon NIconWrapper NFloatButton NFloatButtonGroup NGradientText Lucide',
  'component-inputs':
    'NInput NInputGroup NInputGroupLabel NInputNumber NInputOtp NAutoComplete NMention NDatePicker NTimePicker NColorPicker NDynamicInput NDynamicTags NUpload NUploadDragger NForm NFormItem',
  'component-selection':
    'NSwitch NRadioGroup NRadio NRadioButton UiRadioCardGroup NCheckbox NCheckboxGroup NSlider UiChartTimeRange NRate NSelect NPopselect NTreeSelect NCascader NTransfer',
  'component-navigation':
    'NBreadcrumb NBreadcrumbItem NTabs NTab NTabPane NPageHeader NPagination NSteps NStep NMenu NDropdown',
  'component-data':
    'NTag NBadge UiStatusBadge NAvatar NAvatarGroup NStatistic NNumberAnimation NCountdown NEllipsis NHighlight NThing NDescriptions NDescriptionsItem NDataTable NTable NTree NList NListItem NTimeline NTimelineItem NHeatmap NProgress NLog NImage NImageGroup NImagePreview NQrCode NTime NText NCalendar',
  'component-feedback':
    'NAlert NProgress NSpin NSkeleton NEmpty NResult NTooltip NPopover NPopconfirm NModal NModalProvider NDialog NMessageProvider NNotificationProvider NLoadingBarProvider NDrawer NDrawerContent',
  'component-layout':
    'NCard NFlex NSpace NGrid NRow NLayout NLayoutHeader NLayoutContent NLayoutFooter NAffix NAnchor NAnchorLink NBackTop NCollapse NCollapseItem NCollapseTransition NMarquee NScrollbar NInfiniteScroll NVirtualList NDivider NSplit NCarousel NCarouselItem NWatermark UiScrollArea UiSection',
} as const
const categories = computed(() =>
  componentGroup.items
    .flatMap<{
      label: string
      hint: string
      componentNames: string
      destination: RegisteredRouteDestination
    }>((item) => {
      if ('items' in item) {
        const first = item.items[0]
        if (first === undefined) return []
        return [
          {
            label: t(item.labelKey),
            hint: t(
              item.id === 'charts'
                ? 'showcase.category.charts'
                : item.id === 'tables'
                  ? 'tableExamples.tablesHint'
                  : item.id === 'combinations'
                    ? 'tableExamples.combinationsHint'
                    : 'formShowcase.capabilitiesHint',
            ),
            componentNames:
              item.id === 'charts'
                ? 'UiG2Chart G2'
                : item.id === 'tables'
                  ? 'UiTable useUiTable useUiTableActions'
                  : item.id === 'combinations'
                    ? 'UiForm UiTable UiTableEditor useUiTableQuery useUiTableForm'
                    : 'UiForm UiFormField useUiForm',
            destination: registeredRouteDestination(first.destination),
          },
        ]
      }
      const name = item.destination.name
      if (name === 'component-showcase') return []
      return [
        {
          ...item,
          label: t(getRouteRecord(name).meta.titleKey),
          hint: t(hints[name]),
          componentNames: componentNames[name],
          destination: registeredRouteDestination(item.destination),
        },
      ]
    })
    .filter((item) =>
      `${item.label} ${item.hint} ${item.componentNames} ${purposeSearchText(item.componentNames)}`
        .toLocaleLowerCase()
        .includes(searchTerm.value),
    ),
)
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <section
      class="grid grid-cols-1 items-stretch gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
      :aria-label="t('showcase.discover')"
    >
      <NCard
        :bordered="false"
        class="col-span-full min-w-0"
        content-class="grid min-w-0 content-center gap-content-gap"
      >
        <h2 class="font-title-weight m-0 text-subheading">
          {{ t('showcase.discover') }}
        </h2>
        <NInput
          v-model:value="search"
          clearable
          :placeholder="t('showcase.search')"
          :aria-label="t('showcase.search')"
        />
      </NCard>
      <div
        v-if="capabilities.length > 0"
        class="grid col-span-full min-w-0 gap-content-gap"
      >
        <div>
          <h2 class="font-title-weight m-0 text-subheading">
            {{ t('showcase.intent.title') }}
          </h2>
          <p class="mt-control-gap m-0 text-caption text-text-secondary">
            {{ t('showcase.intent.hint') }}
          </p>
        </div>
        <div
          class="grid min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        >
          <NCard
            v-for="capability in capabilities"
            :key="capability.destination.name"
            :bordered="false"
            hoverable
            class="min-w-0"
            content-class="flex min-w-0 flex-col gap-content-gap"
          >
            <h3 class="font-title-weight m-0 text-subheading">
              {{ capability.title }}
            </h3>
            <p class="m-0 text-text-secondary">
              {{ capability.description }}
            </p>
            <p class="m-0 text-caption text-text-secondary">
              {{ capability.note }}
            </p>
            <div class="mt-auto flex flex-wrap items-center justify-between gap-content-gap">
              <NButton
                tag="a"
                type="primary"
                secondary
                :href="navigation.resolveHref(capability.destination)"
                @click="activate($event, capability.destination)"
              >
                {{ t('showcase.intent.try') }}
              </NButton>
              <UiCopyAction
                variant="tertiary"
                :value="capability.copyValue"
                :label="t('formShowcase.copyAI')"
                :copy-label="t('workbench.copy')"
                :success-label="t('workbench.copied')"
                :failure-label="t('workbench.copyFailed')"
              />
            </div>
          </NCard>
        </div>
      </div>
      <NCard
        v-for="category in categories"
        :key="category.destination.name"
        :bordered="false"
        hoverable
        class="min-w-0"
        content-class="grid grid-cols-1 min-w-0 gap-content-gap"
      >
        <div
          class="rounded-control flex w-max items-center justify-center bg-surface-page min-h-target-enhanced min-w-target-enhanced text-control-primary"
        >
          <span
            v-if="category.destination.name === 'component-actions'"
            class="i-lucide-sparkles"
            aria-hidden="true"
          />
          <span
            v-else-if="category.destination.name === 'component-inputs'"
            class="i-lucide-type"
            aria-hidden="true"
          />
          <span
            v-else-if="category.destination.name === 'component-selection'"
            class="i-lucide-swatch-book"
            aria-hidden="true"
          />
          <span
            v-else-if="category.destination.name === 'component-navigation'"
            class="i-lucide-route"
            aria-hidden="true"
          />
          <span
            v-else-if="category.destination.name === 'component-data'"
            class="i-lucide-database"
            aria-hidden="true"
          />
          <span
            v-else-if="category.destination.name === 'component-feedback'"
            class="i-lucide-workflow"
            aria-hidden="true"
          />
          <span
            v-else
            class="i-lucide-panels-top-left"
            aria-hidden="true"
          />
        </div>
        <div class="grid gap-content-gap">
          <h2 class="font-title-weight m-0 text-subheading">
            {{ category.label }}
          </h2>
          <p class="m-0 text-caption text-text-secondary">
            {{ category.hint }}
          </p>
          <div class="flex flex-wrap gap-content-gap">
            <UiCopyAction
              v-for="name in category.componentNames.split(' ').slice(0, 3)"
              :key="name"
              variant="text"
              :value="name"
              :label="name"
              :copy-label="t('workbench.copy')"
              :success-label="t('workbench.copied')"
              :failure-label="t('workbench.copyFailed')"
            />
          </div>
        </div>
        <NButton
          tag="a"
          text
          type="primary"
          class="mt-auto self-start justify-self-start"
          :href="navigation.resolveHref(category.destination)"
          @click="activate($event, category.destination)"
        >
          {{ t('showcase.open') }} ↗
        </NButton>
      </NCard>
      <NCard
        v-if="
          categories.length === 0 && capabilities.length === 0 && !showLivePavp && !showLiveNaive
        "
        :bordered="false"
        class="col-span-full min-w-0"
      >
        <p class="m-0 text-text-secondary">
          {{ t('showcase.emptySearch') }}
        </p>
      </NCard>
      <h2
        v-if="showLivePavp || showLiveNaive"
        class="sr-only"
      >
        {{ t('showcase.group.live') }}
      </h2>
      <ComponentSpecimen
        v-if="showLivePavp"
        class="col-span-full"
        :name="livePavpNames"
        pavp
        span="wide"
      >
        <p class="m-0 text-text-secondary">
          {{ t('showcase.providerNote') }}
        </p>
        <UiStatusBadge
          :label="t('showcase.live')"
          tone="active"
        />
      </ComponentSpecimen>
      <ComponentSpecimen
        v-if="showLiveNaive"
        class="col-span-full"
        :name="liveNaiveNames"
        span="wide"
      >
        <p class="m-0 text-text-secondary">
          {{ t('showcase.providerNote') }}
        </p>
        <UiStatusBadge
          :label="t('showcase.live')"
          tone="active"
        />
      </ComponentSpecimen>
    </section>
  </WorkbenchPage>
</template>
