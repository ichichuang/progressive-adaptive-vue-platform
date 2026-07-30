# AI Work Entry

`ARCHITECTURE.md` is the sole canonical architecture authority for this repository.
Read it completely before planning or changing code.

This file is a route to that authority, not a second copy of it. If guidance here
appears incomplete, follow `ARCHITECTURE.md`. If a requested change conflicts with
it, stop and identify the conflict instead of creating an alternative convention.

## UI Work Route

For UI, appearance, component, material, motion, layout, or scroll tasks, read `.ai/skills/pavp-ui/SKILL.md` after `ARCHITECTURE.md`.

## Working Rules

- Keep changes within the active architecture phase.
- Preserve the production-only repository policy.
- Do not add tests, test infrastructure, demos, showcases, browser automation, or
  browser evidence artifacts.
- Keep imports explicit and public boundaries intact.
- Do not add packages or dependencies before their canonical introduction gate.
- Do not create additional AI rule systems or architecture authorities.
- Keep `main` as the sole maintenance branch.

## Verification

Run the complete static production gate:

```sh
pnpm verify
```

Codex must not open or operate browsers, Chrome DevTools, or browser testing.
Any such request is an `ARCHITECTURE_CONFLICT`. Owner manual browser observation
is optional, external, owner-operated, and non-gating; Codex may only review
explicitly supplied observations, and no observation evidence belongs in the
repository.
