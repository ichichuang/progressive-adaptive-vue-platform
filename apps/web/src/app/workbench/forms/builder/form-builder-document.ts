import { z } from 'zod'
import { formDraftSignature } from '../../../forms/form-draft-signature'
import { invalidBuilderDateInput, parseBuilderNumberInput } from './builder-input-values'
import {
  parseUiFormSchema,
  richTextTools,
  type UiFormSchema,
  type UiFormNode,
  type UiFormCondition,
} from '@platform/ui'

export class UnsupportedBuilderSchema extends TypeError {}

/** The core parser owns the schema. This checks only this visual editor's narrower capabilities. */
export function parseBuilderSchema(value: unknown): UiFormSchema {
  const schema = parseUiFormSchema(value)
  const entries: { node: UiFormNode; group: string; declaration: string }[] = []
  function inspect(nodes: readonly UiFormNode[], group = ''): void {
    for (const node of nodes) {
      if (
        !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.name) ||
        !node.label.trim() ||
        node.kind === 'custom'
      )
        throw new UnsupportedBuilderSchema(
          'This schema requires controls not supported by the visual editor.',
        )
      const declaration = group ? `${group}.${node.name}` : node.name
      entries.push({ node, group, declaration })
      if (
        node.kind === 'select' ||
        node.kind === 'radio' ||
        node.kind === 'multi-select' ||
        node.kind === 'checkbox-group'
      ) {
        if (!Array.isArray(node.options))
          throw new UnsupportedBuilderSchema('Remote options require a registered source editor.')
        const options = node.options
        const defaults = Array.isArray(node.defaultValue)
          ? node.defaultValue
          : node.defaultValue === undefined || node.defaultValue === null
            ? []
            : [node.defaultValue]
        if (
          defaults.some(
            (value) =>
              !options.some(
                (option: { value: string | number; disabled?: boolean }) =>
                  option.value === value && !option.disabled,
              ),
          )
        )
          throw new TypeError('Selection defaults must match an enabled option.')
      }
      if (node.kind === 'group' || node.kind === 'repeat')
        inspect(node.fields, node.kind === 'repeat' ? `${declaration}.*` : declaration)
    }
  }
  inspect(schema.fields)
  for (const entry of entries) {
    const node = entry.node
    for (const flag of [
      node.hidden,
      node.disabled,
      node.readonly,
      ...('required' in node ? [node.required] : []),
    ]) {
      if (typeof flag !== 'object') continue
      const inspectCondition = (flag: UiFormCondition): void => {
        if ('all' in flag) {
          flag.all.forEach(inspectCondition)
          return
        }
        if ('any' in flag) {
          flag.any.forEach(inspectCondition)
          return
        }
        if ('not' in flag) {
          inspectCondition(flag.not)
          return
        }
        if (flag.operator === 'in')
          throw new UnsupportedBuilderSchema('This condition requires a more capable editor.')
        const target = entries.find(
          (candidate) =>
            candidate !== entry &&
            (flag.scope === 'group'
              ? entry.group.length > 0 &&
                candidate.group === entry.group &&
                candidate.node.name === flag.field
              : !candidate.declaration.includes('*') && candidate.declaration === flag.field),
        )?.node
        if (
          !target ||
          target.kind === 'group' ||
          target.kind === 'repeat' ||
          target.kind === 'custom'
        )
          throw new UnsupportedBuilderSchema(
            'This reference is not supported by the visual editor.',
          )
        if (flag.operator === 'eq' || flag.operator === 'neq') {
          const value = flag.value
          if (
            target.kind === 'multi-select' ||
            target.kind === 'checkbox-group' ||
            target.kind === 'date-range' ||
            target.kind === 'attachment' ||
            ((target.kind === 'text' || target.kind === 'textarea' || target.kind === 'mask') &&
              typeof value !== 'string') ||
            (['number', 'slider', 'rating'].includes(target.kind) &&
              value !== null &&
              typeof value !== 'number') ||
            (target.kind === 'date' &&
              value !== null &&
              (typeof value !== 'string' || value === '' || invalidBuilderDateInput(value))) ||
            (target.kind === 'time' &&
              value !== null &&
              (typeof value !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/u.test(value))) ||
            (target.kind === 'switch' && typeof value !== 'boolean') ||
            ((target.kind === 'select' || target.kind === 'radio') &&
              value !== null &&
              typeof value !== 'string' &&
              typeof value !== 'number')
          )
            throw new UnsupportedBuilderSchema(
              'This comparison cannot be edited without changing its type.',
            )
        }
      }
      inspectCondition(flag)
    }
  }
  return schema
}

const bufferSchema = z.strictObject({
  key: z.string().min(1),
  raw: z.string(),
  invalid: z.boolean(),
})
// The editor may temporarily contain invalid names, duplicate options and inverted ranges.
// Validate its private state structurally without mistaking it for an accepted core schema.
const editorNodeSchema = z.strictObject({
  kind: z.enum([
    'text',
    'textarea',
    'rich-text',
    'number',
    'mask',
    'slider',
    'rating',
    'attachment',
    'switch',
    'date',
    'date-range',
    'time',
    'radio',
    'checkbox-group',
    'select',
    'multi-select',
    'group',
    'repeat',
  ]),
  name: z.string(),
  label: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  span: z.union([z.literal(1), z.literal(2)]).optional(),
  hidden: z.json().optional(),
  disabled: z.json().optional(),
  readonly: z.json().optional(),
  required: z.json().optional(),
  defaultValue: z.json().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  mask: z.string().optional(),
  tools: z.array(z.enum(richTextTools)).optional(),
  count: z.number().optional(),
  allowHalf: z.boolean().optional(),
  source: z.string().optional(),
  accept: z.string().optional(),
  maxFiles: z.number().optional(),
  maxSize: z.number().optional(),
  minItems: z.number().optional(),
  maxItems: z.number().optional(),
  addLabel: z.string().optional(),
  itemLabel: z.string().optional(),
  options: z
    .array(
      z.strictObject({
        value: z.union([z.string(), z.number()]),
        label: z.string(),
        disabled: z.boolean().optional(),
      }),
    )
    .optional(),
  rules: z
    .strictObject({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().optional(),
      maxLength: z.number().optional(),
      format: z.literal('email').optional(),
      message: z.string().optional(),
    })
    .optional(),
  fields: z.array(z.json()).optional(),
})
const snapshotSchema = z.strictObject({
  schema: z.unknown(),
  selected: z.array(z.string()),
  editor: editorNodeSchema.nullable(),
  inputs: z.array(bufferSchema),
  optionIds: z.array(z.number().int().positive()),
  composing: z.boolean(),
})

export interface BuilderSnapshot {
  readonly schema: UiFormSchema
  readonly selected: readonly string[]
  readonly editor: UiFormNode | null
  readonly inputs: readonly {
    readonly key: string
    readonly raw: string
    readonly invalid: boolean
  }[]
  readonly optionIds: readonly number[]
  readonly composing: boolean
}

export function parseBuilderSnapshot(value: unknown): BuilderSnapshot {
  const snapshot = snapshotSchema.parse(value)
  const schema = parseBuilderSchema(snapshot.schema)
  let selectedNode: UiFormNode | undefined
  let nodes = schema.fields
  for (const part of snapshot.selected) {
    selectedNode = nodes.find((node) => node.name === part)
    if (!selectedNode) throw new TypeError('The selected editor node no longer exists.')
    nodes =
      selectedNode.kind === 'group' || selectedNode.kind === 'repeat' ? selectedNode.fields : []
  }
  const editor = snapshot.editor
  if (
    (editor === null) !== (selectedNode === undefined) ||
    (editor && editor.kind !== selectedNode?.kind)
  )
    throw new TypeError('The editor draft does not match its selected node.')
  if (
    new Set(snapshot.inputs.map((input) => input.key)).size !== snapshot.inputs.length ||
    new Set(snapshot.optionIds).size !== snapshot.optionIds.length
  )
    throw new TypeError('Duplicate editor input identities.')
  if (editor) {
    if (!selectedNode) throw new TypeError('The selected editor node is missing.')
    // Only accepted child structure/conditions may be persisted. Those are never edited as raw JSON.
    for (const property of ['fields', 'hidden', 'disabled', 'readonly', 'required'] as const) {
      const current =
        property in selectedNode
          ? (selectedNode as unknown as Record<string, unknown>)[property]
          : undefined
      if (formDraftSignature(editor[property]) !== formDraftSignature(current)) {
        // Conditions can be changed while another editor field is invalid. Validate them against
        // the canonical node, rather than accidentally committing the rest of the editor draft.
        const safe = { ...selectedNode, [property]: editor[property] }
        parseBuilderSchema({
          ...schema,
          fields: replaceNode(schema.fields, snapshot.selected, safe),
        })
      }
    }
    if ((editor.kind === 'group' || editor.kind === 'repeat') && !editor.fields)
      throw new TypeError('A container editor requires children.')
    if (
      (editor.kind === 'select' ||
        editor.kind === 'radio' ||
        editor.kind === 'multi-select' ||
        editor.kind === 'checkbox-group') &&
      editor.options?.length !== snapshot.optionIds.length
    )
      throw new TypeError('Option editor identities are inconsistent.')
    const fallback = selectedNode
    if (
      editor.kind === 'attachment' &&
      formDraftSignature(editor.defaultValue) !==
        formDraftSignature(fallback.kind === 'attachment' ? fallback.defaultValue : undefined)
    )
      throw new TypeError('Attachment references are not edited by the visual inspector.')
    const value = editor.defaultValue
    if (
      value !== undefined &&
      (((editor.kind === 'text' || editor.kind === 'textarea' || editor.kind === 'mask') &&
        typeof value !== 'string') ||
        (['number', 'slider', 'rating'].includes(editor.kind) &&
          value !== null &&
          typeof value !== 'number') ||
        ((editor.kind === 'date' || editor.kind === 'time') &&
          value !== null &&
          typeof value !== 'string') ||
        (editor.kind === 'date-range' &&
          value !== null &&
          (!Array.isArray(value) ||
            value.length !== 2 ||
            value.some((item) => typeof item !== 'string'))) ||
        (editor.kind === 'switch' && typeof value !== 'boolean') ||
        ((editor.kind === 'select' || editor.kind === 'radio') &&
          value !== null &&
          typeof value !== 'number' &&
          typeof value !== 'string') ||
        ((editor.kind === 'multi-select' || editor.kind === 'checkbox-group') &&
          (!Array.isArray(value) ||
            value.some((item) => typeof item !== 'string' && typeof item !== 'number'))))
    )
      throw new TypeError('Invalid editor default value.')
    if (
      'fields' in fallback &&
      formDraftSignature(editor.fields) !== formDraftSignature(fallback.fields)
    )
      throw new TypeError('Child edits must use the canonical builder structure.')
  }
  for (const input of snapshot.inputs) {
    if (!editor) throw new TypeError('An input buffer requires a selected editor.')
    let kind: 'number' | 'date' | undefined
    let required = false
    let integer = false
    let displayed: unknown = undefined
    if (
      input.key === 'defaultValue' &&
      (['number', 'slider', 'rating'].includes(editor.kind) || editor.kind === 'date')
    ) {
      kind = editor.kind === 'date' ? 'date' : 'number'
      displayed = editor.defaultValue
    }
    if (
      ['minimum', 'maximum', 'step', 'ruleMin', 'ruleMax'].includes(input.key) &&
      (editor.kind === 'number' || editor.kind === 'slider')
    ) {
      kind = 'number'
      displayed =
        input.key === 'minimum'
          ? editor.min
          : input.key === 'maximum'
            ? editor.max
            : input.key === 'step'
              ? editor.step
              : input.key === 'ruleMin'
                ? editor.rules?.min
                : editor.rules?.max
    }
    if (
      (['minLength', 'maxLength'].includes(input.key) &&
        [
          'text',
          'textarea',
          'rich-text',
          'mask',
          'attachment',
          'multi-select',
          'checkbox-group',
        ].includes(editor.kind)) ||
      (['minItems', 'maxItems'].includes(input.key) && editor.kind === 'repeat')
    ) {
      kind = 'number'
      integer = true
      displayed =
        input.key === 'minItems'
          ? editor.minItems
          : input.key === 'maxItems'
            ? editor.maxItems
            : input.key === 'minLength'
              ? editor.rules?.minLength
              : editor.rules?.maxLength
    }
    if (input.key.startsWith('option-')) {
      const index = snapshot.optionIds.findIndex((id) => input.key === `option-${String(id)}`)
      if (index >= 0 && typeof editor.options?.[index]?.value === 'number') {
        kind = 'number'
        required = true
        displayed = editor.options[index].value
      }
    }
    if (
      /^(required|hidden|disabled|readonly)(\/(all|any)\/(0|[1-9][0-9]*)|\/not)*$/u.test(input.key)
    ) {
      const [root, ...segments] = input.key.split('/')
      let flag = editor[root as 'hidden']
      while (segments.length && flag && typeof flag === 'object' && !Array.isArray(flag)) {
        const branch = segments.shift()
        if (branch === 'not' && 'not' in flag) flag = flag['not']
        else if (
          (branch === 'all' || branch === 'any') &&
          branch in flag &&
          Array.isArray(flag[branch])
        ) {
          flag = flag[branch][Number(segments.shift())]
        } else {
          flag = undefined
          break
        }
      }
      if (segments.length) flag = undefined
      if (
        flag &&
        typeof flag === 'object' &&
        !Array.isArray(flag) &&
        'field' in flag &&
        typeof flag['field'] === 'string' &&
        (flag['operator'] === 'eq' || flag['operator'] === 'neq')
      ) {
        const path =
          flag['scope'] === 'group'
            ? [...snapshot.selected.slice(0, -1), ...flag['field'].split('.')]
            : flag['field'].split('.')
        let fields = schema.fields
        let target: UiFormNode | undefined
        for (const part of path) {
          target = fields.find((node) => node.name === part)
          fields = target?.kind === 'group' || target?.kind === 'repeat' ? target.fields : []
        }
        if (
          target?.kind === 'number' ||
          target?.kind === 'slider' ||
          target?.kind === 'rating' ||
          target?.kind === 'date'
        ) {
          kind = target.kind === 'date' ? 'date' : 'number'
          displayed = flag['value']
        }
      }
    }
    if (!kind) throw new TypeError('An input buffer has no matching editor control.')
    const invalid =
      kind === 'date'
        ? invalidBuilderDateInput(input.raw)
        : parseBuilderNumberInput(input.raw, integer, required).invalid
    if (invalid !== input.invalid)
      throw new TypeError('The input buffer validation state is inconsistent.')
    const parsed =
      kind === 'date'
        ? input.raw || null
        : parseBuilderNumberInput(input.raw, integer, required).value
    if (!invalid && parsed !== (displayed ?? null))
      throw new TypeError('The input buffer does not match its editor value.')
  }
  return { ...snapshot, schema, editor: editor as UiFormNode | null }
}
function replaceNode(
  nodes: readonly UiFormNode[],
  path: readonly string[],
  replacement: UiFormNode,
): readonly UiFormNode[] {
  return nodes.map((node) =>
    node.name !== path[0]
      ? node
      : path.length === 1
        ? replacement
        : node.kind === 'group' || node.kind === 'repeat'
          ? { ...node, fields: replaceNode(node.fields, path.slice(1), replacement) }
          : node,
  )
}
