# Wardrobe Agent — Server & Transaction Dev Spec

Companion to `wardrobe-graphql-dev-spec.md` and `wardrobe-resolver-dev-spec.md`.

Covers: process composition, connection lifecycle, transaction boundary ownership, and the invariant error taxonomy. Does **not** cover schema, resolver field logic, or generation strategy — those are specified elsewhere.

---

## 0. Assumptions this spec encodes

Two decisions were settled before writing this. They are stated here so a future reader can see what would have to change if either is revisited.

1. **Transaction ownership is caller-side.** DAL functions never check out their own connections. A single `withTransaction` helper owns `BEGIN`/`COMMIT`/`ROLLBACK` and connection release.
2. **The caller-discipline risk is closed at the type level, not at runtime.** Multi-write DAL functions accept a branded `TxClient`, which `Pool` cannot structurally satisfy. Passing a pool where a transaction is required is a compile error, not a production incident.

The risk being mitigated: `pool.query()` returns its connection after each statement, so a multi-write function handed a `Pool` runs each statement on a different connection in autocommit. A partial failure leaves committed rows behind. In this schema a half-written outfit has `worn_on = NULL` and is therefore indistinguishable from a legitimate agent proposal — it will be served to the user and consumed by downstream reads. Nothing throws.

---

## 1. Module layout

| Module | Owns | Must not contain |
|---|---|---|
| `composition.ts` | Config load/validate, pool construction, DAL assembly, `withTransaction` binding | HTTP, GraphQL, domain logic |
| `server.ts` | Yoga instance, context factory, error mask, HTTP listener, lifecycle signals | Domain logic, invariant checks |
| `agent/runtime.ts` | Agent loop, action vocabulary dispatch | Its own pool or config loading |
| `db/transaction.ts` | `Queryable`, `TxClient`, `withTransaction` | Any domain-specific query |
| `db/errors.ts` | `InvariantViolation`, `InvariantCode` | Throw sites (those live in the DAL) |

**Rule:** `composition.ts` is imported by both entry points and imports neither. Exactly one `Pool` per process, constructed there.

**Rationale:** the agent bypasses GraphQL. If pool and DAL construction lived in `server.ts`, the agent would either duplicate it or import a module with an HTTP listener as a side effect.

---

## 2. Connection and transaction contract

### 2.1 Types

```ts
declare const txBrand: unique symbol;

export interface Queryable {
  query(text: string, params?: unknown[]): Promise<QueryResult>;
}

export interface TxClient extends Queryable {
  readonly [txBrand]: true;
}
```

- `declare const` emits no JavaScript. Runtime cost is zero.
- `unique symbol` means no object can satisfy the brand accidentally.
- `TxClient extends Queryable` makes assignability one-directional: a `TxClient` may be passed to any function accepting `Queryable`; a `Pool` may never be passed where `TxClient` is required. Reads inside a transaction work without a second signature.

### 2.2 `withTransaction` requirements

Signature: `withTransaction<T>(pool: Pool, fn: (tx: TxClient) => Promise<T>): Promise<T>`

Must satisfy all of:

1. Checks out exactly one client and issues `BEGIN` before invoking `fn`.
2. Performs the **single** brand assertion in the codebase, immediately after `BEGIN` succeeds. The cast is a claim the type system cannot verify — this function is the only caller that has earned it by having just opened the transaction.
3. Issues `COMMIT` only on normal return of `fn`.
4. Issues `ROLLBACK` in the error path, wrapped in its own try/catch that swallows the rollback failure. A throwing `ROLLBACK` must never replace the original error — that error carries the invariant code.
5. Releases the client in `finally`, on every path.
6. Rethrows the original error unmodified. No wrapping, no logging, no translation.

The brand cast appears **once**. A second occurrence anywhere in the repo is a review failure — it is the escape hatch that makes the whole mechanism meaningful.

### 2.3 Known gaps

The brand does not prevent nested `withTransaction` calls (a savepoint concern), nor use of a captured `tx` after `COMMIT`. Both are out of scope for Phase 1 and should be noted rather than defended against.

---

## 3. DAL signature convention

| Operation shape | Parameter type |
|---|---|
| Single-statement read | `db: Queryable` |
| Single-statement write | `db: Queryable` |
| Multi-statement write | `tx: TxClient` |

Examples:

```ts
findGarmentsByUser(db: Queryable, userId: string): Promise<Garment[]>
markOutfitWorn(db: Queryable, outfitId: string, wornOn: Date): Promise<Outfit>
createOutfit(tx: TxClient, input: CreateOutfitInput): Promise<Outfit>
```

Unchanged conventions from prior specs: mutations use `RETURNING *`; invariants are enforced here and nowhere else.

**Acceptance:** `createOutfit(ctx.pool, input)` must fail `tsc`. This is the single most important check in this document — if it compiles, the mechanism is not installed correctly.

---

## 4. Invariant error taxonomy

### 4.1 Shape

```ts
export type InvariantCode = /* string literal union — see §7 */;

export class InvariantViolation extends Error {
  constructor(
    readonly code: InvariantCode,
    readonly detail: Record<string, unknown>,
  ) { super(code); }
}
```

Requirements:

- `code` is the stable contract. Message text is human-facing only and may change freely without breaking any consumer.
- `detail` carries the operands needed to understand the failure (e.g. the two garment ids and the tier that produced the exclusion). Never contains raw SQL.
- Thrown **only** from the DAL. Resolvers throw shape errors; they do not throw invariant errors.

### 4.2 Consumers

1. **Tier 1 evals** assert on `err.code`. They must never assert on message text — a reworded message would silently stop testing anything.
2. **GraphQL boundary** maps `InvariantViolation` to a `GraphQLError` with `extensions.code`. Yoga's `maskedErrors` flattens unrecognised throws to a generic message in production, so an unmapped invariant is invisible to the client.
3. **Logs** emit `code`, `detail`, and the correlation id.

---

## 5. Context factory (`server.ts`)

Constructed per request. Contains exactly:

- Resolved actor (user client vs. agent) — drives the permission model
- DataLoaders
- `correlationId`
- A bound `withTransaction`

**DataLoaders are per-request, never module-scoped.** A loader living past the request caches a garment across a `createGarment` mutation and serves stale rows to every subsequent caller.

The agent runtime mints its own `correlationId` per agent turn using the same field name, so both write paths are traceable through one log query.

---

## 6. Lifecycle

- **Boot:** validate config, then issue one trivial query against the pool. Fail fast and exit non-zero rather than starting a listener that returns 500s.
- **Shutdown:** on `SIGTERM`/`SIGINT`, stop accepting connections, allow in-flight requests to drain, then `pool.end()`.

---

## 7. Open decisions

**Where does `InvariantCode` live?** As written above it is a TypeScript union — good for exhaustiveness checking and IDE support. But the eval harness registry is meant to define checks as *data*, so new tenants can add checks without a code change. That points toward codes living in config and being validated at boot rather than at compile time.

These are two lists that must agree. Options: generate the union from the config at build time; treat the union as canonical and validate the config against it at boot; or accept drift and add a startup reconciliation check. **Not resolved.** Decide before writing the second invariant, not the tenth.

---

## 8. Out of scope for Phase 1

- Savepoints / nested transactions
- Retry on serialization failure
- Read replicas or a second pool
- Runtime brand validation (the compile-time check is the mechanism; a runtime guard would be checking for a mistake that cannot occur)

---

## 9. Acceptance checklist

- [ ] `createOutfit(pool, …)` does not compile
- [ ] `withTransaction` contains the only brand cast in the repo
- [ ] A DAL throw inside `withTransaction` leaves zero rows committed
- [ ] A forced `ROLLBACK` failure still surfaces the original `InvariantViolation`
- [ ] Client is released on success, on domain error, and on rollback error
- [ ] `InvariantViolation.code` survives the GraphQL boundary into `extensions.code`
- [ ] Tier 1 eval asserts on `code`, not message text
- [ ] Loaders do not cache across requests
- [ ] Boot fails fast on an unreachable database
- [ ] One pool per process, reachable from both entry points
