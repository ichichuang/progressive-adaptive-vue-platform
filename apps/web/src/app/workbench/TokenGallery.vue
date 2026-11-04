<script setup lang="ts">
import type { TokenName } from '@platform/design-system'
import TokenSpecimen from './TokenSpecimen.vue'
defineProps<{ readonly names: readonly TokenName[]; readonly label: string }>()
</script>
<template>
  <section
    class="wb-specimen-grid grid gap-content-gap"
    :aria-label="label"
  >
    <TokenSpecimen
      v-for="name in names"
      :key="name"
      :name="name"
    />
  </section>
</template>
