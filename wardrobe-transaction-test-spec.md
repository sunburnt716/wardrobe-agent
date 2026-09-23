# Wardrobe Agent — `withTransaction` Test Spec

Companion to `wardrobe-server-dev-spec.md` §2.2. Every assertion below traces to a numbered requirement there.

**Scope:** `withTransaction` only. No database, no DAL, no domain objects. This function is generic — it knows nothing about garments or outfits — so the entire suite runs against a fake with no fixtures.

**Explicitly out of scope:**

| Concern | Where it's verified |
|---|---|
| `createOutfit(pool, …)` must not compile | `tsc --noEmit` step, `@ts-expect-error` file |
| Invariants enforced against real rows | DAL suite, real Postgres, transaction-per-test |
| Nested transactions, savepoints | Out of scope for Phase 1 (§8) |

---

## 1. The three paths

`withTransaction` has exactly three ways to execute. Each is one scenario.

| Path | Trigger | Expected statements |
|---|---|---|
| A | `fn` returns normally | `BEGIN`, `COMMIT` |
| B | `fn` throws; `ROLLBACK` succeeds | `BEGIN`, `ROLLBACK` |
| C | `fn` throws; `ROLLBACK` also throws | `BEGIN`, `ROLLBACK` |

Two independent controls select the path:

- **`fn`** decides A vs. B — return or throw
- **the fake** decides B vs. C — let `ROLLBACK` succeed or make it throw

---

## 2. Callbacks

These are the `fn` values passed in. They are deliberately trivial — no DAL calls, no SQL. `withTransaction` only observes whether `fn` returns or throws.

```ts
// Path A
const ok = async () => SENTINEL_RESULT;

// Paths B and C
const boom = async () => { throw SENTINEL_ERROR; };
```

Both sentinels are module-level constants:

```ts
const SENTINEL_RESULT = { id: 'outfit-1' };
const SENTINEL_ERROR = new InvariantViolation('OUTFIT_INCOMPATIBLE_PAIR', {});
```

**Use identity assertions (`toBe`) against these sentinels, not shape matching.** Test 3 turns entirely on *which* error object escapes, and two errors with similar shapes would both satisfy a structural check.

---

## 3. Fake contract

The fake stands in for whatever `withTransaction`'s first parameter is. It must:

1. Satisfy that parameter's type — including `connect()`, if the parameter stays `Pool`
2. Return a client object exposing `query()` and `release()`
3. Record every statement passed to `query()`, **in order**, in an inspectable array
4. Record that `release()` was called, and how many times
5. Accept configuration to throw on a nominated statement (needed for path C)
6. Resolve `query()` with a benign result otherwise — `withTransaction` ignores the return value of `BEGIN`/`COMMIT`/`ROLLBACK`, so an empty rows result is sufficient

Requirement 5's mechanism is an implementation choice — a `failOn: 'ROLLBACK'` option and a per-statement callback both work. Pick one and keep it consistent.

**Open decision (blocks the fake):** §2.2 declares the parameter as `Pool`, but the function only calls `.connect()`. Narrowing it to a one-method interface shrinks the fake and removes the need to stub anything else on `Pool`. Decide before writing the fake — it changes requirement 1.

---

## 4. Tests

### Test 1 — commits on success

- **Arrange:** fake with no failure injection
- **Act:** `withTransaction(fake, ok)`
- **Assert:**
  - recorded statements are exactly `['BEGIN', 'COMMIT']` — full-sequence equality, not "contains"
  - `ROLLBACK` does not appear
  - the return value is `SENTINEL_RESULT` (identity)
  - `release()` called once
- **Guards:** §2.2 requirements 1, 3

The return-value assertion is easy to skip and worth keeping. A `withTransaction` that commits correctly but drops `fn`'s result is broken in a way the statement sequence can't reveal.

### Test 2 — rolls back and rethrows on failure

- **Arrange:** fake with no failure injection
- **Act:** `withTransaction(fake, boom)`
- **Assert:**
  - the escaping error is `SENTINEL_ERROR` (identity)
  - recorded statements are exactly `['BEGIN', 'ROLLBACK']`
  - `COMMIT` does not appear
  - `release()` called once
- **Guards:** §2.2 requirements 3, 4, 6

The `COMMIT`-absent assertion is the load-bearing one. A `COMMIT` that reached the database after a failed `fn` would persist exactly the partial state this function exists to prevent.

### Test 3 — original error survives a failing rollback

- **Arrange:** fake configured to throw on `ROLLBACK`
- **Act:** `withTransaction(fake, boom)`
- **Assert:**
  - the escaping error is `SENTINEL_ERROR` (identity) — **not** the rollback error
  - `err.code` is `OUTFIT_INCOMPATIBLE_PAIR`
  - `release()` called once
- **Guards:** §2.2 requirement 4

This is the test that would catch a real regression and the one most likely to be omitted. Without the inner try/catch, the rollback error replaces the domain error, and the invariant code that the whole error taxonomy exists to preserve is destroyed at the exact moment it's needed.

### Release assertions

Folded into tests 1–3 rather than isolated, because "released on every path" is only observable by exercising every path — a standalone test would duplicate all three setups. This mildly violates one-claim-per-test; the duplication is the worse trade.

---

## 5. Mutation checks

No test counts until it has been seen to fail for the right reason. Apply each mutation to `withTransaction`, run the suite, confirm the expected test goes red, then revert.

| Mutation | Must fail |
|---|---|
| Delete `await client.query('ROLLBACK')` | Test 2 |
| Move `client.release()` from `finally` into `try` | Tests 2 and 3 |
| Replace inner `catch { }` with a rethrow of the rollback error | Test 3 |
| Return `undefined` instead of `result` | Test 1 |
| Move `COMMIT` outside the `try` so it runs on both paths | Test 2 |

A mutation that leaves the suite green means the corresponding test cannot fail and is not protecting anything.

---

## 6. Acceptance checklist

- [ ] Suite runs with no database connection available
- [ ] Statement assertions compare full sequences, not membership
- [ ] Error assertions use identity against a sentinel, not message or shape
- [ ] Every mutation in §5 turns the named test red
- [ ] Reverting every mutation returns the suite to green
- [ ] Fake construction is under ~30 lines; if it is larger, the parameter type is too wide (§3 open decision)
