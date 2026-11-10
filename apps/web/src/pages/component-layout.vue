<script setup lang="ts">
import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  shallowRef,
} from 'vue'
import { NAffix } from 'naive-ui/es/affix'
import { NAnchor, NAnchorLink } from 'naive-ui/es/anchor'
import { NBackTop } from 'naive-ui/es/back-top'
import { NButton } from 'naive-ui/es/button'
import { NCard } from 'naive-ui/es/card'
import { NCarousel, NCarouselItem } from 'naive-ui/es/carousel'
import { NCollapse, NCollapseItem } from 'naive-ui/es/collapse'
import { NCollapseTransition } from 'naive-ui/es/collapse-transition'
import { NDivider } from 'naive-ui/es/divider'
import { NFlex } from 'naive-ui/es/flex'
import { NGi, NGrid } from 'naive-ui/es/grid'
import { NInfiniteScroll } from 'naive-ui/es/infinite-scroll'
import { NLayout, NLayoutContent, NLayoutFooter, NLayoutHeader } from 'naive-ui/es/layout'
import { NMarquee } from 'naive-ui/es/marquee'
import { NCol, NRow } from 'naive-ui/es/legacy-grid'
import { NScrollbar } from 'naive-ui/es/scrollbar'
import { NSpace } from 'naive-ui/es/space'
import { NVirtualList } from 'naive-ui/es/virtual-list'
import { NSplit } from 'naive-ui/es/split'
import { NWatermark } from 'naive-ui/es/watermark'
import { UiScrollArea, UiSection, type UiScrollController } from '@platform/ui'
import { useConsoleI18n } from '../shared/i18n'
import { useAppearanceReadBoundary } from '../app/appearance/appearance-read-boundary'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'

defineOptions({ name: 'ComponentLayoutPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const appearance = useAppearanceReadBoundary()
const active = ref(true)
const expanded = ref(true)
const itemTarget = ref<HTMLElement | null>(null)
const anchorViewport = ref<HTMLElement | null>(null)
const itemSize = ref<number | null>(null)
const shownItems = ref(6)
const scrollItems = [
  'NButton',
  'NInput',
  'NSelect',
  'NSwitch',
  'NRadio',
  'NTag',
  'NAlert',
  'NCard',
  'NTable',
  'NImage',
  'NTree',
  'NMenu',
]
const virtualItems = scrollItems.map((label) => ({ key: label, label }))
let observer: ResizeObserver | null = null
function navigateAnchor(event: MouseEvent): void {
  const viewport = anchorViewport.value
  const link = event.target instanceof Element ? event.target.closest('a') : null
  const href = link?.getAttribute('href')
  if (!viewport || !href?.startsWith('#')) return
  const target = viewport.querySelector(href)
  if (!target) return
  viewport.scrollTo({
    top:
      viewport.scrollTop +
      target.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top,
    behavior: 'instant',
  })
}
function observeItemTarget(): void {
  observer?.disconnect()
  const target = itemTarget.value
  if (!target) return
  const update = (): void => {
    itemSize.value = target.getBoundingClientRect().height
  }
  update()
  observer = new ResizeObserver(update)
  observer.observe(target)
}
onMounted(observeItemTarget)
onActivated(() => {
  active.value = true
  observeItemTarget()
})
onDeactivated(() => {
  active.value = false
  observer?.disconnect()
})
onBeforeUnmount(() => {
  observer?.disconnect()
})
const scroll = shallowRef<UiScrollController | null>(null)
const carouselItems = computed(() => [
  { key: 'first', label: t('showcase.first') },
  { key: 'second', label: t('showcase.second') },
  { key: 'third', label: t('showcase.third') },
])
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
          {{ t('showcase.group.layoutStructure') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NCard"
            span="wide"
          >
            <NCard
              :title="t('showcase.preview')"
              :bordered="false"
            >
              {{ t('showcase.description') }}
            </NCard>
          </ComponentSpecimen>
          <ComponentSpecimen name="NFlex · NSpace">
            <NFlex>
              <NButton>{{ t('showcase.first') }}</NButton>
              <NButton>{{ t('showcase.second') }}</NButton>
            </NFlex>
            <NSpace>
              <NButton>{{ t('showcase.third') }}</NButton>
              <NButton>{{ t('showcase.primary') }}</NButton>
            </NSpace>
          </ComponentSpecimen>
          <ComponentSpecimen name="NGrid · NRow">
            <NGrid :cols="2">
              <NGi>
                <div
                  class="wb-grid-cell text-center rounded-control min-w-0 bg-surface-panel p-page-inline"
                >
                  {{ t('showcase.first') }}
                </div>
              </NGi>
              <NGi>
                <div
                  class="wb-grid-cell text-center rounded-control min-w-0 bg-surface-panel p-page-inline"
                >
                  {{ t('showcase.second') }}
                </div>
              </NGi>
            </NGrid>
            <NRow class="w-full">
              <NCol :span="12">
                <div class="text-center min-w-0 p-page-inline">
                  {{ t('showcase.first') }}
                </div>
              </NCol>
              <NCol :span="12">
                <div class="text-center min-w-0 p-page-inline">
                  {{ t('showcase.second') }}
                </div>
              </NCol>
            </NRow>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NLayout · NLayoutHeader · NLayoutContent · NLayoutFooter"
            span="wide"
          >
            <NLayout>
              <NLayoutHeader class="p-page-inline">
                {{ t('showcase.preview') }}
              </NLayoutHeader>
              <NLayoutContent class="p-page-inline">
                {{ t('showcase.description') }}
              </NLayoutContent>
              <NLayoutFooter class="p-page-inline">
                {{ t('showcase.preview') }}
              </NLayoutFooter>
            </NLayout>
          </ComponentSpecimen>
          <ComponentSpecimen name="NSplit">
            <div class="wb-scroll-example w-full">
              <NSplit direction="horizontal">
                <template #1>
                  <div class="text-center grid h-full min-w-0 place-items-center p-page-inline">
                    {{ t('showcase.first') }}
                  </div>
                </template>
                <template #2>
                  <div class="text-center grid h-full min-w-0 place-items-center p-page-inline">
                    {{ t('showcase.second') }}
                  </div>
                </template>
              </NSplit>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiSection"
            pavp
          >
            <UiSection :title="t('showcase.preview')">
              <span>{{ t('showcase.description') }}</span>
            </UiSection>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.layoutContent') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NCollapse · NCollapseItem"
            span="wide"
            reserved
          >
            <NCollapse accordion>
              <NCollapseItem
                name="first"
                :title="t('showcase.first')"
              >
                {{ t('showcase.preview') }}
              </NCollapseItem>
              <NCollapseItem
                name="second"
                :title="t('showcase.second')"
              >
                {{ t('showcase.description') }}
              </NCollapseItem>
            </NCollapse>
          </ComponentSpecimen>
          <ComponentSpecimen name="NDivider">
            <div class="min-w-0">
              <span>{{ t('showcase.first') }}</span>
              <NDivider>{{ t('showcase.preview') }}</NDivider>
              <span>{{ t('showcase.second') }}</span>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NCarousel · NCarouselItem"
            span="wide"
          >
            <div class="wb-scroll-example w-full">
              <NCarousel
                class="h-full"
                show-arrow
              >
                <NCarouselItem
                  v-for="item in carouselItems"
                  :key="item.key"
                >
                  <div class="rounded-control h-full bg-surface-panel p-page-inline">
                    {{ item.label }}
                  </div>
                </NCarouselItem>
              </NCarousel>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen name="NWatermark">
            <NWatermark
              content="PAVP"
              cross
            >
              {{ t('showcase.preview') }}
            </NWatermark>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NCollapseTransition"
            reserved
          >
            <NButton @click="expanded = !expanded">
              {{ t('showcase.open') }}
            </NButton>
            <div class="w-full">
              <NCollapseTransition
                v-if="active && appearance.snapshot.value.motion === 'full'"
                :show="expanded"
              >
                {{ t('showcase.description') }}
              </NCollapseTransition>
              <span v-else-if="expanded">{{ t('showcase.description') }}</span>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NMarquee"
            span="wide"
          >
            <NMarquee
              v-if="active && appearance.snapshot.value.motion === 'full'"
              class="w-full"
            >
              {{ t('showcase.description') }} · PAVP · Naive UI
            </NMarquee>
            <span v-else>{{ t('showcase.description') }} · PAVP · Naive UI</span>
          </ComponentSpecimen>
        </div>
      </section>
      <section class="grid min-w-0 gap-content-gap">
        <h2 class="font-title-weight m-0 text-subheading text-text-primary">
          {{ t('showcase.group.layoutScroll') }}
        </h2>
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            name="NAffix · NAnchor · NAnchorLink · NBackTop"
            span="wide"
            reserved
          >
            <div
              class="wb-scroll-example w-full relative"
              data-lenis-prevent
            >
              <UiScrollArea
                owner-id="component-anchor"
                @viewport="anchorViewport = $event"
              >
                <NAffix
                  v-if="active && anchorViewport"
                  :listen-to="anchorViewport"
                  :top="0"
                  position="absolute"
                >
                  <NAnchor
                    :listen-to="anchorViewport"
                    :offset-target="anchorViewport"
                    @click.prevent="navigateAnchor"
                  >
                    <NAnchorLink
                      href="#showcase-scroll-first"
                      :title="t('showcase.first')"
                    />
                    <NAnchorLink
                      href="#showcase-scroll-second"
                      :title="t('showcase.second')"
                    />
                  </NAnchor>
                </NAffix>
                <div
                  id="showcase-scroll-first"
                  class="min-h-target-enhanced p-page-inline"
                >
                  {{ t('showcase.first') }}
                </div>
                <div class="min-h-target-enhanced p-page-inline">
                  {{ t('showcase.description') }}
                </div>
                <div class="min-h-target-enhanced p-page-inline">
                  {{ t('showcase.description') }}
                </div>
                <div
                  id="showcase-scroll-second"
                  class="min-h-target-enhanced p-page-inline"
                >
                  {{ t('showcase.second') }}
                </div>
              </UiScrollArea>
              <NBackTop
                v-if="active && anchorViewport && appearance.snapshot.value.motion === 'full'"
                :listen-to="anchorViewport"
                :visibility-height="1"
                to="#pavp-overlay-root"
                role="button"
                :aria-label="t('workbench.toStart')"
                class="z-overlay"
              />
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NScrollbar"
            span="wide"
          >
            <div
              class="wb-scroll-example w-full"
              data-lenis-prevent
            >
              <NScrollbar class="h-full">
                <div
                  v-for="item in scrollItems"
                  :key="item"
                  class="min-h-target-enhanced p-page-inline"
                >
                  {{ item }}
                </div>
              </NScrollbar>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NInfiniteScroll"
            span="wide"
          >
            <div
              class="wb-scroll-example w-full"
              data-lenis-prevent
            >
              <NInfiniteScroll
                class="h-full"
                :on-load="
                  () => {
                    shownItems = Math.min(shownItems + 3, scrollItems.length)
                  }
                "
              >
                <div
                  v-for="item in scrollItems.slice(0, shownItems)"
                  :key="item"
                  class="min-h-target-enhanced p-page-inline"
                >
                  {{ item }}
                </div>
              </NInfiniteScroll>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NVirtualList"
            span="wide"
          >
            <div
              class="wb-scroll-example w-full relative"
              data-lenis-prevent
            >
              <span
                ref="itemTarget"
                class="invisible absolute min-h-target-enhanced"
                aria-hidden="true"
              />
              <NVirtualList
                v-if="itemSize"
                class="h-full"
                :items="virtualItems"
                :item-size="itemSize"
                item-resizable
              >
                <template #default="{ item }">
                  <div class="min-h-target-enhanced p-page-inline">
                    {{ item.label }}
                  </div>
                </template>
              </NVirtualList>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiScrollArea"
            pavp
            span="full"
          >
            <div
              class="wb-scroll-example w-full"
              data-lenis-prevent
            >
              <UiScrollArea
                owner-id="component-showcase-scroll"
                @controller="scroll = $event"
              >
                <div
                  v-for="name in scrollItems"
                  :key="name"
                  class="min-h-target-enhanced p-page-inline"
                >
                  {{ name }}
                </div>
              </UiScrollArea>
            </div>
            <NButton
              size="small"
              @click="scroll?.scrollToStart({ behavior: 'smooth' })"
            >
              {{ t('workbench.toStart') }}
            </NButton>
            <NButton
              size="small"
              @click="scroll?.scrollToEnd({ behavior: 'smooth' })"
            >
              {{ t('workbench.toEnd') }}
            </NButton>
            <template #detail>
              {{ t('showcase.layoutNote') }}
            </template>
          </ComponentSpecimen>
        </div>
      </section>
    </section>
  </WorkbenchPage>
</template>
