<script setup lang="ts">
import type { UiDateTimeContext } from '../date-time/date-time'
import type { useUiTableForm } from '../composables/use-ui-table-form'
import type { UiFormSlots } from './form-contracts'
import type { UiTableRecord } from './table-contracts'
import UiForm from './UiForm.vue'

defineOptions({ name: 'UiTableEditorBody' })
defineProps<{
  readonly dateTime?: UiDateTimeContext
  readonly session: ReturnType<typeof useUiTableForm>
  readonly status: string
}>()
const slots = defineSlots<Pick<UiFormSlots<UiTableRecord>, 'field' | 'detail'>>()
</script>

<template>
  <div class="pavp-table-editor-body grid min-w-0 gap-content-gap">
    <div
      :class="status ? 'leading-body min-w-0 break-words text-body text-text-secondary' : 'sr-only'"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ status }}
    </div>
    <UiForm
      v-if="session.form.value"
      :form="session.form.value"
      v-bind="dateTime === undefined ? {} : { dateTime }"
      :mode="session.mode.value === 'detail' ? 'detail' : 'edit'"
    >
      <template
        v-if="slots.field"
        #field="binding"
      >
        <slot
          name="field"
          v-bind="binding"
        />
      </template>
      <template
        v-if="slots.detail"
        #detail="binding"
      >
        <slot
          name="detail"
          v-bind="binding"
        />
      </template>
      <template #actions>
        <span
          hidden
          aria-hidden="true"
        />
      </template>
    </UiForm>
  </div>
</template>
