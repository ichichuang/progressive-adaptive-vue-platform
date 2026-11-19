<script setup lang="ts">
import { computed } from 'vue'
import { NImage } from 'naive-ui/es/image'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import WorkbenchSection from '../app/workbench/WorkbenchSection.vue'
import displayThumbnail from '../app/workbench/layout/display-operations-thumbnail.webp'
import { useConsoleI18n } from '../shared/i18n'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'
import {
  getRouteLayoutCapability,
  getRouteMessageKey,
  isDisplayLayoutPreview,
  layoutPreviewRoutes,
} from '../app/router/route-registry'

defineOptions({ name: 'LayoutPreviewsPage' })
defineProps<{ readonly title: string; readonly message: string }>()

const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation({ openIn: 'new-page' })
const cards = computed(() =>
  layoutPreviewRoutes
    .map((route) => {
      const destination = registeredRouteDestination({ name: route.name })
      const { composition } = getRouteLayoutCapability(route.meta.layoutCapabilityId)
      const sidebar = composition === 'admin-workspace' || composition === 'admin-workspace-footer'
      return {
        destination,
        title: t(route.meta.titleKey),
        message: t(getRouteMessageKey(route)),
        display: isDisplayLayoutPreview(route.name),
        fixed: route.name === 'preview-layout-fixed-display',
        sidebar,
        header:
          sidebar || composition === 'header-content' || composition === 'header-content-footer',
        footer: composition?.endsWith('-footer') ?? false,
      }
    })
    .filter((card) => navigation.canShow(card.destination)),
)
const displays = computed(() => cards.value.filter((card) => card.display))
const shells = computed(() =>
  cards.value
    .filter((card) => !card.display)
    .sort(
      (left, right) =>
        Number(right.sidebar) - Number(left.sidebar) ||
        Number(right.header) - Number(left.header) ||
        Number(left.footer) - Number(right.footer),
    ),
)
</script>

<template>
  <WorkbenchPage
    :title="title"
    :message="message"
  >
    <div class="grid min-w-0 gap-field-gap">
      <WorkbenchSection
        v-if="displays.length > 0"
        :title="t('layoutPreview.displayGroup')"
      >
        <div
          class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        >
          <a
            v-for="card in displays"
            :key="card.destination.name"
            :href="navigation.resolveHref(card.destination)"
            target="_blank"
            rel="noopener"
            class="wb-layout-preview-link wb-link rounded-control no-underline grid min-w-0 items-center bg-surface-page gap-content-gap text-text-primary layout-narrow:grid-cols-5"
            @click="activate($event, card.destination)"
          >
            <NImage
              class="wb-layout-preview-frame rounded-control min-w-0 w-full items-center justify-center overflow-hidden bg-expression-accent-a-soft-background layout-narrow:col-span-2"
              :data-fixed="card.fixed"
              :src="displayThumbnail"
              :img-props="{ alt: '', decoding: 'async' }"
              object-fit="cover"
              preview-disabled
            />
            <div
              class="flex min-w-0 items-start justify-between gap-component-unit layout-narrow:col-span-3"
            >
              <div class="grid min-w-0 gap-component-unit">
                <h3 class="font-title-weight m-0 text-subheading text-text-primary">
                  {{ card.title }}
                </h3>
                <p class="m-0 text-caption text-text-secondary">
                  {{ card.message }}
                </p>
              </div>
              <span
                class="i-lucide-arrow-up-right shrink-0 text-control-primary"
                aria-hidden="true"
              />
            </div>
            <span class="sr-only">{{ t('layoutPreview.opensNewTab') }}</span>
          </a>
        </div>
      </WorkbenchSection>

      <WorkbenchSection
        v-if="shells.length > 0"
        :title="t('layoutPreview.shellGroup')"
      >
        <div
          class="grid grid-cols-1 min-w-0 gap-content-gap layout-regular:grid-cols-2 layout-wide:grid-cols-2"
        >
          <a
            v-for="card in shells"
            :key="card.destination.name"
            :href="navigation.resolveHref(card.destination)"
            target="_blank"
            rel="noopener"
            class="wb-layout-preview-link wb-link rounded-control no-underline grid grid-cols-4 min-w-0 items-center bg-surface-page gap-content-gap min-h-target-enhanced text-text-primary"
            @click="activate($event, card.destination)"
          >
            <svg
              class="rounded-control w-full bg-surface-panel"
              viewBox="0 0 240 130"
              aria-hidden="true"
            >
              <rect
                x="14"
                y="10"
                width="212"
                height="110"
                rx="7"
                fill="var(--ui-color-surface-panel)"
              />
              <rect
                v-if="card.header"
                x="14"
                y="10"
                width="212"
                height="16"
                rx="4"
                fill="var(--ui-color-action-primary)"
              />
              <rect
                v-if="card.sidebar"
                x="14"
                y="26"
                width="43"
                height="94"
                fill="var(--ui-color-expression-accent-a-soft-background)"
              />
              <rect
                :x="card.sidebar ? 64 : 23"
                :y="card.header ? 34 : 19"
                :width="card.sidebar ? 153 : 194"
                :height="card.footer ? (card.header ? 62 : 77) : card.header ? 77 : 92"
                rx="4"
                fill="var(--ui-color-surface-page)"
              />
              <g
                :transform="`translate(${card.sidebar ? 73 : 32} ${card.header ? 43 : 28})`"
                fill="var(--ui-color-expression-accent-a-soft-foreground)"
              >
                <rect
                  width="55"
                  height="6"
                  rx="3"
                  opacity=".62"
                />
                <rect
                  y="16"
                  :width="card.sidebar ? 110 : 145"
                  height="5"
                  rx="2"
                  opacity=".28"
                />
                <rect
                  y="28"
                  :width="card.sidebar ? 85 : 117"
                  height="5"
                  rx="2"
                  opacity=".28"
                />
              </g>
              <rect
                v-if="card.footer"
                :x="card.sidebar ? 57 : 14"
                y="104"
                :width="card.sidebar ? 169 : 212"
                height="16"
                rx="4"
                fill="var(--ui-color-action-primary)"
                opacity=".42"
              />
            </svg>
            <div class="flex col-span-3 min-w-0 items-start justify-between gap-component-unit">
              <div class="grid min-w-0 gap-component-unit">
                <h3 class="font-title-weight m-0 text-subheading text-text-primary">
                  {{ card.title }}
                </h3>
                <p class="m-0 text-caption text-text-secondary">
                  {{ card.message }}
                </p>
              </div>
              <span
                class="i-lucide-arrow-up-right shrink-0 text-control-primary"
                aria-hidden="true"
              />
            </div>
            <span class="sr-only">{{ t('layoutPreview.opensNewTab') }}</span>
          </a>
        </div>
      </WorkbenchSection>
    </div>
  </WorkbenchPage>
</template>
