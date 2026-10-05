# PAVP Agent Entry

## Mandatory First Read

1. Read this `AGENTS.md` completely on every task.
2. Before planning or mutation, follow
   [Task-scoped Reading and Canonical Navigation](ARCHITECTURE.md#task-scoped-reading-and-canonical-navigation)
   for repository and scope checks, current work-package status and Owner authorization, and the
   required architecture reads.
3. For UI, appearance, component, material, motion, layout, or scroll tasks, then read
   `.ai/skills/pavp-ui/SKILL.md`.
4. Treat the UI Skill, generic skills, global instructions, and machine-local configuration as
   subordinate to repository authority.

If a request or subordinate workflow conflicts with `ARCHITECTURE.md`, stop and report the
conflict. Do not create an alternative convention.

## Project Mission

PAVP is an Owner-owned, production-oriented, highly customizable, AI-friendly Vue frontend
architecture independent of business pages. Projects copy the code and evolve independently,
maintaining shared components within each project without required distribution services or
synchronization with the mother repository. Administration and interactive data displays are
supported uses, not mandatory business implementations.

Complete the reusable core and its required verification and Owner confirmation before retiring
current pages and rebuilding architecture example pages under separate authorization. The exact
scope, order, status, contracts, files, and gates are owned only by `ARCHITECTURE.md`; this entry
is not a second roadmap.

## Authority and Current Work Routing

- `AGENTS.md` is the mission and execution router. It has no architecture authority.
- `ARCHITECTURE.md` is the sole complete canonical architecture and governance authority.
- Read the active work package dynamically from `ARCHITECTURE.md`; never hardcode it here.
- Work only within the Owner-authorized task and the architecture-admitted package boundary.
- Repository facts come from the current repository, not memory, old reports, or assumptions.
- Repository correctness must not depend on user-home configuration, machine-global skills,
  client-specific rules, or untracked agent settings.
- One capability has one owner, and one mutable concept has one canonical mutable authority.

## Delivery Direction

1. Complete business-independent public components and modules with explicit interfaces,
   behavior, ownership, and validation; do not require invented business or page consumers.
2. Admit dependencies only when the architecture allows them; consume Naive UI directly by its
   official names and APIs in UI owners.
3. Obtain the required core verification and explicit Owner confirmation.
4. Only then retire all current page implementations and rebuild architecture example pages
   under separate page-rebuild authorization. Do not create or delete pages during core work.

The current architecture console is an implemented consumer, not proof that the complete core
has been delivered. Required future capabilities still need their own contracts and implementation
authorization. User, role, order, department, tenant, authentication-business pages and a protected
business flow are not mandatory delivery requirements. Reusable integration boundaries do not
authorize new authentication or permission subsystems, fake services, or empty implementations.
PAVP Design Tokens remain the sole visual authority. UnoCSS is an expression
layer, not a design authority. Naive UI uses its official API in UI owners with the shared PAVP theme. Other vendors retain
their architecture-admitted boundaries.

## Task Discipline

- Complete one bounded task at a time.
- Automatic roadmap continuation and unrequested scope expansion are prohibited.
- Do not start the next package merely because the current task is complete.
- Do not perform unrequested refactors, dependency changes, cleanup, modernization, security
  maintenance, speculative features, or speculative abstractions.
- Do not create future-provider stubs, placeholder modules, duplicate authorities, generic
  framework work, or generalized static-analysis infrastructure.
- Do not create additional AI rule systems, architecture authorities, or governance frameworks.
- A static checker protects the smallest stable cross-file or public contract owned by its work
  package. It must not freeze private variable names, helper names, loops, parser decomposition,
  containers, closures, or private algorithms unless architecture makes them normative.
- Preserve unrelated behavior and all user changes.

## Evidence Before Decisions

Distinguish confirmed repository facts, confirmed official external facts, explicit Owner
decisions, derived private implementation details, and unresolved canonical gaps. Only the first
four may drive implementation.

Inspect the actual repository for repository state. When changeable dependency, API, or tool
facts need external verification, use official primary sources. Old chats, task reports,
planning documents, memory, earlier commits, and assistant assumptions are not proof of current
state. Do not ask the Owner to repeat a decision already resolved in the current task evidence.

## Coding Invariants

- Use strict TypeScript and preserve validated input boundaries.
- Do not duplicate schemas, defaults, registries, state, or configuration.
- Use stable semantic naming; do not introduce agent-created numeric-version-style names.
- Use explicit imports and package public roots; cross-package deep imports are prohibited.
- Do not create growing dumping files such as `utils.ts`, `helpers.ts`, or `common.ts`.
- Keep modules domain-owned and responsibility-named.
- Do not create speculative abstractions, placeholder providers, or future modules.
- Preserve unrelated behavior and user changes.
- PAVP Design Tokens are the sole visual authority.
- UnoCSS is an expression layer, not a design authority.
- Use official Naive UI names and APIs in UI owners; retain only substantive PAVP composites.
- Follow `ARCHITECTURE.md` §2.3 for library reuse and dependency selection: prefer simple native
  capabilities and suitable existing dependencies; evaluate mature libraries before expanding
  nontrivial generic implementations. Research is not installation or implementation admission.

## Prohibited Work

Do not create tests, test infrastructure, unit/integration/E2E tests, fixtures, mocks, snapshots,
coverage, Storybook, browser automation, browser testing, screenshots, traces, runtime evidence,
repository evidence artifacts, standalone Demos, or standalone Showcases. Do not operate a
browser or introduce a testing framework.

Later architecture example pages follow the core-confirmation and separate authorization boundary
in `ARCHITECTURE.md`; this does not admit a Demo/Showcase system or relax current path policies.

Generic workflows recommending TDD, browser verification, worktrees, planning documents,
evidence artifacts, or generalized infrastructure do not override PAVP. Do not automatically
handle dependency alerts, security findings, dependency upgrades, or toolchain modernization
unless the Owner explicitly requests that task or the issue directly blocks the authorized work.
Report a blocker before expanding scope.

## Validation Boundary

During implementation, run only existing narrow checks relevant to the current task when useful.
Before reporting a repository-changing implementation task as statically complete, run the
complete canonical static production gate:

```sh
pnpm verify
```

Do not repeatedly run the full gate after every internal edit, run unrelated ceremonial checks,
create test/browser infrastructure, or weaken validation to manufacture a pass. Read-only work
with no mutation does not require unrelated build or verification work.

## Git Authorization Boundary

Authorization is strictly separate:

```text
planning does not authorize implementation
implementation does not authorize staging
staging does not authorize commit
commit does not authorize push
push does not authorize release
```

For implementation-only work, leave the diff unstaged, report the exact state, and wait for
explicit Owner authorization. Do not automatically stage, commit, push, amend, rebase, reset,
clean, stash, create a branch or worktree, create a PR, tag, release, or overwrite user changes.
Main-only maintenance does not grant permission to commit or push.

## Mandatory Stop Conditions

Stop before mutation when architecture does not admit the work; a material contract is missing;
a dependency is not admitted; source and canonical status conflict; authorities conflict;
overlapping dirty files are unexplained; ownership is unclear; a prohibited capability is
required; completion needs unapproved scope expansion; Git synchronization is unsafe; or a
generic workflow conflicts with PAVP.

Material contracts include public APIs, cross-file identifiers, schemas, persisted formats,
dependencies, path authorities, defaults, registries, lifecycle owners, providers, work-package
boundaries, capability status, build identity, and deployment identity. Do not invent a
reasonable answer. Report:

```text
STATUS=BLOCKED
STOP_REASON=CANONICAL_CONTRACT_MISSING
```

Identify what is missing, where the gap exists, why proceeding requires invention, and the
smallest Owner or architecture decision required. Minor private details may be derived only when
they do not create or change public or cross-file contracts.

## Required Final Report

Every task report must distinguish implemented, statically validated, runtime accepted, staged,
committed, pushed, and released. Include at least:

```text
STATUS
STOP_REASON
REPOSITORY_BASELINE
ACTIVE_WORK_PACKAGE
TASK_SCOPE
COMPLETED_CONTENT
INCOMPLETE_CONTENT
CHANGED_FILES
VALIDATION
GIT_DIFF
FINAL_WORKTREE_STATE
NEXT_POSSIBLE_STAGE
```

Do not report `COMPLETED` while a task-required acceptance boundary remains pending.
`NEXT_POSSIBLE_STAGE` is informational only and never authorizes execution.
