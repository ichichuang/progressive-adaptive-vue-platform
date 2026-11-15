# 02 · 仪表盘 12 列栅格与默认布局视觉规格

> 对应评审报告：问题 #1（P0）、#5（P1）、第三节第 1 部分（逐操作）、第五节"快速见效"第 1–2 条。
> 范围外（另有并行线，勿动）：固定比例大屏窄屏排版、顶部多页签、图表首帧绘制。
> 实现锚点：`apps/web/src/app/workbench/dashboard/DashboardComposer.vue`、`packages/ui/src/components/UiDashboardGrid.vue`（GridStack）、`apps/web/src/app/dashboard/{dashboard-contract,dashboard-catalog,use-dashboard}.ts`。

## 1. 现状摘要（已核实）

- 画布：`UiDashboardGrid`，wide 12 列 / narrow 1 列（内容区宽 < `layout.profile.regular.min-inline-size` = 48rem/768px 切 narrow，在 host 上 ResizeObserver 实测）。
- 行高：`--ui-control-height × 2`（comfortable 88px；compact 72px；spacious 96px），卡片间距 = `--ui-space-content-gap`（12px）。
- 默认文档 `createDefaultDashboard()`：capabilities(7×3) + notes(5×5) + clock(4×2) —— 正是截图 002 的"楼梯"，右半屏空白。
- 卡片目录 12 项：`clock / notes / capabilities / chart(traffic) / chart(delivery) / theme-palette(module) / route ×6`。
- 操作入口只有右键菜单（`DashboardContextMenu.vue`）与底部 dock（`wb-dashboard-dock`，挤压画布）。
- 卡片底色由 `dashboardPresetTones` 按 style/theme 派生，theme 风格下画布与卡片同为 `--ui-color-surface-panel`，暗色下卡片无轮廓（问题 #6）。

## 2. 栅格与断点

| 档位 | 条件（内容区宽） | 列数 | 列间距(gutter) | 行单元 | 画布内边距 |
|---|---|---|---|---|---|
| desktop | ≥ 80rem（`--ui-layout-profile-wide-minimum-inline-size`） | 12 | 12px `--ui-space-content-gap` | `calc(var(--ui-control-height) * 2)` | 24px `--ui-space-page-inline` |
| laptop / tablet | 48–80rem | 12（列宽变窄，配合第 3 节档位投影） | 12px | 同上 | 24px |
| mobile / narrow | < 48rem | 1（既有 narrow 布局） | 12px | 同上 | 16px `--ui-space-panel-padding` |

- 画布底色固定 `--ui-color-surface-page`（下凹），卡片 `--ui-color-surface-panel`（浮起）+ 1px `--ui-color-border-subtle` + `--ui-shadow-card`（见 03 号文档）。废止 theme/brand 风格下"画布=面板色"的写法；soft / contrast 两种彩色画布保留为"看板风格"可选项（`--ui-color-expression-accent-{a,b}-soft-background`）。
- 12 列网格本身已有（`grid-template-columns` 由 GridStack 管），不需要改 schema：`dashboardSchema` 仍限定 wide ≤12 列 / narrow 1 列。tablet 档用第 3 节"档位投影"实现，不改 `columns: 1 | 12` 契约。
- 内容区 ≥ 80rem 且无侧栏（全屏）时，画布内容 `max-inline-size: var(--ui-layout-content-max)`（72rem）居中，避免无侧栏布局被拉宽（评审第四节问题 6 的同源修法）。
- 首屏约束：默认布局下第一屏（视口高 1072px，减页签栏与工具栏后约 880px 画布）不允许出现高度截断的卡片 —— 第 4 节默认布局总高度 h=11 行 × 88px + 间距 ≈ 1010px，前 9 行（≈820px）完整可见。

## 3. 卡片尺寸档位（tier）

| 档位 | desktop 列宽 | tablet 投影（48–80rem） | 行高（默认） | 最小行高 | 适用 |
|---|---|---|---|---|---|
| S | 3 列 | 6 列 | h=2（188px） | 2 | KPI 单值卡、快捷入口 route 卡 |
| M | 4 列 | 6 列 | h=3（284px） | 2 | 小列表、环形构成图、色板读出 |
| L | 6 列 | 12 列 | h=5（488px） | 3 | 趋势图 / 对比柱状图、便签 |
| XL | 8 列 | 12 列 | h=4（388px） | 3 | 我的入口（多链接宫格）、最近活动 |

- 档位写入 `dashboard-catalog.ts` 每个条目的 `size.wide`（现有字段，无 schema 变更）；tablet 投影在 `DashboardComposer` 渲染前做纯函数映射（`projectTierForTablet(layout)`），拖拽编排仍按 12 列存储。
- GridStack 已有 `minW:1, minH:2, maxW:12`；目录侧再按档位收紧 `minW`（S→3、M→4、L→6、XL→8），通过 `makeWidget` 选项传入。
- 参考列宽（content 宽 − 11×12px gutter 后 ÷12）：1920 视口（内容 ≈1616px）列 ≈124px；1440（≈1136px）列 ≈84px；768（≈720px）列 ≈49px —— 这就是 tablet 档必须把 S 投影成 6 列的原因（3 列仅 147px，放不下 KPI 数值）。

## 4. 默认布局图（样板间）

`createDefaultDashboard()` 的 `layouts.wide` 改为（面板 `panels` 同步增删，全部来自目录，id 稳定）：

```
列→  0   1   2   3   4   5   6   7   8   9  10  11
y0  ┌kpi-total─┐┌kpi-mean──┐┌kpi-peak──┐┌kpi-latest┐   ← 4 × S, h=2
y2  ├chart-traffic (L,6,h=5)──────┤├notes (L,6,h=5)──┤
y7  ├capabilities (XL,8,h=4)──────┤┌clock(S,h=2)────┐
y9  │                             │├activity(S,h=2)──┤
y11 └─────────────────────────────┘
narrow（1 列）顺序：kpi-total, kpi-mean, kpi-peak, kpi-latest, chart-traffic, notes, capabilities, clock, activity
```

| 卡片 | id / type | 档位 | 数据来源（仓库已有） | 状态 |
|---|---|---|---|---|
| 请求总量 | `kpi-total` **新增** builtin `kpi` | S h2 | `chart(traffic)` 同一 7 日样本求和；`UiG2Chart` 不需要，纯 stat tile | 既有样本，标注"演示数据" |
| 日均请求 | `kpi-mean` **新增** | S h2 | 同上求均值 | |
| 单日峰值 | `kpi-peak` **新增** | S h2 | 同上取 max | |
| 最新一日 | `kpi-latest` **新增** | S h2 | 末日值 + 与均值差值（delta 用 `--ui-color-control-success / -error` 着色） | |
| 趋势图 | `chart` series=traffic（既有） | L h5 | 7 日 area+line（`DashboardWidget` 现有 G2 配置） | 既有 |
| 随手记 | `notes`（既有） | L h5 | 本地存储 | 既有 |
| 我的入口 | `capabilities`（既有） | XL h4 | `defaultDashboardDestinations`（3 项）+ 可配置至 8 | 既有 |
| 此刻 | `clock`（既有） | S h2 | 本地时间 | 既有 |
| 最近活动 | `activity` **新增** builtin | S h2 | 读取页面会话历史（`apps/web/src/app/router/browser-page-session-contract.ts`），无记录时显示安装后首次访问时间等静态项 | 新增 |

目录中其余卡片（默认不上板，"添加卡片"抽屉可选）：`chart(delivery)` L h5、`theme-palette` M h4（尺寸由 5×4 收紧为 4×4）、`route` ×6 → S h3。

KPI stat tile 内部规格：标签 `--ui-font-size-caption`（12px）`--ui-color-text-tertiary`；数值 `--ui-font-size-metric`（28px）`--ui-font-weight-title` `tabular-nums` `--ui-color-text-primary`；delta 行 caption + 语义色；可选迷你 sparkline 用 `--ui-color-data-viz-categorical-series-1` 24px 高。中英文都不换行（数值 `white-space:nowrap`），长英文标签截断加省略号。

## 5. 页面工具栏（新增）

页签栏下方、画布上方，高 `--ui-layout-target-enhanced-minimum-block-size`（44px），`padding-inline: var(--ui-space-page-inline)`，`gap: var(--ui-space-content-gap)`，底边 `1px solid var(--ui-color-border-subtle)`：

```
[左] 仪表盘 · 我的看板          [右] [日期范围▾] [↻ 刷新] | [密度▾] [＋添加卡片] [⋮⋮ 编排看板] [◑ 看板风格]
      18px/600 标题 + 12px 日期   NButton size=small (高 2.25rem, 圆角 --ui-radius-control)
```

- 左：标题 `--ui-font-size-subheading` + **新增** `--ui-font-weight-semibold`，色 `--ui-color-text-primary`；旁边日期 `--ui-font-size-caption` + `--ui-color-text-tertiary`（今天 · 11月15日 周日）。
- 右（次级按钮，`NButton secondary size="small"`，图标 + 13px `--ui-font-size-control-small`）：
  - 日期范围：复用 `packages/ui/src/components/UiChartTimeRange.vue`；
  - 刷新：重放图表数据（既有"换一组数据"逻辑）+ 触发 KPI 重算；
  - 密度：紧凑/舒适/宽松 三项下拉，映射全局 density preset（既有 comfortable/compact/spacious 令牌，行高随 `--ui-control-height` 自动变化）；
  - 添加卡片：右侧抽屉；
  - 编排看板：进入/退出编排（编排中该按钮变主色实心"完成"，见第 8 节）；
  - 看板风格：右侧抽屉。
- 现有右键菜单保留为快捷方式，菜单加 `1px solid var(--ui-color-border-default)` 描边，分组标题改 `--ui-font-size-caption` + `--ui-color-text-secondary`。
- 窄视口（<48rem）：右侧收进一个 `⋯` 溢出菜单，仅保留"添加卡片"与"编排"直达。

## 6. 抽屉（添加卡片 / 看板风格）

- 两个抽屉统一为右侧滑出（naive-ui drawer 或既有 dock 改造），宽 `min(100%, 25rem)`（400px，**新增**令牌 `--ui-layout-board-drawer-inline`），内边距 `--ui-space-panel-padding-narrow`（20px）。
- 修掉截图 005 的裁切：搜索框 `inline-size:100%; box-sizing:border-box; max-inline-size:100%`。
- 卡片预览统一 16:9（`DashboardLibraryArtwork`），圆角 `--ui-radius-control`，底 `--ui-color-surface-page` + `--ui-color-border-subtle` 描边；"已添加"徽标：`--ui-color-status-success-soft-*`（03 号令牌）实底标签 + `i-lucide-check`，未添加项为 `＋添加` 次按钮。
- 看板风格抽屉内：配色 4 项、入场动效 7 项，用分段控件（高 `--ui-control-height-baseline`），选中态 `2px solid var(--ui-color-control-primary)` + 右上角 `i-lucide-check`（替换现有底部 dock，消除"面板贴底挤压画布"）。

## 7. 卡片三态（空 / 加载 / 错误）

所有卡片外壳统一三态，`DashboardWidget` 外层实现：

- **加载（骨架）**：`NSkeleton`（naive-ui）`text` 变体 ×3 + 标题条；骨架色 `--ui-color-surface-page` 上叠 `--ui-color-border-subtle`；300ms 内返回则不出现骨架（防闪）；shimmer 为 1600ms（`calc(var(--ui-motion-duration) * 8)`) 循环 `translateX` 扫光，`data-motion ≠ full` 时退化为 1.2s `opacity` 呼吸。
- **空态**：图标 `--ui-icon-size-badge`（48px，`--ui-color-text-tertiary`）+ 标题 `--ui-font-size-body` / semibold / `--ui-color-text-primary` + 建议 `--ui-font-size-body` / `--ui-color-text-secondary` + 一个次按钮动作（如"添加第一张卡片"）。画布空态复用 `dashboardBoard.empty` 文案，升级为该结构；空画布不显示工具栏右侧的密度/刷新（无意义）。
- **错误态**：卡片内顶部提示条：底 `--ui-color-status-error-soft-background`、字 `--ui-color-status-error-soft-foreground`、`--ui-font-size-control-small`，左 4px（`calc(var(--ui-space-component-unit)*4)`）实边 `--ui-color-control-error`，右侧"重试"文字按钮；卡片其余内容降至 `--ui-admin-state-disabled-opacity`（0.5）。存储读写失败沿用页脚既有 `readFailed/saveFailed` 模式。

## 8. 编排（拖拽 / 缩放）视觉

进入编排（`editing=true`）时：

- 画布背景叠点阵：`radial-gradient(circle, var(--ui-color-border-default) 1px, transparent 1px)`，间距 `calc(var(--ui-space-content-gap) * 2)`（24px），透明度 0.6，`background-size` 同间距。
- 每张卡片：`outline: 1px dashed var(--ui-color-focus-ring)`（不占布局），右上角删除按钮（`NButton quaternary size=tiny` + `i-lucide-trash-2`，hover 态 `--ui-color-status-error-soft-*`），右下角缩放手柄 8px（`calc(var(--ui-space-component-unit) * 2)`）方形、`--ui-color-surface-panel` 底 + `--ui-color-border-default` 描边 + `--ui-shadow-card`。
- 拖动中卡片：`scale(1.02)` + 阴影升到 `--ui-shadow-panel`（浮层级），落位后 200ms 回落 —— 只用 transform/opacity/box-shadow；GridStack `animate` 已按 `data-motion === 'full'` 门控，维持。
- 顶部提示条（画布上方 sticky，高 `--ui-control-height-baseline`）：文案 `dashboardBoard.editHint`（既有）+ `[取消] [完成]`（完成为主色实心）；键盘操作既有（方向键移动、Shift+方向键缩放、Shift+F10 菜单），`aria-live` 位置播报既有，保留。
- 未编排态：拖拽把手隐藏（现状），卡片 hover 才浮现把手（`opacity 0→1`，120ms）。

## 9. 中英文排印

- 卡片标题：中文 2–4 字优先（既有 i18n 已是）；英文截断 `text-overflow:ellipsis` + `min-inline-size:0`，整卡 `min-width` 由档位保证。
- KPI 数值、时间、坐标轴：`font-variant-numeric: tabular-nums`（clock 卡已有，推广为卡片外壳统一）。
- 中英文字重：标题统一 semibold(600)，不用 700（中文笔画密，700 发闷）；大数值（KPI/时钟）保留 700。

## 10. 新增令牌清单

| 令牌 | 值 | 文件 |
|---|---|---|
| `--ui-layout-board-drawer-inline` | 25rem | `primitive/dimension.tokens.json` → `dimension.layout.board-drawer-inline`，semantic `layout.board.drawer-inline-size` |
| `--ui-font-weight-semibold` | 600 | 01 号文档第 8 节（共用） |
| `--ui-shadow-card`、`--ui-color-border-subtle`、`--ui-color-text-tertiary`、`--ui-color-status-*-soft-*` | 见 01 号第 8 节 | 03 号文档第 5 节汇总 |

其余所有数值（12px gutter、88px 行单元、24px 页边距、44px 工具栏、400px 抽屉投影）全部来自既有令牌或上表新增项，组件内不得再出现字面量。
