# PAVP 项目上下文

## 项目目标

PAVP（Progressive Adaptive Vue Platform）是一套业务无关、可独立复制演进的 Vue 前端架构基线：
以可复用公共组件/模块为核心交付物，支持深度用户自适应视觉系统（主题、明暗、密度、字号、动效偏好）、
PC/iPad/平板/移动 H5 响应式体验，以及可强制执行静态验证的 AI 辅助开发流程。
业务管理页面与受保护业务流程不是强制交付物；当前工作台是架构能力的实现消费者，而非核心已完成的证明。

## 技术栈与目录结构

- 构建/语言：Vue 3（`<script setup>` + 严格 TypeScript 6）+ Vite，Node 24.15.0，pnpm 10.34.5 workspace。
- UI 组件库（唯一选型）：Naive UI 2.45.2（已本地 patch），仅在 UI 层按官方 API 直接使用，套用 PAVP 共享主题。
- 图表：AntV G2 5（多处 patch）；动效：motion-v 2.4（Motion 的 Vue 版，已 patch）+ CSS token 动效；
  平滑滚动：Lenis + OverlayScrollbars（均在 packages/ui）。
- 其他：Pinia、vue-router、vue-i18n（zh-CN/en）；UnoCSS 仅作表达层，不是设计权威。
- 目录：
  - `apps/web`（@platform/web）：应用层——页面（`src/pages`）、app 域（appearance / scroll / workspace /
    workbench / router / config / storage 等）、shared（api 请求层、query 读缓存、UApi 世界时间适配）。
  - `packages/design-system`（@platform/design-system）：设计令牌唯一权威，
    `tokens/{primitive,semantic,component,density,themes}` JSON → style-dictionary 构建（`pnpm tokens:build`）。
  - `packages/ui`（@platform/ui）：可组合组件（UiTable/UiForm/UiG2Chart/UiAdminShell/UiScrollArea/
    UiDashboardGrid 等）、motion 注册表、dashboard/reports 能力。
- 布局与滚动：固定应用外壳（UiAdminShell）+ 各区域独立滚动容器（UiScrollArea、表格体、textarea 各自持有滚动）；
  工作区标准为非滚动头部/底部 + 可收缩中部（flex/grid 祖先 `min-height: 0`），滚动恢复由 `app/scroll` 生命周期管理。
- 验证：`pnpm verify` 全量静态门禁（格式/lint/typecheck/架构边界/组件契约/tokens/build/bundle 等 16 项）。

## 默认分支

`main`（已用 `git ls-remote --symref origin HEAD` 验证：`ref: refs/heads/main`）。维护模式：solo-main-branch。

## 部署

- 流程：push 到 main → GitHub Actions `verify.yml` → `pnpm verify` 全量静态门禁 → `git diff --exit-code`
  确认生成物干净 → 满足部署条件时执行 `scripts/deploy/publish-racknerd.sh` 发布到 RackNerd（107.172.82.33，
  nginx + Let's Encrypt，线上即 https://pavp.cc）。
- 发布方式：携带服务器端已编辑的 `api`/`presentation` 配置 → tar 清单（SHA256）→ 远端 stage/activate 原子切换
  → 公网 HTTPS 健康检查（首页/深链/runtime-configuration.json 的 no-store 与 releaseSha）→ 失败自动 rollback。
- push 自动部署由仓库变量 `PAVP_DEPLOY_ENABLED == 'true'` 门控，当前保持关闭；**未达成速度目标前不得开启**。
  手动部署走 workflow_dispatch 的 `deploy_to_racknerd` 输入。
- 同服务器上的 VelaDesk 与 8443 端口 VPN 服务绝对不可触碰。

## 重要决策

- PAVP Design Tokens 是唯一视觉权威；UnoCSS/Naive UI 只是表达/组件层，不建立独立颜色权威。
- 一个能力一个所有者、一个可变概念一个权威；跨包深导入禁止；禁止 utils/helpers 类堆积文件。
- 源码实现、静态验证、运行时/视觉验收、生产发布是四个独立状态，互不替代。
- Git 授权链严格分离：规划≠实现≠staging≠commit≠push≠release；实现类任务留未暂存 diff 等 Owner 授权。
- 界面风格由开发者成套预制，用户一键选择；系统强制颜色优先；`prefers-reduced-motion` 被尊重。
- 运行时配置（runtime-configuration.json）是唯一公开运行时配置文件，可在服务器直接编辑、原子替换。

## 活跃工作

- 核心能力完善期（phase 1）：公共组件/模块的显式契约与验证，未进入"退役旧页面、重建架构示例页"阶段。
- 近期提交聚焦：主题切换与风格、仪表盘与欢迎页动效、大屏自适应、表单/表格/图表/媒体/报告能力、
  RackNerd 自动部署接入、类型校验与界面细节。
- 速度目标达成前，push 自动部署保持关闭（发布仅手动 workflow_dispatch）。

## 已完成交付物（依据 git log）

- 完整工作台：欢迎页、仪表盘（右键整理/添加卡片/样式）、设计令牌画廊、交互/日期时间/动效演示。
- 请求层：typed 传输客户端、取消/超时、错误恢复、query 读缓存、认证边界、批量/流式钩子、表单表格联动。
- 组件库：表格全家桶（分页/固定列/列宽/响应式/列配置/排序/选择/树形/虚拟滚动/远程/主题融合/CSV 导出/分组表头）、
  表单体系（19 个演示：基础/联动/分步/动态/媒体/富文本/构建器等）、G2 图表组件（趋势/比较/构成/分布/
  实时/联动/巡游/大屏）、动效体系（遮罩/空间/材质/粒子/文字/页面转场）、组合工作流（查询/弹窗/抽屉/独立页/报告）。
- 布局预览 8 种 + 错误/状态页 7 种；滚动恢复、刷新路径内容就绪、标签栏、全屏、双击定位等外壳能力。
- 运行时配置体系（config:generate/原子替换/服务器可编辑 presentation）与 RackNerd 原子发布脚本。

## 已知问题（来自 2026-11-15 线上审计，仅列要点）

- 默认仪表盘过于空旷：仅三个快捷链接 + 便签 + 时钟卡，大量留白，缺少 KPI/图表/最近活动的精选默认布局；
  便签无明显的保存/脏状态提示。
- 辅助文案/说明文字过小、对比度偏低（表单与表格演示页尤甚）。
- 150% 缩放下响应式不佳：工作台标签条被裁切、侧栏占比过大、欢迎页 hero/图表不重排（尚缺真实移动端模拟验证）。
- 顶部工作区标签 accumulation 后难以浏览，缺少溢出菜单/紧凑模式。
- 自适应大屏预览的吞吐量曲线在浅色画布上过淡，需加对比度。
- 错误页极简：401/403/500/offline 缺少次要恢复/帮助操作。
