# Progressive Adaptive Vue Platform

## 全新个人超级前端架构 v1.0

```text
STATUS=CANONICAL_ARCHITECTURE_BASELINE_V1
PROJECT_MODEL=GREENFIELD
IMPLEMENTATION_STATE=NOT_STARTED
MAINTENANCE_MODEL=SOLO_MAIN_BRANCH
ARCHITECTURE_AUTHORITY=ARCHITECTURE.md
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
3. 用户可以切换 Light、Dark、System 和高对比模式。
4. 用户可以选择 Compact、Comfortable、Spacious。
5. 用户可以独立调节字号、动效和内容宽度。
6. 用户可以调整导航、面板、工作区和页面布局。
7. 同一套代码支持 PC、iPad、平板和手机 H5。
8. UI 能根据容器空间和输入能力自动改变形态。
9. AI Agent 只能沿着明确的目录和依赖方向修改代码。
10. 规范通过 TypeScript、Lint、架构检查和 CI 执行，而不是依赖记忆。

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
| Token 构建        | Style Dictionary 4 + 项目 Preprocessor |
| Token 校验        | Zod 4                                |
| 颜色处理            | Color.js                             |
| 用户配色空间          | OKLCH                                |
| 运行时主题           | CSS Custom Properties                |
| 复杂交互原语          | Reka UI                              |
| 简单控件            | 原生语义 HTML                            |
| 项目 UI 公共层       | `@platform/ui`                       |
| 简单动画            | CSS                                  |
| 页面主题切换          | View Transition，渐进增强                 |
| 布局动画            | Motion for Vue，按需                    |
| 组件工作台           | Storybook Vue 3 + Vite               |

UnoCSS `presetWind4` 是官方 Tailwind 4 风格 Preset，包含内部 Reset、按需主题变量和现代 CSS Property Layer；Attributify 是独立可选 Preset，不在本架构启用。

DTCG 2025.10 是稳定技术报告，但不是 W3C Standards Track 标准；Style Dictionary 4 已支持 DTCG 格式，但官方说明对 2025.10 的完整支持仍在推进。因此架构采用“稳定子集 + 显式 Schema”，不绑定尚未完整实现的边缘能力。

Reka UI 提供无样式、可访问、完整类型化的 Vue 原语，负责 ARIA、键盘导航和焦点管理；其 Drawer 在 2.10 中仍标记为 Alpha，所以 Drawer 不作为首版不可替换的公共实现合同。

## 3.3 工程质量层

| 领域             | 最终选择                                |
| -------------- | ----------------------------------- |
| Type Check     | `vue-tsc`                           |
| JS/TS/Vue Lint | ESLint 10 Flat Config               |
| Vue 规范         | `eslint-plugin-vue`                 |
| TS 规范          | `typescript-eslint`                 |
| A11y Lint      | `eslint-plugin-vuejs-accessibility` |
| UnoCSS Lint    | `@unocss/eslint-plugin`             |
| 导入边界           | `eslint-plugin-boundaries`          |
| CSS Lint       | Stylelint                           |
| 格式化            | Prettier                            |
| 未使用代码          | Knip                                |
| 单元测试           | Vitest                              |
| Vue 组件测试       | Vue Test Utils                      |
| 浏览器验收          | Playwright                          |
| A11y 浏览器测试     | `@axe-core/playwright`              |
| UI 文档          | Storybook                           |
| 依赖审查           | GitHub Dependency Graph + Dependabot alerts |
| CI             | GitHub Actions                      |
| 安全扫描           | CodeQL                              |

ESLint 10 已进入稳定版本，当前 10.x 持续发布更新，并以 Node 24 LTS 作为主要运行环境之一。

Storybook 的 Vue 3 + Vite 集成能够复用 Vite 配置并使用 `vue-component-meta` 生成组件文档；Storybook 10.3 已增加 Vite 8 和 ESLint 10 支持。

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

# 5. 最终仓库结构

```text
progressive-adaptive-vue-platform/
├── apps/
│   └── web/
│       ├── public/
│       │   ├── favicon.svg
│       │   └── static/
│       │
│       ├── src/
│       │   ├── app/
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
│       │   │   │   ├── apply-appearance.ts
│       │   │   │   ├── preference-schema-upgrades.ts
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
│       │   ├── pages/
│       │   │   ├── index.vue
│       │   │   ├── settings/
│       │   │   └── [...path].vue
│       │   │
│       │   ├── features/
│       │   │   └── <feature-name>/
│       │   │       ├── api/
│       │   │       ├── model/
│       │   │       ├── ui/
│       │   │       ├── lib/
│       │   │       ├── types.ts
│       │   │       └── index.ts
│       │   │
│       │   ├── shared/
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
│   └── ui/
│
├── scripts/
│   ├── architecture/
│   ├── codegen/
│   ├── tokens/
│   └── verify/
│
├── tests/
│   └── e2e/
│       ├── fixtures/
│       ├── appearance/
│       ├── responsive/
│       ├── accessibility/
│       └── navigation/
│
├── docs/
│   ├── decisions/
│   ├── architecture/
│   ├── accessibility/
│   └── quality/
│
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── manager.ts
│
├── .github/
│   └── workflows/
│       ├── verify.yml
│       └── e2e.yml
│
├── AGENTS.md
├── ARCHITECTURE.md
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
├── playwright.config.ts
├── vitest.config.ts
├── knip.jsonc
├── commitlint.config.mjs
├── .editorconfig
├── .gitattributes
├── .gitignore
├── .npmrc
└── LICENSE
```

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
packages/test-utils
apps/desktop
apps/mobile
apps/docs
```

## 新 Package 创建门槛

同时满足以下条件才允许拆包：

1. 至少两个真实应用消费。
2. 公共 API 已稳定。
3. 拆包能减少依赖或构建成本。
4. 存在独立测试价值。
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
* UI Package 是唯一允许导入 Reka UI 的位置。
* 专业 Grid、Editor、Charts 只能在 Adapter 中导入。

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

完整目录：

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
│   │   └── layout.tokens.json
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
│   │   ├── apply-theme.ts
│   │   ├── apply-density.ts
│   │   ├── create-custom-theme.ts
│   │   ├── preference-schema-upgrades.ts
│   │   └── first-paint.ts
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
│   │   ├── tokens.ts
│   │   ├── token-names.ts
│   │   ├── unocss-theme.ts
│   │   └── tokens.manifest.json
│   │
│   └── index.ts
│
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

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

---

# 13. 主题和用户配色系统

## 13.1 根节点状态

```html
<html
  data-color-mode="dark"
  data-theme="ocean"
  data-density="comfortable"
  data-motion="full"
  data-contrast="standard"
>
```

`system` 是用户偏好值，不是最终 DOM 模式。运行时解析为：

```text
light
dark
```

同时设置：

```css
color-scheme: light dark;
```

## 13.2 用户主题 Schema

```ts
interface UserThemePreference {
  schemaVersion: 1

  colorMode:
    | 'light'
    | 'dark'
    | 'system'
    | 'high-contrast'

  palette: {
    brand: string
    accent: string
    neutral: 'cool' | 'neutral' | 'warm'
  }

  contrast:
    | 'standard'
    | 'enhanced'
}
```

## 13.3 颜色生成管线

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
WCAG Contrast Validation
       ↓
Safe Correction or Rejection
       ↓
Runtime CSS Variables
```

Color.js 支持 OKLCH、颜色空间转换和基于 CSS Color 4 方法的色域映射，适合作为用户主题颜色处理基础。

## 13.4 用户可修改

* 品牌色。
* 强调色。
* 中性色倾向。
* Color Mode。
* 对比度级别。
* 主题预设。
* 自定义主题名称。

## 13.5 用户不可修改

* 任意 CSS。
* 任意 UnoCSS 类名。
* 任意 CSS Variable 名称。
* 任意第三方 Token。
* JavaScript。
* HTML。
* 组件内部结构。
* 未经过校验的颜色状态组合。

## 13.6 首屏无闪烁

构建输出：

```text
critical-theme.css
appearance-init.js
```

加载顺序：

```text
critical-theme.css
       ↓
appearance-init.js
       ↓
Vue Bootstrap
```

初始化脚本只读取：

```text
colorMode
theme
density
fontScale
motion
contrast
```

不初始化 Pinia，不请求网络，不加载完整主题编辑器。

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
无命名空间 Shortcut
```

---

# 16. UI Package

目录：

```text
packages/ui/
├── src/
│   ├── components/
│   │   ├── actions/
│   │   ├── forms/
│   │   ├── overlays/
│   │   ├── navigation/
│   │   ├── feedback/
│   │   ├── data-display/
│   │   └── layout/
│   │
│   ├── adapters/
│   │   ├── reka/
│   │   ├── grid/
│   │   ├── editor/
│   │   └── charts/
│   │
│   ├── composables/
│   ├── styles/
│   ├── internal/
│   ├── types/
│   └── index.ts
│
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

## 16.1 简单组件使用原生 HTML

```text
UiButton
UiIconButton
UiInput
UiTextarea
UiBadge
UiCard
UiDivider
UiSkeleton
UiSpinner
UiEmptyState
```

## 16.2 复杂组件使用 Reka UI

```text
UiDialog
UiSheet
UiPopover
UiTooltip
UiSelect
UiCombobox
UiMenu
UiContextMenu
UiTabs
UiAccordion
UiTree
UiDateField
```

## 16.3 首期组件清单

```text
UiButton
UiIconButton
UiInput
UiTextarea
UiCheckbox
UiRadio
UiSwitch
UiSelect
UiFormField
UiDialog
UiSheet
UiPopover
UiMenu
UiTooltip
UiTabs
UiToast
UiSpinner
UiEmptyState
UiToolbar
UiPageShell
UiResponsiveNavigation
```

## 16.4 首期禁止建设

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
```

## 16.5 导入规则

业务代码只允许：

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
* 支持三档密度。
* 支持 Reduced Motion。
* 提供 Storybook Story。
* 提供至少一个正确用法。
* 提供无障碍名称要求。

示例：

```ts
interface UiButtonProps {
  appearance?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(
  defineProps<UiButtonProps>(),
  {
    appearance: 'primary',
    size: 'md',
    type: 'button',
  },
)

const emit = defineEmits<{
  press: [event: MouseEvent]
}>()
```

禁止创建没有语义价值的 Wrapper。

允许封装的条件：

1. 固定复杂 A11y 行为。
2. 固定主题和密度合同。
3. 隔离第三方实现。
4. 至少两个页面真实复用。
5. 固定跨页面业务模式。

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
  mobileProjection: 'stack' | 'tabs' | 'sheet'
}
```

用户只能在页面声明的能力范围内调整布局。

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

每个区域必须明确：

```text
Viewport Owner
Route Owner
Page Owner
Region Owner
Scroll Owner
```

规则：

* 页面不能依赖意外的 Body Scroll。
* 同轴嵌套滚动默认禁止。
* 虚拟列表可以拥有内部滚动区。
* Dialog 和 Sheet 必须隔离背景滚动。
* 切换布局后必须保持合理的滚动恢复。
* 页面根和内部表格不能同时争夺垂直滚动。

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

专业 Grid 不进入业务页面，只通过：

```text
@platform/ui/adapters/grid
```

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
2. View Transition API
3. Motion for Vue
4. Product-specific GSAP
```

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
motion.spring.snappy
motion.spring.gentle
```

---

# 25. 无障碍基线

目标：

```text
WCAG 2.2 AA
```

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
* High Contrast。
* Forced Colors。
* Touch Target。
* Responsive Reading Order。

拖动操作必须存在非拖动替代方案；WCAG 2.2 对 Dragging Movement 已提出对应要求。

测试层：

```text
eslint-plugin-vuejs-accessibility
axe
Playwright keyboard paths
manual screen-reader baseline
```

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

---

# 27. 代码结构规范

## 27.1 命名

```text
Vue components: PascalCase.vue
TypeScript files: kebab-case.ts
Composables: use-*.ts
Schemas: *.schema.ts
Stores: *.store.ts
Tests: *.spec.ts
Stories: *.stories.ts
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

## 28.1 只保留两个权威入口

```text
AGENTS.md
ARCHITECTURE.md
```

### `AGENTS.md`

控制在约 100–150 行，包含：

* 技术栈。
* 依赖方向。
* Token 唯一来源。
* UI 导入规则。
* 禁止事项。
* 文件结构。
* 验证命令。
* `ARCHITECTURE.md` 链接。

### `ARCHITECTURE.md`

唯一完整架构正文，包含：

* 架构层级。
* 目录。
* 主题。
* 密度。
* 布局。
* UI。
* 状态。
* API。
* A11y。
* 测试。
* 扩展门槛。

禁止重新建立：

```text
.ai/protocol
.ai/rules
.ai/manifests
skill router
client adapters
multiple canonical UI rules
```

## 28.2 ADR

```text
docs/decisions/
├── ADR-0001-vue-vite.md
├── ADR-0002-unocss.md
├── ADR-0003-reka-ui.md
├── ADR-0004-design-tokens.md
└── ADR-0005-server-state.md
```

ADR 只解释历史原因，不承担规范权威。

## 28.3 机器强制规则

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
| A11y              | ESLint + axe + Playwright  |
| 构建体积              | Bundle Budget              |

## 28.4 显式导入

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
no-reka-import-outside-ui
no-vendor-ui-outside-adapters
no-direct-storage-access
no-user-agent-layout-branching
no-workspace-deep-import
```

不创建独立 ESLint Package。

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

pnpm typecheck
pnpm lint
pnpm lint:css
pnpm format
pnpm format:check

pnpm test
pnpm test:browser
pnpm test:e2e
pnpm test:a11y

pnpm storybook
pnpm storybook:build

pnpm check:arch
pnpm check:unused
pnpm check:bundle

pnpm verify:fast
pnpm verify
pnpm verify:ci
```

## 31.1 `verify:fast`

```text
token generation check
format check
ESLint
Stylelint
vue-tsc
architecture boundaries
```

## 31.2 `verify`

```text
verify:fast
unit tests
component tests
Knip
production build
Storybook build
bundle budget
```

## 31.3 `verify:ci`

```text
verify
Playwright E2E
accessibility matrix
responsive matrix
visual regression
```

---

# 32. CI 验证矩阵

## Viewport

```text
390 × 844
768 × 1024
1024 × 768
1440 × 900
1920 × 1080
```

## Appearance

```text
Light
Dark
High Contrast
Forced Colors
```

## Density

```text
Compact
Comfortable
Spacious
```

## Motion

```text
Full
Reduced
None
```

## Input

```text
Mouse
Keyboard
Touch
Hybrid
```

Playwright 支持设备、Viewport、Touch、Color Scheme、Locale 和 Timezone 模拟。验证使用 Pairwise 代表组合，不执行全部笛卡尔积。

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

# 35. Storybook 使用边界

Story 与组件放在一起：

```text
UiButton.vue
UiButton.spec.ts
UiButton.stories.ts
```

每个核心 Story 至少覆盖：

```text
default
disabled
loading
keyboard focus
compact
comfortable
spacious
light
dark
high contrast
long text
```

Storybook 是开发和文档工具，不进入生产 Bundle。

---

# 36. 用户个性化发布顺序

## 第一阶段

```text
Light / Dark / System
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
GitHub Actions
```

## Phase 1：Design System

交付：

```text
DTCG Token Source
Style Dictionary Build
Zod Validation
CSS Variables
TypeScript Token Types
UnoCSS Preset
Light / Dark / System
Compact / Comfortable / Spacious
First Paint Script
Preference Schema Upgrades
```

## Phase 2：基础 UI

交付：

```text
20 个左右基础组件
Reka Adapter
Form Field
Dialog / Sheet / Popover
Navigation
Toast
Storybook
A11y Baseline
```

## Phase 3：App Shell 与布局

交付：

```text
AppViewport
AppShell
Scroll Ownership
narrow / regular / wide
Layout Resolver
Route Capability
Safe Area
Container Query
User Layout Presets
```

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
Contrast Validation
Density Scale
Font Scale
Motion Preference
Navigation and Panel Preferences
Theme/Layout Import Export
```

---

# 38. 延迟引入的能力

| 能力               | 引入门槛                    |
| ---------------- | ----------------------- |
| Turbo            | Package 或 CI 时间出现真实瓶颈   |
| TanStack Table   | 页面需要排序、过滤或分页            |
| TanStack Virtual | 测量证明 DOM 成为瓶颈           |
| AG Grid          | 同时出现两个以上电子表格式需求         |
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
vitest
@vue/test-utils
playwright
@axe-core/playwright
storybook
@storybook/vue3-vite
knip
commitlint
lint-staged
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

```text
vue
reka-ui
motion-v
@platform/design-system
clsx
```

---

# 40. 最终不变原则

```text
Project Design Tokens are the only visual authority.

UnoCSS is an expression engine, not a design authority.

Reka UI is an interaction primitive, not a visual authority.

Application pages never import low-level UI vendors.

User customization is schema-constrained, not CSS injection.

Responsive behavior is capability-driven, not device-name-driven.

Density, font scale, touch target, radius, and layout are independent axes.

Server state belongs to TanStack Query.

Client state belongs to Pinia.

Every shared boundary has a public export.

Every enforceable rule is enforced by tooling.

AGENTS.md is the only AI entry.

ARCHITECTURE.md is the only architecture authority.

New abstractions require real consumers.

Specialist components use replaceable adapters.

One command verifies the complete architecture.
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
+ Style Dictionary 4
+ Zod 4
+ Color.js / OKLCH
+ Runtime CSS Variables
+ Reka UI
+ Progressive Project UI
+ Pinia
+ TanStack Vue Query
+ Native Fetch
+ VeeValidate 5
+ VueUse
+ Vue I18n
+ CSS / View Transitions
+ Motion for Vue
+ Storybook
+ Vitest
+ Playwright
+ axe
+ ESLint 10
+ Stylelint
+ Prettier
+ Knip
+ GitHub Actions
```

最终规模：

```text
1 production application
2 internal packages
1 architecture authority
1 AI entry
1 verification command
1 protected main branch
0 branch-based maintenance workflows
```

# Foundational Architecture Values

These are native principles of Progressive Adaptive Vue Platform:

- Single Source of Truth
- Typed Contracts
- Pure Constraint Resolvers
- Public Export Boundaries
- Executable Architecture Rules
- One-command Verification
