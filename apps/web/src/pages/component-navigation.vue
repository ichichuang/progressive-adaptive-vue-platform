<script setup lang="ts">
import { computed, nextTick, ref, useId, withKeys, type HTMLAttributes } from 'vue'
import { NBreadcrumb, NBreadcrumbItem } from 'naive-ui/es/breadcrumb'
import { NButton } from 'naive-ui/es/button'
import { NDropdown } from 'naive-ui/es/dropdown'
import { NMenu } from 'naive-ui/es/menu'
import { NPageHeader } from 'naive-ui/es/page-header'
import { NPagination } from 'naive-ui/es/pagination'
import { NStep, NSteps } from 'naive-ui/es/steps'
import { NTab, NTabPane, NTabs } from 'naive-ui/es/tabs'
import { useConsoleI18n } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import WorkbenchSection from '../app/workbench/WorkbenchSection.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentNavigationPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()

type SegmentChoice = 'first' | 'second' | 'third'
const segmentChoiceLabels = {
  first: 'showcase.first',
  second: 'showcase.second',
  third: 'showcase.third',
} as const

function segmentChoices(options: readonly [SegmentChoice, ...SegmentChoice[]], hasPanels = false) {
  const current = ref<SegmentChoice>(options[0])
  const id = useId()
  const optionId = (option: SegmentChoice) => `${id}-option-${option}`
  const panelId = (option: SegmentChoice) => `${id}-panel-${option}`
  function select(value: string | number): void {
    const option = options.find((choice) => choice === value)
    if (option !== undefined) current.value = option
  }
  function keydown(event: KeyboardEvent, option: SegmentChoice): void {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return
    const host = event.currentTarget
    if (!(host instanceof HTMLElement)) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(option)
      return
    }
    let nextIndex: number
    switch (event.key) {
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = options.length - 1
        break
      case 'ArrowLeft':
      case 'ArrowRight': {
        const rtl = getComputedStyle(host).direction === 'rtl'
        const forward = (event.key === 'ArrowRight') !== rtl
        nextIndex = (options.indexOf(option) + (forward ? 1 : options.length - 1)) % options.length
        break
      }
      default:
        return
    }
    const next = options[nextIndex]
    if (next === undefined) return
    event.preventDefault()
    select(next)
    void nextTick(() => {
      if (current.value === next) {
        host.ownerDocument.getElementById(optionId(next))?.focus({ preventScroll: true })
      }
    })
  }
  function attributes(option: SegmentChoice): HTMLAttributes {
    const selected = current.value === option
    return {
      id: optionId(option),
      role: 'button',
      tabindex: selected ? 0 : -1,
      'aria-pressed': selected,
      'aria-controls': selected && hasPanels ? panelId(option) : undefined,
      onKeydown: (event: KeyboardEvent) => {
        keydown(event, option)
      },
    }
  }
  return { options, current, select, attributes, optionId, panelId, keydown }
}

const paneChoices = segmentChoices(['first', 'second', 'third'], true)
const tabChoices = segmentChoices(['first', 'second'])
const page = ref(1)
const pageCount = 3
function confirmPage(event: KeyboardEvent): void {
  if (!(event.target instanceof HTMLInputElement)) return
  const requested = Number(event.target.value)
  if (Number.isInteger(requested) && requested >= 1) page.value = Math.min(requested, pageCount)
}
const step = ref(1)
const selectedMenu = ref('first')
const dropdownValue = ref('')
const options = computed(() => [
  { label: t('showcase.first'), key: 'first' },
  { label: t('showcase.second'), key: 'second' },
  { label: t('showcase.third'), key: 'third' },
])
const dropdownLabel = computed(
  () => options.value.find((option) => option.key === dropdownValue.value)?.label,
)
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <section
      class="grid min-w-0 gap-field-gap"
      :aria-label="title"
    >
      <WorkbenchSection :title="t('showcase.group.navigationPaths')">
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NBreadcrumb · NBreadcrumbItem">
            <NBreadcrumb>
              <NBreadcrumbItem>PAVP</NBreadcrumbItem>
              <NBreadcrumbItem>{{ title }}</NBreadcrumbItem>
            </NBreadcrumb>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NMenu"
            span="wide"
          >
            <NMenu
              v-model:value="selectedMenu"
              :options="options"
            />
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NDropdown"
            recreate-on-activate
          >
            <NDropdown
              :options="options"
              :to="'#pavp-overlay-root'"
              trigger="click"
              @select="dropdownValue = $event"
            >
              <NButton>{{ t('showcase.open') }}</NButton>
            </NDropdown>
            <span class="text-text-secondary">{{ dropdownLabel }}</span>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NPageHeader"
            span="wide"
          >
            <NPageHeader
              :title="t('showcase.preview')"
              :subtitle="t('showcase.description')"
            />
          </ComponentSpecimen>
        </div>
      </WorkbenchSection>
      <WorkbenchSection :title="t('showcase.group.navigationViews')">
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NTabs · NTabPane"
            span="wide"
          >
            <NTabs
              type="segment"
              :value="paneChoices.current.value"
              animated
              v-bind="
                {
                  class: 'min-w-0',
                  role: 'group',
                  'aria-label': t('showcase.group.navigationViews') + ' · NTabPane',
                } satisfies HTMLAttributes
              "
              @update:value="paneChoices.select"
            >
              <NTabPane
                v-for="choice in paneChoices.options"
                :key="choice"
                :name="choice"
                :tab="t(segmentChoiceLabels[choice])"
                :tab-props="paneChoices.attributes(choice)"
                v-bind="
                  {
                    class: 'min-w-0',
                    id: paneChoices.panelId(choice),
                    role: 'region',
                    'aria-labelledby': paneChoices.optionId(choice),
                  } satisfies HTMLAttributes
                "
              >
                {{ t(segmentChoiceLabels[choice]) }}
              </NTabPane>
            </NTabs>
          </ComponentSpecimen>
          <ComponentSpecimen name="NTab">
            <NTabs
              type="segment"
              :value="tabChoices.current.value"
              v-bind="
                {
                  class: 'min-w-0',
                  role: 'group',
                  'aria-label': t('showcase.group.navigationViews') + ' · NTab',
                } satisfies HTMLAttributes
              "
              @update:value="tabChoices.select"
            >
              <NTab
                v-for="choice in tabChoices.options"
                :key="choice"
                :name="choice"
                v-bind="
                  {
                    class: 'min-w-0',
                    id: tabChoices.optionId(choice),
                    role: 'button',
                    tabindex: tabChoices.current.value === choice ? 0 : -1,
                    'aria-pressed': tabChoices.current.value === choice,
                    onKeydown: (event) => {
                      tabChoices.keydown(event, choice)
                    },
                  } satisfies HTMLAttributes
                "
              >
                {{ t(segmentChoiceLabels[choice]) }}
              </NTab>
            </NTabs>
          </ComponentSpecimen>
        </div>
      </WorkbenchSection>
      <WorkbenchSection :title="t('showcase.group.navigationSteps')">
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NPagination"
            span="wide"
            :modes="['simple']"
          >
            <NPagination
              v-model:page="page"
              :page-count="pageCount"
              simple
              v-bind="{ onKeydown: withKeys(confirmPage, ['enter']) } satisfies HTMLAttributes"
            />
            <template #detail>
              {{ t('showcase.page') + ' ' + page }}
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NSteps · NStep"
            span="wide"
            :modes="['vertical']"
          >
            <NSteps
              :current="step"
              size="small"
              vertical
            >
              <NStep :title="t('showcase.first')" />
              <NStep :title="t('showcase.second')" />
              <NStep :title="t('showcase.third')" />
            </NSteps>
            <NButton
              size="small"
              :disabled="step === 1"
              @click="step--"
            >
              {{ t('showcase.previous') }}
            </NButton>
            <NButton
              size="small"
              :disabled="step === 3"
              @click="step++"
            >
              {{ t('showcase.next') }}
            </NButton>
          </ComponentSpecimen>
        </div>
      </WorkbenchSection>
    </section>
  </WorkbenchPage>
</template>
