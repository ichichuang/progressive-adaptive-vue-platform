<script setup lang="ts">
import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import { NButton } from 'naive-ui/es/button'
import { NModal } from 'naive-ui/es/modal'
import { NCard } from 'naive-ui/es/card'
import {
  UiForm,
  UiScrollArea,
  UiTable,
  useUiTable,
  useUiTableQuery,
  type UiTableSchema,
  type UiTableReadonlyRecord,
} from '@platform/ui'
import {
  createPublicProductTableTransport,
  publicProductTableRequests,
} from '../tables/public-product-table'
import { useTableShowcase } from '../tables/table-showcase'
const demo = useTableShowcase()
const { t } = demo
const transport = createPublicProductTableTransport()
const schema: UiTableSchema = {
  id: 'api-integration-products',
  rowKey: 'id',
  height: { mode: 'fill' },
  source: { kind: 'remote', request: publicProductTableRequests.list },
  selection: 'none',
  pagination: { pageSize: 5, pageSizes: [5, 10, 20] },
  columns: [
    { key: 'id', title: 'tableShowcase.id', kind: 'number', width: 80 },
    { key: 'title', title: 'tableShowcase.title', width: 220 },
    { key: 'category', title: 'tableShowcase.category', kind: 'tag', width: 160 },
    { key: 'price', title: 'tableShowcase.price', kind: 'number', width: 120 },
  ],
  query: {
    mode: 'submit',
    form: {
      fields: [
        {
          kind: 'text',
          name: 'q',
          label: 'tableShowcase.search',
          placeholder: 'tableShowcase.searchHint',
        },
      ],
    },
  },
}
const table = useUiTable({ schema, transport, immediate: false, translate: demo.translate })
const form = useUiTableQuery(table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const filtersExpanded = ref(true)
watch(table.loading, (loading, wasLoading) => {
  if (wasLoading && !loading && table.error.value === null) filtersExpanded.value = false
})
const detail = shallowRef<UiTableReadonlyRecord>()
const open = ref(false)
const loading = ref(false)
const failed = ref(false)
let controller: AbortController | undefined
let sequence = 0
function close(): void {
  ++sequence
  controller?.abort()
  controller = undefined
  open.value = false
  loading.value = false
}
async function readDetail(row: UiTableReadonlyRecord): Promise<void> {
  const id = row['id']
  if ((typeof id !== 'string' && typeof id !== 'number') || !transport.detail) return
  controller?.abort()
  const current = ++sequence
  const request = new AbortController()
  controller = request
  open.value = true
  loading.value = true
  failed.value = false
  detail.value = undefined
  try {
    const result = await transport.detail(
      {
        api: `products/${encodeURIComponent(String(id))}`,
        method: 'GET',
        params: {},
        body: {},
      },
      request.signal,
    )
    if (current === sequence) detail.value = result
  } catch {
    if (current === sequence && !request.signal.aborted) failed.value = true
  } finally {
    if (current === sequence) {
      loading.value = false
      controller = undefined
    }
  }
}
function updateOpen(value: boolean): void {
  if (!value) close()
}
onScopeDispose(close)
const applied = computed(() => {
  const value = table.query.value.filters['q']
  return typeof value === 'string' ? value : ''
})
const details = computed(() =>
  ['id', 'title', 'category', 'price', 'description'].map((key) => ({
    key,
    value: detail.value?.[key],
  })),
)
</script>
<template>
  <section
    class="flex flex-1 flex-col min-h-0 min-w-0 gap-content-gap"
    data-api-integration-demo
  >
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
    >
      <template #query>
        <div class="hidden layout-narrow:block">
          <NButton
            text
            type="primary"
            class="min-h-target-enhanced"
            :aria-expanded="filtersExpanded"
            @click="filtersExpanded = !filtersExpanded"
          >
            {{
              t(
                filtersExpanded
                  ? 'apiShowcase.integration.hideFilters'
                  : 'apiShowcase.integration.showFilters',
              )
            }}
          </NButton>
        </div>
        <div :class="filtersExpanded ? '' : 'layout-narrow:hidden'">
          <UiForm
            :form="form"
            class="flex flex-wrap min-w-0 items-end gap-component-unit"
          />
        </div>
        <p
          class="m-0 text-caption text-text-secondary"
          role="status"
          aria-live="polite"
        >
          {{
            form.hasUnsavedChanges.value
              ? t('apiShowcase.integration.pending')
              : t('apiShowcase.integration.applied')
          }}
          {{ applied || t('apiShowcase.integration.all') }}
        </p>
      </template>
      <template #actions>
        <span class="text-caption text-text-secondary">{{
          t('apiShowcase.integration.getOnly')
        }}</span>
      </template>
      <template #rowActions="{ row }">
        <NButton
          text
          type="primary"
          @click="readDetail(row)"
        >
          {{ t('apiShowcase.integration.detail') }}
        </NButton>
      </template>
    </UiTable>
    <NModal
      :show="open"
      to="#pavp-overlay-root"
      :aria-label="t('apiShowcase.integration.detail')"
      @update:show="updateOpen"
    >
      <NCard
        class="wb-provider-modal max-h-dvh"
        content-class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
        :title="t('apiShowcase.integration.detail')"
        role="dialog"
        aria-modal="true"
        closable
        @close="close"
      >
        <UiScrollArea
          owner-id="api-product-detail"
          class="flex-1 min-h-0 min-w-0"
        >
          <p
            v-if="loading"
            role="status"
          >
            {{ t('apiShowcase.integration.loading') }}
          </p>
          <p
            v-else-if="failed"
            role="alert"
          >
            {{ t('apiShowcase.integration.failed') }}
          </p>
          <dl
            v-else
            class="grid min-w-0 gap-content-gap"
          >
            <div
              v-for="item in details"
              :key="item.key"
              class="grid min-w-0 gap-component-unit"
            >
              <dt class="text-caption text-text-secondary">
                {{ demo.translate(`tableShowcase.${item.key}`) }}
              </dt>
              <dd class="m-0 break-anywhere text-body text-text-primary">
                {{ item.value }}
              </dd>
            </div>
          </dl>
        </UiScrollArea>
        <template #footer>
          <NButton @click="close">
            {{ t('apiShowcase.integration.close') }}
          </NButton>
        </template>
      </NCard>
    </NModal>
  </section>
</template>
