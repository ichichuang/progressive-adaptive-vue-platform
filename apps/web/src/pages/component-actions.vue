<script setup lang="ts">
import { type ButtonHTMLAttributes, computed, ref, type HTMLAttributes } from 'vue'
import { NButton, type ButtonSize, type ButtonType } from 'naive-ui/es/button'
import { NButtonGroup } from 'naive-ui/es/button-group'
import { NFloatButton } from 'naive-ui/es/float-button'
import { NFloatButtonGroup } from 'naive-ui/es/float-button-group'
import { NIcon } from 'naive-ui/es/icon'
import { NIconWrapper } from 'naive-ui/es/icon-wrapper'
import { NGradientText } from 'naive-ui/es/gradient-text'
import { tokens } from '@platform/design-system'
import { UiCopyAction, UiNavigationLink } from '@platform/ui'
import { useConsoleI18n, type ConsoleMessageKey } from '../shared/i18n'
import WorkbenchPage from '../app/workbench/WorkbenchPage.vue'
import WorkbenchSection from '../app/workbench/WorkbenchSection.vue'
import ComponentSpecimen from '../app/workbench/ComponentSpecimen.vue'
import {
  useApplicationLinkActivation,
  useApplicationNavigation,
} from '../app/router/application-navigation'
import { registeredRouteDestination } from '../app/router/route-input'

defineOptions({ name: 'ComponentActionsPage' })
defineProps<{ readonly title: string; readonly breadcrumb?: string; readonly message: string }>()
const { t } = useConsoleI18n()
const navigation = useApplicationNavigation()
const activate = useApplicationLinkActivation()
const dashboard = registeredRouteDestination({ name: 'workbench-dashboard' })
const dashboardHref = computed(() =>
  navigation.canShow(dashboard) ? navigation.resolveHref(dashboard) : undefined,
)
const linkTypes = [
  'default',
  'tertiary',
  'primary',
  'info',
  'success',
  'warning',
  'error',
] as const satisfies readonly ButtonType[]
const linkSizes = ['tiny', 'small', 'medium', 'large'] as const satisfies readonly ButtonSize[]
type LinkAppearance = Pick<
  InstanceType<typeof UiNavigationLink>['$props'],
  | 'type'
  | 'size'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'ghost'
  | 'dashed'
  | 'text'
  | 'round'
  | 'bordered'
  | 'strong'
  | 'block'
>
const navigationLinkSamples: readonly {
  readonly title: ConsoleMessageKey
  readonly samples: readonly { readonly caption: string; readonly appearance: LinkAppearance }[]
}[] = [
  {
    title: 'showcase.navigationLink.colors',
    samples: linkTypes.map((type) => ({ caption: `type="${type}"`, appearance: { type } })),
  },
  {
    title: 'showcase.navigationLink.variants',
    samples: [
      { caption: 'secondary', appearance: { secondary: true } },
      { caption: 'tertiary', appearance: { tertiary: true } },
      { caption: 'quaternary', appearance: { quaternary: true } },
      { caption: 'ghost', appearance: { ghost: true } },
      { caption: 'dashed', appearance: { type: 'default', dashed: true } },
      { caption: 'text', appearance: { text: true } },
    ],
  },
  {
    title: 'showcase.navigationLink.sizes',
    samples: linkSizes.map((size) => ({ caption: `size="${size}"`, appearance: { size } })),
  },
  {
    title: 'showcase.navigationLink.shapeAndLayout',
    samples: [
      { caption: 'round', appearance: { round: true } },
      { caption: ':bordered="false"', appearance: { type: 'default', bordered: false } },
      { caption: 'strong', appearance: { strong: true } },
      { caption: 'block', appearance: { block: true } },
    ],
  },
]
const clicks = ref(0)
const floatClicks = ref(0)
const groupSelection = ref('first')
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
      <WorkbenchSection :title="t('showcase.group.actionsButtons')">
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen
            v-if="dashboardHref"
            name="UiNavigationLink"
            span="full"
            pavp
          >
            <div class="grid min-w-0 w-full gap-content-gap">
              <section
                v-for="group in navigationLinkSamples"
                :key="group.title"
                class="grid min-w-0 gap-content-gap"
              >
                <h4 class="font-title-weight m-0 text-body text-text-primary">
                  {{ t(group.title) }}
                </h4>
                <div class="flex flex-wrap min-w-0 items-end gap-content-gap">
                  <div
                    v-for="sample in group.samples"
                    :key="sample.caption"
                    class="flex flex-col min-w-0 gap-component-unit"
                    :class="{ 'w-full': sample.appearance.block === true }"
                  >
                    <code class="text-caption text-text-secondary">{{ sample.caption }}</code>
                    <UiNavigationLink
                      :href="dashboardHref"
                      :label="t('route-title.workbench-dashboard')"
                      :hover-label="t('welcomeArt.enterHover')"
                      :type="sample.appearance.type"
                      :size="sample.appearance.size"
                      :secondary="sample.appearance.secondary"
                      :tertiary="sample.appearance.tertiary"
                      :quaternary="sample.appearance.quaternary"
                      :ghost="sample.appearance.ghost"
                      :dashed="sample.appearance.dashed"
                      :text="sample.appearance.text"
                      :round="sample.appearance.round"
                      :bordered="sample.appearance.bordered"
                      :strong="sample.appearance.strong"
                      :block="sample.appearance.block"
                      @click="activate($event, dashboard)"
                    />
                  </div>
                </div>
              </section>
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="UiCopyAction"
            pavp
          >
            <div class="flex w-full justify-center">
              <UiCopyAction
                variant="primary"
                :value="t('showcase.purpose.UiCopyAction')"
                :label="t('showcase.copyPurpose')"
                copy-label="UiCopyAction"
                :success-label="t('workbench.copied')"
                :failure-label="t('workbench.copyFailed')"
              />
            </div>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · type"
            :modes="['primary', 'info', 'success', 'warning', 'error']"
            span="wide"
          >
            <NButton
              type="primary"
              @click="clicks++"
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="info"
              @click="clicks++"
            >
              {{ t('showcase.info') }}
            </NButton>
            <NButton
              type="success"
              @click="clicks++"
            >
              {{ t('showcase.success') }}
            </NButton>
            <NButton
              type="warning"
              @click="clicks++"
            >
              {{ t('showcase.warning') }}
            </NButton>
            <NButton
              type="error"
              @click="clicks++"
            >
              {{ t('showcase.error') }}
            </NButton>
            <template #detail>
              {{ t('showcase.buttonCount') + ': ' + clicks }}
            </template>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · variant"
            :modes="['secondary', 'tertiary', 'ghost', 'text', 'disabled', 'loading']"
          >
            <NButton
              type="primary"
              secondary
            >
              {{ t('showcase.secondary') }}
            </NButton>
            <NButton
              type="primary"
              tertiary
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="primary"
              ghost
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton
              type="primary"
              text
            >
              {{ t('showcase.primary') }}
            </NButton>
            <NButton disabled>
              {{ t('showcase.disabled') }}
            </NButton>
            <NButton loading>
              {{ t('showcase.loading') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButton · size"
            :modes="['small', 'medium', 'large']"
            span="medium"
          >
            <NButton size="small">
              {{ t('showcase.small') }}
            </NButton>
            <NButton size="medium">
              {{ t('showcase.medium') }}
            </NButton>
            <NButton size="large">
              {{ t('showcase.large') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen
            name="NButtonGroup"
            span="medium"
            :modes="['small']"
          >
            <NButtonGroup
              size="small"
              v-bind="
                {
                  class: 'min-w-0',
                  'aria-label': t('showcase.group.actionsButtons'),
                } satisfies HTMLAttributes
              "
              data-pavp-exclusive-selection
            >
              <NButton
                :type="groupSelection === 'first' ? 'primary' : 'default'"
                v-bind="
                  { 'aria-pressed': groupSelection === 'first' } satisfies ButtonHTMLAttributes
                "
                @click="groupSelection = 'first'"
              >
                {{ t('showcase.first') }}
              </NButton>
              <NButton
                :type="groupSelection === 'second' ? 'primary' : 'default'"
                v-bind="
                  { 'aria-pressed': groupSelection === 'second' } satisfies ButtonHTMLAttributes
                "
                @click="groupSelection = 'second'"
              >
                {{ t('showcase.second') }}
              </NButton>
            </NButtonGroup>
          </ComponentSpecimen>
          <ComponentSpecimen name="NFloatButton · NFloatButtonGroup">
            <NFloatButtonGroup position="relative">
              <NFloatButton
                type="primary"
                v-bind="
                  {
                    'aria-label': t('showcase.primary'),
                    onClick: () => {
                      floatClicks++
                    },
                  } satisfies HTMLAttributes
                "
              >
                <span
                  class="i-lucide-sparkles"
                  aria-hidden="true"
                />
              </NFloatButton>
              <NFloatButton
                type="default"
                v-bind="
                  {
                    'aria-label': t('showcase.secondary'),
                    onClick: () => {
                      floatClicks++
                    },
                  } satisfies HTMLAttributes
                "
              >
                <span
                  class="i-lucide-component"
                  aria-hidden="true"
                />
              </NFloatButton>
            </NFloatButtonGroup>
            <template #detail>
              {{ t('showcase.buttonCount') + ': ' + floatClicks }}
            </template>
          </ComponentSpecimen>
        </div>
      </WorkbenchSection>
      <WorkbenchSection :title="t('showcase.group.actionsVisual')">
        <div class="grid min-w-0 items-start gap-content-gap">
          <ComponentSpecimen name="NIcon · NIconWrapper · Lucide">
            <NIcon size="small">
              <span class="i-lucide-component inline-block" />
            </NIcon>
            <NIcon><span class="i-lucide-palette inline-block" /></NIcon>
            <NIcon size="large">
              <span class="i-lucide-sparkles inline-block" />
            </NIcon>
            <NIconWrapper
              :color="tokens['color.action.primary']"
              :icon-color="tokens['color.text.on-action']"
            >
              <NIcon><span class="i-lucide-check inline-block" /></NIcon>
            </NIconWrapper>
            <NButton type="primary">
              <template #icon>
                <NIcon><span class="i-lucide-check inline-block" /></NIcon>
              </template>
              {{ t('showcase.confirm') }}
            </NButton>
          </ComponentSpecimen>
          <ComponentSpecimen name="NGradientText">
            <NGradientText type="primary">
              {{ t('showcase.primary') }}
            </NGradientText>
            <NGradientText type="success">
              {{ t('showcase.success') }}
            </NGradientText>
            <NGradientText type="warning">
              {{ t('showcase.warning') }}
            </NGradientText>
          </ComponentSpecimen>
        </div>
      </WorkbenchSection>
    </section>
  </WorkbenchPage>
</template>
