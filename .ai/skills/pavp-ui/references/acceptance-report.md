# Acceptance Report

Emit the report only in the current task response. Do not commit it or any runtime evidence.

## Allowed values

```text
STATUS =
  COMPLETED | READ_ONLY_COMPLETE | BLOCKED | FAILED

STOP_REASON =
  ARCHITECTURE_CONFLICT | PHASE_DISALLOWED | CANONICAL_CONTRACT_MISSING |
  WORKTREE_SCOPE_CONFLICT | UNINTRODUCED_DEPENDENCY | PUBLIC_BOUNDARY_CONFLICT |
  AUTHORIZATION_REQUIRED | REQUIRED_CAPABILITY_UNAVAILABLE | NOT_APPLICABLE

STATIC_VERIFICATION =
  PASS | FAIL | NOT_RUN | NOT_APPLICABLE
```

`STOP_REASON` is required for `BLOCKED` and is `NOT_APPLICABLE` for every other status. Explain every `NOT_RUN` or `NOT_APPLICABLE` verification value in `RESULT_REASON`.

## Report structure

Report these fields:

```text
STATUS
STOP_REASON
REPOSITORY_BASELINE
ACTIVE_PHASE
CANONICAL_EVIDENCE
TASK_MODE
SCOPE
CHANGED_FILES
ARCHITECTURE_FINDINGS
LAYOUT_FINDINGS
COMPONENT_FINDINGS
MATERIAL_FINDINGS
MOTION_FINDINGS
ACCESSIBILITY_FINDINGS
PERFORMANCE_FINDINGS
STATIC_VERIFICATION
RESULT_REASON
DEFERRED_ITEMS
GIT_DIFF
FINAL_WORKTREE_STATE
```

Use `CHANGED_FILES=NONE` for a read-only task. Keep findings scoped to the task and use `NOT_APPLICABLE` where a lens does not apply.

## State transitions

- Finish `architecture-review`, `plan`, or `review` as `READ_ONLY_COMPLETE` when its required work succeeds.
- Finish `implement` as `COMPLETED` only when required static verification is `PASS`.
- Use `BLOCKED` when a canonical stop condition prevents execution. Supply its stop reason and evidence.
- Use `FAILED` when required static verification fails. Set `STATIC_VERIFICATION=FAIL` and include evidence.

For `READ_ONLY_COMPLETE`, `STATIC_VERIFICATION` must be `PASS`, `NOT_RUN`, or `NOT_APPLICABLE` with a result reason. Do not use a successful status to hide required static verification that failed.

Owner manual browser observation is optional, external, owner-operated, and non-gating. It is not a report field, status transition, verification result, or completion requirement. When the owner explicitly supplies an observation, Codex may analyze it only in read-only `review` mode and must not reproduce it or commit observation evidence.
