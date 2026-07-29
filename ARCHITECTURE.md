# Progressive Adaptive Vue Platform

## 全新个人超级前端架构 v1.0

```text
STATUS=CANONICAL_ARCHITECTURE_BASELINE_V1
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
BROWSER_VALIDATION=CODEX_CHROMEDEV_RUNTIME_ACCEPTANCE
VALIDATION_MODEL=STATIC_GATES_AND_OWNER_RUNTIME_ACCEPTANCE
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

1. 用户可以选择预设配色。
2. 用户可以安全地生成自定义配色。
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
| 用户配色空间          | OKLCH                                |
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
| Owner Runtime Acceptance | Codex 内置浏览器 + 已配置的 ChromeDev / Chrome DevTools |

ChromeDev 是外部操作能力，不是仓库依赖、Package、生成文件、已提交配置或架构层。

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
├── .ai/                                      [Phase 1 work package 2; exact allowlist only]
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
│   │   └── material.tokens.json              [work package 5]
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
│   │   ├── theme.schema.ts
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
│   │   ├── preference-schema-upgrades.ts
│   │   ├── first-paint.ts
│   │   └── create-custom-theme.ts            [Phase 5]
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

```text
color.surface.page
color.surface.panel
color.surface.elevated
color.text.primary
color.text.secondary
color.text.muted
color.border.default
color.border.strong
color.action.primary
color.action.primary-hover
color.status.danger
color.focus.ring
spacing.control.inline
spacing.section.block
```

业务页面主要消费 Semantic Token。

## 11.3 Component Token

仅在真实组件需要独立合同后创建：

```text
button.height
dialog.padding
navigation.item-height
table.row-height
```

禁止预先为所有组件生成完整 Component Token 树。

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

| Visibility    | Runtime CSS | Public `tokens.ts` / names | UnoCSS | Manifest |
| ------------- | ----------- | --------------------------- | ------ | -------- |
| `public`      | Yes         | Yes                         | Yes    | Yes      |
| `ui-internal` | Yes         | No                          | No     | Yes      |
| `build-only`  | No          | No                          | No     | Yes      |

Manifest 包含所有 Token 的 Tier、Visibility、Source、Condition 和 Role Metadata；只有 Runtime CSS 中真实存在的 Token 才记录 `cssVariable`。Manifest 是生成和治理输入，不是应用公共 API。

加入这些字段时必须提升 Manifest Schema Version。Generator 必须在 Material Source 进入前支持 `material` Namespace → `--ui-material-*` 映射。Conditional Semantic Alias 在运行时需要跟随 Theme、Mode 或 Contrast Overlay 时，必须保留为 CSS `var(...)` 关系，不得一律压平为 Literal 并复制 Condition Matrix。

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

`--ui-material-*` 虽然存在于 Runtime CSS，但不属于应用公共 Token 表面。它不得进入公共 `tokens.ts`、`token-names.ts`、UnoCSS Theme 或 Shortcut，也不得由 `apps/**` 和业务 Feature 直接引用。

---

# 13. Appearance、Material 和用户配色系统

## 13.1 Stored Preference 与 Effective State

根节点只表达解析后的 Effective State：

```html
<html
  data-color-mode="dark"
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

`system` 和尚未解析的 `adaptive` 只存在于用户偏好。DOM 的 `data-color-mode` 与 `data-material` 只记录 Effective State；不得将派生状态回写为用户偏好。根节点根据 Effective Color Mode 设置：

```css
html[data-color-mode='light'] {
  color-scheme: light;
}

html[data-color-mode='dark'] {
  color-scheme: dark;
}
```

Effective Appearance 是纯派生结果，不作为第二份可变 Pinia State，也不持久化。

## 13.2 Appearance Preference V2

Schema Version 属于最外层 User Preference Envelope：

```ts
type ColorModePreference =
  | 'light'
  | 'dark'
  | 'system'

type ContrastPreference =
  | 'standard'
  | 'enhanced'

type MaterialPreference =
  | 'adaptive'
  | 'reduced'
  | 'solid'

interface AppearancePreferenceV2 {
  colorMode: ColorModePreference
  theme: ThemeId

  palette: {
    brand: string
    accent: string
    neutral: 'cool' | 'neutral' | 'warm'
  }

  contrast: ContrastPreference
  material: MaterialPreference
  density: DensityPreference
  fontScale: FontScale
  motion: MotionPreference
}

interface UserPreferenceV2 {
  schemaVersion: 2
  appearance: AppearancePreferenceV2
}
```

`AppearancePreferenceV2` 内不得复制 `schemaVersion`。Color Mode 与 Contrast 是独立轴；`high-contrast` 不再是 V2 Color Mode。

唯一 V2 默认值由 Design System 导出：

```text
colorMode=system
theme=neutral
palette=derived from neutral theme source
contrast=standard
material=adaptive
density={ preset: comfortable, scale: 1 }
fontScale=1
motion=full
```

架构文档不复制 Palette Raw Value。

## 13.3 V1 → V2 Migration

迁移必须是确定、幂等且经过 Zod 输出校验的纯转换：

```text
v1 colorMode=high-contrast
→ v2 colorMode=system
→ v2 contrast=enhanced

every existing v1 profile
→ v2 material=solid

new v2 profile default
→ material=adaptive
```

现有配置迁移为 `solid`，以保留 Material 引入前的不透明行为；只有新建 V2 配置默认 `adaptive`。除上述转换外，合法的 Theme、Palette、Density、Font Scale、Motion 和 Contrast 值保持不变。无效输入回退到唯一的 V2 默认配置，不允许部分迁移结果进入运行时。

First Paint 可以只在内存中升级 V1 Payload，但不得写入 Storage；应用可以在 Vue Bootstrap 完成后通过自己的持久化边界保存已验证的 V2 值。

## 13.4 Pure Material Resolver

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

## 13.5 Ownership Boundary

`@platform/design-system` 负责机制：

```text
Zod schemas
one V2 default
V1 → V2 migration
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
Pinia state
matchMedia subscriptions
bootstrap order
index.html inclusion
runtime re-resolution orchestration
```

Design System 不得硬编码应用 Storage Key，也不得拥有 Pinia 或直接选择应用持久化策略。应用通过 `appearance-init.js` Script Element 的显式 `data-preference-storage-key` 提供 Storage Key；Application Store 与 HTML 必须使用同一个应用所有的 Key，并由静态治理验证一致性。

## 13.6 Factorized Conditional CSS

Generator 使用独立且有序的 Selector Overlay：

```text
base
+ theme
+ effective color mode
+ contrast
+ density
+ effective material
```

对应状态：

```text
:root
html[data-theme]
html[data-color-mode]
html[data-contrast]
html[data-density]
html[data-material]
```

禁止生成 Theme × Mode × Contrast × Density × Material 的完整笛卡尔积。只有命名的 Color Role 无法通过 Semantic Alias 和独立 Overlay 表达时，才允许在 Manifest 中登记最小的 Theme × Mode × Contrast Color-plane Compound；Generator 必须限制 Compound 数量。Density 与 Material 不得参与 Compound，Material Selector 不与其他轴相乘。所有生成 CSS 继续受初始 CSS Budget 约束。

## 13.7 颜色生成管线

```text
User Color Seed
       ↓
Zod Validation
       ↓
Color.js Parse
       ↓
Convert to OKLCH
       ↓
Generate Lightness Scale
       ↓
Adjust Chroma
       ↓
Gamut Mapping
       ↓
Semantic Role Mapping
       ↓
Named Contrast Pair Validation
       ↓
Safe Correction or Rejection
       ↓
Runtime CSS Variables
```

Color.js 支持 OKLCH、颜色空间转换和基于 CSS Color 4 方法的色域映射，适合作为用户主题颜色处理基础。

## 13.8 用户可修改

* 品牌色。
* 强调色。
* 中性色倾向。
* Color Mode。
* 对比度级别。
* Material Preference。
* 主题预设。
* 自定义主题名称。

## 13.9 用户不可修改

* 任意 CSS。
* 任意 UnoCSS 类名。
* 任意 CSS Variable 名称。
* 任意第三方 Token。
* JavaScript。
* HTML。
* 组件内部结构。
* 未经过校验的颜色、Material 或状态组合。

## 13.10 First Paint

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

应用在 `index.html` 显式提供自己的 Storage Key：

```html
<script
  src="/generated/appearance-init.js"
  data-preference-storage-key="application-owned-key"
></script>
```

示例值只是应用配置位置，不是 Design System 默认值；真实构建路径由 Vite Production Build 固定并由 Drift Check 验证。

`critical-theme.css` 默认提供 Neutral、Light、Standard、Comfortable、Solid 的安全基线及其最小 Critical Selector。初始化脚本在 Vue、Pinia 和应用模块执行前同步读取应用提供的 Storage Key，验证并升级偏好，然后解析并设置：

```text
effective colorMode
theme
density
fontScale
motion
contrast
effective material
```

初始化脚本不得读取未经校验的字段、内置应用 Storage Key、初始化 Pinia、请求网络、加载完整主题编辑器或把 Effective State 写回 Stored Preference。读取、解析或能力检测失败时保留 Solid Critical Baseline。它与 Runtime Resolver 必须从同一 canonical contract 生成并接受 Drift Check。

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

这些尺寸轴也不得与 Color Mode、Contrast 或 Material 绑定；Density、Font Scale、Touch Target、Radius、Contrast、Material 和 Layout 始终独立解析。

## 14.2 密度预设

```ts
type UiDensity =
  | 'compact'
  | 'comfortable'
  | 'spacious'
```

密度控制：

```text
controlHeight
controlPaddingInline
controlGap
fieldGap
sectionGap
toolbarHeight
navigationItemHeight
tableRowHeight
dialogPadding
listItemGap
```

密度不控制：

```text
fontScale
radius
sidebarPlacement
contentWidth
themeColor
layoutColumns
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
* 少量语义快捷类。

## 15.2 UnoCSS 不负责

* 自己维护颜色系统。
* 自己维护密度。
* 自己维护圆角体系。
* 自己生成第二套主题。
* 封装完整视觉组件。
* 保存用户自定义颜色。

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
* 静态检查只能验证声明、Import 和明显 Overflow 结构，不能证明真实浏览器 Scroll Owner；最终行为由 Tier 3 Owner Runtime Acceptance 验证。

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

## 25.1 Named Contrast Pairs

每个 Pair ID 必须在 Token Metadata 中映射到精确 Semantic Foreground 和 Background Path：

| Pair ID                     | Foreground                 | Background                                      |
| --------------------------- | -------------------------- | ----------------------------------------------- |
| `text-primary-on-page`      | `color.text.primary`       | `color.surface.page`                            |
| `text-primary-on-panel`     | `color.text.primary`       | `color.surface.panel`                           |
| `text-secondary-on-page`    | `color.text.secondary`     | `color.surface.page`                            |
| `text-secondary-on-panel`   | `color.text.secondary`     | `color.surface.panel`                           |
| `action-content-on-primary` | `color.text.on-action`     | `color.action.primary`                          |
| `focus-ring-on-page`        | `color.focus.ring`         | `color.surface.page`                            |
| `focus-ring-on-panel`       | `color.focus.ring`         | `color.surface.panel`                           |
| `material-chrome-content`   | `color.text.primary`       | `material.chrome.{reduced,solid}.background`    |
| `material-overlay-content`  | `color.text.primary`       | `material.overlay.{reduced,solid}.background`   |
| `material-modal-content`    | `color.text.primary`       | `material.modal.{reduced,solid}.background`     |

最低阈值：

| Contract   | Normal Text | Large Text | UI、Focus、Non-text |
| ---------- | ----------- | ---------- | ------------------- |
| Standard   | `≥ 4.5:1`   | `≥ 3:1`   | `≥ 3:1`             |
| Enhanced   | `≥ 7:1`     | `≥ 4.5:1` | `≥ 3:1`             |

Build-time Validation 枚举适用的 Theme × Effective Color Mode × Contrast Color Plane，并验证所有 Reduced 和 Solid Material Fallback。完整 Cartesian Enumeration 只允许用于静态验证，不允许直接生成同规模 CSS。

Adaptive Translucent Material 位于任意内容之上时，静态工具不能证明最终合成对比度。含文本的 Adaptive Chrome 必须提供经过准入的 Scrim、Backplate 或 Opacity Floor，并具有完整 Reduced 和 Solid Fallback；最终合成对比度由 Tier 1 或更高 Owner Runtime Acceptance 验证。

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

Owner Runtime Acceptance 通过 Codex 内置浏览器和已配置的 ChromeDev / Chrome DevTools 验证：

* 键盘操作与焦点行为。
* 语义结构与 Accessible Name。
* Named Contrast Pair、Adaptive 合成对比度、Reduced Motion、Reduced Transparency 与 Forced Colors。
* Touch Target 与触控行为。
* Responsive Reading Order。

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

`tokens` Layer 只由 Generator 输出，并按 §13.6 的 Factorized Order 排列。Material Selector 只写 `--ui-material-*`；应用和 Component Layer 不得复制 Token Condition Matrix。

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
* 指向 `pnpm verify` 与 Owner Runtime Acceptance。
* 在工作包 2 完成后，将 UI 范围显式路由到 `.ai/skills/pavp-ui/SKILL.md`。

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

`.ai/skills/pavp-ui/` 是 Phase 1 工作包 2 才创建的从属执行工作流，不是架构权威。它必须先读取 `AGENTS.md`、完整读取本文件、读取 `project.config.ts`、验证仓库和当前 Phase，然后才能：

* 分类 Task Mode。
* 生成不落盘的临时 Execution Contract。
* 组织实现、审查、静态验证和 Owner Runtime Acceptance。
* 在当前任务报告中输出证据、状态、延期项和最终 Worktree 状态。

它不得定义或保存新的视觉语言、固定 Token Value、Material Role、Motion Contract、Page Contract、Component API、Architecture Manifest、Registry 或客户端路由规则。它不得覆盖本文件。`SKILL.md` 只包含流程、Phase Check、Stop Condition、状态转换和报告路由，并具有 `name` 与 `description` Frontmatter；没有任意行数目标。

`specialist-lens-policy.md` 只能路由可选的官方 Primary-source Research。人员、Machine-local Skill、客户端插件或外部 Registry 永不成为 Phase、Dependency、Motion 或 GSAP Gate。

```text
PROJECT_UI_WORKFLOW_ARCHITECTURE_AUTHORITY=NONE
PROJECT_UI_WORKFLOW_ROLE=SUBORDINATE_EXECUTION_WORKFLOW
PROJECT_UI_WORKFLOW_CANONICAL_SOURCE=ARCHITECTURE.md
PROJECT_UI_WORKFLOW_CONFLICT_ACTION=STOP
```

本架构工作包只声明未来合同，不创建 `.ai/**`、不修改 `AGENTS.md` 或 Repository Policy。

## 28.3 Repository Portability and Explicit Discovery

```text
PROJECT_AUTHORITY_PORTABILITY=REPOSITORY_ONLY
PROJECT_UI_WORKFLOW_DISCOVERY=EXPLICIT_REPOSITORY_ROUTING
NATIVE_CLIENT_DISCOVERY=OPTIONAL_NOT_REQUIRED
```

`.ai/skills` 是通过 `AGENTS.md` 显式指向的仓库相对文件路径。PAVP 只承诺任意能够读取仓库文件的 Agent 可以按该路径执行，不承诺 Codex、Claude、Kimi 或其他客户端会原生、自动或零提示发现 `.ai/skills`。Native Discovery 只能是客户端可选增强，不能成为正确执行的前提。

工作包 2 完成后，允许的 `.ai` Regular File 精确为：

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

工作包 2 必须在同一原子变更中：

1. 增加上述五个 Regular File。
2. 为 `AGENTS.md` 增加最短 UI Route。
3. 将现有 Repository Policy 从 Blanket `.ai` Denial 改为上述精确 Allowlist。
4. 扩展现有 Policy Checker，拒绝 Tracked Symlink、Absolute Home Path Dependency、Machine-local Registry 和客户端专属 Project Authority。

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

外部 ChromeDev 或其他 Operator Capability 是非权威运行能力，不是仓库依赖或项目规范来源。

## 28.4 Workflow State Contract

Task Mode：

```text
architecture-review
plan
implement
review
runtime-acceptance
```

Status：

```text
COMPLETED
READ_ONLY_COMPLETE
PENDING_OWNER_ACCEPTANCE
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

只有与任务范围重叠的 Dirty Change 构成 `WORKTREE_SCOPE_CONFLICT`；无关用户变更必须保留。Architecture-review、Plan 和纯 Read-only Review 可以以 `READ_ONLY_COMPLETE` 结束。静态或运行验收失败时状态为 `FAILED` 并记录证据。需要但不可用的 Runtime Capability 导致 `BLOCKED`；静态通过但所需 Owner Runtime Acceptance 尚未执行时为 `PENDING_OWNER_ACCEPTANCE`。

独立验证字段：

```text
STATIC_VERIFICATION =
  PASS | FAIL | NOT_RUN | NOT_APPLICABLE

OWNER_RUNTIME_ACCEPTANCE =
  PASS | FAIL | PENDING | NOT_RUN | NOT_APPLICABLE

RUNTIME_ACCEPTANCE_TIER =
  TIER_0 | TIER_1 | TIER_2 | TIER_3
```

Implementation 只有在所需 Static Verification 为 `PASS`，且 Owner Runtime Acceptance 为 `PASS` 或依据 Tier 合法为 `NOT_APPLICABLE` 时，才能报告 `COMPLETED`。

状态映射：

```text
READ_ONLY_COMPLETE
→ each verification field is PASS, NOT_RUN, or NOT_APPLICABLE with RESULT_REASON

PENDING_OWNER_ACCEPTANCE
→ STATIC_VERIFICATION=PASS
→ OWNER_RUNTIME_ACCEPTANCE=PENDING

BLOCKED
→ STOP_REASON is required
→ any unexecuted required verification is NOT_RUN with RESULT_REASON

FAILED
→ the failing verification field is FAIL with evidence
```

`NOT_APPLICABLE` 表示适用 Tier 明确不要求该验证；`NOT_RUN` 表示允许或需要的验证没有执行；`PENDING` 只表示所需 Owner Runtime Acceptance 已明确延期。三者都必须提供 `RESULT_REASON`。

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
RUNTIME_ACCEPTANCE_TIER
OWNER_RUNTIME_ACCEPTANCE
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
| A11y              | ESLint + Owner ChromeDev Runtime Acceptance |
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

Generator 和 Verify Script 还必须在对应工作包检查：

```text
Phase-specific packages/ui dependency set
root-only @platform/ui imports
private adapter vendor imports
Token tier / visibility / namespace / output filtering
factorized selector and compound budget
Material adaptive / reduced / solid fallback completeness
first-paint generated-output drift
Preference V2 upgrade determinism
application-owned storage-key consistency
```

Optical CSS 检查必须覆盖 `apps/**/*.css` 与 Vue `<style>`，UI-internal CSS Variable 使用必须对照 Manifest。Direct Storage Rule 只允许应用所有的 `preference-storage.ts` 执行读写；另一个窄例外是 Generated `appearance-init.js` 可以使用应用通过 `data-preference-storage-key` 提供的 Key 执行同步只读 First-paint 访问。它不得写入 Storage，Design System 其他源文件和其他应用文件不得直接访问。

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

静态门槛可以验证：

```text
Phase-specific dependency sets
root-only imports and private adapter paths
Token tier / visibility / namespace / output filtering
forbidden page-authored Material and optical syntax
public Prop shape restrictions
declared Appearance and Scroll contracts
selector factorization and fallback completeness
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
```

静态检查不得宣称已经证明 Runtime-only Property；这些行为由适用 Tier 的 Owner Runtime Acceptance 验证。该模型不授权 Test、Browser Automation 或 Committed Evidence。

未来规则只有在其负责 Work Package 实现、接入 `pnpm verify` 并通过后才是机器强制；本文声明本身不代表 Validator 已存在。

## 31.3 GitHub 托管门槛

```text
CodeQL
GitHub Dependency Graph
Dependabot alerts
```

这些信号补充本地 `pnpm verify`，但不创建依赖更新分支。

---

# 32. Owner Runtime Acceptance

浏览器行为由 Owner 使用 Codex 内置浏览器和已配置的 ChromeDev / Chrome DevTools 完成显式运行时验收。

ChromeDev 是非权威 External Operator Capability，不是仓库依赖、Package、生成文件、已提交配置或架构层。Tier 由实际改变的最高 Browser-visible Surface 决定，不由文件名或 Package 名决定；更高 Tier 包含较低 Tier 中与该变更相关的检查。

## 32.1 Tier 0 — No Runtime Output

适用：

```text
Architecture
Documentation
Workflow
Schema-only change that does not alter generated or runtime output
```

要求：

```text
STATIC_VERIFICATION=PASS
OWNER_RUNTIME_ACCEPTANCE=NOT_APPLICABLE
RESULT_REASON=no runtime output
```

## 32.2 Tier 1 — Appearance and First Paint

适用于 Token、Theme、Contrast、Material、Generated CSS、Resolver 和 First-paint Output。Production Preview 必须验证：

* Console 和 Network。
* Light、Dark、System。
* Standard、Enhanced。
* Adaptive、Reduced、Solid。
* Forced Colors 与 Reduced Transparency。
* Unsupported Backdrop Fallback。
* 无 First-paint Flash。
* Named Contrast Pair 和 Adaptive 合成对比度。

## 32.3 Tier 2 — Shared Component or Interaction

包含相关 Tier 1 检查，并增加：

* Semantic Structure 与 Accessible Name。
* Keyboard、Visible Focus 与 Focus Return。
* Touch Target 与非拖动替代。
* Interruption、Reversal、Cleanup 和 Route Disposal。
* Full、Reduced、None Motion。

## 32.4 Tier 3 — Shell, Layout and Scroll

包含相关 Tier 2 检查，并增加：

* narrow、regular、wide Capability Projection。
* Hover、Pointer 和 Input Capability 组合。
* Zoom、Reflow、Safe Area 与 Dynamic Viewport。
* Responsive Reading Order。
* 每个 Axis 的精确 Scroll Owner。
* Background Lock、Focus Return、Scroll Restoration。
* Paint、Layer 和 Performance Observation。

Tier Assertion 必须基于 Capability，不能使用设备名称。

运行时验收证据只记录在任务完成报告中，不提交截图、录屏、Trace、基线资料、样例数据或证据目录。

---

# 33. 性能规则

初始预算：

| 资源          |                 初始预算 |
| ----------- | -------------------: |
| 初始应用 JS     |        ≤ 180 KB gzip |
| 初始 CSS      |         ≤ 40 KB gzip |
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
* Material 变更必须在适用 Runtime Tier 检查 Paint、Layer 和 Interaction Performance。
* Factorized Selector 与受限 Color-plane Compound 必须保持初始 CSS Budget。

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

Browser behavior is validated through Codex and configured ChromeDev runtime inspection.

Static gates plus explicit owner runtime acceptance are the complete validation model.

仓库不提交验证专用代码、测试专用目录或依赖、演示与展示系统、浏览器自动化基础设施或验证证据资产。

项目规范、执行合同和必需资源必须来自当前 Repository。Machine-local Rule、Global Skill、Client Registry、Absolute Home Path、External Symlink 或实时下载的规范文件不得成为项目正确执行的前提。

唯一未来例外是 §28.3 声明的五个 `.ai/skills/pavp-ui` Markdown 文件。它们是 Production Execution Workflow，不是 Test、Demo、Evidence 或第二份 Architecture。工作包 1 只声明 Allowlist；在工作包 2 原子加入 Workflow、最短 `AGENTS.md` Route 和 Policy 更新前，现有 Blanket `.ai` Denial 继续有效。

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

## 第一阶段

```text
Light / Dark / System
Standard / Enhanced Contrast
Adaptive / Reduced / Solid Material
3–5 个主题预设
品牌色
Compact / Comfortable / Spacious
90% / 100% / 110% / 120% 字号
Full / Reduced / None Motion
3–5 个布局预设
内容宽度
导航展开与折叠
```

## 第二阶段

```text
强调色
中性色倾向
连续密度微调
导航位置
面板显示与隐藏
面板宽度
面板顺序
按 narrow / regular / wide 保存布局
```

## 第三阶段

```text
高级语义颜色编辑器
主题导入和导出
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

交付：

```text
existing DTCG Token Source and Style Dictionary Build
existing Zod Validation
existing CSS Variables and TypeScript Token Types
existing UnoCSS Preset
existing Light / Dark / System
existing Compact / Comfortable / Spacious
Architecture amendment and subordinate workflow declaration
Appearance Preference V2 and V1 migration
independent Color Mode / Contrast / Material axes
Stored Preference / Effective State separation
pure Color Mode and Material resolvers
Token Visibility and filtered generated outputs
factorized selectors and bounded color compounds
minimal UI-internal chrome / overlay / modal Material roles
adaptive / reduced / solid projections and terminal fallbacks
named built-in contrast validation
critical-theme.css and synchronous appearance-init.js
Preference Schema Upgrades
Phase 1 static governance
packages/ui dependency-free src/index.ts stub
```

Phase 1 不实现 UI Component、`UiGlass`、Page Material API、Component Token Tree、Clear-media Role、Spring Family、Reka、Motion、GSAP 或 `packages/ui/src/internal/material`。

## Phase 2：基础 UI

交付：

```text
demand-driven foundational components
private Reka / Material / Focus / Overlay implementation only when consumed
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
Query Key Policy
Loading / Error / Empty Contract
```

## Phase 5：用户个性化

交付：

```text
OKLCH Theme Generator
Custom Brand Color
Custom-theme Contrast Correction or Rejection
Density Scale
Font Scale
Motion Preference
Navigation and Panel Preferences
Theme/Layout Import Export
```

Built-in Named Contrast Pair 和 Material Fallback Validation 属于 Phase 1；Phase 5 不承担基础 Contrast Contract。

## 37.1 Phase 1 Work-package Order

以下是 Phase 1 内部 Work Package，不是新的 Canonical Phase：

```text
1. PAVP_UI_ARCHITECTURE_AMENDMENT_GATE
2. PAVP_PROJECT_UI_SKILL_V1
3. PAVP_APPEARANCE_SCHEMA_V2
4. PAVP_GENERATOR_VISIBILITY_SELECTOR_ENFORCEMENT
5. PAVP_SEMANTIC_MATERIAL_TOKEN_EXPANSION
6. PAVP_UI_STATIC_GOVERNANCE
```

### 1. `PAVP_UI_ARCHITECTURE_AMENDMENT_GATE`

只修改 `ARCHITECTURE.md`，声明本节全部合同。不得修改 `AGENTS.md`、创建 `.ai/**`、修改 Policy、实现 Schema/Token/Generator/Runtime/App/UI、增加依赖或目录、增加 Test/Demo/Browser Automation/Evidence，或执行 Owner Runtime Acceptance。

```text
RUNTIME_ACCEPTANCE_TIER=TIER_0
OWNER_RUNTIME_ACCEPTANCE=NOT_APPLICABLE
RESULT_REASON=architecture-only change with no runtime output
```

### 2. `PAVP_PROJECT_UI_SKILL_V1`

原子加入 §28.3 的五个 Regular File、最短 `AGENTS.md` UI Route 和现有 Repository Policy 的精确 Allowlist/Symlink/Portability Enforcement。不实现 UI。

### 3. `PAVP_APPEARANCE_SCHEMA_V2`

实现唯一 V2 Default、Outer-envelope Schema Version、V1 Migration、Pure Resolver 和 First-paint Ownership Boundary。不得提前加入 Material Token Source。

### 4. `PAVP_GENERATOR_VISIBILITY_SELECTOR_ENFORCEMENT`

实现 Visibility Metadata、Tier/Source 解析、Output Filtering、Manifest Contract、Factorized Selector、Bounded Color Compound 和 Static No-leak Rule。该能力必须先于 Material Source。

### 5. `PAVP_SEMANTIC_MATERIAL_TOKEN_EXPANSION`

加入最少 Chrome、Overlay、Modal、Scrim、Named Contrast Pair 所需公共语义角色与完整 Adaptive/Reduced/Solid Projection，生成 First-paint Artifact，并由应用按 Ownership Contract 接入。不得公开 Internal Token 或创建 UI Component。

### 6. `PAVP_UI_STATIC_GOVERNANCE`

完成 Phase 1 全部静态 Enforcement、`pnpm verify` 和所有改变 Runtime Output 的 Tier 1 Owner Runtime Acceptance。

每个 Work Package 必须在进入下一包前通过其静态 Gate。工作包 5 如果把 Tier 1 Acceptance 明确交由工作包 6 合并执行，只能报告 `PENDING_OWNER_ACCEPTANCE`；工作包 6 通过前不得把 Phase 1 报告为完成。Generator Enforcement 与 Material Source 不得以会产生短暂 Public Leakage 的顺序落到 `main`。

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
STORED_PREFERENCE_NEVER_EQUALS_EFFECTIVE_STATE
DOM_USES_RESOLVED_COLOR_MODE_AND_EFFECTIVE_MATERIAL
EFFECTIVE_APPEARANCE_IS_DERIVED_NOT_PERSISTED
APPLICATION_OWNS_PREFERENCE_STORAGE_AND_STORAGE_KEY
DESIGN_SYSTEM_HAS_NO_HARDCODED_STORAGE_KEY

PROJECT_DESIGN_TOKENS_ARE_THE_ONLY_VISUAL_AUTHORITY
UNOCSS_IS_AN_EXPRESSION_ENGINE_NOT_A_DESIGN_AUTHORITY
TOKEN_VISIBILITY_CONTROLS_GENERATED_OUTPUTS
UI_INTERNAL_TOKENS_NEVER_ENTER_PUBLIC_TS_OR_UNOCSS
UI_INTERNAL_TOKENS_NEVER_ENTER_PUBLIC_TOKEN_NAMES
SELECTOR_OUTPUT_IS_FACTORIZED_NOT_FULL_CARTESIAN
EVERY_MATERIAL_ROLE_HAS_ADAPTIVE_REDUCED_AND_SOLID_PROJECTIONS
SOLID_IS_THE_TERMINAL_MATERIAL_FALLBACK
GENERATOR_CAPABILITY_PRECEDES_MATERIAL_SOURCE_EXPANSION

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

USER_CUSTOMIZATION_IS_SCHEMA_CONSTRAINED_NOT_CSS_INJECTION
DENSITY_FONT_SCALE_TOUCH_TARGET_RADIUS_CONTRAST_MATERIAL_AND_LAYOUT_ARE_INDEPENDENT_AXES
SERVER_STATE_BELONGS_TO_TANSTACK_QUERY
CLIENT_STORED_STATE_BELONGS_TO_PINIA

MAIN_ONLY_MAINTENANCE
PRODUCTION_ONLY_REPOSITORY
NO_TEST_DEMO_OR_BROWSER_EVIDENCE_INFRASTRUCTURE
NO_SHOWCASE_OR_RUNTIME_EVIDENCE_INFRASTRUCTURE
PNPM_VERIFY_IS_THE_COMPLETE_STATIC_PRODUCTION_GATE
STATIC_GATES_DO_NOT_CLAIM_RUNTIME_PROOF
OWNER_RUNTIME_ACCEPTANCE_REMAINS_EXTERNAL
OWNER_RUNTIME_ACCEPTANCE_IS_TIERED_0_TO_3
NO_RUNTIME_EVIDENCE_COMMITTED

EACH_STATIC_RULE_IS_ENFORCED_BY_COMPLETION_OF_ITS_OWNING_WORK_PACKAGE
NO_FUTURE_RULE_IS_CLAIMED_ENFORCED_BEFORE_ITS_GATE
```

---

# 41. 最终架构摘要

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
+ Factorized Conditional Selectors
+ Style Dictionary 5.4
+ Zod 4
+ Color.js / OKLCH
+ Runtime CSS Variables
+ Appearance Preference V2
+ Stored / Effective Appearance Separation
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
+ Tiered External ChromeDev Runtime Acceptance
+ GitHub Actions
```

最终规模：

```text
1 production application
2 internal packages
1 architecture authority
1 AI entry
1 subordinate repository-readable UI workflow after work package 2
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
