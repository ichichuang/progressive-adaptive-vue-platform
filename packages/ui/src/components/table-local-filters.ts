import type { UiTableLocalFilter, UiTableReadonlyRecord } from './table-contracts'
import { isUiDateOnly } from '../date-time/date-time'
import { getFormValue } from '../composables/form-draft-values'

function parameterValue(filters: Readonly<Record<string, unknown>>, parameter: string) {
  // Match the existing local filter support for both flat dotted keys and grouped form values.
  return Object.hasOwn(filters, parameter) ? filters[parameter] : getFormValue(filters, parameter)
}

/** Validate applied values before publishing query state or starting list work. */
export function invalidLocalFilters(
  filters: Readonly<Record<string, unknown>>,
  definitions: readonly UiTableLocalFilter[],
): readonly UiTableLocalFilter[] {
  const invalid: UiTableLocalFilter[] = []
  for (const definition of definitions) {
    const value = parameterValue(filters, definition.parameter)
    if (value === undefined || value === null) continue
    let valid = false
    switch (definition.kind) {
      case 'number-range': {
        if (typeof value !== 'object' || Array.isArray(value)) break
        const bounds = value as UiTableReadonlyRecord
        const { min, max } = bounds
        const bound = (item: unknown) =>
          item === null || (typeof item === 'number' && Number.isFinite(item))
        valid =
          Object.keys(bounds).every((key) => key === 'min' || key === 'max') &&
          bound(min) &&
          bound(max) &&
          (min === null ||
            max === null ||
            (typeof min === 'number' && typeof max === 'number' && min <= max))
        break
      }
      case 'date-range':
        valid =
          Array.isArray(value) &&
          value.length === 2 &&
          value.every((item) => typeof item === 'string' && isUiDateOnly(item)) &&
          typeof value[0] === 'string' &&
          typeof value[1] === 'string' &&
          value[0] <= value[1]
        break
      case 'empty':
        valid = value === 'empty' || value === 'not-empty'
        break
      case 'text':
        valid = typeof value === 'string'
        break
    }
    if (!valid) invalid.push(definition)
  }
  return invalid
}
export function validateLocalFilters(
  filters: Readonly<Record<string, unknown>>,
  definitions: readonly UiTableLocalFilter[],
): void {
  const invalid = invalidLocalFilters(filters, definitions)[0]
  if (invalid) throw new TypeError(`Invalid local filter: ${invalid.parameter}`)
}

/** Fuzzy is ordered subsequence matching, not spelling correction or relevance ranking. */
function textMatches(cell: string, query: string, fuzzy: boolean): boolean {
  const value = cell.toLocaleLowerCase()
  const search = query.toLocaleLowerCase()
  if (!fuzzy) return value.includes(search)
  let offset = 0
  for (const character of search) {
    const index = value.indexOf(character, offset)
    if (index < 0) return false
    offset = index + character.length
  }
  return true
}
export function matchesLocalFilters(
  row: UiTableReadonlyRecord,
  filters: Readonly<Record<string, unknown>>,
  definitions: readonly UiTableLocalFilter[],
): boolean {
  return definitions.every((definition) => {
    const value = parameterValue(filters, definition.parameter)
    if (value === undefined || value === null) return true
    const cell = getFormValue(row, definition.field)
    switch (definition.kind) {
      case 'number-range': {
        const { min, max } = value as UiTableReadonlyRecord
        if (min === null && max === null) return true
        return (
          typeof cell === 'number' &&
          Number.isFinite(cell) &&
          (min === null || (typeof min === 'number' && cell >= min)) &&
          (max === null || (typeof max === 'number' && cell <= max))
        )
      }
      case 'date-range': {
        const range = value as readonly string[]
        return (
          typeof cell === 'string' &&
          isUiDateOnly(cell) &&
          cell >= (range[0] ?? '') &&
          cell <= (range[1] ?? '')
        )
      }
      case 'empty': {
        const empty = cell === undefined || cell === null || cell === ''
        return value === 'empty' ? empty : !empty
      }
      case 'text':
        return (
          value === '' ||
          (typeof cell === 'string' &&
            typeof value === 'string' &&
            textMatches(cell, value, definition.match === 'fuzzy'))
        )
    }
  })
}
