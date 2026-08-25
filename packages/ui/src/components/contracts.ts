export interface UiAdminNavigationItem {
  readonly iconClass: string
  readonly label: string
  readonly routeName: string
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
