export interface UiAdminNavigationItem {
  readonly iconClass: string
  readonly label: string
  readonly routeName: string
  readonly isCurrentDestination: boolean
}

export interface UiAdminNavigationGroup {
  readonly id: string
  readonly label: string
  readonly items: readonly UiAdminNavigationItem[]
}

export interface UiDescriptionItem {
  readonly label: string
  readonly value: string
}

export interface UiSegmentedOption {
  readonly label: string
  readonly value: string
}

export type UiStatusTone = 'active' | 'complete' | 'deferred' | 'inactive' | 'not-started'

export type UiLocale = 'zh-CN' | 'en'
export interface UiAdminShellCopy {
  readonly consoleTitle: string
  readonly navigationLabel: string
  readonly navigationActionLabel: string
  readonly openNavigationLabel: string
  readonly closeNavigationLabel: string
  readonly closeActionLabel: string
  readonly expandNavigationLabel: string
  readonly collapseNavigationLabel: string
  readonly expandAllMenusLabel: string
  readonly collapseAllMenusLabel: string
}

export interface UiAdminNavigationExpansionUpdate {
  readonly expandedGroupIds: readonly string[]
  readonly intent: 'group' | 'all'
}

export interface UiWorkspaceTab {
  readonly id: string
  readonly label: string
  readonly closeLabel: string
  readonly closable: boolean
}
