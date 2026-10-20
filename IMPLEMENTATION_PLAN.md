# PAVP 剩余目标执行指南

> **定位声明**：本文件是 Owner 授权的「剩余目标执行清单」，供后续 AI 会话作为执行地图使用。它不是第二份 Roadmap，不新增状态枚举，不构成任何能力完成或验收的证据。**唯一状态权威始终是 `ARCHITECTURE.md`**（§1.3 Capability Status Registry，L5843–5926；§28.3A Mission and Execution Contract，L16110–16305）。本文件所有「现状」与「准入条件」均派生自 `ARCHITECTURE.md`，若两者冲突，以 `ARCHITECTURE.md` 为准。
>
> **执行纪律**：每一项能力的准入都需 Owner 单独授权；Git 授权阶梯（§28.3A L16272–16282）为 planning → implementation → staging → commit → push → release，逐级分离。静态 `pnpm verify` PASS 单独不证明完整核心完成（§1 L210）；`SOURCE_CANDIDATE` / `STATIC_VERIFICATION=PASS` 不等于 `COMPLETED`（§28.4 L16346–16351）。

## 基线事实

- 能力计数（§1.3，唯一人类权威）：**48 条 = 28 ACTIVE / 9 TARGET_INACTIVE / 8 DEFERRED / 3 PROHIBITED**
- 交付顺序（§1 L208 + §28.3A L16156–16170）：完成核心 → 静态验证 + 核心行为确认 → Owner 明确确认核心 → 另行授权退役当前页面并重建架构示例页
- 最终交付模型：`INDEPENDENTLY_COPYABLE_VUE_FRONTEND_ARCHITECTURE`（§1 L204）——可复制后独立演进、业务无关的 Vue 前端架构核心；业务管理页 / 受保护业务流不是必需交付
- 四种状态语义（§1.3 L5857–5864）：`ACTIVE`=有真实 Artifact + Gate + 证据；`TARGET_INACTIVE`=目标合同已冻结但依赖/源码/公共 API 未准入；`DEFERRED`=只有准入条件或候选方向；`PROHIBITED`=当前与目标架构均明确禁止

---

## 第 0 项 — 核对 `PAVP_WORKSPACE_INSTANCE_RETENTION_IMPLEMENTATION` 的 Git 事实与历史架构快照

**Git 事实**：提交 `1684149` 交付 route-single Workspace 实例保留的完整候选及后续刷新归属修复（14 files，+1650/−238），提交说明记录完整 `mise exec -- pnpm verify` exit 0，并明确保留架构候选阶段状态块和 Current Work 镜像原文。该提交已包含在本次核对的干净 `main@76670b7` 中；后续历史未修改 Workspace 实例保留与 Router 生命周期源码，当前不存在另一个未提交的十四路径候选。

**限定验收记录**：`1684149` 的提交说明记录 Owner「验收通过没问题」，范围为已操作的 route-single 页签切换、重复局部刷新、刷新中切走再返回、活动与非活动标签关闭及既有回退。§18.11 当前 `WORKSPACE_OWNER_RUNTIME_ACCEPTANCE=PASS` 也仅覆盖已接受的最终已提交页签交互；不能推断未观察的缓存内部行为、完整刷新 / 无障碍 / 发布矩阵、多记录能力或新的 Owner 验收。

**历史快照**：§18.11 下 `Instance-owned route-single retention implementation admission` 块（L11845–11861）的 `REPOSITORY_IMPLEMENTATION=SOURCE_CANDIDATE` / `INDEPENDENT_SOURCE_REVIEW=PENDING` / 三类 `OWNER_*_ACCEPTANCE=NOT_PERFORMED` / `GIT_DELIVERY=NOT_AUTHORIZED`，以及候选过程段落（L11889 / L11891 / L11895）的「未暂存 / 未提交」，是保留的候选阶段记录，不是当前 Git 工作树状态的证据。它们不能代替 §18.11 的限定接受记录，也不能由本指南自动改写。

**执行边界**：后续会话仍须核对实际 Git 状态，并从 `ARCHITECTURE.md` 读取 Current Work 与授权。不得因已有 Git 交付而批量推进验收字段、十三对 Current Work 镜像或后继授权；`NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE` / `SUCCESSOR_PACKAGE_AUTHORIZATION` 仍为 `NONE`。编辑 `ARCHITECTURE.md` 需 Owner 单独授权，Git 交付按 §28.3A 授权阶梯逐级执行。

---

## 阶段 A — 核心视觉 / 设计系统收尾（TARGET_INACTIVE ×2）

### A1. Semantic Status Color System — §1.3 L5879

- **现状**：foundation + consumer 源已在提交基线（Manifest schemaVersion 11；§13.12 L10484 实现精确 20 个 Status Utility）。
- **缺**：Owner Runtime / Visual Acceptance（端到端状态未变，不能推断验收完成）。
- **准入条件**：Owner Runtime + Visual Acceptance 通过 → 翻 `ACTIVE`。无新源码。
- **授权**：仅需 Owner 验收。

### A2. Compact / Comfortable / Spacious 三档密度投影 — §1.3 L5880（§14.2 目标）

- **现状（有）**：token JSON（`packages/design-system/tokens/density/{compact,comfortable,spacious}.tokens.json`）；schema（`packages/design-system/src/schema/appearance.schema.ts` `uiDensityValues`）；build-only tier（`src/build/token-contract.ts`）；`data-density` 轴 selector 定义（`src/build/formats/css.ts:162–176`）；运行时属性写入（`src/runtime/apply-appearance.ts:50`、`apps/web/src/app/appearance/appearance.store.ts`）。
- **缺**：生成 `packages/design-system/src/generated/tokens.css` 零 `[data-density]` 选择器；零 CSS/Vue/Uno 消费 `data-density`；无密度切换 UI。→ 三档**无视觉差异**。
- **准入条件**：独立准入的核心 Role/Projection 合同 + 真实视觉投影 → 翻 `ACTIVE`。
- **授权**：需独立准入。

---

## 阶段 B — Shared UI 公共核心（TARGET_INACTIVE ×3）

### B1. General Pinia state and workflow state — §1.3 L5886

- **现状**：Appearance Pinia 已 `ACTIVE`；无通用 / 工作流状态引擎。
- **准入条件**：未来显式准入的核心 ownership + 公共集成（无额外状态引擎或业务页前置）。
- **授权**：需独立准入。

### B2. Forms, I18n, Tables and Mutations — §1.3 L5903

- **现状（有）**：`packages/ui/src/components/form-contracts.ts`（`UiFormController` + 校验端口 `UiFormValidation` check/parse）；`packages/ui/src/composables/use-ui-form.ts`（590 行）；`UiForm.vue` / `UiFormField.vue`；Naive adapter（`PavpNaiveForm*.vue`）；registry `ui-form` / `ui-form-field`。
- **缺**：应用侧 **Zod bridge**（`packages/ui` 零 `zod` 引用）；本地 controlled **Table**（无 `UiTable` 组件 / registry / i18n key）；**public I18n 独立准入**（form copy 由 caller 提供，无 form 消息 key）；**远端 mutation**（无 CRUD 层）。
- **准入条件**：Zod bridge + Table 组件 + public I18n 准入 → 翻 `ACTIVE`；远端 mutation 需真实数据 / 服务合同。
- **授权**：需独立准入。

### B3. Demand-driven Forms/I18n/Tables/UI admission stage — §1.3 L5914

- **准入条件**：可重复的串行 stage，为显式 scoped 的公共组件 / 模块或真实集成准入；核心交付不需要业务 / 页面消费者。
- **授权**：需求驱动。

---

## 阶段 C — Workspace / Breadcrumb 完整目标（§18.11，TARGET_INACTIVE ×2）

### C1. Administration Global Breadcrumb and in-session Workspace Tabs core — §1.3 L5887

- **现状**：route-single Workspace core 已 `ACTIVE`（§18.11.10–12：`workspace-retention.ts` / `workspace.store.ts` / `packages/ui/src/components/UiWorkspaceTabs.vue`）；**Global Breadcrumb runtime 未启动**（仅 `UiPageHeader.vue:15–18` 硬编码两级 `NBreadcrumb`；`breadcrumbAncestry` 只在 `ARCHITECTURE.md` L11914 / L12712 作为 TARGET 契约、零源码）。
- **准入条件**：Global Breadcrumb runtime 实现 → 翻 `ACTIVE`。
- **授权**：需独立准入。

### C2. Multi-record Workspace identity — §1.3 L5888

- **现状**：§18.11 冻结架构 `PAVP_MULTI_RECORD_WORKSPACE_IDENTITY_ARCHITECTURE`（L11818–11835），`NOT_STARTED` / `IMPLEMENTATION_AUTHORIZATION=NONE`；当前 route-single + schemaVersion 1（`openRouteNames` 恢复）。
- **目标**：
  - record-address 身份（§18.11.3 L11932–11964）：Registry 第二项 `{ id:'workspace-identity.record-address', kind:'record-address' }`；Hash 永不参与 Workspace Identity / Session。
  - schemaVersion 2（§18.11.11 L12122–12155）：`PersistedWorkspaceStructure`（`workspace-identity.route-single` + `workspace-identity.record-address` 两类 openEntries）；仅该 Record `currentSchemaVersion→2`、`minimumSupportedSchemaVersion` 仍 1、保持 `direct-compatibility` / Partition `none` / `containsSensitiveData=false` / `preserve-in-place-reject-read`；不增 Key / IndexedDB / Envelope / 迁移子系统。
  - 逐实例释放（§18.11.5 L11988–11994）：`WorkspaceInstanceIdentity` 独占 Lifetime 与 VNode/Cache Identity；关闭/局部刷新 A 只释放 A；不用 `KeepAlive max` 隐式 LRU。
  - Discard Boundary（§18.11.6 L11996–12012）：`prepareDiscard({ reason, signal }) → { kind:'cancel' } | { kind:'allow'; release() }`。
- **准入条件**：上述实施 → 翻 `ACTIVE`。
- **授权**：**需 Owner 单独实施授权**（当前 `IMPLEMENTATION_AUTHORIZATION=NONE`）。

---

## 阶段 D — 交付 / 生成器 / 部署（TARGET_INACTIVE ×2）

### D1. Deployment delivery, CSP, cache, private source maps and rollback — §1.3 L5901

- **现状（有）**：`apps/web/vite.config.ts`（manifest / `sourcemap:false` / `cssCodeSplit` / `target es2022`）；`runtime-configuration.json`（releaseSha）；CI（`.github/workflows/verify.yml` + `codeql.yml`）；`bundleBudgets`（`project.config.ts`）。
- **缺**：**无 CSP**、无生产 cache / immutable headers、无 sourcemap 上传 / 清理、无 rollback、无 deploy / release workflow。
- **准入条件**：非阻塞未来 hosting / release 准入；backend 相关部分走 optional lane。
- **授权**：需独立准入。

### D2. Project generators — §1.3 L5911

- **准入条件**：serial demand-driven，重复真实需求后准入。
- **授权**：需求驱动。

---

## 阶段 E — Owner 确认核心 + 页面退役 / 重建（FINALLY）

§1 L208 / §28.3A L16156–16170：完成核心 → 静态验证 + 核心行为确认 → **Owner 明确确认核心** → 另行授权退役全部当前页面并重建架构示例页（L16174：图表 / 地图 / 专业 Grid / 复杂特效仍按需独立准入）。

- **前置**：按 §1 / §28.3A 完成业务无关核心、适用静态验证与核心行为确认，并由 Owner 明确确认核心；不以阶段 A–D 的九项 TARGET_INACTIVE 全部翻 `ACTIVE` 为统一条件。§1.3 / §37.2 的按需准入、真实服务合同和独立授权边界继续有效；Project generators 仍待重复真实需求，未来 hosting / release 准入仍为非阻塞项。
- **授权**：退役 / 重建需独立页面重建授权（§1 L208、§28.3A L16174）。

---

## DEFERRED（8 条，等真实后端 / 消费者合同，非落后）

| #   | 能力                                            | §1.3  | 准入条件（何时可推进）                                                          |
| --- | ----------------------------------------------- | ----- | ------------------------------------------------------------------------------- |
| 1   | Continuous Density Scale application            | L5881 | §14.3 persisted 字段；语义 / 计算需 Owner 决策                                  |
| 2   | Session state                                   | L5889 | 需真实 server Session 合同                                                      |
| 3   | TanStack Query server-state runtime             | L5896 | 需 API Transport + 服务端状态消费者（admissionCondition L5034）                 |
| 4   | API Transport                                   | L5898 | 需真实端点 / Origin / Schema / 策略 / 消费者 / 服务端 Owner（L5015）            |
| 5   | Auth, Session and Permission                    | L5899 | 需真实认证 / Cookie / CSRF / Session / Principal / Tenant / Capability（L5018） |
| 6   | Observability reporting and Runtime Performance | L5900 | 需真实事件生产者 / 报告 Provider / 隐私审查（L5024）                            |
| 7   | Motion for Vue, GSAP and specialist adapters    | L5907 | 通用 deferred；§1.2B.0M 已 INSTALLED 一个 scoped 私有 Motion runtime            |
| 8   | Optional backend-dependent capability lane      | L5913 | 保留 lane 身份，conditional real-service integration                            |

> 这批不是「差进度」，而是「缺真实合同」。当前纯前端主线不依赖它们；不要凭空补代码，禁止 Fake Service / 空实现 / 伪造成功（§1 L206）。

---

## PROHIBITED（3 条，当前与目标架构明确禁止）

| #   | 能力                                                    | §1.3  | 禁止依据                                   |
| --- | ------------------------------------------------------- | ----- | ------------------------------------------ |
| 1   | Router Experimental Data Loaders                        | L5915 | future stable-dependency decision required |
| 2   | Seed-generated, partial or auto-corrected themes        | L5916 | explicit complete Theme contract           |
| 3   | Page-authored visual authority and public optical props | L5917 | Design Token and UI boundary               |

§1.3 对 Router Experimental Data Loaders 显式保留未来稳定依赖决策条件，§9.10 的当前禁令仍有效；未来条件不等于当前准入或实施授权。其余两项继续遵守完整 Theme 合同及 Design Token / UI 权威边界，不从本指南推导例外或能力激活。

---

## 附：文档同步债（非实现差距，另需独立授权）

- **§1.2B.3 散文 vs JSON 计数漂移**：L5008 散文写「十二阶段 / 三条 Storage / 九个组件」，实际生成物为「十五阶段 / 八条 / 十个」（JSON L5030 / L5033 已正确；§1.3 L5925 承认未同步）。需独立授权收口。
- **Frozen Unmapped Gap**（§1.2B.3 L5000–5004）：`Semantic Status Color System`、`Administration Global Breadcrumb and in-session Workspace Tabs core`、`Multi-record Workspace identity` 三条 TARGET_INACTIVE 有意不进 manifest 投影；新增漏映射须显式登记于此（反向覆盖检查 L4972）。

---

## 执行与验证约定

- **能力状态**：按 §1.3，`ACTIVE` 表示当前仓库已有真实 Artifact、Owning Gate 与静态证据，只能按当前合同使用；不统一要求 Runtime / Visual / Accessibility 验收及 Git 交付全部完成后才能认定 `ACTIVE`，也不单独证明完整核心或发布已获接受。
- **实施与验收**：按 §1、§28.4、§37.2，分别报告源码实现、公共集成、静态验证、Owner 接受与包完成；完成实施任务须通过完整 `mise exec -- pnpm verify`，并满足该包实际合同与 Owning Gate。§32.2 的非发布手工观察不是统一完成门槛；核心确认及各包明确要求的验收仍须按其合同执行。
- **Git 与发布**：§28.3A 的 staging / commit / push / release 各需相应明确授权，Git 交付不能替代 Owner 验收。Production Release 仍须 §32.3 的适用 Runtime Matrix 与精确 Release 的 Owner Decision；纯静态文档且无 Runtime Artifact 变化时 Product Release Gate 不适用，仍须 `pnpm verify`。
- **编辑 `ARCHITECTURE.md` 后**：`mise exec -- pnpm verify` 必须 exit 0（覆盖 `check:arch` / `check:policy` / `check:capability-manifest` / `check:i18n` 等），并确认十三对 Current Work 镜像与状态块一致。
