# Progressive Adaptive Vue Platform

**Status:** Canonical Architecture Baseline

A greenfield, TypeScript-first frontend application platform designed for deeply user-adaptive visual systems, responsive PC, iPad, tablet, and mobile H5 experiences, accessible interaction primitives, and enforceable AI-assisted development.

The delivery target is a business-independent Vue frontend architecture with reusable public
components and modules, independently copyable and maintained within each project. Business
management pages and a real protected business flow are not mandatory core deliverables.

The current developer workbench includes a dashboard that reads a real UApi world-time response
on request. Color, size, typography and
interaction galleries show implemented public capabilities; click a token specimen to copy its
CSS expression. System settings are a separate page, reached from the bottom of the sidebar,
with immediate preference updates and a Done action that returns to the prior workspace.

Unfinished core capabilities remain separately governed and are hidden from the workbench.
Source implementation, static verification, runtime/visual acceptance and production release
remain distinct states; these pages do not prove complete core delivery or Owner acceptance.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the architecture overview.

Deployment inputs are read and validated by [apps/web/config.ts](./apps/web/config.ts).
`pnpm dev` selects [development](./apps/web/.env.development); `pnpm build` selects
[production](./apps/web/.env.production) and emits `apps/web/dist/runtime-configuration.json`.
Only the same-named process variable overrides a selected file value. Missing files, unknown
fields, malformed assignments and invalid final values fail configuration loading; an explicit
empty override does not fall back. Generic/local env files are not deployment inputs.

The centralized public inputs are `PAVP_DEPLOYMENT_BASE` (exact site base `/`),
`PAVP_API_BASE_URL` (service base), and development-only `PAVP_DEV_PROXY_PREFIX`.
The development server uses `/api/` in the browser and forwards to the configured HTTPS upstream;
change the upstream once in the selected env file. Runtime `upstreamOrigin` identifies the actual
authentication recipient to the injected provider, which must approve that recipient before
returning credentials. An existing same-origin API prefix such as `/backend/` is also accepted
and leaves the proxy preset inactive. Remove the proxy-prefix input to use a direct HTTPS API.
Preview, builds and configuration generation use the actual API base without a dev-server proxy;
direct HTTPS access still depends on the backend's CORS policy.
Preview serves the existing build artifact; after changing deployment inputs, run
`config:generate` to update that artifact's API configuration before previewing it.
Production has no third-party API default: omit the API base for an explicit `unconfigured`
state, or provide a real canonical HTTPS base or same-origin path prefix, ending in `/`.
Production rejects development proxy settings. A production API prefix requires deployment-owned
routing; Vite's development proxy is not included in the built application.

After building, update the selected env/process API value and run `pnpm config:generate`.
Use `pnpm config:generate --artifact-dir <existing-build-directory>` for another artifact.
The command requires the project's existing Node/dependencies and an existing protocol-2 runtime
artifact. It preserves that artifact's environment, website base, version and SHA without reading
Git or rebuilding code, and atomically replaces only its API configuration. A new page startup
reads the updated file. Missing/malformed artifacts and invalid inputs fail without replacing it.
Version remains rooted in package.json; SHA remains build-owned. Credentials and private keys
belong to the server, outside browser output. Tokens, preferences and storage keys keep their existing owners.

### Edit configuration after deployment

The deployed `runtime-configuration.json` is the single public runtime configuration file.
Edit it directly on the server (no Node tooling or rebuild is required), then reload the page.
Replace the file atomically and serve it with `Cache-Control: no-store`; configure your CDN to
bypass caching for this path. Already-open tabs keep their current configuration until reload.
The application loads and validates it before mounting content. It never silently falls back to
an old API address when configuration is invalid. The existing startup recovery screen remains available. To validate an edited artifact locally,
run `pnpm config:generate --check --artifact-dir <directory>`; this reports invalid field paths
and constraints without changing the file.

Keep `schemaVersion`, `environment`, `deploymentBase`, `releaseSha`, and `buildVersion` unchanged.
For a new release, start with its newly generated file and reapply only the deployment's `api`
and `presentation` values. Do not copy the complete previous file: its build identity belongs to
the old JavaScript assets and will be rejected. Validate the new file with `--check`, then publish
the new assets and their matching configuration together. Back up the previous release as one
unit for rollback. Build generation itself does not automatically preserve server-side edits.

The emitted `presentation` object contains these editable fields:

- `name`: product name shown in the header and browser title; `null` keeps localized PAVP labels.
- `logo`: root-relative or HTTPS image URL; `null` keeps the text brand.
- `favicon`: root-relative or HTTPS icon URL.
- `locale`: `zh-CN` or `en` as the initial language.
- `appearance`: the existing appearance preference structure, including built-in theme,
  color mode, contrast, material, density, font scale, motion, and radius. Edit the generated
  values rather than introducing arbitrary tokens or theme identifiers. Custom themes remain
  user-owned, not deployment defaults.

The existing `api` object remains editable. `config:generate` updates only that API object and
preserves your presentation settings. Saved user language and appearance take precedence over
deployment defaults; defaults are not written into storage on startup. Resetting appearance uses
the current deployment default. New defaults are applied before application content mounts,
not as a post-mount theme switch. The network-independent first-paint safety theme still covers
loading and failures before the configuration arrives.

All values are public to browser visitors. Never include server secrets or database credentials.
Changing an API URL does not configure backend CORS or the deployment reverse proxy. This build
currently supports the site root `/`; changing its base path, adding code, components, routes or
new bundled themes still requires a build. Optional branding images may be replaced independently
on the server; ensure their own HTTP cache policy matches the desired update behavior.

The public request layer is [shared/api](./apps/web/src/shared/api/index.ts). Create a client
from validated runtime `api` configuration; pass the page's `location.origin` as `origin` when
using a same-origin prefix. Callers own AbortSignal and presentation. Endpoint modules own
request inputs, response mode/MIME and Zod schemas; the transport returns typed success,
accepted, or safe failure results. It performs one attempt with cancellation/timeout cleanup,
without global notifications, retries, server-state caching or credential persistence.

[The UApi worldtime adapter](./apps/web/src/shared/services/uapi-world-time.ts) is an isolated,
anonymous verification integration. Its schema is not part of the generic client. Direct
production CORS is not promised: the provider documents keyless cross-origin restrictions;
the development proxy is only for local integration. The request and configuration boundaries
are maintained in [shared/api](./apps/web/src/shared/api/index.ts) and
[apps/web/config.ts](./apps/web/config.ts).

The read-query entry is [shared/query](./apps/web/src/shared/query/index.ts). Create one
`createApiQueryRuntime(apiClient)` for a caller-owned lifetime. Its `queryOptions(endpoint,
{ query })` accepts public anonymous GET/JSON endpoints and snapshots inputs for the cache key.
Use official `useQuery(options, runtime.queryClient)` in a Vue scope, or the same client's
`query`, `cancelQueries` and `invalidateQueries`; stop consumers, then await `runtime.dispose()`.
Only validated data reaches the cache; HTTP failures become `ApiQueryError.detail` rather than
success data. A valid HTTP 202 becomes `ApiQueryAccepted.result` in Query's error channel,
distinct from an HTTP failure: it preserves the typed acceptance and any previous completed
data, and never pretends the accepted response is completed resource data. Reads deduplicate,
but do not automatically retry, poll, or refetch on focus,
reconnect or remount. Callers explicitly invalidate or refetch. The UApi module also exposes
`uapiWorldTimeQueryOptions` using its existing endpoint and schemas. No global provider, page
consumer, authenticated query, mutation, persisted cache or cross-tab cache is added.

## Table column preferences

Tables can opt into automatic column visibility and order persistence with a stable JSON
`columnPreferenceKey`. Different tables should use different keys. Pass the application's
`useTableColumnPreferences()` storage port to `useUiTable`; the UI package never accesses
browser storage directly. The column configuration example demonstrates this behavior.

Preferences restore synchronously on creation, including after refresh. New columns keep
their schema defaults; removed columns are ignored. Reset columns clears only that table's
saved preference. Only column keys, visibility, and order are stored, never rows, filters,
requests, or credentials. Without an explicit key, table state remains transient.

### Table sorting

`UiTableSchema.sorting` defaults to `single`. Set it to `multiple` to retain clicked columns
in priority order. `table.setSorts([{ key, order }, ...])` replaces that list; `setSort` replaces
it with one column, and `setSorts([])` clears it. The header shows priority numbers. Sorting
resets pagination to page one and uses the existing selection and request cancellation lifecycle.
`query.sorts` is the complete immutable list; `query.sort` is its first entry (or null) for existing
single-column bindings. Equal values retain source order.

For local business ordering, JSON columns can specify `sortComparator: 'priority'`. Pass the
trusted function as `useUiTable({ sortComparators: { priority: (left, right, context) => ... } })`.
It returns a finite ascending comparison; the table applies direction. Unknown names fail before
loading. Functions are never accepted inside JSON, and custom comparator failures follow the
existing table error/retry path.

Remote data is never locally reordered. Bind a request body/parameter with `{ from: 'sorts' }`
to send the ordered list, then adapt it to the backend's expected format in the existing transport.
`sort.key` / `sort.order` remain primary-only references. Local comparators are rejected on remote
tables; the server owns its business ordering. See the sorting showcase for single, multiple and
business-order examples using the same controller.

### Grouped table headers

`UiTableSchema.columnGroups` accepts nested `{ key, title, children }` groups. Children are existing column keys or nested groups; each column can belong to only one path. Titles use the table translator. Ungrouped columns remain available. Groups never own column widths or order: current visible columns determine spans, empty groups disappear, and reordered noncontiguous members or different pinned sections render separate group segments. Sorting remains on leaf headers. Selection, row actions, horizontal scrolling, and the fixed summary continue using the same leaf-column geometry. The column configuration showcase demonstrates nested groups together with saved column preferences.

### 表格 CSV 导出

表格 JSON 可通过 `csvExport: { fileName: "records.csv", scopes: ["page", "selected"] }` 启用导出。
`page` 仅导出当前成功加载的页，`selected` 仅导出本页已选记录（需要配置 selection）。
不会自动请求其他页；远端全量导出由业务后端另行提供，不能将已加载数据当全量。
导出按当前可见叶列与列顺序生成，表头使用当前翻译，不包含隐藏列、操作列或汇总行。
值使用原始数据（对象/数组序列化为 JSON），不抓取自定义单元格 DOM。UTF-8 BOM 支持中文，
文本（含表头）以空白后 =、+、-、@ 开头，或以制表/回车/换行开头时，导出值增加前导单引号；数值类型不改变。
这会改变 CSV 文本值，部分工具可能直接显示该单引号。此处理仅降低常见公式注入风险，不保证所有电子表格/导入设置或重新保存后的行为安全；不可信数据应按文本导入，不要启用公式或外部链接。
`table.exportCsv(scope)` 返回内容、文件名、MIME 和行数，不操作浏览器；`UiTable` 按配置提供下载按钮。
空范围、加载中、错误或已释放状态禁止导出，避免将过期页误作当前结果。
“选择与批量”页面可真实体验当前页和选中项导出。
