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
    class="wb-settings-field rounded-control grid min-w-0 items-center bg-surface-page p-page-inline"
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
      <span
        :id="describedBy"
        class="text-caption text-text-secondary"
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
