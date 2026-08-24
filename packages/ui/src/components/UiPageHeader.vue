<script setup lang="ts">
import {
  PavpBreadcrumbItemPrimitive,
  PavpBreadcrumbPrimitive,
} from '../adapters/naive/naive-breadcrumb'

defineOptions({ name: 'UiPageHeader' })

defineProps<{
  readonly breadcrumb: string
  readonly summary: string
  readonly title: string
}>()
</script>

<template>
  <header class="pavp-page-header">
    <PavpBreadcrumbPrimitive>
      <PavpBreadcrumbItemPrimitive>PAVP</PavpBreadcrumbItemPrimitive>
      <PavpBreadcrumbItemPrimitive>{{ breadcrumb }}</PavpBreadcrumbItemPrimitive>
    </PavpBreadcrumbPrimitive>
    <div class="pavp-page-header__copy">
      <h1
        class="leading-title font-title-weight m-0 text-text-primary text-title"
        data-route-focus="architecture-console-page-heading"
        tabindex="-1"
      >
        {{ title }}
      </h1>
      <p class="leading-body m-0 text-body text-text-secondary">
        {{ summary }}
      </p>
    </div>
  </header>
</template>

<style scoped>
.pavp-page-header,
.pavp-page-header__copy {
  display: grid;
  gap: var(--ui-space-content-gap);
}
</style>
