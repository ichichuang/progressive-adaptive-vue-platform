import { computed, onActivated, onDeactivated, onScopeDispose, shallowRef, watch } from 'vue'
import type { UiTableController, UiTableQuery } from '@platform/ui'
import type { createTableQueryLinkCodec } from './table-query-link'

/** The table remains the only mutable query owner. Route input is a navigation snapshot. */
export function useTableQueryLink(options: {
  readonly table: UiTableController
  readonly codec: ReturnType<typeof createTableQueryLinkCodec>
  readonly routeQuery: () => unknown
  readonly navigate: (query: { table?: string }, replace: boolean) => Promise<boolean>
  readonly href: (query: { table?: string }) => string
}) {
  let active = true
  let disposed = false
  let applying = false
  let writing = false
  let revision = 0
  let inFlight: string | undefined
  let restoring: Omit<UiTableQuery, 'sort'> | undefined
  let queued: { readonly query: { table?: string }; readonly replace: boolean } | undefined
  const error = shallowRef(false)
  const live = () => active && !disposed
  const signature = (query: { table?: string }) => query.table ?? ''
  const current = () => options.codec.encode(options.table.query.value)
  const route = () => options.codec.encode(options.codec.decode(options.routeQuery()))
  async function write(query: { table?: string }, replace = false): Promise<void> {
    queued = { query, replace }
    if (writing) return
    writing = true
    try {
      while (queued && live()) {
        const next = queued
        queued = undefined
        const ticket = revision
        inFlight = signature(next.query)
        try {
          const success = await options.navigate(next.query, next.replace)
          if (ticket !== revision || !live()) break
          error.value = !success
          if (!success) {
            queued = undefined
            break
          }
        } catch {
          if (ticket === revision && live()) {
            error.value = true
            queued = undefined
          }
          break
        }
      }
    } finally {
      writing = false
      inFlight = undefined
      if (queued && active && !disposed) void write(queued.query, queued.replace)
    }
  }
  async function restore(initial = false): Promise<void> {
    if (!active || disposed) return
    let ticket = revision
    try {
      const incoming = options.codec.decode(options.routeQuery(), options.table.query.value.filters)
      const key = signature(options.codec.encode(incoming))
      if (!initial && key === inFlight) return // Only our exact navigation echo is ignored.
      queued = undefined
      ticket = ++revision
      if (!initial && key === signature(current())) {
        restoring = undefined
        error.value = false
        return
      }
      restoring = incoming
      applying = true
      let completion: Promise<void>
      try {
        completion = options.table.applyQuery(incoming)
      } finally {
        applying = false
      }
      await completion
      if (ticket !== revision || !live() || restoring !== incoming) return
      restoring = undefined
      // A valid but out-of-range page is normalized without truncating Forward history.
      const normalized = current()
      error.value = false
      if (signature(normalized) !== signature(route())) void write(normalized, true)
    } catch {
      if (ticket !== revision || !live()) return
      ++revision
      restoring = undefined
      queued = undefined
      error.value = true
    }
  }

  watch(
    options.routeQuery,
    () => {
      void restore()
    },
    { deep: true },
  )
  watch(
    options.table.query,
    () => {
      if (!active || disposed || applying) return
      try {
        const next = current()
        // A pending navigation can still move away from this URL. Queue the latest
        // intent even when a reset currently matches the route.
        if (!writing && signature(next) === signature(route())) return
        const correction = options.table.queryChangeReason.value === 'page-correction'
        if (correction && restoring !== undefined) return
        restoring = undefined
        ++revision
        void write(next, correction)
      } catch {
        error.value = true
      }
    },
    { flush: 'sync' },
  )
  // Synchronous hydration happens before query-form creation; no default request is issued.
  void restore(true)
  onActivated(() => {
    if (active) return
    active = true
    void restore()
  })
  onDeactivated(() => {
    active = false
    queued = undefined
    restoring = undefined
    ++revision
  })
  onScopeDispose(() => {
    disposed = true
    queued = undefined
    ++revision
  })
  const link = computed(() => {
    try {
      return options.href(current())
    } catch {
      return ''
    }
  })
  return { link, error }
}
