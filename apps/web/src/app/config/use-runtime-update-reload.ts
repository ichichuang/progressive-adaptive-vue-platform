import { onScopeDispose, readonly, ref } from 'vue'
import type { CompiledBuildIdentity } from './runtime-configuration'

interface RuntimeReloadPermit {
  reload(action: () => void): boolean
}
/** Deployment reload owns whole-document navigation, separate from tab refresh. */
export function useRuntimeUpdateReload(input: {
  readonly candidate: () => CompiledBuildIdentity | null
  readonly requestReload: (isCurrent: () => boolean) => Promise<RuntimeReloadPermit | undefined>
  readonly reloadDocument?: () => void
}) {
  const busy = ref(false)
  let disposed = false
  onScopeDispose(() => {
    disposed = true
  })
  async function reload(): Promise<void> {
    const candidate = input.candidate()
    if (disposed || !candidate || busy.value) return
    busy.value = true
    const isCurrent = (): boolean => {
      const current = input.candidate()
      return (
        !disposed &&
        current?.releaseSha === candidate.releaseSha &&
        current.buildVersion === candidate.buildVersion
      )
    }
    try {
      const permit = await input.requestReload(isCurrent)
      if (!isCurrent()) return
      permit?.reload(() => {
        if (input.reloadDocument) input.reloadDocument()
        else window.location.reload()
      })
    } finally {
      busy.value = false
    }
  }
  return { busy: readonly(busy), reload }
}
