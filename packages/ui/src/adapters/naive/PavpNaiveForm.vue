<script setup lang="ts" generic="I">
import { NForm } from 'naive-ui/es/form'
import { computed, inject, useAttrs } from 'vue'
import type { UiFormController } from '../../components/form-contracts'
import { formNativeAttributes } from '../../components/form-native-attributes'
import { useFormPresentation } from '../../composables/form-presentation'
import { pavpNaiveAppearanceKey } from './pavp-naive-runtime-context'
import { createPavpNaiveFormThemeProjection } from './pavp-naive-theme'

defineOptions({ name: 'PavpNaiveForm', inheritAttrs: false })
const props = defineProps<{ readonly form: UiFormController<I>; readonly columns: 1 | 2 }>()
defineSlots<{ default: () => unknown; actions: () => unknown }>()
const attrs = useAttrs()
const appearance = inject(pavpNaiveAppearanceKey)
if (appearance === undefined) throw new TypeError('UiForm requires UiProvider.')
const theme = computed(() => createPavpNaiveFormThemeProjection(appearance.value).Form)
const { announcement, presentation, canFocus, label } = useFormPresentation(props)
</script>

<template>
  <NForm
    v-bind="formNativeAttributes(attrs)"
    :id="form.formId"
    class="pavp-form"
    :data-columns="columns"
    novalidate
    label-placement="top"
    :show-require-mark="false"
    :theme-overrides="theme"
    @submit.prevent="form.submit()"
    @reset.prevent="form.reset()"
  >
    <div
      v-if="form.issues.value.length"
      ref="summary"
      class="pavp-form__summary"
      tabindex="-1"
      :aria-label="form.copy.errorSummary(form.issues.value.length)"
    >
      <p>{{ form.copy.errorSummary(form.issues.value.length) }}</p>
      <ul>
        <li
          v-for="(issue, index) in form.issues.value"
          :key="index"
        >
          <a
            v-if="canFocus(issue.field)"
            :href="`#${form.field(issue.field).controlId}`"
            @click.prevent="presentation.focusField(issue.field)"
            v-text="`${label(issue.field)}: ${issue.message()}`"
          />
          <span v-else>{{ label(issue.field) }} {{ issue.message() }}</span>
        </li>
      </ul>
    </div>
    <div class="pavp-form__fields">
      <slot />
    </div>
    <div class="pavp-form__actions">
      <slot name="actions" />
    </div>
    <p
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {{ announcement }}
    </p>
  </NForm>
</template>

<style scoped>
.pavp-form__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ui-space-content-gap);
}
.pavp-form__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-content-gap);
}
:global([data-layout-profile='regular']) .pavp-form[data-columns='2'] > .pavp-form__fields,
:global([data-layout-profile='wide']) .pavp-form[data-columns='2'] > .pavp-form__fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pavp-form__summary {
  color: var(--ui-color-text-primary);
  border-color: var(--ui-color-border-default);
  border-style: solid;
  border-width: var(--ui-admin-border-width);
  padding: var(--ui-space-content-gap);
  margin-block-end: var(--ui-space-content-gap);
}
.pavp-form__summary a {
  color: inherit;
}
.pavp-form__summary:focus-visible,
.pavp-form__summary a:focus-visible {
  outline: var(--ui-admin-border-focus);
  outline-offset: var(--ui-admin-focus-outline-offset);
}
</style>
