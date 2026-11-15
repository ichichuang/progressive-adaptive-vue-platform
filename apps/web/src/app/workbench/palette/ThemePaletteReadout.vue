<script setup lang="ts">
import { useConsoleI18n } from '../../../shared/i18n'

const { t } = useConsoleI18n()
const swatches = [
  { label: 'workbench.primary', role: 'primary', mark: '01' },
  { label: 'workbench.tokenSubgroup.accentA', role: 'accent-a', mark: '02' },
  { label: 'workbench.tokenSubgroup.accentB', role: 'accent-b', mark: '03' },
] as const
</script>

<template>
  <ul class="m-0 p-0 list-none grid grid-cols-3 min-w-0 gap-component-unit">
    <li
      v-for="swatch in swatches"
      :key="swatch.label"
      class="rounded-control flex flex-col min-w-0 justify-between gap-component-unit min-h-target-enhanced p-panel-narrow"
      :class="{
        'bg-action-primary text-text-on-action': swatch.role === 'primary',
        'bg-expression-accent-a-solid-background text-expression-accent-a-solid-foreground':
          swatch.role === 'accent-a',
        'bg-expression-accent-b-solid-background text-expression-accent-b-solid-foreground':
          swatch.role === 'accent-b',
      }"
    >
      <span
        class="tabular-nums text-caption"
        aria-hidden="true"
        v-text="swatch.mark"
      />
      <span
        class="break-words text-caption"
        v-text="t(swatch.label)"
      />
    </li>
  </ul>
</template>
