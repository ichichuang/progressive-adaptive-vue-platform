<script setup lang="ts">
import { computed, ref } from 'vue'
import { NInput } from 'naive-ui/es/input'
import { NSelect } from 'naive-ui/es/select'
import { NButton } from 'naive-ui/es/button'
import { NPopover } from 'naive-ui/es/popover'
import { inspectUiFormSchema, inspectUiTableSchema } from '@platform/ui'
import { useConsoleI18n } from '../../../shared/i18n'
const props = defineProps<{
  readonly value: string
  readonly kind: 'form' | 'table'
  readonly label: string
}>()
const emit = defineEmits<{ 'update:value': [value: string] }>()
const { t } = useConsoleI18n()
const selected = ref<string | null>(null)
const property = ref<string | null>(null)
const state = computed(() => {
  try {
    const value: unknown = JSON.parse(props.value)
    return {
      value,
      ...(props.kind === 'form' ? inspectUiFormSchema(value) : inspectUiTableSchema(value)),
    }
  } catch (error) {
    return {
      value: undefined,
      valid: false,
      hints: [],
      issue: error instanceof Error ? error.message : String(error),
    }
  }
})
const paths = computed(() =>
  state.value.hints.map((hint) => ({
    value: JSON.stringify(hint.path),
    label: hint.path.reduce<string>((path, key) => `${path}[${JSON.stringify(key)}]`, '$'),
  })),
)
const hint = computed(() =>
  state.value.hints.find((item) => JSON.stringify(item.path) === selected.value),
)
function selectPath(value: string): void {
  selected.value = value
  property.value = null
}
function objectAt(root: unknown, path: readonly (string | number)[]): unknown {
  let current = root
  for (const key of path) {
    if (typeof current !== 'object' || current === null || !Object.hasOwn(current, key))
      return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}
const properties = computed(() => {
  const current = hint.value && objectAt(state.value.value, hint.value.path)
  return (hint.value?.properties ?? [])
    .filter(
      (key) => typeof current === 'object' && current !== null && !Object.hasOwn(current, key),
    )
    .map((value) => ({ label: value, value }))
})
const choices = computed(() =>
  (hint.value?.choices ?? []).map((value) => ({ label: value, value })),
)
const currentChoice = computed(() => {
  const value = hint.value && objectAt(state.value.value, hint.value.path)
  return typeof value === 'string' ? value : null
})
function update(choice?: string): void {
  const currentHint = hint.value
  if (!currentHint) return
  const document: unknown = JSON.parse(props.value)
  const path = currentHint.path
  if (choice !== undefined) {
    if (!currentHint.choices?.includes(choice)) return
    const key = path.at(-1)
    const owner = objectAt(document, path.slice(0, -1))
    if (key === undefined || typeof owner !== 'object' || owner === null) return
    ;(owner as Record<string | number, unknown>)[key] = choice
  } else {
    const key = property.value
    if (!key || !properties.value.some((item) => item.value === key)) return
    const owner = objectAt(document, path)
    if (typeof owner !== 'object' || owner === null || Array.isArray(owner)) return
    Object.defineProperty(owner, key, {
      value: null,
      enumerable: true,
      configurable: true,
      writable: true,
    })
    property.value = null
  }
  emit('update:value', JSON.stringify(document, null, 2))
}
</script>
<template>
  <div class="flex flex-1 flex-col min-h-0 min-w-0 gap-component-unit">
    <div class="flex shrink-0 min-w-0 items-center gap-component-unit">
      <NPopover
        trigger="click"
        scrollable
        to="#pavp-overlay-root"
      >
        <template #trigger>
          <NButton secondary>
            {{ t('configurationAssist.open') }}
          </NButton>
        </template>
        <div class="grid gap-component-unit">
          <p class="m-0 text-caption text-text-secondary">
            {{ t('configurationAssist.hint') }}
          </p>
          <NSelect
            :value="selected"
            :options="paths"
            filterable
            :placeholder="t('configurationAssist.path')"
            :aria-label="t('configurationAssist.path')"
            @update:value="selectPath"
          />
          <template v-if="hint?.properties">
            <NSelect
              v-model:value="property"
              :options="properties"
              filterable
              :placeholder="t('configurationAssist.property')"
              :aria-label="t('configurationAssist.property')"
            />
            <NButton
              :disabled="!property"
              @click="update()"
            >
              {{ t('configurationAssist.insert') }}
            </NButton>
          </template>
          <NSelect
            v-if="hint?.choices"
            :value="currentChoice"
            :options="choices"
            :aria-label="t('configurationAssist.value')"
            @update:value="update"
          />
        </div>
      </NPopover>
      <span
        class="flex-1 truncate text-caption"
        :class="state.valid ? 'text-text-secondary' : 'text-control-error'"
        :title="state.issue ?? t('configurationAssist.valid')"
        role="status"
        aria-live="polite"
        v-text="state.issue ?? t('configurationAssist.valid')"
      />
    </div>
    <NInput
      :value="value"
      type="textarea"
      class="flex-1 h-full min-h-0"
      :resizable="false"
      :input-props="{ 'aria-label': label, spellcheck: false }"
      @update:value="emit('update:value', $event)"
    />
  </div>
</template>
