import { computed } from 'vue'
import { useAppearanceReadBoundary } from '../../appearance/appearance-read-boundary'

export function useDashboardActionTheme() {
  const { snapshot } = useAppearanceReadBoundary()
  return computed(() => {
    const { primary } = snapshot.value.colorPalette.roles
    return {
      colorQuaternaryHover: primary.soft.background.hover,
      colorQuaternaryPressed: primary.soft.background.pressed,
    }
  })
}
