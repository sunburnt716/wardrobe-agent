# eval/

Agent-trajectory evals. Distinct from the unit suites in `api/`, `db/`,
`tools/`, `agent/`:

- **Unit tests** pin one function against its spec.
- **Evals** run a whole `runAgentLoop` trajectory — model turns scripted,
  every tool and the database real — and assert on the **end state**: what
  was persisted, what report was filed, how the loop terminated.

Evals derive from the **design spec** (`.claude/CLAUDE.md`'s Fitcheck
section), not from the implementation. Each `test()` names the spec
behaviour it pins and lists the code mutations that should turn it red.

## Running

```
npm run eval
```

Requires `DATABASE_URL_TEST` (same disposable database the DAL suite uses).
`preeval` resets the schema from `db/schema.sql`, exactly like `pretest:dal`.

Not part of `npm test` yet — evals are slower (full trajectories) and are
run deliberately. Fold into CI once the set is larger.

## Files

| File | Pins |
| --- | --- |
| `harness.ts` | shared: scripted model client, in-memory report sink, fixed palette provider, a 3-garment world, scripted-response builders |
| `presentation.eval.ts` | `propose_outfit`'s required look card — persistence, one-retry, discard+report |

## Adding an eval

1. Build the trajectory from `harness.ts`'s `call*` helpers.
2. Assert on `w.outfitsForUser()`, `w.piecesForOutfit()`, `w.reports`, and
   the `LoopResult`.
3. Always `await w.cleanup()` in a `finally` — evals share one database and
   do not roll back (the loop opens its own transactions).
4. List the mutations that should break it.
