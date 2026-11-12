import { computed, reactive, ref, shallowRef } from 'vue'
import {
  parseBuilderSchema,
  parseBuilderSnapshot,
  UnsupportedBuilderSchema,
  type BuilderSnapshot,
} from './form-builder-document'
import {
  parseUiFormSchema,
  type UiFormCondition,
  type UiFormNode,
  type UiFormSchema,
} from '@platform/ui'
import { formDraftSignature } from '../../../forms/form-draft-signature'
import type { ConsoleTranslate } from '../../../../shared/i18n'

export const builderKinds = {
  text: 'formBuilder.text',
  textarea: 'formBuilder.textarea',
  number: 'formBuilder.number',
  switch: 'formBuilder.switch',
  date: 'formBuilder.date',
  'date-range': 'formBuilder.dateRange',
  time: 'formBuilder.time',
  radio: 'formBuilder.radio',
  'checkbox-group': 'formBuilder.checkboxGroup',
  select: 'formBuilder.select',
  'multi-select': 'formBuilder.multiSelect',
  group: 'formBuilder.group',
  repeat: 'formBuilder.repeat',
} as const
export type BuilderKind = keyof typeof builderKinds
type Mutable<T> = T extends readonly [infer A, infer B]
  ? [Mutable<A>, Mutable<B>]
  : T extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
      : T
export type BuilderEditableNode = Mutable<UiFormNode>
export interface BuilderInputState {
  readonly raw: string | null
  readonly invalid: boolean
  update(raw: string, invalid: boolean): void
  clear(): void
}
export interface BuilderReference {
  readonly field: string
  readonly scope: 'form' | 'group'
  readonly label: string
  readonly node: UiFormNode
}
export interface BuilderEntry {
  readonly path: readonly string[]
  readonly declaration: string
  readonly group: string
  readonly node: UiFormNode
}

export function builderEntries(schema: UiFormSchema): readonly BuilderEntry[] {
  const entries: BuilderEntry[] = []
  function visit(nodes: readonly UiFormNode[], parent: readonly string[], group: string): void {
    for (const node of nodes) {
      const path = [...parent, node.name]
      const declaration = group ? `${group}.${node.name}` : node.name
      entries.push({ path, declaration, group, node })
      if (node.kind === 'group' || node.kind === 'repeat')
        visit(node.fields, path, node.kind === 'repeat' ? `${declaration}.*` : declaration)
    }
  }
  visit(schema.fields, [], '')
  return entries
}
export function builderNode(schema: UiFormSchema, path: readonly string[]): UiFormNode | undefined {
  let nodes = schema.fields
  for (let index = 0; index < path.length; index += 1) {
    const node = nodes.find((candidate) => candidate.name === path[index])
    if (index === path.length - 1) return node
    if (node?.kind !== 'group' && node?.kind !== 'repeat') return undefined
    nodes = node.fields
  }
  return undefined
}
function builderReferences(
  schema: UiFormSchema,
  path: readonly string[],
): readonly BuilderReference[] {
  const entries = builderEntries(schema)
  const target = entries.find((entry) => entry.path.join('.') === path.join('.'))
  if (!target) return []
  return entries.flatMap((entry): BuilderReference[] => {
    if (
      entry === target ||
      entry.node.kind === 'group' ||
      entry.node.kind === 'repeat' ||
      entry.node.kind === 'custom'
    )
      return []
    if (entry.group === target.group && entry.group)
      return [
        {
          field: entry.node.name,
          scope: 'group' as const,
          label: entry.node.label,
          node: entry.node,
        },
      ]
    if (!entry.declaration.includes('*'))
      return [
        {
          field: entry.declaration,
          scope: 'form' as const,
          label: entry.node.label,
          node: entry.node,
        },
      ]
    return []
  })
}
function conditionReferences(
  condition: UiFormCondition,
): readonly { field: string; scope?: 'form' | 'group' }[] {
  if ('all' in condition) return condition.all.flatMap(conditionReferences)
  if ('any' in condition) return condition.any.flatMap(conditionReferences)
  if ('not' in condition) return conditionReferences(condition.not)
  return [condition]
}
function referencedBy(
  schema: UiFormSchema,
  path: readonly string[],
  removing: boolean,
): readonly string[] {
  const entries = builderEntries(schema)
  const target = entries.find((entry) => entry.path.join('.') === path.join('.'))
  if (!target) return []
  const isWithin = (declaration: string) =>
    declaration === target.declaration || declaration.startsWith(`${target.declaration}.`)
  return entries.flatMap((entry) => {
    if (removing && isWithin(entry.declaration)) return []
    const flags = [
      entry.node.hidden,
      entry.node.disabled,
      entry.node.readonly,
      ...('required' in entry.node ? [entry.node.required] : []),
    ]
    const usesTarget = flags.some(
      (flag) =>
        typeof flag === 'object' &&
        conditionReferences(flag).some((reference) => {
          const resolved =
            reference.scope === 'group' && entry.group
              ? `${entry.group}.${reference.field}`
              : reference.field
          return isWithin(resolved)
        }),
    )
    return usesTarget ? [entry.node.label || entry.path.join('.')] : []
  })
}
function changeChildren(
  nodes: readonly UiFormNode[],
  parent: readonly string[],
  change: (children: readonly UiFormNode[]) => readonly UiFormNode[],
): readonly UiFormNode[] {
  const head = parent[0]
  if (head === undefined) return change(nodes)
  return nodes.map((node) =>
    node.name === head && (node.kind === 'group' || node.kind === 'repeat')
      ? { ...node, fields: changeChildren(node.fields, parent.slice(1), change) }
      : node,
  )
}

/** Page-owned configuration edits. The package parser remains the schema authority. */
export function useFormBuilder(t: ConsoleTranslate) {
  const schema = shallowRef<UiFormSchema>(parseUiFormSchema({ columns: 1, fields: [] }))
  const selected = ref<readonly string[]>([])
  const draft = shallowRef<BuilderEditableNode | null>(null)
  const issue = ref('')
  const inputs = reactive(new Map<string, BuilderInputState>())
  const composing = ref(false)
  const restoredComposition = ref(false)
  const future = shallowRef<readonly BuilderSnapshot[]>([])
  let restoring = false
  const incomplete = computed(
    () =>
      composing.value ||
      restoredComposition.value ||
      [...inputs.values()].some((input) => input.invalid),
  )
  const notice = computed(() =>
    restoredComposition.value
      ? t('formBuilder.compositionNotSaved')
      : incomplete.value
        ? t('formBuilder.incompleteNumber')
        : issue.value,
  )
  const optionIds = ref<number[]>([])
  let nextOptionId = 0
  function inputState(key: string): BuilderInputState {
    const existing = inputs.get(key)
    if (existing) return existing
    const state = reactive({ raw: null as string | null, invalid: false })
    const input: BuilderInputState = {
      get raw() {
        return state.raw
      },
      get invalid() {
        return state.invalid
      },
      update(raw, invalid) {
        if (!restoring) {
          future.value = []
          restoredComposition.value = false
        }
        state.raw = raw
        state.invalid = invalid
      },
      clear() {
        state.raw = null
        state.invalid = false
      },
    }
    inputs.set(key, input)
    return inputs.get(key) ?? input
  }
  function addOptionIdentity(): void {
    optionIds.value.push(++nextOptionId)
  }
  function removeOptionIdentity(index: number): void {
    inputState(`option-${String(optionIds.value[index])}`).clear()
    optionIds.value.splice(index, 1)
  }
  function setComposing(value: boolean): void {
    composing.value = value
    restoredComposition.value = false
    if (!incomplete.value && draft.value) acceptEdit(draft.value)
  }
  function clearConditionInputs(path: string, remap?: (key: string) => string | null): boolean {
    if (incomplete.value) return false
    const saved = [...inputs.entries()].flatMap(([key, input]) =>
      (key === path || key.startsWith(`${path}/`)) && input.raw !== null
        ? [{ key, raw: input.raw, invalid: input.invalid }]
        : [],
    )
    for (const item of saved) inputState(item.key).clear()
    for (const item of saved) {
      const next = remap?.(item.key)
      if (next) inputState(next).update(item.raw, item.invalid)
    }
    return true
  }
  const editor = {
    incomplete,
    clearConditionInputs,
    inputState,
    optionIds,
    addOptionIdentity,
    removeOptionIdentity,
    setComposing,
  }
  const past = shallowRef<readonly BuilderSnapshot[]>([])
  const selectedNode = computed(() => builderNode(schema.value, selected.value))
  const editorRevision = ref(0)
  let editing = false
  function finishEdit(): void {
    editing = false
  }
  function loadDraft(): void {
    inputs.clear()
    composing.value = false
    restoredComposition.value = false
    draft.value = selectedNode.value
      ? (JSON.parse(JSON.stringify(selectedNode.value)) as BuilderEditableNode)
      : null
    const options = selectedNode.value
    optionIds.value =
      (options?.kind === 'select' ||
        options?.kind === 'radio' ||
        options?.kind === 'multi-select' ||
        options?.kind === 'checkbox-group') &&
      Array.isArray(options.options)
        ? options.options.map(() => ++nextOptionId)
        : []
    editorRevision.value += 1
    finishEdit()
  }
  const pending = computed(
    () =>
      incomplete.value ||
      (draft.value !== null &&
        formDraftSignature(draft.value) !== formDraftSignature(selectedNode.value)),
  )
  const entries = computed(() => builderEntries(schema.value))
  const references = computed(() => builderReferences(schema.value, selected.value))
  const json = computed(() => JSON.stringify(schema.value, null, 2))
  const canUndo = computed(() => past.value.length > 0 || pending.value)
  const canRedo = computed(() => future.value.length > 0)
  function snapshot(): BuilderSnapshot {
    return JSON.parse(
      JSON.stringify({
        schema: schema.value,
        selected: selected.value,
        editor: draft.value,
        inputs: [...inputs.entries()].flatMap(([key, input]) =>
          input.raw === null ? [] : [{ key, raw: input.raw, invalid: input.invalid }],
        ),
        optionIds: optionIds.value,
        composing: composing.value || restoredComposition.value,
      }),
    ) as BuilderSnapshot
  }
  function acceptedSnapshot(): BuilderSnapshot {
    const node = selectedNode.value
    return {
      schema: schema.value,
      selected: selected.value,
      editor: node ?? null,
      inputs: [],
      optionIds:
        node &&
        (node.kind === 'select' ||
          node.kind === 'radio' ||
          node.kind === 'multi-select' ||
          node.kind === 'checkbox-group') &&
        Array.isArray(node.options)
          ? node.options.map((_, index) => index + 1)
          : [],
      composing: false,
    }
  }
  function restoreSnapshot(value: unknown): boolean {
    let state: BuilderSnapshot
    try {
      state = parseBuilderSnapshot(value)
    } catch {
      return false
    }
    restoring = true
    schema.value = state.schema
    selected.value = [...state.selected]
    loadDraft()
    draft.value = state.editor
      ? (JSON.parse(JSON.stringify(state.editor)) as BuilderEditableNode)
      : null
    optionIds.value = [...state.optionIds]
    nextOptionId = Math.max(nextOptionId, ...state.optionIds)
    for (const input of state.inputs) inputState(input.key).update(input.raw, input.invalid)
    restoredComposition.value = state.composing
    restoring = false
    issue.value = pending.value ? t('formBuilder.restoredPending') : ''
    return true
  }
  function restoreDraft(value: unknown): boolean {
    const before = snapshot()
    if (!restoreSnapshot(value)) return false
    past.value = [...past.value.slice(-39), before]
    future.value = []
    return true
  }
  function importJson(raw: string): boolean {
    try {
      const candidate = parseBuilderSchema(JSON.parse(raw))
      const before = snapshot()
      const history = past.value
      if (!commit(candidate, candidate.fields[0] ? [candidate.fields[0].name] : [])) return false
      // Import replaces the whole editor intentionally and remains undoable, including raw text.
      past.value = [...history.slice(-39), before]
      future.value = []
      return true
    } catch (error: unknown) {
      issue.value = t(
        error instanceof UnsupportedBuilderSchema
          ? 'formBuilder.importUnsupported'
          : 'formBuilder.importInvalid',
      )
      if (error instanceof Error) issue.value += ` ${error.message}`
      return false
    }
  }

  function commit(candidate: UiFormSchema, selection: readonly string[], live = false): boolean {
    try {
      const accepted = parseUiFormSchema(candidate)
      for (const { node } of builderEntries(accepted)) {
        if (
          (node.kind !== 'select' &&
            node.kind !== 'radio' &&
            node.kind !== 'multi-select' &&
            node.kind !== 'checkbox-group') ||
          !Array.isArray(node.options)
        )
          continue
        const options = node.options
        const value = node.defaultValue
        const defaults = Array.isArray(value)
          ? value
          : value === undefined || value === null
            ? []
            : [value]
        if (
          defaults.some(
            (selected) =>
              !options.some(
                (option: { value: string | number; disabled?: boolean }) =>
                  option.value === selected && !option.disabled,
              ),
          )
        ) {
          issue.value = t('formBuilder.defaultOptionMissing')
          return false
        }
      }
      if (formDraftSignature(accepted) !== formDraftSignature(schema.value)) {
        if (!live || !editing) past.value = [...past.value.slice(-39), acceptedSnapshot()]
        future.value = []
        if (live) editing = true
        schema.value = accepted
      }
      selected.value = selection
      if (!live) loadDraft()
      issue.value = ''
      return true
    } catch {
      issue.value = t('formBuilder.invalidSchema')
      return false
    }
  }
  function choose(path: readonly string[]): void {
    if (pending.value) return
    if (selected.value.join('.') === path.join('.')) return
    selected.value = path
    loadDraft()
    issue.value = ''
  }
  function add(kind: BuilderKind, parent?: readonly string[]): void {
    if (pending.value) return
    const target =
      parent ??
      (selectedNode.value?.kind === 'group' || selectedNode.value?.kind === 'repeat'
        ? selected.value
        : selected.value.slice(0, -1))
    const container = builderNode(schema.value, target)
    const siblings =
      target.length === 0
        ? schema.value.fields
        : container?.kind === 'group' || container?.kind === 'repeat'
          ? container.fields
          : []
    const prefix = kind.replaceAll('-', '_')
    let suffix = 1
    while (siblings.some((node) => node.name === `${prefix}${String(suffix)}`)) suffix += 1
    const base = { name: `${prefix}${String(suffix)}`, label: t(builderKinds[kind]) }
    const node: UiFormNode =
      kind === 'group' || kind === 'repeat'
        ? { ...base, kind, fields: [], ...(kind === 'repeat' ? { minItems: 1 } : {}) }
        : kind === 'select' ||
            kind === 'multi-select' ||
            kind === 'radio' ||
            kind === 'checkbox-group'
          ? {
              ...base,
              kind,
              options: [
                { value: 'option1', label: `${t('formBuilder.option')} 1` },
                { value: 'option2', label: `${t('formBuilder.option')} 2` },
              ],
            }
          : { ...base, kind }
    commit(
      {
        ...schema.value,
        fields: changeChildren(schema.value.fields, target, (nodes) => [...nodes, node]),
      },
      [...target, node.name],
    )
  }
  function acceptEdit(node: UiFormNode): boolean {
    const path = selected.value
    const current = selectedNode.value
    if (!current) return false
    if (
      !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(node.name) ||
      ['__proto__', 'prototype', 'constructor'].includes(node.name)
    ) {
      issue.value = t('formBuilder.invalidName')
      return false
    }
    if (node.name !== current.name) {
      const users = referencedBy(schema.value, path, false)
      if (users.length) {
        issue.value = `${t('formBuilder.referenced')} ${users.join('、')}`
        return false
      }
    }
    const parent = path.slice(0, -1)
    const container = builderNode(schema.value, parent)
    const siblings =
      parent.length === 0
        ? schema.value.fields
        : container?.kind === 'group' || container?.kind === 'repeat'
          ? container.fields
          : []
    if (siblings.some((sibling) => sibling.name === node.name && sibling.name !== current.name)) {
      issue.value = t('formBuilder.duplicateName')
      return false
    }
    if (!node.label.trim()) {
      issue.value = t('formBuilder.labelRequired')
      return false
    }
    return commit(
      {
        ...schema.value,
        fields: changeChildren(schema.value.fields, parent, (nodes) =>
          nodes.map((candidate) => (candidate.name === current.name ? node : candidate)),
        ),
      },
      [...parent, node.name],
      true,
    )
  }
  function remove(): void {
    if (pending.value || !selectedNode.value) return
    const users = referencedBy(schema.value, selected.value, true)
    if (users.length) {
      issue.value = `${t('formBuilder.referenced')} ${users.join('、')}`
      return
    }
    const name = selected.value.at(-1)
    const parent = selected.value.slice(0, -1)
    commit(
      {
        ...schema.value,
        fields: changeChildren(schema.value.fields, parent, (nodes) =>
          nodes.filter((node) => node.name !== name),
        ),
      },
      parent,
    )
  }
  function move(path: readonly string[], offset: number): void {
    if (pending.value) return
    const parent = path.slice(0, -1)
    const name = path.at(-1)
    commit(
      {
        ...schema.value,
        fields: changeChildren(schema.value.fields, parent, (nodes) => {
          const index = nodes.findIndex((node) => node.name === name)
          const destination = index + offset
          if (index < 0 || destination < 0 || destination >= nodes.length) return nodes
          const moved = [...nodes]
          const node = moved.splice(index, 1)[0]
          if (node) moved.splice(destination, 0, node)
          return moved
        }),
      },
      path,
    )
  }
  function reorder(from: readonly string[], to: readonly string[]): void {
    if (pending.value || from.slice(0, -1).join('.') !== to.slice(0, -1).join('.')) {
      issue.value = t('formBuilder.sameLevel')
      return
    }
    const parent = from.slice(0, -1)
    const container = builderNode(schema.value, parent)
    const siblings =
      parent.length === 0
        ? schema.value.fields
        : container?.kind === 'group' || container?.kind === 'repeat'
          ? container.fields
          : []
    const start = siblings.findIndex((node) => node.name === from.at(-1))
    const end = siblings.findIndex((node) => node.name === to.at(-1))
    if (start >= 0 && end >= 0) move(from, end - start)
  }
  function undo(): void {
    if (pending.value) {
      future.value = [...future.value.slice(-39), snapshot()]
      loadDraft()
      issue.value = ''
      return
    }
    const previous = past.value.at(-1)
    if (!previous) return
    const current = snapshot()
    if (!restoreSnapshot(previous)) return
    future.value = [...future.value.slice(-39), current]
    past.value = past.value.slice(0, -1)
  }
  function redo(): void {
    const next = future.value.at(-1)
    if (!next) return
    const current = snapshot()
    if (!restoreSnapshot(next)) return
    if (!pending.value) past.value = [...past.value.slice(-39), current]
    future.value = future.value.slice(0, -1)
  }
  function columns(value: 1 | 2): void {
    if (!pending.value) commit({ ...schema.value, columns: value }, selected.value)
  }
  function edit(node: BuilderEditableNode): void {
    // Keep the editor's object and mounted inputs intact, including invalid intermediates.
    future.value = []
    if (!composing.value) restoredComposition.value = false
    draft.value = node
    if (!incomplete.value) acceptEdit(node)
  }
  return {
    schema,
    selected,
    selectedNode,
    draft,
    edit,
    editor,
    finishEdit,
    editorRevision,
    entries,
    references,
    pending,
    hasActiveComposition: computed(() => composing.value),
    notice,
    json,
    canUndo,
    canRedo,
    snapshot,
    restoreDraft,
    importJson,
    choose,
    add,
    remove,
    move,
    reorder,
    undo,
    redo,
    columns,
  }
}
