<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{
  readonly id: string
  readonly label: string
  readonly description: string
}>()
const labelledBy = computed(() => `${props.id}-label`)
const describedBy = computed(() => `${props.id}-note`)
const inputProps = computed(() => ({
  id: props.id,
  'aria-labelledby': labelledBy.value,
  'aria-describedby': describedBy.value,
}))
</script>
<template>
  <div
    class="wb-settings-field grid min-w-0 items-center gap-content-gap"
    role="group"
    :aria-labelledby="labelledBy"
  >
    <div class="min-w-0">
      <span
        :id="labelledBy"
        class="font-title-weight"
      >
        {{ label }}
      </span>
      <span
        :id="describedBy"
        class="sr-only"
      >
        {{ description }}
      </span>
    </div>
    <div class="wb-field-control min-w-0">
      <slot
        :input-props="inputProps"
        :labelled-by="labelledBy"
        :described-by="describedBy"
      />
    </div>
  </div>
</template>
