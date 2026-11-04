<script setup lang="ts" generic="I">
import PavpNaiveForm from '../adapters/naive/PavpNaiveForm.vue'
import UiFormField from './UiFormField.vue'
import { NButton } from 'naive-ui/es/button'
import type { UiFormProps, UiFormSlots } from './form-contracts'
import { computed, inject } from 'vue'
import { pavpNaiveAppearanceKey } from '../adapters/naive/pavp-naive-runtime-context'
import { createPavpNaiveSoftButtonProps } from '../adapters/naive/pavp-naive-theme'

/** A single native submit boundary; draft and mutation ownership stay in useUiForm. */
defineOptions({ name: 'UiForm', inheritAttrs: false })
withDefaults(defineProps<UiFormProps<I>>(), { columns: 1 })
const slots = defineSlots<UiFormSlots<I>>()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiForm requires UiProvider.')
const resetButtonProps = computed(() => createPavpNaiveSoftButtonProps(appearance.value))
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
          v-bind="resetButtonProps"
          @click="form.reset()"
        >
          {{ form.copy.reset() }}
        </NButton>
      </slot>
    </template>
  </PavpNaiveForm>
</template>
