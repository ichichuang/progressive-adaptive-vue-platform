<script setup lang="ts">
import { type HTMLAttributes, type ButtonHTMLAttributes, computed } from 'vue'

import type { ConsoleMessageKey } from '../../../shared/i18n'
import { UiCopyAction, UiForm, UiTable, useUiTable, useUiTableQuery } from '@platform/ui'
import { NButton } from 'naive-ui/es/button'
import type { ValidatedRouteInput } from '../../router/route-input'
import { useApplicationNavigation } from '../../router/application-navigation'
import { useTableQueryLink } from '../../tables/use-table-query-link'
import { tableQuerySharingCodec } from '../../tables/table-query-sharing-example'
import {
  tableDataCapabilitySchema,
  tableFilterSampleRows,
  tableSampleNotes,
} from './table-data-capabilities'
import { useTableShowcase } from './table-showcase'
import TableCapabilityWorkbench from './TableCapabilityWorkbench.vue'
const props = defineProps<{
  readonly title: string
  readonly message: string
  readonly routeInput: ValidatedRouteInput<'component-table-query-link'>
}>()
const demo = useTableShowcase()
const { t } = demo
const navigation = useApplicationNavigation()
const notes = tableSampleNotes(t)
const schema = {
  ...tableDataCapabilitySchema('sorting', notes, 'submit', 250, 'multiple'),
  id: 'table-query-link',
}
const table = useUiTable({
  schema,
  rows: tableFilterSampleRows(60, notes.available.value),
  translate: (value) =>
    value.startsWith('tableCapabilities.data.')
      ? t(value as ConsoleMessageKey)
      : demo.translate(value),
  immediate: false,
})
const query = useUiTableQuery(table, {
  ...demo.copy,
  submit: () => t('tableShowcase.search'),
  submitSucceeded: () => '',
})
const sharing = useTableQueryLink({
  table,
  codec: tableQuerySharingCodec,
  routeQuery: () => props.routeInput.query,
  async navigate(query, replace) {
    const result = await navigation.navigate(
      { name: 'component-table-query-link', query },
      { replace },
    )
    return result.kind === 'allow' || result.kind === 'duplicated'
  },
  href(query) {
    const href = navigation.resolveHref({ name: 'component-table-query-link', query })
    return href ? new URL(href, window.location.origin).href : ''
  },
})
const copyValue = computed(() =>
  [
    props.title,
    props.message,
    'useUiTable · applyQuery · useTableQueryLink',
    'apps/web/src/app/workbench/tables/TableQueryLinkExample.vue',
  ].join('\n\n'),
)
</script>
<template>
  <TableCapabilityWorkbench
    :title="title"
    :message="message"
    :copy-value="copyValue"
    scroll-controls
  >
    <template #controls>
      <UiForm
        :form="query"
        class="min-w-0"
      >
        <template #actions>
          <span />
        </template>
      </UiForm>
    </template>
    <UiTable
      :table="table"
      :copy="demo.tableCopy"
      :height="{ mode: 'fill' }"
    />
    <template #footer>
      <div class="flex flex-wrap min-w-0 items-center gap-content-gap">
        <span
          class="sr-only"
          role="status"
        >
          {{ sharing.error.value ? t('tableQueryLink.failed') : t('tableQueryLink.hint') }}
        </span>
        <NButton
          type="primary"
          attr-type="submit"
          v-bind="{ form: query.formId } satisfies ButtonHTMLAttributes"
          :disabled="table.loading.value"
        >
          {{ t('tableShowcase.search') }}
        </NButton>
        <NButton
          secondary
          attr-type="reset"
          v-bind="{ form: query.formId } satisfies ButtonHTMLAttributes"
          :disabled="table.loading.value"
        >
          {{ t('configuredForm.reset') }}
        </NButton>
        <UiCopyAction
          class="ml-auto"
          variant="text"
          :value="sharing.link.value"
          :label="t('tableQueryLink.copy')"
          :copy-label="t('workbench.copy')"
          :success-label="t('workbench.copied')"
          :failure-label="t('workbench.copyFailed')"
          v-bind="
            {
              title: sharing.error.value ? t('tableQueryLink.failed') : t('tableQueryLink.hint'),
            } satisfies HTMLAttributes
          "
        />
      </div>
    </template>
  </TableCapabilityWorkbench>
</template>
