<script setup lang="ts">
import { computed, onDeactivated, ref } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NCheckbox } from 'naive-ui/es/checkbox'
import { NPopover } from 'naive-ui/es/popover'
import { NDropdown } from 'naive-ui/es/dropdown'
import type { UiTableController, UiTableCopy } from './table-contracts'

const props = defineProps<{
  readonly table: UiTableController
  readonly copy: UiTableCopy
}>()
const open = ref(false)
const visibleCount = computed(
  () => props.table.columns.value.filter((column) => !column.hidden).length,
)
function move(key: string, direction: string | number): void {
  if (direction === 'up' || direction === 'down') props.table.moveColumn(key, direction)
}
onDeactivated(() => {
  open.value = false
})
</script>

<template>
  <NPopover
    v-model:show="open"
    trigger="click"
    placement="bottom-end"
    to="#pavp-overlay-root"
  >
    <template #trigger>
      <NButton
        quaternary
        class="min-h-target-enhanced min-w-target-enhanced"
        :aria-expanded="open"
      >
        <span class="flex items-center gap-component-unit">
          <span
            class="i-lucide-columns-3 shrink-0"
            aria-hidden="true"
          />
          {{ copy.columns() }}
        </span>
      </NButton>
    </template>
    <div
      class="grid min-w-0 gap-component-unit"
      role="group"
      :aria-label="copy.columns()"
    >
      <div
        v-for="(column, index) in table.columns.value"
        :key="column.key"
        class="flex items-center gap-component-unit"
      >
        <NCheckbox
          class="flex-1 min-h-target-enhanced"
          :checked="!column.hidden"
          :disabled="!column.hidden && visibleCount === 1"
          @update:checked="table.setColumnVisibility(column.key, $event)"
        >
          {{ table.text(column.title) }}
        </NCheckbox>
        <NDropdown
          trigger="click"
          placement="right-start"
          to="#pavp-overlay-root"
          :options="[
            {
              key: 'up',
              label: copy.moveColumn(table.text(column.title), 'up'),
              disabled: index === 0,
            },
            {
              key: 'down',
              label: copy.moveColumn(table.text(column.title), 'down'),
              disabled: index === table.columns.value.length - 1,
            },
          ]"
          @select="move(column.key, $event)"
        >
          <NButton
            quaternary
            class="min-h-target-enhanced min-w-target-enhanced"
            :aria-label="`${table.text(column.title)} · ${copy.actions()}`"
            aria-haspopup="menu"
          >
            <span
              class="i-lucide-ellipsis-vertical"
              aria-hidden="true"
            />
          </NButton>
        </NDropdown>
      </div>
      <NButton
        quaternary
        class="min-h-target-enhanced"
        @click="table.resetColumns()"
      >
        {{ copy.resetColumns() }}
      </NButton>
    </div>
  </NPopover>
</template>
