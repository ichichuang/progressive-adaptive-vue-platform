---
name: pavp-ui
description: Route and execute Progressive Adaptive Vue Platform UI work under the repository's canonical architecture. Use for UI, appearance, component, material, motion, layout, scroll, architecture review, planning, implementation, review, or runtime-acceptance tasks in this repository.
---

# PAVP UI Workflow

Act as a client-neutral, subordinate execution workflow. Treat `ARCHITECTURE.md` as the only architecture authority. Stop on conflict instead of extending, summarizing, or replacing its contracts.

## Required load order

1. Read `AGENTS.md`.
2. Read `ARCHITECTURE.md` completely.
3. Read `project.config.ts`.
4. Read [task-routing.md](references/task-routing.md) and select one task mode.
5. Read [execution-contract.md](references/execution-contract.md) and hold the task contract in memory.
6. Read [specialist-lens-policy.md](references/specialist-lens-policy.md) only when optional external research is justified.
7. Read [acceptance-report.md](references/acceptance-report.md) before reporting.

## Workflow

1. Verify the repository identity, normalized remote, current branch, local and upstream revisions, active phase, and worktree state from repository evidence.
2. Resolve requested, allowed, forbidden, and dirty-overlap scope. Preserve unrelated user changes.
3. Select exactly one supported task mode through the deterministic routing reference.
4. Build the in-memory execution contract, including the verification tier and capability requirements.
5. Evaluate every canonical stop condition before mutation and whenever new evidence changes scope.
6. Perform only work authorized by the current phase and task. Keep public boundaries and repository authority intact.
7. Run the applicable static gate. Route runtime acceptance by the architecture-defined tier without committing runtime evidence.
8. Review the final diff and worktree, then emit the canonical acceptance report in the current task response.

Do not create a repository copy of the execution contract or acceptance evidence. Do not depend on native skill discovery, a particular client, or machine-local authority.
