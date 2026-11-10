<script setup lang="ts" generic="I">
import { computed, onBeforeUnmount, type ComponentPublicInstance } from 'vue'
import { formPresentation } from '../composables/form-presentation'
import { NButton } from 'naive-ui/es/button'
import UiFormField from './UiFormField.vue'
import type { UiFormController, UiFormMode, UiFormNode, UiFormFieldBinding } from './form-contracts'

defineOptions({ name: 'UiFormFields' })
const props = defineProps<{
  readonly form: UiFormController<I>
  readonly nodes: readonly UiFormNode[]
  readonly prefix: string
  readonly mode: UiFormMode
  readonly columns: 1 | 2
}>()
const slots = defineSlots<{
  field?: (props: UiFormFieldBinding) => unknown
  detail?: (props: UiFormFieldBinding) => unknown
}>()
// Section focus is owned by this mounted renderer, not by a row index. Re-register
// after path/controller changes and only remove the registration with our owner.
const focusTargets = new Map<
  string,
  {
    owner: symbol
    path: string
    presentation: ReturnType<typeof formPresentation>
  }
>()
function setNodeTarget(
  name: string,
  path: string,
  element: Element | ComponentPublicInstance | null,
): void {
  const previous = focusTargets.get(name)
  if (previous !== undefined) {
    previous.presentation.setNodeFocusTarget(previous.path, previous.owner, null)
    focusTargets.delete(name)
  }
  if (!(element instanceof HTMLElement)) return
  const presentation = formPresentation(props.form)
  const owner = previous?.owner ?? Symbol(name)
  presentation.setNodeFocusTarget(path, owner, () => {
    element.focus()
  })
  focusTargets.set(name, { owner, path, presentation })
}
onBeforeUnmount(() => {
  for (const target of focusTargets.values()) {
    target.presentation.setNodeFocusTarget(target.path, target.owner, null)
  }
  focusTargets.clear()
})
function rowPending(path: string, index: number): boolean {
  return props.form.pendingFields.value.some((name) => name.startsWith(`${path}.${String(index)}.`))
}
function removeRow(path: string, index: number): void {
  if (!rowPending(path, index)) props.form.removeItem(path, index)
}
const nodes = computed(() =>
  props.nodes
    .map((node) => {
      const path = props.prefix ? `${props.prefix}.${node.name}` : node.name
      return {
        config: node,
        path,
        state: props.form.nodeState(path),
        controlId: formPresentation(props.form).nodeControlId(path),
        errors:
          props.mode === 'edit'
            ? props.form.issues.value.filter((issue) => issue.field === path)
            : [],
        atMaximum:
          node.kind === 'repeat' && props.form.rowKeys(path).length >= (node.maxItems ?? Infinity),
        atMinimum:
          node.kind === 'repeat' && props.form.rowKeys(path).length <= (node.minItems ?? 0),
      }
    })
    .filter((node) => !node.state.hidden),
)
</script>

<template>
  <div
    class="grid grid-cols-1 min-w-0 gap-content-gap"
    :class="columns === 2 ? 'layout-regular:grid-cols-2 layout-wide:grid-cols-2' : ''"
    :data-columns="columns"
  >
    <template
      v-for="node in nodes"
      :key="node.config.name"
    >
      <section
        v-if="node.config.kind === 'group' || node.config.kind === 'repeat'"
        :id="node.controlId"
        :ref="(element) => setNodeTarget(node.config.name, node.path, element)"
        class="pavp-form-section border-transparent rounded-panel border-solid grid min-w-0 border-width-default gap-content-gap py-section-block"
        tabindex="-1"
        :class="node.config.span === 1 ? '' : 'col-span-full'"
        :data-span="node.config.span ?? 2"
        :aria-labelledby="`${node.controlId}-label`"
        :aria-invalid="node.errors.length > 0"
        :aria-describedby="node.errors.length ? `${node.controlId}-errors` : undefined"
      >
        <div class="flex flex-wrap items-center justify-between gap-content-gap">
          <div class="grid min-w-0 gap-component-unit">
            <h3
              :id="`${node.controlId}-label`"
              class="font-title-weight m-0 text-subheading text-text-primary"
            >
              {{ form.text(node.config.label) }}
            </h3>
            <p
              v-if="node.config.description"
              class="m-0 text-caption text-text-secondary"
            >
              {{ form.text(node.config.description ?? '') }}
            </p>
          </div>
          <NButton
            v-if="node.config.kind === 'repeat' && mode === 'edit' && !node.state.readonly"
            secondary
            :bordered="false"
            :disabled="node.state.disabled || node.atMaximum"
            @click="form.addItem(node.path)"
          >
            {{ node.config.addLabel ? form.text(node.config.addLabel) : form.copy.addItem() }}
          </NButton>
        </div>
        <ul
          :id="`${node.controlId}-errors`"
          class="sr-only"
        >
          <li
            v-for="(issue, index) in node.errors"
            :key="index"
          >
            {{ issue.message() }}
          </li>
        </ul>
        <UiFormFields
          v-if="node.config.kind === 'group'"
          :form="form"
          :nodes="node.config.fields"
          :prefix="node.path"
          :mode="node.state.readonly ? 'detail' : mode"
          :columns="columns"
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
        <template v-else>
          <p
            v-if="form.rowKeys(node.path).length === 0"
            class="m-0 text-text-secondary"
          >
            {{ form.copy.empty() }}
          </p>
          <div
            v-for="(key, index) in form.rowKeys(node.path)"
            :key="key"
            class="rounded-panel border-solid grid min-w-0 bg-surface-panel border-border-default border-width-default gap-content-gap p-page-inline"
          >
            <div class="flex flex-wrap items-center justify-between gap-content-gap">
              <span
                class="text-caption text-text-secondary"
                v-text="`${form.text(node.config.itemLabel ?? node.config.label)} ${index + 1}`"
              />
              <div
                v-if="mode === 'edit' && !node.state.readonly"
                class="flex flex-wrap gap-component-unit"
              >
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  size="small"
                  quaternary
                  :aria-label="`${form.copy.insertItem()} ${form.text(node.config.label)} ${index + 1}`"
                  :disabled="node.state.disabled || node.atMaximum"
                  @click="form.insertItem(node.path, index)"
                >
                  {{ form.copy.insertItem() }}
                </NButton>
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  size="small"
                  quaternary
                  :aria-label="`${form.copy.duplicateItem()} ${form.text(node.config.label)} ${index + 1}`"
                  :disabled="node.state.disabled || node.atMaximum || rowPending(node.path, index)"
                  @click="form.duplicateItem(node.path, index)"
                >
                  {{ form.copy.duplicateItem() }}
                </NButton>
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  size="small"
                  quaternary
                  :aria-label="`${form.copy.moveUp()} ${form.text(node.config.label)} ${index + 1}`"
                  :disabled="node.state.disabled || index === 0"
                  @click="form.moveItem(node.path, index, index - 1)"
                >
                  ↑
                </NButton>
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  size="small"
                  quaternary
                  :aria-label="`${form.copy.moveDown()} ${form.text(node.config.label)} ${index + 1}`"
                  :disabled="node.state.disabled || index === form.rowKeys(node.path).length - 1"
                  @click="form.moveItem(node.path, index, index + 1)"
                >
                  ↓
                </NButton>
                <NButton
                  class="min-h-target-enhanced min-w-target-enhanced"
                  size="small"
                  quaternary
                  :disabled="node.state.disabled || node.atMinimum || rowPending(node.path, index)"
                  :title="rowPending(node.path, index) ? form.copy.inputIncomplete() : undefined"
                  :aria-label="`${form.copy.removeItem()} ${form.text(node.config.label)} ${index + 1}`"
                  @click="removeRow(node.path, index)"
                >
                  {{ form.copy.removeItem() }}
                </NButton>
              </div>
            </div>
            <UiFormFields
              :form="form"
              :nodes="node.config.fields"
              :prefix="`${node.path}.${index}`"
              :mode="node.state.readonly ? 'detail' : mode"
              :columns="columns"
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
          </div>
        </template>
      </section>
      <UiFormField
        v-else
        :form="form"
        :name="node.path"
        :mode="mode"
      >
        <template
          v-if="node.config.kind === 'custom' && slots.field"
          #default="binding"
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
      </UiFormField>
    </template>
  </div>
</template>

<style>
@layer components {
  .pavp-form-section:focus-visible {
    outline: var(--ui-admin-border-focus);
    outline-offset: calc(-1 * var(--ui-admin-focus-outline-offset));
  }
}
</style>
