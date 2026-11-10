import { shallowRef } from 'vue'
import type { UiTableController, UiTableRecord, UiTableTransport } from '@platform/ui'

/** In-memory example records. No HTTP or persistent storage is implied. */
export function createLocalProductTable() {
  const records = shallowRef<UiTableRecord[]>(
    Array.from({ length: 24 }, (_, index) => ({
      id: index + 1,
      title: `PAVP ${String(index + 1).padStart(2, '0')}`,
      category: ['Design', 'Engineering', 'Research'][index % 3] ?? 'Design',
      price: (index + 1) * 12,
      stock: 8 + index,
      description: `PAVP sample ${String(index + 1).padStart(2, '0')} · ${['Design', 'Engineering', 'Research'][index % 3] ?? 'Design'}`,
    })),
  )
  const revision = shallowRef(0)
  let nextId = records.value.length + 1
  const transport = (table: UiTableController): UiTableTransport => ({
    list: () => Promise.reject(new Error('Local data does not use HTTP.')),
    async mutate(request, signal) {
      signal.throwIfAborted()
      if (request.api === 'local/remove-selected') {
        const keys = request.body['keys']
        if (!Array.isArray(keys)) throw new TypeError('Selection keys are required.')
        records.value = records.value.filter((row) => !keys.includes(row['id'] ?? null))
      } else if (request.api === 'local/remove') {
        records.value = records.value.filter((row) => row['id'] !== request.body['id'])
      } else if (request.api === 'local/create' || request.api === 'local/update') {
        const record = { ...request.body }
        delete record['id']
        if (request.api === 'local/create')
          records.value = [...records.value, { ...record, id: nextId++, category: 'Design' }]
        else
          records.value = records.value.map((row) =>
            row['id'] === request.body['id'] ? { ...row, ...record } : row,
          )
      } else throw new TypeError('Unsupported local operation.')
      await table.setRows(records.value)
      revision.value++
    },
  })
  return {
    get rows() {
      return records.value
    },
    revision,
    transport,
  }
}

/** Shared by the three editor presentations for the current application lifetime. */
export const editExampleProducts = createLocalProductTable()
