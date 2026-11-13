<script setup lang="ts">
import { onScopeDispose, shallowRef, watch } from 'vue'
import { NTable } from 'naive-ui/es/table'
import { NImage } from 'naive-ui/es/image'
import { PavpRichTextContent } from '../../components/PavpRichTextContent'
import type { UiReportCopy, UiReportSnapshot } from '../../components/report-contracts'
const props = defineProps<{ snapshot: UiReportSnapshot; copy: UiReportCopy }>()
const images = shallowRef<ReadonlyMap<number, string>>(new Map())
function clear() {
  for (const url of images.value.values()) URL.revokeObjectURL(url)
  images.value = new Map()
}
watch(
  () => props.snapshot,
  (snapshot) => {
    clear()
    const next = new Map<number, string>()
    snapshot.sections.forEach((section, index) => {
      if (section.kind === 'chart') next.set(index, URL.createObjectURL(section.image))
    })
    images.value = next
  },
  { immediate: true },
)
onScopeDispose(clear)
</script>
<template>
  <article class="pavp-report-content grid min-w-0 gap-content-gap text-text-primary">
    <header>
      <h1 class="m-0 text-title">
        {{ snapshot.title }}
      </h1>
      <p class="text-caption text-text-secondary">
        {{ copy.capturedAt(snapshot.capturedAt) }}
      </p>
    </header>
    <section
      v-for="(section, index) in snapshot.sections"
      :key="index"
      class="grid min-w-0 gap-component-unit"
    >
      <h2 class="m-0 text-subheading">
        {{ section.title }}
      </h2>
      <dl
        v-if="section.kind === 'form'"
        class="m-0 grid gap-component-unit"
      >
        <div
          v-for="(field, fieldIndex) in section.fields"
          :key="fieldIndex"
          class="pavp-report-field"
        >
          <dt class="text-caption text-text-secondary">
            {{ field.group ? `${field.group} · ${field.label}` : field.label }}
          </dt>
          <dd class="m-0 whitespace-pre-wrap break-words">
            <PavpRichTextContent
              v-if="field.richText"
              :document="field.richText"
            />
            <span
              v-else
              v-text="field.text"
            />
          </dd>
        </div>
      </dl>
      <template v-else-if="section.kind === 'table'">
        <p class="m-0 text-caption text-text-secondary">
          {{ copy.tableScope(section) }}
        </p>
        <NTable
          :single-line="false"
          size="small"
        >
          <thead>
            <tr>
              <th
                v-for="column in section.columns"
                :key="column.key"
              >
                {{ column.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in section.rows"
              :key="rowIndex"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                class="whitespace-pre-wrap break-words"
              >
                {{ cell }}
              </td>
            </tr>
          </tbody>
        </NTable>
      </template>
      <NImage
        v-else
        :src="images.get(index) ?? ''"
        :alt="section.alt"
        preview-disabled
        :img-props="{ class: 'max-w-full h-auto object-contain' }"
      />
    </section>
  </article>
</template>
