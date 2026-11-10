<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { UiRadioCardGroup, type UiFormFieldBinding } from '@platform/ui'
import { NCheckbox, NCheckboxGroup } from 'naive-ui/es/checkbox'
import { useConsoleI18n } from '../../../shared/i18n'

const props = defineProps<{
  readonly binding: UiFormFieldBinding
  readonly kind: 'profile' | 'channels'
}>()
const { t } = useConsoleI18n()
const root = ref<HTMLElement | null>(null)
const profiles = computed(() => [
  { value: 'quiet', label: t('formCapabilities.controls.quiet') },
  { value: 'balanced', label: t('formCapabilities.controls.balanced') },
  { value: 'instant', label: t('formCapabilities.controls.instant') },
])
const channels = computed(() => [
  { value: 'inapp', label: t('formCapabilities.controls.inapp') },
  { value: 'email', label: t('formCapabilities.controls.email') },
  { value: 'desktop', label: t('formCapabilities.controls.desktop') },
])
const disabled = computed(() => props.binding.disabled || props.binding.readonly)
const selected = computed(() =>
  Array.isArray(props.binding.value)
    ? props.binding.value.filter((value): value is string => typeof value === 'string')
    : [],
)
function update(value: string | (string | number)[]): void {
  if (disabled.value || props.binding.hidden) return
  props.binding.setValue(value)
}
watch(
  () => props.binding,
  (binding, previous) => {
    previous?.setFocusTarget(null)
    previous?.setCommitTarget(null)
    binding.setFocusTarget(() =>
      root.value?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(),
    )
    // These choices commit immediately and have no separate text input buffer.
    binding.setCommitTarget(() => true)
  },
  { immediate: true, flush: 'sync' },
)
onBeforeUnmount(() => {
  props.binding.setFocusTarget(null)
  props.binding.setCommitTarget(null)
})
</script>

<template>
  <div
    :id="binding.controlId"
    ref="root"
    class="grid min-w-0 gap-component-unit"
    role="group"
    :aria-labelledby="binding.labelId"
    :aria-describedby="binding.describedBy"
    :aria-invalid="binding.invalid"
    @focusout="binding.blur()"
  >
    <UiRadioCardGroup
      v-if="kind === 'profile'"
      :accessible-label="t('formCapabilities.controls.profile')"
      :model-value="typeof binding.value === 'string' ? binding.value : ''"
      :options="profiles"
      :disabled="disabled"
      @update:model-value="update"
    />
    <NCheckboxGroup
      v-else
      :value="selected"
      :disabled="disabled"
      :aria-label="t('formCapabilities.controls.channels')"
      @update:value="update"
    >
      <div class="flex flex-wrap items-center gap-content-gap">
        <NCheckbox
          v-for="channel in channels"
          :key="channel.value"
          class="items-center min-h-target-enhanced"
          :value="channel.value"
          :label="channel.label"
        />
      </div>
    </NCheckboxGroup>
  </div>
</template>
