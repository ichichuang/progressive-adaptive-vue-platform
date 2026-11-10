<script setup lang="ts">
import { computed } from 'vue'
import { UiCopyAction } from '@platform/ui'
import { tokens, type TokenName } from '@platform/design-system'
import { useConsoleI18n } from '../../shared/i18n'
import { tokenLabelKeys } from './token-labels'
const props = defineProps<{ readonly name: TokenName }>()
const { t } = useConsoleI18n()
const expression = computed(() => tokens[props.name])
const label = computed(() => t(tokenLabelKeys[props.name]))
const kind = computed(() => {
  const name = props.name
  if (name.startsWith('color.')) {
    if (name === 'color.border.default') return 'border'
    if (name === 'color.focus.ring') return 'focus'
    if (name.startsWith('color.text.') || name.startsWith('color.control.')) return 'foreground'
    return 'color'
  }
  if (name.startsWith('typography.')) return name.split('.')[1]
  if (name.startsWith('interaction.radius.')) return 'radius'
  if (
    name.startsWith('interaction.indicator.rail.') ||
    name === 'interaction.indicator.label.height'
  )
    return 'block-size'
  if (
    name.startsWith('interaction.icon.size.') ||
    name.startsWith('interaction.indicator.cell.') ||
    name.startsWith('interaction.indicator.circle.') ||
    name === 'interaction.indicator.marker.size' ||
    name === 'interaction.indicator.handle.size'
  )
    return 'square-size'
  if (name === 'interaction.shadow.panel') return 'shadow'
  if (name.startsWith('interaction.motion.')) return 'motion'
  if (name.startsWith('layout.z.')) return 'layer'
  return name.includes('block-size') ||
    name.includes('.block.') ||
    name.endsWith('.block') ||
    name === 'interaction.control.height'
    ? 'block-size'
    : 'inline-size'
})
const pairedBackground = computed(() => {
  if (props.name === 'color.text.on-action') return tokens['color.action.primary']
  for (const tone of ['info', 'success', 'warning', 'error'] as const)
    if (props.name === `color.text.on-status.${tone}`) return tokens[`color.status.${tone}`]
  return tokens['color.surface.panel']
})
</script>
<template>
  <UiCopyAction
    class="wb-token-card"
    :class="{
      'layout-regular:col-span-2 layout-wide:col-span-2':
        name.startsWith('typography.line-height.'),
    }"
    variant="card"
    :value="expression"
    :label="label"
    :copy-label="t('workbench.copy')"
    :success-label="t('workbench.copied')"
    :failure-label="t('workbench.copyFailed')"
    :data-kind="kind"
    :style="{
      '--pavp-specimen-value': expression,
      '--pavp-specimen-background': pairedBackground,
    }"
  >
    <span
      class="wb-specimen-preview rounded-control grid min-w-0 place-items-center overflow-hidden isolate bg-surface-page"
      :class="{ 'h-auto': name.startsWith('typography.') }"
      aria-hidden="true"
    >
      <span
        v-if="kind === 'foreground'"
        class="wb-foreground-sample font-title-weight grid h-full w-full place-items-center text-title"
      >
        Aa
      </span>
      <span
        v-else-if="kind === 'color'"
        class="wb-color-sample h-full w-full block"
      />
      <span
        v-else-if="kind === 'border' || kind === 'focus'"
        class="wb-border-sample grid place-items-center"
      >
        Aa
      </span>
      <span
        v-else-if="kind === 'radius'"
        class="wb-radius-sample border-solid grid place-items-center border-width-default text-control-primary text-title"
      >
        ↗
      </span>
      <span
        v-else-if="kind === 'shadow'"
        class="wb-shadow-sample grid place-items-center bg-surface-panel"
      >
        PAVP
      </span>
      <span
        v-else-if="kind === 'motion'"
        class="wb-motion-track w-full block p-page-inline"
      >
        <span
          class="wb-motion-dot rounded-control w-min block bg-action-primary min-h-target-enhanced min-w-target-enhanced"
        />
      </span>
      <span
        v-else-if="kind === 'layer'"
        class="wb-layer-sample relative isolate"
      >
        <span
          class="border-solid absolute bg-surface-page border-border-default border-width-default z-overlay"
        />
        <span class="border-solid absolute bg-action-primary border-width-default" />
      </span>
      <span
        v-else-if="name.startsWith('typography.')"
        class="wb-type-sample block p-page-inline"
      >
        {{ t(kind === 'line-height' ? 'workbench.typeParagraph' : 'workbench.typeSample') }}
      </span>
      <span
        v-else
        class="wb-size-sample grid h-full w-full place-items-center p-page-inline text-control-primary"
      >
        <span class="rounded-control bg-current block" />
      </span>
    </span>
    <code class="min-w-0 break-anywhere order-last text-caption text-text-secondary">
      {{ expression }}
    </code>
  </UiCopyAction>
</template>
