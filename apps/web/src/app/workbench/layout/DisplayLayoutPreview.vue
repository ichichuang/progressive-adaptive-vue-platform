<script setup lang="ts">
import { useId, type ButtonHTMLAttributes, type HTMLAttributes } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NFlex } from 'naive-ui/es/flex'
import { NText } from 'naive-ui/es/typography'
import { type UiDisplayRatio } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
import DisplayOperationsBoard from './DisplayOperationsBoard.vue'

const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly fixed?: boolean
  readonly ratio?: UiDisplayRatio
}>()
const emit = defineEmits<{ 'update:ratio': [ratio: UiDisplayRatio] }>()
const { t } = useConsoleI18n()
const descriptionId = useId()
const ratios = [
  { width: 16, height: 9 },
  { width: 4, height: 3 },
  { width: 21, height: 9 },
] as const
</script>

<template>
  <NFlex
    vertical
    :size="0"
    :wrap="false"
    class="flex-1 h-full min-h-0 min-w-0 w-full overflow-hidden bg-surface-page text-text-primary"
    v-bind="
      {
        role: 'region',
        'aria-label': title,
        'aria-describedby': descriptionId,
      } satisfies HTMLAttributes
    "
  >
    <NText
      v-bind="{ id: descriptionId } satisfies HTMLAttributes"
      class="sr-only"
    >
      {{ message }}
    </NText>
    <NFlex
      align="center"
      justify="space-between"
      class="shrink-0 bg-surface-panel gap-content-gap p-panel-narrow"
    >
      <NFlex
        vertical
        :size="0"
        class="min-w-0"
      >
        <NText
          strong
          class="text-caption text-control-primary"
        >
          PAVP · DATA OPERATIONS
        </NText>
        <NText
          tag="h1"
          class="leading-title font-title-weight m-0 text-heading text-text-primary"
          data-route-focus="architecture-console-page-heading"
          v-bind="{ tabindex: -1 } satisfies HTMLAttributes"
        >
          {{ t('displayPreview.title') }}
        </NText>
      </NFlex>
      <NFlex
        v-if="props.fixed"
        align="center"
        size="small"
        class="min-w-0"
      >
        <NButton
          v-for="choice in ratios"
          :key="choice.width"
          size="small"
          :type="ratio?.width === choice.width ? 'primary' : 'default'"
          v-bind="{ 'aria-pressed': ratio?.width === choice.width } satisfies ButtonHTMLAttributes"
          @click="emit('update:ratio', choice)"
        >
          {{ choice.width }}:{{ choice.height }}
        </NButton>
      </NFlex>
    </NFlex>
    <NFlex
      :size="0"
      class="flex-1 min-h-0 min-w-0 w-full"
    >
      <slot>
        <DisplayOperationsBoard />
      </slot>
    </NFlex>
  </NFlex>
</template>
