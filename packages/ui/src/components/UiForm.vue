<script setup lang="ts" generic="I">
import PavpNaiveForm from '../adapters/naive/PavpNaiveForm.vue'
import UiFormFields from './UiFormFields.vue'
import { NButton } from 'naive-ui/es/button'
import type { UiFormProps, UiFormSlots } from './form-contracts'
import { inject } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'

/** A single native submit boundary; draft and mutation ownership stay in useUiForm. */
defineOptions({ name: 'UiForm', inheritAttrs: false })
withDefaults(defineProps<UiFormProps<I>>(), { mode: 'edit' })
const slots = defineSlots<UiFormSlots<I>>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiForm requires UiProvider.')
</script>

<template>
  <PavpNaiveForm
    :form="form"
    :columns="columns ?? form.schema.columns ?? 1"
    :mode="mode"
    v-bind="$attrs"
  >
    <slot :form="form">
      <UiFormFields
        :form="form"
        :nodes="form.schema.fields"
        prefix=""
        :mode="mode"
        :columns="columns ?? form.schema.columns ?? 1"
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
      </UiFormFields>
    </slot>
    <template #actions>
      <slot
        name="actions"
        :form="form"
      >
        <NButton
          class="min-h-target-enhanced min-w-target-enhanced"
          attr-type="submit"
          :aria-busy="form.submitting.value"
          type="primary"
          :disabled="form.submitting.value || form.phase.value === 'disposed'"
        >
          {{ form.copy.submit() }}
        </NButton>
        <NButton
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="form.submitting.value || form.phase.value === 'disposed'"
          secondary
          :bordered="false"
          @click="form.reset()"
        >
          {{ form.copy.reset() }}
        </NButton>
      </slot>
    </template>
  </PavpNaiveForm>
</template>
