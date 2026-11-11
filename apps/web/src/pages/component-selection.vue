<script setup lang="ts">
import { computed, ref } from 'vue'
import { NCascader } from 'naive-ui/es/cascader'
import { NButton } from 'naive-ui/es/button'
import { NCheckbox, NCheckboxGroup } from 'naive-ui/es/checkbox'
import { NRadio, NRadioButton, NRadioGroup } from 'naive-ui/es/radio'
import { NPopselect } from 'naive-ui/es/popselect'
import { NRate } from 'naive-ui/es/rate'
import { NSelect } from 'naive-ui/es/select'
import { NSlider } from 'naive-ui/es/slider'
import { NSwitch } from 'naive-ui/es/switch'
import { NTransfer } from 'naive-ui/es/transfer'
import { NTreeSelect } from 'naive-ui/es/tree-select'
import { UiChartTimeRange, UiRadioCardGroup } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentSelectionPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const enabled = ref(true)
const radio = ref('first')
const radioButton = ref('first')
const card = ref('first')
const checked = ref<string[]>(['first'])
const slider = ref(40)
const timeRangeOverview = [
  18, 14, 12, 10, 13, 21, 34, 48, 62, 70, 65, 58, 54, 60, 72, 84, 76, 66, 57, 48, 39, 31, 25, 20,
] as const
const timeRangeMaximum = timeRangeOverview.length - 1
const timeRange = ref<readonly [number, number]>([8, 18])
const timeRangeActive = ref(false)
function formatTimeRangeValue(index: number): string {
  return `${String(index).padStart(2, '0')}:00`
}
const rate = ref(3)
const selection = ref<string | null>(null)
const popSelection = ref<string | null>(null)
const treeSelection = ref<string | null>(null)
const cascaderSelection = ref<string | null>(null)
const transfer = ref<string[]>([])
const options = computed(() => [
  { label: t('showcase.first'), value: 'first' },
  { label: t('showcase.second'), value: 'second' },
  { label: t('showcase.third'), value: 'third' },
])
const cascaderOptions = computed(() => [
  {
    label: t('showcase.regionNorth'),
    value: 'north',
    children: [
      { label: t('showcase.cityBeijing'), value: 'beijing' },
      { label: t('showcase.cityTianjin'), value: 'tianjin' },
    ],
  },
  {
    label: t('showcase.regionEast'),
    value: 'east',
    children: [
      { label: t('showcase.cityShanghai'), value: 'shanghai' },
      { label: t('showcase.cityHangzhou'), value: 'hangzhou' },
      { label: t('showcase.cityNanjing'), value: 'nanjing' },
      { label: t('showcase.citySuzhou'), value: 'suzhou' },
      { label: t('showcase.cityHefei'), value: 'hefei' },
      { label: t('showcase.cityFuzhou'), value: 'fuzhou' },
      { label: t('showcase.cityXiamen'), value: 'xiamen' },
      { label: t('showcase.cityNingbo'), value: 'ningbo' },
    ],
  },
])
const selectOptions = computed(() =>
  options.value.map((option) =>
    option.value === 'third' ? { ...option, disabled: true } : option,
  ),
)
const treeOptions = computed(() =>
  options.value.map((option) => ({ label: option.label, key: option.value })),
)
const popSelectionLabel = computed(
  () => options.value.find((option) => option.value === popSelection.value)?.label,
)
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
          {{ t('showcase.group.selectionChoices') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NSwitch"
            span="wide"
          >
            <NSwitch
              v-model:value="enabled"
              :aria-label="t('showcase.selected')"
            />
            <NSwitch
              :value="false"
              disabled
              :aria-label="t('showcase.disabled')"
            />
            <span class="text-text-secondary">{{
              enabled ? t('showcase.on') : t('showcase.off')
            }}</span>
          </ComponentSpecimen>
          <ComponentSpecimen name="NRadioGroup · NRadio">
            <NRadioGroup
              v-model:value="radio"
              :aria-label="t('showcase.selected')"
            >
              <NRadio
                v-for="option in options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </NRadio>
            </NRadioGroup>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NRadioGroup · NRadioButton"
            :modes="['small']"
          >
            <NRadioGroup
              v-model:value="radioButton"
              size="small"
              :aria-label="t('showcase.selected')"
            >
              <NRadioButton
                v-for="option in options.slice(0, 2)"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </NRadioButton>
            </NRadioGroup>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiRadioCardGroup"
            pavp
            span="wide"
          >
            <UiRadioCardGroup
              v-model="card"
              :options="options"
              :accessible-label="t('showcase.selected')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen name="NCheckbox · NCheckboxGroup">
            <NCheckboxGroup
              v-model:value="checked"
              :aria-label="t('showcase.selected')"
            >
              <NCheckbox
                v-for="option in options"
                :key="option.value"
                :value="option.value"
                :label="option.label"
              />
            </NCheckboxGroup>
            <NCheckbox disabled>
              {{ t('showcase.disabled') }}
            </NCheckbox>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.selectionRating') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NSlider"
            recreate-on-activate
          >
            <NSlider
              v-model:value="slider"
              :aria-label="t('showcase.selected')"
            />
            <span class="text-text-secondary">{{ slider }}</span>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiChartTimeRange"
            pavp
            span="full"
          >
            <div class="grid min-w-0 w-full gap-content-gap">
              <div class="flex flex-wrap items-center justify-between gap-content-gap">
                <p class="m-0 text-body text-text-secondary">
                  {{ t('showcase.timeRange.selected') }}
                  <strong class="font-title-weight text-text-primary">
                    {{ formatTimeRangeValue(timeRange[0]) }}–{{
                      formatTimeRangeValue(timeRange[1])
                    }}
                  </strong>
                </p>
                <div class="flex flex-wrap items-center gap-component-unit">
                  <NButton
                    size="small"
                    @click="timeRange = [0, timeRangeMaximum]"
                  >
                    {{ t('showcase.timeRange.fullRange') }}
                  </NButton>
                  <NButton
                    size="small"
                    @click="timeRange = [10, 14]"
                  >
                    {{ t('showcase.timeRange.shortRange') }}
                  </NButton>
                </div>
              </div>
              <UiChartTimeRange
                v-model:value="timeRange"
                :min="0"
                :max="timeRangeMaximum"
                :overview="timeRangeOverview"
                :format-value="formatTimeRangeValue"
                :label="t('chartExamples.timeRange')"
                :start-label="t('chartExamples.rangeStart')"
                :end-label="t('chartExamples.rangeEnd')"
                :help-text="t('chartExamples.rangeHint')"
                @start="timeRangeActive = true"
                @end="timeRangeActive = false"
              />
              <p class="m-0 text-caption text-text-secondary">
                {{ t(timeRangeActive ? 'showcase.timeRange.active' : 'showcase.timeRange.ready') }}
              </p>
            </div>
            <template #detail>
              <div class="grid min-w-0 gap-component-unit text-caption">
                <p class="m-0">
                  {{ t('showcase.timeRange.props') }}
                </p>
                <p class="m-0">
                  {{ t('showcase.timeRange.labels') }}
                </p>
                <p class="m-0">
                  {{ t('showcase.timeRange.events') }}
                </p>
                <p class="m-0 break-anywhere">
                  {{ t('showcase.timeRange.guide') }}
                  <code>packages/ui/src/components/chart-time-range-guide.md</code>
                </p>
              </div>
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen name="NRate">
            <NRate
              v-model:value="rate"
              allow-half
              :aria-label="t('showcase.selected')"
            />
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.selectionPickers') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NSelect"
            :modes="['disabled option']"
            recreate-on-activate
          >
            <NSelect
              v-model:value="selection"
              :options="selectOptions"
              clearable
              :to="'#pavp-overlay-root'"
              :placeholder="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NPopselect"
            recreate-on-activate
          >
            <NPopselect
              v-model:value="popSelection"
              :options="options"
              :to="'#pavp-overlay-root'"
            >
              <NButton>{{ popSelectionLabel ?? t('showcase.placeholder') }}</NButton>
            </NPopselect>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NTreeSelect"
            recreate-on-activate
          >
            <NTreeSelect
              v-model:value="treeSelection"
              :options="treeOptions"
              clearable
              :to="'#pavp-overlay-root'"
              :placeholder="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NCascader"
            :modes="[t('showcase.adaptiveHeight')]"
            recreate-on-activate
          >
            <NCascader
              v-model:value="cascaderSelection"
              check-strategy="child"
              :options="cascaderOptions"
              clearable
              :to="'#pavp-overlay-root'"
              :placeholder="t('showcase.placeholder')"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NTransfer"
            span="wide"
            compact-inset
          >
            <NTransfer
              v-model:value="transfer"
              :options="options"
            />
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
