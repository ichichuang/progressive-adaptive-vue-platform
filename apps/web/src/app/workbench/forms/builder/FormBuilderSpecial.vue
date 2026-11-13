<script setup lang="ts">
import { NInput } from 'naive-ui/es/input'
import { NInputNumber } from 'naive-ui/es/input-number'
import { NSwitch } from 'naive-ui/es/switch'
import { useConsoleI18n } from '../../../../shared/i18n'
import type { BuilderEditableNode } from './use-form-builder'
const props = defineProps<{ readonly node: BuilderEditableNode }>()
const emit = defineEmits<{ patch: [property: string, value: unknown] }>()
const { t } = useConsoleI18n()
function setCompression(enabled: boolean): void {
  if (props.node.kind !== 'attachment') return
  const current = props.node.imageProcessing
  emit(
    'patch',
    'imageProcessing',
    enabled
      ? {
          ...current,
          output: { mimeType: 'image/webp', quality: 0.85, maxWidth: 1600, maxHeight: 1600 },
        }
      : current?.crop
        ? { crop: current.crop }
        : undefined,
  )
}
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
    <div class="flex items-center justify-between gap-component-unit">
      <span>{{ t('formMedia.cropTitle') }}</span>
      <NSwitch
        :value="Boolean(node.imageProcessing?.crop)"
        :aria-label="t('formMedia.cropTitle')"
        @update:value="
          emit(
            'patch',
            'imageProcessing',
            $event
              ? { ...node.imageProcessing, crop: {} }
              : node.imageProcessing?.output
                ? { output: node.imageProcessing.output }
                : undefined,
          )
        "
      />
    </div>
    <div class="flex items-center justify-between gap-component-unit">
      <span>{{ t('formMedia.compress') }}</span>
      <NSwitch
        :value="Boolean(node.imageProcessing?.output)"
        :aria-label="t('formMedia.compress')"
        @update:value="setCompression"
      />
    </div>
    <div class="flex items-center justify-between gap-component-unit">
      <span>{{ t('formMedia.previewTitle') }}</span>
      <NSwitch
        :value="Boolean(node.preview)"
        :aria-label="t('formMedia.previewTitle')"
        @update:value="emit('patch', 'preview', $event ? { types: ['image', 'pdf'] } : undefined)"
      />
    </div>
  </section>
</template>
