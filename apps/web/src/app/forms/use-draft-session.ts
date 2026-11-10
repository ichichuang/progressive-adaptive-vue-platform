import { computed, onScopeDispose, readonly, ref, shallowRef, toRef, watch } from 'vue'
import { subscribeFormDraftChanges } from '../storage/form-draft-storage'
import { formDraftSignature } from './form-draft-signature'
import type { FormDraftFailure, FormDraftPort, FormDraftRead } from './form-draft-contract'

export type DraftSessionStatus =
  'empty' | 'available' | 'restored' | 'saved' | 'changed' | 'cleared' | FormDraftFailure

/** One mounted consumer owns saving; automatic recovery is an explicit consumer policy. */
export function useDraftSession<T>(input: {
  readonly port: FormDraftPort<T>
  readonly snapshot: () => T
  readonly restore: (data: T) => boolean
  readonly automatic?: boolean
  readonly enabled?: () => boolean
}) {
  const status = ref<DraftSessionStatus>('empty')
  const available = shallowRef<Extract<FormDraftRead<T>, { status: 'found' }> | null>(null)
  const savedAt = ref<number | null>(null)
  const expiresAt = ref<number | null>(null)
  const ready = ref(false)
  const active = computed(() => ready.value && (input.enabled?.() ?? true))
  const serialized = computed(() => formDraftSignature(input.snapshot()))
  const initial = serialized.value
  const acknowledged = ref(initial)
  const recoverable = ref<string | null>(initial)
  // A getter also detects expiry when a background tab's timer has been throttled.
  const unsaved = toRef(
    () =>
      serialized.value !== recoverable.value ||
      (expiresAt.value !== null && expiresAt.value <= Date.now()),
  )
  let timer: ReturnType<typeof setTimeout> | undefined
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let observed = ''
  let needsInspection = false
  function cancel(): void {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  function scheduleExpiry(): void {
    if (expiryTimer !== undefined) clearTimeout(expiryTimer)
    expiryTimer = undefined
    if (expiresAt.value !== null)
      expiryTimer = setTimeout(
        recheck,
        Math.min(2_147_483_647, Math.max(1, expiresAt.value - Date.now())),
      )
  }
  function acceptRead(result: FormDraftRead<T>, explicit: boolean): void {
    const token = formDraftSignature(result)
    if (!explicit && token === observed) {
      scheduleExpiry()
      return
    }
    cancel()
    observed = token
    needsInspection = !explicit
    available.value = result.status === 'found' ? result : null
    ready.value = explicit && result.status === 'missing'
    recoverable.value =
      result.status === 'found'
        ? formDraftSignature(result.data)
        : result.status === 'missing'
          ? initial
          : null
    status.value =
      result.status === 'unusable'
        ? result.reason
        : explicit
          ? result.status === 'found'
            ? 'available'
            : 'empty'
          : 'conflict'
    savedAt.value = result.status === 'found' ? result.savedAt : null
    expiresAt.value = result.status === 'found' ? result.expiresAt : null
    scheduleExpiry()
  }
  function inspect(): void {
    acceptRead(input.port.read(), true)
  }
  function recheck(): void {
    acceptRead(input.port.read(), false)
  }
  function remember(data: T, time: { savedAt: number; expiresAt: number }): void {
    observed = formDraftSignature({
      status: 'found',
      data,
      savedAt: time.savedAt,
      expiresAt: time.expiresAt,
    })
    acknowledged.value = serialized.value
    recoverable.value = serialized.value
    savedAt.value = time.savedAt
    expiresAt.value = time.expiresAt
    needsInspection = false
    scheduleExpiry()
  }
  function save(): boolean {
    cancel()
    if (!active.value) return false
    const data = input.snapshot()
    const result = input.port.write(data)
    if (result.status === 'failed') {
      status.value = result.reason
      recoverable.value = null
      if (result.reason === 'conflict' || result.reason === 'invalid') {
        ready.value = false
        needsInspection = true
      }
      return false
    }
    remember(data, result)
    status.value = 'saved'
    return true
  }
  function restore(): boolean {
    const draft = available.value
    if (!draft || needsInspection) return false
    const latest = input.port.read()
    if (
      latest.status !== 'found' ||
      latest.savedAt !== draft.savedAt ||
      formDraftSignature(latest.data) !== formDraftSignature(draft.data)
    ) {
      acceptRead(latest, false)
      return false
    }
    try {
      if (!input.restore(draft.data)) {
        status.value = 'incompatible'
        return false
      }
    } catch {
      status.value = 'invalid'
      ready.value = false
      return false
    }
    cancel()
    // Recoverable raw editor text is not a committed schema edit.
    remember(draft.data, draft)
    available.value = null
    ready.value = true
    status.value = 'restored'
    return true
  }
  function clear(): boolean {
    cancel()
    if (needsInspection) return false
    const result = input.port.clear()
    if (result.status === 'failed') {
      status.value = result.reason
      recoverable.value = null
      return false
    }
    observed = formDraftSignature({ status: 'missing' })
    available.value = null
    savedAt.value = null
    expiresAt.value = null
    ready.value = true
    acknowledged.value = serialized.value
    recoverable.value = initial
    status.value = 'cleared'
    scheduleExpiry()
    return true
  }
  inspect()
  if (input.automatic && serialized.value === initial && (input.enabled?.() ?? true)) restore()
  watch(
    () => [serialized.value, input.enabled?.() ?? true],
    () => {
      cancel()
      if (!active.value || serialized.value === acknowledged.value) return
      status.value = 'changed'
      if (input.automatic) save()
      else timer = setTimeout(save, 300)
    },
    // Persist the completed input operation, not its intermediate reactive mutations.
    { flush: input.automatic ? 'post' : 'sync' },
  )
  function flush(): void {
    if (active.value && serialized.value !== acknowledged.value) save()
  }
  function visibilityChanged(): void {
    if (document.visibilityState === 'hidden') flush()
    else recheck()
  }
  const unsubscribe = subscribeFormDraftChanges(recheck)
  // Close the initial read-before-listen gap without overwriting any draft.
  recheck()
  if (input.automatic) window.addEventListener('beforeunload', flush)
  window.addEventListener('pagehide', flush)
  window.addEventListener('pageshow', recheck)
  window.addEventListener('focus', recheck)
  document.addEventListener('visibilitychange', visibilityChanged)
  onScopeDispose(() => {
    flush()
    cancel()
    if (expiryTimer !== undefined) clearTimeout(expiryTimer)
    unsubscribe()
    if (input.automatic) window.removeEventListener('beforeunload', flush)
    window.removeEventListener('pagehide', flush)
    window.removeEventListener('pageshow', recheck)
    window.removeEventListener('focus', recheck)
    document.removeEventListener('visibilitychange', visibilityChanged)
  })
  return {
    status: readonly(status),
    available: readonly(available),
    savedAt: readonly(savedAt),
    expiresAt: readonly(expiresAt),
    active: readonly(active),
    unsaved,
    inspect,
    save,
    restore,
    clear,
  }
}
