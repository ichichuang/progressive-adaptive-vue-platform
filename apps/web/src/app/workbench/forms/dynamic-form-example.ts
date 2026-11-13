import { z } from 'zod'
import type { UiFormSchema } from '@platform/ui'

const sharedFields = [
  { kind: 'text', name: 'name', label: 'configuredForm.name', required: true },
  { kind: 'text', name: 'email', label: 'configuredForm.email', rules: { format: 'email' } },
  { kind: 'number', name: 'capacity', label: 'configuredForm.capacity' },
  {
    kind: 'repeat',
    name: 'contacts',
    label: 'configuredForm.contacts',
    fields: [{ kind: 'text', name: 'email', label: 'configuredForm.email' }],
  },
] as const

export const dynamicFormPresets = {
  simple: {
    columns: 2,
    fields: sharedFields,
    steps: [
      { name: 'identity', label: 'formCapabilities.steps.identity', fields: ['name', 'email'] },
      {
        name: 'details',
        label: 'formCapabilities.steps.details',
        fields: ['capacity', 'contacts'],
      },
    ],
  },
  detailed: {
    columns: 2,
    fields: [
      ...sharedFields,
      { kind: 'textarea', name: 'notes', label: 'formShowcase.notes', span: 2 },
    ],
    steps: [
      {
        name: 'details',
        label: 'formCapabilities.steps.details',
        fields: ['capacity', 'contacts'],
      },
      { name: 'identity', label: 'formCapabilities.steps.identity', fields: ['name', 'email'] },
      { name: 'notes', label: 'formShowcase.notes', fields: ['notes'] },
    ],
  },
} as const satisfies Record<string, UiFormSchema>

export type DynamicFormPreset = keyof typeof dynamicFormPresets
// This example persists only its two known configurations and non-sensitive sample fields.
// Backend-supplied configuration itself is not automatically persisted by the form component.
const draftSchema = z
  .strictObject({
    preset: z.enum(['simple', 'detailed']),
    values: z.strictObject({
      name: z.string(),
      email: z.string(),
      capacity: z.number().nullable(),
      contacts: z.array(z.strictObject({ email: z.string() })),
      notes: z.string().optional(),
    }),
    step: z.string(),
  })
  .superRefine((value, context) => {
    if ((value.preset === 'detailed') !== Object.hasOwn(value.values, 'notes'))
      context.addIssue({
        code: 'custom',
        path: ['values'],
        message: 'Values do not match the selected configuration.',
      })
    if (!dynamicFormPresets[value.preset].steps.some((step) => step.name === value.step))
      context.addIssue({ code: 'custom', path: ['step'], message: 'Unknown form step.' })
  })
export type DynamicFormExampleDraft = z.infer<typeof draftSchema>
export function parseDynamicFormExampleDraft(value: unknown): DynamicFormExampleDraft {
  return draftSchema.parse(value)
}
