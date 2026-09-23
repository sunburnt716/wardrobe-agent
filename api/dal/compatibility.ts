import { queryRows, type Queryable, type TxClient } from '../../db/transaction';
import { InvariantViolation } from '../../db/errors';
import { getGarmentsByIds } from './garments';
import type {
  Actor,
  CompatibilityEdge,
  CompatibilityPolarity,
  CompatibilitySource,
  SetCompatibilityEdgeInput,
} from './types';

interface CompatibilityRow {
  garment_a_id: number;
  garment_b_id: number;
  polarity: CompatibilityPolarity;
  source: CompatibilitySource;
  written_by: Actor;
  note: string | null;
  created_at: string;
}

const EDGE_SELECT_COLUMNS = `
  gc.garment_a_id, gc.garment_b_id, gc.polarity, gc.source, gc.written_by, gc.note, gc.created_at
`;

// 'learned' outranks 'manual' at write time (see the source/written_by
// comment in db/schema.sql) -- this is the one place that ordering is
// encoded, so it never needs to be re-decided on read.
const SOURCE_PRIORITY: Record<CompatibilitySource, number> = {
  manual: 0,
  learned: 1,
};

// garment_compatibility carries no user_id of its own, so every read/write
// below joins garments twice (once per endpoint) to scope by ownership.
// Omitting either join leaks cross-tenant edges (see db/schema.sql and the
// resolver-layer dev spec's §5.1).

async function mapEdgeRows(
  db: Queryable,
  userId: number,
  rows: CompatibilityRow[],
): Promise<CompatibilityEdge[]> {
  const garmentIds = Array.from(
    new Set(rows.flatMap((r) => [r.garment_a_id, r.garment_b_id])),
  );
  const garments = await getGarmentsByIds(db, userId, garmentIds);
  const byId = new Map(garments.map((g) => [g.id, g]));
  return rows.map((row) => ({
    garmentA: byId.get(row.garment_a_id)!,
    garmentB: byId.get(row.garment_b_id)!,
    polarity: row.polarity,
    source: row.source,
    writtenBy: row.written_by,
    note: row.note,
    createdAt: row.created_at,
  }));
}

// --- reads (Queryable) -----------------------------------------------------

// Backs Query.compatibility(garmentIds): edges *among* the requested set --
// both endpoints must be in garmentIds, not just one. (Garment.incompatibleWith
// below is the "either endpoint" query; the two must not be conflated -- see
// the resolver-layer dev spec's §5.1.)
export async function listCompatibilityEdges(
  db: Queryable,
  userId: number,
  garmentIds: number[],
): Promise<CompatibilityEdge[]> {
  if (garmentIds.length === 0) return [];
  const rows = await queryRows<CompatibilityRow>(
    db,
    `SELECT ${EDGE_SELECT_COLUMNS}
     FROM garment_compatibility gc
     JOIN garments ga ON ga.garment_id = gc.garment_a_id AND ga.user_id = $2
     JOIN garments gb ON gb.garment_id = gc.garment_b_id AND gb.user_id = $2
     WHERE gc.garment_a_id = ANY($1::int[]) AND gc.garment_b_id = ANY($1::int[])
     ORDER BY gc.garment_a_id, gc.garment_b_id`,
    [garmentIds, userId],
  );
  return mapEdgeRows(db, userId, rows);
}

// Backs Garment.incompatibleWith for a single garment: edges *touching* it --
// either endpoint may match.
export async function getIncompatibleEdgesForGarment(
  db: Queryable,
  userId: number,
  garmentId: number,
): Promise<CompatibilityEdge[]> {
  const rows = await queryRows<CompatibilityRow>(
    db,
    `SELECT ${EDGE_SELECT_COLUMNS}
     FROM garment_compatibility gc
     JOIN garments ga ON ga.garment_id = gc.garment_a_id AND ga.user_id = $2
     JOIN garments gb ON gb.garment_id = gc.garment_b_id AND gb.user_id = $2
     WHERE gc.garment_a_id = $1 OR gc.garment_b_id = $1
     ORDER BY gc.garment_a_id, gc.garment_b_id`,
    [garmentId, userId],
  );
  return mapEdgeRows(db, userId, rows);
}

// Batched version of getIncompatibleEdgesForGarment for the
// resolvers/loaders.ts edgesTouching DataLoader. Returns the deduped set of
// edges touching any id in garmentIds -- one edge can touch two ids in the
// same batch, so the loader (not this function) is responsible for grouping
// results back onto each key.
export async function getEdgesTouchingGarments(
  db: Queryable,
  userId: number,
  garmentIds: number[],
): Promise<CompatibilityEdge[]> {
  if (garmentIds.length === 0) return [];
  const rows = await queryRows<CompatibilityRow>(
    db,
    `SELECT ${EDGE_SELECT_COLUMNS}
     FROM garment_compatibility gc
     JOIN garments ga ON ga.garment_id = gc.garment_a_id AND ga.user_id = $2
     JOIN garments gb ON gb.garment_id = gc.garment_b_id AND gb.user_id = $2
     WHERE gc.garment_a_id = ANY($1::int[]) OR gc.garment_b_id = ANY($1::int[])
     ORDER BY gc.garment_a_id, gc.garment_b_id`,
    [garmentIds, userId],
  );
  return mapEdgeRows(db, userId, rows);
}

// Backs proposeOutfit's OUTFIT_INCOMPATIBLE_PAIR check. garment_a_id <
// garment_b_id always (db/schema.sql's CHECK), so any never_pair edge among
// the chosen set has both endpoints inside garmentIds -- one query, no
// pairwise iteration needed. No ownership join here: proposeOutfit already
// checks ownership of every id in garmentIds before calling this, and an
// edge can only exist between two garments that were both owned when the
// edge was written.
export async function findNeverPairEdge(
  db: Queryable,
  garmentIds: number[],
): Promise<{ garmentAId: number; garmentBId: number } | null> {
  if (garmentIds.length < 2) return null;
  const rows = await queryRows<{ garment_a_id: number; garment_b_id: number }>(
    db,
    `SELECT garment_a_id, garment_b_id
     FROM garment_compatibility
     WHERE garment_a_id = ANY($1::int[]) AND garment_b_id = ANY($1::int[])
       AND polarity = 'never_pair'
     LIMIT 1`,
    [garmentIds],
  );
  return rows[0]
    ? { garmentAId: rows[0].garment_a_id, garmentBId: rows[0].garment_b_id }
    : null;
}

// --- single-statement writes (Queryable) ------------------------------------

export async function deleteCompatibilityEdge(
  db: Queryable,
  userId: number,
  garmentAId: number,
  garmentBId: number,
): Promise<boolean> {
  const a = Math.min(garmentAId, garmentBId);
  const b = Math.max(garmentAId, garmentBId);
  const result = await db.query(
    `DELETE FROM garment_compatibility gc
     USING garments ga, garments gb
     WHERE gc.garment_a_id = $1 AND gc.garment_b_id = $2
       AND ga.garment_id = gc.garment_a_id AND ga.user_id = $3
       AND gb.garment_id = gc.garment_b_id AND gb.user_id = $3`,
    [a, b, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

// --- multi-statement writes (TxClient) --------------------------------------
//
// Transaction ownership is caller-side (see the server/transaction dev spec
// §0). Both functions below are check-then-act (ownership check, then
// upsert) and must run inside a transaction opened by the caller.

// Generic upsert used both by setCompatibilityEdge (user-authored, manual)
// and by agent tooling writing learned edges. Normalizes garment_a_id <
// garment_b_id (never insert the reverse-order row -- see db/schema.sql),
// and only overwrites an existing row if the incoming source's priority is
// >= the existing row's, per SOURCE_PRIORITY.
export async function upsertCompatibilityEdge(
  tx: TxClient,
  userId: number,
  input: {
    garmentAId: number;
    garmentBId: number;
    polarity: CompatibilityPolarity;
    source: CompatibilitySource;
    writtenBy: Actor;
    note?: string | null;
  },
): Promise<CompatibilityEdge> {
  const a = Math.min(input.garmentAId, input.garmentBId);
  const b = Math.max(input.garmentAId, input.garmentBId);

  // Both garments must belong to this user before an edge between them can
  // be written -- otherwise a hand-entered rule could span a garment that
  // isn't even the caller's.
  const owned = await queryRows<{ garment_id: number }>(
    tx,
    `SELECT garment_id FROM garments WHERE garment_id = ANY($1::int[]) AND user_id = $2`,
    [[a, b], userId],
  );
  if (owned.length !== new Set([a, b]).size) {
    throw new InvariantViolation('NOT_OWNED', {
      operation: 'upsertCompatibilityEdge',
      userId,
      garmentAId: a,
      garmentBId: b,
    });
  }

  const upserted = await queryRows<CompatibilityRow>(
    tx,
    `INSERT INTO garment_compatibility (garment_a_id, garment_b_id, polarity, source, written_by, note)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (garment_a_id, garment_b_id) DO UPDATE SET
       polarity = EXCLUDED.polarity,
       source = EXCLUDED.source,
       written_by = EXCLUDED.written_by,
       note = EXCLUDED.note
     WHERE $7 >= (CASE garment_compatibility.source WHEN 'learned' THEN 1 ELSE 0 END)
     RETURNING garment_a_id, garment_b_id, polarity, source, written_by, note, created_at`,
    [
      a,
      b,
      input.polarity,
      input.source,
      input.writtenBy,
      input.note ?? null,
      SOURCE_PRIORITY[input.source],
    ],
  );

  if (upserted.length > 0) {
    return (await mapEdgeRows(tx, userId, upserted))[0];
  }

  // The existing row outranked this write (e.g. a manual write arriving
  // after a learned edge already exists) -- nothing changed, return the
  // row as it stands.
  const existing = await queryRows<CompatibilityRow>(
    tx,
    `SELECT garment_a_id, garment_b_id, polarity, source, written_by, note, created_at
     FROM garment_compatibility WHERE garment_a_id = $1 AND garment_b_id = $2`,
    [a, b],
  );
  return (await mapEdgeRows(tx, userId, existing))[0];
}

// Backs Mutation.setCompatibilityEdge -- always a user-authored manual edge.
export async function setCompatibilityEdge(
  tx: TxClient,
  userId: number,
  input: SetCompatibilityEdgeInput,
): Promise<CompatibilityEdge> {
  return upsertCompatibilityEdge(tx, userId, {
    garmentAId: input.garmentAId,
    garmentBId: input.garmentBId,
    polarity: input.polarity,
    source: 'manual',
    writtenBy: 'user',
    note: input.note,
  });
}
