# PAVP 视觉规格 · docs/design

> **交接（给编码 agent）**：按 03 → 01 → 02 顺序实施；先把 03 号第 5 节新增令牌入库（`pnpm tokens:build`），再动组件；组件内禁止出现规格之外的字面量（色/距/圆角/阴影/时长）。组件库固定 naive-ui + G2 + motion-v，不得更换。

| 文档 | 内容 | 对应评审问题 |
|---|---|---|
| [01-error-page.md](01-error-page.md) | 统一 `<ErrorPage>`：布局/断点、7 状态语义色与图标、中英文案、按钮层级、进出场动效、暗色 | 三-2、#3 |
| [02-dashboard.md](02-dashboard.md) | 12 列栅格与断点、卡片档位 S/M/L/XL、默认布局图与新增 KPI/活动卡、工具栏、抽屉、三态、编排视觉 | 三-1、#1、#5 |
| [03-card-language-and-contrast.md](03-card-language-and-contrast.md) | 全站卡片解剖、排印与交互态、小字对比度令牌（实测比值）、新增令牌总库 | #6、#9 |

- 输入：`ref/final-report.md`（评审）、`ref/chris-supplement.md`；截图 `ref/shots/`（018 号起对照附录 A）。
- 范围外（并行线勿动）：固定比例大屏窄屏排版、顶部多页签、图表首帧。
- 所有新增令牌唯一清单在 03 号第 5 节；01/02 号只引用、不重复定义。
