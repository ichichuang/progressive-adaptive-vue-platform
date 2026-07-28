# Execution Contract

Create one task-local contract in memory after reading the repository authorities. Never write, commit, or treat it as repository evidence.

## Required fields

- Repository baseline: normalized repository identity, current branch, local revision, upstream revision, and worktree state.
- Authority: completed authority reads, canonical evidence, active phase, and work-package or admission evidence.
- Scope: requested paths and behavior, allowed paths, forbidden paths, dirty overlaps, and preserved unrelated changes.
- Task mode: one value selected by `task-routing.md`.
- Execution: intended mutations or read-only inspections and their ordering.
- Verification: static command and requirement, runtime tier, owner acceptance requirement, and capability availability.
- Stop evaluation: applicable stop reason and evidence.
- Report routing: the fields required by `acceptance-report.md`.

## Stop evaluation

Evaluate these reasons in order and use only these values:

```text
ARCHITECTURE_CONFLICT
PHASE_DISALLOWED
CANONICAL_CONTRACT_MISSING
WORKTREE_SCOPE_CONFLICT
UNINTRODUCED_DEPENDENCY
PUBLIC_BOUNDARY_CONFLICT
AUTHORIZATION_REQUIRED
REQUIRED_CAPABILITY_UNAVAILABLE
```

- Use `ARCHITECTURE_CONFLICT` when the request or another instruction conflicts with the canonical authority.
- Use `PHASE_DISALLOWED` when the active phase does not admit the requested work.
- Use `CANONICAL_CONTRACT_MISSING` when required canonical direction is absent or indeterminate.
- Use `WORKTREE_SCOPE_CONFLICT` only when an existing dirty change overlaps the task scope.
- Use `UNINTRODUCED_DEPENDENCY` when the work requires a dependency that has not passed its canonical gate.
- Use `PUBLIC_BOUNDARY_CONFLICT` when the requested work would violate a canonical public boundary.
- Use `AUTHORIZATION_REQUIRED` when a required state-changing action exceeds current authorization.
- Use `REQUIRED_CAPABILITY_UNAVAILABLE` when an applicable required capability cannot be used.

On a stop, perform no blocked mutation, preserve unrelated work, set `STATUS=BLOCKED`, and route unexecuted required verification to `NOT_RUN` with the reason. When multiple stops are present, report the first in the order above and describe the other evidence in `RESULT_REASON`.

## Lifetime

Re-evaluate the contract after evidence changes, before each mutation boundary, and before reporting. Discard it when the task response is complete.
