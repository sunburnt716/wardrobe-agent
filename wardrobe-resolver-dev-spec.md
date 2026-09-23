# Wardrobe Agent — Resolver Layer Dev Spec

**Status:** draft for review
**Scope:** the `resolvers/` folder and the request `context`. No SQL, no solver logic, no agent loop.
**Depends on:** `schema.sql`, `schema.graphql`, and the DAL function names in the GraphQL dev spec — those names are binding and are reused verbatim here.

---

## 1. The one rule

**No SQL in this folder.** Every resolver reads from `context`, calls a DAL function, and returns.

The reason is not style. The agent calls DAL functions directly and never passes through a resolver, so any check, filter, or scoping rule placed here is invisible to the actor most likely to misbehave.

**Acceptance test for the whole layer:** delete `resolvers/` and the agent still works. If it doesn't, logic leaked upward.

A resolver longer than ~5 lines is a signal that something belongs one layer down.

---

## 2. Context

Built once per request, before execution. Shared by every resolver in that request. The client cannot set any of it — that is what makes it safe to hold identity.

```ts
export type RequestContext = {
  userId: number;
  actor: 'user' | 'agent';
  loaders: Loaders;
};
```

### 2.1 `userId`

Phase 1: stubbed. Read from an `x-user-id` header, or hardcode `1`.

Real auth is deferred deliberately — it is not on the critical path and the shape of the context does not change when it arrives. What matters now is that `userId` is **only ever** read from context, never from a client argument. No resolver takes a `userId` parameter. There is nothing to spoof.

### 2.2 `actor`

`'user'` for GraphQL requests, `'agent'` for in-process tool calls.

Enforcement lives in the DAL, not here (§6). This field exists so the DAL has something to check.

### 2.3 `loaders` — **must be constructed per request**

```ts
export function buildLoaders(userId: number): Loaders {
  return {
    garmentType: new DataLoader(...),
    tags: new DataLoader(...),
    edgesTouching: new DataLoader(...),
    outfitGarments: new DataLoader(...),
  };
}
```

DataLoader caches results by key for its lifetime. A loader constructed at module scope would outlive the request and serve user B a cached value belonging to user A — a cross-tenant leak with **no query to trace**, because no query is made.

`userId` is captured in the closure at construction time. `.load()` takes only the key. Tenant scoping therefore cannot be varied per call.

---

## 3. Mapping: the DAL returns domain objects, not rows

**Decision, stated explicitly so it is not made by accident in the first file written.**

DAL functions return mapped domain objects (camelCase, derived fields computed). Resolvers never see a raw `pg` row.

The failure this prevents: GraphQL's default resolver does `parent[fieldName]`. A raw row has `primary_color`; the schema asks for `primaryColor`; the lookup returns `undefined`; a nullable field renders as `null`. **No error, no warning** — the API silently reports that every garment has no color.

Consequence: `isClean` and `ageDays` are computed in the mapper, not in a resolver. `getGarmentsByUser` and friends must join `garment_types` so `default_wears_before_wash` is available for the clean-state computation. That join is already required by `getCandidateGarments` for the clean-state hard filter, so it costs nothing extra — and computing `isClean` in one place means the API and the hard filter can never disagree.

---

## 4. Query resolvers

All are two-to-three lines. Root fields ignore `parent`.

```ts
export const Query = {
  me: (_p, _a, ctx) => getUserById(ctx.userId),

  garment: (_p, { id }, ctx) => getGarmentById(ctx.userId, Number(id)),

  garments: (_p, { filters }, ctx) => getGarmentsByUser(ctx.userId, filters),

  candidateGarments: (_p, { context }, ctx) =>
    getCandidateGarments(ctx.userId, context),

  outfit: (_p, { id }, ctx) => getOutfitById(ctx.userId, Number(id)),

  outfits: (_p, { filters }, ctx) => getOutfitsByUser(ctx.userId, filters),

  compatibility: (_p, { garmentIds }, ctx) =>
    getCompatibilityEdges(ctx.userId, garmentIds.map(Number)),
};
```

**`ID` is a string in GraphQL, `SERIAL` is an integer in Postgres.** Coerce at this boundary with `Number(id)`. Doing it in the DAL means the DAL's signature lies about its input type; doing it nowhere means `WHERE garment_id = '47'` — which Postgres will actually accept via implicit cast, so this fails silently rather than loudly.

**Ownership is not checked here.** `getGarmentById(ctx.userId, id)` scopes inside the query. A garment belonging to someone else returns `null`, indistinguishable from one that does not exist. That indistinguishability is intentional — telling a stranger "that garment exists, just not yours" leaks the existence of other users' data.

---

## 5. Field resolvers

Only four fields need one. Everything else — `id`, `primaryColor`, `warmthRating`, `wornOn`, `status` — falls through to the default resolver because the mapper already put it on the parent object as a matching property.

**Every field resolver on a type goes through a loader.** The executor calls these once per parent object; a direct DAL call here rebuilds N+1.

```ts
export const Garment = {
  type: (g, _a, ctx) => ctx.loaders.garmentType.load(g.garmentTypeId),
  tags: (g, _a, ctx) => ctx.loaders.tags.load(g.id),
  incompatibleWith: (g, _a, ctx) => ctx.loaders.edgesTouching.load(g.id),
};

export const Outfit = {
  garments: (o, _a, ctx) => ctx.loaders.outfitGarments.load(o.id),
};
```

Note `garmentTypeId` is on the domain object but is **not** a GraphQL field. Foreign keys are internal plumbing; the schema exposes the object they point at. Same reason `userId` never appears in the schema.

### 5.1 Two different compatibility queries — do not conflate

This is the gap most likely to be missed. `Query.compatibility` and `Garment.incompatibleWith` need **different SQL**:

| Caller | Question | Predicate |
|---|---|---|
| `Query.compatibility(garmentIds)` | edges *among* this candidate set | **both** endpoints in the set |
| `Garment.incompatibleWith` | edges *touching* this garment | **either** endpoint matches |

One function cannot serve both. Add a second to the DAL:

```ts
getCompatibilityEdges(userId, garmentIds)      // both endpoints in set — agent context
getEdgesTouchingGarments(userId, garmentIds)   // either endpoint — Garment.incompatibleWith
```

Both must handle the `garment_a_id < garment_b_id` normalization on read: an edge for garment 47 may store it as either `a` or `b`, so the query checks both columns and the "other" garment differs per row.

Both must also join `garments` twice for ownership, since `garment_compatibility` carries no `user_id`:

```sql
JOIN garments ga ON ga.garment_id = gc.garment_a_id AND ga.user_id = $1
JOIN garments gb ON gb.garment_id = gc.garment_b_id AND gb.user_id = $1
```

Omitting either join leaks cross-tenant edges.

---

## 6. Loaders

Each wraps a batched DAL function. The batch function has one strict contract:

> **Return an array the same length as the keys, in the same order.**

DataLoader matches `results[i]` to `keys[i]` positionally. SQL violates this twice over — `WHERE id = ANY($1)` returns planner-ordered rows, and objects with no children produce no rows at all. Map over **keys**, never over rows.

```ts
tags: new DataLoader<number, string[]>(async (garmentIds) => {
  const rows = await getTagsForGarments(userId, [...garmentIds]);

  const byGarment = new Map<number, string[]>();
  for (const row of rows) {
    if (!byGarment.has(row.garmentId)) byGarment.set(row.garmentId, []);
    byGarment.get(row.garmentId)!.push(row.tag);
  }

  return garmentIds.map(id => byGarment.get(id) ?? []);
}),
```

The final `.map` over `garmentIds` guarantees length, order, and `[]` for gaps. Getting this wrong gives every garment someone else's tags, silently.

| Loader | Key | DAL function | Returns |
|---|---|---|---|
| `garmentType` | `garmentTypeId` | `getGarmentTypeById` (batched) | `GarmentType` |
| `tags` | `garmentId` | `getTagsForGarments` | `string[]` |
| `edgesTouching` | `garmentId` | `getEdgesTouchingGarments` | `CompatibilityEdge[]` |
| `outfitGarments` | `outfitId` | `getGarmentsForOutfits` | `Garment[]` |

**`garmentType` is a candidate for skipping the loader entirely.** It is small, fixed, seeded reference data with no `user_id` — loading all rows once at startup into a `Map` means zero queries per request. Whether that is premature at this scale is a fair question; flagged, not decided.

---

## 7. Mutation resolvers

Same thinness. The resolver does not validate, does not check ownership, does not decide legality — all of that is DAL-side, because the agent bypasses this layer.

```ts
export const Mutation = {
  createGarment: (_p, { input }, ctx) =>
    createGarment(ctx.userId, input),

  updateGarment: (_p, { id, input }, ctx) =>
    updateGarment(ctx.userId, Number(id), input),

  retireGarment: (_p, { id }, ctx) =>
    retireGarment(ctx.userId, Number(id)),

  washGarment: (_p, { id }, ctx) =>
    washGarment(ctx.userId, Number(id)),

  acceptOutfit: (_p, { id }, ctx) =>
    setOutfitStatus(ctx.userId, Number(id), 'accepted'),

  rejectOutfit: (_p, { id, reason }, ctx) =>
    setOutfitStatus(ctx.userId, Number(id), 'rejected', reason),

  markOutfitWorn: (_p, { id, wornOn }, ctx) =>
    markOutfitWorn(ctx.userId, Number(id), wornOn),

  logManualOutfit: (_p, { input }, ctx) =>
    logManualOutfit(ctx.userId, input),

  setCompatibilityEdge: (_p, { input }, ctx) =>
    upsertCompatibilityEdge(ctx.userId, input, 'manual', 'user'),

  deleteCompatibilityEdge: (_p, { garmentAId, garmentBId }, ctx) =>
    deleteCompatibilityEdge(ctx.userId, Number(garmentAId), Number(garmentBId)),
};
```

### 7.1 `source` is hardcoded, never a client argument

`setCompatibilityEdge` passes `'manual'` and `'user'` as literals. The agent tool wrapper passes `'learned'` and `'agent'`. There is no path by which a client can choose.

`SetCompatibilityEdgeInput` has no `source` field — confirm this in the SDL. Per the precedence order, an agent able to write `manual` could overwrite hand-entered rules.

### 7.2 Pair normalization happens in the DAL

The table enforces `CHECK (garment_a_id < garment_b_id)`. The swap happens once, inside `upsertCompatibilityEdge`, and nowhere else. A resolver that normalizes is a resolver the agent does not call.

### 7.3 Transactional mutations

`createGarment` (garment + tags) and `markOutfitWorn` (status + `wears_since_wash` increment per garment) are multi-statement and must be atomic. They use `withTransaction`, **inside the DAL**. The resolver signature does not change and the resolver does not know.

Getting this wrong is silent: loose `pool.query('BEGIN')` calls may land on different backend processes, so the transaction simply does not exist. No error is raised.

---

## 8. Enum maps

Top-level keys in the resolver map, alongside `Query` and `Mutation` — **not** nested inside them.

```ts
export const enumResolvers = {
  GarmentLayer: {
    BASE: 'base', MID: 'mid', OUTER: 'outer',
    BOTTOM: 'bottom', FOOTWEAR: 'footwear', ACCESSORY: 'accessory',
  },
  OutfitStatus: {
    PROPOSED: 'proposed', ACCEPTED: 'accepted',
    REJECTED: 'rejected', WORN: 'worn',
  },
  OutfitOrigin: { AGENT: 'agent', MANUAL: 'manual' },
  CompatibilityPolarity: { PAIRS_WELL: 'pairs_well', NEVER_PAIR: 'never_pair' },
  CompatibilitySource: { LEARNED: 'learned', MANUAL: 'manual' },
  Actor: { USER: 'user', AGENT: 'agent' },
};
```

**Ship in the same commit as the SDL.** Without the map, a resolver receives the string `"FOOTWEAR"`, passes it to SQL, matches zero rows, and returns `[]`. Not an error — an empty result, which looks like "you own no footwear."

`NEVER_PAIR` → `never_pair` is why a blanket `.toLowerCase()` is not sufficient.

---

## 9. Errors

Two kinds, handled differently.

**Expected business outcomes** → `ActionResult` with `success: false` and a `code`. Not found, not yours, illegal status transition, constraint violation. The client can act on these.

**Unexpected failures** → throw. Connection lost, malformed SQL, bug. GraphQL catches these and puts them in the `errors` array.

The distinction: if a well-behaved client could reasonably trigger it, it is a result. If only a broken system triggers it, it is an error.

Do not leak Postgres error text into `message` — it exposes table and column names. Map constraint violations to codes in the DAL.

### 9.1 Detecting "nothing happened"

An `UPDATE ... WHERE garment_id = $1 AND user_id = $2` affects zero rows when the garment does not exist **and** when it belongs to someone else. `rows` is empty in both cases — and also empty on success, since `UPDATE` returns no rows by default.

Use `RETURNING *` on mutations so a non-empty array means success and an empty array means "nothing matched." Alternatively an `execute()` helper surfacing `rowCount`. `queryRows` alone cannot distinguish success from failure on a write.

---

## 10. Folder layout

```
resolvers/
  index.ts        merges into one resolver map
  context.ts      RequestContext type + per-request construction
  loaders.ts      buildLoaders(userId)
  Query.ts
  Mutation.ts
  Garment.ts      type, tags, incompatibleWith
  Outfit.ts       garments
  enums.ts
```

Same aggregate split as the DAL. `index.ts` is the only file the server imports.

---

## 11. Build order

1. `context.ts` — stub `userId`, empty loaders. Nothing else compiles without it.
2. `Query.me` + `Query.garments` — simplest complete path; proves context → DAL → response end to end.
3. `enums.ts` — before any enum-typed field is queried.
4. `loaders.ts` + `Garment.tags` — establishes the DataLoader pattern once before repeating it three times.
5. Remaining field resolvers.
6. `Mutation.createGarment` — first transactional write.
7. Remaining mutations.

Verify step 4 with a query returning 10+ garments and query logging on. Two queries, not eleven. If it is eleven, the loader is misconfigured and every subsequent field resolver will copy the mistake.

---

## 12. Open decisions

1. **`garmentType` loader vs. startup cache.** Reference data; a process-level `Map` eliminates the loader entirely.
2. **Does `Garment.incompatibleWith` return edges, or the other garments?** Returning `CompatibilityEdge` exposes `polarity` and `source`; returning `[Garment!]!` is simpler but drops the reason. The field name implies `never_pair` only — if it should include `pairs_well`, rename it.
3. **`Query.compatibility` result shape** — the agent needs both endpoints and polarity in one payload. Confirm the edge type carries enough for prompt construction without a second round trip.
4. **Does `logManualOutfit` accept a past `wornOn`?** Backfilling wear history is useful for cold-starting recently-worn, but it means `proposed_at` and `worn_on` can be far apart, and `proposed_at` defaults to `now()`.
