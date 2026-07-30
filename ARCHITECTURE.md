# Progressive Adaptive Vue Platform

## 全新个人超级前端架构

```text
STATUS=CANONICAL_ARCHITECTURE_BASELINE
PROJECT_MODEL=GREENFIELD
IMPLEMENTATION_STATE=IN_PROGRESS
MAINTENANCE_MODEL=SOLO_MAIN_BRANCH
ARCHITECTURE_AUTHORITY=ARCHITECTURE.md
AI_ENTRY=AGENTS.md
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
ACTIVE_PREFERENCE_AUTHORITY=USER_PREFERENCE_EMBEDDED_PALETTE
TARGET_THEME_DEFINITION_CONTRACT=EXPLICIT_COMPLETE_THEME
TARGET_PREFERENCE_AUTHORITY=THEME_REGISTRY_REFERENCE
TARGET_PREFERENCE_STATUS=INACTIVE_UNTIL_ATOMIC_CUTOVER
PREFERENCE_CUTOVER=ATOMIC
CODEX_BROWSER_OPERATION=PROHIBITED
CODEX_VERIFICATION_MODEL=STATIC_PRODUCTION_GATES_ONLY
OWNER_MANUAL_RUNTIME_INSPECTION=OPTIONAL_EXTERNAL_NON_GATING
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

---

# 2. 版本与稳定性策略

## 2.1 生产版本基线

| 技术                 | 基线            |
| ------------------ | ------------- |
| Node.js            | `24.x LTS`    |
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
| VeeValidate        | `5.x`         |
| ESLint             | `10.x`        |

Node 官方要求生产应用使用 Active LTS 或 Maintenance LTS，Node 24 当前处于 LTS 状态；Vite 官方当前对 8.1 发布常规补丁。

项目根 `mise.toml` 固定经验证的 Node 24 补丁版本并提交到版本控制；pnpm 的精确版本继续由 `package.json#packageManager` 和 Corepack 统一选择，不在 mise 中重复声明。

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
| 表单     | VeeValidate 5              | 表单状态和错误管理           |
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
├── .npmrc
└── LICENSE
```

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

# 9. 文件路由设计

使用 Vue Router 5 内置文件路由：

```text
src/pages/
├── index.vue
├── settings/
│   ├── index.vue
│   ├── appearance.vue
│   └── layout.vue
└── projects/
    ├── index.vue
    └── [id].vue
```

页面只负责：

* 路由级数据边界。
* Feature 组合。
* Layout Capability 声明。
* 页面级 Loading、Error 和 Empty 状态。
* 页面标题和 Meta。

页面不得包含：

* 通用表单引擎。
* 通用表格引擎。
* 主题生成逻辑。
* 直接 Fetch。
* 第三方 UI 组件。
* 可复用业务逻辑。

路由 Meta：

```ts
definePage({
  meta: {
    titleKey: 'routes.settings.appearance',
    auth: 'required',
    layout: 'workspace',
    layoutCapabilities: 'appearance-editor',
  },
})
```

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
│   │   ├── neutral.theme.json
│   │   ├── ocean.theme.json
│   │   └── warm.theme.json
│   │
│   └── component/
│       └── README.md
│
├── src/
│   ├── schema/
│   │   ├── token.schema.ts
│   │   ├── legacy-seed-theme.schema.ts
│   │   ├── appearance.schema.ts
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
│   │   ├── first-paint.ts
│   │   └── theme-registry.ts                 [admitted by the explicit-theme registry package]
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
│   │   ├── unocss-theme.ts
│   │   └── tokens.manifest.json
│   │
│   └── index.ts
│
├── package.json
├── tsconfig.json
└── README.md
```

`material.tokens.json`、新增 Runtime 文件和新增 Generated 文件是 Phase 1 后续工作包的固定位置，不由架构修订本身创建。Generator Visibility 与 Selector 合同必须先于 Material Token Source 实现。

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

加入这些字段时必须提升 Manifest Schema Version。Generator 必须在 Material Source 进入前支持 `material` Namespace → `--ui-material-*` 映射。Atomic Cutover 后，Theme、Mode 与 Contrast 的 Public Color Projection 只能遵守 §13.7 的 Private Theme Bank 和 Stable Public Binding；Cutover 前保留当前 Embedded-palette Conditional Projection，不得提前混入 Target Bank。其他 Conditional Semantic Alias 必须保留 CSS `var(...)` 关系与独立单轴 Selector，不得一律压平为 Literal 或复制组合矩阵。

### Public Output Completeness

当前 Active Baseline 的 Public Role ID Contract 是下方精确 Registry；它与当前实现的 Public CSS、`tokens.ts` 和 `token-names.ts` 一致，并为当前 21 个 UnoCSS Mapping 与六个待补 Mapping 定义统一 Authority。`roleContractVersion` 是 Target Explicit-theme Contract 的版本机制，在 §13.4 的 Atomic Cutover 前不得写入当前生成输出或暗示 Target Preference 已激活。

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

当前生成物的 Baseline Evidence 为：

```text
CURRENT_TOKEN_RECORDS=105
CURRENT_ACTIVE_PUBLIC_ROLE_RECORDS=27
CURRENT_UNOCSS_MAPPING_RECORDS_IMPLEMENTED=21
CURRENT_NAMED_CONTRAST_RECORDS=10
CURRENT_NON_TEXT_BOUNDARY_RECORDS=4
CURRENT_ALPHA_RECORDS_IMPLEMENTED=0
CURRENT_DENSITY_METADATA_RECORDS=3
CURRENT_THEME_METADATA_RECORDS=3
CURRENT_FIRST_PAINT_METADATA_RECORDS=1
CURRENT_MANIFEST_GZIP_9_N_BYTES=3362
```

这些数值只描述当前仓库证据，不把尚未实现的 Registry 或 Mapping 宣称为已生成。`PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS` 必须把 27 个 Public Role、27 个 UnoCSS Mapping、14 个统一 Named Contrast Record 和 1 个 Alpha Record 接入上述精确方程，并拥有 Byte、Record 和 Growth Enforcement。

当前 Phase 的硬预算：

```text
MANIFEST_GZIP_ALGORITHM=gzip -9 -n
MANIFEST_GZIP_HARD_LIMIT_BYTES=32768
```

每个 Implementation Package 必须在变更内声明 `expectedRecordCountDelta` 与 `expectedGzipByteDelta`，由 Owning Static Gate 对实际值逐项比较；未声明或非预期增长必须失败。即使总大小仍低于 32 KiB，Delta Mismatch 也不得通过。

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

`--ui-material-*` 当前存在于 Runtime CSS；`--ui-theme-bank-*` 只在 Atomic Cutover 后进入 Runtime CSS。两者在各自激活后都不属于应用公共 Token 表面，不得进入公共 `tokens.ts`、`token-names.ts`、UnoCSS Theme、Rule 或 Shortcut，也不得由 `apps/**` 和业务 Feature 直接引用。Private Theme Bank 激活后只存在于 Runtime CSS 与 Manifest。

---

# 13. Appearance、Material 和用户配色系统

## 13.1 Stored Preference 与 Effective State

当前 Embedded-palette Runtime 根节点表达解析后的 Effective State，但只写 `data-theme`，不写 `data-theme-kind`。Target Atomic Cutover 接受后，根节点才切换为以下 Tuple-aware 形式：

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

`system` 和尚未解析的 `adaptive` 只存在于用户偏好。`System` 不是第三个 Theme Plane；它只能由浏览器能力解析为 Effective `light` 或 `dark`。Cutover 前，该结果选择当前 Embedded-palette Conditional Projection；Cutover 后，它才选择相应的 Explicit Theme Plane。DOM 的 `data-color-mode` 与 `data-material` 只记录 Effective State；不得将派生状态回写为用户偏好。根节点根据 Effective Color Mode 设置：

```css
html[data-color-mode='light'] {
  color-scheme: light;
}

html[data-color-mode='dark'] {
  color-scheme: dark;
}
```

Effective Appearance 是纯派生结果，不作为第二份可变 Pinia State，也不持久化。

Atomic Cutover 后，Theme Reference Resolution 同样是纯边界。有效引用解析为已校验、可访问的 Built-in 或 Custom Theme Registry Entry；无效引用不得被改写为 `neutral` 或其他主题，也不得修改 Stored Preference。运行时可以暂时保留 Safe First-paint Baseline，但必须返回结构化的 Invalid-theme Result。Cutover 前，Theme 继续是经过 `CurrentPreference` Schema 校验的 Built-in ID 字符串，不存在 Registry-kind Tuple。

## 13.2 Theme Definition

Theme Definition 与 User Preference 是不同合同。`ThemeDefinition` 是完整、显式、版本化的 Target 颜色文档；本 Architecture Amendment 只定义 Target，不使它成为当前 Runtime、Default、Public Export、First-paint 或 Persistence Authority。它只能在 §13.4 的 Atomic Cutover 中激活：

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

type BuiltInThemeDefinition = ThemeDefinition<
  BuiltInThemeId,
  AbsoluteCssColor | DirectBuildOnlyPrimitiveColorAlias
>

type CustomThemeDefinition = ThemeDefinition<
  CustomThemeId,
  AbsoluteCssColor
>
```

Target 首次 Atomic Cutover 的初始准入版本预留为：

```text
TARGET_PUBLIC_ROLE_CONTRACT_INITIAL_VERSION=1
TARGET_PUBLIC_ROLE_CONTRACT_STATUS=INACTIVE_UNTIL_ATOMIC_CUTOVER
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

Built-in Theme 可以在每个字段中直接写显式颜色，也可以使用人工选择的 DTCG Alias。Built-in Alias 只能直接指向具有显式 Literal Value 的 `build-only` Primitive Color；不得引用另一个 Semantic Role、另一个 Theme Plane 或运行时 CSS Variable。每个 Alias 选择必须由作者逐字段声明、确定性解析并记录 Source Path，不能由规则、色阶或 Seed 生成。

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

当前已实现的 `CurrentPreference` Legacy-seed Embedded-palette Format 保持唯一 Active Authority：

```text
ACTIVE_PREFERENCE_AUTHORITY=USER_PREFERENCE_EMBEDDED_PALETTE
ACTIVE_SCHEMA=CurrentPreference
ACTIVE_DEFAULT=defaultCurrentPreference
ACTIVE_PUBLIC_EXPORTS=CURRENT_PREFERENCE_SCHEMA_TYPES_DEFAULT_AND_RUNTIME_HELPERS
ACTIVE_FIRST_PAINT=LEGACY_PREFERENCE_INPUT_AND_CURRENT_PREFERENCE_READER
ACTIVE_RUNTIME_APPLICATION=LEGACY_SEED_THEME_STRING_WITHOUT_THEME_KIND
ACTIVE_PERSISTENCE_FORMAT=CURRENT_PREFERENCE
TARGET_PREFERENCE_STATUS=INACTIVE_UNTIL_ATOMIC_CUTOVER
```

Active Envelope 精确包含外层 `schemaVersion: 2` 与 `appearance.{colorMode,theme,palette,contrast,material,density,fontScale,motion}`；`palette` 精确包含 `brand`、`accent` 和 `neutral`。本 Architecture Amendment、早期 Registry Package 或 Theme-plane Package 均不得改变当前 Schema、Default、Public Export、First Paint、Runtime Application、Application Storage Read/Write Format 或生成输出 Authority。

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

### Target Explicit-theme Contract

以下 Target Schema 在 Atomic Cutover 前只作为非 Active Contract 存在。

Schema Version 只存在于最外层 User Preference Envelope：

```ts
type ColorModePreference = 'light' | 'dark' | 'system'
type ContrastPreference = 'standard' | 'enhanced'
type MaterialPreference = 'adaptive' | 'reduced' | 'solid'

type ThemeReference =
  | {
      kind: 'built-in'
      id: BuiltInThemeId
    }
  | {
      kind: 'custom'
      id: CustomThemeId
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

Preference 只保存 Theme Registry Reference，不嵌入 `brand`、`accent`、`neutral` 或 Theme Plane。Built-in Theme ID 必须来自已验证 Built-in Theme Document 生成的 Exact Literal Registry，不得只通过不受限正则。Custom Reference 必须解析到当前用户可访问、Schema Valid、Role-contract Compatible 的 Existing Registry Entry。

Theme Identity 的 Canonical Key 是不可拼接的 Tuple：

```text
(registryKind, themeId)

registryKind = built-in | custom
```

Built-in 与 Custom 可以拥有相同的 `themeId` 字符串，但 Tuple 永不相等。`CustomThemeId` 是应用分配的 Opaque ID，必须在用户可访问的 Custom Registry 中唯一；Label 不参与身份。Resolver、Cache、Storage、DOM 和 Error Result 都必须保留 `registryKind` 与 `themeId` 两个独立字段，不得把它们连接成未经转义的 Selector、Class Name、CSS Variable 或 Storage Key。

Registry Entry 必须通过 Discriminated Union 绑定 Kind、ID 与完整文档，且 Entry ID 必须精确等于 `definition.id`：

```ts
type ThemeRegistryEntry =
  | {
      kind: 'built-in'
      id: BuiltInThemeId
      definition: BuiltInThemeDefinition
    }
  | {
      kind: 'custom'
      id: CustomThemeId
      definition: CustomThemeDefinition
    }
```

Atomic Cutover 接受后的 Target `ExplicitThemePreference` Default 只引用 Built-in `neutral`，不复制任何颜色值：

```text
colorMode=system
theme={ kind: built-in, id: neutral }
contrast=standard
material=adaptive
density={ preset: comfortable, scale: 1 }
fontScale=1
motion=full
```

Theme Registry 是 Typed Product Data，不是 AI Workflow Registry、Machine-local Authority 或第二份 Architecture Authority。

Custom Theme Document 存储在 Preference 之外的 Application-owned Theme Registry。应用可以使用独立、显式提供的同步 Registry Snapshot Storage Key 支持 First Paint，也可以在 Vue Bootstrap 后通过自己的持久化边界解析；两种路径都必须把同一份原始完整 Theme Definition 重新送入 Design System Exact Validator。Preference 始终只保存 Reference，不复制 Theme Plane。

`LegacySeedPreference` → `ExplicitThemePreference` Migration 必须确定、幂等、无损并返回结构化结果：

```text
LegacySeedPreference theme ∈ { neutral, ocean, warm }
+ embedded palette exactly equals that versioned legacy built-in seed tuple
→ same-ID complete Built-in Theme Reference

LegacySeedPreference built-in ID + modified embedded palette
→ MIGRATION_REQUIRES_THEME_COMPLETION

LegacySeedPreference custom theme or custom seed palette
→ MIGRATION_REQUIRES_THEME_COMPLETION
```

`LegacyPreferenceInput` Payload 可以先执行历史确定的 `high-contrast → system + enhanced` 和 `material=solid` 转换，再进入同一 `LegacySeedPreference` → `ExplicitThemePreference` 判定。Migration 不得从 Legacy Seed 扩展颜色、丢弃已修改的 Palette、回退到默认 `ExplicitThemePreference` 或写入 Storage。

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

未来 `roleContractVersion` 提升时，只允许一种不要求重填颜色的确定性迁移：两个版本的 Public Color Role Set、Alpha Contract Registry 和 Named Contrast Registry 必须逐记录完全相等，版本差异只来自非颜色 Public Role Admission。此时 Migration 可以在内存中把完整旧 Theme 重新验证为当前版本，保持每个 Authored Color 字符串逐字不变，并返回 `ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY` 与 Old/New Version Evidence；不得写回 Storage，是否保存新版本由应用边界显式决定。

只要 Public Color Role、Alpha Policy、Named Pair、Endpoint、Kind、Threshold 或 Maximum Useful Ratio 有任何变化，旧版 Custom Theme 就不得自动补齐新增 Role、只改版本号或沿用旧 Validation。它必须以 `ROLE_CONTRACT_MISMATCH` 保持不可应用，直到用户或开发者为全部当前字段提供显式值、重新通过完整 Validation，并保存为当前版本文档；原文档不得被静默覆盖。

Theme Resolution 至少返回：

```text
THEME_NOT_FOUND
THEME_INACCESSIBLE
THEME_INVALID
ROLE_CONTRACT_MISMATCH
MIGRATION_REQUIRES_THEME_COMPLETION
ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY
```

其中 `ROLE_CONTRACT_REBOUND_NON_COLOR_ONLY` 是包含完整 Version Evidence 的 Migration Success Result，不是 Validation Error；其余失败结果必须包含 Registry Kind、Theme ID、Field Path 或 Role Contract Evidence。无效引用可以暂时保留 Safe First-paint Baseline，但不得替换、删除或重写 Stored Preference。

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

以下 Ownership 是 Atomic Cutover 后的 Target Boundary。Cutover 前，§13.4 的 `CurrentPreference` Schema、Default、Public Export、First Paint、Runtime 和 Persistence Ownership 保持不变。

`@platform/design-system` 负责机制：

```text
Zod schemas
versioned Public Role Registry
ThemeDefinition exact validation
versioned Alpha Contract Registry
versioned Named Contrast Registry
Built-in Theme Registry contract
one reference-only ExplicitThemePreference default
LegacyPreferenceInput / LegacySeedPreference → ExplicitThemePreference structured migration
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
preference persistence
application-owned storage key
optional application-owned synchronous Custom Theme Registry Snapshot key
Custom Theme Registry persistence and access boundary
Pinia state
matchMedia subscriptions
bootstrap order
index.html inclusion
runtime re-resolution orchestration
```

Design System 不得硬编码应用 Storage Key，也不得拥有 Pinia 或直接选择应用持久化策略。应用通过 `appearance-init.js` Script Element 的显式 `data-preference-storage-key` 提供 Preference Storage Key；如需 Custom Theme First Paint，再通过 `data-theme-registry-storage-key` 提供独立 Registry Snapshot Key。Application Store 与 HTML 必须使用同一组应用所有的 Key，并由静态治理验证一致性。Registry Snapshot 与 Preference 是两个 Schema Boundary，不得把 Theme Plane 嵌入 Preference。

## 13.7 Theme-bank Projection

本节全部 Projection、Selector、Installer 和 Manifest Mechanic 都是 Atomic Cutover Target；Cutover 前不得生成 Theme Bank、设置 `data-theme-kind` 或安装 Custom Theme Bank。

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

Private Plane Bank 和 Effective Bank 都是 `ui-internal`：只进入 Runtime CSS 与 Manifest Schema，不进入 Public TypeScript、Token Names 或 UnoCSS。Build Manifest 必须记录 Bank Schema、Built-in Registry Kind、Theme ID、Mode、Contrast、Public Role、Source Field、Authored Value、Bank Variable 和 Public Binding。Runtime Custom Instance 只形成同 Schema 的 Ephemeral `RuntimeThemeRegistration` Metadata，不修改 Build Manifest、不成为 Public API，也不落入生成文件。

禁止 Theme × Mode × Contrast Compound Selector、完整 Cartesian CSS、Value-diff 省略、相等值推断、Theme Inheritance 或运行时颜色合成。Density 与 Material 保持独立，只能使用各自的单轴 Selector；它们不得进入 Color Bank 或 Color Plane。Theme Bank Output 继续受 CSS Budget 和 Generated Drift Gate 约束。

## 13.8 Explicit Theme Validation Pipeline

本 Pipeline 只在 Atomic Cutover 中与 Target Theme、Preference、Registry、First Paint 和 Runtime 一起激活；当前 Embedded-palette Validation 不得被描述为已经执行下列完整 Theme Pipeline。

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

验证失败必须提供可定位证据：

```text
registryKind
themeId
roleContractVersion
fieldPath
role
plane
errorCode
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

本节的 Tuple-aware Registry Snapshot、`data-theme-kind` 和 Target Explicit-theme Validation 只在 §13.4 Atomic Cutover 中共同激活。Cutover 前，当前生成的 `LegacyPreferenceInput` / `CurrentPreference` Embedded-palette Reader、`defaultCurrentPreference`、现有 `data-preference-storage-key` 和 `CurrentPreference` Runtime Application 保持权威；不得因本节落地而单独改变。

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

Atomic Cutover 后，应用在 `index.html` 显式提供自己的 Preference Storage Key 和可选的 Theme Registry Snapshot Key：

```html
<script
  src="/generated/appearance-init.js"
  data-preference-storage-key="application-owned-key"
  data-theme-registry-storage-key="optional-application-owned-key"
></script>
```

示例值只是应用配置位置，不是 Design System 默认值；Custom Registry Snapshot Key 是可选的独立属性，不存在时不得从 Preference 猜测 Theme Data。真实构建路径由 Vite Production Build 固定并由 Drift Check 验证。

Atomic Cutover 后，`critical-theme.css` 默认提供 Built-in Neutral 的 Light、Standard、Comfortable、Solid 安全基线及其最小 Critical Selector。初始化脚本在 Vue、Pinia 和应用模块执行前同步读取应用提供的 Preference Key，并在提供时读取独立 Registry Snapshot Key，验证 Target Reference-only Preference，执行允许的结构化 Migration，然后解析并设置：

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

Atomic Cutover 后，Built-in Reference 从生成的 Exact Built-in Registry 同步解析。Custom Reference 只有在应用提供独立 Registry Snapshot Key、Snapshot 中存在该 Opaque ID，且原始 Theme Definition 通过 Duplicate-aware Parse、当前 Role/Alpha/Contrast Contract 和 Exact Validator 后，才能由同一 Typed Bank Installer 同步应用。Snapshot 缺失、异步 Registry 尚未就绪、Entry 不可访问或无效时必须保留 Solid Critical Baseline，并把结构化结果交给 Vue Bootstrap 后的应用边界；不得改成 `neutral`、删除引用、合成颜色或写入任一 Storage。

Cutover 前，当前初始化脚本只按 `LegacyPreferenceInput` / `CurrentPreference` Embedded-palette Contract 读取和校验 Preference；它不读取 Theme Registry Snapshot、不设置 `data-theme-kind`、不验证 Target Theme Document，也不安装 Theme Bank。

Atomic Cutover 后，初始化脚本不得读取未经校验的字段、内置应用 Storage Key、初始化 Pinia、请求网络、加载完整主题编辑器或把 Effective State 写回 Stored Preference。读取、解析、Registry Resolution、Bank Installation 或能力检测失败时必须移除 Partial Custom Bank 并保留 Solid Critical Baseline。它与 Runtime Resolver、Custom Theme Bank Installer 必须从同一 canonical contract 生成并接受 Drift Check。

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

当前 Formatter 缺失的六个 Active Mapping 必须在 `PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS` 中精确补齐：

```text
interaction.control.height  → h-control       → height
interaction.motion.duration → duration-motion → --un-duration, transition-duration
interaction.motion.easing   → ease-motion     → --un-ease, transition-timing-function
layout.content.max-width    → max-w-content   → max-width
layout.z.base               → z-base          → z-index
layout.z.overlay            → z-overlay       → z-index
```

其余 21 个 Mapping 也必须从当前隐式 Formatter Logic 转录为 §11.4 的显式 Record 并逐 Class 验证。`border-border-default`、`ring-focus-ring`、`bg-surface-page`、`text-text-primary`、`gap-content-gap` 等当前兼容 Class Spelling 保持不变；任何未来简化都不属于已完成的 Naming Normalization，必须通过独立、显式准入的 Compatibility Change。

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

---

# 19. 状态管理

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

---

# 20. API 和请求层

最终选择：

```text
Native Fetch
+ AbortController
+ TanStack Query
+ Zod
```

不使用 Axios 或 Alova。

## 20.1 请求层职责

```text
Base URL
Headers
Credentials
Timeout
Abort
Error normalization
Response parsing
Runtime validation
```

## 20.2 API 目录

```text
shared/api/
├── client.ts
├── request.ts
├── errors.ts
├── query-keys.ts
└── schemas.ts
```

## 20.3 OpenAPI 策略

当后端提供可靠 OpenAPI Schema 时增加：

```text
openapi-typescript
openapi-fetch
```

生成类型必须与手写 Runtime Schema 分工：

```text
OpenAPI types = compile-time contract
Zod schemas = untrusted runtime boundary
```

禁止为所有内部对象重复写 Zod Schema。

## 20.4 错误模型

```ts
type AppError =
  | NetworkError
  | TimeoutError
  | UnauthorizedError
  | ValidationError
  | ConflictError
  | ServerError
  | UnknownError
```

UI 不直接判断任意 HTTP 状态码，而是消费统一错误类型。

---

# 21. 表单体系

最终选择：

```text
VeeValidate 5
+ Zod 4
+ UiFormField
```

VeeValidate 5 已支持 Standard Schema，可以直接使用 Zod，不再需要旧的 `@vee-validate/zod` Adapter。

Zod 4 当前为稳定版本。

表单职责：

```text
VeeValidate:
- touched
- dirty
- pending
- submit
- field registration
- validation lifecycle

Zod:
- data shape
- input constraints
- parsing
- transformation
- runtime safety

UiFormField:
- label
- description
- required indicator
- error id
- aria-describedby
- visual layout
```

禁止首期建设 Schema-Driven ProForm。

---

# 22. 数据表格策略

## Level 1：静态展示

```text
Native HTML table
+ semantic tokens
```

## Level 2：普通业务表格

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

## Level 3：专业 Grid

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

---

# 23. 国际化

基础使用 Vue I18n，但初始可以只有一个 Locale。

规则：

* 所有用户可见的公共组件文本使用 Key。
* Route Title 使用 Key。
* 日期、数字和货币使用 `Intl`。
* 不自行拼接复数。
* UI 必须考虑文本膨胀。
* 组件使用 Logical Properties。
* Reka UI 的 RTL 和 Locale 能力通过 UI Adapter 配置。
* Locale 文件按路由或 Feature 懒加载。

禁止使用 Moment 或 Day.js 作为基础依赖。

复杂日期和时区需求出现后评估 Temporal；基础架构继续使用 ISO 字符串和 `Intl`。

---

# 24. 动画系统

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

---

# 25. 无障碍基线

目标：

```text
WCAG 2.2 AA
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
ARCHITECTURE_AUTHORITY=ARCHITECTURE.md
```

`AGENTS.md` 是唯一 AI 入口和最小路由器。它只负责：

* 指向并要求完整读取 `ARCHITECTURE.md`。
* 保持当前 Phase、Production-only 和 Main-only 边界。
* 指向唯一 Codex Verification Gate：`pnpm verify`。
* 将 UI 范围显式路由到现有 `.ai/skills/pavp-ui/SKILL.md`。

`AGENTS.md` 没有行数配额，不复制技术栈、依赖、Token、Material、Motion、Layout、Component、目录或验收正文，也不承担第二份架构权威。

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

本架构工作包只声明未来合同，不创建 `.ai/**`、不修改 `AGENTS.md` 或 Repository Policy。

本修订完成后的唯一 Immediate Successor 必须是 §37.1 的 `PAVP_SUBORDINATE_BROWSER_RULE_SYNC`。在该同步包落地前，不得开始任何 Token、Theme、Schema、Generator 或 Runtime Package。Architecture 已将 Codex Browser Request 判定为 `ARCHITECTURE_CONFLICT`；同步包必须立即消除从属文件中的相反路由，而不是长期依赖 Authority Precedence 掩盖 Drift。

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

五个 Regular File、`AGENTS.md` 最短 UI Route、Repository Policy Exact Allowlist 和 Policy Checker 构成一个不可拆分的现有治理边界。`PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 只能同步其失效的 Browser/Runtime-acceptance 文字并增加 Regression Enforcement；不得增加第六个 Workflow File、放宽 Allowlist，或移除对 Tracked Symlink、Absolute Home Path Dependency、Machine-local Registry 和客户端专属 Project Authority 的拒绝。

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

在从属 Acceptance Report Schema 尚未由 Immediate `PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 同步以前，旧字段只能作为过渡兼容常量输出：

```text
RUNTIME_ACCEPTANCE_TIER=TIER_0
OWNER_RUNTIME_ACCEPTANCE=NOT_APPLICABLE
```

这些兼容字段不代表 Runtime Tier、Browser Authorization 或 Completion Gate。

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
Reference-only Preference and legacy migration determinism after Atomic Cutover
application-owned storage-key consistency
```

Optical CSS 检查必须覆盖 `apps/**/*.css` 与 Vue `<style>`，UI-internal CSS Variable 使用必须对照 Manifest。Direct Storage Rule 只允许应用所有的 `preference-storage.ts` 与按 Gate 创建的 `custom-theme-registry-storage.ts` 执行各自边界内的读写；另一个窄例外是 Generated `appearance-init.js` 可以使用应用通过 `data-preference-storage-key` 与可选 `data-theme-registry-storage-key` 提供的 Key 执行同步只读 First-paint 访问。它不得写入 Storage，Design System 其他源文件和其他应用文件不得直接访问。

---

# 30. 项目生成器

提供：

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

静态检查不得宣称已经证明 Runtime-only Property。Owner 可以在仓库外选择手工观察这些行为并向 Codex 提供明确记录供只读审查；该观察可缺省、非门槛且不得被 Codex 执行。该模型不授权 Test、Browser Automation 或 Committed Evidence。

未来规则只有在其负责 Work Package 实现、接入 `pnpm verify` 并通过后才是机器强制；本文声明本身不代表 Validator 已存在。

## 31.3 GitHub 托管门槛

```text
CodeQL
GitHub Dependency Graph
Dependabot alerts
```

这些信号补充本地 `pnpm verify`，但不创建依赖更新分支。

---

# 32. Codex Browser Prohibition and Optional Owner Inspection

## 32.1 Codex Verification Boundary

Codex Browser Operation、Chrome DevTools、ChromeDev、Browser Testing 和 Browser Automation 全部禁止。Codex 不得打开、操作、驱动或配置浏览器，不得生成 Screenshot、Recording、Trace、Runtime Probe、Baseline、Fixture 或 Evidence File。

```text
CODEX_VERIFICATION_MODEL=pnpm verify
CODEX_BROWSER_OPERATION=PROHIBITED
OWNER_MANUAL_RUNTIME_INSPECTION=OPTIONAL_EXTERNAL_NON_GATING
```

即使当前客户端提供浏览器能力，也不构成授权。请求 Codex 执行浏览器操作必须以 `ARCHITECTURE_CONFLICT` 停止该部分；其余合法静态工作可以继续。仓库不得包含 Browser Configuration、Automation、Evidence 或专用 Tooling。

## 32.2 Optional Owner-operated Observation

Owner 可以完全在仓库外、自行操作浏览器并选择观察：

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

---

# 33. 性能规则

初始预算：

| 资源          |                 初始预算 |
| ----------- | -------------------: |
| 初始应用 JS     |        ≤ 180 KB gzip |
| 初始 CSS      |         ≤ 40 KB gzip |
| Generated Manifest | ≤ 32 KiB `gzip -9 -n` |
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
* Material 的 Paint、Layer 和 Interaction Performance 可以由 Owner 在仓库外选择手工观察；不是 Codex Gate。
* Atomic Cutover 后引入的 Private Theme Bank 与独立 Selector Output 必须保持初始 CSS Budget。

---

# 34. 安全规则

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

---

# 35. 生产专用仓库政策

The repository contains production architecture only.

No automated test files or test-only infrastructure are permitted.

Codex verification consists only of static production gates.

Owner manual runtime inspection is optional, external, owner-operated, and non-gating.

仓库不提交验证专用代码、测试专用目录或依赖、演示与展示系统、浏览器自动化基础设施或验证证据资产。

项目规范、执行合同和必需资源必须来自当前 Repository。Machine-local Rule、Global Skill、Client Registry、Absolute Home Path、External Symlink 或实时下载的规范文件不得成为项目正确执行的前提。

唯一例外是 §28.3 声明的五个 `.ai/skills/pavp-ui` Markdown 文件。它们是现有 Production Execution Workflow，不是 Test、Demo、Evidence 或第二份 Architecture。Exact Allowlist、最短 `AGENTS.md` Route 和 Policy Enforcement 必须保持同步；Immediate `PAVP_SUBORDINATE_BROWSER_RULE_SYNC` 负责移除本修订已判定失效的从属 Browser/Runtime-acceptance 文字并锁定 Regression Gate。

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
active CurrentPreference embedded palette
exact current 27-role public ID set, including 9 color roles
current single-role density behavior for interaction.control.height
packages/ui dependency-free src/index.ts stub
```

本修订定义但尚未因 Architecture 文本本身而激活的 Phase 1 Target，必须按 §37.1 Work Package 逐项实现和验证：

```text
subordinate browser-rule synchronization
semantic naming normalization
exact Public Role Registry and complete 27-role UnoCSS mapping
target explicit complete Theme contract
complete four-plane Built-in Theme documents side by side with legacy tuples
reference-only Preference and structured legacy migration at Atomic Cutover
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

`PAVP_EXPLICIT_THEME_ARCHITECTURE_AMENDMENT` 是当前 Architecture-only Gate：只修改本文件，不实现任何 Runtime Output，不修改从属 Workflow，不增加依赖、测试、浏览器工作或证据。完成本 Gate 后，当前 Phase 1 的 Immediate Implementation Chain 必须按以下顺序实施；这些 Work Package 不是新的 Canonical Phase：

```text
1. PAVP_SUBORDINATE_BROWSER_RULE_SYNC
2. PAVP_NAMING_NORMALIZATION
3. PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS
4. PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE
5. PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER
6. PAVP_FINAL_STATIC_GOVERNANCE
```

Future Public Role Admission 不属于该 Immediate Chain；完成当前 Phase 1 Chain 后，它继续受独立 Amendment Gate 约束。

本修订的精确 Acceptance Contract：

```text
ACTIVE_PUBLIC_COLOR_ROLES=9
ACTIVE_PUBLIC_ROLES_TOTAL=27
PUBLIC_ROLE_REGISTRY=EXACT
UNO_MAPPING_RECORDS=27
ACTIVE_ALPHA_RECORDS=1
NAMED_CONTRAST_RECORDS=14
PREFERENCE_CUTOVER=ATOMIC
MANIFEST_BUDGET=DEFINED
SUBORDINATE_BROWSER_SYNC_ORDER=IMMEDIATE
NAMING_NORMALIZATION=COMPLETE
RESERVED_COLOR_ROLES=283
TOTAL_UNIQUE_COLOR_TAXONOMY=292
```

### 1. `PAVP_SUBORDINATE_BROWSER_RULE_SYNC`

这是本 Architecture Amendment 后的 Immediate Package，必须先于每一个 Token、Theme、Schema、Generator 或 Runtime Package。Write Scope 精确为七个 Existing File：

```text
AGENTS.md
README.md
.ai/skills/pavp-ui/SKILL.md
.ai/skills/pavp-ui/references/task-routing.md
.ai/skills/pavp-ui/references/execution-contract.md
.ai/skills/pavp-ui/references/acceptance-report.md
scripts/verify/check-repository-policy.ts
```

该包必须：

1. 从从属 Workflow 和入口文字移除 `runtime-acceptance` Task Mode。
2. 移除 Tier 0–3 Gate、`PENDING_OWNER_ACCEPTANCE` 和任何 Codex Browser/ChromeDev Capability Routing。
3. 将 Codex Browser Operation Request 精确映射到 `ARCHITECTURE_CONFLICT`。
4. 保留 Owner-only、External、Optional、Non-gating Manual Observation。
5. 更新 Acceptance Report State/Field Contract。
6. 在 Repository Policy Checker 增加 Regression Enforcement，拒绝上述已删除概念重新进入七文件范围。

该包不得修改 Token、Theme、Schema、Generator、Runtime、Dependency 或 Lockfile。其完成之前，后续 Package 全部 Blocked。

### 2. `PAVP_NAMING_NORMALIZATION`

这是 Immediate Chain 中紧随 Package 1 的强制 Compatibility Cleanup。它必须原子移除 Architecture、Type、Schema、File、Runtime API 和 Public Export 中的 Numeric-version-style Name，并提供迁移与静态 Drift Enforcement。不得借此重命名 Role ID、Class 或改变 Runtime Behavior。

该包必须在 Package 3 和任何 New Theme 或 Preference Implementation 开始前完成。命名变化不得暗中改变当前 `CurrentPreference` Data Shape、27-role Public Set、Contrast Threshold、Alpha Value 或 UnoCSS Behavior。

```text
NAMING_NORMALIZATION=COMPLETE
NAMING_NORMALIZATION_PARTIAL_EXECUTION=PROHIBITED
```

### 3. `PAVP_ROLE_REGISTRY_AND_OUTPUT_COMPLETENESS`

实现 §11.4 的 Exact 27-record Public Role Registry、27 UnoCSS Mapping、§13.3 的单一 Alpha Record、§25.1 的 14 Named Contrast Record、Public Output Set Equality、Manifest Record Equation、32 KiB gzip Budget、Expected Delta Enforcement 和 Formatter Fatal Failure。该包必须在不重命名或移除现有 Public ID 与 21 个现有 Class Spelling、不改变 Runtime Value 或 Active `CurrentPreference` Authority 的前提下证明 `A = R = T = N = U = M`；同时必须新增 §15 明确列出的六个缺失 Mapping。

该包拥有 Manifest Byte、Record 和 Growth Enforcement。它不得公开 Primitive、Theme Bank、Reserved Color、Future Density 或 Internal Material，不得给 Target Theme/Preference 宣称 Active Status。

### 4. `PAVP_COMPLETE_BUILTIN_THEME_PLANES_SIDE_BY_SIDE`

为当前九个 Active Color Role 人工编写 `neutral`、`ocean`、`warm` 的四个完整 Target Plane，并产生 Target-only Static Validation Result，不提交 Evidence Artifact。新结构必须与当前三个 Legacy Theme Source Side-by-side 存在；不得删除、改写或重新解释 §13.4 的 Legacy Tuple Source，不得改变 `defaultCurrentPreference`、First Paint、Runtime、Public Export 或 Persistence。

该包不得从 Seed 生成颜色，不得激活 Target `roleContractVersion`，也不得把 Reserved Color Candidate 加入 Theme Plane。

### 5. `PAVP_EXPLICIT_THEME_PREFERENCE_ATOMIC_CUTOVER`

在一个不可拆分的 Production Landing 中激活完整 Target Theme 和 Reference-only Preference。该包必须共同改变 §13.4 列出的 Schema、Default、Public Export、First Paint、Runtime Application、Application Bootstrap/Persistence、HTML/Storage Wiring、Manifest Metadata 和 Owning Static Enforcement，并实现 Exact Built-in ID Registry、Opaque Custom ID Registry、`(registryKind, themeId)`、Typed Theme Bank、Structured Migration 与 Invalid-theme Result。

Cutover 必须使用冻结的 Legacy Built-in Theme Tuple Registry。Cutover 后 `LegacyPreferenceInput` 与 `LegacySeedPreference` Shape 只读、只迁移、永不写回。不得分拆为 Schema Package 和 Runtime Package，不得在 `main` 形成 Mixed Authority。

### 6. `PAVP_FINAL_STATIC_GOVERNANCE`

只完成此前已准入合同的跨包最终闭包，包括 Exact-set、No-leak、No-seed、No-correction、Theme Bank、Density Isolation、UnoCSS Completeness、Migration 和 First-paint Drift。Browser Rule Synchronization 已由 Package 1 完成，本包不得接收、延迟或补交 Browser/Runtime-acceptance Sync。

### Future Admission Gate: `PAVP_FUTURE_PUBLIC_ROLE_ADMISSION_AMENDMENTS`

Future Density、Foundation、Phase 2、Phase 3 和 Phase 4 Candidate 都必须先通过独立 Architecture Admission Amendment。每次 Amendment 必须显式修改 Active Public Role Registry、Theme Plane Set、Alpha、Named Contrast、UnoCSS、固定 Manifest Equation 下的 Records 与 Expected Count/Gzip Deltas、Migration 和全部 Generated Output；Reserved Catalog 本身不构成实现许可。

§14.2 的十个新增 Density Candidate、§13.3 的 283 个 Reserved Color Candidate 均受此 Gate。Component-internal Token 继续 Demand-created。该 Gate 不阻塞当前六包 Immediate Chain 的完成，也不允许 Final Governance 预先宣称未来 Candidate 已准入。

每个 Work Package 必须在进入下一包前通过适用的 Static Production Gate。所有 Package 都必须保持 Demand-created Directory、No-test Policy、Codex Browser Prohibition、No Browser Evidence 和 Public/Internal Isolation。Owner 手工观察不阻塞 Package Completion。每个 Package 必须实现自己的 Owning Validator，不得把 Enforcement 推迟到 Final Governance。

所有未来目录继续遵守 Demand-created Rule。Grid、Editor、Charts、Clear-media Material、Spring Family 和 Component Token Tree 保持在后续 Gate。

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
AGENTS_MD_IS_THE_ONLY_MINIMAL_AI_ENTRY
ARCHITECTURE_MD_IS_THE_ONLY_ARCHITECTURE_AUTHORITY
PROJECT_UI_WORKFLOW_IS_SUBORDINATE_AND_NON_AUTHORITATIVE
PROJECT_UI_WORKFLOW_CONFLICT_ACTION_IS_STOP

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
OWNER_MANUAL_RUNTIME_INSPECTION_IS_OPTIONAL_EXTERNAL_AND_NON_GATING
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
+ VeeValidate 5
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
+ Optional External Owner-operated Manual Inspection
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
