# Progressive Adaptive Vue Platform

## 全新个人超级前端架构

```text
STATUS=CANONICAL_ARCHITECTURE_BASELINE
PROJECT_MODEL=GREENFIELD
IMPLEMENTATION_STATE=IN_PROGRESS
ARCHITECTURE_FOUNDATION_GATE=PAVP_ARCHITECTURE_FOUNDATION_FREEZE
ARCHITECTURE_FOUNDATION_GATE_STATUS=FROZEN
ARCHITECTURE_TARGET_CONTRACT_STATUS=FROZEN_INACTIVE
IMPLEMENTATION_BEFORE_ARCHITECTURE_FOUNDATION_GATE_FROZEN=PROHIBITED
MAINTENANCE_MODEL=SOLO_MAIN_BRANCH
ARCHITECTURE_AUTHORITY=ARCHITECTURE.md
AI_ENTRY=AGENTS.md
AI_ENTRY_ROLE=MISSION_AND_EXECUTION_ROUTER
AI_ENTRY_ARCHITECTURE_AUTHORITY=NONE
AI_ENTRY_CANONICAL_SOURCE=ARCHITECTURE.md
AI_ENTRY_CURRENT_WORK_PACKAGE_SOURCE=canonical current-work-package status in ARCHITECTURE.md
PROJECT_AUTHORITY_PORTABILITY=REPOSITORY_ONLY
MACHINE_LOCAL_PROJECT_AUTHORITY=NONE
MACHINE_LOCAL_PROJECT_DEPENDENCY=PROHIBITED
ABSOLUTE_HOME_PATH_DEPENDENCY=PROHIBITED
EXTERNAL_OPERATOR_CAPABILITIES=NON_AUTHORITATIVE
PROJECT_UI_WORKFLOW=.ai/skills/pavp-ui/SKILL.md
PROJECT_UI_WORKFLOW_ROLE=SUBORDINATE_EXECUTION_WORKFLOW
PROJECT_UI_WORKFLOW_ARCHITECTURE_AUTHORITY=NONE
PROJECT_UI_WORKFLOW_CANONICAL_SOURCE=ARCHITECTURE.md
PROJECT_UI_WORKFLOW_CONFLICT_ACTION=STOP
PROJECT_UI_WORKFLOW_DISCOVERY=EXPLICIT_REPOSITORY_ROUTING
NATIVE_CLIENT_DISCOVERY=OPTIONAL_NOT_REQUIRED
UI_DIRECTION=ADAPTIVE_LIQUID_CHROME_OVER_STABLE_CONTENT
TEST_POLICY=NO_TEST_FILES
ACTIVE_PUBLIC_COLOR_ROLES=9
ACTIVE_PUBLIC_ROLES_TOTAL=27
ACTIVE_PREFERENCE_AUTHORITY=THEME_REGISTRY_REFERENCE
TARGET_THEME_DEFINITION_CONTRACT=EXPLICIT_COMPLETE_THEME
TARGET_PREFERENCE_AUTHORITY=THEME_REGISTRY_REFERENCE
TARGET_PREFERENCE_STATUS=ACTIVE
TARGET_PREFERENCE_ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
PREFERENCE_CUTOVER=ATOMIC
PHASE_1_PACKAGE_1_STATUS=COMPLETE
PHASE_1_PACKAGE_2_STATUS=COMPLETE
PHASE_1_PACKAGE_3_STATUS=COMPLETE
PHASE_1_PACKAGE_3A_STATUS=COMPLETE
PHASE_1_PACKAGE_4_STATUS=COMPLETE
PHASE_1_PACKAGE_5_STATUS=COMPLETE
PHASE_1_PACKAGE_6_STATUS=COMPLETE
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION=COMPLETE
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT=FROZEN
PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT=FROZEN
VUE_ROUTER_TYPE_COMPATIBILITY_STRATEGY=EXACT_VERSION_PNPM_DECLARATION_PATCH
PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION=COMPLETE
ROUTER_CAPABILITY_STATUS=ACTIVE
ROUTER_PRODUCTION_RUNTIME_ACCEPTANCE=PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
CURRENT_RUNTIME_KERNEL_STEP_COUNT=10
PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=NEXT
NEXT_CANONICAL_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
PHASE_1_PINIA_ADMISSION=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER_ONLY
PHASE_1_PINIA_ADMISSION_STATUS=ACTIVE
PHASE_1_PINIA_SCOPE=APPEARANCE_PREFERENCE_AND_THEME_REGISTRY_ORCHESTRATION_ONLY
PHASE_1_ROUTER_ADMISSION=PROHIBITED
PHASE_1_TANSTACK_QUERY_ADMISSION=PROHIBITED
PHASE_1_OPENAPI_GENERATOR_ADMISSION=PROHIBITED
CODEX_BROWSER_OPERATION=PROHIBITED
CODEX_VERIFICATION_MODEL=STATIC_PRODUCTION_GATES_ONLY
OWNER_MANUAL_RUNTIME_INSPECTION_FOR_CODEX_TASKS=OPTIONAL_EXTERNAL_NON_GATING
OWNER_PRODUCTION_RELEASE_RUNTIME_ACCEPTANCE=REQUIRED_EXTERNAL_NON_REPOSITORY
SUBORDINATE_OPTIONAL_OBSERVATION_SCOPE=CODEX_TASK_COMPLETION_ONLY
SUPPORTING_FILE_PRODUCTION_RELEASE_AUTHORITY=NONE
PROJECT_SCOPE=PRODUCTION_ARCHITECTURE_ONLY
```

---

# 1. 最终架构定位

这套架构不是另一个 PrimeVue、Vuetify 或 Quasar，也不是一次性造完所有组件的企业 UI 框架。

它是一套：

> **以 TypeScript 为核心、以 Vue 和 Vite 为运行基础、以项目自有 Design Token 为唯一视觉权威、以 UnoCSS 为样式表达层、以 Reka UI 为复杂交互原语、以用户个性化和跨设备适配为核心能力、以自动化规则约束人类和 AI 修改行为的渐进式前端应用平台。**

正式名称：

```text
Progressive Adaptive Vue Platform
```

简称：

```text
PAVP
```

核心目标：

1. 用户可以选择由完整 Theme Definition 明确声明的预设配色。
2. 用户可以编辑、校验、导入和导出完整自定义主题；平台不从少量 Seed 推导其余颜色。
3. 用户可以切换 Light、Dark、System，并独立选择 Standard 或 Enhanced Contrast 以及 Adaptive、Reduced 或 Solid Material。
4. 用户可以选择 Compact、Comfortable、Spacious。
5. 用户可以独立调节字号、动效和内容宽度。
6. 用户可以调整导航、面板、工作区和页面布局。
7. 同一套代码根据可用空间、输入能力和页面约束投影为 narrow、regular 或 wide。
8. UI 能根据容器空间和输入能力自动改变形态。
9. AI Agent 只能沿着明确的目录和依赖方向修改代码。
10. 规范通过 TypeScript、Lint、架构检查和 CI 执行，而不是依赖记忆。

## 1.1 Canonical UI Direction

```text
ADAPTIVE_LIQUID_CHROME_OVER_STABLE_CONTENT
```

该方向的含义：

* Stable Content 承载阅读、表单、数据和任务内容，不依赖半透明背景保证可读性。
* Adaptive Liquid Chrome 只服务于具有明确功能的 Shell Navigation、Toolbar、Overlay、Dialog 和 Sheet。
* Material 根据用户偏好、Forced Colors、Reduced Transparency 和浏览器能力投影为 `adaptive`、`reduced` 或 `solid`。
* 组件只公开语义变体，不公开 Blur、Backdrop、Opacity、Glow、Saturation、Brightness 或 Material Role 等光学实现参数。
* 不建立 `UiGlass`、Glass Card、通用 Material Wrapper 或页面级光学样式系统。
* 不复制任何平台或厂商的专有视觉外观；PAVP Design Token 始终是唯一视觉权威。

## 1.2 Architecture Foundation Freeze

```text
WORK_PACKAGE=PAVP_ARCHITECTURE_FOUNDATION_FREEZE
WORK_PACKAGE_KIND=ARCHITECTURE_ONLY
STATUS=FROZEN
ENTRY_BASELINE=main@9e859117cd54b8258b36243cc8d959bdbe0bf7dc; AHEAD=0; BEHIND=0; CLEAN_BEFORE_EDIT=YES
NORMATIVE_WRITE_AUTHORITY=ARCHITECTURE.md
ALLOWED_SCOPE=ARCHITECTURE.md foundation target contracts, status registry, value authority, sequencing and governance corrections
PROHIBITED_SCOPE=application source, generated artifacts, dependencies, lockfile, workflow, runtime implementation, business behavior and Package 4
OUTPUTS=one internally consistent frozen architecture authority and one strict future implementation chain
MACHINE_GATES=contradiction audit; repository text/policy checks; git diff --check; pnpm verify under exact runtime authority
PRODUCTION_RELEASE_ACCEPTANCE=NOT_APPLICABLE_ARCHITECTURE_ONLY_NO_RUNTIME_ARTIFACT_CHANGE
COMPLETION_EVIDENCE=scoped unstaged documentation diff plus successful static gate output in the task report; no repository evidence artifact
TARGET_CONTRACT_DOCUMENTATION_BEFORE_ACTIVATION=ALLOWED
TARGET_CONTRACT_ACTIVATION=PROHIBITED
DEPENDENCY_INSTALLATION=PROHIBITED
RUNTIME_IMPLEMENTATION=PROHIBITED
BUSINESS_IMPLEMENTATION=PROHIBITED
PARALLEL_IMPLEMENTATION_PACKAGES=PROHIBITED
NEXT_IMPLEMENTATION_AFTER_FREEZE=PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE
```

`PAVP_ARCHITECTURE_FOUNDATION_FREEZE` 是任何后续实现之前的严格架构门禁。该门禁允许在 Phase 1 完成前，把 Runtime Kernel、Router、Storage、API、Auth、Observability、Deployment、Forms、I18n、Tables、Mutation、Accessibility、Performance、Layout、Scroll 与 Motion 的完整 Target Contract 写入本文件；这是对原“Runtime Kernel Architecture Amendment 只能在 Phase 1 后开始”限制的显式替换。

在本门禁标记为 `FROZEN` 之前：

* Package 4 与所有实现任务全部阻塞。
* 不得安装依赖、创建 Runtime Module、生成组件、修改 Generated Artifact 或激活 Target Contract。
* 不得通过临时 Store、临时 Router、临时 Fetch Wrapper、临时 Storage Key、临时 Error Type 或页面局部默认值形成过渡权威。
* 不得并行启动会产生多个 Schema、Default、Registry、Provider、Persistence 或 Runtime Authority 的工作包。

门禁只有同时满足以下条件才能标记为 `FROZEN`：

1. §1.3 的 Capability Status Registry 完整且没有未分类能力。
2. §1.4 的 Value Authority 与 Default Authority 只有一份产品决策来源。
3. 全部 Foundation Target Contract 已包含 Owner、输入、输出、状态、失败、清理、消费边界和 Static Enforcement Target。
4. Target Contract 与 Active Implementation 明确分离，没有把未来能力描述为当前行为。
5. Future Implementation Chain 的 Entry、Allowed Scope、Prohibited Scope、Output、Machine Gate、Owner Release Acceptance 与 Completion Evidence 完整。
6. `git diff --check`、Repository Policy 和 `pnpm verify` 在精确 Node 与 pnpm 权威下通过。

门禁冻结后，文档完成本身不准入任何依赖或 Runtime Capability。`PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE` 仍然是第一个实现工作包。

## 1.3 Capability Status Registry

所有能力只允许以下四种状态：

```ts
type CapabilityStatus =
  | 'ACTIVE'
  | 'TARGET_INACTIVE'
  | 'DEFERRED'
  | 'PROHIBITED'
```

含义：

| Status | Canonical meaning |
| --- | --- |
| `ACTIVE` | 当前仓库已有真实 Artifact、Owning Gate 与静态证据；只能按当前合同使用 |
| `TARGET_INACTIVE` | 完整目标合同已冻结，但依赖、源码、Runtime Authority 与公共 API 尚未准入 |
| `DEFERRED` | 只有准入条件或候选方向；不得按完整目标合同实施 |
| `PROHIBITED` | 当前与目标架构均明确禁止 |

当前精确状态：

| Capability | Status | Current authority |
| --- | --- | --- |
| Repository governance and static production gate | `ACTIVE` | Phase 0 artifacts and `pnpm verify` |
| Token source, schema, generation, visibility and public-output completeness | `ACTIVE` | `@platform/design-system` current generated contract |
| Legacy embedded-palette preference compatibility format | `ACTIVE` | read-only migration input only |
| Light, Dark and System color-mode resolution | `ACTIVE` | current First Paint and pure resolver |
| Font Scale projection | `ACTIVE` | current `--ui-font-scale` contract |
| Adaptive, Reduced and Solid Material token projection | `ACTIVE` | current UI-internal Material contract |
| Complete Built-in Theme four-plane documents | `ACTIVE` | generated Built-in Registry and Theme Bank |
| Reference-only Preference and Theme Registry | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` |
| Standard and Enhanced Theme Plane projection | `ACTIVE` | generated Theme Bank and stable Public bindings |
| Compact, Comfortable and Spacious visual density projection | `TARGET_INACTIVE` | future Public Role Admission |
| Continuous Density Scale application | `DEFERRED` | independent personalization admission |
| Pinia appearance orchestration | `ACTIVE` | `apps/web` exact two-field Appearance Store |
| Appearance Preference and Custom Registry persistence | `ACTIVE` | two application-owned Local Storage boundaries |
| Complete Custom Theme validation and fixed Bank installation | `ACTIVE` | Design System exact validator, resolver and installer |
| Generated Built-in First Paint and post-Vue Custom restoration | `ACTIVE` | generated artifacts plus application bootstrap |
| General Pinia state, Session state and workflow state | `TARGET_INACTIVE` | post-Phase-1 named gates |
| Runtime Kernel | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` base plus the exact `create-and-ready-router` extension from `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` |
| Core Error Registry, normalization and current global capture | `ACTIVE` | Runtime Kernel exact four-record Core Error contract plus the active, separate exact six-record Router Error extension |
| Core validated Runtime Configuration | `ACTIVE` | Runtime Kernel exact five-field configuration contract; exact field extension by each consuming package |
| Vue Router file routes and route lifecycle | `ACTIVE` | `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` |
| Router reading-document Layout, native Scroll and Focus core | `ACTIVE` | Router exact narrow registries; first Shell consumer remains in Protected Vertical Slice |
| TanStack Query server-state runtime | `TARGET_INACTIVE` | `PAVP_API_TRANSPORT_IMPLEMENTATION` |
| Application persistence architecture | `TARGET_INACTIVE` | `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION` |
| API Transport | `TARGET_INACTIVE` | `PAVP_API_TRANSPORT_IMPLEMENTATION` |
| Auth, Session and Permission | `TARGET_INACTIVE` | `PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION` |
| Observability reporting and Runtime Performance collection | `TARGET_INACTIVE` | `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` |
| Deployment delivery, CSP, cache, private source maps and rollback | `TARGET_INACTIVE` | `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` |
| Forms, I18n, Tables and Mutations | `TARGET_INACTIVE` | demand-driven implementation gates |
| Foundational shared UI components | `TARGET_INACTIVE` | Phase 2 consumer admission |
| CSS Motion Token baseline | `ACTIVE` | current Design Token and static CSS contract only |
| View Transition progressive enhancement | `TARGET_INACTIVE` | demand-driven Motion/UI admission after Protected Vertical Slice |
| Motion for Vue, GSAP and specialist adapters | `DEFERRED` | named production-need gates |
| Accessibility architecture and current static lint baseline | `ACTIVE` | WCAG contract, token validation and current static tooling |
| Runtime component/route accessibility | `TARGET_INACTIVE` | each component, Router and protected-slice consumer gate |
| Build and Generated Manifest performance budgets | `ACTIVE` | current `check:bundle` and token Manifest gates |
| Project generators | `TARGET_INACTIVE` | serial demand-driven generator admission after a repeated real need |
| Frozen Future Implementation Chain | `TARGET_INACTIVE` | §37.2 strict serial sequencing authority |
| Demand-driven Forms/I18n/Tables/UI admission stage | `TARGET_INACTIVE` | repeatable serial stage after `PAVP_FIRST_PROTECTED_VERTICAL_SLICE` |
| Router Experimental Data Loaders | `PROHIBITED` | future stable-dependency decision required |
| Browser automation, automated test infrastructure and Codex browser operation | `PROHIBITED` | production-only repository policy |
| Seed-generated, partial or auto-corrected themes | `PROHIBITED` | explicit complete Theme contract |
| Page-authored visual authority and public optical props | `PROHIBITED` | Design Token and UI boundary |

本表是 Status Authority。其他章节可以解释合同，不得创建另一份状态枚举。Target 章节必须显式写出 `CAPABILITY_STATUS=TARGET_INACTIVE`；未出现 `ACTIVE` 证据的 Target 不得被 README、Page、Package Manifest 或 Generated Output 描述为现有能力。

## 1.4 Canonical Value Authority and Defaults

### Product Preference Default Authority

产品偏好只有一份语义默认决策：

```ts
const ProductPreferenceDefault = {
  colorMode: 'system',
  theme: {
    registryKind: 'built-in',
    themeId: 'neutral',
  },
  contrast: 'standard',
  material: 'adaptive',
  density: {
    preset: 'comfortable',
    scale: 1,
  },
  fontScale: 1,
  motion: 'full',
} as const
```

```text
AUTHORITY_ID=product-preference-default
OWNER=@platform/design-system preference contract
CAPABILITY_STATUS=ACTIVE
ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
CURRENT_COMPATIBILITY_ENCODING=LegacyPreferenceInput_AND_LegacySeedPreference
CURRENT_COMPATIBILITY_ENCODING_STATUS=READ_ONLY_MIGRATION_INPUT
FALLBACK=NONE
PERSISTED_AS=ExplicitThemePreference direct Local Storage value
PERSISTENCE_CONTRACT=Current-to-target Preference Transition
CONSUMERS=AUTHORIZED_PACKAGE_5_CONSUMER only
STATIC_ENFORCEMENT=duplicate-default and semantic-equivalence checks
```

Package 5 完成后，唯一持久化 Default 是上方 Reference-only Tuple。`defaultCurrentPreference` 已从 Public Runtime 和 Writer 移除；Legacy Embedded-palette Shape 只作为内部 Read-only Migration Input，永不成为第二份产品默认或写回格式。

`CONSUMERS` 只引用 §13.6 定义且已由 Package 5 落地的 `AUTHORIZED_PACKAGE_5_CONSUMER`。`ProductPreferenceDefault` 只供该 Boundary 构造新偏好或执行显式 Reset，不得由 First Paint、Pinia、页面、Feature 或持久化 Writer 复制成第二份默认对象。

Comfortable 是产品默认 Density，不是 Page、Component、Layout 或 Error Fallback。System 是 Stored Color Mode Default，只能在 Runtime 根据浏览器 `prefers-color-scheme` 能力解析，不能在构建时改写为 Light 或 Dark。

### Pre-initialization Safety Baseline Authority

```ts
const PreInitializationSafetyBaseline = {
  effectiveColorMode: 'light',
  effectiveTheme: {
    registryKind: 'built-in',
    themeId: 'neutral',
  },
  effectiveContrast: 'standard',
  effectiveMaterial: 'solid',
  effectiveDensity: 'comfortable',
} as const
```

```text
AUTHORITY_ID=pre-initialization-safety-baseline
OWNER=@platform/design-system generated First Paint contract
CAPABILITY_STATUS=ACTIVE
ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
CURRENT_LEGACY_EQUIVALENT_STATUS=RETIRED
PERSISTENCE=PROHIBITED
USER_PREFERENCE=NO
MUTATION=GENERATED_ONLY
REPLACEMENT=ATOMIC_AFTER_VALIDATED_PREFERENCE_RESOLUTION
FAILURE_BEHAVIOR=RETAIN_SAFE_BASELINE_AND_RETURN_STRUCTURED_ERROR
STATIC_ENFORCEMENT=HTML, critical CSS, manifest and initializer exact parity
```

该 Baseline 只保护 Vue、Storage 和能力解析执行前的可读首帧，以及初始化失败后的安全状态。它不是 Stored Preference，不得被写入 Storage、Pinia 或用户设置；Preference 与 Theme Registry 校验成功后，Runtime 必须在单个 Appearance Mutation Boundary 中原子替换本 Baseline 的全部五个 Effective Field。任何 Partial Attribute、Partial Theme Bank 或跨帧混合状态均失败。Package 5 的 First Paint 只能同步解析 Built-in Theme；Stored Preference 引用 Custom Theme 时必须保持本 Baseline，直到 Vue Bootstrap 后由应用读取本地 Registry、完成 Design System Validation 并原子应用。First Paint 中的 Font Scale 与 Motion 不是该五字段 Safety Baseline 的成员；它们只能消费 `ProductPreferenceDefault` 的对应轴或已验证 Stored Preference，并继续受同一 Atomic Appearance Mutation Boundary 约束，不得建立第三份默认。

### Approved Value Authorities

所有可复用值必须且只能属于一个注册 Authority：

```ts
type ApprovedValueAuthorityKind =
  | 'design-token-source'
  | 'typed-default-registry'
  | 'runtime-configuration-schema'
  | 'domain-schema'
  | 'route-registry'
  | 'error-registry'
  | 'permission-registry'
  | 'storage-registry'
  | 'named-protocol-constant'
```

每条 Authority Record 必须包含：

```ts
interface ValueAuthorityRecord {
  id: string
  kind: ApprovedValueAuthorityKind
  owner: string
  sourcePath: string
  valueType: string
  validation: string
  fallback: string | null
  migration: string | null
  visibility: 'public' | 'ui-internal' | 'application-internal' | 'build-only'
  consumerBoundary: readonly string[]
  staticEnforcement: readonly string[]
  capabilityStatus: CapabilityStatus
}
```

页面、Feature、Shared Module 和 Public UI Component 禁止独立声明或复制：

```text
color or theme defaults
spacing or dimensions
density values or font scales
typography values, radius, shadow or z-index
motion duration, easing or breakpoint
scroll dimensions or touch targets
API timeout, retry count or cache duration
storage key or environment default
route name or permission name
error category or protocol policy
```

Visual Value 只能来自 Design Token；Product Default 只能来自 Typed Default Registry；部署值只能来自 Runtime Configuration Schema；Route、Error、Permission 与 Storage Identifier 只能来自各自 Exact Registry。消费者只能引用 Typed ID、Generated Semantic Variable 或 Registry Entry，不能复制其 Literal。

局部一次性算法值只有在同时满足以下条件时允许：

1. 不是产品配置、视觉政策、协议政策或跨调用共享行为。
2. 不影响持久化、网络、安全、缓存、路由、权限、无障碍或公共 API。
3. 由就近命名 Invariant 解释，并且没有第二个消费者。
4. 一旦出现第二个消费者或配置需求，立即进入对应 Authority Admission，不得复制。

Generated Artifact 中的派生 Literal、Schema Enum Discriminant、HTTP 标准状态、WCAG Threshold 和数学 Identity 可以存在，但它们分别属于 Generated Output、Domain Schema 或 Named Protocol Constant，不构成页面硬编码许可。

---

# 2. 版本与稳定性策略

## 2.1 生产版本基线

| 技术                 | 基线            |
| ------------------ | ------------- |
| Node.js            | `24.15.0` exact verification authority |
| pnpm               | 当前 `10.x` 稳定线 |
| TypeScript         | `6.x`         |
| Vue                | `3.5.x` 稳定线   |
| Vue Router         | `5.x`         |
| Vite               | `8.1.x`       |
| UnoCSS             | 当前稳定版本        |
| Reka UI            | `2.x` 稳定组件    |
| Pinia              | `3.x`         |
| TanStack Vue Query | `5.x`         |
| Zod                | `4.x`         |
| VeeValidate        | Stable major selected at Form Admission; v5 unavailable while prerelease |
| ESLint             | `10.x`        |

Node 官方要求生产应用使用 Active LTS 或 Maintenance LTS，Node 24 当前处于 LTS 状态；Vite 官方当前对 8.1 发布常规补丁。PAVP 的可复现 Verification Authority 精确为 Node `24.15.0`，不是任意 `24.x`。

项目根 `mise.toml`、`project.config.ts`、CI 和 Manifest Compression Profile 固定 Node `24.15.0`；pnpm 精确为 `10.34.5`，由 `package.json#packageManager` 和 CI 统一选择。`PAVP_FINAL_STATIC_GOVERNANCE` 已把同一 Process Runtime Preflight 激活为根 `pnpm verify` 的首个 Gate；Node 或 pnpm 不精确匹配时，它在 Format、Lint、Type、Architecture、Generator、Build 和 Bundle Gate 之前失败并报告 Required/Received Version。`check-project-config.ts` 同时验证 `project.config.ts`、`mise.toml`、`packageManager`、精确 `engines`、CI 声明、Preflight Authority 与首位命令一致，`EARLY_RUNTIME_PREFLIGHT=ACTIVE`。`package.json#engines` 现已精确收窄为 Node `24.15.0` 与 pnpm `10.34.5`。

Vite 8.1 基于 Rolldown 统一开发与生产构建基础，但实验性的 Bundled Dev Mode 不进入首版默认配置。

## 2.2 TypeScript 6 与 TypeScript 7 的最终决定

TypeScript 7 已于 2026 年 7 月正式发布，使用 Go 原生编译器。但 TypeScript 官方明确指出，Vue、Volar、Svelte 和 Astro 等嵌入式语言工具目前仍依赖 TypeScript 6 的程序化 API。

因此：

```text
Production Vue Compiler = TypeScript 6
TypeScript 7 = Compatibility Lab
```

不允许为了使用最新版本而损坏：

* Vue Template 类型检查。
* `vue-tsc`。
* Volar。
* Props、Slots、Emits 推断。
* Vue Router 类型生成。

TypeScript 7 进入正式基线的门槛：

1. Vue Language Tools 正式支持。
2. `vue-tsc` 使用 TS7 完整通过。
3. IDE 和 CI 不需要双编译器。
4. 模板类型推断与 TS6 一致。
5. 现有组件公共类型没有变化。

## 2.3 依赖升级政策

```text
Stable releases only
No Alpha
No Beta
No RC in production dependencies
```

具体规则：

* `pnpm-workspace.yaml` 使用 Catalog 统一版本。
* `pnpm-lock.yaml` 必须提交。
* CI 使用 `--frozen-lockfile`。
* 依赖审查由维护者手动执行，使用 GitHub Dependency Graph 和 Dependabot alerts 提供风险信号。
* 不配置任何依赖自动更新机制；Dependency Graph 和 Dependabot alerts 仅提供人工审查信号。
* 依赖升级必须在本地验证通过后直接提交到 `main`。
* 每个依赖升级提交只处理一个可独立审查的技术领域。
* UI、构建、路由和类型系统 Major 不得合并在同一提交。
* Alpha、Beta 和 RC 兼容性实验只允许在仓库外的可丢弃本地目录中运行，且绝不得提交到仓库。

---

# 3. 最终技术栈

## 3.1 核心运行层

| 领域     | 最终选择                       | 职责                  |
| ------ | -------------------------- | ------------------- |
| 语言     | TypeScript 6 Strict        | 所有类型和公共契约           |
| UI 框架  | Vue 3.5                    | 响应式运行时和组件           |
| 组件语法   | `<script setup lang="ts">` | 唯一 SFC 编写方式         |
| 构建     | Vite 8.1                   | Dev Server、HMR、生产构建 |
| 路由     | Vue Router 5               | 文件路由和生成类型           |
| 包管理    | pnpm Workspace             | Monorepo 与 Catalog  |
| 客户端状态  | Pinia                      | 偏好、会话和工作流           |
| 服务端状态  | TanStack Vue Query         | API 缓存、Mutation、失效  |
| Schema | Zod 4                      | 配置、API 和用户输入校验      |
| 表单     | Admission 时的 VeeValidate Stable Major | 表单状态和错误管理           |
| 浏览器能力  | VueUse                     | 按需使用浏览器 Composable  |
| 国际化    | Vue I18n                   | 文本、格式、RTL 和语言切换     |

Vue Router 5 已将文件路由能力合并进官方包，能够从 `src/pages` 自动生成路由和类型，不再需要手工维护完整的路由数组。

## 3.2 设计与 UI 层

| 领域              | 最终选择                                 |
| --------------- | ------------------------------------ |
| 样式引擎            | UnoCSS                               |
| UnoCSS Preset   | `presetWind4`                        |
| 图标              | `presetIcons` + Lucide               |
| Design Token 格式 | DTCG 2025.10 兼容子集                    |
| Token 构建        | Style Dictionary 5.4 + 项目 Preprocessor |
| Token 校验        | Zod 4                                |
| 颜色处理            | Color.js                             |
| 颜色解析与对比计算       | Color.js；只校验显式值，不生成或修正主题             |
| 运行时主题           | CSS Custom Properties                |
| 复杂交互原语          | Reka UI，Phase 2 Consumer Gate 后按需      |
| 简单控件            | 原生语义 HTML                            |
| 项目 UI 公共层       | `@platform/ui`                       |
| 简单动画            | CSS                                  |
| 页面主题切换          | View Transition，渐进增强                 |
| 布局动画            | Motion for Vue，§24.1 Gate 后按需              |

UnoCSS `presetWind4` 是官方 Tailwind 4 风格 Preset，包含内部 Reset、按需主题变量和现代 CSS Property Layer；Attributify 是独立可选 Preset，不在本架构启用。

DTCG 2025.10 是稳定技术报告，但不是 W3C Standards Track 标准；Style Dictionary 5 已支持 DTCG 格式，但官方说明对 2025.10 的完整支持仍在推进。因此架构采用“稳定子集 + 显式 Schema”，不绑定尚未完整实现的边缘能力。

Reka UI 提供无样式、可访问、完整类型化的 Vue 原语，负责 ARIA、键盘导航和焦点管理；其 Drawer 在 2.10 中仍标记为 Alpha，所以 Drawer 不作为首版不可替换的公共实现合同。

## 3.3 工程质量层

| 领域 | 最终选择 |
| --- | --- |
| 格式检查 | Prettier |
| JS/TS/Vue Lint | ESLint 10 Flat Config |
| Vue 规范 | `eslint-plugin-vue` |
| TS 规范 | `typescript-eslint` |
| A11y 静态检查 | `eslint-plugin-vuejs-accessibility` |
| UnoCSS Lint | `@unocss/eslint-plugin` |
| 导入边界 | `eslint-plugin-boundaries` |
| CSS Lint | Stylelint |
| Type Check | `vue-tsc` + TypeScript 6 Strict |
| 配置与 Schema 校验 | Zod 4 |
| Token 一致性 | Generator Check |
| 未使用代码 | Knip |
| 生产构建 | Vite |
| 构建体积 | Bundle Budget |
| CI | GitHub Actions |
| 安全扫描 | CodeQL |
| 依赖风险信号 | GitHub Dependency Graph + Dependabot alerts |
| Codex Verification | `pnpm verify` 静态生产门槛 |

Codex 不得打开或操作浏览器、Chrome DevTools 或任何浏览器自动化能力。Owner 可以在仓库外自行进行可选手工观察，并把明确记录的观察结果提供给 Codex 做只读审查；该观察不是 Codex 完成任务的门槛，也不产生仓库证据。

ESLint 10 已进入稳定版本，当前 10.x 持续发布更新，并以 Node 24 LTS 作为主要运行环境之一。

---

# 4. 明确不使用的基础技术

首版禁止引入：

```text
React
Nuxt
PrimeVue
PrimeUI
Vuetify
Element Plus
Naive UI
Quasar
Tailwind CSS
Sass
Less
Axios
Alova
Lodash
Moment
Day.js
unplugin-auto-import
unplugin-vue-components
Attributify
Tagify
Turbo
Nx
Tauri
Capacitor
Service Worker
自定义滚动条框架
全局事件总线
全局组件自动注册
全局 Composable 自动导入
```

理由：

* 避免形成第二套视觉权威。
* 避免隐式导入损害 AI 和代码搜索。
* 避免基础架构承担未出现的运行时需求。
* 避免重复建设状态、请求和主题系统。
* 避免 Package 膨胀失控。

---

# 5. Phase-gated Repository Structure

以下目录树描述允许的最终位置，不代表当前 Phase 的交付清单。除已存在文件外，所有目录和文件都必须由当前 Phase、Owning Work Package 或 Admission Gate 允许，并与其真实 Artifact 在同一变更中获得验证；Shared Runtime/UI Abstraction 还必须由真实生产消费者触发。禁止为了匹配目录树而提交空目录、占位文件或提前建立 Adapter、Component、Page、Motion、Scroll、Documentation 子树。

```text
progressive-adaptive-vue-platform/
├── .ai/                                      [existing subordinate workflow; exact allowlist only]
│   └── skills/
│       └── pavp-ui/
│           ├── SKILL.md
│           └── references/
│               ├── task-routing.md
│               ├── execution-contract.md
│               ├── specialist-lens-policy.md
│               └── acceptance-report.md
│
├── apps/
│   └── web/
│       ├── public/                           [demand-created beyond existing assets]
│       │   └── favicon.svg
│       │
│       ├── src/
│       │   ├── app/                          [children demand-created by admitted capability]
│       │   │   ├── bootstrap/
│       │   │   │   ├── create-app.ts
│       │   │   │   ├── install-providers.ts
│       │   │   │   └── restore-preferences.ts
│       │   │   │
│       │   │   ├── config/
│       │   │   │   ├── app.config.ts
│       │   │   │   ├── env.schema.ts
│       │   │   │   └── feature-flags.ts
│       │   │   │
│       │   │   ├── providers/
│       │   │   │   ├── pinia.ts
│       │   │   │   ├── query.ts
│       │   │   │   ├── i18n.ts
│       │   │   │   └── error-reporting.ts
│       │   │   │
│       │   │   ├── router/
│       │   │   │   ├── index.ts
│       │   │   │   ├── guards.ts
│       │   │   │   ├── scroll-behavior.ts
│       │   │   │   └── route-meta.d.ts
│       │   │   │
│       │   │   ├── shell/
│       │   │   │   ├── AppShell.vue
│       │   │   │   ├── AppViewport.vue
│       │   │   │   ├── navigation/
│       │   │   │   ├── regions/
│       │   │   │   └── layout/
│       │   │   │       ├── capabilities.ts
│       │   │   │       ├── constraints.ts
│       │   │   │       ├── defaults.ts
│       │   │   │       ├── resolver.ts
│       │   │   │       ├── schema.ts
│       │   │   │       ├── storage.ts
│       │   │   │       └── use-layout-runtime.ts
│       │   │   │
│       │   │   ├── appearance/
│       │   │   │   ├── appearance.store.ts
│       │   │   │   ├── preference-storage.ts
│       │   │   │   ├── custom-theme-registry-storage.ts
│       │   │   │   ├── appearance-bootstrap.ts
│       │   │   │   └── use-appearance.ts
│       │   │   │
│       │   │   ├── errors/
│       │   │   │   ├── AppErrorBoundary.vue
│       │   │   │   ├── error-normalizer.ts
│       │   │   │   └── error-types.ts
│       │   │   │
│       │   │   └── styles/
│       │   │       ├── app.css
│       │   │       ├── base.css
│       │   │       └── layers.css
│       │   │
│       │   ├── pages/                        [demand-created by real routes]
│       │   │   ├── index.vue
│       │   │   ├── settings/
│       │   │   └── [...path].vue
│       │   │
│       │   ├── features/                     [demand-created by real features]
│       │   │   └── <feature-name>/
│       │   │       ├── api/
│       │   │       ├── model/
│       │   │       ├── ui/
│       │   │       ├── lib/
│       │   │       ├── types.ts
│       │   │       └── index.ts
│       │   │
│       │   ├── shared/                       [demand-created by demonstrated reuse]
│       │   │   ├── api/
│       │   │   │   ├── client.ts
│       │   │   │   ├── errors.ts
│       │   │   │   ├── query-keys.ts
│       │   │   │   └── request.ts
│       │   │   ├── config/
│       │   │   ├── i18n/
│       │   │   │   ├── index.ts
│       │   │   │   └── locales/
│       │   │   ├── lib/
│       │   │   └── types/
│       │   │
│       │   ├── route-map.d.ts
│       │   ├── App.vue
│       │   └── main.ts
│       │
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── packages/
│   ├── design-system/
│   └── ui/                                   [Phase 1: dependency-free; src/index.ts only]
│
├── scripts/
│   ├── architecture/
│   ├── codegen/
│   ├── tokens/
│   └── verify/
│
├── docs/                                     [demand-created only when an ADR/document gate triggers]
│   └── decisions/
│
├── .github/
│   └── workflows/
│       ├── verify.yml
│       └── codeql.yml
│
├── AGENTS.md
├── ARCHITECTURE.md
├── README.md
├── patches/
│   └── unconfig@7.5.0.patch                  [existing patch; must be preserved]
├── mise.toml
├── project.config.ts
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── tsconfig.node.json
├── eslint.config.mjs
├── stylelint.config.mjs
├── prettier.config.mjs
├── uno.config.ts
├── knip.jsonc
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .prettierignore
└── .npmrc
```

当前 Baseline 不包含 `LICENSE` 文件；Target Directory Tree 不得暗示它已存在。未来新增 License 需要 Owner 明确选择文本和独立仓库治理变更。

当前 Phase 1 对 `packages/ui` 的实际结构是：

```text
packages/ui/
├── src/
│   └── index.ts
├── package.json
└── tsconfig.json
```

在 Phase 1：

```text
UI_RUNTIME_DEPENDENCIES=NONE
UI_IMPLEMENTATION_SOURCE=packages/ui/src/index.ts
UI_IMPLEMENTATION_CONTENT=export {}
FUTURE_UI_DIRECTORIES=DEMAND_CREATED_ONLY
```

`.ai/skills/pavp-ui/**`、未来 UI 目录和未来应用目录出现在本节，仅用于固定合法位置和引入门槛。本架构工作包本身不创建这些文件或目录。

---

# 6. 初始 Workspace 只保留三个项目

```text
apps/web
packages/design-system
packages/ui
```

禁止首期创建：

```text
packages/contracts
packages/core
packages/platform
packages/shared-utils
packages/hooks
packages/charts
packages/forms
packages/table
apps/desktop
apps/mobile
apps/docs
```

## 新 Package 创建门槛

同时满足以下条件才允许拆包：

1. 至少两个真实应用消费。
2. 公共 API 已稳定。
3. 拆包能减少依赖或构建成本。
4. 存在独立验证和维护价值。
5. 复制成本已经高于 Package 维护成本。
6. 有明确 Owner。
7. 有明确退出和替换策略。

---

# 7. Workspace 依赖方向

```text
apps/web
  ├── @platform/ui
  └── @platform/design-system

@platform/ui
  ├── @platform/design-system
  ├── reka-ui
  ├── motion-v
  └── approved specialist adapters

@platform/design-system
  ├── zod
  ├── colorjs.io
  └── style-dictionary (build only)
```

上图是最终允许方向，不表示依赖已进入当前 Phase。Phase 1 固定：

```text
packages/ui runtime dependencies = 0
packages/ui implementation sources = src/index.ts only
Reka UI / Motion / specialist adapters = not admitted
```

依赖只能在对应 Phase、真实生产消费者和专用引入门槛同时满足后加入。未来引入的第三方 UI 依赖只能由 `packages/ui` 的私有 Adapter 导入；应用和业务层仍只从 `@platform/ui` 公共根出口导入语义组件。

应用分层：

```text
app
 ↓
pages
 ↓
features
 ↓
shared
 ↓
@platform/ui
 ↓
@platform/design-system
```

## 强制规则

* Package 不得导入 `apps/**`。
* `shared` 不得导入 Feature。
* Feature 不得导入 Page。
* Feature 默认不得直接依赖另一个 Feature。
* 跨 Feature 编排由 Page 或 App 完成。
* Feature 外部只能访问其 `index.ts`。
* 禁止 Workspace 深层导入。
* Reka UI 只允许由 `packages/ui/src/adapters/reka/**` 私有实现导入。
* Motion、GSAP、专业 Grid、Editor、Charts 只允许由各自已批准的私有 Adapter 导入。
* 应用不得导入 `@platform/ui/adapters/*`；每个 Package 只有一个公共根出口。
* Adapter 目录按真实需求创建，不因最终目录树而预建。

---

# 8. TypeScript 规范

基础配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "erasableSyntaxOnly": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true
  }
}
```

代码约束：

```text
No any
No TypeScript enum
No namespace
No parameter properties
No default export except tool configs and Vue SFC
No implicit global
No non-null assertion without justification
No untyped JSON.parse
No unchecked localStorage payload
No unvalidated environment variable
```

Vue SFC 固定顺序：

```vue
<script setup lang="ts">
// explicit imports
// types
// props and emits
// state and computed
// functions
// watchers and lifecycle
</script>

<template>
  <!-- semantic structure -->
</template>

<style scoped>
/* only when UnoCSS is insufficient */
</style>
```

不使用：

* JSX/TSX 作为普通组件语法。
* Vue API 自动导入。
* 组件自动注册。
* 全局 Mixin。
* Options API。
* Class Component。
* Decorator。

---

# 9. Router Governance Contract

```text
CAPABILITY=ROUTER
CAPABILITY_STATUS=ACTIVE
OWNER=apps/web/src/app/router
NAVIGATION_OWNER=VUE_ROUTER
SERVER_STATE_OWNER=TANSTACK_QUERY
EXPERIMENTAL_ROUTER_DATA_LOADERS=PROHIBITED
ACTIVATION_GATE=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
```

本节冻结的 Router 合同已由 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 实现并激活。`apps/web/src/App.vue` 现在只保留 Route Outlet；精确八个 `.vue` Route Source、Router Lifecycle 和本节的窄 Layout/Scroll/Focus Subset 为当前真实实现边界。Server State、Storage、Auth、Session、Permission、I18n、Observability、Deployment、Shared UI、App Shell 与 Business Route 仍未准入。

## 9.0 `PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT`

```text
WORK_PACKAGE=PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT
WORK_PACKAGE_KIND=ARCHITECTURE_ONLY
STATUS=FROZEN
IMPLEMENTATION_AUTHORITY=NONE
PURPOSE=close the exact public and cross-file contracts required by the existing PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION entry gate
ALLOWED_SCOPE=ARCHITECTURE.md Router dependency, route, meta, params, query, title, message, error, guard, navigation-result, redirect, dynamic-route, layout, scroll, focus, Runtime Kernel extension and static-enforcement target contracts
PROHIBITED_SCOPE=Router source implementation; dependency, Catalog, Manifest or Lockfile changes; generated artifacts; application source; static-checker implementation; Storage; Query; API; Auth; Session; Permission; I18n; Observability; Deployment activation; Shared UI; App Shell; business routes; tests; browser infrastructure; Git mutation
ACTIVATION_EFFECT=NONE_UNTIL_PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
CURRENT_ROUTER_STATUS=TARGET_INACTIVE
CURRENT_RUNTIME_KERNEL_STEP_COUNT=9
TARGET_POST_ROUTER_KERNEL_STEP_COUNT=10
NEXT_IMPLEMENTATION_PACKAGE=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=BLOCKED_BY_ROUTER
```

Freeze-time Canonical State：

```text
PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT=FROZEN
PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT=FROZEN
VUE_ROUTER_TYPE_COMPATIBILITY_STRATEGY=EXACT_VERSION_PNPM_DECLARATION_PATCH
PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION=NEXT
Router=TARGET_INACTIVE
CURRENT_RUNTIME_KERNEL_STEP_COUNT=9
TARGET_POST_ROUTER_KERNEL_STEP_COUNT=10
PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=BLOCKED_BY_ROUTER
```

该 Amendment 只闭合 Existing Router Work Package 的实施输入，不创建新的 Phase、Roadmap、Architecture Version、ADR、Router Design 或第二份 Architecture Authority。其 Freeze-time Snapshot 没有安装依赖、创建页面、改变当时的 `App.vue`、扩展当时的 Core Error Registry、修改当时的九步 Runtime Kernel，或激活任何 Router、Layout、Scroll、Focus、Auth、Query、I18n、Observability 或 Deployment Behavior。当前 Implementation/Capability Status 只由文首 Current Status、§1.3、§9 Current Contract、§19.4、§37.1 与 §37.2.5 的同步记录决定，不重写该 Frozen Contract。

### `PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT`

```text
WORK_PACKAGE=PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT
WORK_PACKAGE_KIND=ARCHITECTURE_ONLY
STATUS=FROZEN
IMPLEMENTATION_AUTHORITY=NONE
PURPOSE=resolve the strict published-declaration compatibility blocker for the existing PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
RESEARCHED_AT=2026-08-18T18:27:30-07:00
OFFICIAL_LATEST_STABLE_VERSION=5.2.0
OFFICIAL_RELEASE_TAG=v5.2.0
OFFICIAL_RELEASE_TAG_OBJECT=976cfd47a97455e5881584a539a7021d58851071
OFFICIAL_RELEASE_COMMIT=6e5f8d253b9444a76eb58f176ebe08d686c937cb
OFFICIAL_NPM_INTEGRITY=sha512-QAC5i0LEb1GLG0LXDQmHu8L7FX12j0KwU/JTKmLQUJMrn04gQdKP6Du+p0QwpHb3iy71vBlqnHQ8WAfOSAWhqw==
OFFICIAL_MAIN_REVIEWED_COMMIT=67babd4840ea6ec5d0e90fd3d884042161919fdb
OFFICIAL_FIXED_STABLE_RELEASE=NONE_AS_OF_RESEARCH
UPSTREAM_FIX_IN_OFFICIAL_MAIN=NO
UPSTREAM_FIX_IN_STABLE_RELEASE=NO
UPSTREAM_PR=vuejs/router#2634
UPSTREAM_PR_STATE=OPEN_UNMERGED
UPSTREAM_PR_MERGEABILITY=NON_MERGEABLE_DIRTY
UPSTREAM_PR_MAINTAINER_REVIEW=CHANGES_REQUESTED_NO_MERGE_ACCEPTANCE
UPSTREAM_PR_HEAD_SHA=f189bbebe89a1486e19d6d443d1832672de6a942
UPSTREAM_PR_CHANGED_FILES=8
UPSTREAM_CAUSAL_CHANGE_PRESENT_IN_PR_HEAD=YES_BUT_UNMERGED
UPSTREAM_PR_HEAD_ROLE=PROVENANCE_ONLY_NOT_PATCH_PAYLOAD
UPSTREAM_PR_COMPLETE_PAYLOAD=REJECTED_AS_BROADER_THAN_THE_CAUSAL_PAVP_REPAIR
VUE_ROUTER_TYPE_COMPATIBILITY_STRATEGY=EXACT_VERSION_PNPM_DECLARATION_PATCH
PATCH_STATUS=TEMPORARY_UPSTREAM_COMPATIBILITY_PATCH
PATCH_OWNER=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
PATCH_TARGET_PACKAGE=vue-router
PATCH_TARGET_VERSION=5.2.0
PATCH_MECHANISM=pnpm exact-version patchedDependencies
PATCH_WORKSPACE_AUTHORITY=pnpm-workspace.yaml
PATCH_REGISTRATION_KEY=vue-router@5.2.0
PATCH_REGISTRATION_VALUE=patches/vue-router@5.2.0.patch
PATCH_FILE=patches/vue-router@5.2.0.patch
PATCH_CREATION_COMMAND=pnpm patch vue-router@5.2.0
PATCH_FINALIZATION_COMMAND=pnpm patch-commit <the exact edit directory emitted by pnpm patch>
PATCH_TARGET_ARTIFACT=dist/index-BN0B0y8a.d.ts
PATCH_TARGET_DECLARATION_SECTION=src/experimental/route-resolver/resolver-fixed.d.ts
PATCH_CHANGED_FILE_COUNT=1
PATCH_HUNK_COUNT=1
PATCH_CHANGED_DECLARATION_COUNT=3
PATCH_DECLARATION_ONLY=REQUIRED
PATCH_RUNTIME_CHANGE=PROHIBITED
PATCH_JAVASCRIPT_CHANGE=PROHIBITED
PATCH_PACKAGE_JSON_CHANGE_INSIDE_DEPENDENCY=PROHIBITED
PATCH_PACKAGE_METADATA_CHANGE=PROHIBITED
PATCH_GENERATED_ROUTE_ARTIFACT_CHANGE=PROHIBITED
PATCH_UNRELATED_OPTIONAL_PROPERTY_WIDENING=PROHIBITED
PATCH_PURPOSE=restore compatibility with PAVP exactOptionalPropertyTypes=true and skipLibCheck=false
PATCH_UPSTREAM_REFERENCE=vuejs/router#2634
PATCH_UNUSED_POLICY=allowUnusedPatches:false
PATCH_APPLICATION_POLICY=ignorePatchFailures:false
PATCH_INSTALL_POLICY=pnpm install --frozen-lockfile
PATCH_CONTENT_HASH_AUTHORITY=pnpm patch-commit output and pnpm-lock.yaml only; not predeclared by Architecture
TYPECHECK_COMMAND=vue-tsc --project apps/web/tsconfig.json --noEmit
COMPATIBILITY_PROBE_TYPESCRIPT=6.0.3
COMPATIBILITY_PROBE_VUE_TSC=3.3.8
EXACT_OPTIONAL_PROPERTY_TYPES=true
SKIP_LIB_CHECK_EFFECTIVE=false
STRICT_TYPESCRIPT_POLICY_CHANGE=PROHIBITED
```

截至上述研究时间，Official npm `latest` 与 Official Releases 的最新 Stable 均为 `vue-router@5.2.0`，不存在已发布的 Fixed Stable Release。`v5.2.0` 的 Peeled Release Commit 为上述精确 Commit；Official `main` 在上述 Reviewed Commit 中仍保留同样的不兼容 Declaration Shape。`vuejs/router#2634` 仍为 Open、Unmerged 且 Mergeability State 为 `dirty`；它的当前单一 Commit 横跨八个 Source File，批量改变与 PAVP 当前两条 TS2430 无直接因果关系的 Optional Property。Maintainer 已明确要求不应有 Runtime Change、`meta` 不应因本修复接受 Present `undefined`，并对更广的 Runtime、Scroll、RouterLink 与 Data-loader Change 提出 Changes Requested。因此 PR Head SHA 只是 Provenance Evidence，完整 PR Diff 不是 PAVP Patch Payload。

Official `vue-router@5.2.0` npm Tarball 的 Root 与 `vue-router/experimental` Type Export 最终都进入同一个 Flattened Published Declaration `dist/index-BN0B0y8a.d.ts`。它的 `EXPERIMENTAL_ResolverRecord_Group` 故意把 `name`、`path` 和 `hash` 专化为 Present `undefined`，但 Base Interface 在 `exactOptionalPropertyTypes=true` 下只允许属性缺席或 Present 的实体类型，不允许 Present `undefined`。PAVP 在 `skipLibCheck=false` 的完整 Declaration Check 中因此得到两条精确 Diagnostic：

```text
TS2430 at dist/index-BN0B0y8a.d.ts:1227
Interface 'EXPERIMENTAL_ResolverRecord_Group' incorrectly extends interface 'EXPERIMENTAL_ResolverRecord_Base'.
Types of property 'name' are incompatible.
Type 'undefined' is not assignable to type 'RecordName'.

TS2430 at dist/index-BN0B0y8a.d.ts:1336
Interface 'EXPERIMENTAL_RouteRecord_Base' incorrectly extends interface 'EXPERIMENTAL_ResolverRecord_Base'.
Types of property 'parent' are incompatible.
Type 'EXPERIMENTAL_RouteRecordNormalized | null' is not assignable to type 'EXPERIMENTAL_ResolverRecord_Base | null'.
Type 'EXPERIMENTAL_RouteRecordNormalized_Group' is not assignable to type 'EXPERIMENTAL_ResolverRecord_Base' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
Types of property 'name' are incompatible.
Type 'undefined' is not assignable to type 'RecordName'.
```

精确 Minimal Patch 只允许在上述一个 Published Declaration Artifact 中生成一个 Hunk，并只允许以下三个 Replacement：

```diff
 interface EXPERIMENTAL_ResolverRecord_Base {
-  name?: RecordName;
+  name?: RecordName | undefined;
-  path?: MatcherPatternPath;
+  path?: MatcherPatternPath | undefined;
   query?: MatcherPatternQuery[];
-  hash?: MatcherPatternHash;
+  hash?: MatcherPatternHash | undefined;
 }
```

`name` 直接对应当前首条 TS2430。只修复 `name` 时，同一继承关系立即以 `path` 重现两条 TS2430；再修复 `path` 时立即以 `hash` 重现；三者同时修复后两条 TS2430 归零。第二条 `parent` Diagnostic 是 Invalid Group 通过 Normalized-record Union 向上传播的直接结果，不要求扩宽 `parent`。`query`、`parent`、`aliasOf`、`meta` 与所有其他 Optional Property 不得改变。该补丁只改 `.d.ts` Type Annotation，不改变 JavaScript、Runtime API、Package Metadata、Official Generator 或 `apps/web/src/route-map.d.ts`。

Patch 实施时，`pnpm patch-commit` 必须在 Root `pnpm-workspace.yaml` 的现有 `patchedDependencies` Authority 中添加精确 `vue-router@5.2.0: patches/vue-router@5.2.0.patch`，并显式保持 `allowUnusedPatches: false` 与 `ignorePatchFailures: false`。实际 Patch Hash 、Peer-suffixed Snapshot Coordinate 和 Lockfile `patch_hash` 只能从真实 `pnpm patch-commit` 与 Install Output 派生，不得在 Architecture 中伪造。Patch File、Workspace Registration、Lockfile Top-level Path/Hash 与全部实际 Resolved `vue-router@5.2.0` Patched Snapshot 必须原子一致。Missing File、Unused Selector、Version Mismatch、Hash Drift、Apply Failure、Target Context Drift、第二个 File、第二个 Hunk 或第四个 Declaration Change 都必须 Fail Closed。

Patch Removal Contract：

```text
PATCH_VERSION_SCOPE=exactly vue-router@5.2.0 only
PATCH_VERSION_CHANGE_ACTION=FAIL_AND_REQUIRE_CURRENT_OFFICIAL_RELEASE_RESEARCH
PATCH_REMOVAL_REVIEW_TRIGGER=any dependency coordinate other than exactly vue-router@5.2.0
PATCH_REMOVAL_CONDITION=a stable official Vue Router release contains the required causal declaration fix and the unpatched official package passes the canonical Vue typecheck
PATCH_REMOVAL_ATOMIC_SCOPE=patches/vue-router@5.2.0.patch; pnpm-workspace.yaml vue-router@5.2.0 patchedDependencies entry; all vue-router patch path/hash and patch_hash lockfile state
PATCH_STALE_FILE_OR_REGISTRATION=PROHIBITED
PATCH_CARRY_FORWARD_TO_ANOTHER_VERSION=PROHIBITED
UNPATCHED_OFFICIAL_PACKAGE_TYPECHECK_AFTER_REMOVAL=REQUIRED
ALLOW_UNUSED_OR_SILENT_PATCH_FAILURE=PROHIBITED
```

任意 Vue Router Coordinate Change 必须先在当时最新 Official Stable Release 中重新核对上游修复。若已包含所需修复，Version Update 必须与上述 Vue Router Patch File、Registration 和 Lockfile Patch Identity 的删除原子完成，并证明未打补丁的 Official Package 通过 Canonical Vue Typecheck。若新版本未包含修复，不得自动 Carry Forward 旧 Patch；必须通过新的 Explicit Architecture Review 冻结当时的 Exact Published Artifact 与 Minimal Causal Scope。

本 Amendment 只冻结 Existing Router Work Package 的 Dependency Type Compatibility Input。它自身不创建或应用 Patch，不修改 TypeScript Configuration，不准入 Fork、PR Branch、GitHub SHA Dependency、Ambient Replacement、Path Trick 或 Suppression，也不独立激活 Router Runtime。`exactOptionalPropertyTypes=true`、`strict=true` 与有效的 `skipLibCheck=false` 继续是不可削弱的 Canonical TypeScript Quality Bar。其独立 Freeze-time Snapshot 中 Router 为 `TARGET_INACTIVE`、Runtime Kernel 为九步且 Storage 被 Router 阻塞；当前 Router Landing 已按该冻结策略应用精确 Patch，当前状态以 §9、§19.4 与 §37.2.5 为准。

### 9.0.1 Exact Dependency and File-route Generation Target

```text
PACKAGE=vue-router
EXACT_COORDINATE=5.2.0
TYPE_COMPATIBILITY_AMENDMENT=PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT
TYPE_COMPATIBILITY_STRATEGY=EXACT_VERSION_PNPM_DECLARATION_PATCH
WORKSPACE_ADMISSION=root Workspace Catalog
APPS_WEB_CONSUMPTION="vue-router": "catalog:"
VITE_INTEGRATION_IMPORT=vue-router/vite
GENERATED_RUNTIME_ROUTES_IMPORT=vue-router/auto-routes
GENERATED_TYPE_ARTIFACT=apps/web/src/route-map.d.ts
ROUTE_SOURCE_ROOT=apps/web/src/pages
ADMITTED_EXTENSION_SET=.vue only
IMPORT_MODE=asynchronous
VITE_PLUGIN_ORDER=Vue Router Vite plugin before Vue plugin
UNPLUGIN_VUE_ROUTER=PROHIBITED_AND_ABSENT
OFFICIAL_RELEASE_TAG=v5.2.0
OFFICIAL_RELEASE_COMMIT=6e5f8d253b9444a76eb58f176ebe08d686c937cb
OFFICIAL_GENERATED_DTS_SOURCE=packages/router/src/unplugin/codegen/generateDTS.ts
REPOSITORY_AUTHORED_VUE_ROUTER_EXPERIMENTAL_IMPORTS=PROHIBITED
RUNTIME_VUE_ROUTER_EXPERIMENTAL_IMPORTS=PROHIBITED
OFFICIAL_GENERATED_DTS_TYPE_IMPORT_SOURCE=vue-router/experimental
OFFICIAL_GENERATED_DTS_TYPE_IMPORT_SYMBOL_SET=_ExtractParamParserType
OFFICIAL_GENERATED_DTS_TYPE_IMPORT_KIND=import type
OFFICIAL_GENERATED_DTS_TYPE_IMPORT_PROVENANCE=verbatim output of the official vue-router@5.2.0 generator only
OFFICIAL_GENERATED_DTS_TYPE_IMPORT_RUNTIME_ACTIVATION=NONE
OFFICIAL_GENERATED_DTS_MANUAL_PATCH_OR_POST_PROCESSING=PROHIBITED
OFFICIAL_GENERATED_DTS_SECOND_GENERATOR_OR_REPLACEMENT=PROHIBITED
OFFICIAL_GENERATED_DTS_EXCEPTION_IMPORT_DECLARATION_SHAPE_CHANGE=FAIL_AND_REQUIRE_EXPLICIT_ARCHITECTURE_REVIEW
EXPERIMENTAL_DATA_LOADERS=PROHIBITED
EXPERIMENTAL_ROUTER_RESOLVER=PROHIBITED
EXPERIMENTAL_PARAM_PARSERS=PROHIBITED
```

这些值与 `PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT` 在 Amendment Freeze 时只是下一实现包的 Frozen Target；Architecture-only Amendment 自身没有改变 Workspace Catalog、`apps/web/package.json`、Lockfile、Vite Plugin Set、页面目录或生成类型，也没有创建或应用 Dependency Patch。当前 Router Landing 已在同一 Package 中按上述 Amendment 生成并应用精确 Patch；实际 Patch 与 Landing Evidence 由 §37.2.5 记录，冻结策略本身不变。

`vue-router@5.2.0` 的 Official Release Tag `v5.2.0` 指向上方精确 Release Commit。该 Tag 的
`packages/router/src/unplugin/codegen/generateDTS.ts` 与其 Empty Param-parser Test Snapshot 证明：只要保留官方生成类型，Generator 就无条件在 Generated DTS 中写入精确的
`import type { _ExtractParamParserType } from 'vue-router/experimental'`。该 Import 位于 Declaration-only Artifact，TypeScript 不产生 Runtime Import，也不激活 Experimental Router、Data Loader、Router Resolver 或 Param Parser。Official Plugin 中控制是否生成 DTS 及其输出路径的 Public Option 只有 `dts: boolean | string`；不存在既保留 Official Generated Typed Routes 又移除该 Import 的 Supported Configuration，且 `dts=false` 会同时移除本合同要求的 Generated Type Artifact。

因此唯一准入例外只适用于既有 `GENERATED_TYPE_ARTIFACT=apps/web/src/route-map.d.ts` 中由精确 `vue-router@5.2.0` Official Generator 原样产生的上述一个 `import type` Declaration 与一个 `_ExtractParamParserType` Symbol。Repository-authored `.ts`、`.vue`、Vite Config、Script 或其他 Artifact 不得使用该例外；Value Import、Mixed Type/Value Import、Dynamic Import、Side-effect Import、`require()` 与任何 Runtime Use 均继续禁止。Generated DTS 不得手工修改、Post-process、重写、替换或由第二个 Generator 产生。Artifact Path、Import Source、Import Kind、Symbol Set 或 Official Generated DTS Exception Import Declaration Shape 任一变化都必须使 Static Contract 失败，并要求新的显式 Architecture Review，不得自动扩大 Allowlist。

Repository-owned Route Registry 是唯一 Canonical Route Instance Authority。官方 Vue Router File-route Plugin 只能通过其 Supported Route-extension Boundary 消费该 Registry；Generated Route Map、Generated Runtime Routes 与 Generated Types 必须反向验证为同一 Exact Set。页面不得通过 `definePage()` 或 `<route>` 再复制完整 Meta；不得准入第二个 Route Generator。

### 9.0.2 Route Identity and Exact Route Registry

`RouteRegistryRecord.name` 是 Stable Typed Router Identity。`pathPattern` 是独立 URL Authority；`sourcePath` 是独立 Page-source Authority。三者分别全局唯一，不得通过 Runtime String Manipulation 从彼此推导。当前没有独立 `routeId`，也不得添加；先前实施请求中的 Separate Route ID 被本 Amendment 明确替换，因为当前 Canonical Record 与真实 Consumer 均不需要它。

Router Landing 后的 Route Registry Cardinality 精确为 `8`：

| # | `sourcePath` | `name` | `pathPattern` | `paramsSchemaId` | `querySchemaId` | `titleKey` | `telemetryName` | `errorPolicy` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `apps/web/src/pages/index.vue` | `home` | `/` | `route-params.none` | `route-query.none` | `route-title.home` | `route.home` | `route-boundary` |
| 2 | `apps/web/src/pages/error/400.vue` | `error-invalid-route-input` | `/error/400` | `route-params.none` | `route-query.none` | `route-title.error-invalid-route-input` | `route.error.invalid-route-input` | `application-boundary` |
| 3 | `apps/web/src/pages/error/401.vue` | `error-authentication-required` | `/error/401` | `route-params.none` | `route-query.none` | `route-title.error-authentication-required` | `route.error.authentication-required` | `application-boundary` |
| 4 | `apps/web/src/pages/error/403.vue` | `error-permission-denied` | `/error/403` | `route-params.none` | `route-query.none` | `route-title.error-permission-denied` | `route.error.permission-denied` | `application-boundary` |
| 5 | `apps/web/src/pages/[...path].vue` | `error-route-not-found` | `/:path(.*)` | `route-params.not-found-path` | `route-query.none` | `route-title.error-route-not-found` | `route.error.route-not-found` | `application-boundary` |
| 6 | `apps/web/src/pages/error/500.vue` | `error-application-route-failure` | `/error/500` | `route-params.none` | `route-query.none` | `route-title.error-application-route-failure` | `route.error.application-route-failure` | `application-boundary` |
| 7 | `apps/web/src/pages/error/offline.vue` | `error-network-unavailable` | `/error/offline` | `route-params.none` | `route-query.none` | `route-title.error-network-unavailable` | `route.error.network-unavailable` | `application-boundary` |
| 8 | `apps/web/src/pages/error/maintenance.vue` | `error-service-unavailable` | `/error/maintenance` | `route-params.none` | `route-query.none` | `route-title.error-service-unavailable` | `route.error.service-unavailable` | `application-boundary` |

全部八条 Record 的 Common Meta 精确为：

```text
breadcrumbKey=null
layout=reading
layoutCapabilityId=route-layout.reading-document
auth=public
requiredPermissionIds=[]
blockScrollOwnerId=document-block
inlineScrollOwnerId=document-inline
keepAlive=never
dataPrefetch=none
unsavedChangesPolicy=none
focusContractId=route-focus.primary-heading
scrollRestorationPolicyId=route-scroll.document-history
```

全部八个 Page Contract 必须包含恰好一个 Semantic `main` 与一个携带 `data-route-focus="primary-heading"` 的 Primary `h1`。这不创建 Shared UI、App Shell 或 Layout Admin。

### 9.0.3 Exact Meta and Reference Registries

`ValidatedRouteMeta` 的 Frozen Target Shape 精确增加 Focus 与 Scroll Restoration Reference：

```ts
interface ValidatedRouteMeta {
  titleKey: string
  breadcrumbKey: string | null
  layout: 'reading' | 'workspace' | 'focused-task'
  layoutCapabilityId: string
  auth: RouteAuthPolicy
  requiredPermissionIds: readonly string[]
  blockScrollOwnerId: string
  inlineScrollOwnerId: string
  keepAlive: RouteKeepAlivePolicy
  telemetryName: string
  dataPrefetch: RouteDataPrefetchPolicy
  errorPolicy: RouteErrorPolicy
  unsavedChangesPolicy: 'none' | 'confirm-before-leave'
  focusContractId: string
  scrollRestorationPolicyId: string
}
```

Current Auth Projection：

```text
ACTIVE_AUTH_SUBSET=public
SCHEMA_AVAILABLE_BUT_INACTIVE=anonymous-only,required
```

`anonymous-only` 在 Auth and Session Package 前不得激活。`unknown/restoring` Identity 不得视为 Anonymous；Router Package 不得创建 Session Placeholder、No-op Identity Provider 或 Unconditional Anonymous Guard。

Current Data Prefetch Projection：

```text
ACTIVE_DATA_PREFETCH_SUBSET=none
INACTIVE_DATA_PREFETCH_SUBSET=blocking-required,non-blocking
```

Built-in Router Title Registry 精确为：

| Key | Default English text |
| --- | --- |
| `route-title.home` | `Progressive Adaptive Vue Platform` |
| `route-title.error-invalid-route-input` | `Invalid address` |
| `route-title.error-authentication-required` | `Authentication required` |
| `route-title.error-permission-denied` | `Access denied` |
| `route-title.error-route-not-found` | `Page not found` |
| `route-title.error-application-route-failure` | `Page unavailable` |
| `route-title.error-network-unavailable` | `Offline` |
| `route-title.error-service-unavailable` | `Service unavailable` |

Built-in Router Message Registry 精确为：

| Key | Default English text |
| --- | --- |
| `route-message.home-summary` | `Phase 1A token contract and deterministic build foundation.` |
| `route-message.error-invalid-route-input` | `The requested address contains invalid information.` |
| `route-message.error-authentication-required` | `Authentication is required to continue.` |
| `route-message.error-permission-denied` | `You do not have permission to view this page.` |
| `route-message.error-route-not-found` | `The requested page was not found.` |
| `route-message.error-application-route-failure` | `The application could not open this page.` |
| `route-message.error-network-unavailable` | `This page is unavailable while the device is offline.` |
| `route-message.error-service-unavailable` | `This service is temporarily unavailable.` |

Title 与 Message Table 是临时 Built-in Router Authority，语义上等同于现有 Built-in Core Error Message Table 的窄边界。它们不准入 Vue I18n、Locale Loading、Locale Persistence 或 Remote Copy。Future I18n Admission 可以原子替换 Presentation Source，但必须保持 Typed Key。

Telemetry-name Registry 精确为 Route Registry 中的八个 `telemetryName`，不增加独立 Literal Consumer。Breadcrumb Registry 的当前 Active Set 为空，因为八条 Record 的 `breadcrumbKey` 均为 `null`。

### 9.0.4 Exact Params and Query Schema Registries

Params Schema Registry Cardinality 精确为 `2`：

```text
route-params.none
  strict empty object
  any Param key fails

route-params.not-found-path
  strict object containing exactly one required normalized string field named path
  path is validated but must never be displayed, logged, placed in telemetry,
  placed in an error message or copied into another state owner
```

Query Schema Registry Cardinality 精确为 `1`：

```text
route-query.none
  strict empty object
  any Query key fails
  duplicate Query key fails
  array value fails
  unknown value fails
  non-empty raw search fails as invalid-input
```

当前 Route 不准入任何 Query Value，也不准入 Non-empty URL Hash。Invalid Input 必须解析为 Typed `error-invalid-route-input` Destination，不得静默规范化为 Valid Application Route。Failure Handling 必须从 Safe Destination 移除被拒绝的 Raw Input，且不得 Echo Full URL、Raw Path、Param、Query 或 Hash。

### 9.0.5 Exact Error Route and Router Error Registries

Error Route Registry Cardinality 精确为 `7`：

| Code | Category | Exact Route Name |
| --- | --- | --- |
| `400` | `invalid-route-input` | `error-invalid-route-input` |
| `401` | `authentication-required` | `error-authentication-required` |
| `403` | `permission-denied` | `error-permission-denied` |
| `404` | `route-not-found` | `error-route-not-found` |
| `500` | `application-route-failure` | `error-application-route-failure` |
| `offline` | `network-unavailable` | `error-network-unavailable` |
| `maintenance` | `service-unavailable` | `error-service-unavailable` |

401、403 与 Maintenance Route 是 Public Infrastructure Destination；它们的存在不激活 Auth、Permission、Session、API 或 Maintenance Detection。

Router Error Registry Extension 已在 Router Landing 中精确增加六条 Active Record；现有四条 Core Error Registry 保持独立且不变，Application-owned combined projection 精确为十条：

| `id` | `category` | `userMessageKey` | `recoverability` | `retryOwner` | `reportLevel` | `safeRoute` |
| --- | --- | --- | --- | --- | --- | --- |
| `route-input-validation-failure` | `validation` | `router-error.route-input-validation-failure` | `none` | `none` | `error` | `error-invalid-route-input` |
| `route-not-found` | `navigation` | `router-error.route-not-found` | `none` | `none` | `error` | `error-route-not-found` |
| `route-navigation-failure` | `navigation` | `router-error.route-navigation-failure` | `none` | `none` | `error` | `error-application-route-failure` |
| `route-chunk-load-failure` | `chunk-load` | `router-error.route-chunk-load-failure` | `reload-application` | `user` | `error` | `error-network-unavailable` when the browser explicitly reports offline; otherwise `error-application-route-failure` |
| `route-disposal-failure` | `navigation` | `router-error.route-disposal-failure` | `reload-application` | `user` | `fatal` | `error-application-route-failure` |
| `route-redirect-loop` | `navigation` | `router-error.route-redirect-loop` | `none` | `none` | `error` | `error-application-route-failure` |

Exact Router Error Safe Context Field Union：

```text
navigationId
routeName
failureKind
releaseSha
buildVersion
controlledReloadUsed
```

§20B.1 的完整 Core Prohibited-context Set 保持不变。Full URL、Raw Path、Raw Params、Raw Query、Hash、User Input、DOM Text、Raw Cause、Raw Message、Raw Stack、Component Instance 与 Component Props 全部禁止。

Application Mount 前发生的 Router Creation 或 Initial-navigation Failure 必须恰好一次规范化为现有 `application-startup-failure`，且 `bootstrapStepId=create-and-ready-router`。它不得同时创建 Router Error Record。现有 Fatal Startup Recovery 与用户显式 Browser Reload 是唯一 Startup Recovery；不得创建第二个 Startup Recovery State、Error ID 或 Fatal Boundary。

### 9.0.6 Exact Layout, Scroll and Focus Registries

Current Router Layout Capability Registry 精确包含一条 Record：

```text
id=route-layout.reading-document
layout=reading
shellRequired=false
renderOwner=route-component
blockScrollOwnerId=document-block
inlineScrollOwnerId=document-inline
requiredShellRegionIds=[]
optionalShellRegionIds=[]
movablePanelIds=[]
resizableRegionIds=[]
capabilityStatus=ACTIVE
```

该 Narrow Record 不激活 App Shell、Layout Admin、Sidebar、Header、Footer、Panel Movement、Panel Resizing、Layout Preference Persistence、Responsive Shell Projection 或 Shared UI。§18 的 Full Future Layout Capability Registry 保持 Inactive。

Scroll Owner Registry 精确为：

| `id` | `axis` | `ownerKind` | `ownerTarget` | `nativeScrolling` |
| --- | --- | --- | --- | --- |
| `document-block` | `block` | `document` | `document.scrollingElement` | `true` |
| `document-inline` | `inline` | `document` | `document.scrollingElement` | `true` |

Scroll Restoration Policy Registry 精确包含一条 Record：

```text
id=route-scroll.document-history
historyTraversal=restore the finite saved native block and inline offsets for the exact matching owner
newNavigation=logical block start and logical inline start
missingOrChangedOwner=logical start
ownerReadiness=after the routed DOM is committed
arbitraryTimeout=PROHIBITED
polling=PROHIBITED
customScroller=PROHIBITED
scrollHijacking=PROHIBITED
```

Focus Contract Registry 精确包含一条 Record：

```text
id=route-focus.primary-heading
target=the route component's single h1 carrying data-route-focus="primary-heading"
targetTabIndex=-1
timing=after routed DOM commit without arbitrary timeout
focusBehavior=focus with preventScroll, then apply the registered Scroll Restoration policy
successfulNavigation=transfer focus to the target
cancelledOrFailedNavigation=preserve or restore the previous valid focus
missingTarget=typed navigation failure; do not silently focus body
visibleFocus=preserved through existing semantic focus tokens
```

### 9.0.7 Active Guard Projection and Typed Navigation Result

Current Guard Pipeline 是 §9.5 Existing Eleven-stage Target Pipeline 的精确 Active Projection。Router Landing 只激活以下五个 Stage，顺序不可变：

1. `validate-route-contract`
2. `ensure-runtime-configuration-ready`
3. `resolve-router-owned-safe-destination`
4. `prepare-route-presentation`
5. `commit-focus-and-scroll`

职责精确为：

| Stage | Responsibility |
| --- | --- |
| `validate-route-contract` | Validate generated membership, exact Route Registry equality, Params, Query and current empty Dynamic Route membership. |
| `ensure-runtime-configuration-ready` | Consume the already validated Runtime Configuration; do not reload or mutate it. |
| `resolve-router-owned-safe-destination` | Accept only typed destinations from the exact Route and Error Route registries; reject raw names, raw paths and arbitrary URLs. |
| `prepare-route-presentation` | Resolve title, null breadcrumb, layout, scroll owners, focus contract and telemetry name. |
| `commit-focus-and-scroll` | Commit the successful navigation result, title, focus and native scroll restoration. |

以下 Target Stage 在其 Owner Package 前保持 Inactive，且不得创建 Placeholder 或称为 No-op Guard：

```text
unsaved-change resolution
Session restoration
anonymous-only evaluation
required-auth evaluation
Permission evaluation
Query prefetch orchestration
Auth Return URL restoration
```

Typed Navigation Result Union 精确为：

```text
allow
  contains navigationId and the validated typed destination

redirect
  contains navigationId, a registered reason, a typed registered destination and replace=true

cancel
  contains navigationId and a registered cancellation reason

failure
  contains navigationId, an exact Router Error ID and an exact safe Error Route destination
```

Current Active Navigation Outcome Subset 精确为：

| Outcome | Typed result semantics |
| --- | --- |
| `duplicated` | No-op result; not an Error. |
| `cancelled-by-new-navigation` | Registered Cancellation; returns `cancel`. |
| `redirected` | Registered Redirect; returns `redirect`. |
| `invalid-input` | Router Failure resolving to the typed 400 destination. |
| `chunk-load-failed` | Router Failure resolving to Offline when the browser explicitly reports offline, otherwise 500. |
| `route-disposal-failed` | Router Failure resolving to 500. |
| `redirect-loop` | Router Failure resolving to 500. |
| `unknown-navigation-failure` | Router Failure resolving to 500. |

以下 Target Categories 保持 Inactive，直到各自 Owner Package 存在：

```text
cancelled-by-user
aborted-by-guard
unauthenticated
unauthorized
prefetch-failed
```

`redirect-loop` 是 Safe Redirect Contract 已使用的 Failure Category，本 Amendment 将它加入 Canonical Navigation Failure Set。

### 9.0.8 Redirect, Safe Return URL and Dynamic Route State

```text
ACTIVE_REDIRECT_REGISTRY=[]
ACTIVE_SAFE_RETURN_URL_CONTRACT=INACTIVE
ACTIVE_DYNAMIC_ROUTE_REGISTRY=[]
```

空 Registry 是 Exact Canonical Result，不是 Missing Contract。Router Landing 不得创建 Dynamic Route Manager、`addRoute()` Wrapper、Remote Route Loader、Empty Disposal-handle Factory、Auth Return URL Helper 或 Dynamic-route Placeholder。Future Dynamic-route Admission 必须把一个真实 Local Pre-bundled Record 与其 Idempotent Disposal Handle 原子加入。

### 9.0.9 Chunk-load Recovery Deferral

Current Router Landing 只分类 Chunk-load Failure，并选择 Offline 或 500 Error Route。它不得直接 Fetch Runtime Configuration、比较新取得的 Server Release 或执行 Automatic Reload。§9.8 的 Release-comparison 与 Single Controlled Automatic Reload Target 保持 Inactive，直到 `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` 准入 Exact Current-server-release Authority。

`navigator.onLine === false` 可以选择 Offline Destination，但不得描述为 Authoritative Network Diagnosis。Router Error Safe Context 中的 `controlledReloadUsed` 在当前 Landing 必须保持 `false`；它只为 Future Release-aware Extension 保留已冻结 Field Identity，不授权当前 Reload。

### 9.0.10 Runtime Kernel Extension

Router Landing 对 Runtime Kernel 只增加一个 Exact Step：

```text
stepId=create-and-ready-router
targetPosition=after install-platform-providers and before mount-application
dependencies=validate-build-and-runtime-configuration,create-vue-application,install-platform-providers
CreateInput=validated CoreRuntimeConfiguration, unmounted Vue App, generated routes, exact Router registries, Router/Core error normalization boundary, startupAttemptId
CreateOutput=one RouterLifecycleHandle containing the sole Router instance, sole Web History instance, exact guard removers, exact error-handler remover and one idempotent disposer
Ready=create Web History from validated deploymentBase; create Router; install Router error handling and the exact active Guard projection; install Router into the unmounted Vue App; trigger initial navigation; await router.isReady successfully; application remains unmounted
Dispose=remove exact Router hooks, destroy the exact History instance once, release Router references and leave no active navigation listener
DOMMountOwner=NO
Failure=application-startup-failure
RetryParticipant=YES with a fresh Router and fresh History
OwnFailureEligibleForConfigurationRetry=NO
HMR=Runtime Kernel remains the sole top-level HMR owner; every full HMR attempt disposes and recreates Router and History; official generated file-route HMR is not an application lifecycle owner and may not register a competing repository-owned top-level HMR hook
```

Current Post-Router Bootstrap Order 精确为十步：

1. `validate-build-and-runtime-configuration`
2. `install-pre-vue-global-failure-capture`
3. `initialize-design-system-and-resolve-first-paint-handoff`
4. `create-vue-application`
5. `create-pinia`
6. `install-platform-providers`
7. `create-and-ready-router`
8. `mount-application`
9. `register-post-mount-appearance-media-subscriptions`
10. `publish-application-ready`

Current `mount-application` 依赖 `create-and-ready-router`。Router Landing 只把原九步 Kernel 原子扩展为上述十步。Current Reverse Disposal 依次 Dispose/Release：Ready Publication、Post-mount Appearance Listeners、Mounted Vue Application、Router/History、Platform Providers、Pinia、Unmounted Vue Application Reference、Design System Handoff、Global Capture、Runtime Configuration Resources。Cleanup Failure 后继续其余 Cleanup；Router Hook Removal 与 History Destruction 必须幂等。Runtime Kernel 继续是 Sole Mount、Disposal 与 Top-level HMR Owner。

### 9.0.11 Exact Implementation-gate Counts

```text
ROUTE_REGISTRY_RECORDS=8
ERROR_ROUTE_REGISTRY_RECORDS=7
ROUTE_TITLE_RECORDS=8
ROUTE_MESSAGE_RECORDS=8
TELEMETRY_NAME_RECORDS=8
PARAMS_SCHEMAS=2
QUERY_SCHEMAS=1
ROUTER_LAYOUT_CAPABILITY_RECORDS=1
SCROLL_OWNER_RECORDS=2
SCROLL_RESTORATION_POLICIES=1
FOCUS_CONTRACTS=1
ACTIVE_GUARD_STAGES=5
ACTIVE_REDIRECT_RECORDS=0
ACTIVE_DYNAMIC_ROUTE_RECORDS=0
ROUTER_ERROR_RECORDS=6
COMBINED_CORE_PLUS_ROUTER_ERROR_RECORDS=10
CURRENT_BOOTSTRAP_STEPS=10
ACTIVE_AUTH_VALUES=1, exactly public
ACTIVE_DATA_PREFETCH_VALUES=1, exactly none
```

### 9.0.12 Router Static-enforcement Contract

Router Implementation 必须通过 Existing Static Owners 的最小 Domain-owned Extension 证明：

* Exact `vue-router@5.2.0` 通过 Root Workspace Catalog 准入，且 `apps/web` 只使用 `catalog:`；任意其他 Coordinate 失败。
* `PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT` 的 Patch Registration 只能是 Root `pnpm-workspace.yaml` 中的 `vue-router@5.2.0: patches/vue-router@5.2.0.patch`；Patch File 必须 Tracked，`allowUnusedPatches` 与 `ignorePatchFailures` 必须都精确为 `false`，并且 Workspace、Lockfile Path/Hash、所有 Resolved Patched Snapshot 与真实 Patch Content 必须 Exact Equality。
* Patch 必须可以成功应用于 Exact Official npm `vue-router@5.2.0` Published Artifact `dist/index-BN0B0y8a.d.ts`，并且只有一个 File、一个 Hunk 和 Amendment 冻结的三个 Type-annotation Replacement；任意 JavaScript、Package Metadata、第二个 File/Hunk 或 Additional Declaration Change 失败。
* Compatibility Probe 必须证明未打补丁的精确 Official Artifact 在 Canonical `exactOptionalPropertyTypes=true`、有效 `skipLibCheck=false` 下重现 Amendment 冻结的两条 TS2430，并证明 Patched Artifact 移除该 Incompatibility；任意 TypeScript Policy Weakening、Diagnostic Suppression、Ambient Replacement、Path/Resolution Trick 或 Fork 失败。
* Patch Provenance 必须指向 Reviewed Official `vuejs/router#2634` 与 Amendment 冻结的 Head SHA，但 Patch Payload 必须等于 PAVP 三行 Minimal Causal Scope，不得等于或扩大到完整 PR Diff。
* 任意 Package Version Change 必须阻塞 Install/Static Gate 并触发 Patch Removal Review；已包含修复的 Official Stable Upgrade 必须原子删除 Vue Router Patch File、Registration 与 Lockfile Patch Identity，且 Unpatched Official Package 必须通过 Canonical Vue Typecheck。
* `unplugin-vue-router`、全部 Repository-authored Experimental Router Import 与全部 Runtime Experimental Router Import 均不存在。
* `apps/web/src/route-map.d.ts` 中只允许 §9.0.1 冻结的一个 Official Generated `ImportDeclaration`：整个 Declaration 精确为 `import type`，Import Source 精确为 `vue-router/experimental`，且只有一个 Named Specifier，其 Imported Name 与 Local Name 均精确为 `_ExtractParamParserType`；Default、Namespace、Value、Mixed Type/Value、Side-effect、Dynamic 与 `require()` Form 全部禁止。
* Exact Coordinate、Official Plugin Configuration 与 Canonical Route Input 相同时，Committed Generated DTS 必须等于 Official Generator 的重新生成结果；不得出现其他 Experimental Import、Manual Mutation、Post-processing、Replacement 或第二个 Generator。
* 只有一个 Route Source Root，且只准入 `.vue`。
* Source File Set、Canonical Route Registry、Generated Route Map 与 Generated Typed Map Exact Equality。
* 八个 Route Name、Path 与 Source Path 分别精确、唯一，且不存在 Separate `routeId`。
* Exact Meta Field Set、Reference Closure、Strict Params/Query Schema Closure。
* 七个 Exact Error Route，以及 Title、Message、Telemetry、Layout、Scroll 与 Focus Registry Closure。
* Active Auth Subset 精确为 `public`；Active `dataPrefetch` Subset 精确为 `none`。
* Active Redirect 与 Dynamic Route Registry 精确为空。
* 不存在 Placeholder Guard、Provider、Redirect 或 Dynamic-route Manager。
* Current Guard Projection 精确为五步且顺序一致。
* Typed Navigation Result 与 Exact Failure Classification 闭合。
* 只有 Router Owner 注册 Global Router Hook。
* Router History 只使用已验证 `deploymentBase`。
* `router.isReady()` 在 Mount 前成功；Initial-navigation Failure 阻止 Mount，并只产生一个 Existing `application-startup-failure`。
* Current Kernel 精确十步、Dependency Graph Acyclic、Router Authority 与 History Authority 各一个。
* History Destruction 与 Hook Removal 幂等；Runtime Kernel 仍为 Sole Mount、Disposal 与 Top-level HMR Owner。
* 不准入 Direct Fetch、Server-state Cache、Storage、Query、Auth、Session、Permission、I18n、Observability、Deployment Provider、Shared UI、App Shell、Business Route、Test 或 Browser Infrastructure。
* 当前 Package 5 Appearance 与 Router 以外的既有 Runtime Kernel Behavior 保持不变。

这些 Enforcement Target 在 Documentation Amendment Freeze 时保持 `TARGET_INACTIVE`；本 Documentation Amendment 自身不实现或激活 Checker。它们现已由 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 通过 Existing Static Owners 和 `check:arch` 原子激活。

## 9.1 File Routes and Exact Route Registry

当前实现使用 §9.0.1 冻结的 Vue Router `5.2.0` Stable File Routes。Route Source Set 只允许 §9.0.2 的八个 Exact `.vue` Source；先前 Settings/Projects 示例不构成 Current Record，也不准入 Business Route。

Generated Route Map 必须产出 Exact Typed Route Registry：

```ts
interface RouteRegistryRecord {
  name: string
  pathPattern: string
  sourcePath: string
  meta: ValidatedRouteMeta
  paramsSchemaId: string | null
  querySchemaId: string | null
  capabilityStatus: CapabilityStatus
}
```

Route Name 只能来自该 Registry。§9.0.2 冻结的八条 Route Record 已由 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 原子实现并标为 `ACTIVE`；它们构成当前 Source、Generated Artifact 与 Runtime Route Set。页面、Feature、Redirect、Telemetry、Breadcrumb 和 Permission Rule 不得复制任意 Route Name 或 Path Literal。Missing、Duplicate、Unknown Name、Path Collision、未注册 Meta、未绑定 Params/Query Schema 或 Registry/Generated Route Set 差异必须使 Router Generation Failure。

页面只负责：

* Route 数据边界与 Feature 组合。
* Layout Capability 和精确 Scroll Owner 声明。
* 页面级 Loading、Error、Empty、Partial、Stale 与 Offline State 组合。
* Title、Breadcrumb 和 Route Meta 引用。
* 从 Query Cache 读取当前 Route 所需 Server State。

页面不得包含直接 Fetch、通用表单/表格引擎、主题生成逻辑、第三方 UI、可复用业务逻辑、Session 恢复、Permission 计算或 Router Guard 实现。

## 9.2 Validated Route Meta

Route Meta 使用 Strict Schema，并在构建时对全部 File Route 执行 Exact Validation：

```ts
type RouteAuthPolicy = 'public' | 'anonymous-only' | 'required'
type RouteKeepAlivePolicy = 'never' | 'route-instance'
type RouteDataPrefetchPolicy = 'none' | 'blocking-required' | 'non-blocking'
type RouteErrorPolicy =
  | 'route-boundary'
  | 'application-boundary'
  | 'fatal-startup-boundary'

interface ValidatedRouteMeta {
  titleKey: string
  breadcrumbKey: string | null
  layout: 'reading' | 'workspace' | 'focused-task'
  layoutCapabilityId: string
  auth: RouteAuthPolicy
  requiredPermissionIds: readonly string[]
  blockScrollOwnerId: string
  inlineScrollOwnerId: string
  keepAlive: RouteKeepAlivePolicy
  telemetryName: string
  dataPrefetch: RouteDataPrefetchPolicy
  errorPolicy: RouteErrorPolicy
  unsavedChangesPolicy: 'none' | 'confirm-before-leave'
  focusContractId: string
  scrollRestorationPolicyId: string
}
```

`titleKey`、`breadcrumbKey`、`layoutCapabilityId`、Scroll Owner、Permission ID 和 Telemetry Name 必须引用各自 Registry，不能由页面发明。Keep Alive 只缓存明确的 Route Instance，不能隐式缓存 Session、Query Data、Form Secret 或 DOM Side Effect。Route Disposal 时必须清理 Subscription、Abort Controller、Observer、Timer、Focus Trap、Scroll Lock 和页面本地 Draft Handle。

## 9.3 Bootstrap and History

Router Implementation 必须：

1. 从已验证 Runtime Configuration 获取 `deploymentBase`。
2. 使用与 Vite Asset Base 相同的 Canonical Base Authority 创建 History。
3. 安装 Error Handler 和 Guard Pipeline 后才触发 Initial Navigation。
4. 在 `router.isReady()` 成功后才允许 Application Mount。
5. Initial Navigation 失败时进入命名 Startup Recovery，不得挂载半初始化 Shell。

Router 首次实现只支持当前 Exact Root `/`。未来 `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` 原子准入 Subpath 后，Root-only 与 Subpath Deployment 必须通过同一 Base Authority；页面和 Router Config 不得硬编码 `/`、`/app/` 或环境路径。

## 9.4 Params and Query Boundary

每个 Dynamic Param 和业务 Query 必须有 Strict Domain Schema。解析顺序固定为：

```text
raw URL
→ generated route match
→ duplicate-aware query parse
→ route-owned Zod params/query validation
→ canonical normalized value
→ route component props and Query Key
```

禁止 Component 直接读取未经验证的 `route.params` 或 `route.query`。缺失、重复、Unknown、格式错误或超限字段根据 Route Contract 精确映射为 400 或 404；不得静默使用页面默认值。Canonical URL Rewrite 只能在验证成功、不会丢失用户输入且不会形成 Redirect Loop 时执行。

## 9.5 Ordered Guard Pipeline

每次 Navigation 具有唯一 `navigationId`。新 Navigation 必须取消旧 Navigation 的 Prefetch 和可取消 Side Effect。Guard 顺序固定为：

1. Generated Route、Params、Query 与 Dynamic Route Membership Validation。
2. Current Route Unsaved-change Resolution；拒绝离开时不启动目标 Route Side Effect。
3. Runtime Configuration Readiness。
4. Session Restoration Completion；`unknown/restoring` 不得被当作 Anonymous。
5. `anonymous-only` Policy。
6. `required` Authentication Policy。
7. Permission Registry Authorization。
8. Safe Return URL 与 Canonical Redirect Resolution。
9. TanStack Query Prefetch Orchestration。
10. Title、Breadcrumb、Layout、Scroll 和 Telemetry Preparation。
11. Navigation Commit、Focus Transfer 与 Scroll Restoration。

Guard 只能返回 Typed Allow、Redirect、Cancel 或 Failure Result。Guard 不得写 Query Cache、复制 Server State、直接读取 Cookie、执行通用 Fetch、弹出任意 UI 或吞掉 Failure。

## 9.6 Safe Return URL and Redirects

Return URL 必须由 Router Registry 编码为 `{ routeName, params, query }` Typed Object，重新验证后恢复。任意字符串 URL 必须满足 Same-origin、Canonical Base、Allowed Protocol 和 Registered Route；External URL、Protocol-relative URL、Encoded Scheme、Credential URL、Control Character 与 Nested Redirect 均拒绝。每次 Navigation 最多经过一个 Auth Redirect 和一个 Canonicalization Redirect；超过上限进入 `redirect-loop` Failure。

## 9.7 Error Routes and Navigation Failure

Exact Error Route Registry 必须包含：

```text
400 invalid-route-input
401 authentication-required
403 permission-denied
404 route-not-found
500 application-route-failure
offline network-unavailable
maintenance service-unavailable
```

401 表示缺少或失效身份，403 表示身份有效但权限不足。Offline 与 Maintenance 不能伪装为 500。Error Route 不回显敏感 Params、Query、Server Body、Token 或内部 Stack。

Navigation Failure 分类固定为：

```text
duplicated
cancelled-by-new-navigation
cancelled-by-user
aborted-by-guard
redirected
invalid-input
unauthenticated
unauthorized
prefetch-failed
chunk-load-failed
route-disposal-failed
redirect-loop
unknown-navigation-failure
```

`duplicated` 是无操作结果；Cancellation 不作为错误上报；其余 Failure 进入 Error Registry 和 Observability Contract。不得按任意 Error Message 字符串分类。

## 9.8 Chunk-load and Release Recovery

Release-aware Chunk Load Recovery 的完整 Target 必须先比较当前 HTML Release 与请求 Asset Release。每个 `releaseSha + routeName` 在单次 Application Session 中最多允许一次受控 Reload；Reload 后仍失败、无法识别 Release 或浏览器离线时进入对应 Error Route。禁止无限 Reload、Timer Retry、清空全部 Storage 或绕过 Service/HTTP Cache Contract。该 Target 按 §9.0.9 保持 Inactive，直到 `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` 准入 Exact Current-server-release Authority；首次 Router Landing 只分类 Failure 并选择 Offline 或 500 Destination，不 Fetch、比较 Server Release 或 Automatic Reload。

## 9.9 Dynamic Routes

Dynamic Route 只有在以下条件全部满足后准入：

1. 来源是已验证、版本化的 Route Capability Registry。
2. Route Name、Meta、Params、Query、Permission 和 Layout Contract 全部通过 Exact Validation。
3. 注册 Owner 返回显式 Disposal Handle。
4. Session Principal、Tenant 或 Capability 变化时先取消 Navigation/Query，再移除全部失效 Route。

Logout、Revocation、Account Switch 和 Tenant Switch 必须移除其 Dynamic Routes。业务 Payload 不得直接成为 Route Definition。

## 9.10 Query, Cancellation and Disposal

Router 拥有 Navigation 与 Route Lifecycle；TanStack Query 拥有 Server State Cache、Deduplication、Staleness、Retry 和 Invalidation。Router Experimental Data Loaders、Repository-authored 或 Runtime `vue-router/experimental` Use 和第二个 Server State Cache 默认 `PROHIBITED`。§9.0.1 唯一 Official Generated DTS Type-only Import 是被 TypeScript 擦除的 Declaration Projection，不构成 Experimental Capability Activation，也不授权任何 Repository-authored 或 Runtime Experimental Import。

Blocking Prefetch 只调用 Feature 提供的 Typed Query Options，并传递 TanStack Query 的 `AbortSignal`。Navigation Cancel、Route Disposal、Logout 和 Account Switch 必须取消相关 In-flight Query；已缓存且仍属于同一 Principal/Tenant 的数据由 Query Policy 决定是否保留。Router 不把 Query Result 复制到 Meta、Pinia、History State 或 Local Storage。

## 9.11 Scroll, Focus and Observability

Scroll Restoration 使用 §18.6 的 Exact Per-axis Owner。History Entry 只保存 Registry Owner ID 和有限数值 Offset；Owner 不存在、Layout Profile 变化或内容未就绪时按 Route Scroll Policy 回到 Logical Start。Dialog/Sheet Background Lock 与 Route Restoration 不得竞争。

成功 Navigation 必须把 Focus 移到 Route 声明的 Landmark 或 Heading；Error/Cancel 保留或恢复原 Focus。每次 Navigation 记录 Privacy-safe `navigationId`、From/To Telemetry Name、Release SHA、Duration、Outcome 和 Failure Category，不记录完整 URL、敏感 Query 或用户输入。

Current Router Landing 只激活 §9.0.6 的 Narrow Scroll/Focus Contract，并在 Route Registry 中解析
`telemetryName`；本节的 Navigation Event Recording、Duration、From/To Projection 与 Reporting 仍为
`PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION` 的 Target Contract，当前不得记录、发送或创建
Placeholder Observability Provider。

## 9.12 Router Static Enforcement Contract

```text
CAPABILITY_STATUS=ACTIVE
```

Owning Implementation Package 必须把以下检查接入 `pnpm verify`：

* File Route Set = Generated Route Registry Set。
* Route Name、Meta、Permission、Layout、Scroll、I18n 和 Telemetry Registry Reference 完整。
* Exact Vue Router Dependency Declaration Patch 只能等于 `PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT` 冻结的 Package、Version、Selector、Path、Artifact、一个 Hunk 与三个 Replacement；不得改变 Runtime JavaScript、Package Metadata、Generated Route Artifact 或 TypeScript Policy。
* 禁止任意 Route Name/Path Literal、未经验证的 Params/Query、Experimental Data Loader Import、Router Resolver、Param Parser Activation，以及 Repository-owned Source、Config、Generated Artifact 或 Runtime Module Graph 中除 §9.0.1 Exact Official Generated DTS Type-only Import 外的任何 `vue-router/experimental` Import 或 Use；Dependency-owned Declaration 不属于 Repository-authored Artifact。
* Exact Official Generated DTS Exception 必须按 Artifact Path、Import Source、Import Kind、Symbol Set、Official Generator Provenance 与 Exception Import Declaration AST Shape 验证；任何 Generated DTS Manual Patch、Post-processing、Replacement、第二个 Generator 或 Exception Import Declaration Shape Drift 都失败。该禁止项不得误伤上述唯一精确 Dependency-owned Published Declaration Patch，也不得被扩大为第二个 Patch Exception。
* Guard Order、Error Route Set、Dynamic Route Disposal 与 Query Ownership 具有静态合同。
* Vite Base、Router History Base 和 Deployment Base 使用同一 Runtime Configuration Authority。
* 不存在页面直接 Fetch、页面 Session 恢复、Query Data 复制或任意 Scroll Owner。

这些检查已由 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 接入 Existing `check:arch`、Project Configuration、Runtime Kernel 和 Bundle Owners。它们只证明本节冻结的静态合同；不证明 Navigation、Scroll、Focus、History Teardown、HMR 或 Chunk Recovery 的真实浏览器行为。

---

# 10. Design System Package

Phase-gated Design System Ownership Map：

```text
packages/design-system/
├── tokens/
│   ├── primitive/
│   │   ├── color.tokens.json
│   │   ├── dimension.tokens.json
│   │   ├── typography.tokens.json
│   │   ├── radius.tokens.json
│   │   ├── elevation.tokens.json
│   │   ├── motion.tokens.json
│   │   └── z-index.tokens.json
│   │
│   ├── semantic/
│   │   ├── color.tokens.json
│   │   ├── spacing.tokens.json
│   │   ├── typography.tokens.json
│   │   ├── interaction.tokens.json
│   │   ├── layout.tokens.json
│   │   └── material.tokens.json              [Phase 1; demand-created with an admitted Material Role]
│   │
│   ├── density/
│   │   ├── compact.tokens.json
│   │   ├── comfortable.tokens.json
│   │   └── spacious.tokens.json
│   │
│   ├── themes/
│   │   ├── neutral.theme.json                 [read-only legacy migration evidence]
│   │   ├── ocean.theme.json                   [read-only legacy migration evidence]
│   │   ├── warm.theme.json                    [read-only legacy migration evidence]
│   │   └── complete/                          [active Built-in Theme sources]
│   │       ├── neutral.theme.json
│   │       ├── ocean.theme.json
│   │       └── warm.theme.json
│   │
│   └── component/
│       └── README.md
│
├── src/
│   ├── schema/
│   │   ├── token.schema.ts
│   │   ├── legacy-seed-theme.schema.ts
│   │   ├── appearance.schema.ts
│   │   ├── complete-theme.schema.ts
│   │   └── preference.schema.ts
│   │
│   ├── build/
│   │   ├── preprocess.ts
│   │   ├── resolve.ts
│   │   ├── color.ts
│   │   ├── contrast.ts
│   │   ├── formats/
│   │   └── build.ts
│   │
│   ├── runtime/
│   │   ├── appearance-defaults.ts
│   │   ├── resolve-color-mode.ts
│   │   ├── resolve-material.ts
│   │   ├── apply-appearance.ts
│   │   ├── preference-migration.ts
│   │   └── theme-registry.ts
│   │
│   ├── unocss/
│   │   ├── preset.ts
│   │   ├── shortcuts.ts
│   │   ├── rules.ts
│   │   └── theme.ts
│   │
│   ├── generated/
│   │   ├── tokens.css
│   │   ├── critical-theme.css
│   │   ├── appearance-init.js
│   │   ├── tokens.ts
│   │   ├── token-names.ts
│   │   ├── theme-registry.ts
│   │   ├── unocss-theme.ts
│   │   └── tokens.manifest.json
│   │
│   └── index.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

`material.tokens.json`、Package 5 Runtime 与 Generated Registry 均已位于上述固定位置。Generator Visibility 与 Selector 合同继续先于任何未来 Material Token Source 扩展实现。

---

# 11. Token 模型

```text
Primitive Tokens
        ↓
Semantic Tokens
        ↓
Demand-driven Component Tokens
        ↓
Generated CSS Variables
        ↓
UnoCSS / UI / Application
```

## 11.1 Primitive Token

```text
color.palette.blue.500
color.palette.neutral.950
dimension.space.4
dimension.control.md
radius.md
font.size.md
motion.duration.fast
```

Primitive Token：

* 只供构建系统消费。
* 不直接暴露给页面。
* 不成为业务语义。
* 不应全部输出为运行时 CSS Variable。

## 11.2 Semantic Token

当前 Active Public Semantic Token 的唯一精确、可机读清单是 §11.4 的 `PublicRoleRegistry.records`。本节不建立第二份可漂移的 Active Set。当前合同中的代表性 ID 保持现有兼容名称：

```text
color.surface.page
color.surface.panel
color.text.primary
color.text.secondary
color.text.on-action
color.border.default
color.action.primary
color.focus.ring
color.scrim.viewport
interaction.control.height
spacing.section.block
```

业务页面主要消费 Semantic Token。

## 11.3 Component Token

仅在真实组件需要独立合同后创建：

```text
button.icon-gap
dialog.header-gap
navigation.icon-gap
table.cell-padding
```

禁止预先为所有组件生成完整 Component Token 树。

`interaction.navigation.item-height`、`interaction.table.row-height` 和 `spacing.dialog.padding` 只是未来跨组件 Density Candidate；当前不是 Public Role，也不进入任何生成输出。它们只有在后续 Admission Amendment 明确加入 Active Public Set 后才可成为 Public Semantic Role。组件 Anatomy、内部 Region、局部 Substructure、Vendor Adapter 和 Optical Detail 仍由真实组件需求触发，并默认保持 `ui-internal`。组件可以 Alias 已准入的 Semantic Role，但不得建立第二份 Density Authority。

## 11.4 Token Visibility

Token Source 使用经过 Zod Schema 验证的 DTCG Extension：

```json
{
  "$extensions": {
    "org.pavp": {
      "visibility": "public"
    }
  }
}
```

允许值：

```ts
type TokenVisibility =
  | 'public'
  | 'ui-internal'
  | 'build-only'
```

确定性解析顺序：

```text
token-level visibility
→ nearest parent-group visibility
→ tier-root default
```

Tier Root 默认值：

```text
primitive = build-only
density = build-only
semantic = public
semantic.material = ui-internal
component = unsupported until admitted; default ui-internal after admission
```

Tier 强制为 `build-only` 或 `ui-internal` 时，子节点只允许保持或收窄 Visibility，不得扩大为 `public`。未知 Tier、未知 Source 或无法解析的 Visibility 必须构建失败，不得隐式回退为 `public`。

Build-time Token Record 必须携带：

```text
tier
visibility
source
conditions
resolvedValue
cssVariable?
```

输出过滤合同：

| Visibility    | Runtime CSS | Public `tokens.ts` | Token Names | UnoCSS Semantics | Manifest |
| ------------- | ----------- | ------------------ | ----------- | ---------------- | -------- |
| `public`      | Yes         | Yes                | Yes         | Yes              | Yes      |
| `ui-internal` | Yes         | No                 | No          | No               | Yes      |
| `build-only`  | No          | No                 | No          | No               | Yes      |

Manifest 包含所有 Token 的 Tier、Visibility、Source、Condition 和 Role Metadata；只有 Runtime CSS 中真实存在的 Token 才记录 `cssVariable`。Manifest 是生成和治理输入，不是应用公共 API。

加入这些字段时必须提升 Manifest Schema Version。Generator 必须在 Material Source 进入前支持 `material` Namespace → `--ui-material-*` 映射。Package 5 Atomic Cutover 后，Theme、Mode 与 Contrast 的当前 Public Color Projection 只遵守 §13.7 的 Private Theme Bank 和 Stable Public Binding；先前 Embedded-palette Conditional Projection 已退休。其他 Conditional Semantic Alias 必须保留 CSS `var(...)` 关系与独立单轴 Selector，不得一律压平为 Literal 或复制组合矩阵。

### Public Output Completeness

当前 Active Baseline 的 Public Role ID Contract 是下方精确 Registry；它与当前实现的 Public CSS、`tokens.ts`、`token-names.ts` 和 27 个 UnoCSS Mapping 一致。`roleContractVersion` 是已激活的 Explicit-theme Contract 版本机制，并与 Theme Definition、Registry、Manifest 和 Generated Output 保持精确一致。

对当前 Active Baseline 以及 Atomic Cutover 后的任一 `roleContractVersion` 定义：

```text
A = 已准入且 visibility=public 的唯一 Semantic Role Name 集合
R = Runtime CSS 中具有规范 Public CSS Variable 且至少实际声明一次的唯一 Role Name 集合
T = public tokens.ts 的 Key 集合
N = token-names.ts 的值集合
U = 具有完整 UnoCSS Mapping Metadata 的 Role Name 集合
M = Manifest 中 visibility=public 的唯一 Role Name 集合
```

Generator 必须证明：

```text
A = R = T = N = U = M
```

Conditional Role 可以在 Runtime CSS 和 Manifest 中有多个 Condition Record，但集合比较按唯一 Semantic Role Name 进行。同一 Public Role 在所有 Condition 下必须使用同一个规范 CSS Variable 和同一份 UnoCSS Mapping。`R` 必须从实际 Generated Runtime CSS 反向解析，且每个 Public Variable 只映射一个 `A` Role；`U` 只有在 Manifest Metadata 与实际 `platformPreset` Theme Entry、Rule 或 Shortcut 完全一致时才成立。Manifest 不得自证 Runtime 或 UnoCSS Output，Generated CSS 与 UnoCSS 也不得存在未登记的额外 Public Variable 或 Class Mapping。缺失、未知、重复、不可访问、CSS Variable Collision、UnoCSS Class Collision、无法映射或集合差异都必须导致 Generation Failure。Formatter 不得通过 `continue`、`undefined`、过滤或静默跳过绕过 Public Role。

Public Role Registry 的记录结构固定为：

```ts
interface PublicRoleRecord {
  id: string
  tokenType:
    | 'color'
    | 'cubicBezier'
    | 'dimension'
    | 'duration'
    | 'fontFamily'
    | 'fontWeight'
    | 'number'
    | 'shadow'
  category: 'color' | 'interaction' | 'layout' | 'spacing' | 'typography'
  visibility: 'public'
  admissionPhase: 1
  cssVariable: `--ui-${string}`
  themePlaneApplicability:
    | 'target-required-after-atomic-cutover'
    | 'not-applicable'
  contrastEndpointId: string | null
  alphaContractId: 'alpha-scrim-viewport' | null
  unocss: {
    generatorKind: 'exact-rule' | 'theme-entry'
    family: string
    key: string
    classes: readonly [string, ...string[]]
    allowedCssProperties: readonly [string, ...string[]]
  }
}
```

`PublicRoleRegistry.records` 是以下逐记录精确数组；不得从命名约定、Token Tree 或 Formatter Switch 推导、扩展或缩减：

```ts
const PublicRoleRegistry = {
  schemaVersion: 1,
  status: 'active-current-public-surface',
  records: [
    {
      id: 'color.action.primary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-action-primary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.action.primary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'action-primary',
        classes: ['bg-action-primary'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.border.default',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-border-default',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.border.default',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'border-default',
        classes: ['border-border-default'],
        allowedCssProperties: ['border-color'],
      },
    },
    {
      id: 'color.focus.ring',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-focus-ring',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.focus.ring',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'focus-ring',
        classes: ['ring-focus-ring'],
        allowedCssProperties: ['--un-ring-color'],
      },
    },
    {
      id: 'color.scrim.viewport',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-scrim-viewport',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: null,
      alphaContractId: 'alpha-scrim-viewport',
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'scrim-viewport',
        classes: ['bg-scrim-viewport'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.surface.page',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-surface-page',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.surface.page',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'surface-page',
        classes: ['bg-surface-page'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.surface.panel',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-surface-panel',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.surface.panel',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'surface-panel',
        classes: ['bg-surface-panel'],
        allowedCssProperties: ['background-color'],
      },
    },
    {
      id: 'color.text.on-action',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-on-action',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.on-action',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-on-action',
        classes: ['text-text-on-action'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'color.text.primary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-primary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.primary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-primary',
        classes: ['text-text-primary'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'color.text.secondary',
      tokenType: 'color',
      category: 'color',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-color-text-secondary',
      themePlaneApplicability: 'target-required-after-atomic-cutover',
      contrastEndpointId: 'color.text.secondary',
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'color',
        key: 'text-secondary',
        classes: ['text-text-secondary'],
        allowedCssProperties: ['color'],
      },
    },
    {
      id: 'interaction.control.height',
      tokenType: 'dimension',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-control-height',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'dimension',
        key: 'control',
        classes: ['h-control'],
        allowedCssProperties: ['height'],
      },
    },
    {
      id: 'interaction.motion.duration',
      tokenType: 'duration',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-motion-duration',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'duration',
        key: 'motion',
        classes: ['duration-motion'],
        allowedCssProperties: ['--un-duration', 'transition-duration'],
      },
    },
    {
      id: 'interaction.motion.easing',
      tokenType: 'cubicBezier',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-motion-easing',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'easing',
        key: 'motion',
        classes: ['ease-motion'],
        allowedCssProperties: ['--un-ease', 'transition-timing-function'],
      },
    },
    {
      id: 'interaction.radius.panel',
      tokenType: 'dimension',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-radius-panel',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'radius',
        key: 'panel',
        classes: ['rounded-panel'],
        allowedCssProperties: ['border-radius'],
      },
    },
    {
      id: 'interaction.shadow.panel',
      tokenType: 'shadow',
      category: 'interaction',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-shadow-panel',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'shadow',
        key: 'panel',
        classes: ['shadow-panel'],
        allowedCssProperties: ['--un-shadow', 'box-shadow'],
      },
    },
    {
      id: 'layout.content.max-width',
      tokenType: 'dimension',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-layout-content-max-width',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'content-width',
        key: 'content',
        classes: ['max-w-content'],
        allowedCssProperties: ['max-width'],
      },
    },
    {
      id: 'layout.z.base',
      tokenType: 'number',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-z-base',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'z-index',
        key: 'base',
        classes: ['z-base'],
        allowedCssProperties: ['z-index'],
      },
    },
    {
      id: 'layout.z.overlay',
      tokenType: 'number',
      category: 'layout',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-z-overlay',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'z-index',
        key: 'overlay',
        classes: ['z-overlay'],
        allowedCssProperties: ['z-index'],
      },
    },
    {
      id: 'spacing.content.gap',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-content-gap',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'content-gap',
        classes: ['gap-content-gap'],
        allowedCssProperties: ['gap'],
      },
    },
    {
      id: 'spacing.page.inline',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-page-inline',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'page-inline',
        classes: ['px-page-inline'],
        allowedCssProperties: ['padding-inline'],
      },
    },
    {
      id: 'spacing.section.block',
      tokenType: 'dimension',
      category: 'spacing',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-space-section-block',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'spacing',
        key: 'section-block',
        classes: ['py-section-block'],
        allowedCssProperties: ['padding-block'],
      },
    },
    {
      id: 'typography.family.body',
      tokenType: 'fontFamily',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-family-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-family',
        key: 'body-family',
        classes: ['font-body-family'],
        allowedCssProperties: ['font-family'],
      },
    },
    {
      id: 'typography.line-height.body',
      tokenType: 'number',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-line-height-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'line-height',
        key: 'body',
        classes: ['leading-body'],
        allowedCssProperties: ['--un-leading', 'line-height'],
      },
    },
    {
      id: 'typography.line-height.title',
      tokenType: 'number',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-line-height-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'line-height',
        key: 'title',
        classes: ['leading-title'],
        allowedCssProperties: ['--un-leading', 'line-height'],
      },
    },
    {
      id: 'typography.size.body',
      tokenType: 'dimension',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-size-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'typography',
        key: 'body',
        classes: ['text-body'],
        allowedCssProperties: ['font-size'],
      },
    },
    {
      id: 'typography.size.title',
      tokenType: 'dimension',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-size-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'exact-rule',
        family: 'typography',
        key: 'title',
        classes: ['text-title'],
        allowedCssProperties: ['font-size'],
      },
    },
    {
      id: 'typography.weight.body',
      tokenType: 'fontWeight',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-weight-body',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-weight',
        key: 'body-weight',
        classes: ['font-body-weight'],
        allowedCssProperties: ['--un-font-weight', 'font-weight'],
      },
    },
    {
      id: 'typography.weight.title',
      tokenType: 'fontWeight',
      category: 'typography',
      visibility: 'public',
      admissionPhase: 1,
      cssVariable: '--ui-font-weight-title',
      themePlaneApplicability: 'not-applicable',
      contrastEndpointId: null,
      alphaContractId: null,
      unocss: {
        generatorKind: 'theme-entry',
        family: 'font-weight',
        key: 'title-weight',
        classes: ['font-title-weight'],
        allowedCssProperties: ['--un-font-weight', 'font-weight'],
      },
    },
  ],
} as const
```

精确合同：

```text
PUBLIC_ROLE_REGISTRY=EXACT
ACTIVE_PUBLIC_COLOR_ROLES=9
ACTIVE_PUBLIC_ROLES_TOTAL=27
UNO_MAPPING_RECORDS=27
```

`records` 的 Missing、Unknown、Duplicate 或 Extra ID 必须失败。`id`、`cssVariable`、`unocss.classes` 均必须全局唯一。每个 Active Record 必须有且只有一个 UnoCSS Mapping Record，生成结果必须逐 Class 反向解析并证明只写入 `allowedCssProperties`。Public Formatter 遇到未知 Family、空 Class、Collision 或不可生成记录必须 Fatal；不得保留当前 `continue`、`undefined`、Filter 或 Silent Omission。`themePlaneApplicability='target-required-after-atomic-cutover'` 只声明 Target Theme Field 资格，不激活 Target Theme 或 Preference。

### Manifest Governance

Generated Manifest 的唯一 Record Family 集合固定为：

```text
Token records
Active Public Role records
UnoCSS mapping records
Named Contrast records
Alpha records
Density records
Theme metadata records
First-paint metadata records
```

精确 Record-count 方程：

```text
manifestRecordCount =
  tokenRecords.length
  + activePublicRoleRecords.length
  + unoCssMappingRecords.length
  + namedContrastRecords.length
  + alphaRecords.length
  + densityRecords.length
  + themeMetadataRecords.length
  + firstPaintMetadataRecords.length
```

任何 Unknown Record Family、未计数 Array、重复投影或方程差异都必须使 Generation Failure。`sourceFiles`、Schema Version 和 Build Provenance 只能作为非 Record Metadata；Material、Compound 和 Boundary 数据必须归入上述已知 Record 的字段或 Named Contrast Record，不得形成隐藏的第九种 Record Family。

Package 3 实现后的当前 Record Evidence 为：

```text
CURRENT_TOKEN_RECORDS=105
CURRENT_ACTIVE_PUBLIC_ROLE_RECORDS=27
CURRENT_UNOCSS_MAPPING_RECORDS_IMPLEMENTED=27
CURRENT_NAMED_CONTRAST_RECORDS=14
CURRENT_ALPHA_RECORDS_IMPLEMENTED=1
CURRENT_DENSITY_METADATA_RECORDS=3
CURRENT_THEME_METADATA_RECORDS=3
CURRENT_FIRST_PAINT_METADATA_RECORDS=1
CURRENT_MANIFEST_RECORD_COUNT=181
PACKAGE_3_BASELINE_RECORD_COUNT=174
PACKAGE_3_EXPECTED_RECORD_COUNT_DELTA=7
PACKAGE_3_BASELINE_COMMIT=d2e7354fad616824e52dfe5ca0f7cdbe6b4705cf
PACKAGE_3_IMPLEMENTATION_COMMIT=08d5f149834060219c9d87527b6365a354bc7b08
PACKAGE_3_BASELINE_RELATION=DIRECT_PREDECESSOR
PACKAGE_3_STATUS=COMPLETE
```

这些数值描述当前仓库证据。Package 3 已把 27 个 Public Role、27 个 UnoCSS Mapping、14 个统一 Named Contrast Record 和 1 个 Alpha Record 接入精确方程，并实现 Record、Byte 和 Growth Enforcement；Package 3A 已完成压缩标签、Canonical Baseline、外部 Byte Governance 和 Generated Manifest Payload 自我治理闭包，因此 Package 3 与 3A 均为 `COMPLETE`。

Manifest 唯一规范压缩配置：

```text
MANIFEST_COMPRESSION_PROFILE_ID=node-zlib-gzip-sync
MANIFEST_COMPRESSION_PROFILE_STATUS=ACTIVE
MANIFEST_COMPRESSION_IMPLEMENTATION=node:zlib.gzipSync
MANIFEST_COMPRESSION_RUNTIME=NODE_24_15_0
MANIFEST_COMPRESSION_EXTERNAL_CLI_AUTHORITY=NONE
MANIFEST_COMPRESSION_PROFILE_NAMING=DESCRIPTIVE_ID_WITHOUT_NUMERIC_VERSION_SUFFIX
MANIFEST_COMPRESSION_HARD_LIMIT_BYTES=32768
MANIFEST_CANONICAL_BASELINE_COMMIT=d2e7354fad616824e52dfe5ca0f7cdbe6b4705cf
MANIFEST_CANONICAL_BASELINE_BYTES=3366
MANIFEST_CANONICAL_FINAL_GZIP_BYTES=7687
MANIFEST_CANONICAL_EXPECTED_GZIP_BYTE_DELTA=4321
PACKAGE_4_MANIFEST_BASELINE_COMMIT=1daba84b5196e152966bd7e0f2e9e7ed8c24938f
PACKAGE_4_MANIFEST_BASELINE_BYTES=5213
PACKAGE_4_MANIFEST_BASELINE_RECORD_COUNT=181
PACKAGE_4_MANIFEST_EXPECTED_RECORD_COUNT_DELTA=0
PACKAGE_4_MANIFEST_EXPECTED_GZIP_BYTE_DELTA=940
PACKAGE_5_MANIFEST_BASELINE_COMMIT=2f5a28a7dbe877f96ac3d24299d892bd7bb9087f
PACKAGE_5_MANIFEST_BASELINE_BYTES=6153
PACKAGE_5_MANIFEST_BASELINE_RECORD_COUNT=181
PACKAGE_5_MANIFEST_FINAL_BYTES=7687
PACKAGE_5_MANIFEST_FINAL_RECORD_COUNT=181
PACKAGE_5_MANIFEST_EXPECTED_RECORD_COUNT_DELTA=0
PACKAGE_5_MANIFEST_EXPECTED_GZIP_BYTE_DELTA=1534
LEGACY_CLI_GZIP_COMMAND=gzip -9 -n
LEGACY_CLI_GZIP_COMPARISON=NON_AUTHORITATIVE_HISTORY_ONLY
```

`node-zlib-gzip-sync` 精确定义为：

```text
level=Z_BEST_COMPRESSION
strategy=Z_DEFAULT_STRATEGY
windowBits=Z_DEFAULT_WINDOWBITS
memLevel=Z_DEFAULT_MEMLEVEL
chunkSize=Z_DEFAULT_CHUNK
flush=Z_NO_FLUSH
finishFlush=Z_FINISH
timestamp metadata=absent
filename metadata=absent
repeated output=byte-identical
PATH dependency=prohibited
```

压缩输入同时属于 Profile，固定为：

```text
serialization implementation=project stableJson
encoding=UTF-8
object property order=canonical generator construction order
record order=owning exact registry or explicit code-point order
terminal newline=exactly one LF
```

`project.config.ts` 与 `mise.toml` 固定的 Node `24.15.0` 是该可复现配置的一部分。Profile ID 遵守 Repository 的 Numeric-version-style Naming Prohibition；任何未来 Profile 变化都必须通过独立 Architecture Amendment 获得新的描述性 ID，不得追加数字版本后缀。外部 CLI 只能用于非权威历史比较，不得决定 Baseline、Expected Delta、Hard Limit 或 Package Acceptance。Package 3 Baseline 在 `node-zlib-gzip-sync` 下为 `3366` Bytes；旧 CLI 得到的 `3362` Bytes 只保留为历史差异证据。

Package 3A 完成后的 Generated Manifest Metadata Shape 精确为：

```text
schemaVersion=5
top-level non-record metadata=generatedNotice, schemaVersion, sourceFiles, compoundBudget, governance
governance.compressionProfileId
governance.recordFamilies
governance.recordCounts
governance.recordCount
governance.baselineRecordCount
governance.expectedRecordCountDelta
```

Package 4 曾在不增加 Record Family 或 Record 的前提下，把三份完整 Target Theme Definition 作为三个 Theme Metadata Record 的嵌套 `complete` 字段生成。该历史 Shape 的 Manifest Schema 为：

```text
schemaVersion=6
themeMetadataRecords=3
themes[*].complete.activationStatus=TARGET_INACTIVE
themes[*].complete.registryKind=built-in
themes[*].complete.selector
themes[*].complete.source
themes[*].complete.schemaVersion=3
themes[*].complete.roleContractVersion=1
themes[*].complete.planes=light.standard,light.enhanced,dark.standard,dark.enhanced
PACKAGE_4_EXPECTED_RECORD_COUNT_DELTA=0
```

`PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` 已在同一 Atomic Landing 中用以下 Exact Active Flat Shape 原子替换上述 Package 4 Target-only Nested Theme Representation：

```text
themes[*]
  activationStatus
  registryKind
  themeId
  label
  source
  schemaVersion
  roleContractVersion
  planes
  bank
    visibility
    records[*]
      colorMode
      contrast
      publicRole
      sourceField
      authoredValue
      bankVariable
      publicBinding
```

```text
activationStatus=ACTIVE
registryKind=built-in
bank.visibility=ui-internal
ACTIVE_THEME_IDENTITY=registryKind,themeId
ACTIVE_THEME_FIELDS_REMOVED=themes[*].id,themes[*].neutral,themes[*].complete
THEME_RECORD_ORDER=Built-in Theme Registry canonical order
BANK_RECORD_ORDER=Color Mode Registry order → Contrast Registry order → Active Public Color Role Registry order
```

上列字段集合闭合，不允许 Extra Field。`registryKind` 与 `themeId` 是唯一 Theme Identity，不能保留并行 `id`。Runtime Custom Theme Instance、应用 Storage Key、Pinia State、Raw Validation Failure、First Paint Handoff 和应用 Registry 内容不得进入 Build Manifest。八个现有顶层 Record Family 保持不变，不得因 Active Theme Bank 增加第九种 Record Family。

同一 Atomic Landing 必须把 First-paint Metadata 原子替换为以下 Exact Shape：

```text
firstPaint[*]
  applicationKeyAgnostic=true
  safetyBaseline
    effectiveColorMode=light
    effectiveTheme.registryKind=built-in
    effectiveTheme.themeId=neutral
    effectiveContrast=standard
    effectiveMaterial=solid
    effectiveDensity=comfortable
  artifacts
    appearance-init.js
    critical-theme.css
  synchronousClassicScript=true
  storageWrite=false
  capabilities
    preferenceStorageKeyAttribute=true
    preferenceStorageRead=true
    explicitThemePreferenceValidation=true
    legacyPreferenceMigration=true
    builtInThemeResolution=true
    atomicAppearanceApplication=true
    synchronousCustomThemeResolution=false
    customThemeRuntimeResolution=true
    themeRegistryStorageKeyAttribute=false
```

该 Shape 不包含 `productDefaultAxes`，不复制 `ProductPreferenceDefault`，不把 Font Scale 或 Motion 加入五字段 `PreInitializationSafetyBaseline`，也不记录实际 Storage Key、Custom Registry Snapshot、Pinia State 或私有 First Paint Handoff。Built-in Theme 可以在 Vue 前同步解析；本 Landing 的 Custom Theme 只允许在 Vue Bootstrap 后恢复。Stored Preference 引用 Custom Theme 时，First Paint 保持 Safety Baseline，不得同步读取 Custom Registry。

Package 5 的不兼容最终 Shape 已机械派生 `schemaVersion=7`。最终仍为 `181` Records，相对 Package 5 Entry 的 Record Delta 为 `0`；Canonical Gzip 为 `7687` Bytes，相对 `6153`-Byte Entry Baseline 的 Delta 为 `1534` Bytes。Production Bundle 的机械测量记录在 §37.1 Package 5 Completion Evidence 与 Owning Bundle Checker 中。

Generated Manifest 禁止包含用于断言同一压缩 Payload 大小的字段：

```text
currentGzipBytes
baselineGzipBytes
expectedGzipByteDelta
gzipHardLimitBytes
```

```text
MANIFEST_BYTE_BUDGET_OWNERSHIP=BUILD_CONTRACT_OUTSIDE_COMPRESSED_PAYLOAD
MANIFEST_ACTUAL_BYTES_IN_PAYLOAD=PROHIBITED
MANIFEST_EXPECTED_DELTA_IN_PAYLOAD=PROHIBITED
```

`PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT` 已完成；当前 Generated Payload 递归扫描确认上述四个字段全部不存在，且 `compressionProfileId` 精确为 `node-zlib-gzip-sync`。

Canonical Byte Verifier 必须在压缩 Payload 外比较：

```text
canonical baseline bytes
expected package delta
actual final bytes
hard limit
```

Baseline 同时绑定 Exact Commit 和 `node-zlib-gzip-sync`。Package 3 的 Baseline Commit 已由 Git History 证明为其 Implementation Commit 的 Direct Predecessor。Package 3A 先冻结上述完整 Metadata Shape，再使用同一序列化器、Pinned Node 和 Profile 测得 Final Payload 为 `5213` Bytes；相对 `3366`-Byte Baseline 的 Expected Delta 为 `1847` Bytes，并通过 `32768`-Byte Hard Limit。Repository-owned Build Verification Code 和本架构共同冻结这些值；Generated Payload 不包含它们。

Package 4 以 `main@1daba84b5196e152966bd7e0f2e9e7ed8c24938f` 的 `181` Records / `5213` Bytes 作为独立增量 Baseline。最终仍为 `181` Records，Expected Record Delta 为 `0`；同一 Canonical Profile 下最终 Payload 为 `6153` Bytes，Package 4 Expected Byte Delta 为 `940` Bytes。相对原始 `3366`-Byte Canonical Baseline 的当前总 Delta 为 `2787` Bytes，且继续通过 `32768`-Byte Hard Limit。两组 Delta 都由 Build Verification Code 在压缩 Payload 外精确比较。

Package 5 以 `main@2f5a28a7dbe877f96ac3d24299d892bd7bb9087f` 的 `181` Records / `6153` Bytes 作为独立增量 Baseline。最终为 `181` Records / `7687` Bytes，Expected Record Delta 为 `0`，Expected Byte Delta 为 `1534` Bytes；相对原始 `3366`-Byte Canonical Baseline 的当前总 Delta 为 `4321` Bytes，并继续通过 `32768`-Byte Hard Limit。Build Verification Code 在压缩 Payload 外精确比较上述 Entry、Final 和 Delta。

每个后续 Implementation Package 必须声明 `expectedRecordCountDelta` 与 Canonical Compressed-byte Delta，由 Owning Static Gate 对实际值逐项比较；未声明或非预期增长必须失败。即使总大小仍低于 32 KiB，Delta Mismatch 也不得通过。

Primitive Palette、Private Theme Bank、`ui-internal` Material Token 和未来 Component-internal Token 不得为了补齐 Public Output 或 UnoCSS Coverage 而扩大 Visibility。

禁止：

* 将 `ui-internal` 或 `build-only` Token 暴露到公共 TypeScript、Token Name 或 UnoCSS。
* 创建 Internal Token 公共 Subpath。
* 由应用或业务页面直接使用 `--ui-material-*`。
* 先加入 Material Token Source，再补 Visibility 过滤。

## 11.5 Material Token Scope

Phase 1 只允许为功能性 Chrome、Overlay 和 Modal 定义最少 Material Role。每个已准入 Role 必须定义完整的 `adaptive`、`reduced` 和 `solid` 投影，其中 `solid` 是强制 Terminal Fallback。

以下内容继续延迟：

```text
clear-media material
directional highlight
inner illumination
interaction glow families
spring families
component token trees
```

Material Token 是 `ui-internal`，只允许 `packages/ui` 在真实 Phase 2 消费者出现后消费。

---

# 12. CSS Variable 命名

统一命名空间：

```text
--ui-color-*
--ui-space-*
--ui-font-*
--ui-radius-*
--ui-shadow-*
--ui-motion-*
--ui-control-*
--ui-layout-*
--ui-z-*
--ui-material-*   (UI internal only)
--ui-theme-bank-* (UI internal only)
```

示例：

```css
:root {
  --ui-color-surface-page: oklch(...);
  --ui-color-text-primary: oklch(...);
  --ui-control-height: 36px;
  --ui-space-section: 16px;
  --ui-font-body: 1rem;
  --ui-radius-control: 8px;
}
```

禁止：

```text
--primary
--background
--card
--spacing-md
--header-height
--sidebar-width
```

所有变量必须有 `--ui-` 命名空间，避免与第三方库和业务变量冲突。

`--ui-material-*` 与 Package 5 激活的 `--ui-theme-bank-*` 当前都存在于 Runtime CSS。两者都不属于应用公共 Token 表面，不得进入公共 `tokens.ts`、`token-names.ts`、UnoCSS Theme、Rule 或 Shortcut，也不得由 `apps/**` 和业务 Feature 直接引用。Private Theme Bank 只存在于 Runtime CSS 与 Manifest。

---

# 13. Appearance、Material 和用户配色系统

## 13.1 Stored Preference 与 Effective State

Package 5 已将先前 Embedded-palette Runtime 根节点原子切换为以下 Tuple-aware Active 形式，并同时写入 `data-theme-kind` 与 `data-theme`：

```html
<html
  data-color-mode="dark"
  data-theme-kind="built-in"
  data-theme="ocean"
  data-density="comfortable"
  data-motion="full"
  data-contrast="standard"
  data-material="solid"
>
```

Stored Preference 与 Effective State 必须分离：

```text
stored colorMode = light | dark | system
effective colorMode = light | dark

stored material = adaptive | reduced | solid
effective material = adaptive | reduced | solid
```

`system` 和尚未解析的 `adaptive` 只存在于用户偏好。`System` 不是第三个 Theme Plane；它只能由浏览器能力解析为 Effective `light` 或 `dark`，并选择相应的 Explicit Theme Plane。DOM 的 `data-color-mode` 与 `data-material` 只记录 Effective State；不得将派生状态回写为用户偏好。根节点根据 Effective Color Mode 设置：

```css
html[data-color-mode='light'] {
  color-scheme: light;
}

html[data-color-mode='dark'] {
  color-scheme: dark;
}
```

Effective Appearance 是纯派生结果，不作为第二份可变 Pinia State，也不持久化。

Theme Reference Resolution 当前是纯边界。有效引用解析为已校验、可访问的 Built-in 或 Custom Theme Registry Entry；无效引用不得被改写为 `neutral` 或其他主题，也不得修改 Stored Preference，并且必须返回 §13.6 冻结的 `ThemeReferenceResolutionResult` Exact Branch。运行时可以暂时保留 Safe First-paint Baseline，但该 App State 不进入 Public Result。先前 `CurrentPreference` Built-in ID 字符串只保留为内部 Read-only Migration Evidence，不再是 Runtime Authority。

## 13.2 Theme Definition

Theme Definition 与 User Preference 是不同合同。`ThemeDefinition` 是完整、显式、版本化的 Active 颜色文档；Architecture-only Amendment 曾只冻结 Target，Package 5 已在 §13.4 的 Atomic Cutover 中把它激活为当前 Runtime、Default、Public Export、First-paint 与 Persistence Authority：

```text
CAPABILITY=EXPLICIT_COMPLETE_THEME_DEFINITION
CAPABILITY_STATUS=ACTIVE
STRUCTURE_ADMISSION_GATE=PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE
RUNTIME_ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

```ts
declare const generatedPublicRoleRegistry: {
  readonly roleContractVersion: 1
}
type RoleContractVersion =
  typeof generatedPublicRoleRegistry.roleContractVersion

type BuiltInThemeId = 'neutral' | 'ocean' | 'warm'
type CustomThemeId = string & {
  readonly __customThemeId: unique symbol
}
type ThemeId = BuiltInThemeId | CustomThemeId

type AbsoluteCssColor = string & {
  readonly __absoluteCssColor: unique symbol
}
type DirectBuildOnlyPrimitiveColorAlias = string & {
  readonly __directPrimitiveColorAlias: unique symbol
}
type CompletePublicColorRoleMap<Value> = {
  readonly [Role in PublicColorRole]: Value
}

interface ThemeDefinition<
  Id extends ThemeId,
  Value extends
    | AbsoluteCssColor
    | DirectBuildOnlyPrimitiveColorAlias,
> {
  schemaVersion: 3
  roleContractVersion: RoleContractVersion
  id: Id
  label: string
  planes: {
    light: {
      standard: CompletePublicColorRoleMap<Value>
      enhanced: CompletePublicColorRoleMap<Value>
    }
    dark: {
      standard: CompletePublicColorRoleMap<Value>
      enhanced: CompletePublicColorRoleMap<Value>
    }
  }
}

type NeutralBuiltInThemeDefinition = ThemeDefinition<
  'neutral',
  AbsoluteCssColor
>

type NonNeutralBuiltInThemeDefinition = ThemeDefinition<
  Exclude<BuiltInThemeId, 'neutral'>,
  AbsoluteCssColor | DirectBuildOnlyPrimitiveColorAlias
>

type BuiltInThemeDefinition =
  | NeutralBuiltInThemeDefinition
  | NonNeutralBuiltInThemeDefinition

type CustomThemeDefinition = ThemeDefinition<
  CustomThemeId,
  AbsoluteCssColor
>
```

首次 Atomic Cutover 已激活以下初始准入版本：

```text
TARGET_PUBLIC_ROLE_CONTRACT_INITIAL_VERSION=1
TARGET_PUBLIC_ROLE_CONTRACT_STATUS=ACTIVE
TARGET_PUBLIC_ROLE_CONTRACT_ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

`RoleContractVersion` 只能是严格递增的正整数，由 Generated Exact Registry 导出当前 Exact Literal；历史版本只允许进入显式 Migration Input，不进入当前 Theme Definition Union。版本不得复用、回退或仅因实现重排而改变。Theme Definition、Public Role Registry、Named Contrast Registry、Alpha Contract Registry、Manifest 和 Generated Output 必须声明完全相同的版本，不接受“兼容范围”或隐式升级。

四个 Plane 都是独立、完整的作者输入：

```text
light.standard
light.enhanced
dark.standard
dark.enhanced
```

每个 Plane 必须显式包含当前 `roleContractVersion` 已准入的全部 Public Color Role。任何 Unknown、Missing、Duplicate、Inaccessible Role 或 Role Contract Version Mismatch 都必须使整个 Theme Definition 失败。不存在 Optional Field、Default Value、Implicit Role Inheritance、Partial-theme Merge、Theme Fallback 或缺失字段补齐。

Built-in Theme 的每个 Plane 都必须人工逐字段完成。Product Default `neutral` 的每个字段必须是作者直接提交的 `AbsoluteCssColor`，禁止 DTCG Alias；`ocean` 与 `warm` 可以直接写显式颜色，也可以使用人工选择的 DTCG Alias。允许的 Built-in Alias 只能直接指向具有显式 Literal Value 的 `build-only` Primitive Color；不得引用另一个 Semantic Role、另一个 Theme Plane 或运行时 CSS Variable。每个 Alias 选择必须由作者逐字段声明、确定性解析并记录 Source Path，不能由规则、色阶或 Seed 生成。

```text
DEFAULT_THEME_REFERENCE_AUTHORITY=ProductPreferenceDefault.theme
NEUTRAL_SOURCE=packages/design-system/tokens/themes/complete/neutral.theme.json
NEUTRAL_LEGACY_SOURCE=packages/design-system/tokens/themes/neutral.theme.json
NEUTRAL_PLANES=light.standard,light.enhanced,dark.standard,dark.enhanced
NEUTRAL_VALUE_KIND=ABSOLUTE_CSS_COLOR_ONLY
NEUTRAL_AUTHORING=MANUAL_EXACT_FIELD_BY_FIELD
NEUTRAL_ALIAS=PROHIBITED
NEUTRAL_INHERITANCE=PROHIBITED
NEUTRAL_AUTOMATIC_COMPLETION=PROHIBITED
NEUTRAL_AUTOMATIC_CORRECTION=PROHIBITED
NEUTRAL_RUNTIME_STATUS=ACTIVE
NEUTRAL_RUNTIME_ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

`neutral` 后续只能通过该 Canonical Source 显式编辑，并重新通过 Exact-set、Alpha、Gamut、Named Contrast 与 Generated Drift Gate。所有 Built-in 和 Custom Theme 均受同一个 Complete-plane Contract：四个 Plane × 当前全部 Active Public Color Role 必须逐项存在，不允许 Seed Expansion、Palette Derivation、Partial Inheritance、Implicit Completion、Automatic Contrast Repair、Gamut Remap 或 Page-level Color Override。任何一个字段缺失或无效都拒绝整个 Theme，不得用 `neutral` 或其他 Theme 补齐。

Custom User Theme 的每个字段必须提交最终 Absolute CSS Color Value。Custom Theme 禁止：

```text
DTCG Alias
var()
currentColor
CSS-wide keywords
System Color
relative color syntax
color-mix()
light-dark()
calc(), env(), attr() or another computed color dependency
Seed
Optional Field
Default
Inheritance
Fallback
Partial Merge
```

Custom Value 只允许不含依赖或计算的 Absolute CSS Color Syntax，例如 Hex、非 System Named Color、绝对 `rgb()`、`hsl()`、`hwb()`、`lab()`、`lch()`、`oklab()`、`oklch()` 或 `color(srgb ...)`。它必须可静态解析、落入 sRGB、满足该 Role 的 Alpha Contract，并保持用户提交值不变。Parser 可以建立临时数值用于校验，但不得替换、规范化、四舍五入、转换、Gamut Remap 或重新序列化用户颜色。

## 13.3 Active and Reserved Color Role Taxonomy

当前 Active Public Color Role Set 是以下九个现有兼容 ID，不多不少：

```ts
const ActivePublicColorRoleIds = [
  'color.action.primary',
  'color.border.default',
  'color.focus.ring',
  'color.scrim.viewport',
  'color.surface.page',
  'color.surface.panel',
  'color.text.on-action',
  'color.text.primary',
  'color.text.secondary',
] as const
```

它们必须与 §11.4 的九个 Color Record 精确相等。不得在本修订中 Rename、Retire、Alias、Duplicate 或用新 Style Slot 替换 `color.action.primary` 与 `color.text.on-action`。

### Non-public Reserved Color Taxonomy

下列 283 个 ID 是非 Public、非 Active、非 Theme Field 的 Reserved Admission Candidate。数组逐项列出，不允许 Formatter、Schema 或 Validator 从命名公式再展开另一份集合：

```ts
const ReservedColorRoleTaxonomy = {
  foundation: [
    'color.brand.default',
    'color.brand.subtle',
    'color.brand.strong',
    'color.brand.text',
    'color.brand.on-default',
    'color.brand.on-strong',
    'color.brand.border',
    'color.accent.default',
    'color.accent.subtle',
    'color.accent.strong',
    'color.accent.text',
    'color.accent.on-default',
    'color.accent.on-strong',
    'color.accent.border',
    'color.surface.content',
    'color.surface.section',
    'color.surface.elevated',
    'color.surface.sunken',
    'color.surface.inverse',
    'color.text.muted',
    'color.text.placeholder',
    'color.text.inverse',
    'color.link.default',
    'color.link.hover',
    'color.link.pressed',
    'color.link.visited',
    'color.link.disabled',
    'color.link.inverse',
    'color.icon.primary',
    'color.icon.secondary',
    'color.icon.muted',
    'color.icon.inverse',
    'color.border.subtle',
    'color.border.strong',
    'color.border.interactive',
    'color.border.inverse',
    'color.divider.default',
    'color.divider.strong',
    'color.divider.inverse',
    'color.focus.ring-inverse',
    'color.focus.indicator',
    'color.selection.background',
    'color.selection.text',
    'color.selection.inactive-background',
    'color.selection.inactive-text',
    'color.scrim.subtle',
    'color.scrim.strong',
    'color.state.hover.background',
    'color.state.hover.text',
    'color.state.hover.icon',
    'color.state.hover.border',
    'color.state.pressed.background',
    'color.state.pressed.text',
    'color.state.pressed.icon',
    'color.state.pressed.border',
    'color.state.active.background',
    'color.state.active.text',
    'color.state.active.icon',
    'color.state.active.border',
    'color.state.selected.background',
    'color.state.selected.text',
    'color.state.selected.icon',
    'color.state.selected.border',
    'color.state.highlighted.background',
    'color.state.highlighted.text',
    'color.state.highlighted.icon',
    'color.state.highlighted.border',
    'color.state.disabled.background',
    'color.state.disabled.text',
    'color.state.disabled.icon',
    'color.state.disabled.border',
    'color.action.primary.background',
    'color.action.primary.text',
    'color.action.primary.icon',
    'color.action.primary.border',
    'color.action.primary.hover-background',
    'color.action.primary.hover-text',
    'color.action.primary.hover-icon',
    'color.action.primary.hover-border',
    'color.action.primary.pressed-background',
    'color.action.primary.pressed-text',
    'color.action.primary.pressed-icon',
    'color.action.primary.pressed-border',
    'color.action.primary.disabled-background',
    'color.action.primary.disabled-text',
    'color.action.primary.disabled-icon',
    'color.action.primary.disabled-border',
    'color.action.secondary.background',
    'color.action.secondary.text',
    'color.action.secondary.icon',
    'color.action.secondary.border',
    'color.action.secondary.hover-background',
    'color.action.secondary.hover-text',
    'color.action.secondary.hover-icon',
    'color.action.secondary.hover-border',
    'color.action.secondary.pressed-background',
    'color.action.secondary.pressed-text',
    'color.action.secondary.pressed-icon',
    'color.action.secondary.pressed-border',
    'color.action.secondary.disabled-background',
    'color.action.secondary.disabled-text',
    'color.action.secondary.disabled-icon',
    'color.action.secondary.disabled-border',
    'color.action.tertiary.background',
    'color.action.tertiary.text',
    'color.action.tertiary.icon',
    'color.action.tertiary.border',
    'color.action.tertiary.hover-background',
    'color.action.tertiary.hover-text',
    'color.action.tertiary.hover-icon',
    'color.action.tertiary.hover-border',
    'color.action.tertiary.pressed-background',
    'color.action.tertiary.pressed-text',
    'color.action.tertiary.pressed-icon',
    'color.action.tertiary.pressed-border',
    'color.action.tertiary.disabled-background',
    'color.action.tertiary.disabled-text',
    'color.action.tertiary.disabled-icon',
    'color.action.tertiary.disabled-border',
    'color.action.danger.background',
    'color.action.danger.text',
    'color.action.danger.icon',
    'color.action.danger.border',
    'color.action.danger.hover-background',
    'color.action.danger.hover-text',
    'color.action.danger.hover-icon',
    'color.action.danger.hover-border',
    'color.action.danger.pressed-background',
    'color.action.danger.pressed-text',
    'color.action.danger.pressed-icon',
    'color.action.danger.pressed-border',
    'color.action.danger.disabled-background',
    'color.action.danger.disabled-text',
    'color.action.danger.disabled-icon',
    'color.action.danger.disabled-border',
    'color.status.success.background',
    'color.status.success.subtle-background',
    'color.status.success.text',
    'color.status.success.strong-text',
    'color.status.success.icon',
    'color.status.success.border',
    'color.status.success.on-background',
    'color.status.warning.background',
    'color.status.warning.subtle-background',
    'color.status.warning.text',
    'color.status.warning.strong-text',
    'color.status.warning.icon',
    'color.status.warning.border',
    'color.status.warning.on-background',
    'color.status.danger.background',
    'color.status.danger.subtle-background',
    'color.status.danger.text',
    'color.status.danger.strong-text',
    'color.status.danger.icon',
    'color.status.danger.border',
    'color.status.danger.on-background',
    'color.status.info.background',
    'color.status.info.subtle-background',
    'color.status.info.text',
    'color.status.info.strong-text',
    'color.status.info.icon',
    'color.status.info.border',
    'color.status.info.on-background',
  ],
  phase2: [
    'color.card.background',
    'color.card.elevated-background',
    'color.card.text',
    'color.card.muted-text',
    'color.card.icon',
    'color.card.border',
    'color.card.hover-background',
    'color.card.pressed-background',
    'color.card.selected-background',
    'color.card.selected-border',
    'color.menu.background',
    'color.menu.text',
    'color.menu.muted-text',
    'color.menu.icon',
    'color.menu.border',
    'color.menu.divider',
    'color.menu.item-hover-background',
    'color.menu.item-pressed-background',
    'color.menu.item-active-background',
    'color.menu.item-active-text',
    'color.menu.item-active-icon',
    'color.menu.item-selected-background',
    'color.menu.item-selected-text',
    'color.menu.item-selected-icon',
    'color.popover.background',
    'color.popover.text',
    'color.popover.muted-text',
    'color.popover.icon',
    'color.popover.border',
    'color.popover.divider',
    'color.tooltip.background',
    'color.tooltip.text',
    'color.tooltip.border',
    'color.modal.background',
    'color.modal.text',
    'color.modal.muted-text',
    'color.modal.icon',
    'color.modal.border',
    'color.modal.divider',
    'color.modal.scrim',
  ],
  phase3: [
    'color.header.background',
    'color.header.text',
    'color.header.muted-text',
    'color.header.icon',
    'color.header.border',
    'color.header.action-hover-background',
    'color.header.action-pressed-background',
    'color.header.action-active-background',
    'color.header.action-active-text',
    'color.header.action-active-icon',
    'color.sidebar.background',
    'color.sidebar.text',
    'color.sidebar.muted-text',
    'color.sidebar.icon',
    'color.sidebar.border',
    'color.sidebar.item-hover-background',
    'color.sidebar.item-pressed-background',
    'color.sidebar.item-active-background',
    'color.sidebar.item-active-text',
    'color.sidebar.item-active-icon',
    'color.sidebar.item-selected-background',
    'color.sidebar.item-selected-text',
    'color.sidebar.item-highlight-background',
    'color.sidebar.item-highlight-text',
    'color.footer.background',
    'color.footer.text',
    'color.footer.muted-text',
    'color.footer.icon',
    'color.footer.border',
    'color.footer.link',
    'color.footer.link-hover',
    'color.navigation.background',
    'color.navigation.text',
    'color.navigation.muted-text',
    'color.navigation.icon',
    'color.navigation.border',
    'color.navigation.item-hover-background',
    'color.navigation.item-pressed-background',
    'color.navigation.item-active-background',
    'color.navigation.item-active-text',
    'color.navigation.item-active-icon',
    'color.navigation.item-selected-background',
    'color.navigation.item-selected-text',
    'color.navigation.item-selected-icon',
    'color.navigation.item-highlight-background',
    'color.navigation.item-highlight-text',
  ],
  phase4: [
    'color.input.background',
    'color.input.text',
    'color.input.placeholder',
    'color.input.icon',
    'color.input.border',
    'color.input.hover-border',
    'color.input.focus-border',
    'color.input.focus-ring',
    'color.input.disabled-background',
    'color.input.disabled-text',
    'color.input.disabled-icon',
    'color.input.disabled-border',
    'color.input.invalid-background',
    'color.input.invalid-text',
    'color.input.invalid-icon',
    'color.input.invalid-border',
    'color.input.readonly-background',
    'color.input.readonly-text',
    'color.input.readonly-border',
    'color.table.background',
    'color.table.text',
    'color.table.muted-text',
    'color.table.icon',
    'color.table.border',
    'color.table.divider',
    'color.table.header-background',
    'color.table.header-text',
    'color.table.header-icon',
    'color.table.row-hover-background',
    'color.table.row-selected-background',
    'color.table.row-selected-text',
    'color.table.row-highlight-background',
    'color.table.row-highlight-text',
    'color.table.sort-icon',
  ],
} as const
```

精确去重计数：

```text
ACTIVE_PUBLIC_COLOR_ROLES=9
RESERVED_FOUNDATION_COLOR_ROLES=163
RESERVED_PHASE_2_COLOR_ROLES=40
RESERVED_PHASE_3_COLOR_ROLES=46
RESERVED_PHASE_4_COLOR_ROLES=34
RESERVED_COLOR_ROLES=283
TOTAL_UNIQUE_COLOR_TAXONOMY=292
ACTIVE_PUBLIC_ROLES_TOTAL=27
ACTIVE_ALL_TYPES_PLUS_RESERVED_COLOR_ENTRIES=310
```

Reserved Set 已移除与 Active Set 重叠的七个 ID；两个仅存在于当前兼容表面的 Active ID `color.action.primary` 与 `color.text.on-action` 保持 Active。Reserved Entry 不属于 `A = R = T = N = U = M`、Theme Completeness、UnoCSS、Public TypeScript、Token Names、Runtime Public CSS 或 Public API。任何 Reserved → Active 变化都需要新的 Admission Amendment，显式修改 §11.4 的 27-record Registry、全部相关 Registry 和生成合同；仅处于此 Catalog 不构成准入。

### Exact Active Alpha Registry

Alpha Registry 只记录当前已准入且允许非不透明值的 Scrim Role：

```ts
const ActiveAlphaContractRegistry = {
  schemaVersion: 1,
  records: [
    {
      id: 'alpha-scrim-viewport',
      roleId: 'color.scrim.viewport',
      minimumAlpha: 0.56,
      maximumAlpha: 0.56,
    },
  ],
} as const
```

```text
ACTIVE_ALPHA_RECORDS=1
```

其他八个 Active Public Color Role 的默认要求是解析后 Alpha 精确为 `1`，但它们不产生 Alpha Record。`color.scrim.subtle`、`color.scrim.strong` 和 `color.modal.scrim` 保持 Reserved，不得提前进入 Active Alpha Registry。Missing、Unknown、Duplicate、Extra Record，Role ID 不等于 `color.scrim.viewport`，或任一 Alpha 不等于 `0.56` 都必须失败。Scrim 不得成为 Named Contrast Endpoint；Material-internal Alpha 继续由 Material Contract 管理。

## 13.4 Current-to-target Preference Transition

### Active Authority

Package 5 Atomic Cutover 已把唯一 Active Authority 切换为 Reference-only Explicit Theme Preference：

```text
ACTIVE_PREFERENCE_AUTHORITY=THEME_REGISTRY_REFERENCE
ACTIVE_SCHEMA=ExplicitThemePreference
ACTIVE_DEFAULT=ProductPreferenceDefault
ACTIVE_PUBLIC_EXPORTS=EXPLICIT_THEME_SCHEMA_TYPES_DEFAULT_AND_RUNTIME_HELPERS
ACTIVE_FIRST_PAINT=EXPLICIT_THEME_AND_READ_ONLY_LEGACY_MIGRATION_READER
ACTIVE_RUNTIME_APPLICATION=REGISTRY_KIND_AND_THEME_ID_TUPLE
ACTIVE_PERSISTENCE_FORMAT=EXPLICIT_THEME_PREFERENCE_DIRECT_VALUE
LEGACY_PREFERENCE_STATUS=READ_ONLY_MIGRATION_INPUT
TARGET_PREFERENCE_STATUS=ACTIVE
TARGET_PREFERENCE_ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

Active Direct Value 精确包含外层 `schemaVersion: 3` 与 `appearance.{colorMode,theme,contrast,material,density,fontScale,motion}`；`theme` 精确包含独立的 `registryKind` 与 `themeId`。Legacy `schemaVersion: 1|2` 与 Embedded Palette 只允许由 Reader/Migration 读取，不得由 Default、Public Root、Pinia、First Paint Writer 或应用 Persistence Writer 输出。

### Legacy Built-in Theme Tuple Registry

在任何 Built-in Theme Source 替换前，以下 Registry 冻结当前 `neutral`、`ocean`、`warm` Source 和 `CurrentPreference` 持久化比较值：

```ts
const LegacyBuiltInThemeTupleRegistry = {
  schemaVersion: 1,
  comparisonFields: [
    'theme',
    'palette.brand',
    'palette.accent',
    'palette.neutral',
  ],
  records: [
    {
      themeId: 'neutral',
      label: 'Neutral',
      sourcePath: 'tokens/themes/neutral.theme.json',
      brand: {
        sourceAlias: '{color.palette.neutral.700}',
        resolvedCss: 'oklch(37% 0.014 247)',
      },
      accent: {
        sourceAlias: '{color.palette.neutral.500}',
        resolvedCss: 'oklch(55% 0.012 247)',
      },
      neutral: 'neutral',
    },
    {
      themeId: 'ocean',
      label: 'Ocean',
      sourcePath: 'tokens/themes/ocean.theme.json',
      brand: {
        sourceAlias: '{color.palette.blue.600}',
        resolvedCss: 'oklch(54% 0.15 250)',
      },
      accent: {
        sourceAlias: '{color.palette.blue.500}',
        resolvedCss: 'oklch(62% 0.17 250)',
      },
      neutral: 'cool',
    },
    {
      themeId: 'warm',
      label: 'Warm',
      sourcePath: 'tokens/themes/warm.theme.json',
      brand: {
        sourceAlias: '{color.palette.orange.600}',
        resolvedCss: 'oklch(58% 0.14 45)',
      },
      accent: {
        sourceAlias: '{color.palette.orange.500}',
        resolvedCss: 'oklch(67% 0.15 50)',
      },
      neutral: 'warm',
    },
  ],
} as const
```

Migration Equality 只对 `comparisonFields` 中的 Theme ID 和三个 `CurrentPreference` Persisted String 执行 Code-point Exact Equality。`label`、`sourcePath` 与 `sourceAlias` 是不可变 Provenance，不参与 Equality。早期 Public Role Registry 和完整 Theme-plane Package 必须把新结构 Side-by-side 加入，并保留上述三个 Legacy Source Document；不得在 Migration Registry 可用和 Atomic Cutover 被接受前删除或改写 Legacy Tuple Evidence。

### Active Explicit-theme Contract

以下 Explicit-theme Schema 已由 Package 5 Atomic Cutover 激活。

```text
CAPABILITY=REFERENCE_ONLY_THEME_PREFERENCE_AND_REGISTRY
CAPABILITY_STATUS=ACTIVE
ACTIVATION_GATE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

Preference 的持久化协议判别字段只存在于 `ExplicitThemePreference` 根对象，不存在 Additional Preference Envelope；Custom Registry Snapshot 具有自己独立的 Application-owned Discriminator。Numeric Discriminator 不得扩散到类型、函数、文件、模块、标题或功能名称：

```ts
type ColorModePreference = 'light' | 'dark' | 'system'
type ContrastPreference = 'standard' | 'enhanced'
type MaterialPreference = 'adaptive' | 'reduced' | 'solid'

type ThemeReference =
  | {
      registryKind: 'built-in'
      themeId: BuiltInThemeId
    }
  | {
      registryKind: 'custom'
      themeId: CustomThemeId
    }

interface ExplicitThemeAppearancePreference {
  colorMode: ColorModePreference
  theme: ThemeReference
  contrast: ContrastPreference
  material: MaterialPreference
  density: DensityPreference
  fontScale: FontScale
  motion: MotionPreference
}

interface ExplicitThemePreference {
  schemaVersion: 3
  appearance: ExplicitThemeAppearancePreference
}
```

Atomic Cutover 后的 Preference Persistence Contract 精确为：

```text
PREFERENCE_STORAGE_KEY=pavp:web:user-preference
PREFERENCE_STORAGE_VALUE=ExplicitThemePreference
ADDITIONAL_PREFERENCE_ENVELOPE=PROHIBITED
LEGACY_PREFERENCE_WRITE=PROHIBITED_AFTER_CUTOVER
LEGACY_PREFERENCE_READ=READ_ONLY_MIGRATION_INPUT
```

应用在该 Local Storage Key 下直接保存 Repository-defined `ExplicitThemePreference`，不增加应用外层对象、`payload` Wrapper、Revision Wrapper 或 §19.5 的 General Storage Envelope。现有 Application-owned Key 保持不变。Legacy Preference Format、Embedded Palette Value 和 Legacy Default 只允许由 Migration Boundary 读取；Atomic Cutover 后的 Writer、First Paint、Pinia Store、应用 Persistence Boundary 和 Public Runtime 均不得输出 Legacy Format。

Preference 只保存 Theme Registry Reference，不嵌入 `brand`、`accent`、`neutral` 或 Theme Plane。Built-in Theme ID 必须来自已验证 Built-in Theme Document 生成的 Exact Literal Registry，不得只通过不受限正则。Custom Reference 只有在 Exact Application-owned Local Registry Entry 存在且 Complete Design System Validation 成功时才可解析；Package 5 不引入 Account、Principal、Permission、Session、Tenant 或 Auth Access Semantics。

Theme Identity 的 Canonical Key 是不可拼接的 Tuple：

```text
(registryKind, themeId)

registryKind = built-in | custom
```

Built-in 与 Custom 可以拥有相同的 `themeId` 字符串，但 Tuple 永不相等。`CustomThemeId` 是应用分配的 Opaque ID，必须在 Application-owned Local Custom Registry 中唯一；Label 不参与身份。Resolver、Cache、Storage、DOM 和 Error Result 都必须保留 `registryKind` 与 `themeId` 两个独立字段，不得把它们连接成未经转义的 Selector、Class Name、CSS Variable 或 Storage Key。

Registry Entry 必须通过 Discriminated Union 绑定 Registry Kind、Theme ID 与完整文档，且 `themeId` 必须精确等于 `definition.id`：

```ts
type ThemeRegistryEntry =
  | {
      registryKind: 'built-in'
      themeId: BuiltInThemeId
      definition: BuiltInThemeDefinition
    }
  | {
      registryKind: 'custom'
      themeId: CustomThemeId
      definition: CustomThemeDefinition
    }
```

Atomic Cutover 接受后的 Target `ExplicitThemePreference` Default 只引用 §1.4 的 `ProductPreferenceDefault`。本节不得复制完整默认对象；其 Theme Reference 字段精确采用 `registryKind/themeId`，并且只引用 Built-in `neutral`，不复制任何颜色值：

```text
DEFAULT_AUTHORITY=ProductPreferenceDefault
DEFAULT_AUTHORITY_LOCATION=SECTION_1_4
THEME_REFERENCE_FIELDS=registryKind,themeId
DUPLICATE_DEFAULT_DECLARATION=PROHIBITED
```

Theme Registry 是 Typed Product Data，不是 AI Workflow Registry、Machine-local Authority 或第二份 Architecture Authority。

Custom Theme Document 存储在 Preference 之外的 Application-owned Theme Registry。Package 5 只允许在 Vue Bootstrap 后由应用持久化边界读取 Registry，并把原始完整 Theme Definition 送入 Design System Exact Validator；不得向 Pre-Vue First Paint 提供 Custom Registry Storage Key。Preference 始终只保存 Reference，不复制 Theme Plane。

Application-owned Preference Reader 负责读取 Storage 和解析 Raw JSON。Malformed JSON 必须由 Reader 私有拒绝，不得调用 Migration，也不产生 Cross-package Migration Result。Migration Boundary 只接收已经完成 JSON Parse 的 JavaScript Value，并按 §13.6 冻结的 Exact Result 分类：Valid `ExplicitThemePreference` 返回未经改写的同一 Validated Preference；Valid `LegacyPreferenceInput` 或 `LegacySeedPreference` 只有在能够无损转换时返回确定性的 `ExplicitThemePreference`；JSON-parsed Value 不符合上述任一 Schema 时返回 `PREFERENCE_INPUT_INVALID`。

`LegacySeedPreference` → `ExplicitThemePreference` Migration 必须确定、幂等、无损并返回结构化结果。`MIGRATION_REQUIRES_THEME_COMPLETION` 只保留给已经通过 Legacy Schema、但必须取得完整 Authored Theme 才能无损转换的输入：

```text
LegacySeedPreference theme ∈ { neutral, ocean, warm }
+ embedded palette exactly equals that versioned legacy built-in seed tuple
→ same-ID complete Built-in Theme Reference

LegacySeedPreference built-in ID + modified embedded palette
→ MIGRATION_REQUIRES_THEME_COMPLETION

LegacySeedPreference custom theme or custom seed palette
→ MIGRATION_REQUIRES_THEME_COMPLETION
```

`LegacyPreferenceInput` Payload 可以先执行历史确定的 `high-contrast → system + enhanced` 和 `material=solid` 转换，再进入同一 `LegacySeedPreference` → `ExplicitThemePreference` 判定。Migration 不得从 Legacy Seed 扩展颜色、丢弃已修改的 Palette、回退到默认 `ExplicitThemePreference`、回退到 Pre-initialization Safety Baseline 或写入 Storage。任一 Failure Result 都不得删除、覆盖、修复或规范化原 Stored Value。

### Custom Theme Registry Persistence Contract

```text
CUSTOM_THEME_REGISTRY_STORAGE_KEY=pavp:web:custom-theme-registry
STORAGE_KEY_OWNER=apps/web
STORAGE_MEDIUM=Local Storage
WRITE_MODE=complete Snapshot replacement
DESIGN_SYSTEM_HARDCODED_KEY=PROHIBITED
BUILD_MANIFEST_KEY_PROJECTION=PROHIBITED
PRE_VUE_FIRST_PAINT_REGISTRY_READ=PROHIBITED
HTML_THEME_REGISTRY_STORAGE_KEY_ATTRIBUTE=PROHIBITED
```

Application-owned Persisted Shape 精确为：

```ts
interface CustomThemeRegistrySnapshot {
  schemaVersion: 1
  entries: readonly CustomThemeRegistryEntry[]
}

interface CustomThemeRegistryEntry {
  registryKind: 'custom'
  themeId: CustomThemeId
  definition: CustomThemeDefinition
}
```

`schemaVersion` 只用于持久化协议判别，不得扩散到任何名称或说明标签。Snapshot 外层字段集合精确为 `schemaVersion` 与 `entries`；每个 Entry 的字段集合精确为 `registryKind`、`themeId` 与 `definition`。`registryKind` 精确为 `custom`。`themeId` 是 Opaque、Case-sensitive Original String，不执行 Unicode Normalization、Case Folding 或其他改写，并且必须与 `definition.id` Code-point Exact Equal。Snapshot 不包含 Revision、Timestamp、Payload Wrapper、Pinia State、Effective Appearance、Handoff Data、Principal Data 或 General Storage Metadata；Writer 只能完整替换 Snapshot，并且只允许写入全部通过完整验证的 Entry。

Canonical Entry Ordering 固定为：Writer 按 Original `themeId` 的 Locale-independent Code-point Ascending Order 输出；禁止 Locale Sort、Unicode Normalization 与 Case Folding。Reader 必须先完整验证整个 Snapshot，再将 Valid-but-unsorted Entries 仅在内存中规范为同一顺序。输入顺序本身不构成拒绝原因，内存排序也不得触发自动 Local Storage Rewrite。

完整拒绝合同为：

```text
DUPLICATE_JSON_KEY=REJECT_ENTIRE_SNAPSHOT
DUPLICATE_THEME_ID=REJECT_ENTIRE_SNAPSHOT
UNKNOWN_FIELD=REJECT_ENTIRE_SNAPSHOT
MALFORMED_JSON=REJECT_ENTIRE_SNAPSHOT
INVALID_ENTRY=REJECT_ENTIRE_SNAPSHOT
IDENTITY_MISMATCH=REJECT_ENTIRE_SNAPSHOT
ROLE_CONTRACT_MISMATCH=REJECT_ENTIRE_SNAPSHOT
PARTIAL_ENTRY_SALVAGE=PROHIBITED
AUTOMATIC_CORRUPT_VALUE_DELETE=PROHIBITED
AUTOMATIC_CORRUPT_VALUE_OVERWRITE=PROHIBITED
AUTOMATIC_STORAGE_REWRITE_AFTER_NORMALIZATION=PROHIBITED
```

任一失败使整个 Snapshot 不可访问；不得恢复部分 Registry、安装部分 Theme Bank、改写 Preference、替换为 Built-in `neutral` 或合成颜色。坏值保留原状；后续显式、完整 Valid Snapshot Write 可以替换它，但读取或内存规范化本身不得删除、覆盖或修复它。

Custom Theme Deletion 必须 Fail Closed：只有成功读取并验证当前 Stored `ExplicitThemePreference`，且可以证明其 Theme Tuple 不引用目标 Custom Entry 时才允许删除。当前 Preference 引用目标或应用无法证明不引用时都必须拒绝。切换 Theme 与删除 Entry 是两个独立 Operation；另一个 Valid Theme Reference 必须先完成 Resolve、Atomic Apply、Persistence 并确认持久化成功，随后才能从完整 Registry Snapshot 删除旧 Entry。Deletion Failure 不得改变 Stored Preference。

Package 5 中 Custom Theme Accessibility 的唯一含义是：Application-owned Local Registry 中存在 Exact Custom Registry Entry，并且该 Entry 完成 Design System Validation。不得为本合同引入 Account、Principal、Permission、Session、Tenant、Server Ownership 或 Auth Semantics；未来访问扩展只属于其独立 Admission Gate。

本合同不引入 Compare-and-swap、Cross-tab Synchronization、Quarantine Storage、Principal Partition、IndexedDB 或 §19.5 Future General Storage Platform。

### Atomic Cutover Boundary

Target Explicit-theme Format 只允许通过一个不可拆分的 Production Landing 激活。该 Cutover 必须同时切换：

```text
Schema
Default
public package exports
First Paint source and generated artifacts
Runtime preparation, resolution and DOM application
application bootstrap and persistence
HTML and storage-key wiring
Manifest first-paint metadata
owning static enforcement
```

Schema 包括 Appearance、Preference、Theme 与只读 Legacy Migration Schema；Runtime 切换包括 `(registryKind, themeId)`、`data-theme-kind`、Theme Bank 安装和无效引用结果；Persistence 切换包括所有 Reader、Writer、Snapshot 和 Application-owned Key Contract。上述任一 Surface 仍使用 `CurrentPreference` Authority 时，Target Format 不得报告 Active。

Cutover 之前，新 Public Role Registry 和 Theme Plane 只能作为 Inert Side-by-side Structure 存在，不得删除 Legacy Tuple Source 或改变 `CurrentPreference` Output。Cutover 之后，`LegacyPreferenceInput` 与 `LegacySeedPreference` Format 只允许作为 Read-only Migration Input；任何 First Paint、Runtime、Application Store 或 Persistence Writer 都不得再次写出这些 Legacy Payload。`main` 上不得存在 New Reader + Legacy Writer、New Default + Legacy First Paint、New Schema + Legacy Runtime 或任何其他 Mixed-authority Intermediate Commit。

```text
PREFERENCE_CUTOVER=ATOMIC
LEGACY_BUILTIN_THEME_TUPLE_REGISTRY=EXACT_IMMUTABLE_MIGRATION_INPUT
NO_MIXED_AUTHORITATIVE_FORMAT_ON_MAIN
LEGACY_FORMAT_AFTER_CUTOVER=READ_ONLY_NEVER_WRITTEN
```

未来 `roleContractVersion` 提升时，只允许一种不要求重填颜色的确定性 Rebound：两个 Historical/Current Public Color Role Set、Alpha Contract Registry 和 Named Contrast Registry 必须逐记录完全相等，差异只来自非颜色 Public Role Admission。此时 `validateCustomThemeDefinition` 可以在内存中把完整 Historical Theme 重新验证为 Current Contract，保持每个 Authored Color String 逐字不变，并返回 §13.6 的 `rebound` Branch 与 Previous/Current Role Contract Evidence；不得写回 Storage，是否保存 Current Contract Document 由应用边界显式决定。Package 5 不得为了使该分支可达而制造 Historical Role Contract Registry。

只要 Public Color Role、Alpha Policy、Named Pair、Endpoint、Kind、Threshold 或 Maximum Useful Ratio 有任何变化，Historical Custom Theme 就不得自动补齐新增 Role、只改 Numeric Discriminator 或沿用 Historical Validation。它必须以 `ROLE_CONTRACT_MISMATCH` 保持不可应用，直到用户或开发者为全部 Current Field 提供显式值、重新通过完整 Validation，并保存为 Current Contract Document；原文档不得被静默覆盖。

Migration、Custom Theme Validation、Theme Reference Resolution 与 Custom Theme Bank Installation 只能返回 §13.6 冻结的 Exact Discriminated Union，不得增加 Generic Optional Evidence 或通用 Error Platform。无效引用可以暂时保留 Safe First-paint Baseline，但该 App Runtime State 不进入 Public Result，也不得导致 Stored Preference 被替换、删除或重写。

## 13.5 Pure Material Resolver

Resolver 只接收显式输入：

```ts
interface ResolveMaterialInput {
  storedMaterial: MaterialPreference
  forcedColorsActive: boolean
  reducedTransparencyRequested: boolean
  backdropFilterSupported: boolean
}
```

Color Mode Resolver 同样是纯函数，输入 Stored Color Mode 与 `prefersDark`，输出 `light | dark`。所有 Resolution Environment 输入由应用编排层收集并显式传入。

固定优先级：

```text
forced-colors active                 → solid
stored material = solid             → solid
stored material = reduced           → reduced
adaptive + reduced transparency     → reduced
adaptive + backdrop unsupported     → solid
otherwise                           → adaptive
```

显式 `reduced` 必须在 Backdrop 不受支持时仍解析为 `reduced`。`reduced` 是不依赖背景内容或 Backdrop Filter 的高不透明度可读投影；`solid` 完全不使用 Backdrop。Enhanced Contrast 不得修改 Stored Material。Forced Colors 同时具有 CSS 安全 Fallback，即使 JavaScript 尚未执行也必须保持不透明和可读。

Capability 或 Media Query 状态改变时重新执行纯 Resolver，只更新 Effective DOM State，不改写用户偏好。

## 13.6 Ownership Boundary

以下 Ownership 是 Atomic Cutover 后的 Active Boundary。Package 5 已原子退休 §13.4 的 `CurrentPreference` Schema、Default、Public Export、First Paint、Runtime 和 Persistence Authority；Legacy Shape 只保留为内部 Read-only Migration Input。

`@platform/design-system` 负责机制：

```text
Zod schemas
versioned Public Role Registry
ThemeDefinition exact validation
versioned Alpha Contract Registry
versioned Named Contrast Registry
Built-in Theme Registry contract
one reference-only ExplicitThemePreference default
parsed Preference classification and LegacyPreferenceInput / LegacySeedPreference → ExplicitThemePreference structured migration
Theme Reference resolution result
typed Custom Theme Bank Installer
pure color-mode and material resolvers
DOM appearance application helper
generated critical-theme.css
generated synchronous appearance-init.js
generated-output drift contract
```

`apps/web` 负责应用编排：

```text
direct ExplicitThemePreference persistence at pavp:web:user-preference
application-owned preference Storage Key and HTML attribute wiring
post-Vue Custom Theme Registry Snapshot persistence at pavp:web:custom-theme-registry
Custom Theme Registry access, deletion and failure boundary
Pinia state
matchMedia subscriptions
bootstrap order
index.html inclusion
runtime re-resolution orchestration
```

Design System 不得硬编码应用 Storage Key，也不得拥有 Pinia 或直接选择应用持久化策略。应用通过 `appearance-init.js` Script Element 的显式 `data-preference-storage-key` 提供 Preference Storage Key，并由静态治理验证 HTML 与应用配置一致。Package 5 不提供 `data-theme-registry-storage-key`，Generated First Paint 不读取 Custom Registry；Vue Bootstrap 后的 Application-owned Persistence Boundary 才能使用 `pavp:web:custom-theme-registry`。Registry Snapshot 与 Preference 是两个直接持久化的独立 Schema Boundary，不得互相包裹，也不得把 Theme Plane 嵌入 Preference。

### Public Design System Boundary

`AUTHORIZED_PACKAGE_5_CONSUMER` 只表示已由 Package 5 落地的 `apps/web` Appearance Preference、Custom Theme Registry Orchestration、Effective-state Derivation、Application Persistence Lifecycle 和 Generated First Paint Integration。该术语不授权任何 Feature、Page、Shared UI 或 Future Package 使用该边界。

Package 5 新增的 Public Root Symbol 精确为：

```text
explicitThemePreferenceSchema
ExplicitThemePreference
ProductPreferenceDefault
ThemeReference
CustomThemeRegistryEntry
ThemeRegistryEntry
migrateToExplicitThemePreference
PreferenceMigrationResult
validateCustomThemeDefinition
CustomThemeValidationResult
resolveThemeReference
ThemeReferenceResolutionResult
installCustomThemeBank
ThemeBankInstallationResult
```

现有 Public Runtime Mechanism 保留，但在需要处随 Atomic Cutover 更新为 Explicit Theme Contract：

```text
applyAppearance
EffectiveAppearanceState
resolveColorMode
resolveMaterial
```

以下 Public Surface 保持不变：

```text
tokens
tokenNames
TokenName
platformPreset
./tokens.css
```

每个 Public Symbol 的 `AUTHORIZED_PACKAGE_5_CONSUMER` 理由精确为：

| Public symbol | Authorized use and boundary reason |
| --- | --- |
| `explicitThemePreferenceSchema`; `ExplicitThemePreference` | 应用 Preference Read、Migration Output、Pinia Stored State 与 Direct Persistence 共用一份 Exact Contract，防止应用复制 Schema。 |
| `ProductPreferenceDefault` | 应用创建新 Preference 和显式 Reset 使用唯一 Default Authority，防止 Consumer-authored Default。 |
| `ThemeReference`; `CustomThemeRegistryEntry`; `ThemeRegistryEntry` | 应用 Registry、Resolver 与 Appearance Orchestration 共享 Exact Tuple/Entry Contract，防止重复 Theme Identity Authority。 |
| `migrateToExplicitThemePreference`; `PreferenceMigrationResult` | Generated First Paint 与应用 Bootstrap 共享 Pure Parsed-preference Migration Boundary，防止第二份输入分类或 Legacy Migration 实现。 |
| `validateCustomThemeDefinition`; `CustomThemeValidationResult` | 应用 Registry Ingestion 通过公共根调用完整 Design System Validation，防止 Deep Import 或应用自建 Validation。 |
| `resolveThemeReference`; `ThemeReferenceResolutionResult` | 应用根据可访问 Registry 解析 Exact Reference，防止应用复制 Resolution Code 或 Error Mapping。 |
| `installCustomThemeBank`; `ThemeBankInstallationResult` | 应用只把已验证 Custom Entry 交给 Typed Installer，防止直接操作 Private Bank Variable 或 DOM Helper。 |
| `applyAppearance`; `EffectiveAppearanceState`; `resolveColorMode`; `resolveMaterial` | 应用 Appearance Orchestration 保留现有公共机制并原子切换 Tuple-aware Effective Contract，防止应用复制 Resolver/DOM Authority。 |
| `tokens`; `tokenNames`; `TokenName`; `platformPreset`; `./tokens.css` | Package 5 保持现有公共 Token/CSS Consumer Contract，不以 Theme Bank 扩大或绕过 Public Root。 |

以下保持 Private，不得增加 Design System Deep-import Path：Standalone Custom Theme Document Schema、Standalone Theme Reference Schema、Built-in/Custom ID Schema、Built-in Theme Definition Construction、Duplicate-aware Parser、Raw Document Builder、由 `apps/web` 拥有的 Snapshot Schema Implementation、Manifest Builder、Theme Bank Variable Builder、Serializer Helper、Private DOM Mutation Helper、First Paint Handoff Carrier、可由 Public Function 推断的 Helper Input Type、Runtime Custom Theme Registration Metadata 与 Private Validation Helper。

Atomic Cutover 必须从 Active Public Root 移除：

```text
appearancePreferenceSchema
AppearancePreference
legacySeedThemeDefinitionSchema
legacySeedThemeIdSchema
LegacySeedThemeDefinition
currentPreferenceSchema
CurrentPreference
defaultCurrentPreference
migrateToCurrentPreference
prepareFirstPaint
FirstPaintApplicationBoundary
FirstPaintResolutionEnvironment
PreparedFirstPaintState
PrepareFirstPaintInput
AppearanceApplicationTarget
AppearanceAttributeTarget
AppearanceStyleTarget
ResolveColorModeInput
ResolveMaterialInput
```

`LegacyPreferenceInput`、`LegacySeedPreference`、Legacy Built-in Theme Tuple Registry、Legacy Theme Source Documents、Historical High-contrast Interpretation 与 Historical Material Interpretation 仅在 Design System 内部保留为 Read-only Migration Evidence。当前 Repository 不存在 Legacy Preference Writer；Package 5 不得创建任何输出 Legacy Format、Embedded Palette 或 Legacy Default 的 Writer。

### Cross-package Structured Results

Package 5 只冻结下列 Migration、Custom Theme Validation、Theme Reference Resolution 与 Custom Theme Bank Installation Result；不得建立 Generic Result、Error Platform、Public Storage Result 或私有 Helper Error Registry。

```ts
type PreferenceMigrationResult =
  | {
      status: 'success'
      preference: ExplicitThemePreference
    }
  | {
      status: 'failure'
      code: 'MIGRATION_REQUIRES_THEME_COMPLETION'
    }
  | {
      status: 'failure'
      code: 'PREFERENCE_INPUT_INVALID'
    }
```

`PreferenceMigrationResult` 的语义分类精确为：Valid `ExplicitThemePreference` 返回 `success` 和未经改写的 Validated Preference；能够无损转换的 Valid `LegacyPreferenceInput` 或 `LegacySeedPreference` 返回 `success` 和确定性的 `ExplicitThemePreference`；只有 Valid Legacy Preference 含有修改过的 Built-in Embedded Palette、Legacy Custom Theme 或需要完整 Authored Theme 的 Seed-based Theme 时返回 `MIGRATION_REQUIRES_THEME_COMPLETION`；JSON-parsed Input 不符合 `ExplicitThemePreference`、`LegacyPreferenceInput` 或 `LegacySeedPreference` 任一 Schema 时返回 `PREFERENCE_INPUT_INVALID`。Malformed JSON 不进入 Migration，由 Application-owned Preference Reader 私有拒绝，不产生 Cross-package Migration Result。

`PREFERENCE_INPUT_INVALID` 只是 Package 5 Preference Migration Domain Result，不是 General Error Registry Entry、Storage Error、JSON Parser Error、Custom Theme Validation Issue、Permission、Authentication、Session、Transport 或 Runtime-kernel State。它不授权返回 `ProductPreferenceDefault` 或 Pre-initialization Safety Baseline，也不授权删除、覆盖、修复或规范化 Stored Value。

`migrateToExplicitThemePreference` 必须 Pure，只负责分类已经解析的 JavaScript Value：不读写 Storage、不替换为 Default 或 Safety Baseline、不丢失或改写 Embedded Legacy Palette、不构造缺失的 Custom Theme Color、不合成 Complete Theme，也不删除 Original Input。Public Result 不包含 Parser Exception、Raw Input、Storage Cause、Stack、Field Path、Source Label 或 Optional Generic Evidence。Application-owned Preference Reader 继续独立负责 Malformed Raw JSON 和 Storage Accessibility Failure。

§13.4 已冻结的 `CustomThemeRegistryEntry` 在语义上精确等价于 `Extract<ThemeRegistryEntry, { registryKind: 'custom' }>`；不得定义第二个不同 Shape。Public Validator 只返回该 Custom Entry：

```ts
type CustomThemeValidationResult =
  | {
      status: 'validated'
      entry: CustomThemeRegistryEntry
    }
  | {
      status: 'rebound'
      code: 'ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY'
      entry: CustomThemeRegistryEntry
      previousRoleContractVersion: number
      currentRoleContractVersion: number
    }
  | {
      status: 'rejected'
      code: 'THEME_INVALID'
      registryKind: 'custom'
      themeId: string | null
      evidence: readonly ThemeValidationEvidence[]
    }
  | {
      status: 'rejected'
      code: 'ROLE_CONTRACT_MISMATCH'
      registryKind: 'custom'
      themeId: string
      receivedRoleContractVersion: number
      requiredRoleContractVersion: number
    }
```

`ThemeValidationEvidence` 是上述 Result Shape 的非 Root-exported Internal Type。每条 Evidence 只允许在适用时包含 Existing Architecture 已要求的 Theme ID、Role Contract Evidence、Field Path、Role、Plane、Safe Submitted Value、Alpha Evidence 与 Contrast Evidence；禁止 Parser Exception、Storage Cause、Stack、DOM Error、App Presentation State 或 Persistence State。`ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY` 保持合法 Frozen Domain Result，但 Package 5 不得仅为使该分支可达而制造 Historical Role Contract Registry。

```ts
type ThemeReferenceResolutionResult =
  | {
      status: 'resolved'
      reference: ThemeReference
      entry: ThemeRegistryEntry
    }
  | {
      status: 'unresolved'
      reference: ThemeReference
      code: 'THEME_NOT_FOUND'
    }
  | {
      status: 'unresolved'
      reference: ThemeReference
      code: 'THEME_INACCESSIBLE'
    }
  | {
      status: 'unresolved'
      reference: ThemeReference
      code: 'THEME_INVALID'
      evidence: readonly ThemeValidationEvidence[]
    }
  | {
      status: 'unresolved'
      reference: ThemeReference
      code: 'ROLE_CONTRACT_MISMATCH'
      receivedRoleContractVersion: number
      requiredRoleContractVersion: number
    }
```

Exact Tuple 不存在于 Accessible Registry 时返回 `THEME_NOT_FOUND`；Application-owned Custom Registry 不可用或完整 Snapshot 不可接受时返回 `THEME_INACCESSIBLE`；Requested Entry 存在但完整 Theme Validation 失败时返回 `THEME_INVALID`；Requested Entry 的 Role Contract 不兼容时返回 `ROLE_CONTRACT_MISMATCH`。该 Union 不包含 App Appearance-retention State、Safety-baseline State、Persistence State、Raw Storage Cause 或 Generic Optional Evidence。

```ts
type ThemeBankInstallationResult =
  | { status: 'installed' }
  | { status: 'rejected' }
```

`installCustomThemeBank` 只接受 Already-validated `CustomThemeRegistryEntry`。No Partial Bank、No Partial Identity、No Stale Previous Custom Variable、No Custom ID-derived Selector 与 Rejection 后 Complete Cleanup 是强制 Implementation Invariant，不是 Public Result Field；不得增加 `committedAppearanceRetained`、`partialBankPresent`、`partialIdentityPresent`、`storageWritePerformed` 或同类 App/Proof Field。

## 13.7 Theme-bank Projection

本节全部 Projection、Selector、Installer 和 Manifest Mechanic 已由 Package 5 Atomic Cutover 激活；Theme Bank 与 `data-theme-kind` 只由下列生成和 Runtime 边界拥有。

Generator 和 Runtime Custom Theme Installer 必须共享同一份 Private Theme Bank Schema，避免 Theme × Mode × Contrast Selector 的笛卡尔展开。每个 Built-in Theme Selector 一次性写入四套完整 Private Bank，并同时匹配 Registry Kind 与 Exact Built-in ID：

```text
html[data-theme-kind='built-in'][data-theme='<exact-built-in-id>']
→ --ui-theme-bank-light-standard-*
→ --ui-theme-bank-light-enhanced-*
→ --ui-theme-bank-dark-standard-*
→ --ui-theme-bank-dark-enhanced-*
```

Effective Color Mode Selector 只选择 Mode，并把两个 Contrast Bank 映射到中间 Private Bank：

```text
html[data-color-mode]
→ --ui-theme-bank-effective-standard-*
→ --ui-theme-bank-effective-enhanced-*
```

Contrast Selector 只选择 Standard 或 Enhanced，并把稳定 Public CSS Variable 绑定到对应的 Effective Bank：

```text
html[data-contrast]
→ --ui-color-* = var(--ui-theme-bank-effective-<contrast>-*)
```

规范示意：

```css
html[data-theme-kind='built-in'][data-theme='ocean'] {
  --ui-theme-bank-light-standard-surface-page: <authored value>;
  --ui-theme-bank-light-enhanced-surface-page: <authored value>;
  --ui-theme-bank-dark-standard-surface-page: <authored value>;
  --ui-theme-bank-dark-enhanced-surface-page: <authored value>;
}

html[data-color-mode='dark'] {
  --ui-theme-bank-effective-standard-surface-page:
    var(--ui-theme-bank-dark-standard-surface-page);
  --ui-theme-bank-effective-enhanced-surface-page:
    var(--ui-theme-bank-dark-enhanced-surface-page);
}

html[data-contrast='enhanced'] {
  --ui-color-surface-page:
    var(--ui-theme-bank-effective-enhanced-surface-page);
}
```

Runtime-created Custom Theme 不生成用户可控 Selector、Class Name、CSS Text 或 Repository Manifest Record。Exact Validator 接受完整 Theme 后，Typed Custom Theme Bank Installer 只允许按 Registry 中已知 Bank Variable Allowlist，把四个 Plane 的已验证 Authored Value 写入根节点相同的 Private Plane Bank；它必须：

1. 在单个同步 Mutation Batch 中准备完整四平面值。
2. 在切换 Identity 前移除上一 Custom Theme 的全部 Inline Bank Variable。
3. 写入全部新 Bank Variable 后，分别用 DOM API 设置 `data-theme-kind='custom'` 与 Opaque `data-theme` ID。
4. 切回 Built-in、Theme 失效、Registry Access 被撤销或卸载时，移除全部 Custom Inline Bank Variable，再应用新的有效 Tuple 或保留 Safe Baseline。
5. 失败时不留下 Partial Bank、Partial Identity 或旧 Custom Value。

Installer 不接受 CSS Property Name、Selector、Alias 或任意 Style Text；Custom Theme ID 永不进入 CSS Selector Construction。Built-in Selector 与 Custom Inline Bank 共享后续 Effective Mode Bank 和 Contrast Binding，因此 Public CSS Variable 与 UnoCSS Class 完全不变。

Private Plane Bank 和 Effective Bank 都是 `ui-internal`：只进入 Runtime CSS 与 §11.4 冻结的 Active Built-in Theme Manifest Shape，不进入 Public TypeScript、Token Names 或 UnoCSS。Runtime Custom Instance 只形成 Private Ephemeral Registration Metadata，不修改 Build Manifest、不成为 Public API，也不落入生成文件。

禁止 Theme × Mode × Contrast Compound Selector、完整 Cartesian CSS、Value-diff 省略、相等值推断、Theme Inheritance 或运行时颜色合成。Density 与 Material 保持独立，只能使用各自的单轴 Selector；它们不得进入 Color Bank 或 Color Plane。Theme Bank Output 继续受 CSS Budget 和 Generated Drift Gate 约束。

## 13.8 Explicit Theme Validation Pipeline

本 Pipeline 已在 Atomic Cutover 中与 Theme、Preference、Registry、First Paint 和 Runtime 一起激活；Legacy Embedded-palette 只在只读 Migration Boundary 中使用，不执行或替代下列完整 Theme Pipeline。

```text
Explicit ThemeDefinition
       ↓
Duplicate-aware raw document parse
       ↓
Strict Exact-set Zod Validation
       ↓
Built-in explicit Primitive Alias resolution
or Custom absolute CSS color parse
       ↓
Supported gamut and Exact Alpha Contract Registry validation
       ↓
Versioned Named Contrast Registry validation
       ↓
Enhanced difference invariant validation
       ↓
Accept unchanged or reject entire Theme
       ↓
Private Theme Bank and stable Public Variable projection
```

Canonical Theme Interchange Format 是 UTF-8 JSON。Built-in Source、Custom Import 和 Registry Snapshot 必须先使用 Duplicate-key-aware Parser 检查原始文档，再构造对象并进入 Zod；不得先用会丢弃重复 Key 的普通 `JSON.parse` 后再声称完成 Duplicate Validation。Typed In-memory Theme Map 必须来自同一 Validator，不能绕过 Raw-import Boundary。

`SUPPORTED_THEME_GAMUT=sRGB`。Color.js 只用于 Parse、精确数值比较、Gamut Check、Alpha Check 和 Contrast Calculation。超出支持色域、违反 Exact Alpha Contract、无法静态求值、缺失、不完整或不合格的值必须拒绝；不得执行：

```text
Brand/Accent Seed expansion
automatic palette generation
automatic lightness derivation
automatic chroma derivation
semantic color synthesis
implicit role inheritance
partial-theme merge
silent fallback
gamut remapping
color rounding that changes a submitted value
silent contrast correction
replacement with a platform-selected color
```

验证失败必须通过 §13.6 的 Result Branch 提供可定位证据。`ThemeValidationEvidence` 只允许在适用时使用以下 Existing Evidence Field，不得添加 Generic Error、Parser、Storage、DOM、App 或 Persistence Field：

```text
themeId
roleContractVersion
fieldPath
role
plane
submittedValue
actualAlpha?
requiredAlphaPolicy?
contrastPairId?
actualRatio?
requiredRatio?
```

示例：

```text
planes.dark.enhanced.color.text.secondary
text-secondary-on-page: 6.43:1 < 7:1
```

一次失败拒绝整个 Theme Definition，不输出 Partial Theme，不修改提交值，也不改写 Stored Preference。

## 13.9 Atomic Cutover 后用户可修改

Cutover 前，用户只可修改当前 `AppearancePreference` Schema 已公开的 Embedded Palette 和 Appearance Preference。Cutover 后才开放：

* Target `roleContractVersion` 准入的每一个 Public Color Role。
* Light Standard Plane。
* Light Enhanced Plane。
* Dark Standard Plane。
* Dark Enhanced Plane。
* Color Mode。
* 对比度级别。
* Material Preference。
* 主题预设。
* 自定义主题名称。
* Theme Registry 中自己的完整 Custom Theme。

## 13.10 用户不可修改

* 任意 CSS。
* 任意 UnoCSS 类名。
* 任意 CSS Variable 名称。
* 任意第三方 Token。
* Built-in Theme Registry 身份。
* Platform-owned Role Registry、Alpha Contract Registry、Named Contrast Registry、Pair Endpoint 或 Threshold。
* JavaScript。
* HTML。
* 组件内部结构。
* Alias、`var()`、`currentColor`、CSS-wide Keyword、System/Relative/Computed Color 或 Seed 形式的 Custom Theme Field。
* 未经过完整校验的颜色、Material 或状态组合。

## 13.11 First Paint

本节的 Tuple-aware Registry Snapshot、`data-theme-kind` 和 Explicit-theme Validation 已在 §13.4 Atomic Cutover 中共同激活。`LegacyPreferenceInput` / `LegacySeedPreference` 只保留为只读 Migration Input；`data-preference-storage-key` 继续由应用拥有。

构建输出：

```text
packages/design-system/src/generated/critical-theme.css
packages/design-system/src/generated/appearance-init.js
```

加载顺序：

```text
critical-theme.css
       ↓
synchronous classic appearance-init.js
       ↓
Vue Bootstrap
```

Atomic Cutover 后，应用在 `index.html` 只显式提供自己的 Preference Storage Key：

```html
<script
  src="/generated/appearance-init.js"
  data-preference-storage-key="application-owned-key"
></script>
```

示例值只是应用配置位置，不是 Design System 默认值；它必须由应用配置为 §13.4 冻结的 Existing Preference Key。Package 5 的 `index.html` 不得提供 `data-theme-registry-storage-key`，Generated First Paint 不得读取 `pavp:web:custom-theme-registry` 或从 Preference 猜测 Theme Data。真实构建路径由 Vite Production Build 固定并由 Drift Check 验证。

Atomic Cutover 后，`critical-theme.css` 默认提供 Built-in Neutral 的 Light、Standard、Comfortable、Solid 安全基线及其最小 Critical Selector。初始化脚本在 Vue、Pinia 和应用模块执行前同步读取应用提供的 Preference Key。其 Preference Read Boundary 私有处理 Storage Accessibility 与 Malformed Raw JSON；Malformed JSON 不调用 Migration，也不产生 Cross-package Migration Result。完成 JSON Parse 后，脚本直接验证 `ExplicitThemePreference` 或按 §13.6 的 Exact Three-branch Result 执行 Pure Migration。只有 `success` 且包含 Valid Built-in Theme Reference 的结果可以在 Vue 前从 Generated Exact Built-in Registry 同步解析并原子设置：

```text
effective colorMode
theme registry kind
theme id
density
fontScale
motion
contrast
effective material
```

Stored Preference 引用 Custom Theme 时，First Paint 必须保留完整 Safety Baseline，并通过 Private Implementation Handoff 让 Vue Bootstrap 后的应用边界重新处理该 Reference；Handoff 不是 Public API、Manifest Field 或 Persistence Shape。Vue Bootstrap 后，应用才能读取并完整验证 Application-owned Custom Registry Snapshot；只有 Exact Entry 存在且 Design System Validation 成功时，才可 Resolve、Install Bank 并原子应用 Custom Appearance。Registry 不可用、整个 Snapshot 不可接受、Entry 缺失或 Theme 无效时不得改成 `neutral`、删除或改写 Preference、合成颜色、恢复部分 Registry 或安装 Partial Bank。

First Paint 与 Post-Vue Restoration 必须使用同一 §13.6 Result Classification。`MIGRATION_REQUIRES_THEME_COMPLETION` 与 `PREFERENCE_INPUT_INVALID` 都保留完整 Safety Baseline、不继续 Theme Resolution 且不写 Storage，但两者不得互相替代：前者只表示 Valid Legacy Preference 需要 Complete Theme Reconstruction，后者只表示已经解析的 Input 不属于任何允许的 Preference Schema。任一分支都不得静默返回 Product Default。

Atomic Cutover 后，初始化脚本不得读取未经校验的字段、内置应用 Storage Key、Custom Registry Snapshot、初始化 Pinia、请求网络、加载完整主题编辑器或把 Effective State 写回 Stored Preference。它不得写入任何 Storage。Preference 读取、解析、Migration、Built-in Resolution、Atomic Appearance Application 或能力检测失败时必须保留完整 Solid Critical Baseline。它与 Runtime Resolver、Custom Theme Bank Installer 必须从同一 Canonical Contract 生成并接受 Drift Check。

---

# 14. 密度和尺寸系统

## 14.1 六个独立轴

```text
Spatial Density
Font Scale
Touch Target
Radius Style
Content Width
Layout Dimensions
```

禁止再将这些轴绑定成一个 `SizePreset`。

这些尺寸轴也不得与 Theme、Effective Color Mode、Contrast、Color、Motion、z-index 或 Material 绑定；Density、Font Scale、Touch Target、Radius、Content Width、Layout Dimensions、Motion、Color、Contrast、Material 和 z-index 始终独立解析。

## 14.2 密度预设

```ts
type UiDensity =
  | 'compact'
  | 'comfortable'
  | 'spacious'
```

当前 27-role Public Contract 中与 Density 相关的唯一 Active Role 是 `interaction.control.height`，且当前值不是三档完整 Public Projection。以下 `TargetDensityProjectionSet` 是未来候选集合，不是当前 Active Set：

```text
interaction.control.height
spacing.control.inline
spacing.control.block
spacing.control.gap
spacing.field.gap
spacing.section.gap
interaction.toolbar.height
interaction.navigation.item-height
interaction.table.row-height
spacing.dialog.padding
spacing.list-item.gap
```

其中除 `interaction.control.height` 外的十个 ID 都是非 Public Candidate；它们不属于 §13.3 的 283 个 Reserved Color ID，也不属于当前 `A = R = T = N = U = M`。只有后续 Admission Amendment 显式更新 §11.4 Active Registry 后，`compact`、`comfortable` 和 `spacious` Source 才必须具有完全相同的 `TargetDensityProjectionSet`、结构和 Dimension Type。每个 Preset × Role 单元必须独立、明确地由作者策划；允许显式 Alias 固定 Primitive，但禁止：

```text
引用另一个 Density Preset
继承另一个 Preset
以 Comfortable 乘比例
使用公共 Scale Formula
从一个 Preset 自动推导另外两个 Preset
```

当前 Density Source 保持 `build-only`，不得因本修订新增 Public Output。未来 Admission Amendment 接受后，每个 Source Role 才投影为同名、`visibility=public` 的 Density-conditioned Semantic Alias；三个 Preset 构成 33 个完整 Condition Record 和 11 个唯一 Public Role。缺失、额外、重复或类型不一致必须使 Generation Failure。

该未来 Admission 接受后，Generator 必须生成独立选择器：

```text
:root                                        → comfortable safe baseline
html[data-density='compact']                 → exactly eleven public density variables
html[data-density='comfortable']             → exactly eleven public density variables
html[data-density='spacious']                → exactly eleven public density variables
```

在 Admission 以前不得生成这 11-role Selector。Admission 以后 Density Selector 不得与 Theme、Color Mode、Contrast 或 Material 组合，只能写入这 11 个 Public Variable。公共 TypeScript、Token Names、UnoCSS 和 Manifest 使用唯一 Semantic Role；Condition Record 只在 Runtime CSS 与 Manifest 展开。

Reserved Target Projection（不是当前 Public API）：

| Candidate Role | Target CSS Variable | Target UnoCSS Class |
| --- | --- | --- |
| `interaction.control.height` | `--ui-control-height` | `h-control` |
| `spacing.control.inline` | `--ui-space-control-inline` | `px-control` |
| `spacing.control.block` | `--ui-space-control-block` | `py-control` |
| `spacing.control.gap` | `--ui-space-control-gap` | `gap-control` |
| `spacing.field.gap` | `--ui-space-field-gap` | `gap-field` |
| `spacing.section.gap` | `--ui-space-section-gap` | `gap-section` |
| `interaction.toolbar.height` | `--ui-control-toolbar-height` | `h-toolbar` |
| `interaction.navigation.item-height` | `--ui-control-navigation-item-height` | `h-navigation-item` |
| `interaction.table.row-height` | `--ui-control-table-row-height` | `h-table-row` |
| `spacing.dialog.padding` | `--ui-space-dialog-padding` | `p-dialog` |
| `spacing.list-item.gap` | `--ui-space-list-item-gap` | `gap-list-item` |

这些 Target Name 已经过 `PAVP_NAMING_NORMALIZATION` 的语义审查；后续 Admission Amendment 只能决定是否准入，不得借机重命名当前兼容 Role 或 Class。任何未来重命名必须通过独立、显式准入的 Compatibility Change。Toolbar Height、Navigation Item Height、Table Row Height 和 Dialog Padding 是候选 Spatial-density Metric，不授权 Density 控制一般 Layout Geometry。Density 不得修改：

```text
fontScale
touchTarget
radius
contentWidth
layoutGeometry
layoutColumns
z-index
motion
contrast
color
material
```

## 14.3 连续密度微调

```ts
interface DensityPreference {
  preset: UiDensity
  scale: number
}
```

约束：

```text
minimum = 0.90
maximum = 1.15
step = 0.05
```

`DensityPreference.scale` 暂时只作为经过 Schema 校验、可以无损 Round-trip 的 Stored Field，默认值为 `1`。在独立命名的 Personalization Work Package 通过 Admission Gate 并批准完整 Canonical Application Rule 前，Effective Runtime Density 只由 `preset` 决定。

当前 Runtime、First Paint、DOM Attribute、Generated CSS、Token Resolution、UnoCSS、Component 和 Layout 不得应用 `scale`。非 `1` 值不得触发计算、插值、自动缩放 11 个 Density Role 或改变其他独立轴，也不得被静默重写。

未来 Density Scale Application Contract 至少必须定义逐 Role Algorithm、Rounding、Clamp、Accessibility Minimum、Migration、First-paint Parity 和 Static Enforcement；`fontScale` 保持独立且不受该延迟影响。

## 14.4 字号缩放

```ts
type FontScale =
  | 0.9
  | 1
  | 1.1
  | 1.2
```

使用：

```css
html {
  font-size: calc(100% * var(--ui-font-scale));
}
```

保留浏览器缩放能力，不阻止用户 Zoom。

## 14.5 触控命中区域

视觉紧凑不等于点击区域紧凑。

WCAG 2.2 AA 要求指针目标达到至少 24×24 CSS 像素或具有足够间距，44×44 是更严格的增强目标。

平台规则：

```text
Minimum interactive target = 24 × 24 CSS px
Preferred coarse-pointer target = 44 × 44 CSS px
```

Compact 模式允许视觉高度低于 44px，但外层命中区域仍应安全。

---

# 15. UnoCSS 最终规范

配置：

```ts
export default defineConfig({
  presets: [
    presetWind4({
      preflights: {
        reset: true,
        theme: {
          mode: 'on-demand',
        },
      },
    }),

    presetIcons({
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json')
          .then(module => module.default),
      },
    }),

    platformPreset(),
  ],
})
```

UnoCSS Vite Plugin 使用全局模式并在应用入口显式导入 `virtual:uno.css`。

UnoCSS 是从 §11.4 的 27-record Public Role Registry 确定性生成的公共消费投影，不是 Token、Theme 或 Density Authority。`platformPreset` 的 Theme Entry、Exact Rule 和已准入 Semantic Shortcut 必须全部来自对应 Record 的 Mapping Metadata；本节不建立第二份 Mapping Authority。

Theme、Effective Color Mode、Contrast 和 Density 只能改变稳定 Public CSS Variable 的值；不得改变 Public UnoCSS Class Name。每个 Public Role 必须映射到一个属性范围明确的 Generator Kind、Family、Key、非空 Generated Class List 和 Allowed CSS Property Set。Color、Spacing、Dimension、Typography Size、Content Width 与 z-index 在 Generic Family 会暴露额外 Property 时必须使用 Exact Rule。一个无法安全映射的 Public Role 必须导致 Generation Failure。

Required Mapping Families：

| Public Token Type | Generated UnoCSS Target |
| --- | --- |
| Semantic Color | property-scoped `color` mapping and exact semantic rules |
| Spacing and reusable Dimension | property-compatible exact rule |
| Content Max Width | `max-width` exact rule |
| Typography Size | `font-size` exact rule |
| Font Family | Wind4 `font` |
| Font Weight | Wind4 `fontWeight` |
| Line Height | Wind4 `leading` |
| Radius | Wind4 `radius` |
| Shadow | Wind4 `shadow` |
| Duration | property-compatible exact rule |
| Easing | property-compatible exact rule |
| z-index and layout-only values | generated exact allowlisted rules |

`PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS` 已精确补齐以下六个原缺失 Active Mapping：

```text
interaction.control.height  → h-control       → height
interaction.motion.duration → duration-motion → --un-duration, transition-duration
interaction.motion.easing   → ease-motion     → --un-ease, transition-timing-function
layout.content.max-width    → max-w-content   → max-width
layout.z.base               → z-base          → z-index
layout.z.overlay            → z-overlay       → z-index
```

其余 21 个 Mapping 也已从原隐式 Formatter Logic 转录为 §11.4 的显式 Record 并逐 Class 验证。`border-border-default`、`ring-focus-ring`、`bg-surface-page`、`text-text-primary`、`gap-content-gap` 等当前兼容 Class Spelling 保持不变；任何未来简化都不属于已完成的 Naming Normalization，必须通过独立、显式准入的 Compatibility Change。

## 15.1 UnoCSS 负责

* Flex。
* Grid。
* Container Query。
* 响应式。
* Position。
* Overflow。
* Width 和 Height。
* State Variants。
* Logical Properties。
* Icons。
* CSS Variable 表达。
* 每一个 Public Role 的稳定生成语义。
* Property-scoped Exact Rule。
* 真实复用触发的少量语义 Shortcut。

## 15.2 UnoCSS 不负责

* 自己维护或推导颜色值。
* 自己维护或推导 Density Value。
* 自己维护圆角体系。
* 自己生成第二套主题。
* 封装完整视觉组件。
* 保存用户自定义颜色。

当前 UnoCSS 只消费 §11.4 已准入的 27 个 Public Variable。未来 Density Admission 接受后，UnoCSS 才消费新增 Density-conditioned Public Variable；它不拥有 Density Matrix 或 Preset Value。禁止用 Density Variant、运行时类名拼接或大规模 Safelist 切换外观。

## 15.3 允许的 Shortcut

```text
ui-surface
ui-panel
ui-control
ui-focus-ring
ui-touch-target
ui-scroll-region
ui-text-primary
ui-text-secondary
ui-border-default
```

## 15.4 禁止的 Shortcut

```text
center
group
row-between
glass-card
material-elevated
adaptive-material
reduced-material
interactive-card
admin-page
dashboard-card
```

过于通用或视觉组件化的名称会降低可读性，并形成第二套组件系统。

## 15.5 明确禁止

```text
Attributify
Tagify
transition-all
运行时动态类名
字符串拼接颜色类
大量 Safelist
页面原始 Hex
页面任意阴影
页面任意 z-index
页面直接使用 --ui-material-*
页面自行使用 backdrop-filter / filter / blur / saturation / brightness
无命名空间 Shortcut
```

---

# 16. UI Package

## 16.1 Active Phase Contract

Phase 1 固定：

```text
packages/ui/package.json runtime dependencies = none
packages/ui/src/index.ts = only implementation source; contains export {}
components/adapters/internal/composables/styles/types = absent
```

不得为了未来架构提前加入 `vue`、`reka-ui`、`motion-v`、`clsx`、Grid、Editor、Charts 或 GSAP 依赖。

## 16.2 Demand-created Target Locations

以下是 Phase Gate 通过后的合法位置，不是预建清单：

```text
CAPABILITY=FOUNDATIONAL_SHARED_UI_COMPONENTS
CAPABILITY_STATUS=TARGET_INACTIVE
FIRST_CONSUMER_GATE=PAVP_FIRST_PROTECTED_VERTICAL_SLICE
ADDITIONAL_CONSUMER_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
```

```text
packages/ui/
├── src/
│   ├── components/               [Phase 2; one justified real consumer]
│   ├── adapters/                 [only an admitted vendor]
│   │   ├── reka/                 [Phase 2 first complex primitive]
│   │   ├── motion/               [§24.1 Motion admission gate]
│   │   ├── grid/                 [specialist gate]
│   │   ├── editor/               [specialist gate]
│   │   ├── charts/               [specialist gate]
│   │   └── gsap/                 [GSAP admission gate]
│   ├── internal/
│   │   ├── material/             [first Phase 2 material consumer]
│   │   ├── motion/               [§24.1 Motion admission]
│   │   ├── overlays/             [real overlay consumer]
│   │   ├── focus/                [shared focus contract]
│   │   └── scroll/               [Phase 3 shared scroll need]
│   ├── composables/              [demand-created]
│   ├── styles/                   [demand-created]
│   ├── types/                    [demand-created]
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

不提交空目录或占位 README。目录由真实实现与其公共合同在同一变更中创建。

## 16.3 Component and Material Responsibility

简单组件优先使用原生语义 HTML；复杂交互只有在 A11y、Keyboard、Focus 或 Vendor Isolation 需求出现后才使用 Reka UI。

```text
Native semantic HTML
        ↓ when insufficient
private Reka adapter
        ↓
semantic @platform/ui component
```

`internal/material/` 在被允许后只负责：

```text
semantic Material Role mapping
adaptive / reduced / solid projection
Backdrop capability handling
pseudo-element composition
glass-on-glass prevention
Forced Colors and Reduced Transparency
internal DOM markers
```

页面和 Feature 不得复制这些机制。

## 16.4 Public Import Boundary

业务代码只允许公共根出口：

```ts
import {
  UiButton,
  UiDialog,
  UiSelect,
} from '@platform/ui'
```

禁止：

```ts
import { DialogRoot } from 'reka-ui'
import Grid from 'ag-grid-vue'
import Component from '@platform/ui/src/internal/component'
import GridAdapter from '@platform/ui/adapters/grid'
```

Adapter 是私有、可替换并按需 Lazy Load 的实现边界。业务代码不直接导入 Adapter 或 Vendor；`@platform/ui` 公共根出口只暴露语义组件和公共类型。

首期与未触发前继续禁止：

```text
ProForm
ProTable
TreeGrid
Spreadsheet
FileManager
RichTextEditor
Chart Platform
Gantt
Scheduler
Command Platform
Custom Scrollbar
Global Animation Wrapper
UiGlass
generic Material Wrapper
```

---

# 17. 组件 API 规范

每个组件必须：

* 使用明确 Props Interface。
* 使用类型化 Emits。
* 使用类型化 Slots。
* 支持 `class` 和必要的原生 Attributes。
* 不暴露 Reka UI 内部类型。
* 使用 `data-*` 表达状态。
* 保留键盘和焦点合同。
* 支持 Light/Dark。
* 对相关 Chrome / Overlay 组件支持 Effective Material 和完整 Solid Fallback。
* 支持三档密度。
* 支持 Reduced Motion。
* 提供简洁 JSDoc 或组件 README 文档。
* 明确记录无障碍合同和无障碍名称要求。
* 在成为共享组件前至少有一个真实生产消费者。

示例：

```ts
interface UiButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(
  defineProps<UiButtonProps>(),
  {
    variant: 'primary',
    size: 'md',
    type: 'button',
  },
)

const emit = defineEmits<{
  press: [event: MouseEvent]
}>()
```

禁止创建没有语义价值的 Wrapper。

初次共享组件准入必须同时满足：

1. 至少一个真实生产消费者。
2. 存在明确的语义、A11y 或 Vendor Isolation 理由。
3. 公共 API 只表达业务和交互语义。

在初次实现后扩大抽象、增加通用变体或形成跨页面模式，必须由实际复用证据触发；不得用假设中的第二个页面提前设计。

允许的 Component Prop：

```text
variant
tone
emphasis
size
state
placement
interaction behavior
accessible labeling contract
```

禁止的 Optical Prop：

```text
glass
material
materialRole
blur
backdrop
opacity
saturation
brightness
glow
highlightDirection
spring
stiffness
damping
```

Material Role 由组件语义和 `packages/ui` 私有映射决定，不由页面选择。

---

# 18. 布局系统

```text
CAPABILITY=LAYOUT_AND_SCROLL
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/app/shell/layout
CORE_ACTIVATION_GATE=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
ROUTER_READING_DOCUMENT_LAYOUT_SCROLL_FOCUS_CORE_STATUS=ACTIVE
FIRST_SHELL_CONSUMER_GATE=PAVP_FIRST_PROTECTED_VERTICAL_SLICE
CSS_LAYOUT_CAPABILITY=TARGET_INACTIVE
CURRENT_APP_SHELL=ABSENT
```

完整 Layout Target Contract、App Shell 与 Layout Resolver 仍为 `TARGET_INACTIVE`；§9.0.6 的单条 `route-layout.reading-document` Capability、Native Document Scroll Owners、Scroll Restoration Policy 与 Focus Contract 已由 Router Landing 激活。任何更广的 Shell、Responsive Layout、Panel 或 Persistence 示例均不构成当前 Behavior。

## 18.1 不使用设备名称

禁止：

```text
isMobile
isTablet
isIPad
deviceType
navigator.userAgent
```

布局输入：

```ts
interface LayoutResolutionInput {
  container: {
    inlineSize: number
    blockSize: number
  }

  input: {
    hover: boolean
    pointer: 'fine' | 'coarse' | 'none'
    anyFinePointer: boolean
    anyCoarsePointer: boolean
  }

  capabilities: RouteLayoutCapabilities
  preferences: UserLayoutPreferences
  constraints: ApplicationLayoutConstraints
}
```

## 18.2 三种空间 Profile

```text
narrow
regular
wide
```

这些名称表示可用空间，不表示手机、平板或 PC。

## 18.3 用户布局偏好

```ts
interface UserLayoutPreferences {
  schemaVersion: 1

  profiles: {
    narrow: LayoutProfile
    regular: LayoutProfile
    wide: LayoutProfile
  }
}

interface LayoutProfile {
  preset:
    | 'navigation-left'
    | 'navigation-right'
    | 'navigation-top'
    | 'focus'
    | 'workspace'

  navigation: {
    placement: 'left' | 'right' | 'top' | 'bottom'
    mode: 'expanded' | 'collapsed' | 'adaptive'
    size?: number
  }

  content: {
    width: 'narrow' | 'standard' | 'wide' | 'fluid'
    alignment: 'start' | 'center'
  }

  panels: Array<{
    id: string
    region: 'primary' | 'secondary' | 'inspector'
    order: number
    visible: boolean
    size?: number
  }>
}
```

## 18.4 页面能力合同

```ts
interface RouteLayoutCapabilities {
  allowedPresets: LayoutPreset[]
  requiredRegions: string[]
  movablePanels: string[]
  resizableRegions: string[]
  narrowProjection: 'stack' | 'tabs' | 'sheet'
}
```

用户只能在页面声明的能力范围内调整布局。

`narrowProjection` 表示可用空间和能力投影，不表示设备类型。任何公共合同、变量、验收断言或示例都不得使用 Mobile、Tablet、iPad 或 Desktop 作为 Layout Capability。

## 18.5 CSS 与 JavaScript 边界

CSS 负责：

* Grid。
* Named Areas。
* Container Queries。
* Media Queries。
* Safe Area。
* Dynamic Viewport。
* `minmax()`。
* `clamp()`。
* 组件排列变化。

Container Query 根据组件自身容器，而不是全局 Viewport 进行布局变化。

JavaScript 负责：

* 偏好持久化。
* 约束解析。
* 用户拖动尺寸。
* 面板顺序。
* 无法通过 CSS 表达的状态。

## 18.6 滚动所有权

Canonical Invariants：

```text
ONE_EXACT_PRIMARY_SCROLL_OWNER_PER_AXIS
NO_COMPETING_SAME_AXIS_SCROLL_OWNERS
NO_ACCIDENTAL_BODY_SCROLL_IN_WORKSPACE
NO_PAGE_AND_GRID_VERTICAL_COMPETITION
NATIVE_SCROLL_ONLY
```

每个解析后的 Route Layout 必须为 Block Axis 和 Inline Axis 分别声明一个精确的 Primary Scroll Owner。Owner 必须是具体的 Document 或 Region Identity，不能保留为 `page or grid`、`page or list` 等未解析联合值。

Phase 3 页面类型合同：

| Page Type    | Default Block-axis Candidate                 |
| ------------ | -------------------------------------------- |
| workspace    | named Primary Work Region                    |
| reading      | Document                                     |
| list         | Route 必须在 Page 与 Virtual List 中选定一个 |
| detail       | Document                                     |
| editing      | named Editor 或 Primary Work Region          |
| settings     | Main Content Region                          |
| form         | Main Content Region                          |
| data-heavy   | Route 必须在 Page 与 Grid 中选定一个         |
| focused-task | Route 必须在 Page 与 Bounded Region 中选定一个 |

表中 Candidate 不是运行时二选一权限；Route Contract 必须在实现前解析为唯一 Owner。页面类型在 Phase 3 以前只存在于本文档，不创建类型代码或目录。

Competing Same-axis Owner 是以下任一情况：

* 同时可滚动的祖先与后代共同拥有同一内容流和同一 Axis。
* Page Root 与嵌入的 Grid、Editor 或 List 同时争夺 Route Primary Axis。
* Workspace Region 与意外 Body Scroll 同时承担 Block Axis。

允许的非竞争情况：

1. Dialog 或 Sheet 建立独立滚动上下文，同时锁定背景 Owner。
2. Bounded Virtual List、Grid 或 Editor 拥有一个 Axis，且其内容路径上的祖先在该 Axis 不可滚动。
3. Cross-axis Nesting。
4. 明确有边界的并列辅助 Region，各自处理不同内容流。

规则：

* 页面不能依赖意外的 Body Scroll。
* Dialog 和 Sheet 必须隔离背景滚动。
* Layout Projection 改变时必须保持 Owner、背景锁、焦点和滚动恢复合同。
* Bounded Secondary Owner 必须声明 Scroll-chain Containment，并验证 Keyboard、Focus 和 Pointer 行为。
* 禁止自定义滚动条框架、Scroll Hijacking 和 Native Scroll 替代。
* 静态检查只能验证声明、Import 和明显 Overflow 结构，不能证明真实浏览器 Scroll Owner；Codex 必须报告该证明边界。Owner 可以选择在仓库外手工观察，不构成 Codex Gate。

## 18.7 Layout Capability and Threshold Authority

Layout Profile Threshold、Shell Region Size、Panel Minimum/Maximum、Content Width、Safe-area Inset Handling、Touch Target、Scroll Offset 和 Resize Snap Point 必须来自 Design Token、Typed Layout Default Registry 或 Route Layout Capability Registry。Page、Feature、Component 和 CSS Module 不得写任意 Breakpoint、Pixel Dimension 或 Viewport Threshold。

```ts
interface LayoutCapabilityRegistryRecord {
  id: string
  allowedProfiles: readonly ('narrow' | 'regular' | 'wide')[]
  allowedPresets: readonly LayoutPreset[]
  requiredRegionIds: readonly string[]
  optionalRegionIds: readonly string[]
  movablePanelIds: readonly string[]
  resizableRegionIds: readonly string[]
  narrowProjection: 'stack' | 'tabs' | 'sheet'
  blockScrollOwnerId: string
  inlineScrollOwnerId: string
  minimumTargetPolicyId: string
  capabilityStatus: CapabilityStatus
}
```

Profile 由应用容器 Inline Size、Block Size、Input Capability 和 Route Capability 纯解析；不得读取 User Agent、设备品牌或屏幕营销分类。Threshold 使用命名 Container Token，CSS Container Query 与 JavaScript Resolver 从同一 Generated Registry 消费，避免两套 Breakpoint。

## 18.8 Safe Area and Dynamic Viewport

Root App Viewport 使用 Dynamic Viewport Contract；`dvh` 不支持时使用已定义 Progressive Fallback。Safe-area Insets 只在 Shell Boundary 解析为内部 Layout Variable，Region 不直接读取 `env(safe-area-inset-*)`。Keyboard/Viewport Resize、Orientation、Zoom 和 Reflow 不得丢失 Focus、遮挡 Primary Action 或创建第二 Body Scroll。

Fixed/Sticky Region 必须有 Route Capability、Stacking Token、Safe-area Policy 和 Scroll Owner Relationship。禁止页面任意 `100vh`、Fixed Fullscreen Layer、负 Safe-area Offset 或 Magic Header Height。

## 18.9 Nested Scroll Admission and Restoration

Nested Same-axis Scroll 只有 Bounded Secondary Owner 满足以下条件才允许：

1. Exact Scroll Owner Registry ID 与 Axis。
2. Ancestor 在该 Axis 明确不可滚动。
3. `overscroll-behavior`、Keyboard、Pointer、Focus Reveal 与 Screen Reader Navigation Contract 完整。
4. Background Lock、Route Disposal 和 Layout Projection Change 具有幂等 Cleanup。
5. Virtualized Owner 使用命名 Row/Item Metric Authority，不依赖页面 Literal。

Scroll Restoration Record 只包含 Route Registry Name、Owner ID、Logical Block/Inline Offset、Content Identity/Revision 和 History Entry ID。恢复必须等待 Owner Ready 与最小内容布局稳定；超过命名等待 Policy 后回到 Logical Start，不能无限 Poll。Account/Permission 变化、Owner Identity 变化和不可访问内容拒绝旧位置。

## 18.10 Layout and Scroll Static Enforcement Targets

Owning Gate 必须拒绝 User Agent 分支、任意 Breakpoint/Viewport/Panel/Scroll/Touch Literal、未知 Region/Owner、同轴竞争 Overflow、意外 Body Scroll、Fixed Layer 无 Safe-area Policy、自定义滚动条、Scroll Hijacking 和无 Disposal 的 Background Lock。Route Meta、Layout Capability、CSS Container Token 与 Scroll Registry Set 必须闭合。Router 精确 `route-layout.reading-document`、两个 Native Document Scroll Owner、一条 Restoration Policy 和一条 Focus Contract 已由 §9 激活；其余 Shell、Region、Breakpoint、Nested Scroll、Panel 和 Touch Target 仍为 `TARGET_INACTIVE`。

---

# 19. 状态管理

Package 5 的窄范围 Phase 1 Pinia 准入已激活：

```text
PHASE_1_PINIA_ADMISSION=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER_ONLY
PHASE_1_PINIA_ADMISSION_STATUS=ACTIVE
PHASE_1_PINIA_OWNER=apps/web
PHASE_1_PINIA_SCOPE=APPEARANCE_PREFERENCE_AND_THEME_REGISTRY_ORCHESTRATION_ONLY
PHASE_1_ROUTER_ADMISSION=PROHIBITED
PHASE_1_TANSTACK_QUERY_ADMISSION=PROHIBITED
PHASE_1_OPENAPI_GENERATOR_ADMISSION=PROHIBITED
```

Package 5 已在同一个 Atomic Cutover 中交付 Stored Appearance Preference、Custom Theme Registry Orchestration、Effective-state Derivation Orchestration 和 Application-owned Persistence Lifecycle，并只把 Pinia 加入 `apps/web`。该准入不扩展到 Session、General Application Store、Router、TanStack Query、OpenAPI Generator 或 `packages/ui` Runtime Dependency。

以下职责表是各自 Admission Gate 通过后的最终 Ownership，不代表对应依赖已经进入当前 Manifest。

## 19.1 Pinia 负责

```text
appearance preferences
density
font scale
layout preferences
navigation state
session metadata
local drafts
workflow state
feature-local shared state
```

其中 `appearance preferences` 只保存经过验证的 Stored Preference。Effective Color Mode 和 Effective Material 是纯派生状态，不作为第二份可变 Store 状态。

Pinia 是 Vue 的稳定 Store 方案，提供 TypeScript、DevTools、SSR 和 HMR 支持。

## 19.2 TanStack Query 负责

```text
API requests
server cache
pagination
mutation
query invalidation
prefetch
background refresh
loading and error state
```

TanStack Query 官方将自身定位为 Server State 库，而 Pinia 属于 Client State，两者职责不同。

禁止：

```text
TanStack Query data
      ↓
copy to Pinia
      ↓
manually synchronize both
```

## 19.3 Store 位置

全局平台 Store：

```text
src/app/appearance/
src/app/shell/layout/
```

Feature Store：

```text
src/features/<feature>/model/
```

禁止创建一个无限增长的：

```text
src/stores/
```

## 19.4 Production Runtime Kernel Contract

```text
CAPABILITY=PRODUCTION_RUNTIME_KERNEL
CAPABILITY_STATUS=ACTIVE
OWNER=apps/web/src/app/bootstrap
ACTIVATION_GATE=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
CURRENT_EXTENSION_GATE=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
IMPLEMENTATION_STATUS=COMPLETE
IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
CURRENT_RUNTIME=exact ten-step Runtime Kernel
ACTIVATION_PROVIDER_SET=Pinia,Appearance
ACTIVATION_BOOTSTRAP_STEP_COUNT=10
```

Runtime Kernel 只负责应用生命周期编排，不拥有 Design Token、Storage Payload、Server State、Route、Session、Locale 或 Feature 业务状态。每个当前 Provider 必须暴露 Typed Create/Ready/Dispose Contract，禁止互相隐式初始化或形成 Circular Ownership。本节冻结的基础 Protocol Contract 已由 `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` 在 `3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177` 原子激活；`PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 随后只增加一个 `create-and-ready-router` Lifecycle Step。当前 Runtime Kernel、Core Runtime Configuration、Core Error/Capture 边界与 Router Lifecycle 为 `ACTIVE`；Storage 与所有后续能力保持未实现且未准入。Router 不进入 `ACTIVATION_PROVIDER_SET`，该集合继续精确为 Pinia 与 Appearance。

### Exact Bootstrap Order

```text
1. validate-build-and-runtime-configuration
2. install-pre-vue-global-failure-capture
3. initialize-design-system-and-resolve-first-paint-handoff
4. create-vue-application
5. create-pinia
6. install-platform-providers
7. create-and-ready-router
8. mount-application
9. register-post-mount-appearance-media-subscriptions
10. publish-application-ready
```

上表是当前唯一、闭合、顺序保持的十步 Bootstrap Step Registry，不是 Future Superset。它只在原九步 Kernel 中加入 Router Landing 的一个完整 Lifecycle Step。尚未准入的 Storage、Query、Session、I18n、Observability 或 Deployment Step 必须完全不存在，不能以 Optional `undefined`、No-op Provider、空 Registry、Placeholder 或成功 Stub 占位。后续串行 Package 只有在自己的 Architecture Authority 与 Implementation Landing 中才能原子扩展该 Registry，并同时交付 Create、Ready、Failure、Dispose、Dependency Edge 与 Static Registry Evidence。

后一步只能消费前一步的 Typed Success Output。任何步骤失败都停止后续步骤，按已完成步骤的反向顺序 Dispose，并进入 Fatal Startup Recovery。不得通过 `try/catch` 后继续 Mount、用空 Provider 替代失败 Provider，或把 `unknown` Session 当作 Anonymous。

### Configuration-first Startup and Failure-capture Ownership

配置加载顺序不依赖 Global Listener：

* Runtime Configuration Loading 由 Runtime Kernel 第一步 Boundary 直接包裹。
* Configuration Failure 由无副作用的 Core Error Normalizer 直接规范化。
* Runtime Configuration Loading 不依赖 `window.error` 或 `unhandledrejection` Listener。
* Configuration 成功后，`apps/web/src/app/errors` 才原子安装恰好一个 `window.error` Listener 和恰好一个 `unhandledrejection` Listener；第二个 Listener 安装失败时必须回滚第一个。
* `window.error` 只在 Startup State 为 `starting` 时捕获未被其他 Boundary Claim 的 Execution Error，并在 Ready Transition 时移除。
* `unhandledrejection` 从安装后持续到最终 Attempt Disposal。
* 两个 Listener 由同一个幂等 Capture Disposer 移除；Retry 与 HMR 都必须在创建新 Capture Handle 前完整 Dispose 旧 Handle。
* Listener 不得累积，Existing Normalized Error 不得再次 Normalized 或 Captured。

### Startup State and Lifecycle Ownership

```ts
type ApplicationStartupState =
  | 'not-started'
  | 'starting'
  | 'ready'
  | 'recoverable-failure'
  | 'fatal-failure'
  | 'disposing'
  | 'disposed'
```

每个 Attempt 具有一个 Opaque `startupAttemptId`。其生成算法不是 Architecture Contract；ID 只用于同一文档内的安全关联，不能携带 URL、配置、用户数据或 Raw Error。

| Lifecycle unit | Single owner | Produces | Must not own |
| --- | --- | --- | --- |
| Build/runtime config validation | `app/config` | immutable validated config | Router, Session or UI state |
| Pre-Vue failure capture | `app/errors` | exact listener references and one capture disposal handle | Configuration loading or user-facing rendering |
| Appearance handoff | `app/appearance` | validated Stored/Effective state | application Storage Key definition in Design System |
| Vue application | `app/bootstrap` | unmounted app instance | Provider internals |
| Pinia | `app/providers/pinia` | client-state container | Server State cache |
| Provider installation | `app/bootstrap/install-providers` | Pinia plus Appearance provider handles | Future Provider construction |
| Router and History lifecycle | `app/router` through the Runtime Kernel step | one ready Router lifecycle handle with one Router and one History authority | DOM Mount, Server State, Session or top-level HMR ownership |
| Vue Mount | `app/bootstrap` Mount step | one mounted application handle | Provider construction or competing Mount |
| Appearance media subscriptions | `app/appearance` through Kernel step | exact listener references and one unsubscribe handle | Storage, Session or Observability subscription |
| Ready publication and aggregate disposal | Runtime Kernel | one private Running Application Handle | Window global, DOM event or event bus publication |

Provider A 不得通过 Import Side Effect 创建 Provider B。Cross-provider Interaction 只能由 Bootstrap 传入 Narrow Interface；不得通过 Global Singleton、Event Bus、Window Property 或循环 Store Watcher 编排。

Configuration Failure 必须保留 Existing Appearance Safety Baseline、停止全部后续 Step，并进入不依赖 Vue、Pinia、Router、Query、I18n 或 Public UI Package 的 Non-Vue Configuration Failure Boundary。该 Boundary 只消费 Built-in Safe Message Key、允许的 Release/Build Identity 和冻结的 User Action；不得显示 Raw URL、Raw Configuration、Raw Response、Raw Cause、Message、Stack、Secret 或 DOM Content。Failure Renderer 自身失败是 Attempt-terminal Boundary Outcome，不增加第五个 Core Error Record，也不具备 In-document Retry 资格。

### Startup Configuration Retry Policy

```text
POLICY_ID=startup-configuration-recovery
OWNER=runtime-kernel
TRIGGER=user action only
MAXIMUM_RETRIES_PER_DOCUMENT=1
TOTAL_ATTEMPTS=initial attempt plus one retry
ELIGIBLE_ERROR=runtime-configuration-failure only
ELIGIBLE_CAUSES=all exact Runtime Configuration failure causes frozen in Section 34.1
```

以下 Failure 不具备 In-document Retry 资格：

```text
application-startup-failure
vue-component-failure
unhandled-promise-rejection
disposal failure
Fatal renderer failure
```

Retry 之前必须完成 Failed Attempt 的幂等 Reverse Disposal、分配新的 `startupAttemptId`、从 `validate-build-and-runtime-configuration` 重新开始、重新读取并验证完整 Runtime Configuration Artifact、在先前曾创建 Pinia 时创建全新 Pinia、在先前曾创建 Router 时创建全新 Router 与 History，并重新读取和恢复 Appearance。不得复用 Failed Vue、Pinia、Router、History、Provider、Listener、Configuration、Handoff 或 Lifecycle Handle。

单次 Retry 再次失败后，Boundary 必须移除 In-document Retry Action，只允许用户显式 Reload Browser。

```text
RETRY_STATE_STORAGE=document memory only
PERSISTED_RETRY_STATE=PROHIBITED
URL_RETRY_STATE=PROHIBITED
RUNTIME_CONFIG_RETRY_STATE=PROHIBITED
AUTOMATIC_RETRY=PROHIBITED
TIMER=PROHIBITED
BACKOFF=PROHIBITED
POLLING=PROHIBITED
LOOP=PROHIBITED
AUTOMATIC_RELOAD=PROHIBITED
STORAGE_CLEARING=PROHIBITED
```

Development HMR 不消耗该 Retry Budget，但必须使用同一完整 Disposer。

### Bootstrap Step Registry

当前 Runtime Kernel Registry 是 Repository-owned、Closed、Order-preserving、Acyclic、无 Placeholder 且无 Optional Future Step 的精确十步集合。每一步必须定义 Step ID、Dependencies、Create Input、Create Output 或 Handle、Ready Condition、Dispose Responsibility、DOM Mount Ownership、Failure Classification、Retry Participation 和 HMR Behavior。Private Helper Name、Loop、Array、Map、Closure 或 File-internal Data Structure 不属于 Registry Contract。

#### `validate-build-and-runtime-configuration`

```text
dependencies=[]
CreateInput=startupAttemptId,AbortSignal,document carrier,compiled build identity,fetch boundary
CreateOutput=recursively immutable CoreRuntimeConfiguration
Handle=attempt-local abort/load handle
Ready=artifact strict validation and all compatibility comparisons complete
Dispose=abort in-flight request and release attempt-local configuration reference
DOMMountOwner=NO
Failure=runtime-configuration-failure
FailureCategory=configuration
FatalForAttempt=YES
RetryParticipant=YES
OwnFailureEligibleForConfigurationRetry=YES
HMR=full disposal followed by complete reread; validated object is not reused
```

#### `install-pre-vue-global-failure-capture`

```text
dependencies=[validate-build-and-runtime-configuration]
CreateInput=validated config,startupAttemptId,startup state accessor,core normalizer,kernel capture sink
CreateOutput=exact listener references and one idempotent capture disposer
Ready=window.error and unhandledrejection listeners both installed
PartialAcquisitionRollback=REQUIRED
Dispose=remove window.error if still active and remove unhandledrejection
DOMMountOwner=NO
Failure=application-startup-failure
FatalForAttempt=YES
RetryParticipant=YES when a fresh eligible configuration retry reaches this step
OwnFailureEligibleForConfigurationRetry=NO
HMR=old listeners removed before a fresh handle is created
```

#### `initialize-design-system-and-resolve-first-paint-handoff`

```text
dependencies=[install-pre-vue-global-failure-capture]
CreateInput=document,exact generated script element,private handoff,safety restoration capability
CreateOutput=validated no-handoff or custom-theme-reference handoff
Handle=one-time bridge and safety handle
Ready=complete handoff shape validation succeeds before private fields are removed
DisposeOnFailedStartup=idempotently restore safety DOM and release references
DisposeOnNormalOrHMR=release references without reverting committed Appearance
DOMMountOwner=NO
AllowedDOMMutation=Package 5 Appearance safety html mutation only
Failure=application-startup-failure
RetryParticipant=YES after an eligible configuration retry
OwnFailureEligibleForConfigurationRetry=NO
HMR=consumed handle is never reused; fresh Appearance restoration rereads Package 5 persistence authorities
```

#### `create-vue-application`

```text
dependencies=[initialize-design-system-and-resolve-first-paint-handoff]
CreateInput=root component,core error capture hooks,startupAttemptId
CreateOutput=unmounted Vue App
Handle=exact Vue App instance and lifecycle flags
Ready=app.config.errorHandler and application boundary hooks installed; application not mounted
DisposeBeforeMount=release unmounted application reference
DisposeAfterMount=Mount step owns unmount
DOMMountOwner=NO
Failure=application-startup-failure
RetryParticipant=YES after eligible configuration retry
OwnFailureEligibleForConfigurationRetry=NO
HMR=fresh Vue App instance only
```

#### `create-pinia`

```text
dependencies=[create-vue-application]
CreateInput=startupAttemptId
CreateOutput=fresh Pinia instance
Handle=fresh Pinia instance
Ready=Pinia construction complete; no placeholder stores created
Dispose=after Vue unmount and active subscription cleanup, call disposePinia exactly once
DOMMountOwner=NO
Failure=application-startup-failure
RetryParticipant=YES with a fresh Pinia instance
OwnFailureEligibleForConfigurationRetry=NO
HMR=old Pinia disposed; attempt stores are never retained
```

#### `install-platform-providers`

```text
dependencies=[initialize-design-system-and-resolve-first-paint-handoff,create-vue-application,create-pinia]
CreateInput=Vue App,Pinia,validated handoff,Package 5 Appearance adapters,current media capability snapshot
CreateOutput=Pinia installed plus Appearance store and committed restoration result
Handle=current Pinia and Appearance provider handles only
Ready=app.use(pinia),Appearance store creation,and one transactional Appearance restoration all succeed; media listeners not yet registered
Dispose=release attempt-local provider and Appearance handles; on failed startup perform Package 5 safety compensation; Vue and Pinia disposal remain with their owning steps
DOMMountOwner=NO
AllowedDOMMutation=canonical Package 5 Appearance mutation only
Failure=application-startup-failure
RetryParticipant=YES with fresh Pinia and fresh Appearance reread
OwnFailureEligibleForConfigurationRetry=NO
HMR=after Appearance media subscriptions are removed and Vue is unmounted,dispose installed platform-provider handles,then dispose Pinia; provider handles are never reused across HMR attempts; Providers register no competing HMR hooks
ActiveProviderSet=Pinia,Appearance only
```

#### `create-and-ready-router`

当前 Active Exact Contract 由 §9.0.10 唯一拥有；本 Step 是当前十步 Registry 的第七步，不建立第二份 Router Lifecycle Contract。

#### `mount-application`

```text
dependencies=[create-and-ready-router]
CreateInput=ready Vue App,ready RouterLifecycleHandle,exact #app target
CreateOutput=MountedApplication handle
Ready=application.mount('#app') returns normally and mounted state is confirmed
Dispose=idempotently call application.unmount() exactly once after partial or complete Mount
DOMMountOwner=YES
UniqueMountOwner=YES
Failure=application-startup-failure
InitialRootComponentFailurePrecedence=application-startup-failure single capture
RetryParticipant=YES after eligible configuration retry
OwnFailureEligibleForConfigurationRetry=NO
HMR=unmount before Pinia disposal
```

#### `register-post-mount-appearance-media-subscriptions`

```text
dependencies=[install-platform-providers,mount-application]
CreateInput=mounted app,Appearance store,three MediaQueryList instances,reapply adapter
CreateOutput=exact listener references and one idempotent unsubscribe
Ready=all three Package 5 listeners installed
PartialRegistrationRollback=REQUIRED
Dispose=remove all three listeners before Vue unmount
DOMMountOwner=NO
Failure=application-startup-failure
RetryParticipant=YES after eligible configuration retry
OwnFailureEligibleForConfigurationRetry=NO
HMR=Ready is withdrawn and this is the first runtime resource disposed
FutureStorageSessionObservabilityOrOtherProviderSubscriptionPlaceholders=PROHIBITED
```

#### `publish-application-ready`

```text
dependencies=[validate-build-and-runtime-configuration,mount-application,register-post-mount-appearance-media-subscriptions]
CreateInput=startupAttemptId,validated config,mounted application,aggregate step handles
CreateOutput=RunningApplicationHandle with one reverse disposer
Ready=atomic starting-to-ready transition and resolution of internal startup completion
ReadyGlobal=PROHIBITED
ReadyDOMEvent=PROHIBITED
ReadyEventBus=PROHIBITED
ObservabilityStub=PROHIBITED
Dispose=withdraw Ready; transition ready-to-disposing-to-disposed; release all handles in exact reverse order
DOMMountOwner=NO
Failure=application-startup-failure
RetryParticipant=YES after eligible configuration retry
OwnFailureEligibleForConfigurationRetry=NO
HMR=the sole top-level HMR disposer uses RunningApplicationHandle; providers may not register competing HMR hooks
```

### Reverse Disposal Order

Fully Created Attempt 的精确 Reverse Order：

1. Withdraw Application Ready。
2. Remove Appearance Media Subscriptions。
3. Unmount Vue Application。
4. Remove Router Hooks and Dispose Router/History。
5. Dispose Installed Platform-provider Handles。
6. Dispose Pinia。
7. Release Vue Application Creation Handle。
8. Release First Paint Handoff and Safety Handle。
9. Dispose Global Failure Capture。
10. Abort/Release Runtime Configuration Handle。

Disposal 必须幂等；一个 Cleanup Failure 后继续其余 Cleanup；收集 Cleanup Failure 时不得暴露 Raw Cause；任何 Cleanup Failure 都不具备 In-document Retry 资格。Disposal 必须保留 User Preference 与 Custom Registry Data，不执行 Storage Clearing 或 Migration。

### HMR Ownership

```text
HMR_OWNER=Runtime Kernel RunningApplicationHandle
PROVIDER_HMR_HOOKS=PROHIBITED
WINDOW_GLOBAL_KERNEL_HANDLE=PROHIBITED
IMPORT_META_HOT_DATA=ALLOWED only for the exact private Kernel handle
HMR_REPLACEMENT_ORDER=withdraw Ready,dispose complete old attempt,create complete fresh attempt
DUPLICATE_MOUNT=PROHIBITED
DUPLICATE_GLOBAL_LISTENER=PROHIBITED
DUPLICATE_APPEARANCE_SUBSCRIPTION=PROHIBITED
PRODUCTION_HMR_BEHAVIOR=NONE
```

HMR 只在 Development 生效，并与 Failed-attempt Retry、Application Disposal 使用同一个完整 Reverse Disposer。Provider 与 Router Source 不得注册竞争 HMR Hook；新 Attempt 不得复用已 Dispose Handle、Validated Configuration、Vue App、Pinia、Router、History、Appearance Handoff 或 Listener。

### Non-protocol Implementation Details

以下内容不成为 Architecture Contract：Local Helper Name、Local Variable Name、Parser Decomposition、Internal Loop、Private Array/Map/Closure、Opaque Instance-ID Generation Algorithm、Error Normalizer Internal Dispatch、Fatal-boundary DOM Helper Name、JSON Whitespace and Key Formatting、Private Kernel Handle Type Name、Private Bootstrap Executor Data Structure，以及 Kernel Checker 的 Physical Split；`check:arch` 必须保持唯一 Architecture Governance Entry。

### Runtime Kernel Static Enforcement

```text
CAPABILITY_STATUS=ACTIVE
```

Active Owning Static Gates 必须验证：

* Exact Runtime Configuration Artifact、HTML Carrier、URL、Field Set、Discriminator、Build Version、Release SHA、Deployment Base 与 Compatibility Comparison。
* Exact Four-record Core Error Registry，以及每条 Error ID、Message Key、Safe/Prohibited Context、Recoverability、Retry Owner、Report Level、Normalization Source 与 Fatality。
* Configuration-first Startup Order，Global Listener 的 Exact Count、Owner、Lifetime、Cleanup、Retry 与 HMR Behavior。
* `startup-configuration-recovery` 的单次 User-triggered Retry Limit。
* Exact Ten-step Bootstrap Registry、Dependency Graph Acyclicity、Current Provider Set、Unique Mount Owner、Exact Reverse Disposal Order 与 Idempotent Disposal。
* Exact HMR Owner，且没有 Future Provider、Placeholder Step、Storage、Query、API、Auth、Session、Permission、I18n、Observability 或 Deployment Activation。
* Package 5 Appearance Behavior 不变。

这些规则已随 Runtime Kernel 与 Router Implementation Landing 激活，并且只证明当前十步 Registry、Pinia/Appearance Provider Set、Core Runtime Configuration、四条 Core Error Record、六条 Router Error Extension、当前 Listener、Retry、Router/History Disposal、Mount 和 HMR 合同。它们不激活或证明任何后续 Provider 或 Capability。

## 19.5 Application Persistence Target Contract

```text
CAPABILITY=APPLICATION_PERSISTENCE
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/app/storage
ACTIVATION_GATE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
DIRECT_STORAGE_OUTSIDE_OWNER=PROHIBITED
```

### Storage Registry and Envelope

Storage Key 只能来自 Exact Storage Registry：

```ts
interface StorageRegistryRecord {
  id: string
  ownerDomain: string
  key: string
  medium: 'local-storage' | 'indexed-db' | 'memory'
  schemaId: string
  currentSchemaVersion: number
  minimumSupportedSchemaVersion: number
  principalPartition: 'anonymous' | 'user' | 'tenant-user' | 'none'
  containsSensitiveData: false
  corruptionPolicy: 'quarantine-then-reset' | 'delete-then-reset'
  capabilityStatus: CapabilityStatus
}

interface PersistedEnvelope<Payload> {
  schemaVersion: number
  revision: number
  updatedAt: string
  payload: Payload
}
```

`updatedAt` 使用 UTC RFC 3339；它只用于冲突诊断，Revision 是同一 Partition 内的顺序权威。Key Namespace、Database Name、Object Store Name、Broadcast Channel Name 和 Quarantine Key 都由 Storage Registry 生成；页面、Feature 和 Component 不得声明字符串 Key。

### Media Boundary

| Medium | Allowed data | Prohibited data |
| --- | --- | --- |
| Local Storage | 小型非敏感偏好、First-paint 所需 Appearance、有限布局状态 | Token、Credential、Session ID、Server Authority、Query Cache、长文本草稿、二进制 |
| IndexedDB | 准入后的大型本地草稿、离线队列、二进制和大量结构化记录 | Credential、Authoritative Session、未经加密即被误称安全的 Secret |
| Memory only | Session-derived state、CSRF Runtime Value、Query Cache、敏感临时状态、In-flight Workflow | 任何承诺跨重启恢复的数据 |

IndexedDB 仍为 `DEFERRED`，只有真实容量、离线或结构化数据需求通过独立 Gate 后准入。Query Cache 默认 Memory-only；持久化 Query 需要独立 Product、Privacy、Expiration 和 Principal-isolation Contract。

### Read, Validation and Migration

```text
registry lookup
→ medium availability check
→ raw read
→ duplicate-aware parse where applicable
→ envelope exact-schema validation
→ principal partition validation
→ ordered one-version-at-a-time migration chain
→ current-schema validation
→ immutable typed result
```

Migration 必须纯、确定、幂等且保留原值 Evidence；不得跨过缺失版本、访问网络、读取另一个 Domain Store 或写入 Storage。小于 `minimumSupportedSchemaVersion`、未来版本、缺失 Migration、Principal 不匹配和 Schema Failure 都返回结构化 Failure，不得猜测或 Partial Merge。

### Corruption, Quarantine and Write Failure

Failure Categories：

```text
storage-unavailable
read-denied
parse-failed
schema-rejected
unsupported-version
principal-mismatch
serialization-failed
quota-exceeded
write-denied
readback-mismatch
conflict-detected
```

Corruption Policy 必须避免每次启动重复解析同一坏值。`quarantine-then-reset` 仅对 Registry 声明的非敏感、小型 Payload 使用：先把原始值写入受限 Quarantine Key，成功后删除 Primary；若 Quarantine 写入失败，则删除 Primary 并只上报 Hash、Byte Length 与 Error Category，不记录 Raw Payload。`delete-then-reset` 直接删除 Primary。两种策略都返回 Product Default，但不得把 Default 伪装成成功读取。

写入顺序固定为：Typed Payload Validation → Canonical Serialization → Serialized Round-trip Validation → Revision Conflict Check → 单 Key Atomic `setItem`/Transaction → Readback Validation → Publish Change Event。Quota、Unavailable、Serialization 或 Readback Failure 不得更新内存中的 Persisted Revision，也不得丢弃用户未保存状态。

### Cross-tab Synchronization

每个变更包含 `originId`、`operationId`、`revision` 和 `principalPartitionId`。当前 Tab 在成功写入后直接处理本地结果；其他 Context 通过 `BroadcastChannel`，不支持时使用 `storage` Event。接收方必须拒绝自己的 `originId`、重复 `operationId`、旧 Revision 和其他 Principal/Tenant 事件，防止 Echo Loop。

同一 Revision 的竞争写入返回 `conflict-detected`，不按不可靠的墙上时钟静默覆盖。Domain Contract 必须显式选择 User Resolution、Latest Valid Revision Retry 或 Merge；Appearance Preference 与 Layout Preference 默认使用 Compare-and-swap Retry 一次，仍冲突则要求用户重新确认。

### Principal and Tenant Lifecycle

所有用户级 Key 逻辑上以 Opaque Principal/Tenant Partition 隔离，Raw User ID 不直接进入可枚举 Key。Anonymous Preference 可以在登录后经显式、可预览的 Merge Policy 迁移；Session、Permission 和 Server State 永不迁移。Logout、Revocation、Account Switch 和 Tenant Switch 的顺序固定为：停止写入 → 取消请求 → 清 Query Cache → 清 Session/Permission Pinia → Dispose Dynamic Routes → 清或切换用户级 Storage Handle → 发布跨 Tab Session Event。

### Preference and Custom Theme Atomic Consistency

Preference 与 Custom Theme Registry 保持两个 Schema Boundary 和两个应用 Key。Local Storage 不提供跨 Key 原子事务，因此合同采用 Safe Ordering：

```text
create/update reference target:
validate full theme
→ atomically write complete registry envelope
→ readback and resolve exact entry
→ atomically write preference reference

delete referenced theme:
explicitly select and persist another valid theme reference
→ confirm effective atomic switch
→ delete registry entry
```

在第一种流程中断只会留下 Unreferenced Valid Entry，不会产生 Dangling Preference；第二种流程中断只会留下 Unreferenced Old Entry。Preference Writer 必须在写前解析 Registry Entry；Registry Delete 必须拒绝仍被当前 Preference 引用的 Entry。First Paint 同时读取两个 Snapshot 时，Revision Pair 不一致则保留 Safety Baseline 并返回 `theme-registry-revision-mismatch`，不得回退并改写 Stored Preference。

### Storage Static Enforcement Targets

Owning Package 必须验证：所有 Storage/IndexedDB/BroadcastChannel 访问只在 Registry Owner；所有 Key 来自 Registry；Envelope、Migration、Partition、Write Result 和 Cleanup 完整；敏感字段、Session ID、Query Data 与 Server Authority 不可持久化；Preference/Registry Safe Ordering 可静态追踪。当前只有既有 Appearance First-paint 窄边界为 `ACTIVE`，本节其余 Enforcement 均为 `TARGET_INACTIVE`。

---

# 20. API Transport Target Contract

```text
CAPABILITY=API_TRANSPORT
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/shared/api
ACTIVATION_GATE=PAVP_API_TRANSPORT_IMPLEMENTATION
MANDATORY_OPENAPI_FETCH_DEPENDENCY=NONE
```

Canonical Target：

```text
openapi-typescript generated compile-time types
+ repository-owned Native Fetch transport
+ caller-provided AbortSignal
+ Zod untrusted runtime boundaries
+ TanStack Query server-state orchestration
```

Axios、Alova 和 `openapi-fetch` 不属于 Canonical Target。任何未来 Fetch Client Library 必须重新通过 Stable、Bundle、Runtime Validation、Abort、Auth、Maintenance 和 Replacement Gate。

## 20.1 Ownership and Request Definition

```text
shared/api/
├── client.ts
├── request.ts
├── response.ts
├── errors.ts
├── policies.ts
├── query-keys.ts
└── schemas.ts
```

目录是 Target Location，不授权创建。Transport 只拥有 HTTP Attempt、Protocol Validation 和 Error Normalization；TanStack Query 拥有 Server State Cache、Retry Orchestration、Deduplication、Staleness、Mutation Lifecycle 和 Invalidation；Feature API Module 拥有 Endpoint Definition 和 Domain Zod Schema。

```ts
type ResponseMode =
  | 'json'
  | 'text'
  | 'blob'
  | 'array-buffer'
  | 'stream'
  | 'empty'

interface RequestDefinition<Response> {
  endpointId: string
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  pathTemplateId: string
  authPolicyId: string
  timeoutPolicyId: string
  retryPolicyId: string
  responseMode: ResponseMode
  responseSchema: unknown
  idempotencyPolicy: 'safe' | 'explicit-key-required' | 'never-retry'
  cachePolicyId: string
}
```

Endpoint、Timeout、Retry、Auth 和 Cache Policy 都必须引用 Exact Registry；调用点不得写 Timeout Milliseconds、Retry Count、Base URL、Credential Mode 或 Cache Duration Literal。

## 20.2 Configuration, Identity and Headers

Base URL 来自已验证 Runtime Configuration，只允许 Approved HTTPS Origin；Development 的 HTTP 例外由 Environment Schema 明确声明。URL 使用 `URL` API 和 Typed Path/Query Encoder 构造，禁止字符串拼接、双重编码、Credential URL 与任意 External Origin。

每个 Attempt 生成内部 `requestId`，并传播已验证或新建的 `correlationId`。Header Registry 精确拥有 Content Negotiation、Locale、CSRF、Idempotency、Release 和 Correlation Header Name。禁止记录 Cookie、Authorization、CSRF Secret、Password、完整用户输入和 Raw Response Body。

Cookie Session 的默认 Credential Policy 是 Same-origin；Cross-origin Credential 必须通过独立 CORS/CSRF Gate。Transport 不读取 HttpOnly Cookie，也不把 Session Token 注入 JavaScript Header。

## 20.3 Request Pipeline and Cancellation

```text
validate request definition and runtime config
→ encode path/query/body
→ resolve auth and CSRF policy
→ combine caller, route/query and timeout AbortSignals
→ emit privacy-safe attempt-start event
→ execute one Native Fetch attempt
→ classify transport/abort/timeout result
→ validate status and content type
→ parse declared response mode
→ apply endpoint Zod boundary
→ return typed success or normalized AppError
```

Transport 必须接受调用方 `AbortSignal`，不得用内部 Controller 隐藏外部取消。Timeout Signal、Caller Abort、Route Navigation Cancel、Query Cancel 和 Application Disposal 必须保留不同 Failure Category：

```text
timeout
caller-abort
navigation-abort
query-cancel
application-disposal
network-failure
```

Cancellation 不进入用户错误 Toast，不触发 Retry，不上报为 Unhandled Error。Timeout Policy 来自 Protocol Registry；调用点不能临时覆盖，除非 Endpoint Contract 明确提供 Typed Override Range。

## 20.4 Response and Error-body Parsing

Native Fetch 对 4xx/5xx 不 Reject，因此任何 Response 都先检查 Status Contract。解析规则：

| Response | Contract |
| --- | --- |
| 200/201 JSON | Content-Type 必须匹配，Parse 后通过 Endpoint Zod Schema |
| 202 | 返回 Typed Accepted Result，不伪装为完成数据 |
| 204/205 | Body 必须为空，`responseMode='empty'`，禁止调用 `json()` |
| text | 验证允许的 MIME、Charset 与 Byte Limit |
| blob/array-buffer | 验证 MIME、Content-Length/实际 Byte Limit 与 Filename Policy |
| stream | Endpoint 必须显式准入 Streaming、取消、Backpressure 和 Partial Failure |
| redirect | 仅遵循 Endpoint Redirect Policy；跨 Origin 默认拒绝 |
| error body | 按 Error Content-Type 和 Byte Limit 解析，再通过 Error-body Schema |

Content-Type 缺失、错误、Body 超限、Malformed JSON、Schema Mismatch 和 Unexpected Body 都返回结构化 Protocol/Validation Error。Error Normalizer 只保留允许字段；未知或 HTML Error Body 不直接显示或记录。

## 20.5 Retry, Backoff and Rate Limit

Transport 每次调用只执行一个 Attempt。TanStack Query 或 Mutation Executor 根据 Retry Registry 决定是否发起下一 Attempt：

| Condition | Default disposition |
| --- | --- |
| GET/HEAD transient network failure | retry-eligible |
| Timeout | endpoint-policy |
| 408, 425, 429 | retry-eligible only with policy and limit |
| 500, 502, 503, 504 | retry-eligible for safe/idempotent requests |
| 400, 401, 403, 404, 409, 412, 422 | no automatic retry |
| Caller/navigation/query cancellation | no retry |
| POST/PATCH/DELETE mutation | no retry by default |
| Mutation with server-approved Idempotency Key | explicit policy only |

Backoff 使用 Registry 拥有的 `baseDelay`、`maximumDelay`、`maximumAttempts` 与 Full Jitter；实现公式固定为 `random(0, min(maximumDelay, baseDelay * 2 ** attemptIndex))`。有效 `Retry-After` 优先但仍受 Policy Maximum 限制。Retry Budget 按 Endpoint、Principal 和 Online State 限制，禁止无限重试、页面级重试循环或 Transport 与 Query 双重重试。

## 20.6 Idempotency, Deduplication and Concurrency

Idempotency Key 只为 Endpoint Registry 声明支持的 Mutation 生成，作用域绑定 Principal、Endpoint 和业务 Operation，不从用户输入直接采用。相同 Key 的响应处理遵守 Server Contract；Key 不记录到 Log。

GET Deduplication 由 TanStack Query 的 Exact Query Key 负责；Transport 不维护第二个 Response Cache。Mutation 默认不合并。重复 Submit 由 Form/Mutation Lock 阻止；Latest-request-wins 只适用于明确声明的只读搜索类 Endpoint，并必须 Abort 旧 Attempt。

并发上限属于 Request Concurrency Registry，按 Origin 和 Priority Queue 执行。Auth Refresh、Critical Mutation 和 Background Prefetch 使用不同命名 Lane；Queue Entry 保留 Caller Abort。禁止页面自行建立 Semaphore。

## 20.7 Mutation, Optimistic Update and Conflict

Mutation Owner 必须声明：

```text
mutation key
idempotency policy
affected query keys
optimistic eligibility
rollback snapshot boundary
conflict policy
success invalidation
failure presentation
```

Optimistic Update 仅在可逆、局部且具有完整 Rollback Snapshot 时允许。Rollback 只恢复本 Mutation 修改的 Cache Segment，不覆盖并发成功更新。ETag/Version 使用 `If-Match`；409/412 返回 Typed Conflict，包含允许的 Current Version Metadata，不自动覆盖 Server。Conflict 必须由 User Resolution、Refetch-and-reapply 或 Domain Merge Policy 处理。

## 20.8 Upload, Download and Streaming

Upload 必须验证文件数量、Declared/Detected MIME、扩展名、单文件与总 Byte Limit；Progress 需要独立 Browser Capability 和 API Contract，Native Fetch 不支持时不得伪造。取消上传必须终止 Body Source 和释放 Object URL。

Download 必须验证 Origin、Status、MIME、Byte Limit 和 Sanitized Filename；不得把服务端 Filename 直接写入文件系统。Streaming 必须定义 Frame Schema、Backpressure、Heartbeat、Resume、Partial Failure、Cancellation 和 Disposal；未定义则 `PROHIBITED`。

## 20.9 Cache Ownership

```text
Browser HTTP Cache = transport-level HTTP semantics
TanStack Query Cache = in-memory application server state
Pinia = client-owned state only
Storage = explicitly admitted non-sensitive persistence only
```

Endpoint Cache Registry 定义 `cache` Request Mode、ETag、Vary 和 Revalidation。Query `staleTime`/`gcTime` 来自 Query Policy Registry，不在 Component 写 Literal。禁止把 Query Result 复制到 Pinia/Local Storage、同时用 Service Worker 和 Query Cache 建第二权威，或用 Cache Busting Query 绕过 HTTP Policy。

## 20.10 OpenAPI Governance

`openapi-typescript` 只有后端 Schema 具备 Owner、Version、稳定发布位置和 Drift Gate 后才准入。Generated Types 是 Compile-time Contract；Zod 是 Untrusted Runtime Boundary；两者不能互相冒充。

OpenAPI Package 必须固定 Input Digest、Generator Version、Command、Output Path 和 Generated Notice。CI 对 Canonical Schema 重新生成并拒绝 Drift；Breaking Endpoint、Required Field、Enum、Security Scheme 或 Content Type Change 必须触发显式 API Review。不得直接编辑 Generated Type，不得为所有可信内部对象机械复制 Zod，也不得因为 OpenAPI Type 存在而跳过外部响应校验。

## 20.11 Privacy-safe Diagnostics and Enforcement

Attempt Event 只允许 Endpoint ID、Method、Status Category、Duration、Retry Attempt、Request/Correlation ID、Release SHA 和 Error Category。URL Path Params、Query、Header、Body 和 Response 默认全部 Redacted；允许字段必须逐 Endpoint Allowlist。

Owning Static Gate 必须拒绝直接 `fetch`、直接 `XMLHttpRequest`、未注册 Base URL/Header/Timeout/Retry/Cache Literal、未传 AbortSignal、无 Response Mode、无 Zod Boundary、Mutation 默认重试、Query Data 复制、敏感 Log 和 Generated OpenAPI Drift。本节全部规则在 API Transport Implementation 前为 `TARGET_INACTIVE`。

# 20A. Auth, Session and Permission Target Contract

```text
CAPABILITY=AUTH_SESSION_PERMISSION
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/app/session
SECURITY_AUTHORITY=SERVER
CLIENT_PERMISSION_MODEL=CAPABILITY_PROJECTION
ACTIVATION_GATE=PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION
```

## 20A.1 Session State Machine

```ts
type SessionState =
  | { status: 'unknown' }
  | { status: 'restoring' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; principal: SessionPrincipal }
  | { status: 'expired'; lastPrincipalId: string | null }
  | { status: 'revoked'; lastPrincipalId: string | null }
  | { status: 'failed'; errorId: string }
```

唯一合法 Transition：

```text
unknown → restoring
restoring → anonymous | authenticated | expired | revoked | failed
anonymous → authenticated | failed
authenticated → authenticated (successful refresh)
authenticated → expired | revoked | anonymous | failed
expired → restoring | anonymous
revoked → anonymous
failed → restoring | anonymous
any non-unknown → anonymous during completed logout cleanup
```

`unknown`/`restoring` 不得触发 Anonymous Route、登录重定向或 Permission Denial。Session Principal 只包含服务端返回的最小非敏感 Identity、Tenant 和 Capability Projection；Credential、Session ID 和 Refresh Token 不进入 Pinia。

## 20A.2 Restoration, Login, Logout and Refresh

Startup Restoration 通过 Same-origin Session Endpoint 完成。Login 成功顺序为：Server Session established → Session Response validated → Query Partition created → Permission Registry projection installed → Dynamic Routes admitted → safe Return URL navigation。失败不得保留 Partial Principal。

Logout/Revocation 顺序使用 §19.5 Principal Lifecycle，且 Server Logout Attempt 即使网络失败也必须清本地 Derived State；UI 明确提示 Server Revoke 未确认。Account/Tenant Switch 先完成旧 Partition Cleanup，再恢复新 Session，期间 Route Shell 进入 Blocking Transition。

Refresh 使用全局 Single-flight：同一时间只允许一个 Refresh Attempt。需要身份的并发 Safe Request 可以等待同一 Promise，并保留自己的 AbortSignal；Mutation 不自动排队或重放。Refresh 成功后等待者使用新 Session State 重新执行 Auth Check；失败统一转为 `expired` 或 `revoked`，取消队列并执行一次 Cleanup，禁止每个 Request 独立 Logout 或形成 Refresh Loop。

## 20A.3 Cookie and CSRF

Session Cookie 必须由 Server 设置 `HttpOnly`、`Secure`、适当 `SameSite`、最窄 Path/Domain 和生命周期；JavaScript 不读取 Cookie。Cookie-based Mutation 必须使用 Server-bound CSRF Protection：SameSite 只是 Defense-in-depth，不能替代 Token/Origin Validation。CSRF Runtime Value 只存 Memory，绑定当前 Session，并通过 Header Registry 发送；Login、Logout、Refresh 与高风险 Action 同样受 CSRF/Origin Contract。

禁止把 Credential、Access/Refresh Token、Session ID、CSRF Secret、Password、Recovery Code 或 Authoritative Permission 存入 Local Storage、IndexedDB、URL、Pinia Persistence 或 Log。

## 20A.4 401, 403 and Request Coordination

401 表示 Session 缺失、过期或无效：Request Layer 最多触发一次 Single-flight Refresh；Refresh 后仍 401 则 Session 进入 Expired/Revoked。403 表示已认证但 Operation 不允许：不得 Refresh、不得清 Session、不得重定向登录；返回 Permission-denied UI。429、409 和 Validation Error 不进入 Auth Flow。

## 20A.5 Permission Registry

Capability ID 来自 Exact Permission Registry：

```ts
interface PermissionRegistryRecord {
  id: string
  descriptionKey: string
  sourceClaim: string
  routeUseAllowed: boolean
  componentVisibilityUseAllowed: boolean
  operationUseAllowed: boolean
  serverRevalidationRequired: true
  capabilityStatus: CapabilityStatus
}
```

Route Guard 检查 Route Meta 的 Permission ID；Component 只用 Capability 决定可见性/可用性；Operation 在发送前做 UX Check，但 Server 必须重新授权。隐藏按钮、禁用控件、Route Guard 和前端 Claim 永远不是 Security Enforcement。禁止散落 Role String、`isAdmin` Boolean、未经 Registry 的 Permission Name 或 Feature 自行解释 Raw Claim。

## 20A.6 Cross-tab, Partition and Cleanup

Cross-tab Session Channel 只广播 `logout`、`revoked`、`session-changed` 和 Opaque Operation ID，不广播 Credential 或 Principal Detail。接收 Logout/Revoked 后每个 Tab 幂等执行相同 Cleanup。Query Key 与 Cache 必须包含 Opaque Principal/Tenant Partition；Account/Tenant 切换不得复用旧 Cache、Draft、Dynamic Route 或 Permission Projection。

Return URL 使用 §9.6 Typed Same-origin Contract。Logout 后默认导航到注册的 Public Route；不得恢复受保护的旧 Return URL，除非新 Session 重新通过全部 Route/Permission Validation。

## 20A.7 Auth Static Enforcement Targets

Owning Gate 必须验证 Session Transition Exhaustiveness、Single-flight 唯一性、Cookie/CSRF Config Schema、401/403 分离、Permission Registry Closure、Route/Component/Operation Reference、Principal-partitioned Query Keys、Cleanup Order、Cross-tab Payload Allowlist 和 Sensitive Persistence Prohibition。全部为 `TARGET_INACTIVE`，不得用客户端检查宣称安全完成。

# 20B. Error Handling and Observability Contract

```text
CAPABILITY=CORE_ERROR_HANDLING
CAPABILITY_STATUS=ACTIVE
OWNER=apps/web/src/app/errors
ACTIVATION_GATE=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
EXTENSION_GATES=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION; PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION; PAVP_API_TRANSPORT_IMPLEMENTATION; PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION

CAPABILITY=OBSERVABILITY_REPORTING
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/app/observability
ACTIVATION_GATE=PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION
```

Core Error Handling 与 Observability Reporting 是两个串行 Authority。Runtime Kernel 已激活 Startup、Configuration、Vue Boundary 与 Unhandled-rejection 所需的最小 Error Registry、Normalizer 和 Capture；Router Landing 已原子增加独立六条 Router Error Record 与 Adapter，使 Application-owned Combined Registry 精确为十条，同时保留 Core Registry 精确四条。Storage、API 与 Auth 仍只可在自己的 Package 中原子增加本域 Error Record 和 Capture Adapter。不存在预先标为 Active 的空 Record、No-op Reporter 或 Placeholder Category。Structured Remote Reporting、Sampling、Trace、Web Vitals、Long Task 和 Source-map Provider 只由 Observability Gate 激活，当前仍为 `TARGET_INACTIVE`。

## 20B.1 Exact Error Registry

```ts
type AppErrorCategory =
  | 'configuration'
  | 'network'
  | 'offline'
  | 'timeout'
  | 'cancelled'
  | 'unauthenticated'
  | 'unauthorized'
  | 'validation'
  | 'conflict'
  | 'rate-limited'
  | 'server'
  | 'protocol'
  | 'storage'
  | 'navigation'
  | 'chunk-load'
  | 'resource-load'
  | 'component'
  | 'startup'
  | 'unknown'

interface ErrorRegistryRecord {
  id: string
  category: AppErrorCategory
  userMessageKey: string
  recoverability: 'none' | 'retry-operation' | 'retry-navigation' | 'reload-application'
  retryOwner: 'none' | 'query' | 'mutation' | 'router' | 'runtime-kernel' | 'user'
  reportLevel: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  safeContextFields: readonly string[]
  capabilityStatus: CapabilityStatus
}
```

上述 Base Record Shape 保持不变。所有 Error 必须携带 Registry ID、Category、Opaque Error Instance ID、Cause Category、Timestamp 和 Safe Context；Raw `unknown` 只能进入 Application-owned Normalizer Boundary。UI 只消费 `userMessageKey`、Recoverability 和 Safe Action，不判断 HTTP Status、Error Message 或 Stack。Cancellation 是结果，不是用户错误。

Runtime Kernel Landing 创建一份 Application-owned Core Error Registry：

```text
CORE_ERROR_REGISTRY_OWNER=apps/web/src/app/errors
CORE_ERROR_REGISTRY_CARDINALITY=4
CORE_ERROR_MESSAGE_KEY_AUTHORITY=apps/web/src/app/errors built-in Core Error message table
REMOTE_REPORTER=PROHIBITED
```

Exact Current Set 只包含：

```text
runtime-configuration-failure
application-startup-failure
vue-component-failure
unhandled-promise-rejection
```

该 Set 不包含 I18n、Router、API、Storage、Auth、Permission、Observability、Deployment、Business 或 Vendor Error。四个 `userMessageKey` 只引用同一 Built-in Core Error Message-key Authority；这不准入 Vue I18n 或 Remote Reporter。

全部四条 Record 的 Common Prohibited Context 精确为：

```text
Cookie
Authorization
Token
Password
Secret
CSRF
full URL
query
form value
request body
response body
Storage payload
file content
DOM text
raw Runtime Configuration
raw event
raw Promise
raw component instance
component props
component emits
raw cause
raw message
raw stack
```

只有每条 Record 明确列出的 `safeContextFields` 可以进入 Safe Context。Existing Normalized Error 必须保留其 Opaque Instance Identity，不得再次 Normalized、Captured 或 Reported。

### Runtime Configuration Failure Record

```text
id=runtime-configuration-failure
owner=apps/web/src/app/errors registry and normalizer
producer=apps/web/src/app/config loader
recoveryExecutor=runtime-kernel
category=configuration
userMessageKey=core-error.runtime-configuration-failure
recoverability=retry-operation
retryOwner=runtime-kernel
reportLevel=fatal
safeContextFields=startupAttemptId,configurationFailureCause,releaseSha,buildVersion
normalizationSource=typed Runtime Configuration loader failure
fatalForCurrentAttempt=true
stateWhenRetryBudgetAvailable=recoverable-failure
stateWhenRetryBudgetExhausted=fatal-failure
capabilityStatus=ACTIVE
```

### Application Startup Failure Record

```text
id=application-startup-failure
owner=apps/web/src/app/errors registry and normalizer
producer=runtime-kernel bootstrap-step boundary
presentationOwner=runtime-kernel
category=startup
userMessageKey=core-error.application-startup-failure
recoverability=reload-application
retryOwner=user
reportLevel=fatal
safeContextFields=startupAttemptId,bootstrapStepId,releaseSha,buildVersion
normalizationSource=bootstrap-step catch or unclaimed startup-phase window.error
fatal=true
capabilityStatus=ACTIVE
```

Already-normalized Error 不再 Normalized。Application Startup Failure 不具备 In-document Configuration Retry 资格；唯一 Recovery Action 是用户显式 Browser Reload。Raw Event、Resource URL、Raw Cause、Message、Stack、Component Props 和 Component Instance 全部禁止。

### Vue Component Failure Record

```text
id=vue-component-failure
owner=apps/web/src/app/errors capture and normalizer
presentationOwner=AppErrorBoundary
category=component
userMessageKey=core-error.vue-component-failure
recoverability=none
retryOwner=none
reportLevel=error
safeContextFields=startupAttemptId,vueLifecyclePhase,releaseSha,buildVersion
allowedVueLifecyclePhase=render | setup | lifecycle | watcher
normalizationSource=app.config.errorHandler or admitted component boundary
fatal=false
capabilityStatus=ACTIVE
```

Initial Mount Step 中的 Root Component Failure 必须恰好一次分类为 `application-startup-failure`，不得同时分类为 Component Failure。Component Name、Instance、Props、Emits、Raw Vue Info、DOM Text、Raw Cause、Message 和 Stack 全部禁止。

### Unhandled Promise Rejection Record

```text
id=unhandled-promise-rejection
owner=apps/web/src/app/errors global capture
category=unknown
userMessageKey=core-error.unhandled-promise-rejection
recoverability=none
retryOwner=none
reportLevel=error
safeContextFields=applicationStartupState,startupAttemptId,releaseSha,buildVersion
normalizationSource=PromiseRejectionEvent.reason at the global listener
fatal=false
triggersStartupRecovery=false
capabilityStatus=ACTIVE
```

Promise、Raw Rejection Reason、Raw Cause、Message 和 Stack 全部禁止。该 Record 不触发 Startup Recovery，也不准入 Remote Reporter。

## 20B.2 Capture and Boundary Ownership

| Source | Owner | Boundary behavior |
| --- | --- | --- |
| Runtime Configuration loader | Runtime Kernel step boundary plus `app/errors` normalizer | direct typed normalization before global capture exists |
| Startup Bootstrap step or unclaimed startup execution error | Runtime Kernel step boundary or startup-only `window.error` | normalize once as `application-startup-failure` and stop the attempt |
| Vue render/setup/lifecycle/watcher | `app.config.errorHandler` | normalize once as `vue-component-failure`; initial root Mount uses Startup precedence |
| Component subtree | `AppErrorBoundary` or admitted local boundary | preserve Shell and reset subtree only when safe |
| Unhandled promise rejection | the one global `unhandledrejection` listener | normalize once as `unhandled-promise-rejection`; never trigger Startup Recovery |
| Router guard/navigation | Router | typed navigation failure and error route |
| Query/Mutation | TanStack Query owner | query/mutation policy and feature state |
| Resource/Chunk load | Runtime/Router | release-aware recovery |
| Reporting provider | Observability owner | never re-enter application error pipeline |

Runtime Kernel Landing 激活了上表前五条所需的四条 Core Record；Router Landing 随后激活 Router guard/navigation 与 Router-owned Resource/Chunk-load 分类所需的独立六条 Router Error Extension。Query/Mutation 与 Reporting 行仍只保留其 Future Owner。Core Registry 继续精确为四条，Application-owned Combined Registry 精确为十条；不得把 Router Extension 并入 Core Set，也不得为后续域创建 Placeholder Record 或 Adapter。

Boundary Reset 必须先 Dispose 失败 Subtree 的 Subscription、Request、Focus/Scroll Lock 和 Draft Handle。Fatal Error 不允许无限 Retry；Recoverability 必须来自 Registry，Component 不得随意添加 Reload Button。Global Capture 的 Exact Count、Lifetime、Atomic Installation、Ready-time `window.error` Removal 和 Attempt-final `unhandledrejection` Removal 只由 §19.4 的 Configuration-first Contract 定义，不得建立第二份 Listener Policy。

## 20B.3 Structured Log, Event and Trace Schema

```ts
interface ObservabilityEnvelope {
  schemaVersion: number
  eventId: string
  eventName: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal'
  occurredAt: string
  environment: 'development' | 'staging' | 'production'
  releaseSha: string
  buildVersion: string
  routeTelemetryName: string | null
  requestId: string | null
  correlationId: string | null
  traceId: string | null
  anonymousPrincipalHash: string | null
  payload: Record<string, unknown>
}
```

Event、Metric、Trace Name 和 Payload Schema 必须来自 Versioned Observability Registry。Client 生成的 Trace 不是安全/计费权威。Anonymous Principal Hash 必须使用 Release-independent、Server-provided Opaque Value 或不可逆 Rotation Policy；不得 Hash Email、Raw User ID 或 Token 后假装匿名。

## 20B.4 Redaction, Sampling and Deduplication

默认拒绝所有字段，只允许 Registry `safeContextFields`。全局禁止 Cookie、Authorization、Token、Password、Secret、CSRF、Full URL、Query、Form Value、Request/Response Body、Storage Payload、File Content 和 DOM Text。Redaction 在 Queue 前执行；失败则丢弃 Event，不发送 Raw Fallback。

Fatal、Startup、Auth Security Anomaly 和 Release Health Event 使用明确 Policy；高频 Performance/Interaction Event 使用 Deterministic Sampling。相同 Error Fingerprint 在命名窗口内 Deduplicate，并保留 Count/First/Last Timestamp；Sampling、Window 和 Queue Limit 来自 Observability Policy Registry，不在调用点写 Literal。

## 20B.5 Required Signals

Target Registry 至少覆盖：

```text
application startup outcome and duration
unhandled rejection and Vue boundary failure
navigation outcome, cancellation and duration
chunk and resource load failure
API latency, status category and retry outcome
session restore, refresh and revocation outcome
storage migration/corruption/quota outcome
Web Vitals
long task
runtime configuration failure
release and rollback marker
```

Web Vitals 与 Long Task 只能在 Browser Capability 可用时收集；缺失能力不是 Error。Performance Entry 不得包含 Full URL 或用户内容。API Latency 使用 Transport Attempt Event，禁止 Feature 重复计时形成双记录。

## 20B.6 Source Maps and Reporting Failure

Production Source Map 可以生成但不得公开部署；只允许 CI/Release Pipeline 私密上传到已准入 Provider，上传成功后按 Retention Policy 处理。Source Map 包含 Source Content 时视为敏感 Build Artifact。Provider 未准入前，Production `sourcemap` 保持关闭，并明确接受较低可诊断性；不得把公开 Source Map 当临时方案。

Reporting Transport 使用独立、最小、无业务拦截器的通道。Report Failure 只增加内存 Drop Counter；不得调用 App Error Reporter、触发 Toast、刷新 Session 或无限重试。Page Unload 只发送 Byte-limited、已 Redact Batch；失败允许丢弃。

## 20B.7 Error and Observability Static Enforcement Targets

Core Error Owning Gate 当前为 `ACTIVE`：它拒绝任意 Error Category/Message、重复 Capture 和无 Owner Retry，并验证每个已准入 Error Consumer 与 Exact Active Registry Subset 同步；新 Package 必须在同一 Landing 中扩展 Registry，不能提前或延后。Observability Gate 另行拒绝任意 Telemetry Name、Raw Console Production Log、未 Redact Context、重复 Report、公开 Source Map、PII Field、未注册 Metric 和 Recursive Reporter，并闭合 Schema Version、Release Fields 与 Capture Source。Observability Enforcement 在其 Gate 前保持 `TARGET_INACTIVE`；Core Error 已激活不表示 Reporting Active。

---

# 21. Forms Target Contract

```text
CAPABILITY=FORMS
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=feature form boundary plus @platform/ui field primitives
FORM_LIBRARY=VEEVALIDATE_STABLE_MAJOR_SELECTED_AT_IMPLEMENTATION_ADMISSION
VEEVALIDATE_STABLE_MAJOR_CAPABILITY_STATUS=TARGET_INACTIVE
VEEVALIDATE_PRERELEASE_MAJOR_CAPABILITY_STATUS=PROHIBITED
VEEVALIDATE_V5_CAPABILITY_STATUS=PROHIBITED
VEEVALIDATE_V5_FREEZE_FACT=PRERELEASE_AND_UNAVAILABLE_AS_OF_2026-08-02
ACTIVATION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
ACTIVATION_GATE_CREATION=UNIQUE_PAVP_FORM_INSTANCE_ID_REQUIRED_BY_ARCHITECTURE_AMENDMENT
```

Stable-only Policy 优先于 Major 偏好。实现 Gate 必须重新核对当时的 Stable Release、Vue/TypeScript Compatibility、Bundle、Standard Schema Integration 和 Migration Cost；Alpha、Beta 或 RC 不得进入 Production Dependency。Zod 4 继续作为已选择的 Runtime Schema 方向，但安装位置仍由真实 Consumer Gate 决定。

## 21.1 Ownership

| Owner | Exact responsibility |
| --- | --- |
| Stable admitted form-state library | field registration, touched, dirty, pending, validation lifecycle and submission state |
| Feature-owned Zod schema | input shape, domain constraints, parse/transform and typed output |
| `UiFormField` | label, description, required indicator, error ID, `aria-describedby`, layout and focus target |
| Feature form orchestrator | initial values, server mapping, submit mutation, cancellation, reset and navigation policy |
| API/Mutation layer | request, idempotency, conflict, optimistic policy and server error normalization |

Form Library 不拥有 Domain Schema、API、Storage、Route Guard 或视觉 Token。禁止首期建设 Schema-driven ProForm、字段 JSON DSL、自动 CRUD Form 或跨 Feature 通用业务字段库。

## 21.2 Initial, Reset and Reinitialize

每个 Form Contract 必须声明 `formId`、Schema ID、Initial Value Source、Submit Mutation ID、Reset Policy、Reinitialize Policy 和 Unsaved-change Policy。Initial Value 必须先通过 Domain Schema；Server Data 到 Editable Draft 使用显式 Mapper，不能直接双向绑定 Query Object。

Reset 精确选择 `initial-snapshot`、`last-server-confirmed` 或 `empty-domain-default`；Default 来自 Domain Typed Default Registry。Reinitialize 只在 Record Identity 改变或显式 Server Revision 被接受时发生；不得因为 Background Refetch 擦除 Dirty Field。Dirty 比较在 Canonical Domain Value 上执行，不依赖对象引用或格式化字符串。

## 21.3 Validation and Server Error Mapping

Client Validation 顺序为：Field Parse → Field Constraint → Cross-field Domain Schema → Submit Transform。Async Validation 必须可取消、按 Canonical Value Deduplicate，并在 Value 改变或 Form Dispose 时 Abort。Async Result 必须绑定 Validation Attempt ID，旧结果不得覆盖新值。

Server Validation Error Body 先通过 API Error Schema，再由 Feature-owned Exact Mapping 将 Server Field Path 映射为 Form Field ID。Unknown Field、Form-level Error 和 Operation Conflict 保持不同 Category；不得把 Raw Server Message 直接显示。新的 Field Mapping 缺失必须在 Development/Static Gate 失败，并在 Production 退到安全 Form-level Message。

## 21.4 Submission and Mutation

Submit 时固定执行：完整 Validation → Canonical Payload Construction → Submission Lock → Mutation Attempt。相同 Form Instance 默认只允许一个 Mutation；重复点击复用 Pending State，不发第二请求。离开 Route、关闭 Dialog 或 Dispose Form 时，按 Mutation Contract 选择 Abort 或允许后台完成，不能默认为隐藏继续。

Mutation 默认不重试；只有 §20 的显式 Idempotency Contract 才允许。成功后更新 Last-server-confirmed Snapshot、执行 Query Invalidation 并清 Dirty；失败保留用户输入。409/412 进入 Conflict UI，不覆盖输入。Optimistic Update 和 Rollback 遵守 §20.7。

## 21.5 Accessibility

每个字段必须有 Programmatic Label、稳定 Description/Error ID、Visible Required Meaning 和 Error Association。Submit Validation Failure 必须把 Focus 移到 Error Summary 或第一个 Invalid Field，并提供包含 Field Link 的 Live Region Summary；不得只用颜色、Placeholder 或 Toast 表达错误。

Pending、Success 和 Failure Announcement 遵守命名 Live-region Policy；Disabled 与 Readonly 使用正确原生语义。Keyboard Submit 不得绕过 Validation；Focus Return、Dialog Form 和 Unsaved Confirmation 遵守 Route/Overlay Contract。

## 21.6 Dates, Time Zones, Numbers and Files

```text
instant = UTC ISO 8601 string at API boundary
date-only = calendar date without timezone conversion
local date-time = explicit locale plus timeZone context
duration = named unit and integer/decimal contract
money = integer minor unit or validated decimal string, never binary-float authority
```

Locale 与 Time Zone 是独立用户偏好；Formatter 使用 `Intl`。Ambiguous/Nonexistent Local Time 必须要求 Domain Policy，不自动猜测。Temporal 保持 `DEFERRED`，只有 Stable Platform/Polyfill Admission 后使用。

File Input 必须保留用户显式选择，验证数量、MIME、扩展、单个/总大小和 Filename；Preview Object URL 在替换/Dispose 时撤销。File Content 不进 Form Log、Pinia Persistence 或 Local Storage。Upload Progress 和 Resume 需要 Endpoint 独立合同。

## 21.7 Draft Persistence and Static Enforcement

Draft 默认 Memory-only。跨刷新 Draft 只有在 Storage Gate 明确 Owner、Sensitivity、Expiration、Principal Partition、Migration 和 User-clear Action 后准入；Password、Credential、Payment Secret 和 File Content 永不持久化。

Owning Gate 必须检查 Stable Dependency、Schema/Field Mapping Closure、Initial/Reset/Reinitialize Contract、Async Abort、Submission Lock、Server Error Mapping、A11y Association、Unsaved Policy、Sensitive Draft Prohibition 和 Form Direct Fetch。全部为 `TARGET_INACTIVE`。

---

# 22. Tables and Mutation-state Target Contract

```text
CAPABILITY=TABLES_AND_MUTATION_STATES
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=feature data boundary and demand-admitted @platform/ui table component
ACTIVATION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
ACTIVATION_GATE_CREATION=UNIQUE_PAVP_TABLE_INSTANCE_ID_REQUIRED_BY_ARCHITECTURE_AMENDMENT
```

## 22.1 Shared Table Contract

每张表必须声明 Exact `tableId`、Row Identity、Column Registry、Data Ownership、Pagination、Sorting、Filtering、Selection、Mutation、State Presentation、Scroll Owner 和 Persistence Policy。Row Key 必须来自稳定 Domain ID；Array Index、Rendered Position 和 Display Label 不得作为身份。

Column Registry 定义 Column ID、Header Key、Cell Semantic、Sort/Filter Capability、Width Policy、Alignment、Visibility、Sensitive-data Classification 和 Export Eligibility。页面不能用任意 Column String、原始 Width 或 Inline Color。Cell Renderer 只接收 Typed Row Projection，不直接 Fetch 或读取全局 Store。

## 22.2 Level 1: Native Static Table

```text
Native HTML table
+ semantic tokens
```

用于有限、非交互数据。必须使用 `caption`、`thead`、`tbody`、`th` Scope 和正确 Reading Order；不得用 CSS Grid/Div 模拟语义 Table。

## 22.3 Level 2: TanStack Table Admission

触发后增加：

```text
TanStack Table
+ UiDataTable
```

适合：

* 排序。
* 过滤。
* 分页。
* 列显示。
* 普通行选择。
* 服务端数据。

TanStack Table 只有真实 Level 2 Consumer 出现后准入。Client/Server Ownership 必须逐 Capability 声明：Server Sorting/Filtering/Pagination 进入 Query Key 和 URL Schema；Client Capability 只能作用于当前完整数据集。禁止对 Server-paginated 当前页做“全局”Client Sort/Filter 后伪装完整结果。

Pagination 使用 Cursor 或 Page Contract，不能混用。URL State 经 Route Query Schema 验证；Table、Route 和 Query Key 共用同一 Canonical State，不复制到第二个 Pinia Store。Background Refetch 保留稳定 Row Selection，但删除/权限变化的 Row 必须移除并通知。

## 22.4 Level 3: Professional Grid

满足至少两项时使用专业 Grid Adapter：

* 二维虚拟化。
* 十万级数据。
* Range Selection。
* Fill Handle。
* Pivot。
* 公式。
* Excel 式编辑。
* 复杂冻结列。
* 大规模分组。
* 服务器端 Row Model。

专业 Grid 不进入业务页面。应用只通过 `@platform/ui` 公共根出口使用命名的语义组件：

```text
@platform/ui root export
        ↓
semantic grid component
        ↓
private lazy-loaded packages/ui/src/adapters/grid/**
```

Adapter Path 和 Vendor Package 永不成为应用公共 API。Grid 拥有 Route Primary Axis 时，其祖先必须在同轴不可滚动，并由 Route Contract 精确声明。

## 22.5 Virtualization, Selection and Editing

Virtualization 只有测量证明 DOM/Render 成为瓶颈并通过 Scroll/A11y Gate 后准入。Virtual List/Grid 必须拥有 Bounded Scroll Region、Stable Estimated/Measured Size Policy、Keyboard Navigation、Focus Retention、Overscan Protocol Constant 和 Dispose Contract；Overscan、Row Height 与 Viewport Size 不在页面写 Literal。

Selection 明确 `page-local`、`query-result` 或 `explicit-id-set`；“Select All”必须说明是当前页、当前过滤结果还是全数据，不能暗中改变语义。跨页 Selection 只保存 Stable ID 和 Query Fingerprint；Data/Permission 变化时重新验证。

Inline Editing 使用 Form/Mutation Contract。每个 Row/Cell Mutation 必须声明 Concurrency、Lock、Optimistic、Rollback、ETag、Conflict 和 Error Placement；不得把 Failed Cell 只标红而无 Accessible Message。

## 22.6 Loading, Empty, Partial, Stale, Offline and Error

```ts
type DataPresentationState =
  | 'initial-loading'
  | 'refreshing'
  | 'empty-unfiltered'
  | 'empty-filtered'
  | 'partial'
  | 'stale'
  | 'offline-with-cache'
  | 'offline-without-cache'
  | 'error-recoverable'
  | 'error-terminal'
  | 'ready'
```

Initial Loading 与 Refreshing 不清空已有 Row；Empty-filtered 必须提供清除过滤 Action；Partial 显示范围/限制；Stale/Offline 标明数据时效；Error 使用 Error Registry 和 Query Retry Owner。Loading、Empty 和 Error 组件只有出现真实跨页面复用后进入 `@platform/ui`。

## 22.7 Table Persistence and Static Enforcement

Column Visibility/Order/Width 只有在 Storage Registry 声明 Table Schema Version、Column Migration、Principal Partition 和 Reset Action 后持久化。Filter、Sensitive Search、Selection 和 Row Data 默认不持久化。

Owning Gate 必须检查 Table/Column/Row Registry、Stable Identity、URL/Query State 单一权威、Client/Server Capability、Scroll Owner、A11y Markup、Virtualization Admission、Mutation Contract、State Exhaustiveness、Vendor Isolation 和 Persistence Allowlist。全部为 `TARGET_INACTIVE`。

---

# 23. Internationalization Target Contract

```text
CAPABILITY=I18N
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=apps/web/src/shared/i18n
LIBRARY_DIRECTION=VUE_I18N_STABLE_RELEASE_AT_ADMISSION
ACTIVATION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
ACTIVATION_GATE_CREATION=UNIQUE_PAVP_I18N_INSTANCE_ID_REQUIRED_BY_ARCHITECTURE_AMENDMENT
```

## 23.1 Locale Registry and Resolution

```ts
interface LocaleRegistryRecord {
  id: string
  languageTag: string
  direction: 'ltr' | 'rtl'
  messageLoaderId: string
  intlLocale: string
  capabilityStatus: CapabilityStatus
}
```

初始 Product Locale Default 由 Typed Default Registry 唯一声明为注册的 `en` Locale；HTML 的安全 `lang` 必须与该 Default 生成/校验一致。有效 Locale 解析优先级：Validated User Preference → Authenticated Account Preference → Supported Browser Language Match → Product Locale Default。任何来源先通过 Exact Locale Registry；Unknown Locale 不持久化。

Fallback Locale 固定为 Product Locale Default，不能形成多级循环。Locale、Time Zone、Numbering System 和 Calendar 是独立轴；切换 Locale 不改 Time Zone 或业务数据。

## 23.2 Message Ownership and Loading

所有用户可见文本、Route Title、Breadcrumb、Form/Error/Empty/Fatal Message 和公共组件 Copy 使用 Typed Message Key。Message Key 由 App/Feature Owner 分区，禁止运行时字符串拼接 Key、默认英文 Literal、Component 内部 Vendor Copy 或同 Key 不同参数 Shape。

Locale Bundle 按 Route/Feature Lazy Load，并使用 Generated Key/Parameter Schema。切换流程为：Load and validate complete bundle → set Vue I18n locale → atomically update `html.lang` and `html.dir` → announce change。Load Failure 保留当前 Locale，返回注册 Error；不得留下 Message/Direction 混合状态。

Development 遇到 Missing Key/Parameter 必须失败或显式告警；Production 使用同 Key 的 Product Default Locale 文本并发送去重 Observability Event。若 Default Locale 也缺失，显示注册的安全通用消息，不显示 Raw Key 或空白。

## 23.3 Persistence, RTL and Text Expansion

Locale Preference 通过 Storage Registry 持久化并按 Account/Anonymous Merge Policy 处理；Component 不直接访问 `navigator.language` 或 Storage。Cross-tab Locale Change 使用 §19.5 Revision Contract。

布局使用 Logical Properties；Icon Direction、Navigation Order、Table Alignment、Animation Origin 和 Gesture Direction 必须声明是否随 RTL 镜像。品牌标志、媒体内容和不可镜像数据图形保持原方向。所有 UI 必须容纳命名 Text Expansion Budget，不通过 Fixed Height、截断 Required Label 或缩小 Font 绕过。

## 23.4 Date, Time Zone, Number and API Boundary

Formatter 只使用集中 Typed `Intl` Formatter Registry，不能在 Component 重复 `new Intl.*` Options Literal。Instant、Date-only、Local Date-time、Duration、Money 和 Decimal 遵守 §21.6。Time Zone 默认来自 Typed User/Account Preference；缺失时使用 Runtime Configuration 的 Product Zone Policy，不从 Locale 推导。

如果 API 表示随 Locale 变化，Locale ID 必须进入 Request Header Registry 和 Query Key；不随 Locale 变化的数据不得因切换 Locale 重取。Server Message 不直接显示，仍映射到本地 Message Key。禁止 Moment/Day.js 基础依赖；Temporal 在明确 Stable/Polyfill Gate 前为 `DEFERRED`。

## 23.5 I18n Static Enforcement Targets

Owning Gate 必须验证 Locale Registry、Default/Fallback 唯一性、Message Key/Parameter Set、Route/Error/Form Copy Closure、HTML Lang/Dir Atomicity、Storage Ownership、RTL Metadata、Formatter Registry、Locale-sensitive Query Key 和 Missing-key Policy。规则在 I18n Implementation 前为 `TARGET_INACTIVE`。

---

# 24. 动画系统

```text
CAPABILITY=RUNTIME_MOTION
CAPABILITY_STATUS=TARGET_INACTIVE
CSS_MOTION_TOKEN_BASELINE_STATUS=ACTIVE
VIEW_TRANSITION_STATUS=TARGET_INACTIVE
VIEW_TRANSITION_MODE=PROGRESSIVE_ENHANCEMENT
VIEW_TRANSITION_ACTIVATION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
VIEW_TRANSITION_ACTIVATION_GATE_CREATION=UNIQUE_PAVP_MOTION_INSTANCE_ID_REQUIRED_BY_ARCHITECTURE_AMENDMENT
MOTION_FOR_VUE_STATUS=DEFERRED
GSAP_STATUS=DEFERRED
OWNER=packages/ui private motion boundary after admission
```

优先级：

```text
1. CSS Transition / Animation
2. View Transition API as progressive enhancement
3. Motion for Vue after a named production need
4. GSAP after repository-defined admission
```

这是技术路由优先级，不是当前依赖清单。Phase 1 不引入 Motion 或 GSAP。第三方 Motion Vendor 只能由对应的 `packages/ui/src/adapters/**` 私有 Adapter 导入。

View Transition API 已进入现代浏览器 Baseline，但仍作为渐进增强，旧浏览器必须直接完成状态切换。

Motion for Vue 用于：

* 布局重排。
* Shared Element。
* 面板开合。
* 拖动。
* Presence。
* 复杂手势。

Motion 支持全局 Reduced Motion 策略；开启 Reduced Motion 时可以禁用 Transform 和 Layout 动画。

禁止：

```text
transition: all
全局 AnimateWrapper
Vue state 逐帧动画
普通 Hover 使用 Motion
永久 will-change
无法中断的长动画
Reduced Motion 下执行位移和缩放
```

Motion Token：

```text
motion.duration.instant
motion.duration.fast
motion.duration.normal
motion.duration.slow
motion.easing.standard
motion.easing.emphasized
```

Spring Family 延迟到真实、已批准的 Production Interaction 出现后再定义，不作为 Phase 1 Token 交付。

## 24.1 Motion for Vue Admission and Grammar

Motion for Vue 只有同时满足以下条件才允许引入：

1. 存在命名的真实 Production Interaction 和 Owner。
2. CSS 与 Progressive View Transition 无法满足该 Interaction。
3. 依赖位于 Demand-created、私有的 `packages/ui/src/adapters/motion/**`。
4. Immediate Response、Interruption、Reversal、Origin 和 Lifecycle 合同完整；Gesture 在适用时保留输入速度，Route Disposal 时完成 Cleanup。
5. Full、Reduced 和 None Motion 均保持相同语义结果；Reduced/None 不依赖位移或缩放表达状态。
6. 保留 Native Scroll，禁止 Scroll Hijacking 和 Custom Scroller。
7. 已测量 Production Bundle 影响，并遵守现有 Budget。

公共组件只表达 Semantic Interaction，不公开 Spring、Stiffness、Damping、Velocity 或 Timeline 等实现参数。共享 Spring Family 只有在已准入 Interaction 证明复用后才允许建立。

## 24.2 GSAP Admission Gate

GSAP 只有同时满足以下条件才允许引入：

1. 存在命名的真实 Production Interaction 和 Owner。
2. 仓库内决策证据说明 CSS、View Transition 和 Motion for Vue 均不足。
3. 依赖位于私有、Lazy-loaded UI Adapter，应用不直接导入。
4. Cleanup、Cancellation、Interruption、Reversal、Route Disposal 和 Gesture Disposal 合同完整。
5. Full、Reduced 和 None Motion 行为均已定义。
6. 保留 Native Scroll；禁止 Scroll Hijacking、自定义 Scroller 和自定义滚动条框架。
7. 已测量 Production Bundle 影响，并在超过现有阈值时提交 ADR。

外部人员、Machine-local Skill、Registry 或客户端专属能力不能成为 Admission Authority。

## 24.3 Motion Value Authority

Duration、Delay、Easing、Spring、Distance、Origin、Stagger、Gesture Threshold 和 Interruption Window 必须属于 Motion Token、Named Interaction Registry 或准入后的 Private Adapter Contract。页面、Feature、Shared Module 和 Public Component 不得写 Millisecond、Cubic-bezier、Spring Number、Transform Distance 或 `will-change` Literal。

```ts
interface MotionInteractionRecord {
  id: string
  ownerComponent: string
  semanticPurpose: string
  implementationTier: 'css' | 'view-transition' | 'motion-adapter' | 'gsap-adapter'
  durationToken: string
  easingToken: string
  fullBehavior: string
  reducedBehavior: string
  noneBehavior: string
  interruptionPolicy: string
  reversalPolicy: string
  cleanupPolicy: string
  capabilityStatus: CapabilityStatus
}
```

Motion Preference `full | reduced | none` 只改变表达，不改变最终业务状态、Focus、Reading Order、Accessible Name 或 Operation Result。`reduced` 禁止大幅位移、缩放、视差和自动连续 Motion；`none` 直接提交最终状态，但仍保留必要 Loading/Progress Semantics。

## 24.4 Lifecycle, Interruption and Cleanup

每次 Interaction 使用唯一 Instance ID 和状态机：

```text
idle → running → completed
idle → running → interrupted → disposed
idle → running → reversing → completed
any non-disposed state → disposed
```

用户新输入、Route Disposal、Component Unmount、Preference Change、Visibility Loss 和 Application Disposal 必须中断当前 Motion 并提交合同指定的稳定状态。Promise、Callback 和 Focus Transfer 必须恰好完成一次；取消不能留下 Inline Style、Transform、`will-change`、Timer、RAF、Observer 或 Event Listener。

Reversal 只有 Interaction Registry 声明且能保持状态一致时允许；Gesture 可在适用时继承输入速度，但速度、阻尼和边界都由 Private Adapter Contract 管理。长动画不能阻止用户操作；所有可交互控件先立即响应，再表现 Motion。

## 24.5 View Transition Contract

View Transition 仅用于已注册的页面/状态切换 Progressive Enhancement。调用前必须确认 Browser Capability、Motion Preference、Document State、参与 Element Identity 和 Route Lifecycle；任一条件不满足则直接提交 DOM 最终状态。

Transition Name 只能来自 Exact Motion Registry，不能由用户数据、Route Param 或 DOM Text 构造。Transition Callback 抛错或 Navigation 取消时必须恢复稳定 DOM、清 Name 和完成 Focus/Scroll Contract。View Transition 不拥有 Router、Query Prefetch 或业务 Mutation。

## 24.6 Motion Static Enforcement Targets

Static Gate 必须拒绝 `transition-all`、任意 Duration/Easing/Delay/Transform Distance、永久 `will-change`、页面 Motion Vendor Import、未知 Transition Name、Reduced/None Contract 缺失、无 Cleanup/Interruption 的 Interaction、Scroll Hijacking 和 Public Optical/Spring Prop。Motion Registry、Token 和 Adapter Import Set 必须闭合；在对应 Gate 前为 `TARGET_INACTIVE`。

---

# 25. 无障碍基线

目标：

```text
WCAG 2.2 AA
```

```text
CAPABILITY=ACCESSIBILITY_ARCHITECTURE_BASELINE
CAPABILITY_STATUS=ACTIVE
RUNTIME_COMPONENT_ACCESSIBILITY_STATUS=TARGET_INACTIVE
RUNTIME_COMPONENT_ACCESSIBILITY_ACTIVATION_GATE=COMPONENT_OR_ROUTE_ADMISSION
OWNER=semantic component, route and application boundary owners
```

## 25.1 Versioned Named Contrast Registry

当前十个 Named Pair 与四个 Non-text Boundary 必须统一进入一个精确的 Active Named Contrast Registry，不得一部分存在于 Token Metadata、另一部分硬编码在 Validator：

```ts
interface NamedContrastRecord {
  id: string
  foregroundRole: string
  backgroundRole: string
  kind: 'normal-text' | 'large-text' | 'non-text'
  standardMinimum: number
  enhancedMinimum: number
  maximumUsefulRatio: number | null
  enhancedDifferenceRequired: boolean
  staticMaterialProjections: readonly MaterialPreference[]
}
```

`ActiveNamedContrastRegistry.records` 是以下唯一 Active Set；不得使用公式、Cartesian Expansion、Implicit Deduplication 或 Token Metadata 自动发明 Record：

```ts
const ActiveNamedContrastRegistry = {
  schemaVersion: 1,
  records: [
    {
      id: 'text-primary-on-page',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'color.surface.page',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-primary-on-panel',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'color.surface.panel',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-secondary-on-page',
      foregroundRole: 'color.text.secondary',
      backgroundRole: 'color.surface.page',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'text-secondary-on-panel',
      foregroundRole: 'color.text.secondary',
      backgroundRole: 'color.surface.panel',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'action-content-on-primary',
      foregroundRole: 'color.text.on-action',
      backgroundRole: 'color.action.primary',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'focus-ring-on-page',
      foregroundRole: 'color.focus.ring',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'focus-ring-on-panel',
      foregroundRole: 'color.focus.ring',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'material-chrome-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.chrome.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'material-overlay-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.overlay.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'material-modal-content',
      foregroundRole: 'color.text.primary',
      backgroundRole: 'material.modal.background',
      kind: 'normal-text',
      standardMinimum: 4.5,
      enhancedMinimum: 7,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: ['adaptive', 'reduced', 'solid'],
    },
    {
      id: 'control-primary-on-page',
      foregroundRole: 'color.action.primary',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'control-primary-on-panel',
      foregroundRole: 'color.action.primary',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'border-default-on-page',
      foregroundRole: 'color.border.default',
      backgroundRole: 'color.surface.page',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
    {
      id: 'border-default-on-panel',
      foregroundRole: 'color.border.default',
      backgroundRole: 'color.surface.panel',
      kind: 'non-text',
      standardMinimum: 3,
      enhancedMinimum: 3,
      maximumUsefulRatio: null,
      enhancedDifferenceRequired: false,
      staticMaterialProjections: [],
    },
  ],
} as const
```

```text
NAMED_CONTRAST_RECORDS=14
```

每个 Record 都必须满足 `standardMinimum ≤ enhancedMinimum`，且 `maximumUsefulRatio === null || enhancedMinimum ≤ maximumUsefulRatio ≤ 21`。当前实现没有 Maximum-useful Ceiling，也没有 Standard/Enhanced Difference Contract，所以十四个 Record 的 `maximumUsefulRatio` 与 `enhancedDifferenceRequired` 必须分别保持 `null` 与 `false`；不得从先前 Future Proposal 发明差异。

Missing、Unknown、Duplicate 或 Extra ID 必须失败。Public Endpoint 只允许八个 Active Opaque Public Color Role；Internal Endpoint 只允许 `material.chrome.background`、`material.overlay.background` 和 `material.modal.background`。`color.scrim.viewport` 和所有 Reserved Role 都是 Endpoint-invalid。`staticMaterialProjections` 的顺序必须精确；仅三个 Material Record 使用 `['adaptive', 'reduced', 'solid']`，其余 Record 使用 `[]`。

Build-time Validation 枚举当前适用的 Theme × Effective Color Mode × Contrast State，并按 Record 明确的 Projection 验证。完整 Cartesian Enumeration 只允许用于静态验证，不允许直接生成同规模 CSS。任何未来 Pair、Endpoint、Kind、Threshold、Maximum、Enhanced Difference 或 Projection 变化都需要 Admission Amendment，并与相关 Public Role 激活原子同步。

Adaptive Translucent Material 位于任意内容之上时，静态工具不能证明最终合成对比度。含文本的 Adaptive Chrome 必须提供经过准入的 Scrim、Backplate 或 Opacity Floor，并具有完整 Reduced 和 Solid Fallback。Codex 必须明确报告静态证明边界；Owner 可以在仓库外选择手工观察最终合成效果，但该观察不是 Codex Verification Gate。

Forced Colors 必须投影为 Solid，并允许使用 System Color。状态不得只通过颜色或透明度表达。

每个公共组件必须验证：

* 语义结构。
* Accessible Name。
* 键盘操作。
* Visible Focus。
* Focus Return。
* Error Association。
* Loading Announcement。
* Disabled Semantics。
* 非颜色状态表达。
* Reduced Motion。
* Standard / Enhanced Contrast。
* Forced Colors。
* Reduced Transparency 与 Material Fallback。
* Touch Target。
* Responsive Reading Order。

拖动操作必须存在非拖动替代方案；WCAG 2.2 对 Dragging Movement 已提出对应要求。

静态门槛：

```text
eslint-plugin-vuejs-accessibility
TypeScript typed component contracts
Stylelint production CSS rules
```

Owner 可以选择在仓库外手工观察：

* 键盘操作与焦点行为。
* 语义结构与 Accessible Name。
* Named Contrast Pair、Adaptive 合成对比度、Reduced Motion、Reduced Transparency 与 Forced Colors。
* Touch Target 与触控行为。
* Responsive Reading Order。

Codex 不得打开或操作浏览器来执行这些观察。Codex 只能审查 Owner 明确提供的观察记录；这些记录不进入仓库，也不改变 `pnpm verify` 作为唯一 Codex Verification Gate 的合同。

## 25.2 Semantic, Name, Keyboard and Focus Contract

原生语义 HTML 是第一选择；只有原生元素无法满足复合交互时才准入 Reka Adapter。每个交互必须声明 Role、Accessible Name Source、Description、Keyboard Map、Focus Entry、Focus Movement、Focus Exit、Focus Return、Disabled/Readonly State 和 Error/Loading Announcement。

Accessible Name 优先级由 Component Contract 固定：Visible Label → explicit labelled-by ID → semantic `aria-label` only when no visible label is possible。Placeholder、Icon、Tooltip 和 Visual Position 不能单独构成 Name。重复 ID、空 Label、Name 与可见文本冲突、不可达 Description 必须失败。

Keyboard Contract 必须使用平台约定与原生行为：Tab 只移动全局 Focus，Arrow/Home/End/Enter/Space/Escape 由对应 Composite Pattern 定义。不得劫持浏览器、Screen Reader 或文本编辑快捷键。所有 Pointer/Drag Operation 必须有键盘和非拖动替代。

Focus Indicator 只能消费 Focus Token，不能被 Outline Reset 移除。Route、Dialog、Popover、Sheet、Error Boundary、Deletion 和 Async Completion 必须定义 Focus Destination/Return；被删除或 Disabled Trigger 不存在时回到最近有效 Landmark。Programmatic Focus 必须等待 DOM Ready，但不能用任意 Timeout。

## 25.3 Live Region and Adaptive Accessibility

Live Region Registry 定义 `polite`/`assertive`、Message Key、Deduplication Window 和 Owner。Progress、Loading、Save、Validation、Connection 和 Background Refresh 不得同时由多个 Region 重复播报。Assertive 只用于需要立即干预的失败；普通状态使用 Polite 或可见静态文本。

Forced Colors 激活时使用 System Color、Visible Boundary 和 Solid Material；不得用 `forced-color-adjust: none` 绕过，除非保留语义所必需并通过独立审查。Reduced Transparency 解析为 Reduced/Solid；Reduced Motion/None 遵守 §24；Zoom、200% Reflow、Text Spacing 与 RTL 不能造成信息/操作丢失。

Minimum Pointer Target 为注册的 24×24 CSS px AA Contract；Coarse Pointer Preferred Target 为注册的 44×44 CSS px Policy。目标大小来自 Interaction Token，不由 Component 写数字。紧凑视觉可以使用透明命中区域，但不能与相邻目标重叠或改变 Reading Order。

## 25.4 Accessibility Enforcement and Release Acceptance

Static Gate 负责 Semantic Rule、Typed Accessible-name Prop、ID Reference、Forbidden Outline Removal、Token Consumption、Required Keyboard/Focus Metadata、Live Region Registry 和 Component Contract Closure；静态工具不得宣称已证明真实键盘、Screen Reader、Focus Return、Touch Target、合成 Contrast 或 Reading Order。

每个包含新/改变交互、Route、Layout、Material 或 Motion 的 Production Release 必须由 Owner 在仓库外按命名 Runtime Acceptance Matrix 检查 Keyboard、Focus、Name、Reading Order、Contrast、Forced Colors、Reduced Motion/Transparency、Touch Target 和 Zoom/Reflow。该 Release Gate 不由 Codex 执行、不改变 Codex `pnpm verify` Completion，也不提交 Screenshot、Recording、Trace 或 Evidence File。

---

# 26. CSS 层级

统一 Cascade Layers：

```css
@layer reset;
@layer tokens;
@layer base;
@layer utilities;
@layer components;
@layer app;
@layer overrides;
```

职责：

| Layer      | 内容                  |
| ---------- | ------------------- |
| reset      | Wind4 Reset         |
| tokens     | 生成 CSS Variables    |
| base       | HTML 基础行为           |
| utilities  | UnoCSS              |
| components | `@platform/ui` 结构样式 |
| app        | 应用专属样式              |
| overrides  | 明确注册的例外             |

禁止页面使用 `!important`。第三方组件覆盖必须留在 Adapter。

`tokens` Layer 只由 Generator 输出。Cutover 前保持当前 Embedded-palette Conditional Output；Atomic Cutover 后才按 §13.7 的 Theme Bank → Effective Mode Bank → Contrast Public Binding → independent Density → independent Material 顺序排列。Material Selector 只写 `--ui-material-*`；应用和 Component Layer 不得复制 Theme Bank、Density 或 Material Condition Matrix。

---

# 27. 代码结构规范

## 27.1 命名

```text
Vue components: PascalCase.vue
TypeScript files: kebab-case.ts
Composables: use-*.ts
Schemas: *.schema.ts
Stores: *.store.ts
```

## 27.2 导出

* 使用 Named Export。
* 每个 Package 只有一个公共根出口。
* Feature 只有一个公共 `index.ts`。
* 禁止跨 Boundary 深层导入。
* Barrel 仅用于 Boundary，不在任意子目录堆叠。

## 27.3 工具函数

禁止创建无限增长的：

```text
utils.ts
helpers.ts
common.ts
```

函数根据职责命名：

```text
resolve-layout.ts
normalize-api-error.ts
parse-theme-preference.ts
```

---

# 28. AI 编程治理

## 28.1 单一入口、单一权威

```text
AI_ENTRY=AGENTS.md
AI_ENTRY_ROLE=MISSION_AND_EXECUTION_ROUTER
AI_ENTRY_ARCHITECTURE_AUTHORITY=NONE
AI_ENTRY_CANONICAL_SOURCE=ARCHITECTURE.md
AI_ENTRY_CURRENT_WORK_PACKAGE_SOURCE=canonical current-work-package status in ARCHITECTURE.md
ARCHITECTURE_AUTHORITY=ARCHITECTURE.md
```

`AGENTS.md` 是唯一 AI 入口和简洁的 Mission and Execution Router。它只负责：

* 指向并要求完整读取 `ARCHITECTURE.md`。
* 使 PAVP Project Mission、Owner Delivery Direction 和高层 Coding Invariant 在任务入口可见。
* 动态路由到本文件当前 Canonical Work Package，而不硬编码 Package Name 或复制 Serial Chain。
* 保持 One-task、Production-only、Validation、Git Authorization 和 Mandatory Stop 边界。
* 将 UI 范围显式路由到现有 `.ai/skills/pavp-ui/SKILL.md`。
* 要求每次任务输出明确区分 Implementation、Static Validation、Runtime Acceptance、Staging、Commit、Push 和 Release。

`AGENTS.md` 没有行数配额，但必须保持可在任务开始时快速扫描。它不复制完整技术栈、依赖表、Registry、Schema、Serial Package List、Material/Motion/Layout Contract、Component Contract、目录树或验收正文，也不承担第二份架构权威。

`ARCHITECTURE.md` 是唯一持久、完整、Canonical 的架构正文。任何其他文件与本文件冲突时必须停止执行并报告冲突，不得创建替代规范。

禁止创建承担第二份 UI、Material、Motion、Page 或 Architecture 权威的文件，包括：

```text
UI_GUIDELINES.md
DESIGN.md
PAGE_SPEC.md
LIQUID_GLASS.md
MOTION_GUIDELINES.md
```

## 28.2 Subordinate Project UI Workflow

`.ai/skills/pavp-ui/` 是现有从属执行工作流，不是架构权威。它必须先读取 `AGENTS.md`、完整读取本文件、读取 `project.config.ts`、验证仓库和当前 Phase，然后才能：

* 分类 Task Mode。
* 生成不落盘的临时 Execution Contract。
* 组织实现、审查和静态验证。
* 只读审查 Owner 明确提供的外部手工观察。
* 在当前任务报告中输出证据、状态、延期项和最终 Worktree 状态。

它不得定义或保存新的视觉语言、固定 Token Value、Material Role、Motion Contract、Page Contract、Component API、Architecture Manifest、AI Workflow Registry 或客户端路由规则。Production Theme Registry 是受本文件定义的 Typed Product Data，不属于该禁止项。Workflow 不得覆盖本文件。`SKILL.md` 只包含流程、Phase Check、Stop Condition、状态转换和报告路由，并具有 `name` 与 `description` Frontmatter；没有任意行数目标。

`specialist-lens-policy.md` 只能路由可选的官方 Primary-source Research。人员、Machine-local Skill、客户端插件或外部 Registry 永不成为 Phase、Dependency、Motion 或 GSAP Gate。

```text
PROJECT_UI_WORKFLOW_ARCHITECTURE_AUTHORITY=NONE
PROJECT_UI_WORKFLOW_ROLE=SUBORDINATE_EXECUTION_WORKFLOW
PROJECT_UI_WORKFLOW_CANONICAL_SOURCE=ARCHITECTURE.md
PROJECT_UI_WORKFLOW_CONFLICT_ACTION=STOP
```

Architecture Contract 与 `AGENTS.md` 的同步只能由 Owner 明确授权的 Repository-governance Task 修改；UI Workflow 自身不得改写这些 Authority。

`PAVP_SUBORDINATE_BROWSER_RULE_SYNC`、`PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT`、`PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE`、`PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER`、`PAVP_FINAL_STATIC_GOVERNANCE`、`PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` 与 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 已完成。Codex Browser Request、状态字段、Repository Policy Regression Gate、Manifest Canonical Compression Contract、三份 Complete Built-in Theme Document、Active Appearance Cutover、Phase 1 Static Closure、Runtime Kernel Static Ownership 与 Router Static Ownership 已同步。当前唯一 Next Canonical Work Package 是 §37.2 的 `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION`。已落地边界不得被后续 Package 回退。

## 28.3 Repository Portability and Explicit Discovery

```text
PROJECT_AUTHORITY_PORTABILITY=REPOSITORY_ONLY
PROJECT_UI_WORKFLOW_DISCOVERY=EXPLICIT_REPOSITORY_ROUTING
NATIVE_CLIENT_DISCOVERY=OPTIONAL_NOT_REQUIRED
```

`.ai/skills` 是通过 `AGENTS.md` 显式指向的仓库相对文件路径。PAVP 只承诺任意能够读取仓库文件的 Agent 可以按该路径执行，不承诺 Codex、Claude、Kimi 或其他客户端会原生、自动或零提示发现 `.ai/skills`。Native Discovery 只能是客户端可选增强，不能成为正确执行的前提。

当前允许的 `.ai` Regular File 精确为：

```text
.ai/skills/pavp-ui/SKILL.md
.ai/skills/pavp-ui/references/task-routing.md
.ai/skills/pavp-ui/references/execution-contract.md
.ai/skills/pavp-ui/references/specialist-lens-policy.md
.ai/skills/pavp-ui/references/acceptance-report.md
```

目录祖先隐式允许；其他 `.ai/**` 全部禁止。首版不允许该 Workflow 包含：

```text
scripts
assets
README.md
DESIGN.md
registry
client adapters
browser evidence
```

五个 Regular File、`AGENTS.md` 最短 UI Route、Repository Policy Exact Allowlist 和 Policy Checker 构成一个不可拆分的现有治理边界。`PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 已完成对 Browser/Runtime-acceptance 文字和 Regression Enforcement 的同步；后续 Package 不得增加第六个 Workflow File、放宽 Allowlist，或移除对 Tracked Symlink、Absolute Home Path Dependency、Machine-local Registry 和客户端专属 Project Authority 的拒绝。

不得创建第二套治理系统。以下内容保持禁止：

```text
.ai/protocol/**
.ai/rules/**
.ai/manifests/**
.ai/router/**
.agents/**
.codex/**
.claude/**
.kimi/**
.kimi-code/**
client-specific workflow copies
machine-local project authority
machine-local required configuration
global Skill prerequisites
external or user-home symlinks
absolute user-home path dependencies
network-fetched normative Markdown
```

Owner 自己操作的浏览器或其他 Operator Capability 是非权威、可选、外部的手工观察能力，不是仓库依赖或项目规范来源。Codex 即使具有该能力也不得调用。

## 28.3A PAVP Mission and Execution Contract

### Project Mission

PAVP 是一套可复用、面向 Production、AI-friendly 的 Vue Frontend Architecture，目标是让未来 Frontend Development 快速、一致、高度可定制、可维护，并使 AI Coding Agent 能够安全理解和修改。

Primary Development Goal 是先完成 Reusable Frontend Foundations，再投入 Business Page 或 Broad UI-framework Integration。Mission Foundation Summary 包含以下能力，但本清单不是第二份 Roadmap：

```text
Design Tokens
semantic color roles
complete built-in and custom themes
Light / Dark / System
contrast
material
spacing
size
density
typography
radius
shadow
layering
responsive adaptation
narrow / regular / wide capabilities
PC / H5 adaptation
Safe Area
Dynamic Viewport
Container Query
UnoCSS semantic integration
Runtime Kernel
Pinia ownership
Router and navigation lifecycle
Layout and Scroll ownership
Storage and persistence
API transport
Zod validation
server-state management
Auth
Session
Permission
Motion
runtime error handling
Observability
Deployment
```

Exact Admission Order、Scope、Dependency、Schema、File、Status、Gate 和 Implementation Contract 只由本文件其他 Canonical Section 定义。

### Owner Delivery Direction

```text
FIRST
complete reusable platform foundations

THEN
admit third-party UI primitives only through PAVP-owned boundaries and only when architecture allows

THEN
build Shared UI from real consumer demand

FINALLY
build one simple real frontend surface that uses the completed architecture and demonstrates platform capabilities
```

最终 Surface 用于证明和消费 Architecture，不创建第二个 Business Platform，也不建立独立 Demo 或 Showcase Infrastructure。它必须是 Architecture-admitted Real Application Surface。Third-party UI Library 不得成为 Color、Theme、Size、Density、Spacing、Typography、Radius、Motion、Layout 或 Responsive Behavior Authority。PAVP Design Tokens 和 Architecture-owned Contract 始终权威；UnoCSS 只是 Expression Engine；Third-party UI/Interaction Primitive 只是 PAVP-owned Public Boundary 后的 Private Implementation Detail。除非已由 Canonical Admission 明确选择，不冻结 UI Vendor。

### Task Discipline

```text
ONE_COMPLETE_BOUNDED_TASK_AT_A_TIME
AUTOMATIC_ROADMAP_CONTINUATION=PROHIBITED
UNREQUESTED_SCOPE_EXPANSION=PROHIBITED
UNREQUESTED_REFACTOR=PROHIBITED
UNREQUESTED_DEPENDENCY_CHANGE=PROHIBITED
UNRELATED_CLEANUP=PROHIBITED
SPECULATIVE_FEATURE=PROHIBITED
SPECULATIVE_ABSTRACTION=PROHIBITED
FUTURE_PROVIDER_STUB=PROHIBITED
PLACEHOLDER_MODULE=PROHIBITED
DUPLICATE_AUTHORITY=PROHIBITED
```

Codex 完成当前 Task 后不得自动开始 Next Package。Narrow Task 不得被扩大为 Generic Framework Work、General AST Infrastructure、Generic CFG Analysis、Testing Infrastructure、Security Maintenance、Dependency Modernization、Repository-wide Cleanup 或 Architecture Redesign，除非 Owner 明确授权该 Exact Task 且 Architecture 允许。

Static Checker 只冻结其 Owning Work Package 所需的最小 Stable Cross-file 或 Public Contract。除非 Architecture 明确声明为 Normative，Checker 不得冻结 Private Local Variable、Private Helper、Private Loop Structure、Private Parser Decomposition、Private Map/Array、Closure 或 Private Algorithm。Narrow Repository-specific Invariant 足够时，禁止构建 Generic Static-analysis Machinery。

### Contract-gap Stop Rule

当当前 Task 需要但 Canonical Architecture 未定义 Material Contract 时，Codex 必须在 Mutation 前停止。Material Contract 包括：

```text
public API
cross-file identifier
schema
persisted format
dependency
path authority
default
registry
lifecycle owner
provider
work-package boundary
capability status
build identity
deployment identity
```

Codex 不得发明“合理”答案。Required Result：

```text
STATUS=BLOCKED
STOP_REASON=CANONICAL_CONTRACT_MISSING
```

Report 必须指出 Missing Contract、Gap Location、为什么继续会要求 Invention，以及最小 Owner/Architecture Decision。Minor Private Implementation Detail 只有在不创建或改变 Public/Cross-file Contract 时才可派生。

### Evidence Before Decisions

Codex 必须区分：

```text
confirmed repository fact
confirmed official external fact
explicit Owner decision
derived private implementation detail
unresolved canonical gap
```

只有前四项可以驱动 Implementation。Repository State 必须检查 Actual Repository。可变化 Dependency、API 或 Tool Fact 在需要 External Verification 时必须使用 Official Primary Source。Old Chat、Old Task Report、Planning Document、Memory、Earlier Commit 和 Assistant Assumption 都不是 Current Repository State Proof。已由当前 Evidence 解决的 Owner Decision 不得重复询问。

### Entry-visible Coding Invariants

Detailed Contract 继续由本文件各 Domain Section 定义；`AGENTS.md` 必须立即暴露以下 High-level Rule：

* 使用 Strict TypeScript，并保留 Validated Input Boundary。
* One Capability 有 One Owner；One Mutable Concept 有 One Canonical Mutable Authority。
* 不复制 Schema、Default、Registry、State 或 Configuration。
* 使用 Stable Semantic Naming；禁止 Agent-created Numeric-version-style Name。
* 使用 Explicit Import 和 Package Public Root；Cross-package Deep Import 禁止。
* 禁止增长型 `utils.ts`、`helpers.ts`、`common.ts` 或等价 Dumping File。
* Module 必须 Domain-owned、Responsibility-named。
* 禁止 Speculative Abstraction、Placeholder Provider 和 Future Module。
* 保留 Unrelated Behavior 与 User Change。
* PAVP Design Tokens 是 Sole Visual Authority。
* UnoCSS 是 Expression Layer，不是 Design Authority。
* UI Vendor 必须保持 PAVP Boundary 后的 Private Detail。

### Prohibited Work and Validation Boundary

Production-only Policy 禁止 Test File、Test Infrastructure、Unit/Integration/E2E Test、Fixture、Mock、Snapshot、Coverage、Storybook、Browser Automation、Browser Testing、Screenshot、Trace、Runtime Evidence File、Repository Evidence Artifact、Standalone Demo 和 Standalone Showcase。Codex 不得执行 Browser Operation，也不得引入 Testing Framework。

Generic Skill 或 Workflow 推荐的 TDD、Browser Verification、Worktree、Planning Document、Evidence Artifact 或 Generalized Infrastructure 不覆盖 PAVP Authority。Dependabot Alert、CodeQL Finding、Dependency Upgrade、Security Cleanup、Toolchain Modernization 或 Unrelated Warning 只有在 Owner 明确请求该 Exact Task，或其直接阻塞 Current Authorized Work Package 时才允许处理；即使阻塞，也必须先报告，不得自动扩 Scope。

Implementation 中只在有用时运行 Existing Narrow Relevant Check。Repository-changing Implementation Task 报告 Static Completion 前运行一次最终 Stable State 的完整 Canonical Gate：

```text
pnpm verify
```

不得在每个小 Edit 后重复运行 Full Gate，不得为了 Ceremony 运行 Unrelated Check，不得创建 Test/Browser Infrastructure，也不得削弱 Validation 制造 Pass。没有 Repository Mutation 的 Read-only Analysis/Planning 不需要 Unrelated Build 或 Verification。

### Git Authorization Boundary

```text
planning authorization does not authorize implementation
implementation authorization does not authorize staging
staging authorization does not authorize commit
commit authorization does not authorize push
push authorization does not authorize release
```

Implementation-only Task 的 Default 是保留 Unstaged Diff、报告 Exact Repository State 并等待 Owner Review 或 Authorization。不得自动 Stage、Commit、Push、Amend、Rebase、Reset、Clean、Stash、Create Branch、Create Worktree、Create PR、Tag、Release 或覆盖 User Change。Main-only Maintenance 不授权自动 Commit 或 Push。

### Mandatory Stop and Final-report Contract

以下任一条件要求 Mutation 前停止：Architecture 未准入 Requested Work；Material Canonical Contract 缺失；Dependency 未准入；Repository Source 与 Canonical Status 冲突；Multiple Authority 冲突；存在 Unexplained/Overlapping Dirty File；Ownership 不清楚；需要 Prohibited Capability；Completion 需要 Unapproved Scope Expansion；Git Branch/Upstream/Synchronization 不安全；继续要求 Material Contract Invention；Generic Skill 与 PAVP Authority 冲突。不得通过放宽 Architecture 或 Checker Rule“解决”冲突。

Every Codex Task 必须明确区分 Implemented、Statically Validated、Runtime Accepted、Staged、Committed、Pushed 和 Released。Report 至少包含：

```text
STATUS
STOP_REASON
REPOSITORY_BASELINE
ACTIVE_WORK_PACKAGE
TASK_SCOPE
COMPLETED_CONTENT
INCOMPLETE_CONTENT
CHANGED_FILES
VALIDATION
GIT_DIFF
FINAL_WORKTREE_STATE
NEXT_POSSIBLE_STAGE
```

Task-required Acceptance Boundary 未完成时不得报告 `COMPLETED`。`NEXT_POSSIBLE_STAGE` 只提供信息，不构成 Execution Authorization。

## 28.4 Workflow State Contract

Task Mode：

```text
architecture-review
plan
implement
review
```

Status：

```text
COMPLETED
READ_ONLY_COMPLETE
BLOCKED
FAILED
```

Stop Reason：

```text
ARCHITECTURE_CONFLICT
PHASE_DISALLOWED
CANONICAL_CONTRACT_MISSING
WORKTREE_SCOPE_CONFLICT
UNINTRODUCED_DEPENDENCY
PUBLIC_BOUNDARY_CONFLICT
AUTHORIZATION_REQUIRED
REQUIRED_CAPABILITY_UNAVAILABLE
```

`STOP_REASON` 在 `BLOCKED` 时必填；其他 Status 报告 `NOT_APPLICABLE`。

只有与任务范围重叠的 Dirty Change 构成 `WORKTREE_SCOPE_CONFLICT`；无关用户变更必须保留。Architecture-review、Plan 和纯 Read-only Review 可以以 `READ_ONLY_COMPLETE` 结束。Owner 提供的 Runtime Observation 只能路由为 `review`。Codex Browser Operation Request 构成 `ARCHITECTURE_CONFLICT`，而不是 `REQUIRED_CAPABILITY_UNAVAILABLE`；Browser 从来不是 Codex Required Capability。

Canonical Verification Field：

```text
STATIC_VERIFICATION =
  PASS | FAIL | NOT_RUN | NOT_APPLICABLE
```

Implementation 只有在适用 Static Verification 为 `PASS` 时才能报告 `COMPLETED`。Owner 手工观察永不产生 `PENDING_OWNER_ACCEPTANCE`，也不阻塞 Codex Completion。

状态映射：

```text
READ_ONLY_COMPLETE
→ STATIC_VERIFICATION is PASS, NOT_RUN, or NOT_APPLICABLE with RESULT_REASON

BLOCKED
→ STOP_REASON is required
→ unexecuted required static verification is NOT_RUN with RESULT_REASON

FAILED
→ STATIC_VERIFICATION=FAIL with evidence
```

`NOT_APPLICABLE` 表示任务不具有适用静态门槛；`NOT_RUN` 表示允许或需要的静态门槛没有执行。两者都必须提供 `RESULT_REASON`。

`PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 已完成；旧 `RUNTIME_ACCEPTANCE_TIER`、`OWNER_RUNTIME_ACCEPTANCE`、Tier 0–3 和 `PENDING_OWNER_ACCEPTANCE` 字段不再允许输出，也不构成 Compatibility Contract。

当前任务报告至少包含：

```text
STATUS
STOP_REASON
REPOSITORY_BASELINE
ACTIVE_PHASE
CANONICAL_EVIDENCE
TASK_MODE
SCOPE
CHANGED_FILES
ARCHITECTURE / LAYOUT / COMPONENT / MATERIAL / MOTION findings
ACCESSIBILITY / PERFORMANCE findings
STATIC_VERIFICATION
RESULT_REASON
DEFERRED_ITEMS
GIT_DIFF
FINAL_WORKTREE_STATE
```

报告只存在于当前任务输出，不作为 Repository Evidence 文件。

## 28.5 ADR

```text
docs/decisions/
├── ADR-0001-vue-vite.md
├── ADR-0002-unocss.md
├── ADR-0003-reka-ui.md
├── ADR-0004-design-tokens.md
└── ADR-0005-server-state.md
```

ADR 只解释历史原因，不承担规范权威。

## 28.6 机器强制规则

| 规则                | 工具                         |
| ----------------- | -------------------------- |
| Props、Emits、Slots | TypeScript                 |
| 配置和用户偏好           | Zod                        |
| Package 边界        | ESLint Boundaries          |
| 禁止深层导入            | ESLint                     |
| 禁止页面导入 Reka       | ESLint                     |
| 禁止原始颜色            | Stylelint / 本地 ESLint Rule |
| 禁止动态 UnoCSS       | 本地 ESLint Rule             |
| Token 漂移          | Generator Check            |
| 路由类型              | Vue Router Generator       |
| 未使用代码             | Knip                       |
| A11y              | ESLint + typed/static contracts |
| 构建体积              | Bundle Budget              |

## 28.7 显式导入

不使用自动导入。

原因：

* AI 能直接看到依赖。
* 代码搜索准确。
* 文件复制不依赖隐式环境。
* Import Boundary 更容易检查。
* IDE 和 CI 行为一致。

---

# 29. 本地架构规则

在 `scripts/eslint-rules/` 中实现少量本地规则：

```text
no-raw-ui-colors
no-dynamic-unocss-classes
no-vendor-ui-outside-adapters
no-direct-storage-access
no-user-agent-layout-branching
no-workspace-deep-import
no-app-material-token-access
no-page-optical-effects
no-public-optical-component-props
```

不创建独立 ESLint Package。

该列表是现有本地规则位置的阶段化目标，不表示所有名称已经实现。每条规则只能在其负责的 Work Package 中加入现有 ESLint、Stylelint、Architecture Check 或 Generator Check，并在进入 `pnpm verify` 后才可宣称机器强制。不得为这些规则创建第二套 Governance Runtime。

Generator 和 Verify Script 还必须在对应 Owning Work Package 被准入后检查：

```text
Phase-specific packages/ui dependency set
root-only @platform/ui imports
private adapter vendor imports
Token tier / visibility / namespace / output filtering
Public Role set equality across CSS / TS / Names / UnoCSS / Manifest
Public UnoCSS mapping metadata and fatal unmapped-role handling
Private Theme Bank completeness and isolation
Built-in/Custom Theme identity tuple and Custom Bank role-set/allowlist
Theme / Mode / Contrast binding without Cartesian selectors
future admitted 11 × 3 Density Matrix and independent Density selectors
density.scale stored-only and absent from runtime/generated projection
Material adaptive / reduced / solid fallback completeness
first-paint generated-output drift
Target Explicit Theme duplicate-aware parse and exact-set validation after Atomic Cutover
Role/Alpha/Named Contrast Registry exact version and endpoint closure after version activation
Reference-only Preference, exact parsed-input classification and legacy migration determinism after Atomic Cutover
direct ExplicitThemePreference persistence, no additional envelope and no legacy writer after Atomic Cutover
Custom Theme Registry Snapshot exact shape, code-point order, whole-Snapshot rejection and deletion safety
Package 5 Design System public-root, private-boundary and structured-result exact equality
active Built-in Theme and First Paint Manifest exact shape after Atomic Cutover
application-owned preference and Custom Registry storage-key consistency
```

Package 5 Owning Static Enforcement 必须验证 §13.6 的 Three-branch `PreferenceMigrationResult` Exact Equality、Malformed JSON 由 Application-owned Reader 私有拒绝且不进入 Migration、Schema-invalid Parsed Input 精确返回 `PREFERENCE_INPUT_INVALID`，以及 `MIGRATION_REQUIRES_THEME_COMPLETION` 只用于 Valid Legacy Theme-completion Case。任意把 Arbitrary Invalid Parsed Input 映射为 `MIGRATION_REQUIRES_THEME_COMPLETION`、静默返回 Product Default 或自动修改 Storage 的实现都必须失败。

Optical CSS 检查必须覆盖 `apps/**/*.css` 与 Vue `<style>`，UI-internal CSS Variable 使用必须对照 Manifest。Direct Storage Rule 只允许应用所有的 `preference-storage.ts` 与按 Gate 创建的 `custom-theme-registry-storage.ts` 执行各自边界内的读写；Package 5 的 Custom Registry Boundary 只能在 Vue Bootstrap 后使用其 Application-owned Key。另一个窄例外是 Generated `appearance-init.js` 可以使用应用通过 `data-preference-storage-key` 提供的 Key 执行同步只读 First-paint Preference 访问。它不得接收 `data-theme-registry-storage-key`、读取 Custom Registry 或写入 Storage；Design System 其他源文件和其他应用文件不得直接访问。

## 29.1 Frozen Static Enforcement Target Registry

每个 Frozen Rule 必须有一条可定位、可失败、可接入 `pnpm verify` 的记录：

```ts
interface StaticEnforcementTarget {
  id: string
  capabilityStatus: CapabilityStatus
  ownerGate: string
  scanBoundary: readonly string[]
  approvedAuthorities: readonly (
    | ApprovedValueAuthorityKind
    | 'generated-output'
    | 'capability-status-registry'
    | 'package-boundary-registry'
  )[]
  failureCode: string
}
```

现有规则只对其当前实现范围标记 `ACTIVE`；完整 Foundation Enforcement 在对应 Work Package 落地前保持 `TARGET_INACTIVE`：

| Enforcement ID | Status | Owner gate | Scan boundary | Approved authorities | Failure code |
| --- | --- | --- | --- | --- | --- |
| `no-raw-ui-colors` | `ACTIVE` | `CURRENT_STATIC_PRODUCTION_GATE` | App/UI TypeScript and Vue literals | `design-token-source`; `generated-output` | `RAW_UI_COLOR` |
| `no-dynamic-unocss-classes` | `ACTIVE` | `CURRENT_STATIC_PRODUCTION_GATE` | App/UI Vue class bindings and TypeScript class construction | `generated-output` | `DYNAMIC_UNOCSS_CLASS` |
| `no-direct-storage-access` | `ACTIVE` | `CURRENT_APPEARANCE_PERSISTENCE_GATE` | App/UI TypeScript and Vue browser-storage globals | `storage-registry` | `DIRECT_STORAGE_ACCESS` |
| `no-unapproved-raw-colors-complete` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS; UnoCSS maps; Theme Bank consumers | `design-token-source`; `generated-output` | `UNAPPROVED_RAW_COLOR` |
| `no-unapproved-dimensions` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno width, height, inset, translate, grid/flex basis | `design-token-source`; `named-protocol-constant` | `UNAPPROVED_DIMENSION` |
| `no-unapproved-spacing` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno margin, padding and gap | `design-token-source` | `UNAPPROVED_SPACING` |
| `no-unapproved-radius` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno radius and shape | `design-token-source` | `UNAPPROVED_RADIUS` |
| `no-unapproved-shadow` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno box/text/drop shadow | `design-token-source` | `UNAPPROVED_SHADOW` |
| `no-unapproved-z-index` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno layer values | `design-token-source`; `domain-schema` | `UNAPPROVED_Z_INDEX` |
| `no-unapproved-typography-value` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS/Uno font, line and letter metrics | `design-token-source` | `UNAPPROVED_TYPOGRAPHY` |
| `no-unapproved-density-or-font-scale` | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` | Preference schema/default/store; DOM attributes; App/UI consumers | `typed-default-registry`; `design-token-source`; `generated-output` | `UNAPPROVED_DENSITY_FONT_SCALE` |
| `no-consumer-authored-appearance-default` | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` | Page/Feature/Shared/Public UI TS/Vue/CSS and appearance DOM attributes | `typed-default-registry`; `generated-output` | `CONSUMER_APPEARANCE_DEFAULT` |
| `no-unapproved-motion-duration` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS animation, transition, delay and animation timeout | `design-token-source`; `domain-schema` | `UNAPPROVED_MOTION_DURATION` |
| `no-unapproved-motion-easing` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | App/UI TS/Vue/CSS timing, spring and curve values | `design-token-source`; `domain-schema` | `UNAPPROVED_MOTION_EASING` |
| `no-transition-all` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | All authored CSS, Vue Transition and future motion adapters | `design-token-source` | `TRANSITION_ALL` |
| `no-unregistered-breakpoint` | `ACTIVE` | `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` | Media/container queries and JS layout thresholds | `domain-schema`; `design-token-source` | `UNREGISTERED_BREAKPOINT` |
| `no-unregistered-scroll-dimension` | `ACTIVE` | `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` | Scroll offset, compensation, threshold and restoration tolerance | `route-registry`; `design-token-source`; `named-protocol-constant` | `UNREGISTERED_SCROLL_DIMENSION` |
| `no-unregistered-touch-target` | `TARGET_INACTIVE` | `PAVP_FIRST_PROTECTED_VERTICAL_SLICE` | Public UI hit-area and pointer target metrics | `design-token-source`; `named-protocol-constant` | `UNREGISTERED_TOUCH_TARGET` |
| `no-raw-storage-key` | `TARGET_INACTIVE` | `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION` | Source, HTML attributes, First Paint, migrations and storage adapters | `storage-registry`; `generated-output` | `RAW_STORAGE_KEY` |
| `storage-owner-registry-closure` | `TARGET_INACTIVE` | `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION` | Local Storage, IndexedDB, memory adapter and cross-tab calls | `storage-registry` | `UNREGISTERED_STORAGE_OWNER` |
| `no-sensitive-persistence` | `TARGET_INACTIVE` | `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION` | Persisted schemas, serializers, writers, migrations and snapshots | `storage-registry`; `domain-schema` | `SENSITIVE_PERSISTENCE` |
| `no-direct-fetch-access` | `TARGET_INACTIVE` | `PAVP_API_TRANSPORT_IMPLEMENTATION` | App/UI `fetch`, XHR, Beacon and vendor HTTP imports | `runtime-configuration-schema`; `domain-schema` | `DIRECT_FETCH_ACCESS` |
| `no-unregistered-api-policy-literal` | `TARGET_INACTIVE` | `PAVP_API_TRANSPORT_IMPLEMENTATION` | Base URL, timeout, retry, backoff, cache, header and concurrency policy | `runtime-configuration-schema`; `domain-schema`; `named-protocol-constant` | `UNREGISTERED_API_POLICY` |
| `route-registry-name-and-meta-closure` | `ACTIVE` | `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` | File routes, route records, redirects, error routes and navigation consumers | `route-registry`; `generated-output` | `ROUTE_REGISTRY_DRIFT` |
| `no-undeclared-route-meta` | `ACTIVE` | `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` | Every static/dynamic route meta object | `route-registry` | `UNDECLARED_ROUTE_META` |
| `runtime-configuration-exact-contract` | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` | Root/app package identity, project config, Vite, production HTML carrier, config loader/schema, emitted artifact and First Paint paths | `runtime-configuration-schema`; `generated-output`; `named-protocol-constant` | `RUNTIME_CONFIGURATION_CONTRACT_DRIFT` |
| `registered-errors-only` | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` | Exact four-record Core Error Registry, normalizer, capture sources and message-key consumers | `error-registry` | `UNREGISTERED_ERROR` |
| `runtime-kernel-bootstrap-registry` | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` | Kernel step registry, dependency edges, create/ready/dispose handles, provider set and Mount sites | `named-protocol-constant`; `package-boundary-registry` | `RUNTIME_KERNEL_BOOTSTRAP_DRIFT` |
| `runtime-kernel-lifecycle-disposal-hmr` | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` | Startup state, retry budget, global/Appearance listeners, reverse disposal and HMR ownership | `named-protocol-constant`; `error-registry`; `capability-status-registry` | `RUNTIME_KERNEL_LIFECYCLE_DRIFT` |
| `registered-permissions-only` | `TARGET_INACTIVE` | `PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION` | Route, component visibility, operation and claim projection | `permission-registry` | `UNREGISTERED_PERMISSION` |
| `no-inactive-capability-import` | `ACTIVE` | `PAVP_FINAL_STATIC_GOVERNANCE` | Package manifests and complete workspace import graph | `capability-status-registry`; `package-boundary-registry` | `INACTIVE_CAPABILITY_IMPORT` |
| `no-query-data-copied-into-pinia` | `TARGET_INACTIVE` | `PAVP_API_TRANSPORT_IMPLEMENTATION` | Pinia state/actions, Query callbacks and server-entity consumers | `domain-schema` | `QUERY_DATA_COPIED_TO_PINIA` |
| `no-theme-literal-runtime-state` | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` | Appearance stores, pages, features, shared modules, public UI and DOM writers | `typed-default-registry`; `design-token-source`; `generated-output` | `THEME_LITERAL_RUNTIME_STATE` |
| `single-product-default-authority` | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` | Schema defaults, stores, reset, First Paint, Runtime Config, Page/Feature/Shared/Public UI, appearance attributes and documentation code | `typed-default-registry`; `generated-output` | `DUPLICATE_PRODUCT_DEFAULT` |
| `single-safety-baseline-authority` | `ACTIVE` | `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` | HTML, Critical CSS, Manifest, initializer and persistence consumers | `typed-default-registry`; `generated-output` | `DUPLICATE_SAFETY_BASELINE` |
| `no-unregistered-environment-default` | `ACTIVE` | `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` | Config loader/schema and every App/Feature/UI environment consumer | `runtime-configuration-schema` | `UNREGISTERED_ENVIRONMENT_DEFAULT` |

Runtime Kernel Implementation 已扩展以下 Existing Static Owners，没有创建新的 Static-governance Framework：

```text
scripts/architecture/check-boundaries.ts
  → registry parity, source parity, dependency-graph parity, Mount ownership parity, listener ownership and lifetime parity, Core Error parity, lifecycle parity, retry parity, disposal parity and HMR parity

scripts/verify/check-project-config.ts
  → project and build declarations, direct dependency parity, Catalog parity, Lockfile parity, Build Version authority, Release SHA authority and Deployment Base authority

scripts/verify/check-bundle.ts
  → emitted runtime-configuration.json, production HTML carrier, base/First Paint/build identity parity

scripts/architecture/check-appearance-cutover.ts
  → unchanged Package 5 Appearance, persistence, handoff and media behavior
```

Router Implementation 只扩展这些 Existing Static Owners，并保持 `check:arch` 为唯一 Architecture Governance Entry：

```text
scripts/architecture/check-boundaries.ts and scripts/architecture/check-router.ts
  → official Router import boundary; exact eight source/name/path records; route/meta/schema/error/title/message/telemetry/layout/scroll/focus closure; exact five guards; empty redirect/dynamic sets; no future capability activation

scripts/architecture/check-runtime-kernel.ts
  → exact ten-step Bootstrap Registry; one Router and one History lifecycle authority; router.isReady-before-Mount; Router/History reverse disposal; sole Mount/disposal/top-level HMR ownership; unchanged Pinia-and-Appearance provider set

scripts/verify/check-project-config.ts
  → exact vue-router@5.2.0 Catalog/manifest/lock/patch identity; exact three declaration changes; strict TypeScript compatibility probe; official plugin order/configuration; Generated DTS AST shape and official regeneration byte equality

scripts/verify/check-bundle.ts
  → exact production artifact identity and canonical measurement profile; eight lazy-route chunks; hard initial and lazy-route budgets
```

Runtime Kernel Checker Logic 的 Physical Split 是 Non-protocol Implementation Detail；Root `check:arch` 保持 Sole Architecture Governance Entry。

`TARGET_INACTIVE` Rule 只有在同一个 Owning Package 中交付现有 Toolchain 内的实现、接入 `pnpm verify`、通过可逆 Negative Probe、证明 Allowed Authority 是 Exact Registry 而不是宽泛 Path Escape，并保持无 Test/Evidence Artifact 后，才能改为 `ACTIVE`。Regex 只能作为确定性 Lexer 的一部分；对 TypeScript/Vue/CSS/JSON/Generated Record 的结构性合同必须使用相应 Parser、AST 或 Exact-set Comparison，不能用注释、命名约定或 Allowlist Wildcard 代替。

所有 Rule 的默认 Failure Policy 是 Closed：未知 Authority、未知 Status、无法解析的动态值、未注册 Consumer 或 Checker 自身配置错误都必须失败。局部 Algorithmic Invariant 例外必须携带 Narrow Named Constant、单一 Consumer 和 Source-local Explanation；Static Gate 必须拒绝把该例外导出、复制或升级为 Product/Visual/Protocol Default。

---

# 30. 项目生成器

```text
CAPABILITY=PROJECT_GENERATORS
CAPABILITY_STATUS=TARGET_INACTIVE
CURRENT_GENERATOR_SCRIPTS=NONE
ACTIVATION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
ACTIVATION_GATE_CREATION=UNIQUE_PAVP_GENERATOR_INSTANCE_ID_REQUIRED_BY_ARCHITECTURE_AMENDMENT
EARLIEST_ENTRY=PAVP_FIRST_PROTECTED_VERTICAL_SLICE=COMPLETE_AND_REPEATED_SCAFFOLDING_NEED_PROVEN
```

以下命令是 Target Command Name，不是当前可用命令：

```text
pnpm generate:feature
pnpm generate:component
pnpm generate:page
```

生成器只负责固定目录和基础文件：

```text
feature/
├── api/
├── model/
├── ui/
├── lib/
├── types.ts
└── index.ts
```

生成器不得生成大段业务代码。

生成器只有出现重复、稳定且可验证的真实脚手架需求后才能准入。准入包必须在同一变更中交付 Script、Input Schema、Exact Output Allowlist、Collision/Existing-file Refusal、Deterministic Formatting、Root `package.json` Command、Knip/Architecture Integration 和 Static Negative Probe。不得覆盖文件、创建空目录、生成业务逻辑、引入第二架构模板或在 Script 实现前把命令列入 §31 Active Command。

---

# 31. 统一命令

```text
pnpm dev
pnpm build
pnpm preview

pnpm tokens:build
pnpm tokens:check
pnpm schema:check

pnpm typecheck
pnpm lint
pnpm lint:css
pnpm format
pnpm format:check

pnpm check:arch
pnpm check:unused
pnpm check:bundle

pnpm verify
```

## 31.1 `pnpm verify`

```text
NODE_VERIFICATION_AUTHORITY=24.15.0_EXACT
PNPM_VERIFICATION_AUTHORITY=10.34.5_EXACT
DECLARED_RUNTIME_PARITY_CHECK=ACTIVE
PROCESS_RUNTIME_PREFLIGHT=ACTIVE
PROCESS_RUNTIME_PREFLIGHT_OWNER=PAVP_FINAL_STATIC_GOVERNANCE
PROCESS_RUNTIME_PREFLIGHT_ORDER=FIRST_BEFORE_FORMAT_CHECK
PROCESS_RUNTIME_MISMATCH=FAIL_CLOSED_WITH_REQUIRED_AND_RECEIVED_VERSION
ROOT_ENGINES_ALIGNMENT=NODE_24_15_0_AND_PNPM_10_34_5_EXACT
CURRENT_EXECUTOR_OBLIGATION=NONE_REPOSITORY_PREFLIGHT_ACTIVE
```

`DECLARED_RUNTIME_PARITY_CHECK=ACTIVE` 与 `PROCESS_RUNTIME_PREFLIGHT=ACTIVE` 分别验证声明和当前执行进程。Preflight 读取实际 Process Node Version，并从当前 pnpm Lifecycle User Agent 确定实际 pnpm Version；它是 `pnpm verify` 的首个 Gate，不等待 `schema:check`。`check-project-config.ts` 另行拒绝 Preflight Authority、首位命令、精确 Engines、Package Manager、Mise、Project Config 或 CI 之间的任何 Drift。

```text
format check
ESLint
Stylelint
UnoCSS lint
vue-tsc
TypeScript strict checking
architecture boundaries
token generation consistency
Zod configuration and schema validation
Knip unused-code analysis
production build
bundle budget
```

`pnpm verify` 只执行静态生产门槛，不启动浏览器自动化或生成验证专用资产。

## 31.2 Static Enforcement Boundary

仅在对应 Owning Work Package 或 Admission Gate 接受后，静态门槛可以验证：

```text
Phase-specific dependency sets
root-only imports and private adapter paths
Token tier / visibility / namespace / output filtering
Public Output Completeness set equality
Target Explicit Theme exact fields and four explicit planes after Atomic Cutover
duplicate-key rejection before Target Theme object construction after Atomic Cutover
Role/Alpha/Named Contrast Registry version equality and endpoint closure after version activation
Named Contrast Registry endpoints, thresholds and Enhanced difference invariant
Theme Bank isolation and stable Public binding
Built-in/Custom identity isolation and Custom Bank role-set/allowlist
future admitted 11 × 3 Density Matrix completeness and selector isolation
density.scale stored-only and absent from runtime/generated projection
UnoCSS family / key / class metadata and class collision freedom
forbidden page-authored Material and optical syntax
public Prop shape restrictions
declared Appearance and Scroll contracts
Material fallback completeness
generated-output drift
bundle budgets
```

`PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` 与 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 的 Active Existing Static Owners 当前额外证明：

```text
exact runtime-configuration.json artifact name, output and deployed URL
exact existing module bootstrap-script carrier and one non-empty URL attribute
exact strict five-field Runtime Configuration record and schema discriminator
root package Build Version authority and compiled/runtime equality
single-read full Release SHA authority and compiled/runtime equality
single deployment-base authority and current exact root-only compatibility
same-origin/protocol/path/fetch/document/First Paint compatibility comparisons
exact eleven Runtime Configuration failure causes
exact four-record Core Error Registry and built-in message-key set
exact safe and prohibited error context closure
configuration-first startup and exact two-listener capture ownership
exact one-user-retry startup-configuration-recovery policy
exact ten-step Bootstrap Registry and acyclic dependency graph
exact Pinia-and-Appearance current provider set
unique Mount owner and exact reverse disposal order
idempotent cleanup and sole HMR owner
absence of future Providers, placeholder Steps and inactive capability imports
unchanged Package 5 Appearance behavior
exact one-Router and one-History lifecycle authority
router.isReady before Mount and initial-navigation startup-failure precedence
exact six-record Router Error extension and ten-record combined projection
exact eight-route registry/generated-DTS projection and five-stage Guard order
exact Router/History reverse disposal with sole Runtime Kernel top-level HMR ownership
```

静态门槛不能证明：

```text
real browser Scroll Owner and overflow behavior
composed contrast through translucent Material
keyboard, focus, Accessible Name, or reading order behavior
animation interruption, gesture cleanup, or route disposal
Forced Colors and capability fallback behavior
paint, layer, frame, or interaction performance
runtime console and network correctness
Custom Theme Bank switch timing and visual atomicity
```

静态检查不得宣称已经证明 Runtime-only Property。对于 Codex Task Completion，Owner 可以在仓库外选择手工观察这些行为并向 Codex 提供明确记录供只读审查；该观察可缺省、不是 Codex 门槛且不得被 Codex 执行。对于 Production Release，§32.3 的 Owner External Runtime Acceptance 是独立必需门禁。两种情形都不授权 Test、Browser Automation 或 Committed Evidence。

未来规则只有在其负责 Work Package 实现、接入 `pnpm verify` 并通过后才是机器强制；本文声明本身不代表 Validator 已存在。

## 31.3 GitHub 托管门槛

```text
MAINTENANCE_BRANCH=main
LOCAL_VERIFY_BEFORE_COMMIT=REQUIRED
PUSH_CI_MONITORING=REQUIRED_UNTIL_TERMINAL_RESULT
FAILED_MAIN_CI_ACTION=EXPLICIT_REVERT_AFTER_CAUSE_CONFIRMATION
FORCE_PUSH_OR_HISTORY_REWRITE=PROHIBITED
PARALLEL_MAINTENANCE_BRANCH_WORKFLOW=PROHIBITED
```

每个允许产生 Commit 的实现任务都必须在精确 Runtime Authority 下先通过本地 `pnpm verify`，再提交到受保护的 `main`。Push 后必须观察对应 Static Verification 与 CodeQL 的终态；失败时停止后续 Package，确认失败与该 Landing 的因果关系，并用显式 Revert Commit 恢复上一通过状态。不得跳过失败、在其上继续叠加实现、Force Push、Rewrite History 或创建长期维护分支。本节不授权当前 Architecture Freeze 执行 Commit、Push 或 Revert。

```text
CodeQL
GitHub Dependency Graph
Dependabot alerts
```

这些信号补充本地 `pnpm verify`，但不创建依赖更新分支。

---

# 32. Codex Browser Prohibition and Owner Release Acceptance

## 32.1 Codex Verification Boundary

Codex Browser Operation、Chrome DevTools、ChromeDev、Browser Testing 和 Browser Automation 全部禁止。Codex 不得打开、操作、驱动或配置浏览器，不得生成 Screenshot、Recording、Trace、Runtime Probe、Baseline、Fixture 或 Evidence File。

```text
CODEX_VERIFICATION_MODEL=pnpm verify
CODEX_BROWSER_OPERATION=PROHIBITED
OWNER_MANUAL_RUNTIME_INSPECTION_FOR_CODEX_TASKS=OPTIONAL_EXTERNAL_NON_GATING
OWNER_PRODUCTION_RELEASE_RUNTIME_ACCEPTANCE=REQUIRED_EXTERNAL_NON_REPOSITORY
```

即使当前客户端提供浏览器能力，也不构成授权。请求 Codex 执行浏览器操作必须以 `ARCHITECTURE_CONFLICT` 停止该部分；其余合法静态工作可以继续。仓库不得包含 Browser Configuration、Automation、Evidence 或专用 Tooling。

`AGENTS.md`、README 和从属 Workflow 中的“Owner Observation Optional/Non-gating”只描述 Codex Task Completion，不得解释为免除 Product Release Gate。Supporting File 不承载 Release 规范；本节是唯一规范权威。

## 32.2 Owner-operated Observation Matrix

Owner 完全在仓库外自行操作浏览器。非发布任务可以选择观察；Production Release 必须按 §32.3 选择当前 Release 涉及的全部适用项：

Appearance：

* Light、Dark、System。
* Standard、Enhanced。
* Adaptive、Reduced、Solid。
* Forced Colors、Reduced Transparency 和 Unsupported Backdrop Fallback。
* First-paint Flash、Named Contrast Pair 与 Adaptive 合成效果。
* Built-in/Custom Theme 切换时的 Bank 完整性与无 Partial-frame Flash。

Component and Interaction：

* Semantic Structure、Accessible Name、Keyboard、Visible Focus 与 Focus Return。
* Touch Target、非拖动替代、Interruption、Reversal、Cleanup 和 Route Disposal。
* Full、Reduced、None Motion。

Shell, Layout and Scroll：

* narrow、regular、wide Capability Projection。
* Hover、Pointer 和 Input Capability 组合。
* Zoom、Reflow、Safe Area、Dynamic Viewport 与 Responsive Reading Order。
* 每个 Axis 的精确 Scroll Owner、Background Lock、Focus Return 和 Scroll Restoration。
* Paint、Layer 和 Performance Observation。

Owner Observation 不是 Codex Completion Gate。Owner 明确提供观察结果时，Codex 只能以 `review` 模式分析，不得自行复现。观察记录不提交到仓库。

## 32.3 Required External Production Release Acceptance

每个 Production Release 必须由 Owner 在仓库外完成适用 Runtime Matrix，并作出单一 Release Decision：

```text
OWNER_PRODUCTION_RELEASE_DECISION=ACCEPT | REJECT
RELEASE_ID=<releaseSha + buildVersion>
APPLICABLE_RUNTIME_DOMAINS=<named matrix domains>
```

该 Decision 由 Owner/Deployment Process 保持在仓库外；不得创建 Evidence、Screenshot、Trace、Checklist File、Test 或 Browser Automation。`REJECT` 必须阻止部署或触发 Rollback；`ACCEPT` 只授权该精确 Release，不成为未来 Release 证据。

Minimum Matrix：Startup/Runtime Config、Appearance First Paint and Atomic Theme、关键 Route/Auth/Permission、API/Mutation/Conflict、Storage Migration/Corruption/Cross-tab、Keyboard/Focus/Name、Layout/Scroll、Reduced/Forced Modes、关键 Performance 和 Error Reporting。只发布静态架构文档且没有 Runtime Artifact 变化时，Product Release Gate 不适用；Codex 仍运行 `pnpm verify`。

Release Acceptance 不能覆盖失败的 Static Gate、降低 WCAG/安全合同或批准已知 Secret/数据损失风险。Codex 不得把未提供的 Owner Decision 推断为接受。

---

# 33. 性能规则

```text
CAPABILITY=PERFORMANCE_GOVERNANCE
CAPABILITY_STATUS=ACTIVE
ACTIVE_SCOPE=BUILD_AND_GENERATED_MANIFEST_BUDGETS
RUNTIME_PERFORMANCE_OBSERVABILITY=TARGET_INACTIVE
OWNER=build verification plus observability and owning feature
```

初始预算：

| 资源          |                 初始预算 |
| ----------- | -------------------: |
| 初始应用 JS     |        ≤ 180 KB gzip |
| 初始 CSS      |         ≤ 40 KB gzip |
| Generated Manifest | ≤ 32 KiB under `node-zlib-gzip-sync` |
| 普通懒加载 Route |        ≤ 120 KB gzip |
| 新第三方依赖      | 超过 40 KB gzip 需要 ADR |
| 单一大组件       |   超过 25 KB gzip 需要说明 |

规则：

* 所有 Route 默认懒加载。
* 不全局注册全部组件。
* 不导入整套图标库。
* 不因理论性能提前虚拟化。
* 不使用自定义滚动条。
* 不在 Store 中保存可计算状态。
* 不复制 Query 数据。
* 不为简单动画引入 Motion。
* 不在首屏加载主题编辑器。
* Bundle 预算由 CI 执行。
* 不动画 `backdrop-filter`、`filter`、Blur、Saturation 或 Brightness。
* 动画优先使用已合成且有明确边界的 Layer 上的 Transform 和 Opacity。
* 不在 Full-viewport Surface 上使用 Backdrop Filter。
* 不嵌套 Material Surface，不形成 Glass-on-glass。
* 不永久设置 `will-change`。
* Viewport Scrim 可以使用 Semantic Scrim Token 覆盖 Viewport，但它不是 Full-viewport Material Surface。
* 对 Codex Task Completion，Material 的 Paint、Layer 和 Interaction Performance 可以由 Owner 在仓库外选择手工观察；不是 Codex Gate。对涉及这些行为的 Production Release，§32.3 的适用 Runtime Acceptance 是必需 Gate。
* Atomic Cutover 后引入的 Private Theme Bank 与独立 Selector Output 必须保持初始 CSS Budget。

## 33.1 Performance Budget Registry

所有 Bundle、Route、Runtime Metric、Long Task、Resource、Memory 和 Interaction Threshold 必须来自 Versioned Performance Budget Registry，不能由 Vite Config、Feature、Component 或 Dashboard 重复数字。

```ts
interface PerformanceBudgetRecord {
  id: string
  metric: string
  scope: 'application' | 'route' | 'component' | 'resource' | 'interaction'
  limit: number
  unit: 'bytes-gzip' | 'milliseconds' | 'ratio' | 'count'
  percentile: 75 | null
  environment: 'production-build' | 'production-runtime'
  owner: string
  action: 'fail-build' | 'block-release' | 'investigate'
  capabilityStatus: CapabilityStatus
}
```

当前 Bundle Table 是 `ACTIVE` Build Registry 的规范投影。Target Runtime Baseline 在 Observability Gate 激活时必须至少注册：LCP `2500ms` p75、INP `200ms` p75、CLS `0.1` p75；Long Task 使用 Browser `>50ms` 定义并记录 Count/Duration，不直接作为单次用户的失败判定。阈值变化需要 Architecture Amendment，不能由 Telemetry Provider 默认值改变。

## 33.2 Route and Resource Loading

所有业务 Route 默认 Dynamic Import。Root Shell 只包含 First Paint、Fatal Boundary、Router Bootstrap 和当前 Route 必需 Provider；Theme Editor、专业 Grid、Editor、Charts、Locale Bundle 和非当前 Feature 必须 Lazy Load。Prefetch 只能由 Route/Data Policy Registry 在 Network、Save-data、Session、Permission 和 Cache 条件允许时启动，并可由 Navigation Cancel。

Asset 使用 Content Hash 与 Immutable Cache；HTML、Runtime Config 和 Release Manifest 不得使用相同长缓存。Icon 只导入使用的集合成员；禁止整库 Side Effect Import、全局注册所有 Component 和无 Consumer 的 Polyfill。

## 33.3 Rendering, Interaction and Memory

在测量证明前不引入 Virtualization、Memoization Layer 或 Web Worker。Reactive State 保持最小，Derived Value 使用 Computed，不复制 Query Data；大型 Object 不进入 Deep Reactive Store。List 使用 Stable Key，避免 Layout Thrashing、同步读写交错和无界 Watcher。

Interaction Owner 必须定义测量起点、完成点和取消结果。Animation 只使用 §24 准入属性；Backdrop/Filter 不动画。Observer、Listener、Timer、RAF、Object URL、Worker、Query 和 Cache 都有 Disposal/Retention Policy。Route Disposal 后残留 Resource Count 必须回到命名 Baseline。

## 33.4 Measurement and Release Gate

Build Gate 测量 Production Output Gzip，不用 Source Map 或 Dev Bundle 代替。Runtime Metric 只来自 Production-like Release，带 Release SHA、Route Telemetry Name 和匿名环境维度；Field 与 Lab 数据分开，不相互冒充。少量样本不自动阻止 Release，但超过 Block-release Budget 或已知交互回归必须由 Owner 明确处理。

Production Release 的 Owner External Runtime Acceptance 必须覆盖首次加载、一次 Route Lazy Load、关键 Interaction、Material Paint/Layer、长列表/表格和 Cleanup；不向仓库提交 Trace/Screenshot/Evidence。Codex 只验证静态 Bundle 与合同，不操作浏览器。

## 33.5 Performance Static Enforcement Targets

Owning Gate 必须检查所有 Budget 来自 Registry、Route 默认 Lazy、重依赖仅在批准 Chunk、禁止 Query Copy/无界 Cache/永久 `will-change`/Filter Animation、Listener/Observer 有 Dispose、Public Component 不写 Metric Threshold。Runtime Enforcement 在 Observability Gate 前为 `TARGET_INACTIVE`；现有 Bundle/Manifest Budget 保持 `ACTIVE`。

---

# 34. 安全规则

```text
CAPABILITY=CORE_RUNTIME_CONFIGURATION
CAPABILITY_STATUS=ACTIVE
OWNER=apps/web/src/app/config
ACTIVATION_GATE=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
CONSUMER_ADMISSION_GATE=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
FIELD_EXTENSION_GATES=PAVP_API_TRANSPORT_IMPLEMENTATION; PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION
FIELD_EXTENSION_STAGE=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
FIELD_EXTENSION_GATE_CREATION=UNIQUE_PAVP_I18N_INSTANCE_ID_REQUIRED_FOR_PRODUCT_ZONE_POLICY

CAPABILITY=DEPLOYMENT_DELIVERY_AND_SECURITY_INTEGRATION
CAPABILITY_STATUS=TARGET_INACTIVE
OWNER=deployment platform plus apps/web configuration boundary
ACTIVATION_GATE=PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION
CURRENT_DEPLOYMENT_CONTRACT=ROOT_PATH_ONLY_ARCHITECTURE_FROZEN_IMPLEMENTATION_INACTIVE
```

* 所有环境变量通过 Zod 校验。
* `VITE_*` 中不得存放秘密。
* 认证优先使用 Secure、HttpOnly、SameSite Cookie。
* 用户偏好可以存储在 Local Storage。
* 敏感数据不存 Local Storage。
* 不实现客户端“加密后等于安全”的伪方案。
* 禁止未经处理的 `v-html`。
* 富文本必须经过专用 Sanitizer Adapter。
* 建立 CSP。
* 外部 URL 经过协议和域名校验。
* 文件下载验证 MIME、文件名和来源。
* GitHub 安全设置启用 CodeQL、Dependency Graph 和 Dependabot alerts。

## 34.1 Build-time and Runtime Configuration

Build-time Environment 只允许决定无法在部署后改变的编译事实：Compiled Environment Identity、Release SHA、Build Version 和 Feature Compilation Boundary。Runtime Kernel 已准入本节冻结的 Exact Core Runtime Configuration Record；API、Observability、Public Feature Availability、Product Zone、Router、Auth、Session、Storage、Vendor、Secret、Credential 与 Private URL Field 均不存在，不能使用 Optional、Default、Empty String、`null`、False、Localhost 或 Placeholder Stub 提前保留。

### Build Version Authority

```text
BUILD_VERSION_AUTHORITY=root package.json version
CURRENT_BUILD_VERSION=0.0.0
BUILD_VERSION_SYNTAX=major.minor.patch without a leading v
APPS_WEB_PACKAGE_VERSION_AUTHORITY=NONE
NORMAL_DEVELOPMENT_CHANGE=PROHIBITED
FORMAL_RELEASE_CHANGE=OWNER_EXPLICIT_AUTHORIZATION_REQUIRED
RUNTIME_CONFIGURATION_BUILD_VERSION=EXACT_ROOT_PACKAGE_VERSION
COMPILED_BUILD_VERSION=EXACT_ROOT_PACKAGE_VERSION
BUILD_RUNTIME_EQUALITY=REQUIRED
```

Root `package.json` 的 `version` 是唯一 Build Version Authority，当前权威值保持 `0.0.0`。Ordinary Feature Work、Architecture Work、Commit、Push、CI Run 和 Work-package Completion 都不得改变它；只有 Owner 明确授权的 Formal Product Release 才能改变它。`apps/web/package.json` 不成为第二份 Authority。Timestamp、CI Run Number、Git Tag、Short SHA、Full SHA、Branch Name 与 Automatic Counter 全部禁止作为 Build Version Producer。`releaseSha` 是独立的 Exact Git Commit Identity，不是 Build Version Producer。

### Runtime Configuration Artifact and URL

```text
RUNTIME_CONFIGURATION_ARTIFACT_NAME=runtime-configuration.json
RUNTIME_CONFIGURATION_BUILD_OUTPUT=apps/web/dist/runtime-configuration.json
RUNTIME_CONFIGURATION_DEPLOYED_URL=/runtime-configuration.json
RUNTIME_CONFIGURATION_URL_OWNER=apps/web index/Vite deployment template boundary
RUNTIME_CONFIGURATION_HTML_CARRIER=the existing module bootstrap script element whose src is /src/main.ts
RUNTIME_CONFIGURATION_HTML_ATTRIBUTE=data-runtime-configuration-url
RUNTIME_CONFIGURATION_HTML_ATTRIBUTE_VALUE=/runtime-configuration.json
ENVIRONMENT_SPECIFIC_SOURCE_JSON_IN_REPOSITORY=PROHIBITED
WINDOW_GLOBAL_CONFIGURATION=PROHIBITED
```

该 JSON File 是 Generated Production/Deployment Artifact，不是 Committed Environment-specific Source File。Existing Module Bootstrap Script 上必须存在恰好一个非空 `data-runtime-configuration-url` Attribute；不得由另一个 Element、Module、Window Global、Environment Fallback 或 Default 提供第二个 URL。Application 不得推断、修复或默认该 URL，并且必须在创建任何 Vue Application 或 Pinia Instance 之前读取它。

### Exact Core Runtime Configuration Record

```text
schemaVersion=1
environment=development | staging | production
deploymentBase=/
releaseSha=full lowercase forty-character hexadecimal Git commit SHA
buildVersion=exact root package.json version
```

Top-level Field Set 精确为：

```text
schemaVersion
environment
deploymentBase
releaseSha
buildVersion
```

```text
UNKNOWN_FIELD=REJECT
MISSING_FIELD=REJECT
OPTIONAL_FIELD=PROHIBITED
DEFAULT_FIELD=PROHIBITED
COERCION=PROHIBITED
PARTIAL_MERGE=PROHIBITED
VALIDATED_RESULT=RECURSIVELY_IMMUTABLE
VALIDATION_TIMING=BEFORE_VUE_APPLICATION_AND_PINIA_CREATION
```

Runtime Kernel Implementation Package 已把 Existing Workspace Catalog Zod Coordinate 作为 `apps/web` Direct Dependency 准入，并由 Web 配置边界直接消费。Feature 不读取 `import.meta.env`、`process.env`、Window Global 或未验证 JSON。

### Deployment Base Authority

```text
DEPLOYMENT_BASE_AUTHORITY=projectConfig.deployment.deploymentBase
CURRENT_DEPLOYMENT_BASE=/
VITE_BASE_SOURCE=projectConfig.deployment.deploymentBase
RUNTIME_CONFIGURATION_DEPLOYMENT_BASE_SOURCE=projectConfig.deployment.deploymentBase
HTML_RUNTIME_CONFIGURATION_URL_SOURCE=projectConfig.deployment.deploymentBase
FIRST_PAINT_PATH_AUTHORITY=projectConfig.deployment.deploymentBase
SUBPATH_DEPLOYMENT_STATUS=TARGET_INACTIVE
```

Runtime Kernel Implementation 已增加以下 Explicit Declaration：

```ts
projectConfig.deployment.deploymentBase='/'
```

Vite Base、Runtime Configuration URL、Generated First Paint Asset Path 与 Runtime Configuration `deploymentBase` 必须从该 Single Authority 派生。当前 Active Compatibility Contract 只接受 Exact `/`；禁止 Trimming、Normalization、Repair、Fallback 或 Subpath Acceptance。Subpath Deployment 保持延迟，只有 Future Deployment Gate 可以激活。本 Architecture-only Task 不修改 `project.config.ts`。

### Release SHA Authority

```text
RELEASE_SHA_AUTHORITY=git rev-parse HEAD at the build boundary
RELEASE_SHA_FORMAT=full lowercase forty-character hexadecimal commit SHA
SHORT_SHA=PROHIBITED
FALLBACK_SHA=PROHIBITED
COMPILED_RELEASE_SHA=EXACT_BUILD_BOUNDARY_VALUE
RUNTIME_CONFIGURATION_RELEASE_SHA=EXACT_BUILD_BOUNDARY_VALUE
BUILD_RUNTIME_RELEASE_EQUALITY=REQUIRED
```

Build Boundary 必须恰好读取一次 Git SHA，并把同一个值注入 Compiled Build Identity 与 Emitted Runtime Configuration Artifact。Missing Git Provenance、Malformed SHA 或 Runtime/Compiled Mismatch 必须失败。

### URL, Fetch, Compatibility and Failure Contract

Loader 必须按以下精确顺序执行：

1. 在 Existing Module Bootstrap Script 上定位恰好一个非空 `data-runtime-configuration-url`。
2. 使用 `new URL(attributeValue, document.baseURI)` 构造 URL。
3. 拒绝 Credential、Query 和 Fragment。
4. 要求 `url.origin === location.origin`。
5. 要求 Pathname 精确为 `/runtime-configuration.json`。
6. 要求 HTTPS；只有 Compiled Environment 为 `development` 时允许 HTTP。
7. 使用 `credentials='same-origin'`、`cache='no-store'`、`redirect='error'` Fetch。
8. 要求 Successful HTTP Response，然后 Parse JSON 并验证 Exact Strict Schema。
9. 比较 Configuration `environment` 与 Compiled Environment Identity。
10. 比较 Configuration `releaseSha` 与 Compiled Release Identity。
11. 比较 Configuration `buildVersion` 与 Compiled Root-package Build Version Identity。
12. 比较 Configuration `deploymentBase` 与 `import.meta.env.BASE_URL`。
13. 要求 Document Base Origin 与 `location.origin` 相同。
14. 要求 Current First Paint Asset Path 分别精确解析为 `/generated/critical-theme.css` 与 `/generated/appearance-init.js`。

Exact Configuration Failure Cause Set：

```text
configuration-source-missing
configuration-network-failure
configuration-malformed-json
configuration-schema-rejected
configuration-environment-mismatch
configuration-release-mismatch
configuration-build-mismatch
configuration-base-mismatch
configuration-origin-prohibited
configuration-document-mismatch
configuration-first-paint-mismatch
```

`configuration-source-missing` 只表示 Carrier/Attribute Cardinality 或 Non-empty Requirement 失败；`configuration-network-failure` 包含 Fetch Boundary Failure、Redirect Rejection 或 Unsuccessful HTTP Response；Malformed JSON 与 Strict Schema Rejection 保持不同 Cause。Credential、Query、Fragment、Protocol、Origin 或 Exact Path Failure 使用 `configuration-origin-prohibited`；Document Base Origin Failure 使用 `configuration-document-mismatch`；First Paint Path Failure 使用 `configuration-first-paint-mismatch`。Environment、Release、Build 与 Base Compatibility 各自使用其同名 Mismatch Cause。内部 Normalizer Dispatch 或 Parser Decomposition 不成为 Public Contract。

任何 Configuration Failure 必须：

* Preserve Existing Appearance Safety Baseline。
* Stop All Later Bootstrap Steps。
* Enter Non-Vue Configuration Failure Boundary。
* Avoid Pinia Creation、Vue Application Creation 与 Mount。
* 不暴露 Raw URL、Raw Configuration、Raw Response、Raw Cause、Message 或 Stack。
* 只允许 §19.4 冻结的 Bounded Configuration Retry。
* Retry 时重新读取完整 Artifact，永不 Partial Merge Previous Configuration。

`VITE_*` 永不包含 Secret、Credential、Private Key、Token、Password、Internal Host 或仅靠隐藏 Source Map 保护的值。任何进入 Browser Bundle 或 Runtime Configuration 的值都视为 Public。Secret 只存在于 Server/Deployment Secret Store。

## 34.2 Configuration Failure Page

任一 §34.1 Exact Configuration Failure Cause 都必须在创建 Pinia 或 Vue Application 前停止 Bootstrap，并显示 §19.4 Non-Vue Configuration Failure Boundary。Boundary 只允许 Built-in Safe Message Key、允许的 Release/Build Identity，以及由 `startup-configuration-recovery` 当前 Budget 决定的 Retry 或 Reload Action；不得依赖 Router、Pinia、Query、I18n、Public UI Package 或 Remote Reporter。

Initial Attempt 后只允许一次 User-triggered、Whole-attempt Retry。Retry 必须重新读取完整 Artifact，不合并 Previous Object；第二次 Configuration Failure 后只显示 Explicit Browser Reload。Application Startup、Vue Component、Unhandled Promise Rejection、Disposal 或 Fatal Renderer Failure 都不得使用该 In-document Retry。

## 34.3 Deployment Base and SPA Fallback

`projectConfig.deployment.deploymentBase` 是 Vite Asset Base、HTML Runtime Configuration URL、First Paint Artifact Path、Runtime Configuration `deploymentBase` 与 Router History Base 的当前 Single Authority。当前 Runtime Kernel 与 Router Landing 只支持 Exact Root `/`，不支持 Subpath。Router History Base 已由 Router Landing 在该 Exact Root Contract 下消费同一 Authority；Service Endpoint Relative URL、SPA Fallback 和 Subpath Delivery 仍只能在各自 Future Gate 激活后消费该 Authority。不得创建 Placeholder 或扩展 Runtime Configuration Field Set。

当前 Exact Root URL 与 First Paint Path 是 Architecture-frozen Compatibility Value，不构成 Page、Component 或 Feature 可以复制 Absolute Path Literal 的许可。Future Subpath Gate 必须原子更新 Deployment、Runtime Configuration、Vite、HTML、First Paint、Router 与 SPA Fallback Contract；在此之前任何 Subpath Value、Normalization、Repair 或 Fallback 都失败。

Future Deployment Server 对 Canonical Base 下的非 Asset、非 API、已允许 HTML Navigation Request 返回 `index.html`；Unknown Hashed Asset、Generated Artifact、Runtime Configuration、API 和 File Request 必须返回真实 404，不得 Fallback 为 HTML。该 Delivery Behavior 保持 `TARGET_INACTIVE`，不由 Runtime Kernel Package 实现。

## 34.4 Environment Model

| Environment | Purpose | Data and service rule |
| --- | --- | --- |
| Development | local implementation | local non-production service, relaxed diagnostics, no production secret |
| Staging | production-like acceptance | isolated non-production data, production-equivalent CSP/cache/base |
| Production | owner-approved release | production service and strict diagnostics/redaction |

Environment 差异只通过 Runtime Configuration/Deployment Policy，不通过散落 `if (development)`。Staging 不能连接 Production Write Service；Development/Staging Telemetry 必须带明确 Environment 并隔离。

## 34.5 CDN and Cache Policy

```text
hashed JS/CSS/font/image assets → public, immutable, long-lived
index.html → no-cache or short revalidation, never immutable
runtime configuration → no-store or release-bound revalidation
release manifest → no-cache, integrity checked
appearance-init.js and critical-theme.css → release-bound immutable only when content-hashed; otherwise revalidate
API → endpoint-owned HTTP cache policy
```

CDN Cache Key 必须包含 Host、Canonical Path、必要 Vary Header 和 Encoding；不得包含 Credential 或忽略 Locale/Tenant Vary。Purge/Rollback 按 Release Manifest，不用全站随机 Cache Busting。HTML 只能引用同一 Release 的 Asset Manifest，防止新 HTML/旧 Chunk 混合。

## 34.6 Content Security Policy

CSP 由 Deployment Security Policy Registry 生成，Baseline 至少包含：

```text
default-src 'self'
base-uri 'self'
object-src 'none'
frame-ancestors 'none'
form-action 'self'
script-src 'self' plus deployment-owned nonce only when required
style-src 'self'
img-src 'self' plus explicitly admitted data/blob origins
font-src 'self'
connect-src 'self' plus validated API and observability origins
worker-src 'self' only after worker admission
manifest-src 'self'
upgrade-insecure-requests in production
report-to/report-uri from admitted reporting policy
```

禁止 `unsafe-eval`、宽泛 `*`、任意第三方 Origin 和由客户端生成 Nonce。Nonce 由 Server/Edge 每个 HTML Response 生成并绑定允许的 Script/Style；静态部署不需要 Inline Script 时不引入 Nonce。CSP Reporting Body 经过独立 Redaction/Rate Limit，不能成为 Log Injection 通道。

Trusted Types 为 `DEFERRED`；只有富文本/HTML Sink 实际出现、Sanitizer Adapter 与 Browser Support Gate 通过后准入。未经处理的 `v-html`、`innerHTML`、`document.write` 和 Dynamic Script URL 保持禁止。

## 34.7 Source Maps, Release Manifest and Health

Source Map 遵守 §20B.6：可以生成并私密上传，但不公开部署。Release Manifest 必须由 Build 生成：

```ts
interface ReleaseManifest {
  schemaVersion: number
  releaseSha: string
  buildVersion: string
  builtAt: string
  runtimeConfigSchemaVersion: number
  assetManifestDigest: string
  architectureFoundationGate: 'FROZEN'
}
```

`builtAt` 只用于发布诊断，不参与可复现 Asset Content。Client Health Information 只暴露 Release SHA、Build Version、Environment 和 Startup Status；后端/平台 Health Endpoint 拥有服务健康权威。不得暴露 Dependency List、Internal Host、Commit Message、User 或 Secret。

## 34.8 Browser Support and Polyfill Admission

Browser Support Matrix 是 Versioned Deployment Registry，基于 Engine/Feature Capability，不使用设备名或 UA Runtime Branch。Build Target、CSS Target 和 Polyfill Set 必须从同一 Matrix 生成。Unsupported Browser 显示最小安全页面，不加载任意 Polyfill CDN。

Polyfill 只有目标浏览器缺失生产必需能力、Progressive Fallback 不足、维护/安全/Bundle Gate 通过后准入；按 Feature Lazy Load 或 Build Target 注入，禁止全量 Legacy Bundle。Runtime Behavior 仍优先 Feature Detection。

## 34.9 Deployment Verification and Rollback

Deployment Pipeline 必须验证 Build Artifact Digest、Release Manifest、Runtime Config Schema/Base/Release 一致、CSP Header、Cache Header、SPA Fallback/Asset 404 分离和 Source Map 非公开。该验证由部署平台/Owner 执行，不创建仓库浏览器自动化。

Rollout 使用不可变 Release。Rollback 只切换 HTML/Runtime Config/Asset Manifest 到一个完整已知 Release；不得混合单个旧 Chunk。Runtime Config Schema 必须声明向后兼容窗口；不兼容时与应用 Release 原子切换。Failed `main`/Production Release 使用显式 Revert 或部署回滚，不改写 Git History。

## 34.10 External URL, File and Supply-chain Boundary

External URL 必须通过 Protocol/Origin Registry；`javascript:`、`data:` Navigation、Credential URL、Protocol-relative URL 和 Unicode Confusable Host 默认拒绝。新窗口使用 `noopener`/`noreferrer` Policy。文件上传/下载遵守 §20.8。

依赖继续由 Frozen Lockfile、CodeQL、Dependency Graph 和 Dependabot Alert 提供信号；Alert 需要 Owner Review，不自动修改依赖。Production Artifact 必须可追溯到 Commit、Lockfile 和 CI Run。

## 34.11 Deployment Static Enforcement Targets

Core Runtime Configuration Gate 当前为 `ACTIVE`，拒绝未验证 Env、Consumer Env Fallback、重复 Base、未准入 Field 和 Placeholder Default；每个 Future Field Extension Gate 必须证明 Schema、Loader、Consumer 与 Registry Exact Equality。Deployment Gate 另行拒绝 Secret-like `VITE_*`、Root-only Literal、SPA Fallback 吞 Asset 404、错误 Cache Class、宽泛 CSP、公开 Source Map、Unknown Origin、未注册 Polyfill、Release/Config Digest 不匹配和非不可变回滚。Deployment 与其他未准入 Target Enforcement 在自己的 Owner Gate 前保持 `TARGET_INACTIVE`。

---

# 35. 生产专用仓库政策

The repository contains production architecture only.

No automated test files or test-only infrastructure are permitted.

Codex verification consists only of static production gates.

Owner manual runtime inspection is optional and non-gating for Codex task completion. Production release runtime acceptance is required, external, owner-operated, release-specific, and never committed to the repository.

仓库不提交验证专用代码、测试专用目录或依赖、演示与展示系统、浏览器自动化基础设施或验证证据资产。

项目规范、执行合同和必需资源必须来自当前 Repository。Machine-local Rule、Global Skill、Client Registry、Absolute Home Path、External Symlink 或实时下载的规范文件不得成为项目正确执行的前提。

唯一例外是 §28.3 声明的五个 `.ai/skills/pavp-ui` Markdown 文件。它们是现有 Production Execution Workflow，不是 Test、Demo、Evidence 或第二份 Architecture。Exact Allowlist、最短 `AGENTS.md` Route 和 Policy Enforcement 必须保持同步；已完成的 `PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 已移除失效的从属 Browser/Runtime-acceptance 文字并锁定 Regression Gate，后续 Package 只能保持该边界。

Tracked Symlink 与客户端专属 Project Authority 目录保持禁止。`patches/unconfig@7.5.0.patch` 是现有、经过审查并由 Workspace 使用的 Production Build Input，必须保留。

Repository Policy 必须继续拒绝：

```text
tests/**
fixtures/**
mocks/**
snapshots/**
coverage/**
storybook/**
stories/**
demos/**
showcases/**
evidence/**
screenshots/**
traces/**
recordings/**
```

---

# 36. 用户个性化发布顺序

本节是 Product Target Release Order，不是当前 Active Authority、Architecture Phase 自动准入或 Work-package Completion 证明。Explicit Theme Plane 与 Registry Reference 只有在 §37.1 的 Naming、Side-by-side Plane 和 Atomic Cutover Gate 依次完成后才激活；Future Public Role 仍需独立 Admission Amendment。

## 第一阶段

```text
Light / Dark / System
Standard / Enhanced Contrast
Adaptive / Reduced / Solid Material
complete manually authored Built-in Theme Planes
exact Theme Registry Reference
Compact / Comfortable / Spacious
90% / 100% / 110% / 120% 字号
Full / Reduced / None Motion
3–5 个布局预设
内容宽度
导航展开与折叠
```

## 第二阶段

```text
complete Custom Theme editing
field-specific validation and rejection
Theme import / export
Phase 2 Card / Menu / Popover / Tooltip / Modal roles
导航位置
面板显示与隐藏
面板宽度
面板顺序
按 narrow / regular / wide 保存布局
```

## 第三阶段

```text
Phase 3 Header / Sidebar / Footer / Navigation roles
Phase 4 Input / Table roles
Density Scale Application after its independent canonical gate
布局导入和导出
云端偏好同步
跨设备偏好
自定义面板组合
```

用户自由通过受约束 Schema 实现，不通过任意 CSS 实现。

---

# 37. 初始建设阶段

## Phase 0：仓库治理

交付：

```text
仓库治理基线
Node / pnpm / TS 基线
Workspace
ESLint
Prettier
Stylelint
AGENTS.md
ARCHITECTURE.md
依赖边界
统一 verify
GitHub Actions static gates
```

## Phase 1：Design System

当前已实现并保持权威的基线：

```text
existing DTCG Token Source and Style Dictionary Build
existing Zod Validation
existing CSS Variables and TypeScript Token Types
existing UnoCSS Preset
existing Light / Dark / System
existing Compact / Comfortable / Spacious
active ExplicitThemePreference registry reference
exact current 27-role public ID set, including 9 color roles
current single-role density behavior for interaction.control.height
packages/ui dependency-free src/index.ts stub
```

当前 Package 状态：

```text
Package 1 = COMPLETE
Package 2 = COMPLETE
Package 3 = COMPLETE
Package 3A = COMPLETE
Package 4 = COMPLETE
Package 5 = COMPLETE
Package 6 = COMPLETE
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION = COMPLETE
RUNTIME_KERNEL_IMPLEMENTATION_COMMIT = 3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION = COMPLETE
ROUTER_CAPABILITY_STATUS = ACTIVE
CURRENT_RUNTIME_KERNEL_STEP_COUNT = 10
NEXT = PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
```

以下是完整 Phase 1 Target Inventory。某项是否已实现、是否已机器强制以及是否允许成为 Runtime Authority，只由 §37.1 的 Package Status 和 Owning Gate 决定，不因出现在本清单而自动激活：

```text
subordinate browser-rule synchronization
semantic naming normalization
exact Public Role Registry and complete 27-role UnoCSS mapping
target explicit complete Theme contract
complete four-plane Built-in Theme documents side by side with legacy tuples
reference-only Preference, structured parsed-input classification and legacy migration at Atomic Cutover
independent Color Mode / Contrast / Material axes
Stored Preference / Effective State separation
pure Color Mode and Material resolvers
Token Visibility and filtered generated outputs
hard Public Output Completeness
private Theme Bank and stable Public Variable binding
complete generated UnoCSS public consumption layer
minimal UI-internal chrome / overlay / modal Material roles
adaptive / reduced / solid projections and terminal fallbacks
versioned exact Named Contrast Registry
critical-theme.css and synchronous appearance-init.js
Preference Migration
Phase 1 static governance
```

§14.2 的十个额外 Density Candidate 不属于 Phase 1 Target 交付；它们只能在后续独立 Architecture Admission Amendment 后进入 11 × 3 Projection。

Package 5 已完成 Phase 1 唯一 Pinia Admission，且只允许 `apps/web` 的 Appearance Preference 与 Theme Registry Orchestration；该 Admission 当前为 Active。Phase 1 不准入 Router、TanStack Query、OpenAPI Generator、Session Store 或 General Application Store。

Phase 1 不实现 UI Component、`UiGlass`、Page Material API、Component Token Tree、Clear-media Role、Spring Family、Reka、Motion、GSAP 或 `packages/ui/src/internal/material`。

## Phase 2：基础 UI

交付：

```text
demand-driven foundational components
private Reka / Material / Focus / Overlay implementation only when consumed
Phase 2 Card / Menu / Popover / Tooltip / Modal color-role candidates, admitted only by an independent Architecture Amendment
semantic public Props
private optical composition
component A11y contract
```

Phase 2 没有 Component Count Quota。每个初始实现由一个有充分理由的真实消费者触发，新增抽象与变体由后续复用证据触发。

## Phase 3：App Shell 与布局

交付：

```text
AppViewport
AppShell
Phase 3 Header / Sidebar / Footer / Navigation color-role candidates, admitted only by an independent Architecture Amendment
narrow / regular / wide capability resolution
exact per-axis Scroll Owners
NO_COMPETING_SAME_AXIS_SCROLL_OWNERS
Layout Resolver
Route Capability
Safe Area
Dynamic Viewport
Container Query
Scroll Lock and Restoration
User Layout Presets
```

Motion 目录和依赖只有在命名 Interaction 通过 Admission Gate 后才进入；`internal/scroll` 由真实 Phase 3 共享需求创建。

## Phase 4：数据和表单

交付：

```text
Native Fetch
TanStack Query
Error Model
VeeValidate + Zod
Phase 4 Input / Table color-role candidates, admitted only by an independent Architecture Amendment
Query Key Policy
Loading / Error / Empty Contract
```

## Phase 5：用户个性化

交付：

```text
Theme Registry management
complete Custom Theme editor
exact Theme Definition validation
field-specific rejection without correction
Theme import and export through the same exact Schema
Density Scale Application only after an independent canonical contract
Font Scale
Motion Preference
Navigation and Panel Preferences
Layout Import Export
```

Phase 5 不接收 Brand/Accent Seed，不生成 Palette、不补齐 Partial Theme、不执行 Gamut Remap 或 Contrast Correction。Built-in Named Contrast Registry 和 Material Fallback Validation 属于 Phase 1；Phase 5 不承担基础 Contrast Contract。

## 37.1 Post-amendment Work-package Order

`PAVP_EXPLICIT_THEME_ARCHITECTURE_AMENDMENT`、`PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT_ARCHITECTURE_AMENDMENT`、编号为 `3A` 的 `PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT`、Architecture-only `PAVP_ARCHITECTURE_FOUNDATION_FREEZE`、`PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE`、`PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER`、`PAVP_FINAL_STATIC_GOVERNANCE`、`PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION` 与 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION` 均已完成。Package 5 已原子激活 Explicit Theme Preference、Theme Registry、Theme Bank、First Paint、Pinia 与应用持久化边界；Package 6 已闭合 Phase 1 最终静态治理；Runtime Kernel Landing 已在 `3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177` 激活基础 Kernel、Configuration、Core Error 和 Static Enforcement；Router Landing 随后按 Frozen Protocol 只把 Kernel 扩展为十步并激活 Router Domain。唯一 Next Implementation Package 是 `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION`。

```text
ARCHITECTURE_FOUNDATION_GATE=PAVP_ARCHITECTURE_FOUNDATION_FREEZE
ARCHITECTURE_FOUNDATION_GATE_STATUS=FROZEN
IMPLEMENTATION_WHILE_GATE_NOT_FROZEN=BLOCKED
TARGET_CONTRACT_ACTIVATION_BY_DOCUMENTATION=PROHIBITED
FIRST_IMPLEMENTATION_AFTER_GATE=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION=COMPLETE
PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT=FROZEN
PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT=FROZEN
VUE_ROUTER_TYPE_COMPATIBILITY_STRATEGY=EXACT_VERSION_PNPM_DECLARATION_PATCH
PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION=COMPLETE
ROUTER_CAPABILITY_STATUS=ACTIVE
ROUTER_PRODUCTION_RUNTIME_ACCEPTANCE=PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
CURRENT_RUNTIME_KERNEL_STEP_COUNT=10
PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=NEXT
NEXT_CANONICAL_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
```

Phase 1 Chain 保留已接受的 Package 1–6 编号，只在 3 与 4 之间插入 `3A`：

```text
1.  PAVP_SUBORDINATE_BROWSER_RULE_SYNC                    COMPLETE
2.  PAVP_NAMING_NORMALIZATION                            COMPLETE
3.  PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS           COMPLETE
3A. PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT               COMPLETE
4.  PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE      COMPLETE
5.  PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER        COMPLETE
6.  PAVP_FINAL_STATIC_GOVERNANCE                         COMPLETE
```

Package 4 已完成三份 Side-by-side Complete Built-in Theme Document、Target-only Schema/Validation 与 Manifest Metadata；Package 5 随后在同一 Atomic Landing 中激活 Preference、Theme Bank、Runtime、First Paint、Persistence 与精确公共导出；Package 6 已闭合所有 Active Phase 1 Contract 的跨包静态治理；Runtime Kernel 与 Router Implementation 随后依次完成。Future Public Role Admission 不属于该 Immediate Chain，继续受独立 Amendment Gate 约束。原“Runtime Kernel Architecture Amendment 只能在 Phase 1 后开始”的限制已由 `PAVP_ARCHITECTURE_FOUNDATION_FREEZE` 明确替换；当前下一包为 `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION`，不得因本次 Status Synchronization 自动开始。

当前精确 Acceptance Contract：

```text
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION=COMPLETE
PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION=COMPLETE
ROUTER_CAPABILITY_STATUS=ACTIVE
ROUTER_PRODUCTION_RUNTIME_ACCEPTANCE=PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
CURRENT_RUNTIME_KERNEL_STEP_COUNT=10
PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=NEXT
ACTIVE_PUBLIC_COLOR_ROLES=9
ACTIVE_PUBLIC_ROLES_TOTAL=27
PUBLIC_ROLE_REGISTRY=EXACT
UNO_MAPPING_RECORDS=27
ACTIVE_ALPHA_RECORDS=1
NAMED_CONTRAST_RECORDS=14
PREFERENCE_CUTOVER=ATOMIC
MANIFEST_BUDGET=DEFINED
MANIFEST_COMPRESSION_PROFILE_ID=node-zlib-gzip-sync
MANIFEST_COMPRESSION_PROFILE_STATUS=ACTIVE
MANIFEST_PAYLOAD_SIZE_SELF_GOVERNANCE=ABSENT
MANIFEST_SCHEMA_VERSION=7
MANIFEST_RECORD_COUNT=181
COMPLETE_BUILTIN_THEME_DOCUMENTS=3
COMPLETE_BUILTIN_THEME_PLANES=12
COMPLETE_BUILTIN_THEME_AUTHORED_COLOR_VALUES=108
COMPLETE_BUILTIN_THEME_RUNTIME_STATUS=ACTIVE
SUBORDINATE_BROWSER_SYNC_STATUS=COMPLETE
NAMING_NORMALIZATION=COMPLETE
RESERVED_COLOR_ROLES=283
TOTAL_UNIQUE_COLOR_TAXONOMY=292
```

### 1. `PAVP_SUBORDINATE_BROWSER_RULE_SYNC`

状态：

```text
STATUS=COMPLETE
IMPLEMENTATION_COMMIT=e53d41f128d747516c761a7cef251a8f0acdbfc6
```

该包已先于 Token、Theme、Schema、Generator 或 Runtime Package 完成。其 Accepted Write Scope 精确为七个 Existing File：

```text
AGENTS.md
README.md
.ai/skills/pavp-ui/SKILL.md
.ai/skills/pavp-ui/references/task-routing.md
.ai/skills/pavp-ui/references/execution-contract.md
.ai/skills/pavp-ui/references/acceptance-report.md
scripts/verify/check-repository-policy.ts
```

该包已完成并持续由 Regression Enforcement 保护：

1. 从从属 Workflow 和入口文字移除 `runtime-acceptance` Task Mode。
2. 移除 Tier 0–3 Gate、`PENDING_OWNER_ACCEPTANCE` 和任何 Codex Browser/ChromeDev Capability Routing。
3. 将 Codex Browser Operation Request 精确映射到 `ARCHITECTURE_CONFLICT`。
4. 保留仅针对 Codex Task/Package Completion 的 Owner-only、External、Optional、Non-gating Manual Observation；Production Release Acceptance 不属于该从属 Workflow 字段合同。
5. 更新 Acceptance Report State/Field Contract。
6. 在 Repository Policy Checker 增加 Regression Enforcement，拒绝上述已删除概念重新进入七文件范围。

该包未修改 Token、Theme、Schema、Generator、Runtime、Dependency 或 Lockfile。后续 Package 不得回退其 Browser、State 或 Repository Policy 边界。

### 2. `PAVP_NAMING_NORMALIZATION`

状态：

```text
STATUS=COMPLETE
IMPLEMENTATION_COMMIT=d2e7354fad616824e52dfe5ca0f7cdbe6b4705cf
```

该包已原子移除 Architecture、Type、Schema、File、Runtime API 和 Public Export 中的 Numeric-version-style Name，并提供迁移与静态 Drift Enforcement；没有借此重命名 Role ID、Class 或改变 Runtime Behavior。

该包已在 Package 3 和任何 New Theme 或 Preference Implementation 开始前完成。后续命名变化不得暗中改变当前 `CurrentPreference` Data Shape、27-role Public Set、Contrast Threshold、Alpha Value 或 UnoCSS Behavior。

```text
NAMING_NORMALIZATION=COMPLETE
NAMING_NORMALIZATION_PARTIAL_EXECUTION=PROHIBITED
```

### 3. `PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS`

状态：

```text
STATUS=COMPLETE
IMPLEMENTATION_COMMIT=08d5f149834060219c9d87527b6365a354bc7b08
BASELINE_COMMIT=d2e7354fad616824e52dfe5ca0f7cdbe6b4705cf
BASELINE_RELATION=DIRECT_PREDECESSOR
```

该包已实现 §11.4 的 Exact 27-record Public Role Registry、27 UnoCSS Mapping、§13.3 的单一 Alpha Record、§25.1 的 14 Named Contrast Record、Public Output Set Equality、Manifest Record Equation 和 Formatter Fatal Failure，并在不重命名或移除现有 Public ID 与 21 个现有 Class Spelling、不改变 Runtime Value 或 Active `CurrentPreference` Authority 的前提下证明 `A = R = T = N = U = M`。

Package 3 的 Record 和 Public Output 实现已由 3A 完成 Manifest Compression Label、Canonical Baseline、Expected Delta Ownership 和 Payload Self-governance 闭包，因此状态为 `COMPLETE`。Package 3 没有公开 Primitive、Theme Bank、Reserved Color、Future Density 或 Internal Material，也没有把 Target Theme/Preference 宣称为 Active。

### 3A. `PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT`

状态：

```text
STATUS=COMPLETE
ARCHITECTURE_ADMISSION_GATE=PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT_ARCHITECTURE_AMENDMENT
ARCHITECTURE_ADMISSION_GATE_STATUS=COMPLETE
```

目标：使 Architecture、Implementation、Generated Manifest 和 Static Verification 共同使用 §11.4 唯一的 `node-zlib-gzip-sync`，消除 CLI 伪权威、压缩 Payload 自我治理和中间 Metadata 测量。

完成状态：

```text
Package 1 = COMPLETE
Package 2 = COMPLETE
Package 3 = COMPLETE
Architecture Admission Gate = COMPLETE
```

Exact Write Scope：

```text
ARCHITECTURE.md
packages/design-system/src/build/build.ts
packages/design-system/src/build/formats/manifest.ts
packages/design-system/src/generated/tokens.manifest.json
```

Package 3A 完成时满足以下精确合同：

1. 将所有曾误标为权威的 Legacy CLI Label 替换为 `node-zlib-gzip-sync`；§11.4 仅保留显式 Non-authoritative Historical Comparison。
2. 在 Generated Manifest 中记录唯一 `compressionProfileId`，不得记录外部 CLI Authority。
3. 保持 §11.4 定义的 Exact Stable Serialization、Node Version 和 Zlib Options。
4. 从 Generated Payload 移除 `currentGzipBytes`、`baselineGzipBytes`、`expectedGzipByteDelta` 与 `gzipHardLimitBytes`。
5. 把 Baseline、Expected Delta、Actual Bytes 与 Hard Limit 保留在 Repository-owned Build Verification Code 和本架构。
6. 使用 `d2e7354fad616824e52dfe5ca0f7cdbe6b4705cf`、`3366` Bytes 和 `node-zlib-gzip-sync` 作为 Canonical Baseline Evidence。
7. 先冻结最终 Manifest Metadata Shape，再序列化和测量。
8. 在同一进程压缩两次并证明 Byte Equality。
9. 证明 Timestamp 和 Filename Metadata 均不存在。
10. 证明压缩结果不读取或依赖 `PATH`。
11. 使用同一 Stable Serializer、Pinned Node 与 Compression Profile 测量 Final Payload。
12. 在最终 Shape 上冻结 Exact Expected Delta。
13. 强制 `32768` Bytes Hard Limit。
14. 重新生成所有 Owned Output，并证明除 Manifest-owned Change 外没有非预期 Drift。
15. 因 Generated Payload Metadata Shape 改变而提升 Manifest Schema Version。
16. 不增加第九种 Manifest Record Family。
17. 保持精确 Record Equation：

```text
105 + 27 + 27 + 14 + 1 + 3 + 3 + 1 = 181
```

18. 在同一 Package 更新 Status Block：

```text
PHASE_1_PACKAGE_3_STATUS=COMPLETE
PHASE_1_PACKAGE_3A_STATUS=COMPLETE
NEXT_CANONICAL_WORK_PACKAGE=PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE
MANIFEST_COMPRESSION_PROFILE_STATUS=ACTIVE
```

Required Reversible Negative Probes：

1. 修改 Profile ID，证明 Verifier 失败。
2. 修改一个 Compression Option，证明 Verifier 失败。
3. 修改 Expected Delta，证明 Verifier 失败。
4. 增加 Unknown Record Family，证明 Generation 失败。
5. 修改一个 Record Count，证明 Record Equation 失败。
6. 证明 Generated Payload 不包含任何 Forbidden Size Self-reference Field。

所有 Probe 必须在完成前撤销，不得成为 Test、Fixture、Mock、Snapshot 或 Evidence File。

Verification：

```text
pnpm tokens:schema
pnpm tokens:build
pnpm tokens:check
pnpm check:arch
pnpm verify
git diff --check
```

Acceptance：

```text
MANIFEST_COMPRESSION_PROFILE_ID=node-zlib-gzip-sync
MANIFEST_SCHEMA_VERSION=5
MANIFEST_RECORD_COUNT=181
MANIFEST_CANONICAL_BASELINE_BYTES=3366
MANIFEST_CANONICAL_FINAL_GZIP_BYTES=5213
MANIFEST_CANONICAL_EXPECTED_GZIP_BYTE_DELTA=1847
MANIFEST_HARD_LIMIT=PASS
MANIFEST_EXPECTED_DELTA=PASS
MANIFEST_GENERATION=DETERMINISTIC
MANIFEST_COMPRESSION_HEADER_METADATA=ABSENT
MANIFEST_COMPRESSION_PATH_DEPENDENCY=ABSENT
MANIFEST_PAYLOAD_SIZE_SELF_GOVERNANCE=ABSENT
ARCHITECTURE_IMPLEMENTATION_ALIGNMENT=PASS
```

Package 3A 不得修改 Dependency、Lockfile、Theme Source、Preference Schema、Runtime、Router、API、Auth 或从属 Workflow。任何额外 Write Scope 都必须先通过独立 Canonical Amendment。

### 4. `PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE`

状态：

```text
STATUS=COMPLETE
ENTRY_BASELINE=main@1daba84b5196e152966bd7e0f2e9e7ed8c24938f
COMPLETE_THEME_DOCUMENTS=3
COMPLETE_THEME_PLANES=12
PUBLIC_COLOR_ROLES_PER_PLANE=9
AUTHORITATIVE_COLOR_VALUES=108
ABSOLUTE_COLOR_VALUES=108
PRIMITIVE_ALIAS_VALUES=0
LEGACY_SEED_THEME_SOURCES=UNCHANGED_ACTIVE_COMPATIBILITY_INPUT
MANIFEST_SCHEMA_VERSION=6
MANIFEST_RECORD_COUNT=181
PACKAGE_EXPECTED_RECORD_COUNT_DELTA=0
PACKAGE_MANIFEST_BASELINE_GZIP_BYTES=5213
PACKAGE_MANIFEST_FINAL_GZIP_BYTES=6153
PACKAGE_EXPECTED_GZIP_BYTE_DELTA=940
CANONICAL_BASELINE_GZIP_BYTES=3366
CANONICAL_EXPECTED_GZIP_BYTE_DELTA=2787
TARGET_RUNTIME_STATUS=TARGET_INACTIVE
NEXT_IMPLEMENTATION_PACKAGE=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

为当前九个 Active Color Role 人工编写 `neutral`、`ocean`、`warm` 的四个完整 Target Plane，并产生 Target-only Static Validation Result，不提交 Evidence Artifact。新结构必须与当前三个 Legacy Theme Source Side-by-side 存在；不得删除、改写或重新解释 §13.4 的 Legacy Tuple Source，不得改变 `defaultCurrentPreference`、First Paint、Runtime、Public Export 或 Persistence。

该包不得从 Seed 生成颜色，不得激活 Target `roleContractVersion`，也不得把 Reserved Color Candidate 加入 Theme Plane。

完成结果严格保持该边界：三份 Canonical Source 的 108 个 Cell 全部是逐字段提交且未经改写的 Absolute CSS Color；Target Validator 从 Active Public Role Registry 派生 Exact Role Set，执行 Duplicate-aware Parse、Exact Theme/Plane/Role Set、sRGB、Alpha、Named Contrast、Enhanced Plane Intent、Identity Tuple、逐 Plane/Role Resolved Color Pairwise Non-equality（`DeltaEOK > 1e-6`，只拒绝颜色等价碰撞，不声明 Human-perceptibility/JND Authority）、Manifest Projection、Deterministic Generation 与 Reversible Negative Probe。现有六个 Runtime/Public Generated Artifact 保持字节不变；只有 `tokens.manifest.json` 增加嵌套 Target-only Metadata。Manifest 中的 Future Selector 只是确定性结构元数据，不生成 Theme Bank CSS、不设置 `data-theme-kind`，也不激活 `roleContractVersion`。

### 5. `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER`

状态：

```text
STATUS=COMPLETE
ENTRY=PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE=COMPLETE
RUNTIME_TARGETS_BEFORE_LANDING=TARGET_INACTIVE
RUNTIME_TARGETS_AFTER_LANDING=ACTIVE
ENTRY_BASELINE=main@2f5a28a7dbe877f96ac3d24299d892bd7bb9087f
PINIA_COORDINATE=3.0.4
PUBLIC_ROOT_EXPORT_COUNT=38
MANIFEST_SCHEMA_VERSION=7
MANIFEST_RECORD_COUNT=181
PACKAGE_EXPECTED_RECORD_COUNT_DELTA=0
PACKAGE_MANIFEST_BASELINE_GZIP_BYTES=6153
PACKAGE_MANIFEST_FINAL_GZIP_BYTES=7687
PACKAGE_EXPECTED_GZIP_BYTE_DELTA=1534
PRODUCTION_BUNDLE_BASELINE_JS_GZIP_BYTES=25996
PRODUCTION_BUNDLE_FINAL_JS_GZIP_BYTES=123935
PRODUCTION_BUNDLE_JS_GZIP_DELTA_BYTES=97939
PRODUCTION_BUNDLE_BASELINE_CSS_GZIP_BYTES=3591
PRODUCTION_BUNDLE_FINAL_CSS_GZIP_BYTES=7450
PRODUCTION_BUNDLE_CSS_GZIP_DELTA_BYTES=3859
PRODUCTION_BUNDLE_BASELINE_LAZY_CHUNKS=0
PRODUCTION_BUNDLE_FINAL_LAZY_CHUNKS=0
PRODUCTION_BUNDLE_LAZY_CHUNK_DELTA=0
NEXT_IMPLEMENTATION_PACKAGE=PAVP_FINAL_STATIC_GOVERNANCE
```

#### `PAVP_EXPLICIT_THEME_PROTOCOL_FREEZE_AMENDMENT`

```text
WORK_PACKAGE_KIND=ARCHITECTURE_ONLY
STATUS=FROZEN
IMPLEMENTATION_AUTHORITY=NONE
ALLOWED_SCOPE=Package 5 preference, Custom Theme Registry persistence, public export, structured result, first-paint metadata and active Theme Bank manifest protocol closure
PROHIBITED_SCOPE=source implementation, generated artifacts, dependency changes, lockfile changes, Package 6, Runtime Kernel, Router, general Storage, API, Auth, Observability, UI, tests and Git mutation
ACTIVATION_EFFECT=NONE_UNTIL_PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
```

该 Amendment 只闭合 Existing Package 5 的实施输入，不创建第二个 Package 5 Status Authority。它在 Package 5 Landing 前不产生 Activation Effect；当前 Package 5 已由上述唯一状态记录标记为 `COMPLETE`，其 Runtime Target 已在 Atomic Landing 中转为 `ACTIVE`。

在一个不可拆分的 Production Landing 中激活完整 Target Theme 和 Reference-only Preference。该包必须共同改变 §13.4 列出的 Schema、Default、Public Export、First Paint、Runtime Application、Application Bootstrap/Persistence、HTML/Storage Wiring、Manifest Metadata 和 Owning Static Enforcement，并实现 Exact Built-in ID Registry、Opaque Custom ID Registry、`(registryKind, themeId)`、Typed Theme Bank、Structured Migration 与 Invalid-theme Result。

Cutover 必须使用冻结的 Legacy Built-in Theme Tuple Registry。Cutover 后 `LegacyPreferenceInput` 与 `LegacySeedPreference` Shape 只读、只迁移、永不写回。Structured Migration 必须实现 §13.6 冻结的 Exact Three-branch Result；`PREFERENCE_INPUT_INVALID` 不创建 General Error Registry，也不改变 Reader、Storage 或 Default Ownership。不得分拆为 Schema Package 和 Runtime Package，不得在 `main` 形成 Mixed Authority。

Package 5 是 Phase 1 唯一允许增加 Pinia 的 Package，且只允许加入 `apps/web`，用于：

```text
appearance Stored Preference
custom Theme Registry orchestration
effective-state derivation orchestration
application-owned persistence lifecycle
```

Architecture-only Amendment 当时没有冻结 Exact Dependency Coordinate；Package 5 Deterministic Implementation 已选择并由 Project Configuration Owning Gate 精确冻结 `pinia@3.0.4`，且只允许作为 `apps/web` 的 Direct Dependency。

Package 5 不得增加 Router、TanStack Query、VeeValidate、Vue I18n、OpenAPI Tooling、Session Store、General Store 或 `packages/ui` Runtime Dependency。Pinia、Theme/Preference Schema、Default、Registry、First Paint、Runtime、Bootstrap、Persistence、HTML Storage Wiring、Manifest 和 Owning Verification 必须在同一 Atomic Landing 中激活；不得先建立临时 Global State Layer。

Package 5 Completion Evidence：

```text
IMPLEMENTATION_TASKS_COMPLETE=22_OF_22
STABLE_GENERATED_TOKEN_NAMES_SHA256=15a95705fd99a7a4be1169ea734975c12e1d7a1f3897276002064c04b1c0cb8c
STABLE_GENERATED_TOKENS_SHA256=90fd7f11153319b683cb6f79a9beb3a88eac7e2d9a34c966aed1f6e5b5808464
STABLE_GENERATED_UNOCSS_THEME_SHA256=418e1bc8b6b6fa3db431d14f45ee54bd00fc95b19f116d87f5034e9790405840
EXACT_PUBLIC_ROOT=PASS
EXACT_PREFERENCE_AND_MIGRATION_RESULTS=PASS
CUSTOM_REGISTRY_FULL_SNAPSHOT_REJECTION=PASS
THEME_BANK_COMPLETENESS_AND_ISOLATION=PASS
FIRST_PAINT_BUILTIN_ONLY_CUSTOM_HANDOFF=PASS
PINIA_TRANSACTION_OWNER_AND_ROLLBACK=PASS
STORAGE_OWNER_AND_DIRECT_ACCESS_BOUNDARY=PASS
MANIFEST_ACTIVE_FLAT_SHAPE=PASS
GENERATED_ARTIFACT_DETERMINISM=PASS
OWNING_STATIC_GATE=PASS
PRODUCTION_RELEASE_ACCEPTANCE=OWNER_EXTERNAL_RUNTIME_MATRIX_REQUIRED
```

上述 Completion Evidence 由当前 Atomic Diff、Generated Production Artifact、Owning Static Gate 与任务报告组成，不创建 Test、Fixture、Screenshot、Trace 或 Evidence File。Static Package Completion 不替代 §32.3 对含 Runtime Artifact Release 的 Owner External Runtime Acceptance。

### 6. `PAVP_FINAL_STATIC_GOVERNANCE`

状态：

```text
STATUS=COMPLETE
ENTRY=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER=COMPLETE_AND_STATICALLY_PASSING
FOUNDATION_VISUAL_LITERAL_GUARDRAILS=ACTIVE
NO_TRANSITION_ALL=ACTIVE
INACTIVE_CAPABILITY_IMPORT_GUARD=ACTIVE
PROCESS_RUNTIME_PREFLIGHT=ACTIVE_FIRST_VERIFY_GATE
NODE_PROCESS_AUTHORITY=24.15.0_EXACT
PNPM_PROCESS_AUTHORITY=10.34.5_EXACT
ROOT_ENGINES=NODE_24_15_0_AND_PNPM_10_34_5_EXACT
EARLIER_PACKAGE_VALIDATOR_CONFLICT=NONE
RUNTIME_SOURCE_CHANGE=NONE
GENERATED_ARTIFACT_CHANGE=NONE
NEXT_IMPLEMENTATION_PACKAGE=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
```

本包只完成此前已准入合同的跨包最终闭包。Packages 1–5 的 Existing Owning Checker 已完整拥有 Exact-set、No-leak、No-seed、No-correction、Theme Bank、Density Isolation、UnoCSS Completeness、Migration 和 First-paint Drift；Package 6 未复制或补交这些 Earlier-package Core Validator。Package 6 激活 Foundation-wide Visual Literal、`transition: all`、Inactive Capability Import、Exact Process Runtime Preflight 与 Exact Engines Guardrail，并通过 Reversible Negative Probe、`pnpm verify` 与 `git diff --check`。Browser Rule Synchronization 已由 Package 1 完成，本包没有接收、延迟或补交 Browser/Runtime-acceptance Sync。

### Future Admission Gate: `PAVP_FUTURE_PUBLIC_ROLE_ADMISSION_AMENDMENTS`

Future Density、Foundation、Phase 2、Phase 3 和 Phase 4 Candidate 都必须先通过独立 Architecture Admission Amendment。每次 Amendment 必须显式修改 Active Public Role Registry、Theme Plane Set、Alpha、Named Contrast、UnoCSS、固定 Manifest Equation 下的 Records 与 Expected Record/Canonical Compressed-byte Deltas、Migration 和全部 Generated Output；Reserved Catalog 本身不构成实现许可。

§14.2 的十个新增 Density Candidate、§13.3 的 283 个 Reserved Color Candidate 均受此 Gate。Component-internal Token 继续 Demand-created。该 Gate 不阻塞当前六包 Immediate Chain 的完成，也不允许 Final Governance 预先宣称未来 Candidate 已准入。

每个 Work Package 必须在进入下一包前通过适用的 Static Production Gate。所有 Package 都必须保持 Demand-created Directory、No-test Policy、Codex Browser Prohibition、No Browser Evidence 和 Public/Internal Isolation。Owner 手工观察不阻塞 Codex Package Completion；包含 Runtime Artifact 的 Production Release 仍受 §32.3 Owner External Runtime Acceptance 约束。每个 Package 必须实现自己的 Owning Validator，不得把 Enforcement 推迟到 Final Governance。

所有未来目录继续遵守 Demand-created Rule。Grid、Editor、Charts、Clear-media Material、Spring Family 和 Component Token Tree 保持在后续 Gate。

## 37.2 Frozen Future Implementation Chain

```text
CAPABILITY=FUTURE_IMPLEMENTATION_CHAIN
CAPABILITY_STATUS=TARGET_INACTIVE
SEQUENCING=STRICT_SERIAL
PARALLEL_PACKAGES=PROHIBITED
TEMPORARY_AUTHORITIES=PROHIBITED
PACKAGE_COMPLETION_REQUIRES=OWNING_STATIC_GATE_PASS
PRODUCTION_RELEASE_REQUIRES=SECTION_32_3_OWNER_ACCEPTANCE_WHEN_RUNTIME_CHANGES
```

精确顺序：

```text
1.  PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE
2.  PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
3.  PAVP_FINAL_STATIC_GOVERNANCE
4.  PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
5.  PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION
6.  PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
7.  PAVP_API_TRANSPORT_IMPLEMENTATION
8.  PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION
9.  PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION
10. PAVP_FIRST_PROTECTED_VERTICAL_SLICE
11. DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
```

每个 Package Record 必须声明：

```ts
interface ImplementationWorkPackageContract {
  id: string
  entryConditions: readonly string[]
  allowedScope: readonly string[]
  prohibitedScope: readonly string[]
  outputs: readonly string[]
  machineGates: readonly string[]
  productionReleaseAcceptance: string
  completionEvidence: readonly string[]
}
```

Completion Evidence 只存在于 Commit/Diff、Generated Production Artifact、Static Gate Output 和当前任务报告；不得提交 Test、Fixture、Screenshot、Trace 或 Evidence File。任一 Package 失败时停止 Chain，修复或显式 Revert；不得让后续 Package 绕过失败边界。

### 37.2.1 `PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE`

```text
ENTRY=PAVP_ARCHITECTURE_FOUNDATION_FREEZE=FROZEN; PAVP_MANIFEST_GZIP_CANONICAL_ALIGNMENT=COMPLETE
ALLOWED=three built-in target theme documents, target schema/build validation, target-only manifest metadata
PROHIBITED=active preference/default/runtime/first-paint/public export/persistence change; seed generation; reserved role admission; neutral alias or derived color
OUTPUT=neutral/ocean/warm × four planes × nine exact public color roles = 108 manually authored cells
MACHINE_GATES=tokens schema/build/check; exact role/plane/alpha/contrast validation; manifest declared delta; check:arch; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=NOT_APPLICABLE_TARGET_STRUCTURE_REMAINS_INACTIVE
COMPLETION_EVIDENCE=complete source documents; deterministic generated check result; clean scoped diff; no runtime change
```

`neutral` 的 36 个 Cell 必须全部是人工提交的显式 Absolute Color；`ocean` 与 `warm` 的 Cell 可以是显式 Absolute Color 或允许的 Direct Primitive Alias。每个 Cell 都保留作者来源。Neutral 是 Product Default Theme，但不能成为其他 Theme/Plane 的继承 Parent、缺失值 Fallback 或自动修正来源。

### 37.2.2 `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER`

```text
ENTRY=PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE=COMPLETE; PAVP_EXPLICIT_THEME_PROTOCOL_FREEZE_AMENDMENT=FROZEN; all built-in themes pass complete-plane validation; Legacy Built-in Theme Tuple Registry frozen
ALLOWED=direct ExplicitThemePreference persistence; exact post-Vue Custom Theme Registry Snapshot; exact Design System public root; frozen cross-package results; Pinia narrow admission; Built-in-only synchronous First Paint; post-Vue Custom Theme restoration; Theme Bank; app appearance bootstrap/persistence; preference-only HTML storage wiring; active flat Theme and exact First Paint Manifest metadata; owning validators
PROHIBITED=additional preference envelope; synchronous Custom Theme First Paint; data-theme-registry-storage-key; legacy writer; partial Registry recovery; automatic theme correction; general Storage/CAS/cross-tab/quarantine/principal/IndexedDB; Router; TanStack Query; Session/Auth/Permission; Observability; General Store; UI runtime component; partial legacy/new authority
OUTPUT=one direct ExplicitThemePreference authority at pavp:web:user-preference; complete CustomThemeRegistrySnapshot at pavp:web:custom-theme-registry; reference-only Product Default; exact built-in/custom registry; atomic Custom Bank installer; exact structured results; active Built-in Theme Manifest Bank metadata; exact First Paint metadata; no active legacy public or writer surface
MACHINE_GATES=exact schema/default/public-root/result/runtime/first-paint/storage/manifest parity; no mixed authority; full Snapshot rejection and deletion safety; bank completeness/isolation; exact three-branch preference migration classification; malformed-JSON reader ownership; invalid-parsed-input and legacy theme-completion separation; no default substitution or automatic Storage mutation; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_FIRST_PAINT_AND_ATOMIC_APPEARANCE_MATRIX
COMPLETION_EVIDENCE=all cutover surfaces in one diff/landing; no legacy writer created; legacy read-only migration preserved; final Manifest discriminator/count/gzip and production bundle deltas deterministically measured; static gates pass
```

`PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER` 不得拆成 Schema、Runtime 和 Persistence 多个 Main Landing。

### 37.2.3 `PAVP_FINAL_STATIC_GOVERNANCE`

```text
ENTRY=PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER=COMPLETE_AND_STATICALLY_PASSING
ALLOWED=cross-package validators for already active Phase 1 contracts; architecture-frozen no-literal, no-transition-all and inactive-import guardrails that require no future dependency, schema or runtime activation
PROHIBITED=new public role; new dependency; runtime feature; Browser/Test infrastructure; postponed owning validator
OUTPUT=exact-set/no-leak/no-seed/no-correction/theme-bank/density-isolation/migration/first-paint enforcement closure; foundation-wide visual literal guardrails; exact Node/pnpm process preflight as first verify gate; exact engines alignment
MACHINE_GATES=runtime mismatch fails before format check; all Phase 1 domain checks; reversible negative probes; pnpm verify; git diff --check
PRODUCTION_RELEASE_ACCEPTANCE=NOT_APPLICABLE_IF_NO_RUNTIME_ARTIFACT_CHANGES; otherwise required for affected Appearance domain
COMPLETION_EVIDENCE=every Phase 1 invariant mapped to one active checker; exact runtime mismatch probe fails first; negative probes reverted; clean generated state
```

Final Governance 只能闭合已准入规则，不能为早期 Package 补交其本应拥有的核心 Validator。

### 37.2.4 `PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION`

当前状态：

```text
STATUS=COMPLETE
IMPLEMENTATION_COMMIT=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
RUNTIME_KERNEL_CAPABILITY_STATUS=ACTIVE
CORE_RUNTIME_CONFIGURATION_STATUS=ACTIVE
CORE_ERROR_HANDLING_STATUS=ACTIVE
OWNING_STATIC_ENFORCEMENT_STATUS=ACTIVE
STATIC_PACKAGE_COMPLETION=PASS
PRODUCTION_BUNDLE_COMPRESSION_PROFILE=node-zlib-gzip-sync
PRODUCTION_BUNDLE_CANONICAL_MEASUREMENT_RELEASE_SHA=3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
PRODUCTION_BUNDLE_MEASUREMENT_RELEASE_SHA_OCCURRENCES=EXACTLY_ONE_AFTER_CURRENT_IDENTITY_VALIDATION
PRODUCTION_BUNDLE_FINAL_JS_GZIP_BYTES=132064
PRODUCTION_BUNDLE_FINAL_CSS_GZIP_BYTES=7457
PRODUCTION_BUNDLE_FINAL_LAZY_CHUNKS=0
PRODUCTION_RELEASE_ACCEPTANCE=NOT_CLAIMED_BY_STATIC_PACKAGE_COMPLETION
NEXT_CANONICAL_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
```

Production Bundle Gate 必须先对真实产物执行当前完整 `HEAD` Release SHA、Build Version 与
Runtime Configuration 的 Exact Identity Validation；真实产物、文件名、Runtime Configuration
Artifact 和 Compiled Identity 不得被改写。只有在该验证通过后，Owning Bundle Checker 才能在内存中的
Gzip Measurement Input 内，把 Initial JavaScript 中恰好一处已验证的当前 Release SHA 替换为上方固定的
Runtime Kernel Implementation Commit。零处或多于一处替换都必须失败。该固定长度归一化只移除 Commit
Identity 的压缩熵，使 Exact Byte Delta 继续只响应 Production Code、Dependency 和 Build Output Structure
变化；它不是 Budget 容差、Artifact 变更、Release Identity Fallback 或任意 Expected Value 更新许可。

#### `PAVP_RUNTIME_KERNEL_PROTOCOL_FREEZE_AMENDMENT`

```text
WORK_PACKAGE_KIND=ARCHITECTURE_ONLY
STATUS=FROZEN
IMPLEMENTATION_AUTHORITY=NONE
ALLOWED_SCOPE=Runtime Configuration artifact and compatibility contract; current Core Error Registry records; configuration-first startup and global failure-capture ownership; bounded startup configuration retry; current Bootstrap Step Registry
PROHIBITED_SCOPE=source implementation; dependency or lockfile changes; Router; general Storage; Query; API; Auth; Session; Permission; I18n; Observability; Deployment integration; Shared UI; Layout; business pages; tests; browser infrastructure; Git mutation
ACTIVATION_EFFECT=NONE_UNTIL_PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION
```

该 Amendment 在 Freeze 时只闭合 Existing Runtime Kernel Work Package 的 Protocol Input，不创建第二个 Runtime Kernel Status Authority，当时不激活 Capability，也不授权 Source Implementation。它继续作为 Historical Protocol Authority；当前 Implementation/Capability Status 只由本节上方 Current Status、§1.3 与 §19.4 的同步记录决定，不重写其 Frozen Contract。

以下 `ENTRY`、`ALLOWED`、`PROHIBITED`、`OUTPUT`、`MACHINE_GATES` 与 `COMPLETION_EVIDENCE`
是 Router 准入前完成的 Base Runtime Kernel Historical Landing Record；其中 Exact Nine-step Kernel
与 Router Prohibition 只描述该 Package 当时的完成边界，不是当前状态。当前 Exact Ten-step Kernel、
Active Router 与 Router/History Lifecycle 只由 §19.4 和 §37.2.5 的同步记录拥有。

```text
ENTRY=PAVP_FINAL_STATIC_GOVERNANCE=COMPLETE; PAVP_RUNTIME_KERNEL_PROTOCOL_FREEZE_AMENDMENT=FROZEN; no overlapping dirty change
ALLOWED=exact runtime-configuration.json artifact and production HTML carrier; strict five-field Core Runtime Configuration validation and compatibility; root Build Version, single-read Release SHA and root-only deployment-base build integration; existing Workspace Catalog Zod coordinate as direct apps/web dependency; exact four-record Core Error Registry, built-in message keys, normalizer and global capture; exact nine-step configuration-first Bootstrap Registry; active Package 5 Appearance and Pinia provider integration; non-Vue configuration failure and startup fatal boundaries; single user-triggered configuration retry; reverse disposal and sole HMR ownership; existing static-owner extensions
PROHIBITED=Router; general Storage; Query; API; Auth; Session; Permission; I18n; Observability; Deployment integration beyond exact root-only compatibility; Shared UI; Layout; business pages; placeholder provider or step; hidden singleton; test or browser infrastructure
OUTPUT=generated/deployed runtime-configuration.json with exact compiled/runtime identity parity; one recursively immutable Core Runtime Configuration authority; exact four-record Core Error Registry; acyclic nine-step Kernel for Pinia and Appearance only; unique Mount; exact startup state and bounded configuration recovery; one reverse disposer; one private HMR owner; future providers absent
MACHINE_GATES=runtime artifact/carrier/schema/build/release/base/First Paint parity; exact Core Error Registry and context closure; bootstrap registry parity; dependency graph acyclic; exact listener lifetime; one-retry policy; current provider-set closure; mount uniqueness; exact reverse disposal and HMR ownership; inactive-capability absence; unchanged Package 5 Appearance; bundle budget; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_STARTUP_FAILURE_RETRY_DISPOSAL_AND_HMR_APPLICABLE_BEHAVIOR
COMPLETION_EVIDENCE=kernel owns sole mount; emitted artifact and production HTML carrier match the frozen contract; all four Core Error records and nine active steps match exact registries; all current providers have handles; one user retry and full reread are enforced; future provider steps remain absent and TARGET_INACTIVE
```

后续 Package 通过 Kernel 的 Exact Provider Admission 扩展启动序列；不得提前提交 No-op Provider 或 Stub。

### 37.2.5 `PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION`

当前状态与 Landing Evidence：

```text
STATUS=COMPLETE
ROUTER_CAPABILITY_STATUS=ACTIVE
OWNING_STATIC_ENFORCEMENT_STATUS=ACTIVE
STATIC_PACKAGE_COMPLETION=PASS
ROUTER_PRODUCTION_RUNTIME_ACCEPTANCE=PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
PRODUCTION_RELEASE_ACCEPTANCE=PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
VUE_ROUTER_COORDINATE=5.2.0
VUE_ROUTER_DECLARATION_PATCH_PATH=patches/vue-router@5.2.0.patch
VUE_ROUTER_DECLARATION_PATCH_SHA256=e4fe623a687b26d8b0473e884fcbe1311f55a0e91d13b7a0f6f71b4aac1e48be
VUE_ROUTER_DECLARATION_PATCH_CHANGED_FILES=1
VUE_ROUTER_DECLARATION_PATCH_HUNKS=1
VUE_ROUTER_DECLARATION_PATCH_CHANGED_DECLARATIONS=3
VUE_ROUTER_DECLARATION_PATCH_EXACT_CHANGES=name,path,hash optional types widened only with undefined
STRICT_TYPESCRIPT_POLICY=strict=true; exactOptionalPropertyTypes=true; skipLibCheck=false
VUE_ROUTER_TYPE_COMPATIBILITY_PROBE=PASS
ROUTE_REGISTRY_RECORDS=8
ERROR_ROUTE_REGISTRY_RECORDS=7
ROUTER_ERROR_RECORDS=6
COMBINED_CORE_PLUS_ROUTER_ERROR_RECORDS=10
ACTIVE_AUTH_SUBSET=public
ACTIVE_DATA_PREFETCH_SUBSET=none
ACTIVE_GUARD_STAGES=5
ACTIVE_REDIRECT_RECORDS=0
ACTIVE_DYNAMIC_ROUTE_RECORDS=0
CURRENT_RUNTIME_KERNEL_STEP_COUNT=10
RUNTIME_KERNEL_LIFECYCLE_OWNER=sole Mount,disposal and top-level HMR owner
GENERATED_DTS_OWNER=official vue-router@5.2.0 generator verbatim output
GENERATED_DTS_PATH=apps/web/src/route-map.d.ts
OFFICIAL_GENERATED_DTS_REGENERATION_EQUALITY=PASS
PRODUCTION_BUNDLE_COMPRESSION_PROFILE=node-zlib-gzip-sync
PRODUCTION_BUNDLE_LAZY_ROUTE_CHUNKS=8
PRODUCTION_BUNDLE_HARD_BUDGET_STATUS=PASS
PRODUCTION_BUNDLE_ACCEPTANCE_AUTHORITY=real artifact identity plus canonical budgets and exact lazy-route structure
NEXT_CANONICAL_WORK_PACKAGE=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
```

该 `COMPLETE` 只表示 Repository Implementation 与 Static Owning Contract 已闭合。它不替代 §32.3 的 Owner External Runtime Matrix，不声明 Production Release Acceptance，也不授权自动开始 Storage。Host-local Router gzip exact-byte snapshot 不是本 Package 的 Canonical Acceptance Contract；Bundle Gate 继续以真实 Artifact Identity、单一冻结 Compression Profile、Canonical Hard Budgets 与精确八个 Lazy Route Chunk 结构作出判定。

```text
ENTRY=PAVP_PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION=COMPLETE; PAVP_ROUTER_PROTOCOL_FREEZE_AMENDMENT=FROZEN; PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT=FROZEN; exact patched vue-router@5.2.0 dependency admission passes; no unexplained overlapping dirty change
ALLOWED=exact vue-router@5.2.0 Catalog admission and apps/web consumption; exact temporary pnpm-managed declaration-only compatibility patch frozen by PAVP_VUE_ROUTER_TYPE_COMPATIBILITY_AMENDMENT; official vue-router/vite file-route generation before Vue plugin; exact §9.0.1 Official Generated DTS Type-only Import at apps/web/src/route-map.d.ts; exact eight-record Route Registry; exact route/meta/reference/schema registries; exact six-record Router Error extension; exact seven Error Routes; exact five-stage Guard projection; typed navigation results; empty Redirect and Dynamic Route registries; narrow reading-document layout; native document scroll owners; exact scroll/focus restoration; one create-and-ready-router Kernel step
PROHIBITED=unplugin-vue-router; Repository-authored or Runtime vue-router/experimental Import or Use; any Repository-owned Generated Artifact Experimental Import outside the exact §9.0.1 Official Generated DTS Type-only Import; experimental Data Loaders, Router Resolver or Param Parsers; Generated DTS manual patch, post-processing, replacement or second generator; routeId; direct server fetch; non-none Query prefetch before API package; anonymous-only or required Auth activation; Session/Auth/Permission placeholder; business protected flow; Dynamic Route Manager; Auth Return URL helper; automatic Chunk Reload before Observability/Deployment; Shared UI; App Shell; test or browser infrastructure
OUTPUT=one Router and one History authority; typed eight-route navigation lifecycle with active Auth subset exactly public and active dataPrefetch subset exactly none; exact Error/Title/Message/Telemetry/Layout/Scroll/Focus closure; exact current ten-step Runtime Kernel; application remains unmounted until router.isReady succeeds
MACHINE_GATES=exact dependency/patch selector/path/content/hash/snapshot/fail-closed-policy equality; exact unpatched and patched TS2430 compatibility probe with unchanged strict TypeScript policy; exact plugin/import/provenance/source/generated-map equality; exact Official Generated DTS path/source/import-kind/symbol-set/exception-import-declaration-AST equality; official regeneration equality under exact coordinate/configuration/input; no Repository-authored or Runtime experimental import; no Generated DTS post-processing or second generator; route/registry identity and cardinality; meta/params/query/reference closure; exact guard projection; empty redirect/dynamic sets; redirect safety; typed outcome and failure classification; error registry extension; hook/history disposal; base parity; exact ten-step Kernel; current Appearance preservation; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_NAVIGATION_ERROR_ROUTES_SCROLL_FOCUS_AND_CHUNK_RECOVERY
COMPLETION_EVIDENCE=one Router authority; one History authority; exact temporary vue-router@5.2.0 three-declaration patch with no runtime or metadata change; exact eight source/name/path records with no separate routeId; no Repository-authored or Runtime experimental imports; sole generated apps/web/src/route-map.d.ts type-only import matches §9.0.1 Exact Provenance; no placeholder owner; no server-state cache; current Runtime Kernel extended from nine to ten steps only in the Router landing
```

`dataPrefetch` 只能使用 `none`，`auth` 只能激活 `public`，直到后续 Owner Package 原子准入。`anonymous-only` 与 `required` 只保留 Schema 可用、Runtime Inactive；`unknown/restoring` 不得作为 Anonymous，也不得用 Session Stub、No-op Guard 或 Unconditional Anonymous Projection 绕过。

### 37.2.6 `PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION`

当前状态：

```text
STATUS=NEXT
CAPABILITY_STATUS=TARGET_INACTIVE
IMPLEMENTATION_STATUS=NOT_STARTED
```

```text
ENTRY=PAVP_ROUTER_GOVERNANCE_IMPLEMENTATION=COMPLETE; storage/envelope/partition/migration registries frozen; sensitivity review complete
ALLOWED=application storage owner; exact registries; storage error-registry extension; envelope/migrations; corruption/quota results; cross-tab channel; preference/theme safe ordering; kernel storage step
PROHIBITED=credential/session/query persistence; IndexedDB without separate demand gate; feature direct storage; generic persistence plugin
OUTPUT=typed Local Storage and memory boundaries; compare-and-swap revisions; principal-ready partition interface; deterministic cleanup handles
MACHINE_GATES=direct-access ban; key registry equality; migration chain; sensitive-field scan; cross-tab allowlist; atomic ordering; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_MIGRATION_CORRUPTION_QUOTA_CROSS_TAB_AND_CLEANUP
COMPLETION_EVIDENCE=no raw key outside owner/generated first paint; failures structured; bad payload cannot loop; theme reference cannot dangle
```

Principal Partition Interface 可以存在，但 Auth-specific Principal 数据与 Session Cleanup 只能由 `PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION` 激活。

### 37.2.7 `PAVP_API_TRANSPORT_IMPLEMENTATION`

```text
ENTRY=PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION=COMPLETE; API registries and runtime config origins frozen; first real typed endpoint or protected-slice endpoint contract accepted
ALLOWED=Native Fetch transport; API runtime-config field and error-registry extensions; AbortSignal; Zod boundaries; TanStack Query admission; Query Client kernel step; OpenAPI types only when reliable schema gate passes; Router Query integration
PROHIBITED=openapi-fetch mandatory dependency; Axios/Alova; Auth refresh; mutation default retry; direct fetch; Query-to-Pinia copy; offline cache
OUTPUT=single-attempt transport; response modes; error normalization; retry/idempotency/cache/concurrency policies; query key registry; diagnostics redaction
MACHINE_GATES=direct fetch ban; endpoint/policy/schema closure; abort propagation; 204/content-type/error-body handling; retry matrix; OpenAPI drift; query ownership; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_SUCCESS_ERROR_TIMEOUT_ABORT_RETRY_204_UPLOAD_DOWNLOAD_AND_CONFLICT_APPLICABLE_PATHS
COMPLETION_EVIDENCE=one transport authority; one Query cache; no unvalidated response; no raw timeout/retry/cache literal
```

`PAVP_API_TRANSPORT_IMPLEMENTATION` 激活 Router `blocking-required/non-blocking` Prefetch 子集，并必须保持 Router 只编排 Query Options、不拥有 Cache。

### 37.2.8 `PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION`

```text
ENTRY=PAVP_API_TRANSPORT_IMPLEMENTATION=COMPLETE; server auth/cookie/CSRF/session/capability contract available; security review passes
ALLOWED=session state machine; auth error-registry extension; restoration/login/logout/refresh single-flight; cookie/CSRF coordination; permission registry; partitions; dynamic protected routes; kernel session step
PROHIBITED=token in browser storage; client security authority; scattered role strings; mutation replay; unpartitioned Query cache; partial logout
OUTPUT=server-authoritative session and capability projection; 401/403 separation; cross-tab logout; account/tenant switch; safe return URL
MACHINE_GATES=transition exhaustiveness; refresh single-flight; sensitive persistence ban; permission closure; query/storage/route cleanup order; CSRF config; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_RESTORE_LOGIN_LOGOUT_REFRESH_EXPIRY_REVOCATION_401_403_CROSS_TAB_AND_SWITCH
COMPLETION_EVIDENCE=no credential in JS persistence; every protected route/operation references registry; cleanup leaves no prior principal state
```

### 37.2.9 `PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION`

```text
ENTRY=PAVP_AUTH_SESSION_PERMISSION_IMPLEMENTATION=COMPLETE; deployment/runtime config/event/error/performance registries frozen; provider and hosting contracts accepted
ALLOWED=observability registry/reporting activation; privacy-safe structured capture; private source-map upload; observability/runtime delivery-config extension; base/subpath; CSP/cache/release/rollback integration
PROHIBITED=PII/raw body logs; recursive reporter; public source maps; unsafe CSP; browser automation; repository evidence artifact
OUTPUT=release-aware error/trace/performance pipeline and immutable deploy/rollback contract
MACHINE_GATES=registry/schema closure; redaction scan; source-map public exclusion; CSP/cache/base/release manifest checks; bundle budget; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_REPORTING_FAILURE_CSP_CONFIG_SUBPATH_CACHE_RELEASE_AND_ROLLBACK
COMPLETION_EVIDENCE=release traceable to commit/config/assets; reporting failure cannot recurse; rollback selects complete immutable release
```

### 37.2.10 `PAVP_FIRST_PROTECTED_VERTICAL_SLICE`

```text
ENTRY=PAVP_OBSERVABILITY_DEPLOYMENT_IMPLEMENTATION=COMPLETE; all earlier chain packages remain complete; one real protected product flow and backend contract approved; foundational UI consumer gates pass
ALLOWED=one typed protected route and the minimum feature/UI needed to prove all active platform boundaries
PROHIBITED=second business flow; generic platform expansion; speculative component variants; specialist vendor without gate
OUTPUT=end-to-end protected slice exercising startup, route, session, permission, Query, API, mutation, storage, errors, observability, deployment and cleanup
MACHINE_GATES=all existing static gates; route/API/schema/permission/query/storage registries; boundary imports; bundle budget; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FULL_APPLICABLE_MATRIX
COMPLETION_EVIDENCE=single real flow proves contracts without duplicate authority; no unresolved P0/P1 release failure
```

Minimum Slice Scenarios：Typed protected route、Session Restore、Auth Redirect/Return URL、403/404/500、Query Prefetch/Cancel、200/201/202/204、Timeout/User Abort、Idempotent/Non-idempotent Mutation、409/412、Logout Cache Cleanup、Cross-tab Logout、Corrupt Storage Recovery、Scroll Restoration、Runtime Error Report 和 Release/Rollback Identity。

### 37.2.11 Demand-driven Forms, I18n, Tables and UI Admissions

```text
STAGE_ID=DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS
STAGE_KIND=REPEATABLE_STRICT_SERIAL_ADMISSION_TEMPLATE
CAPABILITY_STATUS=TARGET_INACTIVE
ENTRY=PAVP_FIRST_PROTECTED_VERTICAL_SLICE=COMPLETE; one named real consumer for the requested capability; stable dependency and bundle gate passes
ALLOWED=one capability instance at a time following Sections 16 and 21–25 plus applicable Accessibility/Performance contracts; minimum exact Runtime Configuration field extension required by that domain; minimal semantic UI required by the consumer; generator only after repeated real scaffolding need
PROHIBITED=parallel unrelated capability packages; ProForm/ProTable platform; speculative variants; prerelease dependency; second UI authority
OUTPUT=one consumer-backed form/i18n/table/motion/component/generator capability instance with exact registries, public root export and private vendor adapter where required
MACHINE_GATES=domain contract checks; public/internal boundary; stable dependency; accessibility; unused code; bundle budget; pnpm verify
PRODUCTION_RELEASE_ACCEPTANCE=REQUIRED_FOR_EACH_RELEASE_AFFECTING_FORM_LOCALE_TABLE_INTERACTION_OR_UI
COMPLETION_EVIDENCE=one real consumer; one uniquely named architecture-admitted PAVP work-package ID; narrow public API; vendor isolation; all domain states and cleanup verified by static contract plus Owner release decision
```

`DEMAND_DRIVEN_FORMS_I18N_TABLES_AND_UI_ADMISSIONS` 是 Future Chain 的第十一阶段和 Work-package Template，不是一个大爆炸 Landing。每个 Instance 必须先由 Architecture Amendment 分配唯一、描述性 `PAVP_*` ID，并继承本记录的七字段；其 Entry 还必须引用上一个 Instance 的精确 ID/Complete Status。一个 Instance 只准入一个 Capability，并在完成前阻塞下一个会修改同一 Authority 的 Instance。Stage 本身不得安装依赖或产生 Runtime Artifact。

---

# 38. 延迟引入的能力

| 能力               | 引入门槛                    |
| ---------------- | ----------------------- |
| Turbo            | Package 或 CI 时间出现真实瓶颈   |
| TanStack Table   | 页面需要排序、过滤或分页            |
| TanStack Virtual | 测量证明 DOM 成为瓶颈           |
| AG Grid          | 同时出现两个以上电子表格式需求         |
| Motion for Vue   | 命名的 Layout/Gesture/Presence 需求通过 §24.1 |
| GSAP             | §24.2 Repository-defined Admission Gate 全部通过 |
| PWA              | 明确需要安装、离线、推送或后台同步       |
| Tauri            | 需要文件系统、窗口、托盘或桌面分发       |
| Capacitor        | 需要应用商店或原生设备 API         |
| IndexedDB        | Local Storage 不足或需要离线数据 |
| Rich Text Editor | 真实产品需要富文本               |
| Charts           | 真实数据可视化需求出现             |
| 第二 UI 库          | 某类组件维护成本连续超过三个月         |
| 新 Package        | 至少两个真实消费者               |
| TypeScript 7     | Vue 工具链正式兼容             |

---

# 39. 最终 Package 清单

本节是各能力通过 Phase Gate 后的允许目标，不是当前安装清单。Package Manifest 只能包含已经由真实消费者、当前 Phase 和 Admission Gate 同时批准的依赖。

## Root Dev Dependencies

```text
typescript@6
vue-tsc
vite
@vitejs/plugin-vue
unocss
@unocss/preset-wind4
@unocss/preset-icons
@iconify-json/lucide
eslint
typescript-eslint
eslint-plugin-vue
eslint-plugin-vuejs-accessibility
eslint-plugin-boundaries
@unocss/eslint-plugin
stylelint
prettier
knip
tsx
openapi-typescript
```

## `apps/web`

```text
vue
vue-router
pinia
@tanstack/vue-query
vee-validate
zod
@vueuse/core
vue-i18n
@platform/design-system
@platform/ui
```

这是通过全部 Gate 后的 Target Set。`openapi-typescript` 仅在 `PAVP_API_TRANSPORT_IMPLEMENTATION` 的可靠 Schema Owner、Input Digest、Drift 和 Generator Gate 通过后作为 Root Build Tool 准入，不是 Runtime Dependency。当前 `apps/web` 的 Direct Dependency Set 精确为 `vue@3.5.40`、`@platform/design-system`、Package 5 窄范围准入的 `pinia@3.0.4`、Runtime Kernel 准入的 `zod@4.4.3` 与 Router Landing 准入并通过 Catalog 消费的 patched `vue-router@5.2.0`；`@tanstack/vue-query`、`vee-validate`、`@vueuse/core`、`vue-i18n`、`@platform/ui` 和其他 Runtime Dependency 继续等待各自 Phase 与 Named Gate。

## `packages/design-system`

```text
zod
colorjs.io

Dev:
style-dictionary
```

## `packages/ui`

Phase 1：

```text
runtime dependencies = none
implementation source = src/index.ts only
```

未来按需准入：

| Dependency                | Admission |
| ------------------------- | --------- |
| `vue`, `@platform/design-system` | 第一个有充分理由的 Phase 2 UI Component |
| `reka-ui`                 | 第一个复杂 A11y Interaction；只允许 Private Reka Adapter 导入 |
| `clsx`                    | 已准入实现证明存在真实组合需求 |
| `motion-v`                | 命名 Interaction 通过 §24.1；只允许 Private Motion Adapter 导入 |
| GSAP                      | §24.2 全部条件通过；只允许 Private Lazy Adapter 导入 |
| Grid / Editor / Chart Vendor | 对应 Specialist Capability Gate 通过 |

Planned Dependency 不是安装许可。

---

# 40. 最终不变原则

```text
ONE_CANONICAL_ARCHITECTURE_AUTHORITY
AGENTS_MD_IS_THE_ONLY_MISSION_AND_EXECUTION_ROUTER
ARCHITECTURE_MD_IS_THE_ONLY_ARCHITECTURE_AUTHORITY
AGENTS_MD_HAS_NO_ARCHITECTURE_AUTHORITY
CURRENT_WORK_PACKAGE_IS_READ_DYNAMICALLY_FROM_ARCHITECTURE_MD
PROJECT_UI_WORKFLOW_IS_SUBORDINATE_AND_NON_AUTHORITATIVE
PROJECT_UI_WORKFLOW_CONFLICT_ACTION_IS_STOP

PAVP_FOUNDATIONS_PRECEDE_UI_INTEGRATION_AND_PRODUCT_SURFACES
THIRD_PARTY_UI_IS_PRIVATE_BEHIND_PAVP_BOUNDARIES
SHARED_UI_REQUIRES_REAL_CONSUMER_DEMAND
FINAL_SURFACE_IS_REAL_AND_ARCHITECTURE_ADMITTED_NOT_DEMO_OR_SHOWCASE

ONE_COMPLETE_BOUNDED_TASK_AT_A_TIME
NO_AUTOMATIC_ROADMAP_CONTINUATION
NO_UNREQUESTED_SCOPE_EXPANSION_REFACTOR_DEPENDENCY_CHANGE_OR_CLEANUP
NO_SPECULATIVE_FEATURE_ABSTRACTION_PROVIDER_OR_MODULE
NO_DUPLICATE_AUTHORITY
MATERIAL_CANONICAL_CONTRACT_GAP_REQUIRES_STOP_NOT_INVENTION
EVIDENCE_PRECEDES_IMPLEMENTATION_DECISIONS
NARROW_STATIC_CHECKS_DO_NOT_FREEZE_PRIVATE_IMPLEMENTATION_DETAIL

PLANNING_IMPLEMENTATION_STAGING_COMMIT_PUSH_AND_RELEASE_ARE_SEPARATE_AUTHORIZATIONS
IMPLEMENTATION_ONLY_DIFF_REMAINS_UNSTAGED_BY_DEFAULT

REPOSITORY_ONLY_PROJECT_AUTHORITY
NO_MACHINE_LOCAL_PROJECT_DEPENDENCY
EXPLICIT_REPOSITORY_READABILITY_NOT_UNIVERSAL_NATIVE_DISCOVERY
EXACT_AI_WORKFLOW_ALLOWLIST
AI_WORKFLOW_ALLOWLIST_HAS_EXACTLY_FIVE_REGULAR_FILES
NO_CLIENT_SPECIFIC_SKILL_DUPLICATION
NO_TRACKED_SYMLINKS
NO_ABSOLUTE_HOME_PATH_DEPENDENCIES
EXTERNAL_OPERATOR_CAPABILITIES_ARE_NON_AUTHORITATIVE
PATCHES_UNCONFIG_7_5_0_IS_PRESERVED_PRODUCTION_INPUT

ADAPTIVE_LIQUID_CHROME_OVER_STABLE_CONTENT
CONTENT_IS_THE_PRIMARY_VISUAL_LAYER
LIQUID_MATERIAL_IS_RESERVED_FOR_FUNCTIONAL_CHROME
MATERIAL_APPLIES_ONLY_TO_FUNCTIONAL_CHROME_AND_OVERLAYS
NO_GENERIC_GLASS_COMPONENT
NO_GLASS_ON_GLASS
NO_UIGLASS_OR_OPTICAL_PUBLIC_PROPS
SEMANTIC_VARIANTS_ARE_PUBLIC
OPTICAL_IMPLEMENTATION_VALUES_ARE_PRIVATE

COLOR_MODE_CONTRAST_AND_MATERIAL_ARE_INDEPENDENT_STORED_AXES
MATERIAL_AND_CONTRAST_ARE_INDEPENDENT_AXES
SYSTEM_IS_STORED_ONLY_AND_NOT_A_THEME_PLANE
STORED_PREFERENCE_NEVER_EQUALS_EFFECTIVE_STATE
DOM_USES_RESOLVED_COLOR_MODE_AND_EFFECTIVE_MATERIAL
EFFECTIVE_APPEARANCE_IS_DERIVED_NOT_PERSISTED
APPLICATION_OWNS_PREFERENCE_STORAGE_AND_STORAGE_KEY
DESIGN_SYSTEM_HAS_NO_HARDCODED_STORAGE_KEY
ACTIVE_PREFERENCE_AUTHORITY_IS_EMBEDDED_PALETTE_UNTIL_ATOMIC_CUTOVER
TARGET_EXPLICIT_THEME_HAS_FOUR_COMPLETE_PLANES_AFTER_ATOMIC_CUTOVER
REFERENCE_ONLY_PREFERENCE_RESOLVES_EXACT_REGISTRY_ENTRY_AFTER_ATOMIC_CUTOVER
TARGET_THEME_IDENTITY_IS_REGISTRY_KIND_AND_OPAQUE_ID_TUPLE
TARGET_CUSTOM_THEME_BANK_INSTALL_AND_REMOVAL_ARE_COMPLETE_AND_ATOMIC
NO_SEED_BASED_THEME_AUTHORITY
NO_AUTOMATIC_PALETTE_OR_SEMANTIC_COLOR_GENERATION
NO_IMPLICIT_ROLE_INHERITANCE_OR_PARTIAL_THEME_MERGE
NO_GAMUT_REMAP_OR_SILENT_CONTRAST_CORRECTION
INVALID_THEME_VALUES_ARE_REJECTED_WITH_FIELD_EVIDENCE

PROJECT_DESIGN_TOKENS_ARE_THE_ONLY_VISUAL_AUTHORITY
UNOCSS_IS_AN_EXPRESSION_ENGINE_NOT_A_DESIGN_AUTHORITY
TOKEN_VISIBILITY_CONTROLS_GENERATED_OUTPUTS
EVERY_PUBLIC_ROLE_ENTERS_CSS_TS_NAMES_UNOCSS_AND_MANIFEST
UNMAPPED_PUBLIC_ROLE_IS_A_GENERATION_FAILURE
MANIFEST_COMPRESSION_HAS_ONE_PINNED_NODE_PROFILE
MANIFEST_EXTERNAL_CLI_COMPRESSION_AUTHORITY_IS_NONE
MANIFEST_COMPRESSION_INPUT_SERIALIZATION_IS_EXACT
MANIFEST_COMPRESSED_PAYLOAD_DOES_NOT_GOVERN_ITS_OWN_BYTE_BUDGET
MANIFEST_BYTE_BASELINE_DELTA_AND_LIMIT_LIVE_OUTSIDE_THE_COMPRESSED_PAYLOAD
UI_INTERNAL_TOKENS_NEVER_ENTER_PUBLIC_TS_OR_UNOCSS
UI_INTERNAL_TOKENS_NEVER_ENTER_PUBLIC_TOKEN_NAMES
TARGET_PRIVATE_THEME_BANKS_ENTER_RUNTIME_CSS_AND_MANIFEST_ONLY_AFTER_ATOMIC_CUTOVER
TARGET_THEME_MODE_AND_CONTRAST_BIND_WITHOUT_CARTESIAN_SELECTORS
TARGET_STANDARD_AND_ENHANCED_ARE_INDEPENDENT_EXPLICIT_PLANES
CURRENT_NAMED_CONTRAST_RECORDS_DECLARE_NO_ENHANCED_DIFFERENCE_REQUIREMENT
TARGET_ROLE_ALPHA_AND_CONTRAST_REGISTRIES_SHARE_ONE_EXACT_VERSION_AFTER_ACTIVATION
EVERY_NON_SCRIM_PUBLIC_COLOR_ROLE_CLOSES_OVER_NAMED_CONTRAST_ENDPOINTS
EVERY_MATERIAL_ROLE_HAS_ADAPTIVE_REDUCED_AND_SOLID_PROJECTIONS
SOLID_IS_THE_TERMINAL_MATERIAL_FALLBACK
TEN_FUTURE_DENSITY_CANDIDATES_REQUIRE_ADMISSION_AMENDMENT
TARGET_DENSITY_VALUES_ARE_MANUALLY_AUTHORED_NOT_SCALED_AFTER_ADMISSION

PHASE_GATE_REQUIRED
PHASE_1_UI_IS_A_DEPENDENCY_FREE_SRC_INDEX_STUB
PHASE_1_PINIA_IS_ADMITTED_ONLY_BY_PACKAGE_5_ATOMIC_CUTOVER
PHASE_1_PINIA_SCOPE_IS_APPEARANCE_AND_THEME_REGISTRY_ORCHESTRATION
PHASE_1_ROUTER_QUERY_AND_OPENAPI_GENERATOR_ARE_PROHIBITED
PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION_IS_COMPLETE
PRODUCTION_RUNTIME_KERNEL_IMPLEMENTATION_COMMIT_IS_3bb664f1d81d354ccb0ec7ddcc4219d54b5d7177
RUNTIME_KERNEL_CORE_CONFIGURATION_AND_CORE_ERROR_HANDLING_ARE_ACTIVE
ROUTER_GOVERNANCE_IMPLEMENTATION_IS_COMPLETE
ROUTER_CAPABILITY_IS_ACTIVE
CURRENT_RUNTIME_KERNEL_STEP_COUNT_IS_10
ROUTER_PRODUCTION_RUNTIME_ACCEPTANCE_REMAINS_PENDING_OWNER_EXTERNAL_RUNTIME_MATRIX
NEXT_CANONICAL_WORK_PACKAGE_IS_PAVP_STORAGE_PERSISTENCE_IMPLEMENTATION
FUTURE_DIRECTORIES_ARE_DEMAND_CREATED
ONE_JUSTIFIED_CONSUMER_ADMITS_INITIAL_SHARED_COMPONENT
ADDITIONAL_EVIDENCE_DRIVES_GENERALIZATION
NEW_ABSTRACTIONS_REQUIRE_REAL_CONSUMERS

ROOT_ONLY_UI_PUBLIC_IMPORTS
ADAPTERS_AND_INTERNALS_ARE_PRIVATE
VENDOR_IMPORTS_EXIST_ONLY_IN_PRIVATE_ADAPTERS
SPECIALIST_COMPONENTS_USE_REPLACEABLE_ADAPTERS
EVERY_SHARED_BOUNDARY_HAS_A_PUBLIC_ROOT_EXPORT

NARROW_REGULAR_WIDE_ARE_CAPABILITIES_NOT_DEVICES
ONE_EXACT_PRIMARY_SCROLL_OWNER_PER_AXIS
NO_COMPETING_SAME_AXIS_SCROLL_OWNERS
NO_ACCIDENTAL_BODY_SCROLL_IN_WORKSPACE
NO_CUSTOM_SCROLLBAR_FRAMEWORK
NATIVE_SCROLL_ONLY

CSS_BEFORE_VIEW_TRANSITION_BEFORE_MOTION_BEFORE_GSAP
VIEW_TRANSITION_IS_PROGRESSIVE_ENHANCEMENT
MOTION_REQUIRES_A_NAMED_PRODUCTION_NEED
GSAP_REQUIRES_REPOSITORY_DEFINED_ADMISSION
REDUCED_MOTION_AND_FORCED_COLORS_ALWAYS_SUPPORTED
REDUCED_TRANSPARENCY_IS_ALWAYS_SUPPORTED

USER_CUSTOMIZATION_IS_COMPLETE_SCHEMA_CONSTRAINED_THEME_DATA_NOT_CSS_INJECTION
DENSITY_FONT_SCALE_TOUCH_TARGET_RADIUS_CONTENT_WIDTH_LAYOUT_Z_MOTION_COLOR_CONTRAST_AND_MATERIAL_ARE_INDEPENDENT
SERVER_STATE_BELONGS_TO_TANSTACK_QUERY
CLIENT_STORED_STATE_BELONGS_TO_PINIA

MAIN_ONLY_MAINTENANCE
PRODUCTION_ONLY_REPOSITORY
NO_TEST_DEMO_OR_BROWSER_EVIDENCE_INFRASTRUCTURE
NO_SHOWCASE_OR_RUNTIME_EVIDENCE_INFRASTRUCTURE
PNPM_VERIFY_IS_THE_COMPLETE_STATIC_PRODUCTION_GATE
STATIC_GATES_DO_NOT_CLAIM_RUNTIME_PROOF
CODEX_BROWSER_OPERATION_IS_PROHIBITED
STATIC_GATES_ARE_THE_ONLY_CODEX_VERIFICATION
OWNER_MANUAL_RUNTIME_INSPECTION_FOR_CODEX_TASKS_IS_OPTIONAL_EXTERNAL_AND_NON_GATING
OWNER_PRODUCTION_RELEASE_RUNTIME_ACCEPTANCE_IS_REQUIRED_EXTERNAL_AND_NON_REPOSITORY
NO_RUNTIME_EVIDENCE_COMMITTED

EACH_STATIC_RULE_IS_ENFORCED_BY_COMPLETION_OF_ITS_OWNING_WORK_PACKAGE
NO_FUTURE_RULE_IS_CLAIMED_ENFORCED_BEFORE_ITS_GATE
```

---

# 41. 最终架构摘要

以下是通过全部 Named Gate 后的 Target End State，不是当前 Active Implementation Inventory。当前 Authority 以文首 Status Block、§11.4 Active Registry、§13.4 Preference Transition 和 §37.1 Work-package Order 为准；带 Target 或 Future Gate 的条目在对应 Gate 接受前保持 Inactive。

```text
Node 24 LTS
+ pnpm 10 Workspace
+ TypeScript 6 Strict
+ Vue 3.5
+ Vue Router 5 Typed File Routes
+ Vite 8.1
+ UnoCSS presetWind4
+ UnoCSS presetIcons
+ DTCG 2025.10 Compatible Tokens
+ Token Visibility and Filtered Outputs
+ Versioned Exact Public Role Registry
+ Exact Alpha and Named Contrast Registries
+ Public Output Completeness
+ Pinned Node zlib Manifest Compression Profile and External Byte Governance
+ Target Explicit Complete Theme Definition
+ Four Light/Dark × Standard/Enhanced Planes
+ Private Theme Bank Projection
+ Exact Built-in and Custom Theme Registry
+ Collision-free Theme Identity and Typed Custom Bank Lifecycle
+ Style Dictionary 5.4
+ Zod 4
+ Color.js Parsing and Contrast Validation without Color Mutation
+ Runtime CSS Variables
+ Reference-only Appearance Preference after Atomic Cutover
+ Stored / Effective Appearance Separation
+ Current single-role Density behavior; future 11-role projection only after Admission Amendment
+ Complete Generated UnoCSS Public Semantics
+ Adaptive / Reduced / Solid Material
+ Adaptive Liquid Chrome over Stable Content
+ Reka UI after Phase 2 Consumer Admission
+ Progressive Demand-driven Project UI
+ Pinia
+ TanStack Vue Query
+ Native Fetch
+ OpenAPI types from openapi-typescript after the reliable-schema gate
+ VeeValidate stable major selected only at Form Admission
+ VueUse
+ Vue I18n
+ CSS / Progressive View Transitions
+ Motion for Vue after Named Interaction Admission
+ GSAP only after Repository-defined Admission
+ ESLint 10
+ Stylelint
+ Prettier
+ Knip
+ Static Production Gates
+ Codex Browser Prohibition
+ Optional External Owner-operated Manual Inspection for Codex Tasks
+ Required External Owner-operated Runtime Acceptance for Production Releases
+ GitHub Actions
```

最终规模：

```text
1 production application
2 internal packages
1 architecture authority
1 AI entry
1 subordinate repository-readable UI workflow
0 universal native workflow-discovery requirements
1 verification command
1 protected main branch
0 Phase 1 packages/ui runtime dependencies
0 placeholder future directories
0 branch-based maintenance workflows
0 automated test files
0 test-only directories
0 test-only dependencies
0 demo or showcase systems
0 automated browser-test infrastructure
```

# Foundational Architecture Values

These are native principles of Progressive Adaptive Vue Platform:

- Single Source of Truth
- Typed Contracts
- Pure Constraint Resolvers
- Public Export Boundaries
- Executable Architecture Rules
- One-command Verification
