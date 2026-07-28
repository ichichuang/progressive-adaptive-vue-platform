# Task Routing

Select exactly one mode from:

```text
architecture-review
plan
implement
review
runtime-acceptance
```

Apply these rules in order:

1. Select `implement` when the requested outcome requires any repository mutation. Include review and acceptance work performed around that mutation in the same mode.
2. Otherwise select `runtime-acceptance` when the requested outcome is browser-runtime acceptance or inspection.
3. Otherwise select `architecture-review` when the requested outcome is a read-only evaluation of architecture authority, phase admission, boundaries, or contract consistency.
4. Otherwise select `plan` when the requested outcome is a read-only execution plan for future work.
5. Otherwise select `review` for a read-only code, diff, risk, or implementation review.

If a review request also authorizes fixes, route it to `implement`. If repository evidence cannot determine a required canonical contract, stop with `CANONICAL_CONTRACT_MISSING`; do not invent another mode.

Each mode has one responsibility:

- `architecture-review`: report architecture and phase findings without changing files.
- `plan`: report an authority-grounded sequence without changing files.
- `implement`: make the smallest authorized change and perform its required verification.
- `review`: report evidence-backed findings without changing files.
- `runtime-acceptance`: execute only the owner-authorized runtime checks for the architecture-selected tier and report results without committing evidence.
