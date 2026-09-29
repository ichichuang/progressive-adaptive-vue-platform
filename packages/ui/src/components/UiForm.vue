<script setup lang="ts" generic="I">
import PavpNaiveForm from '../adapters/naive/PavpNaiveForm.vue'
import UiFormField from './UiFormField.vue'
import { NButton } from 'naive-ui/es/button'
import type { UiFormProps, UiFormSlots } from './form-contracts'

/** A single native submit boundary; draft and mutation ownership stay in useUiForm. */
defineOptions({ name: 'UiForm', inheritAttrs: false })
withDefaults(defineProps<UiFormProps<I>>(), { columns: 1 })
const slots = defineSlots<UiFormSlots<I>>()
</script>

<template>
  <PavpNaiveForm
    :form="form"
    :columns="columns"
    v-bind="$attrs"
  >
    <slot :form="form">
      <UiFormField
        v-for="config in form.fields"
        :key="config.name"
        :form="form"
        :name="config.name"
      >
        <template
          v-if="config.kind === 'custom' && slots.field"
          #default="binding"
        >
          <slot
            name="field"
            v-bind="binding"
          />
        </template>
      </UiFormField>
    </slot>
    <template #actions>
      <slot
        name="actions"
        :form="form"
      >
        <NButton
          class="min-h-target-enhanced min-w-target-enhanced"
          attr-type="submit"
          type="primary"
          :disabled="form.submitting.value || form.phase.value === 'disposed'"
        >
          {{ form.copy.submit() }}
        </NButton>
        <NButton
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="form.submitting.value || form.phase.value === 'disposed'"
          secondary
          @click="form.reset()"
        >
          {{ form.copy.reset() }}
        </NButton>
      </slot>
    </template>
  </PavpNaiveForm>
</template>
