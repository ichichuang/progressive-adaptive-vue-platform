<script setup lang="ts">
import {
  type ButtonHTMLAttributes,
  computed,
  inject,
  nextTick,
  onDeactivated,
  ref,
  watch,
} from 'vue'

import { NButton } from 'naive-ui/es/button'
import { NDropdown } from 'naive-ui/es/dropdown'
import { NPopconfirm } from 'naive-ui/es/popconfirm'
import type { UiTableReadonlyRecord } from '@platform/ui'
import { useTableShowcase } from './table-showcase'
import { tableRowRemovalKey, useTableRowRemoval } from './table-row-removal'

const props = defineProps<{
  readonly compact: boolean
  readonly disabled: boolean
  readonly row: UiTableReadonlyRecord
  readonly stillListed: () => boolean
  readonly removalBlocked: boolean
}>()
const emit = defineEmits<{ edit: []; detail: []; remove: [] }>()
const { t } = useTableShowcase()
const trigger = ref<InstanceType<typeof NButton> | null>(null)
const menuOpen = ref(false)
const confirming = ref(false)
let answer: ((accepted: boolean) => void) | undefined
let confirmationOwner: 'public' | 'controlled' | undefined
const removal = useTableRowRemoval(
  inject(tableRowRemovalKey, undefined),
  () => props.row,
  () => !props.removalBlocked && !props.disabled,
  () => props.stillListed(),
)
const controlled = computed(() => removal?.controlled.value === true)
const removeDisabled = computed(() => props.disabled || removal?.canRemove.value === false)

function confirmRemoval(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted || removeDisabled.value) return Promise.resolve(false)
  return new Promise((resolve) => {
    const cancel = () => {
      finish(false)
    }
    function finish(accepted: boolean): void {
      answer = undefined
      signal.removeEventListener('abort', cancel)
      confirming.value = false
      resolve(accepted)
    }
    confirmationOwner = 'controlled'
    answer = finish
    signal.addEventListener('abort', cancel, { once: true })
    confirming.value = true
  })
}

function beginRemove(): void {
  if (removeDisabled.value) return
  if (controlled.value) void removal?.remove(confirmRemoval)
  else {
    confirmationOwner = 'public'
    confirming.value = true
  }
}

function completeRemove(): void {
  if (answer !== undefined) answer(true)
  else if (!controlled.value && confirmationOwner === 'public') emit('remove')
}

function updateConfirmation(open: boolean): void {
  confirming.value = open
  if (open && !controlled.value) confirmationOwner = 'public'
  if (!open) answer?.(false)
}

function menuShortcut(event: KeyboardEvent): void {
  if (!controlled.value || props.disabled || event.defaultPrevented || event.isComposing) return
  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return
  event.preventDefault()
  menuOpen.value = true
}
const options = computed(() => [
  { key: 'edit', label: t('tableShowcase.edit'), disabled: props.disabled },
  { key: 'detail', label: t('tableShowcase.detail'), disabled: props.disabled },
  { key: 'remove', label: t('tableShowcase.remove'), disabled: removeDisabled.value },
])
async function select(key: string | number): Promise<void> {
  menuOpen.value = false
  if (props.disabled) return
  await nextTick()
  const element: unknown = trigger.value?.$el
  if (element instanceof HTMLButtonElement) element.focus({ preventScroll: true })
  if (key === 'remove') beginRemove()
  else if (key === 'edit') emit('edit')
  else if (key === 'detail') emit('detail')
}
function dismiss(): void {
  menuOpen.value = false
  updateConfirmation(false)
}
watch(() => [props.compact, props.disabled, controlled.value], dismiss)
watch(removeDisabled, (disabled) => {
  if (disabled && controlled.value) dismiss()
})
onDeactivated(dismiss)
</script>

<template>
  <NPopconfirm
    v-if="compact"
    :show="confirming"
    trigger="manual"
    :disabled="disabled"
    to="#pavp-overlay-root"
    @update:show="updateConfirmation"
    @positive-click="completeRemove"
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
          v-bind="
            {
              'aria-expanded': menuOpen === true,
              'aria-haspopup': 'menu',
              onKeydown: menuShortcut,
            } satisfies ButtonHTMLAttributes
          "
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
      :show="controlled ? confirming : undefined"
      :trigger="controlled ? 'manual' : 'click'"
      :disabled="removeDisabled"
      to="#pavp-overlay-root"
      @update:show="updateConfirmation"
      @positive-click="completeRemove"
    >
      <template #trigger>
        <NButton
          ref="trigger"
          quaternary
          class="min-h-target-enhanced"
          :disabled="removeDisabled"
          @click="controlled && beginRemove()"
        >
          {{ t('tableShowcase.remove') }}
        </NButton>
      </template>
      {{ t('tableShowcase.confirmRemove') }}
    </NPopconfirm>
  </div>
</template>
