<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { NCard } from 'naive-ui/es/card'
import { tokens, type TokenName } from '@platform/design-system'
import { useConsoleI18n } from '../../shared/i18n'
const props = defineProps<{ readonly name: TokenName }>()
const { t } = useConsoleI18n()
const copied = ref<'idle' | 'copied' | 'failed'>('idle')
let copyAttempt = 0
let disposed = false
watch(
  () => props.name,
  () => {
    copyAttempt += 1
    copied.value = 'idle'
  },
)
onScopeDispose(() => {
  disposed = true
  copyAttempt += 1
})
const expression = computed(() => tokens[props.name])
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
  if (name === 'interaction.shadow.panel') return 'shadow'
  if (name.startsWith('interaction.motion.')) return 'motion'
  if (name.startsWith('layout.z.')) return 'layer'
  return name.includes('block-size') || name === 'interaction.control.height'
    ? 'block-size'
    : 'inline-size'
})
const pairedBackground = computed(() => {
  if (props.name === 'color.text.on-action') return tokens['color.action.primary']
  for (const tone of ['info', 'success', 'warning', 'error'] as const)
    if (props.name === `color.text.on-status.${tone}`) return tokens[`color.status.${tone}`]
  return tokens['color.surface.panel']
})
async function copy(): Promise<void> {
  if (disposed) return
  const attempt = ++copyAttempt
  const name = props.name
  const current = (): boolean => !disposed && copyAttempt === attempt && props.name === name
  copied.value = 'idle'
  try {
    if (!('clipboard' in navigator)) throw new Error('Clipboard unavailable.')
    await navigator.clipboard.writeText(expression.value)
    if (current()) copied.value = 'copied'
  } catch {
    if (current()) copied.value = 'failed'
  }
}
</script>
<template>
  <NCard
    class="cursor-pointer"
    :bordered="false"
    hoverable
    content-class="flex min-w-0"
    @click="copy"
  >
    <button
      type="button"
      class="wb-specimen font-inherit p-0 text-start border-0 bg-inherit flex-1 grid min-w-0 cursor-pointer overflow-hidden gap-content-gap text-text-primary"
      :data-kind="kind"
      :style="{
        '--pavp-specimen-value': expression,
        '--pavp-specimen-background': pairedBackground,
      }"
      @click.stop="copy"
    >
      <span
        class="wb-specimen-preview rounded-control grid min-w-0 place-items-center overflow-hidden isolate bg-surface-page"
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
            class="wb-motion-dot rounded-control block bg-action-primary min-h-target-enhanced min-w-target-enhanced"
          />
        </span>
        <span
          v-else-if="kind === 'layer'"
          class="wb-layer-sample relative isolate"
        >
          <span
            class="border-solid absolute bg-surface-page border-border-default border-width-default"
          />
          <span class="border-solid absolute bg-action-primary border-width-default" />
        </span>
        <span
          v-else-if="name.startsWith('typography.')"
          class="wb-type-sample block p-page-inline"
        >
          {{ t('workbench.typeSample') }}
        </span>
        <span
          v-else
          class="wb-size-sample grid h-full w-full items-center p-page-inline text-control-primary"
        >
          <span class="rounded-control bg-current block" />
        </span>
      </span>
      <span class="wb-specimen-meta grid break-anywhere gap-content-gap">
        <strong class="leading-body font-title-weight">
          {{ name }}
        </strong>
        <code class="text-inherit select-text text-text-secondary">
          {{ expression }}
        </code>
      </span>
      <span
        class="wb-specimen-copy min-h-target-enhanced text-text-secondary"
        role="status"
        aria-live="polite"
      >
        {{
          t(
            copied === 'copied'
              ? 'workbench.copied'
              : copied === 'failed'
                ? 'workbench.copyFailed'
                : 'workbench.copy',
          )
        }}
      </span>
    </button>
  </NCard>
</template>
