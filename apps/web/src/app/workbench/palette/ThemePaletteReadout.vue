<script setup lang="ts">
import { useConsoleI18n } from '../../../shared/i18n'

const { t } = useConsoleI18n()
const swatches = [
  { label: 'workbench.primary', role: 'primary' },
  { label: 'workbench.tokenSubgroup.accentA', role: 'accent-a' },
  { label: 'workbench.tokenSubgroup.accentB', role: 'accent-b' },
] as const
</script>

<template>
  <ul class="m-0 p-0 list-none grid grid-cols-3 min-w-0 gap-component-unit">
    <li
      v-for="swatch in swatches"
      :key="swatch.label"
      class="wb-palette-swatch rounded-control flex min-w-0 items-center min-h-target-enhanced layout-narrow:text-center layout-narrow:justify-center layout-regular:p-panel-narrow layout-wide:p-panel-narrow"
      :class="{
        'bg-action-primary text-text-on-action': swatch.role === 'primary',
        'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground':
          swatch.role === 'accent-a',
        'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground':
          swatch.role === 'accent-b',
      }"
    >
      <span
        class="leading-body font-title-weight min-w-0 break-words text-caption"
        v-text="t(swatch.label)"
      />
    </li>
  </ul>
</template>
