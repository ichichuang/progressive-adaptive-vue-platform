import { z } from 'zod'
import type { UiFormSchema, UiFormValue } from '@platform/ui'
import { parseBuilderSnapshot, type BuilderSnapshot } from './form-builder-document'
import { formDraftSignature } from '../../../forms/form-draft-signature'

/** Trial values belong to the same persisted record as their exact accepted configuration. */
export interface BuilderDraft extends BuilderSnapshot {
  readonly trial?: Record<string, UiFormValue>
}
export interface BuilderTrialState {
  readonly schema: UiFormSchema
  readonly values: Record<string, UiFormValue>
  readonly pending: boolean
  readonly revision: number
}

export function parseBuilderDraft(value: unknown): BuilderDraft {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new TypeError('A builder draft requires an object.')
  if (['__proto__', 'prototype', 'constructor'].some((key) => Object.hasOwn(value, key)))
    throw new TypeError('A builder draft contains a reserved object key.')
  const { trial, ...configuration } = value as Record<string, unknown>
  const snapshot = parseBuilderSnapshot(configuration)
  // Existing configuration-only records remain readable. No separate trial storage owner exists.
  if (trial === undefined) return snapshot
  const values = z.record(z.string(), z.json()).parse(trial)
  // JSON parsers may drop unsafe object keys. Reject altered input instead of silently adopting it.
  if (formDraftSignature(values) !== formDraftSignature(trial))
    throw new TypeError('The saved trial contains unsupported object keys.')
  return { ...snapshot, trial: values }
}
