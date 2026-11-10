<script setup lang="ts">
import { computed, ref } from 'vue'
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
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentNavigationPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
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
      class="wb-page grid min-w-0"
      :aria-label="title"
    >
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.navigationPaths') }}
        </h2>
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
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.navigationViews') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NTabs · NTabPane"
            span="wide"
          >
            <NTabs
              type="segment"
              default-value="first"
            >
              <NTabPane
                name="first"
                :tab="t('showcase.first')"
              >
                {{ t('showcase.first') }}
              </NTabPane>
              <NTabPane
                name="second"
                :tab="t('showcase.second')"
              >
                {{ t('showcase.second') }}
              </NTabPane>
              <NTabPane
                name="third"
                :tab="t('showcase.third')"
              >
                {{ t('showcase.third') }}
              </NTabPane>
            </NTabs>
          </ComponentSpecimen>
          <ComponentSpecimen name="NTab">
            <NTabs
              type="segment"
              default-value="first"
            >
              <NTab name="first">
                {{ t('showcase.first') }}
              </NTab>
              <NTab name="second">
                {{ t('showcase.second') }}
              </NTab>
            </NTabs>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.navigationSteps') }}
        </h2>
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
              @keydown.enter="confirmPage"
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
      </section>
    </section>
  </WorkbenchPage>
</template>
