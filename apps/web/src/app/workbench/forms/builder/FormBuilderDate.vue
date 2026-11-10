<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BuilderInputState } from './use-form-builder'
import { NInput } from 'naive-ui/es/input'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { NDatePicker } from 'naive-ui/es/date-picker'
import { invalidBuilderDateInput } from './builder-input-values'

const props = defineProps<{
  readonly value: string | null
  readonly label: string
  readonly labelledBy?: string
  readonly input: BuilderInputState
}>()
const emit = defineEmits<{
  'update:value': [value: string | null]
}>()
const raw = computed(() => props.input.raw ?? props.value ?? '')
const open = ref(false)
function update(value: string): void {
  const invalid = invalidBuilderDateInput(value)
  props.input.update(value, invalid)
  if (!invalid) emit('update:value', value || null)
}
function choose(value: string | null): void {
  update(value ?? '')
  open.value = false
}
</script>
<template>
  <div class="flex min-w-0 gap-component-unit">
    <NInput
      :value="raw"
      placeholder="YYYY-MM-DD"
      :status="input.invalid ? 'error' : 'success'"
      :input-props="{
        'aria-invalid': input.invalid,
        'aria-labelledby': labelledBy,
        'aria-label': labelledBy ? undefined : label,
      }"
      @update:value="update"
    />
    <NPopover
      v-model:show="open"
      trigger="click"
      placement="bottom-end"
      to="#pavp-overlay-root"
      raw
    >
      <template #trigger>
        <NButton
          secondary
          :aria-label="label"
        >
          <template #icon>
            <span
              class="i-lucide-calendar-days"
              aria-hidden="true"
            />
          </template>
        </NButton>
      </template>
      <NDatePicker
        panel
        type="date"
        :formatted-value="value"
        value-format="yyyy-MM-dd"
        :actions="[]"
        @update:formatted-value="choose"
      />
    </NPopover>
  </div>
</template>
