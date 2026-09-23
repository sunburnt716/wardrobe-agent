import { queryRows, type Queryable, type TxClient } from '../../db/transaction';
import {
  GARMENT_SELECT_COLUMNS,
  GARMENT_FROM_CLAUSE,
  mapGarmentRow,
  type GarmentRow,
} from './garmentMapper';
import type {
  CreateGarmentInput,
  Garment,
  GarmentFilters,
  OutfitContext,
  UpdateGarmentInput,
  WardrobeSummary,
} from './types';

// Fallbacks for createGarment when the caller doesn't state a value. The
// schema forbids NULL (db/migrations/002) and carries no default on purpose,
// so the "we don't know yet" case is resolved here instead -- a single place
// a future classifier (photo/tag inference) can replace. 'casual' (1) is the
// safe assumption for formality: proposing an over-casual garment for a
// formal occasion is a visible miss the user corrects, whereas the reverse
// (a NULL silently reading as any band) was undetectable. 3 is neutral-mid
// for warmth, where neither extreme is safe.
export const DEFAULT_FORMALITY_BAND = 1;
export const DEFAULT_WARMTH_RATING = 3;

// Maps a temperature to the warmth band get_candidates centres its filter
// on. Coarse buckets, deliberately -- this is a pre-filter, not a solver.
// TODO(ui): once the schema has per-user preferences, let the user shift
// these thresholds (some people run hot/cold); until then everyone gets this
// curve.
export function warmthBandForTempC(tempC: number): number {
  if (tempC >= 24) return 1;
  if (tempC >= 16) return 2;
  if (tempC >= 8) return 3;
  if (tempC >= 0) return 4;
  return 5;
}

// --- reads (single-statement, Queryable) ----------------------------------

// A miss (wrong owner or nonexistent id) returns null either way -- telling
// a caller "that garment exists, just not yours" would leak the existence
// of other users' data.
export async function getGarment(
  db: Queryable,
  userId: number,
  garmentId: number,
): Promise<Garment | null> {
  const rows = await queryRows<GarmentRow>(
    db,
    `SELECT ${GARMENT_SELECT_COLUMNS} ${GARMENT_FROM_CLAUSE}
     WHERE g.garment_id = $1 AND g.user_id = $2`,
    [garmentId, userId],
  );
  return rows[0] ? mapGarmentRow(rows[0]) : null;
}

// Order of the returned garments follows garmentIds, not garment_id --
// callers like outfits.ts and compatibility.ts rely on this to line results
// back up with the ids they asked for. Ids that don't belong to userId are
// silently dropped rather than erroring, since callers (outfit/edge row
// hydration) already trust the ids came from rows scoped to this user.
export async function getGarmentsByIds(
  db: Queryable,
  userId: number,
  garmentIds: number[],
): Promise<Garment[]> {
  if (garmentIds.length === 0) return [];
  const rows = await queryRows<GarmentRow>(
    db,
    `SELECT ${GARMENT_SELECT_COLUMNS} ${GARMENT_FROM_CLAUSE}
     WHERE g.garment_id = ANY($1::int[]) AND g.user_id = $2
     ORDER BY array_position($1::int[], g.garment_id)`,
    [garmentIds, userId],
  );
  return rows.map(mapGarmentRow);
}

export async function listGarments(
  db: Queryable,
  userId: number,
  filters: GarmentFilters = {},
): Promise<Garment[]> {
  const conditions: string[] = ['g.user_id = $1'];
  const params: unknown[] = [userId];

  if (!filters.includeRetired) {
    conditions.push('g.retired_at IS NULL');
  }
  if (filters.layers && filters.layers.length > 0) {
    params.push(filters.layers);
    conditions.push(`gt.layer = ANY($${params.length}::text[])`);
  }
  if (filters.formalityBand?.min !== undefined) {
    params.push(filters.formalityBand.min);
    conditions.push(`g.formality_band >= $${params.length}`);
  }
  if (filters.formalityBand?.max !== undefined) {
    params.push(filters.formalityBand.max);
    conditions.push(`g.formality_band <= $${params.length}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    params.push(filters.tags);
    conditions.push(
      `EXISTS (SELECT 1 FROM garment_tags t WHERE t.garment_id = g.garment_id AND t.tag = ANY($${params.length}::text[]))`,
    );
  }
  // primary_color / secondary_color are instance-level typed columns
  // (db/schema.sql), so this filters in SQL rather than post-hoc in JS.
  // Match is case-insensitive: the comparison array is lowercased here and
  // the columns are lowered in the predicate.
  if (filters.colors && filters.colors.length > 0) {
    params.push(filters.colors.map((c) => c.toLowerCase()));
    conditions.push(
      `(LOWER(g.primary_color) = ANY($${params.length}::text[]) OR LOWER(g.secondary_color) = ANY($${params.length}::text[]))`,
    );
  }
  // isClean is computed, not stored (see db/schema.sql), so onlyClean is
  // filtered by repeating that expression in SQL rather than by loading
  // rows and checking the mapped Garment.isClean in JS.
  if (filters.onlyClean === true) {
    conditions.push(
      '(g.wears_since_wash < COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash))',
    );
  } else if (filters.onlyClean === false) {
    conditions.push(
      '(g.wears_since_wash >= COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash))',
    );
  }

  const rows = await queryRows<GarmentRow>(
    db,
    `SELECT ${GARMENT_SELECT_COLUMNS} ${GARMENT_FROM_CLAUSE}
     WHERE ${conditions.join(' AND ')}
     ORDER BY g.garment_id`,
    params,
  );
  return rows.map(mapGarmentRow);
}

// Backs Query.candidateGarments: narrows to active + currently-clean
// garments, within one formality band of the target, within one warmth band
// of what the temperature calls for, and (when the weather is wet)
// water-resistant only. This is deliberately a coarse pre-filter, not the
// outfit solver -- fine warmth scoring, vibe matching, and pairwise
// compatibility-edge exclusion belong to agent/tools logic (propose_outfit's
// never_pair check; see api/dal/outfits.ts:proposeOutfit) or the eventual
// solver, not here. never_pair can't be enforced by this function at all:
// it's a relationship between two garments, not a property of one, so it
// cannot be applied by filtering a single candidate out of a flat list.
//
// Both band filters are fail-closed: after db/migrations/002 the columns are
// NOT NULL, so there is no "unknown, let it through" case -- a garment
// outside the window is excluded, full stop.
export async function listCandidateGarments(
  db: Queryable,
  userId: number,
  context: OutfitContext,
): Promise<Garment[]> {
  const conditions: string[] = [
    'g.user_id = $1',
    'g.retired_at IS NULL',
    '(g.wears_since_wash < COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash))',
  ];
  const params: unknown[] = [userId];

  if (context.formalityTarget !== undefined) {
    params.push(context.formalityTarget);
    conditions.push(`ABS(g.formality_band - $${params.length}) <= 1`);
  }

  // Warmth pre-filter: keep garments within one band of what the temperature
  // calls for. Base layers are exempt -- a thin tee is worn under a coat in
  // winter and on its own in summer, so excluding it by temperature alone
  // would be wrong at both ends. Same shape of carve-out the rain rule makes
  // for layers that aren't weather-exposed.
  params.push(warmthBandForTempC(context.tempC));
  conditions.push(
    `(gt.layer = 'base' OR ABS(g.warmth_rating - $${params.length}) <= 1)`,
  );

  // Rain/snow is a hard constraint (tool layer dev spec §3), but only for
  // the layers actually exposed to weather -- outerwear and footwear. A
  // base-layer shirt has no water resistance either way and isn't what
  // makes an outfit rain-unsuitable, so scoping this to all layers would
  // wrongly reject every base/mid-layer garment too.
  if (
    context.weatherCondition === 'rain' ||
    context.weatherCondition === 'snow'
  ) {
    conditions.push(
      `(gt.layer NOT IN ('outer', 'footwear') OR g.water_resistant = TRUE)`,
    );
  }

  const rows = await queryRows<GarmentRow>(
    db,
    `SELECT ${GARMENT_SELECT_COLUMNS} ${GARMENT_FROM_CLAUSE}
     WHERE ${conditions.join(' AND ')}
     ORDER BY g.garment_id`,
    params,
  );
  return rows.map(mapGarmentRow);
}

// --- single-statement writes (Queryable) ----------------------------------

// Retirement is one-way and never a delete -- garments referenced by past
// outfits must stay queryable (see the asymmetric FK cascade note in
// db/schema.sql). No-ops (returns null) if the garment is already retired.
export async function retireGarment(
  db: Queryable,
  userId: number,
  garmentId: number,
): Promise<Garment | null> {
  const rows = await queryRows<{ garment_id: number }>(
    db,
    `UPDATE garments SET retired_at = CURRENT_DATE
     WHERE garment_id = $1 AND user_id = $2 AND retired_at IS NULL
     RETURNING garment_id`,
    [garmentId, userId],
  );
  return rows.length === 0 ? null : getGarment(db, userId, garmentId);
}

export async function washGarment(
  db: Queryable,
  userId: number,
  garmentId: number,
): Promise<Garment | null> {
  const rows = await queryRows<{ garment_id: number }>(
    db,
    `UPDATE garments SET wears_since_wash = 0, last_washed_at = now()
     WHERE garment_id = $1 AND user_id = $2
     RETURNING garment_id`,
    [garmentId, userId],
  );
  return rows.length === 0 ? null : getGarment(db, userId, garmentId);
}

// Used by outfits.ts (markOutfitWorn, logManualOutfit) as part of their own
// transactions -- bumping wear counters is the one thing that makes a worn
// outfit change isClean for its garments, since there's no separate
// wear-events table (see db/schema.sql).
export async function incrementWearCounts(
  db: Queryable,
  garmentIds: number[],
): Promise<void> {
  if (garmentIds.length === 0) return;
  await db.query(
    `UPDATE garments SET wears_since_wash = wears_since_wash + 1
     WHERE garment_id = ANY($1::int[])`,
    [garmentIds],
  );
}

// --- multi-statement writes (TxClient) ------------------------------------
//
// Neither of these opens its own transaction -- transaction ownership is
// caller-side (see the server/transaction dev spec §0). A resolver or agent
// tool calls composition.ts's withTransaction and passes the resulting tx
// in here; if either statement below fails, the caller's rollback undoes
// both, so a garment never ends up with tags for a row that doesn't exist.

export async function createGarment(
  tx: TxClient,
  userId: number,
  input: CreateGarmentInput,
): Promise<Garment> {
  const inserted = await queryRows<{ garment_id: number }>(
    tx,
    `INSERT INTO garments (
       user_id, garment_type_id, acquired_at, warmth_rating, formality_band,
       primary_color, secondary_color, texture, silhouette, water_resistant,
       wears_before_wash_override, photo_key
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, FALSE),$11,$12)
     RETURNING garment_id`,
    [
      userId,
      input.garmentTypeId,
      input.acquiredAt ?? null,
      input.warmthRating ?? DEFAULT_WARMTH_RATING,
      input.formalityBand ?? DEFAULT_FORMALITY_BAND,
      input.primaryColor ?? null,
      input.secondaryColor ?? null,
      input.texture ?? null,
      input.silhouette ?? null,
      input.waterResistant ?? null,
      input.wearsBeforeWashOverride ?? null,
      input.photoKey ?? null,
    ],
  );
  const garmentId = inserted[0].garment_id;

  if (input.tags && input.tags.length > 0) {
    await tx.query(
      `INSERT INTO garment_tags (garment_id, tag) SELECT $1, unnest($2::text[])`,
      [garmentId, input.tags],
    );
  }

  return (await getGarment(tx, userId, garmentId))!;
}

const UPDATE_COLUMN_MAP: Record<
  Exclude<keyof UpdateGarmentInput, 'tags'>,
  string
> = {
  acquiredAt: 'acquired_at',
  warmthRating: 'warmth_rating',
  formalityBand: 'formality_band',
  primaryColor: 'primary_color',
  secondaryColor: 'secondary_color',
  texture: 'texture',
  silhouette: 'silhouette',
  waterResistant: 'water_resistant',
  wearsBeforeWashOverride: 'wears_before_wash_override',
  photoKey: 'photo_key',
};

export async function updateGarment(
  tx: TxClient,
  userId: number,
  garmentId: number,
  input: UpdateGarmentInput,
): Promise<Garment | null> {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, column] of Object.entries(UPDATE_COLUMN_MAP) as [
    Exclude<keyof UpdateGarmentInput, 'tags'>,
    string,
  ][]) {
    const value = input[key];
    // For most columns null is a real value (clear the field). formality_band
    // and warmth_rating are NOT NULL (db/migrations/002) with no clear-it, so
    // a null there is a client mistake -- skip it rather than let it hit the
    // constraint. Other columns keep null-means-clear.
    const nullClears = key !== 'formalityBand' && key !== 'warmthRating';
    if (value !== undefined && (nullClears || value !== null)) {
      params.push(value);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length > 0) {
    params.push(garmentId, userId);
    const result = await tx.query(
      `UPDATE garments SET ${setClauses.join(', ')}
       WHERE garment_id = $${params.length - 1} AND user_id = $${params.length}`,
      params,
    );
    if (result.rowCount === 0) return null;
  } else {
    // No column changes requested (tags-only update) -- still confirm the
    // garment exists and belongs to this user before touching tags.
    const owns = await queryRows<{ garment_id: number }>(
      tx,
      `SELECT garment_id FROM garments WHERE garment_id = $1 AND user_id = $2`,
      [garmentId, userId],
    );
    if (owns.length === 0) return null;
  }

  if (input.tags !== undefined) {
    await tx.query(`DELETE FROM garment_tags WHERE garment_id = $1`, [
      garmentId,
    ]);
    if (input.tags.length > 0) {
      await tx.query(
        `INSERT INTO garment_tags (garment_id, tag) SELECT $1, unnest($2::text[])`,
        [garmentId, input.tags],
      );
    }
  }

  return getGarment(tx, userId, garmentId);
}

// --- reads (Queryable), continued ------------------------------------------

// Backs get_wardrobe_summary. byLayer/byFormality/unavailableCount are
// computed over active (non-retired) garments only, mirroring what
// listCandidateGarments and listGarments's default treat as "the wardrobe";
// unavailableCount is active-but-dirty, i.e. get_candidates would not
// return it today. confirmedOutfitsCount uses worn_on IS NOT NULL, not
// status = 'accepted' -- the proposal/reality boundary (.claude/CLAUDE.md),
// since an accepted-but-unworn outfit is still just a proposal.
export async function getWardrobeSummary(
  db: Queryable,
  userId: number,
): Promise<WardrobeSummary> {
  const [byLayerRows, byFormalityRows, confirmedRows] = await Promise.all([
    queryRows<{ layer: string; total: string; unavailable: string }>(
      db,
      `SELECT gt.layer,
              COUNT(*) AS total,
              COUNT(*) FILTER (
                WHERE g.wears_since_wash >= COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash)
              ) AS unavailable
       FROM garments g
       JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
       WHERE g.user_id = $1 AND g.retired_at IS NULL
       GROUP BY gt.layer`,
      [userId],
    ),
    queryRows<{ formality_band: number; total: string }>(
      db,
      `SELECT g.formality_band, COUNT(*) AS total
       FROM garments g
       WHERE g.user_id = $1 AND g.retired_at IS NULL
       GROUP BY g.formality_band`,
      [userId],
    ),
    queryRows<{ total: string }>(
      db,
      `SELECT COUNT(*) AS total FROM outfits WHERE user_id = $1 AND worn_on IS NOT NULL`,
      [userId],
    ),
  ]);

  const byLayer: Record<string, number> = {};
  let totalGarments = 0;
  let unavailableCount = 0;
  for (const row of byLayerRows) {
    const total = Number(row.total);
    byLayer[row.layer] = total;
    totalGarments += total;
    unavailableCount += Number(row.unavailable);
  }

  const byFormality: Record<string, number> = {};
  for (const row of byFormalityRows) {
    // formality_band is NOT NULL (db/migrations/002), so keys are always a
    // 1-5 band -- no 'unset' bucket.
    byFormality[String(row.formality_band)] = Number(row.total);
  }

  return {
    totalGarments,
    byLayer,
    byFormality,
    unavailableCount,
    confirmedOutfitsCount: Number(confirmedRows[0].total),
  };
}
