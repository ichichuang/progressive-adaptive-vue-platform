import { z } from 'zod'
import type { AccessHost } from './access-contract'

const key = z.string().min(1).max(128)
const hint = z.strictObject({
  application: key,
  id: z.uuid(),
  audience: key,
})

/** Validate the host transport's hints before asking this window to reread its host. */
export function openAccessWindowInvalidation(
  transport: NonNullable<AccessHost['windowInvalidation']>,
  audience: () => string | undefined,
  revalidate: () => void,
) {
  const application = key.safeParse(transport.application)
  if (!application.success) return
  const seen = new Set<string>()
  let disposed = false

  function remember(id: string): void {
    if (seen.size >= 128) {
      const oldest = seen.values().next().value
      if (oldest !== undefined) seen.delete(oldest)
    }
    seen.add(id)
  }

  let unsubscribe: () => void
  try {
    unsubscribe = transport.subscribe((message) => {
      const parsed = hint.safeParse(message)
      if (
        disposed ||
        !parsed.success ||
        parsed.data.application !== application.data ||
        parsed.data.audience !== audience() ||
        seen.has(parsed.data.id)
      )
        return
      remember(parsed.data.id)
      revalidate()
    })
  } catch {
    return
  }

  return {
    publish() {
      const current = key.safeParse(audience())
      if (disposed || !current.success) return
      try {
        const id = crypto.randomUUID()
        remember(id)
        transport.send({ application: application.data, id, audience: current.data })
      } catch {
        // A local session transition is still required if transport fails.
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      seen.clear()
      unsubscribe()
    },
  }
}
