---
name: pavp-ui
description: Route and execute Progressive Adaptive Vue Platform UI work under the repository's canonical architecture. Use for UI, appearance, component, material, motion, layout, scroll, architecture review, planning, implementation, or review tasks in this repository.
---

# PAVP UI Workflow

Act as a client-neutral, subordinate execution workflow. Read `ARCHITECTURE.md` for the high-level architecture and the existing source owners for implementation contracts.

## Required load order

1. Read `AGENTS.md`.
2. Read [ARCHITECTURE.md](../../../ARCHITECTURE.md), then inspect the current repository, task scope, and affected source owners.
3. Read `project.config.ts`.
4. Read [task-routing.md](references/task-routing.md) and select one task mode.
5. Read [execution-contract.md](references/execution-contract.md) and hold the task contract in memory.
6. Read [specialist-lens-policy.md](references/specialist-lens-policy.md) when external research is justified, including library-selection evidence before expanding nontrivial generic capabilities.
7. Read [acceptance-report.md](references/acceptance-report.md) before reporting.

## 页面设计与交互约定

以下约定适用于本项目的界面设计、实现和走查；`ARCHITECTURE.md`、`AGENTS.md` 和当次用户明确要求优先。

- 使用 PAVP Design Tokens、现有主题、Naive UI 和项目组件，保持配色、中文排版、图标、间距和层次协调。避免为了装饰增加重复容器、边距或不承担实际作用的元素。
- 非大屏的独立布局预览可像首页一样在外壳使用适当内边距；大屏保持适合展示的全幅布局。固定高度的展示、编辑和设置工作区填满可用内容区域，去掉外层多余的内边距容器，保留组件内部必要的留白、安全区和焦点空间。普通阅读页保留自然滚动。
- 带页脚的布局将页脚置于内容滚动区外；存在侧栏时，页脚底部与侧栏对齐。页脚使用侧栏区域的配色，并随所选配色方案变化。
- 主要内容区真正为空时，在所属区域居中展示友好的图标、简洁文案和适当的下一步。例如仪表盘可提示“快来打造你的专属仪表盘吧”。区分初始为空、无搜索结果和错误，不把普通字段或表格单元格的空值改成整页空状态。
- 删除没有实际作用的重复标题、菜单分组名、说明、计数和成功提示，例如右键菜单中的“看板操作”或设置中的“设置已生效并保存”。保留有意义的字段说明、未保存状态、必要的数据来源说明、错误和恢复操作。
- 编辑、加载、校验、成功或失败反馈，以及操作控件的出现和消失，不得挤动、压缩或重排既有页面和操作区。使用既有稳定区域或不占文档流的合适浮层；真实结果、图表和流式内容可在其既有内容或滚动区域内更新。常规工作区的主要操作仍按 `AGENTS.md` 保持在可见的非滚动操作区。
- 看板编辑、完成编辑及样式等上下文操作整合到右键二级或多级菜单，不新增突然出现的设置面板或完成栏。仅在用户明确允许的新增流程使用独立创建面板；为键盘和触控提供等效入口，并保持焦点、关闭和恢复操作可用。
- 短暂反馈使用 Naive UI 轻提示；不为自动生效的普通设置重复显示成功消息。重要失败必须持续可读取并提供重试或恢复途径，不能因轻提示消失而掩盖问题。
- 交互和图表动效应流畅、清晰并可中断，复用现有动效能力，遵循主题与减少动效偏好。大屏优先复用已有图表和动态能力，删除无实际用途的模拟说明与演示按钮，同时保留理解数据真实性所必需的信息。
- 修改前后观察实际界面，按页面类型检查外框、留白、内容与操作区边界；验证桌面和窄屏、长内容、必要的错误恢复及键盘操作。区分源码扫描、实际打开的路由、操作过的交互与用户视觉验收，不能用静态检查代替运行画面。

## Workflow

1. Verify the repository identity, normalized remote, current branch, local and upstream revisions, active phase, and worktree state from repository evidence.
2. Resolve requested, allowed, forbidden, and dirty-overlap scope. Preserve unrelated user changes.
3. Select exactly one supported task mode through the deterministic routing reference.
4. Build the in-memory execution contract, including its static verification requirements.
5. Evaluate every canonical stop condition before mutation and whenever new evidence changes scope.
6. Perform only work authorized by the current phase and task. Keep public boundaries and repository authority intact.
7. Run the applicable static gate.
8. Review the final diff and worktree, then emit the canonical acceptance report in the current task response.

Do not create a repository copy of the execution contract or acceptance evidence. Do not depend on native skill discovery, a particular client, or machine-local authority.
