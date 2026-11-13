<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NInput, NInputGroup } from 'naive-ui/es/input'
import { NButton } from 'naive-ui/es/button'
import type { UiTableController, UiTableCopy } from './table-contracts'
const props = defineProps<{
  readonly table: UiTableController
  readonly copy: UiTableCopy
  readonly disabled: boolean
}>()
const configuration = props.table.schema.keywordSearch
if (!configuration) throw new TypeError('Keyword search configuration is required.')
const parameter = configuration.parameter
const value = ref('')
const applied = computed(() => props.table.query.value.filters[parameter])
watch(
  applied,
  (next) => {
    value.value = typeof next === 'string' ? next : ''
  },
  { immediate: true },
)
function search(event?: KeyboardEvent): void {
  if (event?.isComposing || props.disabled) return
  void props.table.search({ ...props.table.query.value.filters, [parameter]: value.value.trim() })
}
function clear(): void {
  value.value = ''
  search()
}
</script>
<template>
  <NInputGroup class="min-w-0">
    <NInput
      v-model:value="value"
      clearable
      :disabled="disabled"
      :placeholder="
        configuration.placeholder ? table.text(configuration.placeholder) : (copy.search?.() ?? '')
      "
      :aria-label="copy.search?.() ?? table.text(configuration.placeholder ?? parameter)"
      @keydown.enter="search"
      @clear="clear"
    />
    <NButton
      :disabled="disabled"
      :loading="table.loading.value"
      @click="search()"
    >
      {{ copy.search?.() ?? table.text(configuration.placeholder ?? parameter) }}
    </NButton>
  </NInputGroup>
</template>
