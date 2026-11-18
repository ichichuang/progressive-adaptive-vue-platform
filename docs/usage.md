# PAVP 开发与部署

[返回项目首页](../README.md) · [架构说明](../ARCHITECTURE.md)

## 本地跑起来

准备 Node.js **24.15.0** 和 pnpm **10.34.5**，进入仓库目录后运行：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开终端给出的地址即可。改完代码后运行 `pnpm verify`，会跑仓库校验和生产构建。工具版本以 [mise.toml](../mise.toml) 为准。

工作台只展示已经实现的能力；源码实现、静态检查、实际界面验收和上线不是一回事。

## 在 VS Code 中开发

打开仓库根目录，按工作区推荐启用扩展。在 TypeScript 文件中执行「TypeScript: Select TypeScript Version」，选择工作区版本。Vue 模板类型提示由 Vue - Official 提供。手动保存 Vue 文件时，Prettier 使用项目格式配置，ESLint 执行可自动修复的规则。可在「输出」面板查看两者加载的路径。

i18n Ally 读取中英文消息，在静态翻译键上执行「转到定义」可定位中文源文件。翻译文件位于 `apps/web/src/shared/i18n/messages/{zh-CN,en}/`，修改文案时直接编辑两种语言下同名的 JSON 文件，保留平铺键。UnoCSS 从根配置提供语义类提示，Stylelint 检查 CSS。

通过「任务: 运行任务」选择「PAVP：开发」或「PAVP：校验」，分别在仓库根目录执行 `pnpm dev` 或 `pnpm verify`。若任务终端找不到 pnpm，先核对该终端的 mise 环境和 PATH。

身份与访问控制的可选装配、演示场景和宿主接口见 [Identity and access integration](./access-integration.md)。

## 部署与运行时配置

### 构建时怎么配

[apps/web/config.ts](../apps/web/config.ts) 负责读取和校验配置。`pnpm dev` 使用 [开发配置](../apps/web/.env.development)；`pnpm build` 使用 [生产配置](../apps/web/.env.production)，并生成 `apps/web/dist/runtime-configuration.json`。

只有同名进程变量可以覆盖选中的配置文件。文件缺失、字段未知、赋值格式错误或最终值无效时都会报错；显式传空值也不会回退。通用和本地环境文件不参与部署配置。

- `PAVP_DEPLOYMENT_BASE`：站点基路径，目前只接受 `/`。
- `PAVP_API_BASE_URL`：服务地址。生产环境不默认接入第三方 API；不配置即为 `unconfigured`。需要接入时，填写实际 HTTPS 地址或同源路径前缀，末尾保留 `/`。
- `PAVP_DEV_PROXY_PREFIX`：仅开发环境使用。开发代理让浏览器请求 `/api/`，再转发给配置中的 HTTPS 服务；换上游只需改对应的环境配置。若 API 本身使用 `/backend/` 一类同源前缀，代理预设不会启动。移除代理前缀即可直连 HTTPS API。

注入的认证提供方会根据 `upstreamOrigin` 识别实际接收凭据的目标，确认后才返回凭据。生产环境拒绝开发代理配置；同源 API 前缀要在部署端配置路由。预览、构建和配置生成都使用实际服务地址，不使用 Vite 开发代理。直连 HTTPS 仍受后端 CORS 规则约束。

预览使用已有产物。改了环境变量或进程变量里的 API 地址后，先用 `pnpm config:generate` 更新产物，再打开预览。也可用 `pnpm config:generate --artifact-dir <existing-build-directory>` 指定产物目录。命令需要项目的 Node 环境、依赖和已生成的协议 2 运行时文件，只原子替换 `api`，不读 Git、不重新构建。环境、站点基路径、版本号和 SHA 不变；版本来自 `package.json`，SHA 由构建写入。文件或输入有问题时，不会覆盖原文件。

### 上线后怎么改

部署后的 `runtime-configuration.json` 是唯一的公开运行时配置。改 API 或站点外观默认值时，可以直接在服务器原子替换这个文件，无需 Node 工具，也不必重新打包。服务器应返回 `Cache-Control: no-store`，CDN 应绕过此文件的缓存。打开着的标签页会在刷新后读取新配置。

应用挂载前会校验配置。无效配置不会偷偷回退到旧 API 地址，仍可使用启动恢复页。本地可以运行：

```sh
pnpm config:generate --check --artifact-dir <directory>
```

这条命令只报告无效字段和约束，不修改文件。请保留 `schemaVersion`、`environment`、`deploymentBase`、`releaseSha` 和 `buildVersion`。发布新版时，以新生成的配置为准，只重新应用服务器上的 `api` 和 `presentation` 设置，不能把旧配置整份搬过去。校验后把新静态资源和对应配置一起发布；回滚也按整套产物备份。构建不会自动保留服务器上的改动。

`presentation` 支持配置：

- `name`：页头和浏览器标题中的产品名；`null` 使用 PAVP 默认本地化文案。
- `logo`：站点根目录相对路径或 HTTPS 图片地址；`null` 保留文字品牌。
- `favicon`：站点根目录相对路径或 HTTPS 图标地址。
- `locale`：初始语言，可选 `zh-CN` 或 `en`。
- `appearance`：使用已有偏好结构，支持内置主题、明暗、对比度、材质、密度、字号、动效和圆角。不引入自定义令牌或主题标识；自定义主题仍由用户管理。

用户已保存的语言和外观优先于部署默认值；启动不会把默认值写入用户存储。「重置外观」使用当前部署默认值。默认设置在内容显示前应用，配置到达之前的首屏和错误页仍可使用不依赖网络的安全主题。`config:generate` 只更新 `api`，不改 `presentation`。

**这里的内容对浏览器访客公开。不要把服务端密钥、数据库凭据放进这个文件。** 改 API 地址不会配置 CORS 或反向代理。修改基路径、新增组件、路由或内置主题仍需要构建。独立部署的品牌图片可以单独替换，注意为它们设置合适的缓存策略。

## 请求和查询

- **请求入口是 [shared/api](../apps/web/src/shared/api/index.ts)。** 用校验后的运行时 `api` 创建客户端。同源前缀场景传入页面的 `location.origin`。调用方控制 `AbortSignal` 和展示；端点模块定义输入、响应类型、MIME 和 Zod schema。传输层只发一次请求，返回类型化的成功、已受理或失败结果，并清理取消与超时资源，不负责全局提示、重试、缓存或保存凭据。
- **查询入口是 [shared/query](../apps/web/src/shared/query/index.ts)。** 调用方通过 `createApiQueryRuntime(apiClient)` 管理生命周期。`queryOptions(endpoint, { query })` 面向公开匿名 GET/JSON 端点，输入快照用于缓存键。可以在 Vue 作用域使用 `useQuery(options, runtime.queryClient)`，也能调用同一客户端上的 `query`、`cancelQueries` 和 `invalidateQueries`；先停止使用方，再调用 `runtime.dispose()`。
- **已受理不等于已完成。** 只有校验通过的数据会写入缓存。HTTP 失败保存在 `ApiQueryError.detail`；有效的 HTTP 202 保存在查询错误通道中的 `ApiQueryAccepted.result`，保留类型化的受理结果及上次已完成数据，不会把 202 当成资源已就绪。读取请求会合并重复调用，但不自动重试、轮询，也不在聚焦、重连或重新挂载时自动刷新。需要时由调用方显式清理或重新请求。
- 工作台的 [UApi 世界时间示例](../apps/web/src/shared/services/uapi-world-time.ts) 是独立的匿名接口示例，提供 `uapiWorldTimeQueryOptions`，其 schema 不属于通用客户端。开发代理仅用于本地对接，生产直连接口仍受上游跨域策略限制。查询层不提供全局 Provider、鉴权查询、写操作、持久化缓存或跨标签页缓存。

## 表格使用笔记

### 记住列设置

在 JSON 配置中给不同表格设置各自稳定的 `columnPreferenceKey`，并把应用提供的 `useTableColumnPreferences()` 存储接口传给 `useUiTable`。UI 包不会直接访问浏览器存储。

列设置在表格创建时同步恢复，刷新也一样。新增列使用 schema 默认值，已移除列会被忽略。「重置列」只清除当前表格的偏好。保存的是列键、显示状态和顺序，不存数据行、筛选条件、请求或凭据；未配置键时，不做持久化。

### 排序和分组表头

`UiTableSchema.sorting` 默认是 `single`，设成 `multiple` 后，表头按点击顺序显示优先级。用 `table.setSorts([{ key, order }, ...])` 替换排序列表，`setSort` 只保留一列，`setSorts([])` 清除排序。排序会回到第一页，沿用原有选择与请求取消机制；相等的值保持原序。`query.sorts` 是完整的只读列表，`query.sort` 保留首项（或 `null`），方便现有单列绑定。

本地排序可在列配置声明 `sortComparator: 'priority'`，再用 `useUiTable({ sortComparators: { priority: (left, right, context) => ... } })` 提供可信函数。函数返回有限的升序比较值，表格应用排序方向。JSON 不接收函数，未知名称在加载前报错，比较失败沿用表格的错误与重试流程。远端数据由服务端排序，不运行本地比较器；请求可绑定 `{ from: 'sorts' }` 发送完整排序列表，再按接口要求转换。`sort.key` 和 `sort.order` 仅引用首项。

`UiTableSchema.columnGroups` 接受嵌套的 `{ key, title, children }`。子项使用现有列键或子分组；同一列只能属于一条分组路径。未分组列仍可用。表头标题沿用表格翻译，跨度根据当前可见列计算。空分组不显示；不相邻或跨固定区的列分段显示。排序在叶列上操作，选择、行操作、横向滚动和固定汇总沿用同一套叶列尺寸。

### 表格 CSV 导出

通过[选择与批量示例](https://pavp.cc/components/tables/selection)可以试用当前页和选中项导出。

表格 JSON 可通过 `csvExport: { fileName: "records.csv", scopes: ["page", "selected"] }` 启用导出。`page` 导出当前成功加载的页，`selected` 导出本页已选记录（需要配置 `selection`）。不会自动请求其他页；远端全量导出应由后端提供。

导出按可见叶列和当前列顺序生成，表头使用当前翻译，不含隐藏列、操作列或汇总行。值来自原始数据，不抓取单元格 DOM；对象和数组以 JSON 写入，UTF-8 BOM 支持中文。

以空白后 `=`、`+`、`-`、`@` 开头，或以制表、回车、换行开头的文本（含表头），会添加前导单引号，数值不变。这会改变 CSV 文本值，部分工具会直接显示单引号。它只降低常见公式注入风险；导入不可信数据时请按文本处理，不要启用公式或外部链接。

`table.exportCsv(scope)` 返回内容、文件名、MIME 和行数，不直接操作浏览器；`UiTable` 按配置提供下载按钮。没有可导出的数据、请求进行中、请求失败或表格已释放时，不允许导出，以免把旧数据当作当前结果。
