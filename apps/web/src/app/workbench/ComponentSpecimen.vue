<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, useId } from 'vue'
import { UiCopyAction } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import { NCollapse, NCollapseItem } from 'naive-ui/es/collapse'
import { NCard } from 'naive-ui/es/card'
import { NTag } from 'naive-ui/es/tag'
import { useConsoleI18n, type ConsoleMessageKey } from '../../shared/i18n'
import { componentPurposeKeys } from './component-purpose-keys'

const props = withDefaults(
  defineProps<{
    readonly name: string
    readonly pavp?: boolean
    readonly span?: 'compact' | 'medium' | 'wide' | 'full'
    readonly tall?: boolean
    readonly reserved?: boolean
    readonly compactInset?: boolean
    readonly topAligned?: boolean
    readonly recreateOnActivate?: boolean
    readonly modes?: readonly string[]
  }>(),
  {
    pavp: false,
    span: 'compact',
    tall: false,
    reserved: false,
    compactInset: false,
    topAligned: false,
    recreateOnActivate: false,
    modes: () => [],
  },
)
defineSlots<{ default: () => unknown; detail?: () => unknown }>()
const { t } = useConsoleI18n()
const modesId = useId()
const names = computed(() => [
  ...new Set(props.name.match(/\b(?:N[A-Z]\w*|Ui[A-Z]\w*|Lucide)\b/gu) ?? []),
])
const purpose = computed(() => componentPurposeKeys[names.value[0] ?? ''])
const modeLabels: Readonly<Partial<Record<string, ConsoleMessageKey>>> = {
  simple: 'showcase.mode.simple',
  vertical: 'showcase.mode.vertical',
  'disabled option': 'showcase.mode.disabledOption',
  small: 'showcase.small',
  medium: 'showcase.medium',
  large: 'showcase.large',
  primary: 'showcase.primary',
  info: 'showcase.info',
  success: 'showcase.success',
  warning: 'showcase.warning',
  error: 'showcase.error',
  secondary: 'showcase.secondary',
  tertiary: 'showcase.mode.tertiary',
  ghost: 'showcase.mode.ghost',
  text: 'showcase.mode.text',
  disabled: 'showcase.disabled',
  loading: 'showcase.loading',
  line: 'showcase.mode.line',
  circle: 'showcase.mode.circle',
}
function modeLabel(mode: string): string {
  const key = modeLabels[mode]
  return key === undefined ? mode : t(key)
}
const previewMounted = ref(true)
onActivated(() => {
  if (props.recreateOnActivate) previewMounted.value = true
})
onDeactivated(() => {
  if (props.recreateOnActivate) previewMounted.value = false
})
</script>

<template>
  <NCard
    :bordered="false"
    class="min-w-0"
    :data-span="span"
    :content-class="
      span === 'full'
        ? 'grid min-w-0 gap-content-gap'
        : 'grid min-w-0 gap-content-gap layout-regular:grid-cols-3 layout-wide:grid-cols-3'
    "
  >
    <div class="flex flex-col min-w-0 items-start gap-content-gap">
      <div class="flex flex-wrap items-center justify-between gap-content-gap">
        <h3 class="font-title-weight m-0 min-w-0 break-anywhere text-subheading text-text-primary">
          {{ name }}
        </h3>
        <NTag
          :bordered="false"
          size="small"
          :type="pavp ? 'success' : 'info'"
        >
          {{ t(pavp ? 'showcase.pavp' : 'showcase.naive') }}
        </NTag>
      </div>
      <p
        v-if="purpose"
        class="m-0 text-body text-text-secondary"
      >
        {{ t(purpose) }}
      </p>
      <div class="flex flex-wrap items-center gap-component-unit">
        <UiCopyAction
          v-for="item in names"
          :key="item"
          variant="text"
          :value="item"
          :label="item"
          :copy-label="t('workbench.copy')"
          :success-label="t('workbench.copied')"
          :failure-label="t('workbench.copyFailed')"
        />
      </div>
    </div>
    <div
      class="grid min-w-0 content-start gap-content-gap"
      :class="{ 'layout-regular:col-span-2 layout-wide:col-span-2': span !== 'full' }"
    >
      <div
        class="wb-motion-stage rounded-control flex flex-wrap min-w-0 bg-surface-page gap-content-gap"
        :class="{
          'items-start': topAligned,
          'items-center': !topAligned,
          'wb-bento-reserved': reserved || tall,
          'p-page-inline': !compactInset,
        }"
      >
        <slot v-if="previewMounted" />
      </div>
      <NCollapse
        v-if="modes.length"
        display-directive="show"
        class="min-w-0 text-caption text-text-secondary"
      >
        <NCollapseItem name="styles-and-copy">
          <template #header="{ collapsed }">
            <NButton
              text
              type="primary"
              class="min-h-target-enhanced"
              :aria-expanded="!collapsed"
              :aria-controls="modesId"
            >
              {{ t('showcase.stylesAndCopy') }}
            </NButton>
          </template>
          <div
            :id="modesId"
            class="flex flex-wrap gap-component-unit"
          >
            <UiCopyAction
              v-for="mode in modes"
              :key="mode"
              variant="text"
              :value="`${names[0]} · ${mode}`"
              :label="modeLabel(mode)"
              :copy-label="`${t('workbench.copy')} ${names[0]}`"
              :success-label="t('workbench.copied')"
              :failure-label="t('workbench.copyFailed')"
            />
          </div>
        </NCollapseItem>
      </NCollapse>
      <div
        v-if="$slots['detail']"
        class="text-text-secondary"
      >
        <slot name="detail" />
      </div>
    </div>
  </NCard>
</template>
