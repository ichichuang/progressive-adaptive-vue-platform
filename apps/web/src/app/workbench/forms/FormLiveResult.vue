<script setup lang="ts" generic="I">
import { NButton } from 'naive-ui/es/button'
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { UiCopyAction, UiScrollArea, type UiFormController } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'

const props = defineProps<{
  readonly form: UiFormController<I>
  readonly mode: 'edit' | 'detail'
  readonly checked?: 'valid' | 'invalid' | 'cancelled' | null
}>()
defineSlots<{ status?: () => unknown; insight?: () => unknown; guide?: () => unknown }>()
const active = ref(true)
onActivated(() => {
  active.value = true
})
onDeactivated(() => {
  active.value = false
})
const { t } = useConsoleI18n()
const json = computed(() => JSON.stringify(props.form.values.value, null, 2))
const fields = computed(() =>
  props.form.fields.map((field) => {
    const binding = props.form.field(field.name)
    const value = binding.value
    const path = field.name.split('.')
    const root = props.form.schema.fields.find((node) => node.name === path[0])
    return {
      path: field.name,
      label: props.form.text(field.label),
      value:
        field.kind === 'select' || field.kind === 'multi-select'
          ? binding.selectedOptions
              .map((item) =>
                item.option
                  ? props.form.text(item.option.label)
                  : item.status === 'loading'
                    ? props.form.copy.loadingOptions()
                    : item.status === 'failed'
                      ? props.form.copy.optionsFailed()
                      : props.form.copy.invalidValue(),
              )
              .join(' / ') || props.form.copy.empty()
          : value === null || value === ''
            ? props.form.copy.empty()
            : typeof value === 'boolean'
              ? value
                ? props.form.copy.yes()
                : props.form.copy.no()
              : typeof value === 'object'
                ? JSON.stringify(value)
                : String(value),
      binding,
      access: binding.hidden
        ? t('formShowcase.hiddenValue')
        : binding.disabled
          ? t('formShowcase.disabledState')
          : binding.readonly
            ? t('formShowcase.readonlyState')
            : '',
      group:
        path.length > 1 && root
          ? `${props.form.text(root.label)}${root.kind === 'repeat' ? ` ${String(Number(path[1]) + 1)}` : ''}`
          : '',
    }
  }),
)
const emptyGroups = computed(() =>
  props.form.schema.fields.flatMap((field) =>
    field.kind === 'repeat' && props.form.rowKeys(field.name).length === 0
      ? [
          {
            path: field.name,
            label: props.form.text(field.label),
            value: props.form.copy.empty(),
          },
        ]
      : [],
  ),
)
const groups = computed(() => {
  const groups: { label: string; fields: typeof fields.value }[] = []
  for (const field of fields.value) {
    const last = groups.at(-1)
    if (last?.label === field.group) last.fields.push(field)
    else groups.push({ label: field.group, fields: [field] })
  }
  return groups
})
const resultLabel = computed(() =>
  t(props.form.hasPendingInput.value ? 'formShowcase.livePending' : 'formShowcase.liveResult'),
)
const checkLabel = computed(() =>
  props.form.hasPendingInput.value
    ? t('formShowcase.livePendingHint')
    : props.form.phase.value === 'validating'
      ? t('configuredForm.validating')
      : props.form.issues.value.length
        ? t('formShowcase.checkInvalid')
        : props.checked === 'valid'
          ? t('formShowcase.checkValid')
          : '',
)
const issues = computed(() =>
  props.form.issues.value.map((issue) => ({
    path: issue.field,
    label: `${issue.field === null ? t('configuredForm.errorSummary') : props.form.nodeLabel(issue.field)}: ${issue.message()}`,
    canLocate:
      props.mode === 'edit' && issue.field !== null && props.form.canFocusField(issue.field),
  })),
)
function locate(path: string | null): void {
  if (props.mode === 'edit' && path !== null) props.form.focusField(path)
}
</script>

<template>
  <aside
    class="wb-form-result rounded-panel flex flex-col min-h-0 min-w-0 overflow-hidden bg-surface-panel"
    :aria-label="t('formShowcase.liveResult')"
  >
    <div class="flex-1 min-h-0 min-w-0">
      <UiScrollArea
        :owner-id="`${form.formId}-result`"
        :enabled="active"
      >
        <header class="wb-form-panel-header grid min-w-0 gap-component-unit">
          <div class="flex min-w-0 items-center justify-between gap-component-unit">
            <h3
              class="font-title-weight m-0 min-w-0 truncate text-subheading text-text-primary"
              :title="form.hasPendingInput.value ? t('formShowcase.livePendingHint') : resultLabel"
              v-text="resultLabel"
            />
            <UiCopyAction
              class="shrink-0"
              variant="text"
              :value="json"
              :disabled="form.hasPendingInput.value"
              :label="t('formShowcase.copyData')"
              :copy-label="t('workbench.copy')"
              :success-label="t('workbench.copied')"
              :failure-label="t('workbench.copyFailed')"
            />
          </div>
        </header>
        <div class="wb-form-scroll-content grid min-w-0 gap-content-gap">
          <slot name="status" />
          <section
            v-if="form.issues.value.length"
            class="grid min-w-0 gap-component-unit"
            :aria-label="t('formShowcase.issues')"
          >
            <h4
              class="font-title-weight m-0 text-body text-control-error"
              v-text="t('formShowcase.issues')"
            />
            <ul class="m-0 p-0 list-none grid gap-component-unit">
              <li
                v-for="(issue, index) in issues"
                :key="index"
                class="min-w-0 text-caption text-text-secondary"
              >
                <NButton
                  v-if="issue.canLocate"
                  text
                  type="error"
                  class="max-w-full min-h-target-enhanced"
                  @click="locate(issue.path)"
                >
                  <span
                    class="text-left underline min-w-0 whitespace-normal break-words text-caption"
                    v-text="issue.label"
                  />
                </NButton>
                <span
                  v-else
                  class="break-words"
                  v-text="issue.label"
                />
              </li>
            </ul>
          </section>
          <dl
            v-if="emptyGroups.length"
            class="m-0 grid min-w-0 gap-content-gap"
          >
            <div
              v-for="group in emptyGroups"
              :key="group.path"
              class="wb-form-value grid min-w-0 gap-component-unit"
            >
              <dt
                class="flex flex-wrap min-w-0 justify-between gap-component-unit text-caption text-text-secondary"
              >
                <span v-text="group.label" />
              </dt>
              <dd class="m-0 text-body text-text-primary">
                {{ group.value }}
              </dd>
            </div>
          </dl>
          <section
            v-for="(group, index) in groups"
            :key="`${index}-${group.label}`"
            class="grid min-w-0 gap-component-unit"
          >
            <h4
              v-if="group.label"
              class="font-title-weight m-0 text-body text-text-primary"
              v-text="group.label"
            />
            <dl class="m-0 grid min-w-0 gap-content-gap">
              <div
                v-for="field in group.fields"
                :key="field.path"
                class="wb-form-value grid min-w-0 gap-component-unit"
              >
                <dt
                  class="flex flex-wrap min-w-0 items-baseline justify-between gap-component-unit text-caption text-text-secondary"
                >
                  <span v-text="field.label" />
                </dt>
                <dd
                  class="m-0 min-w-0 whitespace-pre-wrap text-body text-text-primary"
                  v-text="field.value"
                />
                <dd
                  v-if="field.access"
                  class="m-0 flex flex-wrap gap-component-unit text-caption text-text-secondary"
                >
                  <span
                    v-if="field.access"
                    v-text="field.access"
                  />
                </dd>
              </div>
            </dl>
          </section>
          <p
            v-if="fields.length === 0"
            class="m-0 text-caption text-text-secondary"
            v-text="t('formShowcase.noFields')"
          />
          <p
            class="m-0 text-caption text-text-secondary"
            :class="{ 'sr-only': !checkLabel }"
            role="status"
            aria-live="polite"
            v-text="checkLabel"
          />
          <slot name="insight" />
          <slot name="guide" />
        </div>
      </UiScrollArea>
    </div>
  </aside>
</template>
