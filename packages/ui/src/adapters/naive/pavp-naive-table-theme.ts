import { tokens, type UiAppearanceSnapshot } from '@platform/design-system'
import type { GlobalThemeOverrides } from 'naive-ui'
import type { UiTableAppearance } from '../../components/table-contracts'

/** UiTable's local presentation projection; the provider remains the palette authority. */
export function createPavpNaiveTableThemeProjection(
  appearance: Readonly<UiAppearanceSnapshot>,
  headerTone: NonNullable<UiTableAppearance['headerTone']>,
): NonNullable<GlobalThemeOverrides['DataTable']> {
  const { roles, surfaces, text, borders } = appearance.colorPalette
  const primary = roles.primary
  const neutral = roles.neutral
  const header =
    headerTone === 'neutral'
      ? {
          background: {
            default: surfaces.sunken,
            hover: surfaces.surface,
            pressed: surfaces.sunken,
          },
          foreground: text.primary,
        }
      : primary[headerTone]
  // Reading states share the neutral soft hue and its validated foreground pair.
  // Sorting is a faint tint, not a pressed or selected state.
  const mix = (base: string, tint: string, percentage: number): string =>
    `color-mix(in srgb, ${base}, ${tint} ${String(percentage)}%)`
  const striped = mix(surfaces.surface, neutral.soft.background.default, 90)
  const sorting = mix(surfaces.surface, neutral.soft.background.default, 20)
  const headerSorting = mix(header.background.default, header.background.pressed, 20)
  const borderColor = appearance.contrast === 'enhanced' ? borders.control : borders.decorative
  // Naive also uses thPadding in calc(), so keep each padding a single length.
  const padding = (steps: number) => `calc(${tokens['spacing.component.unit']} * ${String(steps)})`
  return {
    borderColor,
    borderColorModal: borderColor,
    borderColorPopover: borderColor,
    borderRadius: tokens['interaction.radius.panel'],
    fontSizeSmall: tokens['typography.size.body'],
    fontSizeMedium: tokens['typography.size.body'],
    fontSizeLarge: tokens['typography.size.body'],
    lineHeight: tokens['typography.line-height.body'],
    thFontWeight: tokens['typography.weight.title'],
    thPaddingSmall: padding(2),
    tdPaddingSmall: padding(2),
    thPaddingMedium: padding(3),
    tdPaddingMedium: padding(3),
    thPaddingLarge: padding(4),
    tdPaddingLarge: padding(4),
    thColor: header.background.default,
    thColorModal: header.background.default,
    thColorPopover: header.background.default,
    thColorHover: header.background.hover,
    thColorHoverModal: header.background.hover,
    thColorHoverPopover: header.background.hover,
    thColorSorting: headerSorting,
    thColorSortingModal: headerSorting,
    thColorSortingPopover: headerSorting,
    thTextColor: header.foreground,
    sorterSize: tokens['interaction.icon.size.large'],
    thIconColor: header.foreground,
    thIconColorActive: headerTone === 'solid' ? header.foreground : primary.foreground.default,
    thButtonColorHover: header.background.hover,
    // Keep the body foreground stable across all reading states.
    tdTextColor: neutral.foreground.default,
    tdColorHover: neutral.soft.background.hover,
    tdColorHoverModal: neutral.soft.background.hover,
    tdColorHoverPopover: neutral.soft.background.hover,
    tdColorSorting: sorting,
    tdColorSortingModal: sorting,
    tdColorSortingPopover: sorting,
    tdColorStriped: striped,
    tdColorStripedModal: striped,
    tdColorStripedPopover: striped,
  }
}
