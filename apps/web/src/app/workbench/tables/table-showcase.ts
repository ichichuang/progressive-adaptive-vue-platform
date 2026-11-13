import type { UiTableCopy, UiTableEditorCopy, UiTableSchema } from '@platform/ui'
import type { ConsoleMessageKey } from '../../../shared/i18n'
import { useFormShowcase } from '../forms/form-showcase'
import { publicProductTableRequests } from './public-product-table'

export function tableShowcaseSchema(
  remote: boolean,
  presentation: 'modal' | 'drawer' | 'page' = 'modal',
): UiTableSchema {
  return {
    id: remote ? 'public-products' : 'local-products',
    rowKey: 'id',
    source: remote
      ? { kind: 'remote', request: publicProductTableRequests.list }
      : { kind: 'local' },
    columnSettings: true,
    selection: 'multiple',
    pagination: { pageSize: 5, pageSizes: [5, 10, 20] },
    columns: [
      { key: 'id', title: 'tableShowcase.id', kind: 'number', width: 80, sortable: !remote },
      { key: 'title', title: 'tableShowcase.title', width: 220, sortable: !remote },
      {
        key: 'category',
        title: 'tableShowcase.category',
        kind: 'tag',
        width: 160,
        sortable: !remote,
      },
      { key: 'price', title: 'tableShowcase.price', kind: 'number', width: 120, sortable: !remote },
      { key: 'stock', title: 'tableShowcase.stock', kind: 'number', width: 120, sortable: !remote },
    ],
    query: {
      mode: 'submit',
      form: {
        fields: [
          {
            kind: 'text',
            name: remote ? 'q' : 'title',
            label: 'tableShowcase.search',
            placeholder: 'tableShowcase.searchHint',
          },
        ],
      },
    },
    editor: {
      presentation,
      ...(presentation === 'modal' ? { modal: { maximizable: true, draggable: true } } : {}),
      form: {
        columns: 2,
        fields: [
          { kind: 'text', name: 'title', label: 'tableShowcase.title', required: true },
          { kind: 'number', name: 'price', label: 'tableShowcase.price', required: true, min: 0 },
          { kind: 'number', name: 'stock', label: 'tableShowcase.stock', required: true, min: 0 },
          { kind: 'textarea', name: 'description', label: 'tableShowcase.description', span: 2 },
        ],
      },
      ...(remote
        ? {
            create: publicProductTableRequests.create,
            update: publicProductTableRequests.update,
            remove: publicProductTableRequests.remove,
            detail: publicProductTableRequests.detail,
          }
        : {
            create: {
              api: 'local/create',
              method: 'POST',
              body: {
                title: { from: 'form.title' },
                description: { from: 'form.description' },
                price: { from: 'form.price' },
                stock: { from: 'form.stock' },
              },
            },
            update: {
              api: 'local/update',
              method: 'PATCH',
              body: {
                id: { from: 'row.id' },
                title: { from: 'form.title' },
                description: { from: 'form.description' },
                price: { from: 'form.price' },
                stock: { from: 'form.stock' },
              },
            },
            remove: { api: 'local/remove', method: 'DELETE', body: { id: { from: 'row.id' } } },
          }),
    },
    ...(!remote
      ? {
          batchActions: [
            {
              id: 'remove-selected',
              label: 'tableShowcase.removeSelected',
              request: {
                api: 'local/remove-selected',
                method: 'DELETE' as const,
                body: { keys: { from: 'selection.keys' } },
              },
            },
          ],
        }
      : {}),
  }
}
const translatedSchemaLabels = [
  'tableExamples.columns.detailsGroup',
  'tableExamples.columns.businessGroup',
  'tableExamples.columns.metricsGroup',
  'tableShowcase.id',
  'tableShowcase.title',
  'tableShowcase.category',
  'tableShowcase.price',
  'tableShowcase.stock',
  'tableShowcase.description',
  'tableShowcase.search',
  'tableShowcase.searchHint',
  'tableShowcase.removeSelected',
  'tableShowcase.keywordHint',
  'tableExamples.summary.sum',
  'tableExamples.summary.avg',
  'tableExamples.summary.min',
  'tableExamples.summary.max',
  'tableExamples.summary.average',
  'tableExamples.summary.customText',
  'tableExamples.summary.pageTotal',
  'tableCapabilities.tree.name',
  'tableCapabilities.tree.kind',
  'tableCapabilities.tree.stock',
] as const satisfies readonly ConsoleMessageKey[]
export function useTableShowcase() {
  const demo = useFormShowcase()
  const { t } = demo
  const tableCopy: UiTableCopy = {
    exportPage: () => t('tableShowcase.exportPage'),
    exportSelected: () => t('tableShowcase.exportSelected'),
    sortLabel: (title, order) =>
      `${title} · ${t(
        order === 'ascend'
          ? 'tableShowcase.sortAscending'
          : order === 'descend'
            ? 'tableShowcase.sortDescending'
            : 'tableShowcase.sortNone',
      )}`,
    search: () => t('tableShowcase.search'),
    selectionLimit: (selected, maximum) =>
      `${t('tableExamples.selected')} ${String(selected)} / ${String(maximum)}`,
    loadMore: () => t('tableShowcase.loadMore'),
    loadedAll: () => t('tableShowcase.loadedAll'),
    maximize: () => t('tableShowcase.maximize'),
    restore: () => t('tableShowcase.restore'),
    resizeColumn: (title) => `${title} · ${t('tableShowcase.resizeColumn')}`,
    reorderColumn: (title) => `${title} · ${t('tableShowcase.reorderColumn')}`,
    columns: () => t('tableShowcase.columns'),
    resetColumns: () => t('tableShowcase.resetColumns'),
    moveColumn: (title, direction) =>
      `${title} · ${t(direction === 'up' ? 'configuredForm.moveUp' : 'configuredForm.moveDown')}`,
    actions: () => t('tableShowcase.actions'),
    refresh: () => t('tableShowcase.refresh'),
    loading: () => t('tableShowcase.loading'),
    empty: () => t('tableShowcase.empty'),
    error: () => t('tableShowcase.error'),
    retry: () => t('configuredForm.retryOptions'),
    boolean: (value) => t(value ? 'configuredForm.yes' : 'configuredForm.no'),
  }
  const editorCopy: UiTableEditorCopy = {
    maximize: () => t('tableShowcase.maximizeEditor'),
    restore: () => t('tableShowcase.restoreEditor'),
    title: (mode) =>
      t(
        mode === 'create'
          ? 'tableShowcase.create'
          : mode === 'edit'
            ? 'tableShowcase.edit'
            : 'tableShowcase.detail',
      ),
    close: () => t('tableShowcase.close'),
    cancel: () => t('tableShowcase.cancel'),
    save: () => t('tableShowcase.save'),
    continueEditing: () => t('tableShowcase.continueEditing'),
    discardChanges: () => t('tableShowcase.discardChanges'),
    loading: tableCopy.loading,
    error: tableCopy.error,
    closeBlocked: () => t('tableShowcase.closeBlocked'),
  }
  return {
    ...demo,
    translate: (value: string) => {
      const key = translatedSchemaLabels.find((candidate) => candidate === value)
      return key === undefined ? value : t(key)
    },
    tableCopy,
    editorCopy,
  }
}
