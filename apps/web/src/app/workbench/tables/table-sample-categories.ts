import type { ConsoleMessageKey } from '../../../shared/i18n'

export const tableSampleCategoryTags = [
  { value: 'Design', label: 'tableShowcase.categoryDesign', tone: 'primary' },
  { value: 'Engineering', label: 'tableShowcase.categoryEngineering', tone: 'success' },
  { value: 'Research', label: 'tableShowcase.categoryResearch', tone: 'info' },
] as const satisfies readonly { value: string; label: ConsoleMessageKey; tone: string }[]

export const tableSampleCategoryOptions = tableSampleCategoryTags.map(({ value, label }) => ({
  value,
  label,
}))

export function tableSampleCategoryText(
  value: string,
  translate: (key: ConsoleMessageKey) => string,
) {
  const category = tableSampleCategoryOptions.find((option) => option.value === value)
  return category ? translate(category.label) : value
}
