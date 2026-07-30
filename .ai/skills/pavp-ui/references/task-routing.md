# Task Routing

Select exactly one mode from:

```text
architecture-review
plan
implement
review
```

Apply these rules in order:

1. Stop the affected request with `ARCHITECTURE_CONFLICT` when it requires Codex to open or operate a browser, Chrome DevTools, browser testing, or browser automation. Browser operation is never a Codex capability requirement. A separable authorized static request may continue in its applicable mode.
2. Select `implement` when the requested outcome requires any repository mutation. Include review work performed around that mutation in the same mode.
3. Otherwise select `architecture-review` when the requested outcome is a read-only evaluation of architecture authority, phase admission, boundaries, or contract consistency.
4. Otherwise select `plan` when the requested outcome is a read-only execution plan for future work.
5. Otherwise select `review` for a read-only code, diff, risk, implementation, or explicitly supplied owner-observation review.

If a review request also authorizes fixes, route it to `implement`. If repository evidence cannot determine a required canonical contract, stop with `CANONICAL_CONTRACT_MISSING`; do not invent another mode.

Codex browser, Chrome DevTools, and ChromeDev operation requests map to `ARCHITECTURE_CONFLICT`.

Each mode has one responsibility:

- `architecture-review`: report architecture and phase findings without changing files.
- `plan`: report an authority-grounded sequence without changing files.
- `implement`: make the smallest authorized change and perform its required verification.
- `review`: report evidence-backed findings without changing files.

Owner-operated external manual observation is optional, non-gating, and owner-provided results route to `review`. Codex must not reproduce the observation or treat it as repository evidence.
