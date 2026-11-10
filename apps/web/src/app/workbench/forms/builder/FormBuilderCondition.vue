<script setup lang="ts">
import { computed } from 'vue'
import { NDropdown } from 'naive-ui/es/dropdown'
import { NButton } from 'naive-ui/es/button'
import { NSelect } from 'naive-ui/es/select'
import { NInput } from 'naive-ui/es/input'
import FormBuilderNumber from './FormBuilderNumber.vue'
import { NSwitch } from 'naive-ui/es/switch'
import FormBuilderDate from './FormBuilderDate.vue'
import type { UiFormCondition, UiFormFlag, UiFormValue, UiFormOption } from '@platform/ui'
import { useConsoleI18n } from '../../../../shared/i18n'
import type { BuilderReference, useFormBuilder } from './use-form-builder'

const props = defineProps<{
  readonly label: string
  readonly context?: string
  readonly removable?: boolean
  readonly value: UiFormFlag | undefined
  readonly references: readonly BuilderReference[]
  readonly path: string
  readonly editor: ReturnType<typeof useFormBuilder>['editor']
}>()
const emit = defineEmits<{ update: [value: UiFormFlag]; remove: [] }>()
const { t } = useConsoleI18n()
const condition = computed(() =>
  typeof props.value === 'object' && 'field' in props.value ? props.value : null,
)
const input = computed(() => props.editor.inputState(props.path))
const composite = computed(() =>
  typeof props.value === 'object' && !('field' in props.value) ? props.value : null,
)
const branch = computed(() =>
  composite.value && 'all' in composite.value
    ? 'all'
    : composite.value && 'any' in composite.value
      ? 'any'
      : 'not',
)
const children = computed(() =>
  !composite.value
    ? []
    : 'all' in composite.value
      ? composite.value.all
      : 'any' in composite.value
        ? composite.value.any
        : [composite.value.not],
)
const mode = computed(() =>
  typeof props.value === 'object' ? 'condition' : props.value === true ? 'on' : 'off',
)

const accessibleLabel = computed(() => props.context ?? props.label)
const groupModes = computed(() => [
  { value: 'all', label: t('formBuilder.all') },
  { value: 'any', label: t('formBuilder.any') },
])
const branchLabels = computed(() => ({
  all: t('formBuilder.all'),
  any: t('formBuilder.any'),
  not: t('formBuilder.not'),
}))
const actions = computed(() => [
  ...(['all', 'any', 'not'] as const).map((key) => ({
    key,
    label: `${t('formBuilder.wrap')} ${branchLabels.value[key]}`,
  })),
  ...(composite.value && children.value.length === 1
    ? [{ key: 'unwrap', label: t('formBuilder.unwrap') }]
    : []),
  ...(props.removable ? [{ key: 'remove', label: t('formBuilder.removeCondition') }] : []),
])
function selectAction(key: string): void {
  if (props.editor.incomplete.value) return
  if (key === 'all' || key === 'any' || key === 'not') wrap(key)
  else if (key === 'unwrap') unwrap()
  else if (key === 'remove' && props.removable) emit('remove')
}
function setGroupMode(kind: 'all' | 'any'): void {
  if (!composite.value || branch.value === 'not' || kind === branch.value) return
  const prefix = `${props.path}/${branch.value}/`
  if (
    !props.editor.clearConditionInputs(
      props.path,
      (key) => `${props.path}/${kind}/${key.slice(prefix.length)}`,
    )
  )
    return
  emit('update', kind === 'all' ? { all: children.value } : { any: children.value })
}

function updateChild(index: number, value: UiFormFlag): void {
  if (typeof value !== 'object') return
  const next = children.value.map((child, position) => (position === index ? value : child))
  emit(
    'update',
    branch.value === 'not'
      ? { not: value }
      : branch.value === 'all'
        ? { all: next }
        : { any: next },
  )
}
function wrap(kind: 'all' | 'any' | 'not'): void {
  if (
    typeof props.value !== 'object' ||
    !props.editor.clearConditionInputs(
      props.path,
      (key) => `${props.path}/${kind}${kind === 'not' ? '' : '/0'}${key.slice(props.path.length)}`,
    )
  )
    return
  emit(
    'update',
    kind === 'not'
      ? { not: props.value }
      : kind === 'all'
        ? { all: [props.value] }
        : { any: [props.value] },
  )
}
function removeChild(index: number): void {
  if (
    children.value.length < 2 ||
    !props.editor.clearConditionInputs(props.path, (key) => {
      const prefix = `${props.path}/${branch.value}/`
      const [position, ...rest] = key.slice(prefix.length).split('/')
      const number = Number(position)
      return number === index
        ? null
        : `${prefix}${String(number > index ? number - 1 : number)}${rest.length ? '/' + rest.join('/') : ''}`
    })
  )
    return
  const next = children.value.filter((_, position) => position !== index)
  emit('update', branch.value === 'all' ? { all: next } : { any: next })
}
function unwrap(): void {
  if (children.value.length !== 1) return
  const child = children.value[0]
  if (
    child &&
    props.editor.clearConditionInputs(props.path, (key) => {
      const prefix = `${props.path}/${branch.value}${branch.value === 'not' ? '' : '/0'}`
      return props.path + key.slice(prefix.length)
    })
  )
    emit('update', child)
}
function addChild(): void {
  const first = props.references[0]
  if (!first || props.editor.incomplete.value) return
  const child: UiFormCondition = { field: first.field, scope: first.scope, operator: 'not-empty' }
  const next = [...children.value, child]
  emit('update', branch.value === 'all' ? { all: next } : { any: next })
}
const modes = computed(() => [
  { value: 'off', label: t('formBuilder.flagOff') },
  { value: 'on', label: t('formBuilder.flagOn') },
  {
    value: 'condition',
    label: t('formBuilder.flagCondition'),
    disabled: props.references.length === 0,
  },
])
const referenceIndex = computed(() =>
  props.references.findIndex(
    (reference) =>
      reference.field === condition.value?.field &&
      reference.scope === (condition.value.scope ?? 'form'),
  ),
)
const reference = computed(() => props.references[referenceIndex.value])
const options = computed(() =>
  props.references.map((reference, index) => ({
    value: index,
    label: `${t(reference.scope === 'group' ? 'formBuilder.thisGroup' : 'formBuilder.wholeForm')} / ${reference.label} (${reference.field})`,
  })),
)
const operators = computed(() => [
  ...(reference.value?.node.kind === 'multi-select'
    ? []
    : [
        { value: 'eq', label: t('formBuilder.equals') },
        { value: 'neq', label: t('formBuilder.notEquals') },
      ]),
  { value: 'empty', label: t('formBuilder.isEmpty') },
  { value: 'not-empty', label: t('formBuilder.notEmpty') },
])
const comparison = computed(() => condition.value?.value)
const choiceOptions = computed(() => {
  const node = reference.value?.node
  return node?.kind === 'select' && Array.isArray(node.options)
    ? node.options.map((option: UiFormOption) => ({
        ...option,
        label: `${option.label} (${typeof option.value === 'number' ? t('formBuilder.numberValue') : t('formBuilder.stringValue')}: ${String(option.value)})`,
      }))
    : []
})
function selectReference(index: number): void {
  if (!props.editor.clearConditionInputs(props.path)) return
  const chosen = props.references[index]
  if (chosen) emit('update', { field: chosen.field, scope: chosen.scope, operator: 'not-empty' })
}
function setMode(value: string): void {
  if (!props.editor.clearConditionInputs(props.path)) return
  if (value === 'condition') selectReference(0)
  else emit('update', value === 'on')
}
function setOperator(operator: 'eq' | 'neq' | 'empty' | 'not-empty'): void {
  if (!props.editor.clearConditionInputs(props.path)) return
  const current = condition.value
  if (!current) return
  const { field, scope } = current
  if (operator === 'empty' || operator === 'not-empty')
    emit('update', { field, ...(scope ? { scope } : {}), operator })
  else {
    const node = reference.value?.node
    const value: UiFormValue =
      node?.kind === 'switch'
        ? false
        : node?.kind === 'number'
          ? 0
          : node?.kind === 'date' || node?.kind === 'select'
            ? null
            : ''
    emit('update', { field, ...(scope ? { scope } : {}), operator, value })
  }
}
function setValue(value: UiFormValue): void {
  if (condition.value) emit('update', { ...condition.value, value })
}
</script>

<template>
  <div class="grid min-w-0 gap-component-unit">
    <div
      v-if="!path.includes('/')"
      class="flex flex-wrap min-w-0 items-center justify-between gap-component-unit"
    >
      <span
        v-if="!path.includes('/')"
        class="text-body text-text-primary"
        v-text="label"
      />
      <NSelect
        v-if="!path.includes('/')"
        :value="mode"
        :disabled="editor.incomplete.value"
        :options="modes"
        :aria-label="label"
        to="#pavp-overlay-root"
        @update:value="setMode"
      />
    </div>
    <p
      v-if="editor.incomplete.value && !path.includes('/')"
      class="m-0 text-caption text-text-secondary"
    >
      {{ t('formBuilder.structurePending') }}
    </p>
    <div
      v-if="typeof value === 'object'"
      class="flex flex-wrap items-center justify-between gap-component-unit"
    >
      <span
        v-if="!composite"
        class="text-body text-text-secondary"
      >
        {{ path.includes('/') ? label : t('formBuilder.rule') }}
      </span>
      <NSelect
        v-if="composite && branch !== 'not'"
        class="flex-1 min-w-0"
        :value="branch"
        :options="groupModes"
        :disabled="editor.incomplete.value"
        :aria-label="`${accessibleLabel} ${t('formBuilder.groupMode')}`"
        to="#pavp-overlay-root"
        @update:value="setGroupMode"
      />
      <span
        v-else-if="composite"
        class="text-body text-text-primary"
      >
        {{ t('formBuilder.not') }}
      </span>
      <NDropdown
        trigger="click"
        to="#pavp-overlay-root"
        :options="actions"
        :disabled="editor.incomplete.value"
        :theme-overrides="{
          optionHeightMedium: 'var(--ui-layout-target-enhanced-minimum-block-size)',
        }"
        @select="selectAction"
      >
        <NButton
          quaternary
          class="min-h-target-enhanced min-w-target-enhanced"
          :disabled="editor.incomplete.value"
          :aria-label="`${accessibleLabel} ${t('formBuilder.ruleActions')}`"
        >
          {{ t('formBuilder.ruleActions') }}
        </NButton>
      </NDropdown>
    </div>
    <div
      v-if="composite"
      class="wb-builder-condition-children grid min-w-0 gap-content-gap"
      role="group"
      :aria-label="`${accessibleLabel} ${branchLabels[branch]}`"
    >
      <FormBuilderCondition
        v-for="(child, index) in children"
        :key="`${path}/${branch}/${index}`"
        :label="`${t('formBuilder.rule')} ${index + 1}`"
        :context="`${accessibleLabel} / ${branchLabels[branch]} / ${index + 1}`"
        :removable="branch !== 'not' && children.length > 1"
        :value="child"
        :references="references"
        :editor="editor"
        :path="branch === 'not' ? `${path}/not` : `${path}/${branch}/${index}`"
        @update="updateChild(index, $event)"
        @remove="removeChild(index)"
      />
      <NButton
        v-if="branch !== 'not'"
        class="justify-self-start min-h-target-enhanced min-w-target-enhanced"
        :disabled="editor.incomplete.value || !references.length"
        @click="addChild"
      >
        {{ t('formBuilder.addCondition') }}
      </NButton>
    </div>
    <template v-if="condition">
      <NSelect
        :value="referenceIndex"
        :disabled="editor.incomplete.value"
        :options="options"
        :aria-label="`${accessibleLabel} ${t('formBuilder.reference')}`"
        to="#pavp-overlay-root"
        @update:value="selectReference"
      />
      <NSelect
        :value="condition.operator"
        :disabled="editor.incomplete.value"
        :options="operators"
        :aria-label="`${accessibleLabel} ${t('formBuilder.operator')}`"
        to="#pavp-overlay-root"
        @update:value="setOperator"
      />
      <template v-if="condition.operator === 'eq' || condition.operator === 'neq'">
        <NSwitch
          v-if="reference?.node.kind === 'switch'"
          :value="comparison === true"
          :aria-label="`${accessibleLabel} ${t('formBuilder.compareValue')}`"
          @update:value="setValue"
        />
        <FormBuilderNumber
          v-else-if="reference?.node.kind === 'number'"
          :key="`${condition?.field}:${condition?.operator}`"
          :value="typeof comparison === 'number' ? comparison : null"
          :label="`${accessibleLabel} ${t('formBuilder.compareValue')}`"
          :input="input"
          @update:value="setValue"
        />
        <FormBuilderDate
          v-else-if="reference?.node.kind === 'date'"
          :key="`${condition?.field}:${condition?.operator}`"
          :value="typeof comparison === 'string' ? comparison : null"
          :label="`${accessibleLabel} ${t('formBuilder.compareValue')}`"
          :input="input"
          @update:value="setValue"
        />
        <NSelect
          v-else-if="reference?.node.kind === 'select'"
          :value="
            typeof comparison === 'string' || typeof comparison === 'number' ? comparison : null
          "
          :options="choiceOptions"
          clearable
          :aria-label="`${accessibleLabel} ${t('formBuilder.compareValue')}`"
          to="#pavp-overlay-root"
          @update:value="setValue"
        />
        <NInput
          v-else
          :value="typeof comparison === 'string' ? comparison : ''"
          :input-props="{ 'aria-label': `${accessibleLabel} ${t('formBuilder.compareValue')}` }"
          @update:value="setValue"
        />
      </template>
    </template>
  </div>
</template>
