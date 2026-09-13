import type * as ScssAnalysis from './scss-fallback-analysis'
import type {
  parseStyleValue as ParseStyleValueContract,
  normalizeStyleValue as NormalizeStyleValueContract,
  normalizeStyleProperty as NormalizeStylePropertyContract,
  numericLexemeEquals as NumericLexemeEqualsContract,
  structuralColorKeywords as StructuralColorKeywordsContract,
  hasRawDesignBearingValue as HasRawDesignBearingValueContract,
  isPreferredTextScaleIdentity as IsPreferredTextScaleIdentityContract,
} from '../eslint-rules/style-authority'
import type {
  generatedStyleOwners as GeneratedStyleOwnersContract,
  scssFallbackOwners as ScssFallbackOwnersContract,
  styleCompilerSupport as StyleCompilerSupportContract,
  vueStyleOwners as VueStyleOwnersContract,
  standaloneStyleOwners as StandaloneStyleOwnersContract,
  ownedStyleContracts as OwnedStyleContractsContract,
  keyframeOwners as KeyframeOwnersContract,
  styleAtRuleOwners as StyleAtRuleOwnersContract,
  privateStyleVariables as PrivateStyleVariablesContract,
  unresolvedStyleInputs as UnresolvedStyleInputsContract,
  ScssAtRuleOwner,
  StyleDeclarationIdentity,
  StyleResponsibility,
  ScssFallbackOwner,
  StyleCompilerSupport,
} from './style-owner-contracts'
import { createRequire } from 'node:module'
import type { StyleDeclarationGroup } from './style-debt-baseline'

// Native Node loads these .ts governance modules; type-only imports retain the
// canonical signatures without changing the repository TypeScript configuration.
const requireFromStyleOwnership = createRequire(import.meta.url)
const { createScssFallbackAnalysis, validateScssFallbackOutputContract: inspectCompiledScss } =
  requireFromStyleOwnership('./scss-fallback-analysis.ts') as typeof ScssAnalysis
const {
  parseStyleValue: parseValue,
  normalizeStyleValue,
  normalizeStyleProperty,
  numericLexemeEquals,
  structuralColorKeywords,
  hasRawDesignBearingValue,
  isPreferredTextScaleIdentity,
} = requireFromStyleOwnership('../eslint-rules/style-authority.ts') as {
  readonly parseStyleValue: typeof ParseStyleValueContract
  readonly normalizeStyleValue: typeof NormalizeStyleValueContract
  readonly normalizeStyleProperty: typeof NormalizeStylePropertyContract
  readonly numericLexemeEquals: typeof NumericLexemeEqualsContract
  readonly structuralColorKeywords: typeof StructuralColorKeywordsContract
  readonly hasRawDesignBearingValue: typeof HasRawDesignBearingValueContract
  readonly isPreferredTextScaleIdentity: typeof IsPreferredTextScaleIdentityContract
}
const {
  generatedStyleOwners,
  scssFallbackOwners,
  styleCompilerSupport,
  vueStyleOwners,
  standaloneStyleOwners,
  ownedStyleContracts,
  keyframeOwners,
  styleAtRuleOwners,
  privateStyleVariables,
  unresolvedStyleInputs,
} = requireFromStyleOwnership('./style-owner-contracts.ts') as {
  readonly generatedStyleOwners: typeof GeneratedStyleOwnersContract
  readonly scssFallbackOwners: typeof ScssFallbackOwnersContract
  readonly styleCompilerSupport: typeof StyleCompilerSupportContract
  readonly vueStyleOwners: typeof VueStyleOwnersContract
  readonly standaloneStyleOwners: typeof StandaloneStyleOwnersContract
  readonly ownedStyleContracts: typeof OwnedStyleContractsContract
  readonly keyframeOwners: typeof KeyframeOwnersContract
  readonly styleAtRuleOwners: typeof StyleAtRuleOwnersContract
  readonly privateStyleVariables: typeof PrivateStyleVariablesContract
  readonly unresolvedStyleInputs: typeof UnresolvedStyleInputsContract
}

export type {
  StyleDeclarationIdentity,
  StyleResponsibility,
  ScssFallbackOwner,
  StyleCompilerSupport,
} from './style-owner-contracts'
export { generatedStyleOwners, scssFallbackOwners }
export {
  normalizeStyleValue,
  normalizeStyleProperty,
  numericLexemeEquals,
  structuralColorKeywords,
  hasRawDesignBearingValue,
  isPreferredTextScaleIdentity,
}
const { ordinaryStyleDebt } = requireFromStyleOwnership('./style-debt-baseline.ts') as {
  readonly ordinaryStyleDebt: readonly StyleDeclarationGroup[]
}
const requireFromStylelint = createRequire(requireFromStyleOwnership.resolve('stylelint'))
interface SelectorNode {
  readonly type: string
  readonly value?: string
  readonly namespace?: string | true
  readonly attribute?: string
  readonly operator?: string
  readonly insensitive?: boolean
  readonly raws?: { readonly insensitiveFlag?: string }
  readonly nodes?: readonly SelectorNode[]
}
const selectorParser = requireFromStylelint('postcss-selector-parser') as () => {
  readonly astSync: (value: string) => SelectorNode
}

// Semantic fields decode escapes; formatting/raw spelling is deliberately absent.
// Only the outer selector list is unordered; nested pseudo syntax remains intact.
function normalizeStyleSelector(value: string): string {
  const identity = (node: SelectorNode): unknown => [
    node.type,
    node.type === 'combinator'
      ? node.value?.trim() === ''
        ? ' '
        : node.value?.trim()
      : node.value,
    node.namespace,
    node.attribute,
    node.operator,
    node.type === 'attribute'
      ? node.insensitive
        ? 'i'
        : (node.raws?.insensitiveFlag?.toLowerCase() ?? '')
      : undefined,
    node.nodes?.filter((child) => child.type !== 'comment').map(identity),
  ]
  return JSON.stringify(
    (selectorParser().astSync(value).nodes ?? [])
      .map((node) => JSON.stringify(identity(node)))
      .sort(),
  )
}

function atRuleKey(
  path: string,
  block: number,
  context: readonly string[],
  name: string,
  params: string,
): string {
  return JSON.stringify([
    path,
    block,
    normalizeStyleContext(context),
    name.toLowerCase(),
    normalizeStyleValue(params),
  ])
}
export function hasStyleAtRuleOwner(
  path: string,
  block: number,
  context: readonly string[],
  name: string,
  params: string,
  occurrence = 1,
): boolean {
  const key = atRuleKey(path, block, context, name, params)
  return (builtInAtRules.get(key) ?? 0) + (fallbackAtRules.get(key) ?? 0) >= occurrence
}
export function hasScssFallbackAtRuleOwner(
  path: string,
  block: number,
  context: readonly string[],
  name: string,
  params: string,
  occurrence = 1,
): boolean {
  const key = atRuleKey(path, block, context, name, params)
  const builtIn = builtInAtRules.get(key) ?? 0
  return occurrence > builtIn && occurrence <= builtIn + (fallbackAtRules.get(key) ?? 0)
}

export function normalizeStyleContext(context: readonly string[]): readonly string[] {
  return context.map((entry) => {
    const atRule = /^@([^\s]+)(?:\s+([\s\S]*))?$/u.exec(entry.trim())
    if (atRule === null) return normalizeStyleValue(entry)
    const name = (atRule[1] ?? '').toLowerCase()
    const params = normalizeStyleValue(atRule[2] ?? '')
    return `@${name}${params === '' ? '' : ` ${params}`}`
  })
}

function normalizedContext(context: readonly string[]): readonly string[] {
  return normalizeStyleContext(context)
}

function scopeKey(
  group: Pick<StyleDeclarationIdentity, 'path' | 'block' | 'context' | 'selector'>,
): string {
  return JSON.stringify([
    group.path,
    group.block,
    normalizedContext(group.context),
    normalizeStyleSelector(group.selector),
  ])
}

export function styleDeclarationKey(declaration: StyleDeclarationIdentity): string {
  return JSON.stringify([
    declaration.path,
    declaration.block,
    normalizedContext(declaration.context),
    normalizeStyleSelector(declaration.selector),
    normalizeStyleProperty(declaration.property),
    normalizeStyleValue(declaration.value),
    declaration.important,
  ])
}

// Registration-derived indexes are constructed once and never mutated after initialization.
function declarationIndex(groups: readonly StyleDeclarationGroup[]): ReadonlyMap<string, number> {
  const index = new Map<string, number>()
  for (const group of groups)
    for (const [property, value, important] of group.declarations) {
      const key = styleDeclarationKey({ ...group, property, value, important })
      index.set(key, (index.get(key) ?? 0) + 1)
    }
  return index
}
const debtDeclarations = declarationIndex(ordinaryStyleDebt)
const ownedDeclarations = declarationIndex(ownedStyleContracts)
const fallbackDeclarations = declarationIndex(
  scssFallbackOwners.flatMap((owner) => owner.contracts),
)
const ownedResponsibilities: ReadonlyMap<string, StyleResponsibility> = new Map(
  ownedStyleContracts.flatMap((group) =>
    group.declarations.map(
      ([property, value, important]) =>
        [
          styleDeclarationKey({ ...group, property, value, important }),
          group.responsibility,
        ] as const,
    ),
  ),
)
const allGroups = [
  ...ordinaryStyleDebt,
  ...ownedStyleContracts,
  ...scssFallbackOwners.flatMap((owner) => owner.contracts),
]
const ruleScopes: ReadonlySet<string> = new Set(allGroups.map(scopeKey))
function atRuleIndex(
  owners: readonly (ScssAtRuleOwner & {
    readonly path: string
    readonly block: number
    readonly occurrences?: number
  })[],
): ReadonlyMap<string, number> {
  const index = new Map<string, number>()
  for (const owner of owners) {
    const key = atRuleKey(owner.path, owner.block, owner.context, owner.name, owner.params)
    index.set(key, (index.get(key) ?? 0) + (owner.occurrences ?? 1))
  }
  return index
}
const builtInAtRules = atRuleIndex(styleAtRuleOwners)
const fallbackAtRules = atRuleIndex(
  scssFallbackOwners.flatMap((owner) =>
    owner.atRules.map((rule) => ({ ...rule, path: owner.path, block: owner.block })),
  ),
)
function keyframeKey(
  path: string,
  block: number,
  context: readonly string[],
  name: string,
): string {
  return JSON.stringify([path, block, normalizedContext(context), name])
}
const keyframes: ReadonlyMap<string, number> = (() => {
  const index = new Map<string, number>()
  for (const owner of [
    ...keyframeOwners,
    ...scssFallbackOwners.flatMap((owner) =>
      owner.keyframes.map((frame) => ({ ...frame, path: owner.path, block: owner.block })),
    ),
  ]) {
    if (owner.family.trim() === '') continue
    const key = keyframeKey(owner.path, owner.block, owner.context, owner.name)
    index.set(key, (index.get(key) ?? 0) + 1)
  }
  return index
})()
const privateVariables: ReadonlyMap<string, (typeof privateStyleVariables)[number]> = new Map(
  privateStyleVariables.map((entry) => [entry.name, entry]),
)
const unresolvedInputs: ReadonlySet<string> = new Set(
  unresolvedStyleInputs.map((entry) => entry.name),
)
const privateConsumers: ReadonlySet<string> = (() => {
  const index = new Set<string>()
  for (const group of allGroups)
    for (const [property, value] of group.declarations) {
      parseValue(value).walk((node) => {
        if (node.type !== 'function' || node.value.toLowerCase() !== 'var') return
        const input = node.nodes?.find(
          (child) => child.type !== 'space' && child.type !== 'comment',
        )
        if (input?.type === 'word')
          index.add(
            JSON.stringify([scopeKey(group), normalizeStyleProperty(property), input.value]),
          )
      })
    }
  return index
})()

export function styleDeclarationResponsibility(
  declaration: StyleDeclarationIdentity,
  occurrence = 1,
): StyleResponsibility | undefined {
  const key = styleDeclarationKey(declaration)
  if ((debtDeclarations.get(key) ?? 0) >= occurrence) return 'ORDINARY_STYLE_DEBT'
  if ((fallbackDeclarations.get(key) ?? 0) >= occurrence) return 'LEGITIMATE_SCSS_FALLBACK'
  return (ownedDeclarations.get(key) ?? 0) >= occurrence
    ? ownedResponsibilities.get(key)
    : undefined
}
export function hasExactOwnedStyleDeclaration(
  declaration: StyleDeclarationIdentity,
  occurrence = 1,
): boolean {
  return (ownedDeclarations.get(styleDeclarationKey(declaration)) ?? 0) >= occurrence
}
export function hasStyleRuleOwner(
  path: string,
  block: number,
  context: readonly string[],
  selector: string,
): boolean {
  return ruleScopes.has(scopeKey({ path, block, context, selector }))
}
export function hasKeyframeOwner(
  path: string,
  block: number,
  context: readonly string[],
  name: string,
  occurrence = 1,
): boolean {
  return (keyframes.get(keyframeKey(path, block, context, name)) ?? 0) >= occurrence
}

export function styleCompilerAdmission(
  manifestPath: string,
  dependency: string,
  support: readonly StyleCompilerSupport[] = styleCompilerSupport,
  owners: readonly ScssFallbackOwner[] = scssFallbackOwners,
): boolean {
  return support.some(
    (compiler) =>
      compiler.manifestPath === manifestPath &&
      compiler.dependency === dependency &&
      owners.some(
        (owner) =>
          owner.manifestPath === manifestPath &&
          owner.compiler === dependency &&
          compiler.languages.includes(owner.lang) &&
          owner.contracts.length > 0 &&
          owner.atRules.every(
            (atRule) =>
              atRule.name.trim() !== '' && !atRule.name.toLowerCase().endsWith('keyframes'),
          ) &&
          owner.keyframes.every(
            (keyframe) => keyframe.name.trim() !== '' && keyframe.family.trim() !== '',
          ) &&
          owner.contracts.every(
            (contract) => contract.path === owner.path && contract.block === owner.block,
          ),
      ),
  )
}

export function styleSourceAdmission(
  source: {
    readonly path: string
    readonly block: number
    readonly lang: string
    readonly scoped: boolean
    readonly module?: string | boolean
    readonly src?: string
    readonly content?: string
  },
  support: readonly StyleCompilerSupport[] = styleCompilerSupport,
  owners: readonly ScssFallbackOwner[] = scssFallbackOwners,
): readonly string[] {
  if (source.module !== undefined || source.src !== undefined)
    return ['External/module styles have no admitted owner.']
  if (source.lang === 'css') {
    if (!source.path.endsWith('.vue')) {
      return standaloneStyleOwners[source.path] === undefined
        ? ['Standalone CSS has no exact owner.']
        : []
    }
    return vueStyleOwners[source.path]?.[source.block]?.scoped === source.scoped
      ? []
      : ['Style block has no exact owner; ordinary UI must use semantic UnoCSS.']
  }
  if (source.lang !== 'scss' && source.lang !== 'sass') return ['Unsupported style syntax.']
  const matchingOwners = owners.filter(
    (entry) =>
      entry.path === source.path &&
      entry.block === source.block &&
      entry.lang === source.lang &&
      entry.scoped === source.scoped,
  )
  const owner = matchingOwners[0]
  if (
    matchingOwners.length !== 1 ||
    owner === undefined ||
    !styleCompilerAdmission(owner.manifestPath, owner.compiler, support, [owner])
  )
    return [
      'SCSS/Sass requires an exact LEGITIMATE_SCSS_FALLBACK owner and explicit compiler support.',
    ]
  if (source.content === undefined)
    return ['SCSS/Sass source authority must be inspected before compilation.']
  return createScssFallbackAnalysis(privateInputs).inspectSource(source.content, owner)
}

export function privateStyleVariableValueKind(name: string): 'color' | 'dimension' | undefined {
  return unresolvedInputs.has(name) ? undefined : privateVariables.get(name)?.valueKind
}
export function privateStyleVariableAllowed(
  declaration: StyleDeclarationIdentity,
  name: string,
  write: boolean,
): boolean {
  if (unresolvedInputs.has(name)) return false
  const variable = privateVariables.get(name)
  if (variable === undefined) return false
  if (write)
    return (
      variable.writer === declaration.path &&
      (hasExactOwnedStyleDeclaration(declaration) ||
        (fallbackDeclarations.get(styleDeclarationKey(declaration)) ?? 0) > 0)
    )
  return privateConsumers.has(
    JSON.stringify([scopeKey(declaration), normalizeStyleProperty(declaration.property), name]),
  )
}
const privateInputs = {
  has: (name: string) => privateVariables.has(name),
  kind: privateStyleVariableValueKind,
}
export function scssFallbackAtRuleViolations(name: string, params: string): readonly string[] {
  return createScssFallbackAnalysis(privateInputs).atRuleViolations(name, params)
}
export function validateScssFallbackOutputContract(
  owner: ScssFallbackOwner,
  compiledCss: string,
): string[] {
  return inspectCompiledScss(owner, compiledCss, {
    declaration: styleDeclarationKey,
    atRule: (context, name, params) =>
      JSON.stringify([
        normalizeStyleContext(context),
        name.toLowerCase(),
        normalizeStyleValue(params),
      ]),
  })
}
