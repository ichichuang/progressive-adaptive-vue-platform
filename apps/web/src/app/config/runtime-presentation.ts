import { inject, type InjectionKey } from 'vue'

import {
  defaultRuntimePresentation,
  type RuntimePresentation,
} from './runtime-configuration-contract'

export const runtimePresentationKey: InjectionKey<RuntimePresentation> =
  Symbol('RuntimePresentation')

export function useRuntimePresentation(): RuntimePresentation {
  return inject(runtimePresentationKey, defaultRuntimePresentation)
}

/** Apply public document branding before mounting application content. */
export function applyRuntimeDocumentPresentation(
  document: Document,
  presentation: RuntimePresentation,
): void {
  if (presentation.name !== null) document.title = presentation.name
  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon !== null) {
    favicon.href = presentation.favicon
    favicon.removeAttribute('type')
  }
}
