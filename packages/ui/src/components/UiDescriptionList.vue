<script setup lang="ts">
import {
  PavpDescriptionsItemPrimitive,
  PavpDescriptionsPrimitive,
} from '../adapters/naive/naive-descriptions'
import type { UiDescriptionItem } from './contracts'

defineOptions({ name: 'UiDescriptionList' })

defineProps<{
  readonly items: readonly UiDescriptionItem[]
}>()
</script>

<template>
  <PavpDescriptionsPrimitive
    bordered
    :column="1"
    label-placement="left"
  >
    <PavpDescriptionsItemPrimitive
      v-for="item in items"
      :key="item.label"
      :label="item.label"
    >
      {{ item.value }}
    </PavpDescriptionsItemPrimitive>
  </PavpDescriptionsPrimitive>
</template>
