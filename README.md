# Progressive Adaptive Vue Platform

**Status:** Canonical Architecture Baseline

A greenfield, TypeScript-first frontend application platform designed for deeply user-adaptive visual systems, responsive PC, iPad, tablet, and mobile H5 experiences, accessible interaction primitives, and enforceable AI-assisted development.

The delivery target is a business-independent Vue frontend architecture with reusable public
components and modules, independently copyable and maintained within each project. Business
management pages and a real protected business flow are not mandatory core deliverables.

The current developer workbench is the Owner-authorized page reconstruction in
[Architecture §18.17](./ARCHITECTURE.md#1817-developer-capability-workbench-reconstruction).
The dashboard reads a real UApi world-time response on request. Color, size, typography and
interaction galleries show implemented public capabilities; click a token specimen to copy its
CSS expression. System settings are a separate page, reached from the bottom of the sidebar,
with immediate preference updates and a Done action that returns to the prior workspace.

Unfinished core capabilities remain separately governed and are hidden from the workbench.
Source implementation, static verification, runtime/visual acceptance and production release
remain distinct states; these pages do not prove complete core delivery or Owner acceptance.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the canonical architecture baseline.

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
belong to the server, outside browser output. Tokens, preferences, storage keys and budgets keep
their existing owners.

The public request layer is [shared/api](./apps/web/src/shared/api/index.ts). Create a client
from validated runtime `api` configuration; pass the page's `location.origin` as `origin` when
using a same-origin prefix. Callers own AbortSignal and presentation. Endpoint modules own
request inputs, response mode/MIME and Zod schemas; the transport returns typed success,
accepted, or safe failure results. It performs one attempt with cancellation/timeout cleanup,
without global notifications, retries, server-state caching or credential persistence.

[The UApi worldtime adapter](./apps/web/src/shared/services/uapi-world-time.ts) is an isolated,
anonymous verification integration. Its schema is not part of the generic client. Direct
production CORS is not promised: the provider documents keyless cross-origin restrictions;
the development proxy is only for local integration. See the canonical
[HTTP contract](./ARCHITECTURE.md#20-api-transport-target-contract) and
[configuration contract](./ARCHITECTURE.md#341-build-time-and-runtime-configuration).

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
