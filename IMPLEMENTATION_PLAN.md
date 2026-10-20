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

## 第 0 项 — 收口 `PAVP_WORKSPACE_INSTANCE_RETENTION_IMPLEMENTATION` 状态漂移（最近一步）

**事实**：route-single Workspace 实例保留源码已在提交 `1684149` 落地（14 files，+1650/−238：新增 `apps/web/src/app/workspace/workspace-retention.ts` +469、`router-lifecycle.ts` +241、`check-router.ts` +699），commit 记录完整 `pnpm verify` exit 0 + Owner「验收通过没问题」。

**漂移**：`ARCHITECTURE.md` §18.11.12 块（L11845–11861）仍写 `REPOSITORY_IMPLEMENTATION=SOURCE_CANDIDATE` / `INDEPENDENT_SOURCE_REVIEW=PENDING` / `OWNER_RUNTIME_ACCEPTANCE=NOT_PERFORMED` / `OWNER_VISUAL_ACCEPTANCE=NOT_PERFORMED` / `OWNER_ACCESSIBILITY_ACCEPTANCE=NOT_PERFORMED` / `GIT_DELIVERY=NOT_AUTHORIZED`，尾段 prose（L11889 / L11891 / L11895）仍写「未暂存 / 未提交」——与「已提交且验收通过」的事实矛盾。

**⚠ 执行前置**：存在两种解释（`1684149` 是已落地早切片 vs §18.11.12 描述的「十四路径」是更新未暂存切片）。**必须由 Owner 先确认真实状态**，不可盲目翻字段。

**动作**（确认后）：
1. 推进 §18.11.12 状态块字段（L11845–11861）至与事实一致。
2. 同步十三对 Current Work 镜像（`CURRENT_BOUNDED_WORK_AUTHORITY` / `CURRENT_BOUNDED_WORK`，首对 L117–118，共 13 处）。
3. 修正 stale prose（L11889 / 11891 / 11895）。
4. 之后方可考虑放开 `NEXT_CANONICAL_IMPLEMENTATION_WORK_PACKAGE` / `SUCCESSOR_PACKAGE_AUTHORIZATION`（当前 `NONE`）。

**授权**：编辑 `ARCHITECTURE.md` 需 Owner 单独授权；按 §28.3A Git 阶梯逐级执行。

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

- **前置**：阶段 A–D 的 TARGET_INACTIVE 全部翻 `ACTIVE` 且 Owner 确认核心。
- **授权**：退役 / 重建需独立页面重建授权（§1 L208、§28.3A L16174）。

---

## DEFERRED（8 条，等真实后端 / 消费者合同，非落后）

| # | 能力 | §1.3 | 准入条件（何时可推进） |
|---|------|------|------------------------|
| 1 | Continuous Density Scale application | L5881 | §14.3 persisted 字段；语义 / 计算需 Owner 决策 |
| 2 | Session state | L5889 | 需真实 server Session 合同 |
| 3 | TanStack Query server-state runtime | L5896 | 需 API Transport + 服务端状态消费者（admissionCondition L5034） |
| 4 | API Transport | L5898 | 需真实端点 / Origin / Schema / 策略 / 消费者 / 服务端 Owner（L5015） |
| 5 | Auth, Session and Permission | L5899 | 需真实认证 / Cookie / CSRF / Session / Principal / Tenant / Capability（L5018） |
| 6 | Observability reporting and Runtime Performance | L5900 | 需真实事件生产者 / 报告 Provider / 隐私审查（L5024） |
| 7 | Motion for Vue, GSAP and specialist adapters | L5907 | 通用 deferred；§1.2B.0M 已 INSTALLED 一个 scoped 私有 Motion runtime |
| 8 | Optional backend-dependent capability lane | L5913 | 保留 lane 身份，conditional real-service integration |

> 这批不是「差进度」，而是「缺真实合同」。当前纯前端主线不依赖它们；不要凭空补代码，禁止 Fake Service / 空实现 / 伪造成功（§1 L206）。

---

## PROHIBITED（3 条，永不实现）

| # | 能力 | §1.3 | 禁止依据 |
|---|------|------|----------|
| 1 | Router Experimental Data Loaders | L5915 | future stable-dependency decision required |
| 2 | Seed-generated, partial or auto-corrected themes | L5916 | explicit complete Theme contract |
| 3 | Page-authored visual authority and public optical props | L5917 | Design Token and UI boundary |

---

## 附：文档同步债（非实现差距，另需独立授权）

- **§1.2B.3 散文 vs JSON 计数漂移**：L5008 散文写「十二阶段 / 三条 Storage / 九个组件」，实际生成物为「十五阶段 / 八条 / 十个」（JSON L5030 / L5033 已正确；§1.3 L5925 承认未同步）。需独立授权收口。
- **Frozen Unmapped Gap**（§1.2B.3 L5000–5004）：`Semantic Status Color System`、`Administration Global Breadcrumb and in-session Workspace Tabs core`、`Multi-record Workspace identity` 三条 TARGET_INACTIVE 有意不进 manifest 投影；新增漏映射须显式登记于此（反向覆盖检查 L4972）。

---

## 执行与验证约定

- **每项能力准入**：静态 Gate（`mise exec -- pnpm verify` exit 0）+ Owner Runtime / Visual / Accessibility 验收 + Git 授权阶梯，三者齐备才算 `ACTIVE`。
- **编辑 `ARCHITECTURE.md` 后**：`mise exec -- pnpm verify` 必须 exit 0（覆盖 `check:arch` / `check:policy` / `check:capability-manifest` / `check:i18n` 等），并确认十三对 Current Work 镜像与状态块一致。
- **文档本文件**：仅新增本文件，不触碰源码与 `ARCHITECTURE.md`；`git status` 应只显示本文件未跟踪。
