# Acceptance Report

Emit the report only in the current task response. Do not commit it or any runtime evidence.

## Allowed values

```text
STATUS =
  COMPLETED | READ_ONLY_COMPLETE | PENDING_OWNER_ACCEPTANCE | BLOCKED | FAILED

STOP_REASON =
  ARCHITECTURE_CONFLICT | PHASE_DISALLOWED | CANONICAL_CONTRACT_MISSING |
  WORKTREE_SCOPE_CONFLICT | UNINTRODUCED_DEPENDENCY | PUBLIC_BOUNDARY_CONFLICT |
  AUTHORIZATION_REQUIRED | REQUIRED_CAPABILITY_UNAVAILABLE | NOT_APPLICABLE

STATIC_VERIFICATION =
  PASS | FAIL | NOT_RUN | NOT_APPLICABLE

OWNER_RUNTIME_ACCEPTANCE =
  PASS | FAIL | PENDING | NOT_RUN | NOT_APPLICABLE

RUNTIME_ACCEPTANCE_TIER =
  TIER_0 | TIER_1 | TIER_2 | TIER_3
```

`STOP_REASON` is required for `BLOCKED` and is `NOT_APPLICABLE` for every other status. Explain every `NOT_RUN`, `NOT_APPLICABLE`, or `PENDING` verification value in `RESULT_REASON`.

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
RUNTIME_ACCEPTANCE_TIER
OWNER_RUNTIME_ACCEPTANCE
RESULT_REASON
DEFERRED_ITEMS
GIT_DIFF
FINAL_WORKTREE_STATE
```

Use `CHANGED_FILES=NONE` for a read-only task. Keep findings scoped to the task and use `NOT_APPLICABLE` where a lens does not apply.

## State transitions

- Finish `architecture-review`, `plan`, `review`, or a non-mutating `runtime-acceptance` task as `READ_ONLY_COMPLETE` when its required work succeeds.
- Finish `implement` as `COMPLETED` only when required static verification is `PASS` and owner runtime acceptance is either `PASS` or validly `NOT_APPLICABLE` for the selected tier.
- Use `PENDING_OWNER_ACCEPTANCE` only when static verification is `PASS` and required owner runtime acceptance is explicitly deferred as `PENDING`.
- Use `BLOCKED` when a canonical stop condition prevents execution. Supply its stop reason and evidence.
- Use `FAILED` when static or owner runtime verification fails. Set the failing field to `FAIL` and include evidence.

For `READ_ONLY_COMPLETE`, each verification field must be `PASS`, `NOT_RUN`, or `NOT_APPLICABLE` with a result reason. Do not use a successful status to hide a required verification that failed.
