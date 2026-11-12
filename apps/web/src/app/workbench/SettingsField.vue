<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  readonly id: string
  readonly label: string
}>()
const labelledBy = computed(() => `${props.id}-label`)
const inputProps = computed(() => ({
  id: props.id,
  'aria-labelledby': labelledBy.value,
}))
</script>
<template>
  <div
    class="wb-settings-field grid min-w-0 items-center"
    role="group"
    :aria-labelledby="labelledBy"
  >
    <div class="grid min-w-0 gap-component-unit">
      <span
        :id="labelledBy"
        class="font-title-weight"
      >
        {{ label }}
      </span>
    </div>
    <div class="wb-field-control min-w-0">
      <slot
        :input-props="inputProps"
        :labelled-by="labelledBy"
      />
    </div>
  </div>
</template>
