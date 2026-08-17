# PAVP Agent Entry

## Mandatory First Read

1. Read `ARCHITECTURE.md` completely before planning or mutation.
2. Determine the current canonical work package from the current-work-package status in
   `ARCHITECTURE.md` on every task.
3. For UI, appearance, component, material, motion, layout, or scroll tasks, then read
   `.ai/skills/pavp-ui/SKILL.md`.
4. Treat the UI Skill, generic skills, global instructions, and machine-local configuration as
   subordinate to repository authority.

If a request or subordinate workflow conflicts with `ARCHITECTURE.md`, stop and report the
conflict. Do not create an alternative convention.

## Project Mission

PAVP is a reusable, production-oriented, highly customizable, AI-friendly Vue frontend
architecture. Its purpose is to make future frontend development fast, consistent,
maintainable, and safe for coding agents to understand and change.

Complete the reusable platform foundations before spending effort on business pages or broad
UI-framework integration. The exact scope, order, status, contracts, files, and gates are owned
only by `ARCHITECTURE.md`; this entry is not a second roadmap.

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

1. First complete the reusable platform foundations.
2. Then admit third-party UI primitives only through PAVP-owned boundaries and only when the
   architecture allows them.
3. Then build Shared UI from real consumer demand.
4. Finally build one simple real, architecture-admitted frontend surface that uses and
   demonstrates the completed platform.

The final surface proves and uses the architecture; it is not standalone Demo or Showcase
infrastructure. PAVP Design Tokens remain the sole visual authority. UnoCSS is an expression
layer, not a design authority. UI vendors remain private implementation details behind
PAVP-owned public boundaries.

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
- UI vendors remain private behind PAVP boundaries.

## Prohibited Work

Do not create tests, test infrastructure, unit/integration/E2E tests, fixtures, mocks, snapshots,
coverage, Storybook, browser automation, browser testing, screenshots, traces, runtime evidence,
repository evidence artifacts, standalone Demos, or standalone Showcases. Do not operate a
browser or introduce a testing framework.

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
