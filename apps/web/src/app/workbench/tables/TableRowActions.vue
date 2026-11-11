<script setup lang="ts">
import { computed, nextTick, onDeactivated, ref, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NDropdown } from 'naive-ui/es/dropdown'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import { useTableShowcase } from './table-showcase'

const props = defineProps<{ readonly compact: boolean; readonly disabled: boolean }>()
const emit = defineEmits<{ edit: []; detail: []; remove: [] }>()
const { t } = useTableShowcase()
const trigger = ref<InstanceType<typeof NButton> | null>(null)
const menuOpen = ref(false)
const confirming = ref(false)
const options = computed(() => [
  { key: 'edit', label: t('tableShowcase.edit'), disabled: props.disabled },
  { key: 'detail', label: t('tableShowcase.detail'), disabled: props.disabled },
  { key: 'remove', label: t('tableShowcase.remove'), disabled: props.disabled },
])
async function select(key: string | number): Promise<void> {
  menuOpen.value = false
  if (props.disabled) return
  await nextTick()
  const element: unknown = trigger.value?.$el
  if (element instanceof HTMLButtonElement) element.focus({ preventScroll: true })
  if (key === 'remove') confirming.value = true
  else if (key === 'edit') emit('edit')
  else if (key === 'detail') emit('detail')
}
function dismiss(): void {
  menuOpen.value = false
  confirming.value = false
}
watch(() => [props.compact, props.disabled], dismiss)
onDeactivated(dismiss)
</script>

<template>
  <NPopconfirm
    v-if="compact"
    v-model:show="confirming"
    trigger="manual"
    :disabled="disabled"
    to="#pavp-overlay-root"
    @positive-click="emit('remove')"
  >
    <template #trigger>
      <NDropdown
        v-model:show="menuOpen"
        trigger="click"
        placement="bottom-end"
        to="#pavp-overlay-root"
        :options="options"
        @select="select"
      >
        <NButton
          ref="trigger"
          quaternary
          type="primary"
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="disabled"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
        >
          {{ t('tableShowcase.actions') }}
        </NButton>
      </NDropdown>
    </template>
    {{ t('tableShowcase.confirmRemove') }}
  </NPopconfirm>
  <div
    v-else
    class="flex flex-wrap gap-component-unit"
  >
    <NButton
      quaternary
      type="primary"
      class="min-h-target-enhanced"
      :disabled="disabled"
      @click="emit('edit')"
    >
      {{ t('tableShowcase.edit') }}
    </NButton>
    <NButton
      quaternary
      class="min-h-target-enhanced"
      :disabled="disabled"
      @click="emit('detail')"
    >
      {{ t('tableShowcase.detail') }}
    </NButton>
    <NPopconfirm
      :disabled="disabled"
      to="#pavp-overlay-root"
      @positive-click="emit('remove')"
    >
      <template #trigger>
        <NButton
          ref="trigger"
          quaternary
          class="min-h-target-enhanced"
          :disabled="disabled"
        >
          {{ t('tableShowcase.remove') }}
        </NButton>
      </template>
      {{ t('tableShowcase.confirmRemove') }}
    </NPopconfirm>
  </div>
</template>
