import { generatedThemeRegistry } from '../generated/theme-registry'
import type { AppearanceRegion } from '../schema/color-style.schema'
import { colorStyleRecipes } from './color-style-recipes'
import { resolvedThemePlane } from './theme-registry'
import { projectUiAppearance, type UiAppearanceSnapshot } from './ui-appearance-projection'

/** Always resolve against the root snapshot, not the surrounding region. */
export function projectRegionAppearance(
  root: Readonly<UiAppearanceSnapshot>,
  region: AppearanceRegion,
) {
  const recipe = colorStyleRecipes[root.colorStyle][root.colorMode][region]
  const defaultRecipe = colorStyleRecipes.unified[root.colorMode][region]
  const isCustomized =
    recipe.colorMode !== defaultRecipe.colorMode || recipe.surface !== defaultRecipe.surface
  const appearance = projectUiAppearance({ ...root, colorMode: recipe.colorMode }, root.themeEntry)
  const plane = resolvedThemePlane(root.themeEntry.definition, recipe.colorMode, root.contrast)
  const cssVariables = Object.fromEntries(
    generatedThemeRegistry.activePublicColorRoles.map(({ publicRole, publicBinding }) => [
      publicBinding,
      plane[publicRole] ?? '',
    ]),
  )
  const palette = appearance.colorPalette
  const surface =
    recipe.surface === 'solid'
      ? {
          background: palette.roles.primary.solid.background.default,
          foreground: palette.roles.primary.solid.foreground,
        }
      : recipe.surface === 'tinted'
        ? {
            background: palette.roles.primary.soft.background.default,
            foreground: palette.roles.primary.soft.foreground,
          }
        : { background: palette.surfaces[recipe.surface], foreground: palette.text.primary }
  return Object.freeze({
    isCustomized,
    appearance,
    cssVariables: Object.freeze(cssVariables),
    surface: Object.freeze(surface),
  })
}
