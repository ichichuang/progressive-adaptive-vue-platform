export type UiShellComposition =
  | 'admin-workspace'
  | 'admin-workspace-footer'
  | 'header-content'
  | 'header-content-footer'
  | 'content-footer'
  | 'content-only'

export interface UiAdminNavigationItem {
  readonly iconClass: string
  readonly label: string
  readonly routeName: string
  readonly isCurrentDestination: boolean
}

export interface UiAdminNavigationGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly (UiAdminNavigationItem | UiAdminNavigationGroup)[]
}

export interface UiRadioCardOption {
  readonly label: string
  readonly value: string
}

export type UiStatusTone = 'active' | 'complete' | 'deferred' | 'inactive' | 'not-started'

export type UiLocale = 'zh-CN' | 'en'
export interface UiAdminShellCopy {
  readonly brandName?: string
  readonly logoUrl?: string
  readonly consoleTitle: string
  readonly navigationLabel: string
  readonly navigationActionLabel: string
  readonly openNavigationLabel: string
  readonly closeNavigationLabel: string
  readonly closeActionLabel: string
  readonly expandNavigationLabel: string
  readonly collapseNavigationLabel: string
  readonly locateCurrentLabel: string
  readonly fullscreenLabel: string
  readonly exitFullscreenLabel: string
  readonly fullscreenUnavailableLabel: string
  readonly fullscreenFailedLabel: string
  readonly freeNavigationModeLabel: string
  readonly accordionNavigationModeLabel: string
  readonly switchToLightLabel: string
  readonly switchToDarkLabel: string
  readonly colorModeChangeFailedLabel: string
}

export type UiAdminNavigationExpansionUpdate =
  | { readonly expandedGroupIds: readonly string[]; readonly intent: 'group' }
  | {
      readonly expandedGroupIds: readonly string[]
      readonly intent: 'mode'
      readonly accordion: boolean
    }

export interface UiWorkspaceTab {
  readonly id: string
  readonly label: string
  readonly closeLabel: string
  readonly closable: boolean
  readonly refreshable: boolean
}
