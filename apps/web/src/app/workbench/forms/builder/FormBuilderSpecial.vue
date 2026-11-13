<script setup lang="ts">
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSwitch } from 'naive-ui/es/switch'
import { useConsoleI18n } from '../../../../shared/i18n'
import type { BuilderEditableNode } from './use-form-builder'
defineProps<{ readonly node: BuilderEditableNode }>()
const emit = defineEmits<{ patch: [property: string, value: unknown] }>()
const { t } = useConsoleI18n()
</script>
<template>
  <section
    v-if="node.kind === 'mask'"
    class="wb-builder-property-group grid min-w-0 gap-component-unit"
  >
    <h4 class="font-title-weight m-0 text-body text-text-primary">
      {{ t('formBuilder.maskPattern') }}
    </h4>
    <NInput
      :value="node.mask"
      :input-props="{ 'aria-label': t('formBuilder.maskPattern') }"
      @update:value="emit('patch', 'mask', $event)"
    />
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formBuilder.maskHint') }}
    </p>
  </section>
  <section
    v-else-if="node.kind === 'rating'"
    class="wb-builder-property-group grid min-w-0 gap-component-unit"
  >
    <h4 class="font-title-weight m-0 text-body text-text-primary">
      {{ t('formBuilder.ratingCount') }}
    </h4>
    <NInputNumber
      :value="node.count ?? 5"
      :min="1"
      :max="10"
      :precision="0"
      :input-props="{ 'aria-label': t('formBuilder.ratingCount') }"
      @update:value="emit('patch', 'count', $event ?? undefined)"
    />
    <div class="flex flex-wrap items-center justify-between gap-component-unit">
      <span>{{ t('formBuilder.allowHalf') }}</span>
      <NSwitch
        :value="node.allowHalf ?? false"
        :aria-label="t('formBuilder.allowHalf')"
        @update:value="emit('patch', 'allowHalf', $event)"
      />
    </div>
  </section>
  <section
    v-else-if="node.kind === 'attachment'"
    class="wb-builder-property-group grid min-w-0 gap-component-unit"
  >
    <h4 class="font-title-weight m-0 text-body text-text-primary">
      {{ t('formBuilder.attachmentSource') }}
    </h4>
    <NInput
      :value="node.source"
      :input-props="{ 'aria-label': t('formBuilder.attachmentSource') }"
      @update:value="emit('patch', 'source', $event)"
    />
    <p class="m-0 text-caption text-text-secondary">
      {{ t('formBuilder.attachmentHint') }}
    </p>
    <span>{{ t('formBuilder.attachmentAccept') }}</span>
    <NInput
      :value="node.accept ?? ''"
      :input-props="{ 'aria-label': t('formBuilder.attachmentAccept') }"
      @update:value="emit('patch', 'accept', $event || undefined)"
    />
    <span>{{ t('formBuilder.attachmentCount') }}</span>
    <NInputNumber
      :value="node.maxFiles ?? null"
      :min="1"
      :precision="0"
      :input-props="{ 'aria-label': t('formBuilder.attachmentCount') }"
      @update:value="emit('patch', 'maxFiles', $event ?? undefined)"
    />
    <span>{{ t('formBuilder.attachmentSize') }}</span>
    <NInputNumber
      :value="node.maxSize ?? null"
      :min="1"
      :precision="0"
      :input-props="{ 'aria-label': t('formBuilder.attachmentSize') }"
      @update:value="emit('patch', 'maxSize', $event ?? undefined)"
    />
  </section>
</template>
