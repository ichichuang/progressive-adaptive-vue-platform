# 01 · 统一错误页 `<ErrorPage>` 视觉规格

> 对应评审报告：问题 #3（P0/P1）、第三节第 2 部分（七个错误页）、第六节设计方向。
> 交付对象：编码 agent。本文只给规格与令牌，不含实现代码。

## 1. 现状与目标

现状（均已核实）：

- 7 个错误页 `apps/web/src/pages/error/{400,401,403,500,maintenance,offline}.vue` + 兜底 `apps/web/src/app/errors/RouteNotFoundView.vue`（404），每页 66 行、结构重复。
- 路由 `/error/<category>`，类别见 `apps/web/src/app/router/route-registry.ts` 的 `errorRouteRegistry`：`invalid-route-input / authentication-required / permission-denied / route-not-found / application-route-failure / network-unavailable / service-unavailable`。
- 文案键 `route-title.error-*`、`route-message.error-*` 已存在于 `apps/web/src/shared/i18n/messages/{zh-CN,en}/common.json`，但标题与说明同义反复。
- 视觉问题：实心深紫大块压过内容；组合整体偏左约 100px（1024 视口比例）；7 页共用一个 `i-lucide-circle-alert`；只有一个"返回工作台"按钮。

目标：一个配置驱动的 `<ErrorPage>` 组件替换 7 个页面文件（页面文件保留为 3 行薄壳，仅传 `status`），真正居中、语义分色、双语文案、一主一次按钮、令牌驱动、动效可关。

## 2. 组件契约

新组件 `apps/web/src/app/errors/ErrorPage.vue`：

```ts
interface ErrorPageProps {
  readonly status: '400' | '401' | '403' | '404' | '500' | '503' | 'offline'
  readonly errorRef?: string        // 500：等宽错误编号，如 "ERR-20261115-01"；可复制
  readonly eta?: string             // 503：预计恢复时间文案（可选）
}
```

配置表 `errorPageConfig`（同目录 `error-page-config.ts`）按 `status` 给出：图标、语义容器令牌、主/次按钮行为。按钮统一用 `NButton`（naive-ui，仓库既有选型，不得换库）。

## 3. 布局

```
┌──────────────────────────── min-h-dvh（grid place-items-center）─────────────┐
│  padding-inline: var(--ui-space-page-inline)   /* 24px */                    │
│  padding-block:  var(--ui-space-section-block) /* 32px */                    │
│  ┌──────────── 内容块 max-inline-size: var(--ui-layout-error-content-max) ─┐ │
│  │   display:flex; gap: var(--ui-space-section-block); align-items:center  │ │
│  │ ┌────────┐  ┌──────────────────────────────────────────────────┐        │ │
│  │ │ 徽标块  │  │ H1 标题 / 说明 / 按钮组 /（错误编号·常用入口）      │        │ │
│  │ └────────┘  └──────────────────────────────────────────────────┘        │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

| 项 | 值 | 令牌 |
|---|---|---|
| 内容块最大宽 | 40rem（640px） | **新增** `--ui-layout-error-content-max` |
| 徽标块尺寸 | 10rem × 10rem（160×160），grid 居中，`gap: var(--ui-space-content-gap)` | NEW token 同下表 |
| 徽标块圆角 / 描边 | `--ui-radius-panel`（12px）/ `var(--ui-border-width) solid var(--ui-color-border-subtle)` | 既有 + 新增 subtle |
| 图标尺寸 | 3rem（48px） | **新增** `--ui-icon-size-badge` |
| 状态码字号 | 2.5rem（40px）/ `--ui-font-weight-title`（700）/ `tabular-nums` | **新增** `--ui-font-size-display` |
| 徽标块与文字列间距 | 32px | `--ui-space-section-block` |
| 标题 | `--ui-font-size-heading`（22px）/ **新增** `--ui-font-weight-semibold`（600）/ `--ui-color-text-primary` | |
| 说明 | `--ui-font-size-body`（16px）/ 行高 `--ui-font-line-height-body`（1.5）/ `--ui-color-text-secondary`，`max-inline-size: 34rem` | |
| 按钮组 | `gap: var(--ui-space-content-gap)`（12px），上边距 `--ui-space-content-gap` | |
| 主按钮 | `NButton type="primary"` 默认尺寸（高 `--ui-control-height`，44px，恰好满足 44px 触达令牌） | |
| 次按钮 | `NButton secondary` 默认尺寸 | |
| 文字链接 | `NButton quaternary size="small"` | |

> 评审建议的 20px 徽标圆角、24px 标题、14px 说明，分别就近取整到既有令牌 12px / 22px / 16px，避免新增一次性数值；40px 状态码与 48px 图标超出既有字阶，按新增令牌处理（见第 8 节）。

断点（令牌驱动，媒体查询引用既有 profile 令牌）：

- 视口 ≥ `--ui-layout-profile-regular-minimum-inline-size`（48rem/768px）：左右两栏（徽标左、文字左对齐）。
- 视口 < 48rem：纵向堆叠、文字与徽标居中（`justify-items:center; text-align:center`），徽标块缩至 `--ui-icon-size-circle-multiple-size`（12.5rem/200px）与图标比例不变；按钮组变全宽（`flex-basis:100%`）。
- 超高保障：内容块在 `min-h-dvh` 内居中；视口高度不足时容器自身滚动（`place-items:center` + `margin-block:auto`），不出现整页滚动条。

左上角固定 PAVP 标识：`position:absolute; inset-block-start: var(--ui-space-panel-padding); inset-inline-start: var(--ui-space-page-inline)`，使用现有欢迎页标识资产，高度 `--ui-icon-size-large`（24px），颜色 `--ui-color-text-secondary`。

## 4. 每个状态的语义色、图标与文案

语义容器令牌（**新增**，成对，见第 8 节）：`--ui-color-status-{info|success|warning|error}-soft-background / -soft-foreground`、`--ui-color-action-primary-soft-background / -soft-foreground`（品牌紫容器）、`--ui-color-surface-muted`（中性容器，前景直接用 `--ui-color-text-secondary`）。

| status | 图标（lucide，沿用 `i-lucide-*`） | 容器令牌 | 状态码显示 |
|---|---|---|---|
| 400 | `i-lucide-link-2-off` | `status-warning-soft-*` | 400 |
| 401 | `i-lucide-lock` | `action-primary-soft-*` | 401 |
| 403 | `i-lucide-shield` | `status-warning-soft-*` | 403 |
| 404 | `i-lucide-compass` | `action-primary-soft-*` | 404 |
| 500 | `i-lucide-triangle-alert` | `status-error-soft-*` | 500 |
| offline | `i-lucide-wifi-off` | `surface-muted`（+ text-secondary） | OFFLINE 改为 `navigator.onLine` 状态点 |
| 503（maintenance） | `i-lucide-wrench` | `status-warning-soft-*` | 503（替换 SERVICE 英文大字） |

> 403 用琥珀不用红：红色只留给 500 一类系统故障（评审结论，维持）。offline 页不放数字码，放 8px 状态圆点（`--ui-space-component-unit` ×2）+ "网络已断开"。

文案（新增 i18n 键 `errorPage.*`，加入 `apps/web/src/shared/i18n/messages/{zh-CN,en}/common.json`；旧 `route-title.error-*` / `route-message.error-*` 保留作兜底但页面不再直接引用）：

| status | 标题 zh / en | 说明 zh / en | 主按钮 | 次按钮 | 附加 |
|---|---|---|---|---|---|
| 400 | 链接地址有误 / Bad link | 链接格式不正确或缺少参数，请检查网址后重试。/ The link is malformed or missing parameters. Check it and try again. | 返回上一页 `history.back()` | 返回工作台（既有 `error.backToWorkbench`） | — |
| 401 | 需要登录 / Sign-in required | 登录已过期或尚未登录，请登录后继续。/ Your session has expired or you are not signed in. | 去登录（示例）/ Sign in (demo) — 指向演示说明 toast，不得是死按钮 | 返回工作台 | — |
| 403 | 暂无访问权限 / No access | 当前账号没有此页面的权限，如需使用请联系管理员。/ Your account lacks permission for this page. Contact an administrator if you need it. | 返回上一页 | 返回工作台 | 可选：所需权限标识 `UiStatusBadge` |
| 404 | 页面不存在 / Page not found | 页面可能已被移动或删除，或地址输入有误。/ The page may have been moved or removed, or the address is mistyped. | 返回工作台 | 返回上一页 | 底部 3 个常用入口文字链接：仪表盘 · 组件 · 表格 |
| 500 | 系统出错了 / Something went wrong | 处理请求时发生异常，请刷新重试；问题持续请反馈错误编号。/ An unexpected error occurred while processing your request. Retry, and report the reference if it persists. | 刷新重试 `window.location.reload()` | 返回工作台 | 错误编号行：`--ui-font-size-caption` + `tabular-nums` + `UiCopyAction`（既有复制组件）；显示 `errorRef` 与本地时间 |
| offline | 网络已断开 / You're offline | 请检查网络连接，恢复后会自动刷新。/ Check your connection — this page refreshes automatically once you're back online. | 重新检测（读 `navigator.onLine`） | 返回工作台 | 监听 `window 'online'`，恢复后 200ms 内自动 `reload()` |
| 503 | 服务维护中 / Under maintenance | 服务暂时不可用，通常几分钟内恢复。/ The service is temporarily unavailable. It usually recovers within a few minutes. | 刷新重试 | — | 有数据时显示 `eta`（"预计 15:30 恢复"），同错误编号字号 |

文案规则：标题 ≤6 个汉字 / ≤3 个英文词；说明一句话、说"发生了什么 + 用户能做什么"；禁止标题与说明同义反复；状态码体系统一为数字（400/401/403/404/500/503），删除 SERVICE、OFFLINE 英文大字。

## 5. 按钮层级

每页恰好：1 个主按钮（恢复路径）+ 1 个次按钮（返回工作台）+ 至多 1 组文字链接（404 常用入口）。主按钮语义按上表；图标仅主按钮有（左侧 `i-lucide-rotate-cw` / `i-lucide-arrow-left` / `i-lucide-log-in`），次按钮与文字链接无图标。

## 6. 动效（transform/opacity only）

沿用仓库动效模式：Vue `<Transition>` + CSS 变量，并受 `document.documentElement.dataset.motion`（`resolve-motion` 已同时尊重 `prefers-reduced-motion`）门控，`full` 才播放。

| 阶段 | 元素 | 动画 | 时长 / 缓动 |
|---|---|---|---|
| 进入 | 内容块 | `opacity 0→1` + `translateY(calc(var(--ui-space-component-unit) * 2) → 0)`（8px） | `--ui-motion-duration`（200ms）/ `--ui-motion-easing` |
| 进入（错峰） | 徽标块 | `opacity 0→1` + `scale(0.96 → 1)`，`transition-delay: calc(var(--ui-motion-duration) * 0.3)` | 同上 |
| 离开 | 内容块 | `opacity 1→0`（无位移） | `--ui-motion-duration-fast`（120ms） |
| offline 恢复 | 状态圆点 | `scale(1→1.25→1)` 一次脉冲 | 200ms / standard |

reduced-motion（`data-motion` ≠ `full`）：进入/离开只保留 opacity 淡入淡出（120ms），删除位移与缩放；`entrance: 'none'` 时完全无过渡。路由级过渡继续走既有 `route-family.error` 家族配置，不新增。

## 7. 暗色模式

无任何页面级写死色：徽标容器、文字、按钮全部引用语义令牌，暗色由 `data-color-mode='dark'` 自动切换。新增 soft 令牌已给暗色值（第 8 节）。校验点：暗色下徽标容器与页面底（`--ui-color-surface-page`，royal-iris 暗色 #10101c）的明度差需可辨——`status-*-soft-background` 暗色值均为面板色 + 20% 语义色混合，实测与页面底对比 ≥1.05:1 且互相区分；文字用对应 `-soft-foreground`，对比全部 ≥5:1（实测见 03 号文档第 5 节）。

## 8. 新增令牌清单（唯一数值来源）

| 令牌 | light / dark 值 | 加入文件 |
|---|---|---|
| `--ui-layout-error-content-max` | 40rem | `packages/design-system/tokens/primitive/dimension.tokens.json` → `dimension.layout.error-content-max`，semantic 映射加 `layout.error.content-max-width` |
| `--ui-icon-size-badge` | 3rem | `dimension.icon.badge`（同上 primitive 文件） |
| `--ui-font-size-display` | 2.5rem | `font.size.display`（`primitive/typography.tokens.json`）+ semantic `typography.size.display` |
| `--ui-font-weight-semibold` | 600 | `font.weight.semibold`（primitive typography）+ semantic `typography.weight.semibold` |
| `--ui-color-text-tertiary` | #6a6880 / #9495ae | `semantic/color.tokens.json`（dark 走 `$extensions.org.pavp.role` + `colorMode: dark`，模式同既有 `text-secondary`） |
| `--ui-color-text-disabled` | #8f8da3 / #6b6c84 | 同上 |
| `--ui-color-border-subtle` | #e3e1ee / #313048 | 同上 |
| `--ui-color-status-info-soft-background / -foreground` | #e3edf2 / #006393；暗 #1e3954 / #30b4ff | `semantic/color.tokens.json`（info/success/warning/error 四组成对） |
| `--ui-color-status-success-soft-*` | #e3eee9 / #006d40；暗 #153c39 / #00c478 | 同上 |
| `--ui-color-status-warning-soft-*` | #efebe3 / #7c5500；暗 #423421 / #e09d00 | 同上 |
| `--ui-color-status-error-soft-*` | #f6e3e7 / #bc0029；暗 #482f3b / #ff8584 | 同上 |
| `--ui-color-action-primary-soft-background / -foreground` | #efebf6 / #7727e0；暗 #2e234c / #b59aff | 同上 |
| `--ui-color-surface-muted` | #efeff0 / #2b2c3c | 同上 |
| `--ui-shadow-card` | `0 1px 2px 0 oklch(14.5% 0.01 247 / 0.08)` | `primitive/elevation.tokens.json` → `elevation.card`（03 号文档共用） |

> 令牌入库后需跑 `pnpm tokens:build` 重新生成 `src/generated/tokens.css`；public 角色需登记 `packages/design-system/src/build/public-role-registry.ts`。

## 9. 配套修正（同批实施）

1. 路由别名：`/401`、`/403`、`/500`、`/error`、`/exception`、`/error/unavailable` 重定向到对应 `/error/<category>`，或从路由表删除（评审第三节第 2 部分末尾）。
2. 无障碍：`h1` 带 `data-route-focus="primary-heading"` + `tabindex="-1"` 并在进入时聚焦（沿用现有模式）；`role="status"` 宣告标题；500 的错误编号复制按钮有独立 `aria-label`。
3. 品牌擦除动画（主题切换斜切）不适用于错误页：错误页无图表，主题切换直接用 200ms opacity 交叉淡入。
