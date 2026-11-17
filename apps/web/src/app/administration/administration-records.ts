import { z } from 'zod'

const text = z.string().max(2048)
const recordIdentifier = z.string().min(1).max(256)
const policyDifferences = z
  .array(z.strictObject({ id: recordIdentifier, label: text, before: text, after: text }))
  .max(100)
  .refine((rows) => new Set(rows.map(({ id }) => id)).size === rows.length)
export const parsePolicyDifferences = (value: unknown) => policyDifferences.safeParse(value).data

const administrationRecordSchema = z.strictObject({
  id: recordIdentifier,
  revision: recordIdentifier,
  label: text,
  status: text,
  source: text,
  detail: text,
  model: recordIdentifier,
  editable: z.boolean(),
  scopeLabel: text.optional(),
  capability: text.optional(),
  directEffect: z.enum(['allow', 'deny', 'unset']).optional(),
  effective: z.enum(['allow', 'deny', 'unresolved']).optional(),
  activeRevision: recordIdentifier.optional(),
  draftState: z.enum(['unsaved', 'saved', 'published', 'effective']).optional(),
  baselineSummary: text.optional(),
  draftSummary: text.optional(),
  occurredAt: text.optional(),
  operatorLabel: text.optional(),
  representedLabel: text.optional(),
  resourceLabel: text.optional(),
  operationLabel: text.optional(),
  correlation: text.optional(),
  reason: text.optional(),
  differences: policyDifferences.optional(),
})

export type AdministrationRecord = z.output<typeof administrationRecordSchema>

export const administrationPageSchema = z.strictObject({
  rows: z.array(
    administrationRecordSchema.transform((row) => ({
      ...row,
      scopeLabel: row.scopeLabel ?? null,
      capability: row.capability ?? null,
      directEffect: row.directEffect ?? null,
      effective: row.effective ?? null,
      activeRevision: row.activeRevision ?? null,
      draftState: row.draftState ?? null,
      baselineSummary: row.baselineSummary ?? null,
      draftSummary: row.draftSummary ?? null,
      occurredAt: row.occurredAt ?? null,
      operatorLabel: row.operatorLabel ?? null,
      representedLabel: row.representedLabel ?? null,
      resourceLabel: row.resourceLabel ?? null,
      operationLabel: row.operationLabel ?? null,
      correlation: row.correlation ?? null,
      reason: row.reason ?? null,
      differences: row.differences ?? null,
    })),
  ),
  total: z.number().int().nonnegative(),
})
