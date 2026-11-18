# Identity and access integration

[Back to developer usage](./usage.md)

## Choose the application composition

| Composition                        | Build selection                                                                       | Startup and route boundary                                                                                                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public foundation                  | `pnpm dev` or `pnpm build`                                                            | The core application starts with no `AccessHost`. Public pages and anonymous GET/JSON queries remain available.                                                                                                      |
| Foundation with login presentation | Open `/login` in the public foundation                                                | The existing standalone layout is in the public route registry. Its primary action opens the Welcome page directly at `/`. Inputs stay in the presentation.                                                          |
| Native showcase                    | Select `vite.access-showcase.config.ts`                                               | Creates one browser-document synthetic world. Native grants own navigation and policy administration, declared predicates own records and fields, and the bounded relationship adapter owns named sharing decisions. |
| CASL showcase                      | Select `vite.access-showcase-casl.config.ts`                                          | The same world and route set use an explicitly selected CASL provider for the record domain.                                                                                                                         |
| Real host                          | Keep the showcase profile `null` and inject your `AccessHost` at application assembly | The host confirms identity and scope and owns authentication, credentials, sessions, authoritative authorization, data, and policy. Select administration modules independently.                                     |

The Vite factory `createApplicationBuildConfig(administrationModules, showcaseProfile)` accepts an array of existing administration module IDs and `null`, `'native'`, or `'casl'`. Use `[]` for no administration. The supplied showcase configs select `['policies']`. The build selects the bootstrap entry and static route source folders together. The default and native entries have no import of the CASL adapter. Selected route declarations are generated into profile-specific directories under `apps/web/node_modules/.pavp-route-types/`. The public declaration remains `apps/web/src/route-map.d.ts`.

```sh
pnpm --filter @platform/web dev --config vite.access-showcase.config.ts
pnpm --filter @platform/web dev --config vite.access-showcase-casl.config.ts
pnpm --filter @platform/web build --config vite.access-showcase.config.ts
pnpm --filter @platform/web build --config vite.access-showcase-casl.config.ts
```

Start at `/access-showcase`. The public overview has the scenario, identity, organization, and reset controls. `/access-showcase/projects` is controlled. `/access-showcase/editor?mode=edit&id=showcase-signal-task-1` additionally validates its exact editor input. `/access-showcase/diagnostics` is an explicit public diagnostics entry. `/administration/policies` is a controlled optional module. A fresh document starts anonymous. Use the overview to confirm a synthetic member before entering a controlled page. Reloading a controlled URL exercises normal direct-entry authorization against a fresh host.

A project can link its existing identity provider to the real-host entry without choosing a showcase profile. In its copy of [main.ts](../apps/web/src/main.ts), pass the host as the fifth argument to `startRuntimeKernel`. Keep the existing root, scroll lifecycle, and HMR disposal. A missing provider makes its explicitly controlled requirements unavailable.

## Select one authority for each domain

This example uses source imports relative to `apps/web/src`. It registers collection, record, and field actions independently. Use complete, validated effective grants received from your host.

```ts
import type { AccessHost, AccessRequest } from './app/access/access-contract'
import { createNativeGrantProvider } from './app/access/native-grants'

const list: AccessRequest = {
  kind: 'collection',
  domain: 'projects',
  resource: 'task',
  action: 'list',
}
const record: AccessRequest = {
  kind: 'record',
  domain: 'projects',
  resource: 'task',
  action: 'read',
  recordId: 'task-42',
}
const title: AccessRequest = {
  kind: 'field',
  domain: 'projects',
  resource: 'task',
  action: 'read-field',
  recordId: 'task-42',
  fieldPath: 'title',
}
const organization = [{ kind: 'organization', id: 'confirmed-organization-id' }] as const
const principal = { kind: 'known', principalId: 'confirmed-principal-id' } as const

const provider = createNativeGrantProvider(
  'projects',
  [list, record, title].map(({ kind, resource, action }) => ({ kind, resource, action })),
  {
    complete: true,
    revision: 'opaque-effective-revision',
    roles: [],
    subjects: [
      {
        identity: principal,
        groups: [],
        roles: [],
        grants: [list, record, title].map((request) => ({
          request,
          effect: 'allow',
          scope: { kind: 'exact', path: organization },
        })),
      },
    ],
  },
)

// In a real host, use the authoritative SDK or API for every confirmation.
const host: AccessHost = {
  decisions: [provider],
  resolveContext: (change) => {
    if (
      change.kind === 'scope' &&
      change.candidate &&
      (change.candidate.length !== 1 ||
        change.candidate[0]?.kind !== 'organization' ||
        change.candidate[0].id !== organization[0].id)
    )
      throw new Error('Scope could not be confirmed')
    return { identity: principal, scope: organization }
  },
}
```

Register route permissions on the existing Route Registry using `meta.auth`, `requiredPermissionIds`, and a matching `permissionRequests` entry. Use the validated destination to bind record identifiers from params or query. Navigation, direct entry, workspace recovery, and tab removal use that registration. For operation consumers, an `AccessRequirement` combines explicitly registered requests with a selected scope and `operator: 'all'` or `'any'`. Use `any` only for alternative rules that authorize the same operation. Changing an organization begins a context transition and the host confirms the candidate before the next generation is usable.

| Authority                 | Integration and decision boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native grants             | `createNativeGrantProvider` from `app/access/native-grants.ts` validates capabilities, effective snapshots, scopes, and an acyclic role graph. Type permission to view a resource kind cannot stand in for record or field permission.                                                                                                                                                                                                                                                       |
| Conditional               | `createPredicateAccess` from `app/access/predicate-access.ts` declares each supported capability, its fact paths, and a predicate. `loadFacts` supplies a packet bound to the exact request and declared `confirmed` or `candidate` input. Candidate proposed values and proposal revisions never become confirmed facts by evaluation.                                                                                                                                                      |
| CASL                      | `createCaslAccess` from `app/access/casl-access.ts` maps each declared capability to a subject/action in an ordered policy. Import it only in a composition that selected CASL. A type-level answer can be possible while the actual instance fails conditions. Conditional collections need authoritative host projection.                                                                                                                                                                  |
| Relationships             | `createRelationshipAccess` from `app/access/relationship-access.ts` selects bounded, acyclic complete snapshots and resource-specific inheritance. It supports named principal record checks with exclusions, expiry, scope checks and an injectable clock. Incomplete snapshots stay indeterminate. Public sharing needs a separately authorized host projection.                                                                                                                           |
| Remote decision callbacks | `createHostDecisionAccess` from `app/access/host-decision-access.ts` takes registered capabilities, an exact request `map`, and an `evaluate(queries)` callback. If the host uses Casbin, map to its subject, object, action and domain. For OpenFGA, map to its user, relation, object and model identity. These are host callback mappings. The application correlates request ID, target, and declared revisions, and leaves consistency enforcement and service interaction to the host. |

## Bind consumers to the confirmed context

Use `useAccessBoundary()` from `app/access/access-boundary.ts` in an application component. The following example assumes a configured `ApiClient` and a registered protected GET JSON `endpoint`. The host translates the confirmed scope into its service-specific filter and returns an already authorized projection.

```ts
import { createScopedApiRead } from './app/api/scoped-api-read'
import { useAccessBoundary } from './app/access/access-boundary'

const access = useAccessBoundary()
const requirement = { scope: { kind: 'global' }, operator: 'all', requests: [record] } as const
const read = createScopedApiRead(access, {
  client,
  requirement: () => requirement,
  plan: ({ context }) => ({
    status: 'ready',
    endpoint,
    input: { query: { id: 'task-42', organization: context.scope[0]?.id ?? '' } },
  }),
})

await read.run()
const result = read.state.value
if (result.status === 'ready' && read.isCurrent(result.requestId)) {
  // Hand the current projected response and its receipt to its consumer.
}
```

For a write, register a separate action requirement and bind the host dispatch to the captured target revision and context. The service performs its own checks and maps acknowledgements to each request and target.

```ts
import { executeGuardedAction } from './app/access/guarded-action'

const target = { id: 'task-42', revision: confirmedRevision, idempotencyKey: commandKey }
const write = { ...record, action: 'save' } as const
await executeGuardedAction(
  access,
  {
    requirement: () => ({ ...requirement, requests: [write] }),
    isTargetCurrent: (candidate) => candidate.revision === readCurrentRevision(),
    businessAllows: () => true,
    dispatch: (commands, signal) => hostDispatch(commands, signal),
  },
  { signal: controller.signal, targets: [target] },
)
```

| Consumer           | Small integration pattern                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Forms              | Pass `{ access, form, source, target, confirmed, recordRead, recordWrite, action }` to `useGuardedForm` from `app/forms/use-guarded-form.ts`. For a readonly owner, use `source.fields.owner.edit = { read: 'read-field' }`. For a write-only replacement, register only the write action and omit the previous value from the service projection. Pass `guarded.form` into `UiForm`. Match the confirmed `receipt`, `values`, and `isCurrent` to the exact read and target. |
| Tables and CRUD    | Pass a public schema, scoped collection read and `target(row)` to `useGuardedTable` from `app/tables/use-guarded-table.ts`. Declare column metadata and record field checks separately. Render `guarded.table` in `UiTable`. Use `createGuardedTableEditor` with guarded read, record requirements and acknowledged actions for modal, drawer, or a validated dedicated route. A creation flow requires an actual host-reserved business ID.                                 |
| Chart and timeline | Call `useGuardedChart({ access, view, options, series, source, time })` from `app/charts/use-guarded-chart.ts`. Use `UiG2Chart :access="chart.view"`. Bind `UiChartTimeRange` to the currently permitted `chart.timeline.value` and send its changes to `select`. Static options omit protected data. Compare, total, and chart export operations have their own admitted inputs and output requirements.                                                                    |
| Administration     | Add a selected module such as `'policies'` to the build and provide `host.administration?.policies` using `AdministrationModuleHost` from `app/administration/administration-host.ts`. The module provides a scoped read, record and field projection, and optional commands with a `grantable` predicate. Commands recheck record and effective revisions. An accepted draft and an effective policy are different host results.                                            |
| Sharing and review | Use `ResourceSharingDialog` with `SharingHost`, and `AccessRequestDialog` with `AccessRequestInteractionHost`. Each host supplies a separately authorized safe view and scoped commands. Real public sharing is read-only and requires an authoritative host audience and sanitized destination.                                                                                                                                                                             |

### Notify the affected owners

Use `AccessHost.subscribe` for identity and scope changes or provider-specific invalidation. Providers can also publish their own domain, record, and field events. Avoid treating opaque revisions as counters or timestamps.

```ts
const subscribe: AccessHost['subscribe'] = (notify) =>
  serviceChanges.onTaskTitleRevoked((id: string) => {
    void notify({
      kind: 'field',
      domain: 'projects',
      resource: 'task',
      recordId: id,
      fieldPath: 'title',
      action: 'write-field',
    })
  })
```

Invalidate the smallest affected domain, record or field and action. If the collection projection changes, also invalidate its collection owner. A read invalidation removes unreadable content and derived state immediately. A write invalidation blocks edits and drops affected unsaved drafts while keeping currently readable confirmed data. The host still owns transactions, exact nested patch semantics, authorization for any values written or returned, and consistent acknowledgement of effective revisions.

## Scenario catalog

All entries use the shared document-local synthetic host. Select the scenario on the overview. Scenario names and IDs correspond to Section 19.3 of the identity and access plan.

|  ID | Preset or control                                                                                    | Existing owner exercised                                                                                                                                             |
| --: | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Anonymous and controlled navigation. Confirm the example member to open the project.                 | Router, application navigation, workspace lifecycle.                                                                                                                 |
|   2 | Assigned task editing. Compare the first and second task editors.                                    | Predicates/CASL, guarded table and guarded form.                                                                                                                     |
|   3 | Hidden budget and readonly owner. Open the first task's field form.                                  | Exact field projection.                                                                                                                                              |
|   4 | Write-only replacement. Edit the replacement control and save.                                       | Guarded form and acknowledged field patch.                                                                                                                           |
|   5 | Presentation and command metadata. Save the first task.                                              | Presentation-hidden source field; revision and idempotency key on the command.                                                                                       |
|   6 | Roles across organizations. Switch organization in the project workspace.                            | Native scoped navigation roles and projected report reads.                                                                                                           |
|   7 | Mixed batch outcomes. Select the four tasks and compare both batch modes.                            | `executeGuardedAction`; denied, unresolved and business-blocked targets remain distinct.                                                                             |
|   8 | Revoke writing in the task form.                                                                     | Field write invalidation.                                                                                                                                            |
|   9 | Revoke reading after revoking writing.                                                               | Independent field read invalidation.                                                                                                                                 |
|  10 | Enter a draft and revoke title editing.                                                              | Confirmation receipt, input and draft ownership.                                                                                                                     |
|  11 | Start a read, then switch organization or reset.                                                     | Local delayed decisions and in-memory request transport; context-bound stale rejection.                                                                              |
|  12 | Save a task, or revoke one task title.                                                               | Record and field invalidation.                                                                                                                                       |
|  13 | Change the independent export restriction selector.                                                  | Guarded action, feature, entitlement, quota, and workflow. Completion consumes simulated quota.                                                                      |
|  14 | Inspect the access request as Fern, then select Robin in the overview.                               | `AccessRequestDialog`; requester and reviewer facts.                                                                                                                 |
|  15 | Select Robin, then advance the demo clock before approval.                                           | Temporary approval scope and virtual expiry; reopening the request rereads its status.                                                                               |
|  16 | Manage the report share with each audience in the dialog and use Read shared summary in diagnostics. | `ResourceSharingDialog`, readonly proposals and bounded named relationships.                                                                                         |
|  17 | Advance eleven minutes on the seeded share or revoke it via the dialog.                              | Relationship expiry and host revocation.                                                                                                                             |
|  18 | Select empty grants, empty data, incomplete facts or failed provider.                                | Diagnostics, exact collection read and normalized provider states.                                                                                                   |
|  19 | Compare complete, cyclic and incomplete snapshots.                                                   | Native role inheritance and a bounded project-to-report relationship graph.                                                                                          |
|  20 | Restore isolated tabs using the diagnostics button.                                                  | The public-session reader used by `initializeWorkspaceSession` with an in-memory synthetic snapshot. The Welcome entry restores and the controlled entry is skipped. |
|  21 | Open policy administration with a seeded saved policy. Confirm effectiveness.                        | `AdministrationPage` and distinct saved/effective revisions.                                                                                                         |
|  22 | Inject the next policy revision conflict or limit grantable scope in diagnostics.                    | Guarded administration commands and revision checks.                                                                                                                 |

The form and table preserve only the currently permitted projection. The report export action saves the authorized chart window and consumes local quota. Full organization export remains a host operation. Record-backed reports still need an authorized service aggregate for complete comparisons. Controlled repeating groups require stable business row identities and a collection model. Streaming, custom consumers that retain raw data, protected persistence and automatic restoration of protected tabs, drafts, or responses remain outside the supported integration. The showcase uses one memory-only host per document, with no cross-window signaling. Authentication, remote decision consistency, service-side authorization, transactions, and real policy propagation require each integrating host's own verification.
