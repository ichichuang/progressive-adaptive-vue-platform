# 03 · 全站卡片视觉语言与小字对比度令牌

> 对应评审报告：问题 #6（卡片视觉语言分裂，P1）、#9（小字对比度不足，P1）、第六节设计方向。
> 目的：一套卡片解剖结构全站通用（仪表盘、组件页、表单/表格卡、API 演示卡、设置页），加一组合格的小字文本令牌。所有值只允许来自令牌；需要新数值的一律走第 5 节新增清单。

## 1. 卡片解剖与结构令牌

以 Naive UI `NCard` / 既有 `wb-*` 卡片为外壳基准（不换组件库）：

| 属性                          | 令牌                                                                                                 | 值（comfortable）                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 圆角                          | `--ui-radius-panel`                                                                                  | 12px                                        |
| 描边                          | `var(--ui-border-width) solid var(--ui-color-border-subtle)`（**新增** subtle）                      | 1px / #e3e1ee（暗 #313048）                 |
| 静置阴影                      | `--ui-shadow-card`（**新增**）                                                                       | `0 1px 2px 0 oklch(14.5% 0.01 247 / 0.08)`  |
| 浮层阴影（hover 抬升 / 弹层） | `--ui-shadow-panel`（既有）                                                                          | `0 8px 24px 0 oklch(14.5% 0.01 247 / 0.12)` |
| 头部内边距                    | `--ui-space-panel-padding-narrow`                                                                    | 20px（block-start 20，inline 20）           |
| 主体内边距                    | `--ui-space-panel-padding-narrow`                                                                    | 20px                                        |
| 头/体间距                     | `--ui-space-content-gap`                                                                             | 12px                                        |
| 页脚                          | 上边 `1px solid var(--ui-color-border-subtle)` + padding-block `--ui-space-content-gap`、inline 20px | 12px / 20px                                 |
| 卡片间距（网格 gutter）       | `--ui-space-content-gap`                                                                             | 12px                                        |
| 禁用/降级不透明度             | `--ui-admin-state-disabled-opacity`                                                                  | 0.5                                         |

阴影只保留两级（card / panel），落地页图表卡的"重投影"一律降为 `--ui-shadow-card`；删除组件内所有其他 `box-shadow` 字面量。

## 2. 卡片排印

| 元素                             | 规格令牌                                                                                          | 实值              |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------- |
| 卡片标题                         | `--ui-font-size-subheading` + **新增** `--ui-font-weight-semibold` + `--ui-color-text-primary`    | 18px / 600        |
| 标题旁图标                       | `--ui-icon-size-medium`，色 `--ui-color-text-secondary`                                           | 20px              |
| 元信息（时间、单位、"演示数据"） | `--ui-font-size-caption` + **新增** `--ui-color-text-tertiary`                                    | 12px / 18px 行高  |
| 正文                             | `--ui-font-size-body` + `--ui-color-text-secondary`                                               | 16px / 1.5        |
| 数值（KPI/时钟/计数）            | `--ui-font-size-metric`（或 `--ui-font-size-display`）+ `--ui-font-weight-title` + `tabular-nums` | 28px（40px）/ 700 |
| 页脚操作文字                     | `--ui-font-size-control-small`                                                                    | 13px              |

中英文细则：中文标题不加字距（`letter-spacing:0`）；英文标题与正文用 `text-wrap:pretty`（欢迎页已用，推广）；全站数字 `tabular-nums`。

## 3. 交互态（hover / press / focus / active-card）

全部 transition：`duration var(--ui-motion-duration)`（200ms；小控件 120ms fast）、`easing var(--ui-motion-easing)`，属性只含 `transform / opacity / box-shadow / outline-color / background-color`。

| 态                                      | 规格                                                                                                                                                                        |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hover（可点卡片，如 wb-link、route 卡） | `translateY(calc(var(--ui-space-component-unit) * -0.5))`（-2px）+ 描边 `--ui-color-border-default` + 阴影 card→panel；reduced-motion：去 transform，仅描边/阴影            |
| press                                   | `scale(0.99)`（`transform: scale(calc(1 - var(--ui-space-component-unit) / 400))` 不得出现 —— 直接写 `scale(0.99)` 视为违规，改用新增令牌 `--ui-motion-press-scale: 0.99`） |
| focus-visible                           | `outline: var(--ui-admin-focus-width) solid var(--ui-color-focus-ring); outline-offset: var(--ui-admin-focus-outline-offset)`（既有令牌，2px / 2px）                        |
| 选中/激活（编排中的卡）                 | `outline: 1px dashed var(--ui-color-focus-ring)`，不占布局                                                                                                                  |
| 拖动中                                  | `scale(1.02)` + `--ui-shadow-panel`，见 02 号第 8 节                                                                                                                        |

仪表盘 7 种 tone（`theme / brand / accent-a / accent-b / accent-a-strong / accent-b-strong / quiet`）保留为**逐卡显式选择**，默认看板风格 `theme` 下全部卡片 = 中性白卡（`--ui-color-surface-panel` + subtle 描边 + card 阴影）；彩色底只允许出现在：用户在"看板风格"切到 brand/soft/contrast，或单卡 tone 覆盖。tone → 令牌映射表（全部引用既有令牌，禁止字面量）：

| tone                              | 背景                                                                                         | 前景/标题                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| theme / quiet                     | `--ui-color-surface-panel` / `--ui-color-surface-page`                                       | `--ui-color-text-primary`                            |
| brand                             | `--ui-color-surface-panel`，标题条 `--ui-color-action-primary` + `--ui-color-text-on-action` | 同左                                                 |
| accent-a / accent-b               | `--ui-color-expression-accent-{a,b}-soft-background`                                         | `--ui-color-expression-accent-{a,b}-soft-foreground` |
| accent-a-strong / accent-b-strong | `--ui-color-expression-accent-{a,b}-solid-background`                                        | `…-solid-foreground`                                 |

暗色可辨性硬规则：卡片 `--ui-color-surface-panel`（#1a1a29）与画布 `--ui-color-surface-page`（#10101c）之间必须有 1px `--ui-color-border-subtle`（#313048）描边 —— 这是问题"暗色卡片无轮廓"的机制性修复，不依赖某主题的明度巧合。

## 4. 小字对比度令牌与实测值

语义文本令牌（前景）在两种模式下的目标背景：`--ui-color-surface-panel`（主）与 `--ui-color-surface-page`（次）。以下为 royal-iris（默认主题）实测对比度（WCAG 相对亮度公式，保留两位）：

| 令牌                                                    | light 值 | 对 panel #fcfcfc        | 对 page #f8f8ff | dark 值            | 对 panel #1a1a29   | 对 page #10101c | 判定                                           |
| ------------------------------------------------------- | -------- | ----------------------- | --------------- | ------------------ | ------------------ | --------------- | ---------------------------------------------- |
| `--ui-color-text-primary`（既有）                       | #1b1a2d  | 16.61                   | —               | #f6f6fc            | 15.94              | —               | AAA                                            |
| `--ui-color-text-secondary`（既有）                     | #55556b  | 7.06                    | 6.85            | #abacc4            | 7.71               | 8.47            | AAA                                            |
| `--ui-color-text-tertiary`（**新增**）                  | #6a6880  | 5.24                    | 5.09            | #9495ae            | 5.86               | 6.44            | AA（<14px 需 ≥4.5 ✓）                          |
| `--ui-color-text-disabled`（**新增**）                  | #8f8da3  | 3.15                    | —               | #6b6c84            | 3.35               | 3.69            | WCAG 1.4.3 豁免（禁用），满足 3:1 图形对象要求 |
| tertiary on accent-a soft #e9f1f7                       | #6a6880  | 4.71                    | —               | #9495ae on #1c2a41 | 4.92               | —               | AA ✓                                           |
| tertiary on accent-b soft #f8edf2 / #362339             | #6a6880  | 4.71                    | —               | #9495ae            | 4.92               | —               | AA ✓                                           |
| `--ui-color-control-error`（既有，状态文字用）          | #bc0029  | 5.38（on soft #f6e3e7） | —               | #ff8584            | 7.31（on #1a1a29） | —               | AA ✓                                           |
| `--ui-color-control-warning`                            | #7c5500  | 5.60（on soft #efebe3） | —               | #e09d00            | 7.35               | —               | AA ✓                                           |
| `--ui-color-control-success`                            | #006d40  | 5.42（on soft #e3eee9） | —               | #00c478            | 7.49               | —               | AA ✓                                           |
| `--ui-color-control-info`                               | #006393  | 5.51（on soft #e3edf2） | —               | #30b4ff            | 5.14（on #1e3954） | —               | AA ✓                                           |
| `--ui-color-action-primary-soft-foreground`（**新增**） | #7727e0  | 5.68（on #efebf6）      | —               | #b59aff            | 6.18（on #2e234c） | —               | AA ✓                                           |
| 描边 `--ui-color-border-default`（既有）                | #8383a8  | 3.54（非文本，≥3 ✓）    | —               | #6f6e92            | 3.53               | —               | 1.4.11 ✓                                       |
| `--ui-color-border-subtle`（**新增**）                  | #e3e1ee  | 装饰性，无对比要求      | —               | #313048            | 同左               | —               | —                                              |

（soft 容器、`surface-muted`、`text-disabled` 的完整 light/dark 值见 01 号文档第 8 节。）

### 使用规则（修复问题 #9）

1. **最小可读线**：任何承载信息的文字不得浅于 `--ui-color-text-tertiary`（light #6a6880 / 5.09:1 起步）。现状 11–12px 浅灰占位/说明文字全部替换为 tertiary；禁止比 tertiary 更浅的写字色（disabled 除外，且 disabled 只用于真禁用控件）。
2. **字号下限**：正文说明 ≥ `--ui-font-size-control-medium`（14px）；只有元信息/标注允许 `--ui-font-size-caption`（12px），且必须 tertiary 以上。11px 以下字号全站删除。
3. **占位符**：输入占位 = `--ui-color-text-tertiary`（不得用 disabled 色）；"随手记"占位照此替换。
4. **标题层级**：标题 ≥600 字重 + 与正文至少一档字号差（18/16），消除"标题与正文字重差距太小"。
5. **主题回归门槛**：其余四个内置主题（cobalt-tide、emerald-grove、ember-coral、berry-bloom）上线前用同一脚本复测 tertiary/disabled，不达标先调 tertiary 再发布；构建侧可挂在 `pnpm tokens:check` 后（新脚本 `scripts/verify/check-text-contrast.ts`，读 generated tokens.css 计算，阈值 4.5/3.0）。

## 5. 新增令牌汇总（本线全部新增，唯一入库清单）

| 令牌                                                                                | light / dark                                           | 入库文件                                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--ui-color-text-tertiary`                                                          | #6a6880 / #9495ae                                      | `packages/design-system/tokens/semantic/color.tokens.json`，dark 用 `$extensions.org.pavp.role` + `conditions.colorMode: 'dark'`（照抄 text-secondary 写法） |
| `--ui-color-text-disabled`                                                          | #8f8da3 / #6b6c84                                      | 同上                                                                                                                                                         |
| `--ui-color-border-subtle`                                                          | #e3e1ee / #313048                                      | 同上                                                                                                                                                         |
| `--ui-color-status-{info,success,warning,error}-soft-background / -soft-foreground` | 见 01 号第 8 节                                        | 同上                                                                                                                                                         |
| `--ui-color-action-primary-soft-background / -foreground`                           | #efebf6·#7727e0 / #2e234c·#b59aff                      | 同上                                                                                                                                                         |
| `--ui-color-surface-muted`                                                          | #efeff0 / #2b2c3c                                      | 同上                                                                                                                                                         |
| `--ui-shadow-card`                                                                  | `0 1px 2px 0 oklch(14.5% 0.01 247 / 0.08)`（两模式同） | `packages/design-system/tokens/primitive/elevation.tokens.json` → `elevation.card`                                                                           |
| `--ui-font-weight-semibold`                                                         | 600                                                    | `primitive/typography.tokens.json` → `font.weight.semibold` + `semantic/typography.tokens.json` 映射                                                         |
| `--ui-font-size-display`                                                            | 2.5rem                                                 | 同上（`font.size.display`）                                                                                                                                  |
| `--ui-icon-size-badge`                                                              | 3rem                                                   | `primitive/dimension.tokens.json` → `dimension.icon.badge`                                                                                                   |
| `--ui-layout-error-content-max`                                                     | 40rem                                                  | `dimension.layout.error-content-max` + semantic `layout.error.content-max-width`                                                                             |
| `--ui-layout-board-drawer-inline`                                                   | 25rem                                                  | `dimension.layout.board-drawer-inline` + semantic `layout.board.drawer-inline-size`                                                                          |
| `--ui-motion-press-scale`                                                           | 0.99                                                   | `primitive/motion.tokens.json` → `motion.scale.press`（number 型）                                                                                           |

入库流程：编辑上述 JSON → `pnpm tokens:build` 重新生成 → public 角色登记 `packages/design-system/src/build/public-role-registry.ts` → `pnpm tokens:check`。组件侧随后删除等值字面量，`pnpm check:policy` 兜底。

## 6. 落地清点（给编码 agent 的验收口径）

1. 全站卡片外壳统一为第 1 节规格；`grep -rn "box-shadow" apps packages` 只允许命中 generated tokens 与 `--ui-shadow-*` 引用。
2. 仪表盘、欢迎页能力卡、API/动效演示卡、设置页分组卡共用同一 anatomy（header 20px / body 20px / footer 分隔线），彩色底仅剩 tone 显式选择。
3. 03 号新增令牌进入 `tokens.css` 且第 4 节表格比值复测通过（脚本化）。
4. `text-caption` 类文字在浅/暗两模式下抽查（右键菜单分组标题、图表脚注、表格汇总行、表单辅助文字）均为 tertiary 或更深。
5. 动效全部 transform/opacity（+box-shadow），`prefers-reduced-motion` 下仅剩 opacity（`resolve-motion` 既有链路）。
