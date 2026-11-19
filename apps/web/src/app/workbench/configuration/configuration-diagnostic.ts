import { UiConfigurationError } from '@platform/ui'
import type { ConsoleMessageKey, ConsoleTranslate } from '../../../shared/i18n'

const reasonMessages = {
  value: 'configurationAssist.invalidValue',
  object: 'configurationAssist.expectedObject',
  property: 'configurationAssist.unknownProperty',
  choice: 'configurationAssist.expectedChoice',
  text: 'configurationAssist.expectedText',
  fields: 'configurationAssist.expectedFields',
  columns: 'configurationAssist.expectedColumns',
  fieldName: 'configurationAssist.fieldName',
  fieldValue: 'configurationAssist.fieldValue',
  stepField: 'configurationAssist.stepField',
  columnKey: 'configurationAssist.columnKey',
  option: 'configurationAssist.optionValues',
  bounds: 'configurationAssist.bounds',
  reference: 'configurationAssist.reference',
} as const satisfies Record<UiConfigurationError['reason'], ConsoleMessageKey>

export function formatConfigurationList(values: readonly string[], locale: string): string {
  return new Intl.ListFormat(locale, { type: 'conjunction', style: 'narrow' }).format(values)
}

export function configurationDiagnosticText(
  cause: unknown,
  t: ConsoleTranslate,
  locale: string,
): string {
  if (cause instanceof SyntaxError) {
    const message = cause.message
    const reason = /property name|property string/iu.test(message)
      ? t('configurationAssist.jsonProperty')
      : /unexpected end|end of (?:data|input|string)/iu.test(message)
        ? t('configurationAssist.jsonIncomplete')
        : t('configurationAssist.jsonSyntax')
    // Engines expose positions in different formats and sometimes omit them entirely.
    const [, line, column] =
      /\bline (\d+) column (\d+)\)?(?: of the JSON data)?$/iu.exec(message) ?? []
    if (line && column)
      return `${reason} ${t('configurationAssist.line')} ${line} · ${t('configurationAssist.column')} ${column}`
    const offset = /\bposition (\d+)$/iu.exec(message)?.[1]
    return offset ? `${reason} ${t('configurationAssist.offset')} ${offset}` : reason
  }
  if (cause instanceof UiConfigurationError) {
    if (cause.reason === 'value' && locale === 'en') return cause.message
    const detail = t(reasonMessages[cause.reason])
    const prefix = cause.location ? `${cause.location} · ` : ''
    const values = cause.values.length ? ` · ${formatConfigurationList(cause.values, locale)}` : ''
    return `${prefix}${detail}${values}`
  }
  return t('configurationAssist.invalidValue')
}
