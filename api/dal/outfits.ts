import { queryRows, type Queryable, type TxClient } from "../../db/transaction";
import { InvariantViolation } from "../../db/errors";
import { findNeverPairEdge } from "./compatibility";
import { getGarmentsByIds, incrementWearCounts } from "./garments";
import {
  REQUIRED_OUTFIT_LAYERS,
  missingRequiredLayers,
} from "./outfitComposition";
import type {
  GarmentLayer,
  LogManualOutfitInput,
  Outfit,
  OutfitFeedback,
  OutfitFilters,
  OutfitOrigin,
  OutfitStatus,
  PieceVerdict,
  ProposeOutfitInput,
  RecentlyWornGarment,
} from "./types";

const OUTFIT_SELECT_COLUMNS = `
  outfit_id, status, origin, proposed_at, worn_on, requested_vibe,
  weather_temp_c, weather_condition, occasion, rejection_reason, rationale,
  title, meta_line, accent_color, wash_color_a, wash_color_b, composite_image_key
`;

interface OutfitRow {
  outfit_id: number;
  status: OutfitStatus;
  origin: OutfitOrigin;
  proposed_at: string;
  worn_on: string | null;
  requested_vibe: string | null;
  weather_temp_c: number | null;
  weather_condition: string | null;
  occasion: string | null;
  rejection_reason: string | null;
  rationale: string | null;
  title: string | null;
  meta_line: string | null;
  accent_color: string | null;
  wash_color_a: string | null;
  wash_color_b: string | null;
  composite_image_key: string | null;
}

// outfit_garments has no role column (top/bottom/shoes are derivable from
// garment_types.layer -- see db/schema.sql), so this just resolves the
// membership set and loads full Garment objects via the shared mapper. Pure
// read, so it stays on Queryable even though it issues more than one
// statement -- there's nothing here that needs rollback.
async function mapOutfitRow(
  db: Queryable,
  userId: number,
  row: OutfitRow,
): Promise<Outfit> {
  const memberRows = await queryRows<{
    garment_id: number;
    verdict: PieceVerdict | null;
    verdict_at: string | null;
    rationale: string | null;
    hotspot_x: number | null;
    hotspot_y: number | null;
    cutout_image_key: string | null;
  }>(
    db,
    `SELECT garment_id, verdict, verdict_at, rationale,
            hotspot_x, hotspot_y, cutout_image_key
     FROM outfit_garments WHERE outfit_id = $1 ORDER BY garment_id`,
    [row.outfit_id],
  );
  const garments = await getGarmentsByIds(
    db,
    userId,
    memberRows.map((r) => r.garment_id),
  );
  // getGarmentsByIds preserves the id order it was given and drops nothing
  // for a well-formed outfit, so zipping by index lines each garment back up
  // with its membership row.
  const garmentById = new Map(garments.map((g) => [g.id, g]));
  const pieces = memberRows.flatMap((m) => {
    const garment = garmentById.get(m.garment_id);
    return garment
      ? [
          {
            garment,
            verdict: m.verdict,
            verdictAt: m.verdict_at,
            rationale: m.rationale,
            hotspotX: m.hotspot_x,
            hotspotY: m.hotspot_y,
            cutoutImageKey: m.cutout_image_key,
          },
        ]
      : [];
  });
  return {
    id: row.outfit_id,
    status: row.status,
    origin: row.origin,
    proposedAt: row.proposed_at,
    wornOn: row.worn_on,
    requestedVibe: row.requested_vibe,
    weatherTempC: row.weather_temp_c,
    weatherCondition: row.weather_condition,
    occasion: row.occasion,
    rejectionReason: row.rejection_reason,
    rationale: row.rationale,
    title: row.title,
    metaLine: row.meta_line,
    accentColor: row.accent_color,
    washColorA: row.wash_color_a,
    washColorB: row.wash_color_b,
    compositeImageKey: row.composite_image_key,
    pieces,
  };
}

// --- reads (Queryable) -----------------------------------------------------

export async function getOutfit(
  db: Queryable,
  userId: number,
  outfitId: number,
): Promise<Outfit | null> {
  const rows = await queryRows<OutfitRow>(
    db,
    `SELECT ${OUTFIT_SELECT_COLUMNS} FROM outfits WHERE outfit_id = $1 AND user_id = $2`,
    [outfitId, userId],
  );
  return rows[0] ? mapOutfitRow(db, userId, rows[0]) : null;
}

export async function listOutfits(
  db: Queryable,
  userId: number,
  filters: OutfitFilters = {},
): Promise<Outfit[]> {
  const conditions: string[] = ["user_id = $1"];
  const params: unknown[] = [userId];

  if (filters.statuses && filters.statuses.length > 0) {
    params.push(filters.statuses);
    conditions.push(`status = ANY($${params.length}::text[])`);
  }
  if (filters.wornSince) {
    params.push(filters.wornSince);
    conditions.push(`worn_on >= $${params.length}`);
  }
  if (filters.wornBefore) {
    params.push(filters.wornBefore);
    conditions.push(`worn_on <= $${params.length}`);
  }

  params.push(filters.limit ?? 50);
  const rows = await queryRows<OutfitRow>(
    db,
    `SELECT ${OUTFIT_SELECT_COLUMNS} FROM outfits
     WHERE ${conditions.join(" AND ")}
     ORDER BY proposed_at DESC
     LIMIT $${params.length}`,
    params,
  );
  return Promise.all(rows.map((row) => mapOutfitRow(db, userId, row)));
}

// --- single-statement writes (Queryable) ------------------------------------

export async function acceptOutfit(
  db: Queryable,
  userId: number,
  outfitId: number,
): Promise<Outfit | null> {
  const rows = await queryRows<{ outfit_id: number }>(
    db,
    `UPDATE outfits SET status = 'accepted'
     WHERE outfit_id = $1 AND user_id = $2 AND status = 'proposed'
     RETURNING outfit_id`,
    [outfitId, userId],
  );
  return rows.length === 0 ? null : getOutfit(db, userId, outfitId);
}

export async function rejectOutfit(
  db: Queryable,
  userId: number,
  outfitId: number,
  reason: string | null | undefined,
): Promise<Outfit | null> {
  const rows = await queryRows<{ outfit_id: number }>(
    db,
    `UPDATE outfits SET status = 'rejected', rejection_reason = $3
     WHERE outfit_id = $1 AND user_id = $2 AND status = 'proposed'
     RETURNING outfit_id`,
    [outfitId, userId, reason ?? null],
  );
  return rows.length === 0 ? null : getOutfit(db, userId, outfitId);
}

// Piece-level verdict (Fitcheck design spec §1). Single-statement write:
// flips verdict/verdict_at on one outfit_garments row. Passing verdict = null
// clears it (verdict_at goes null too, keeping verdict_pair_null happy).
//
// This function enforces exactly one thing: cross-tenant scoping. The join
// to outfits + `o.user_id = $4` means a caller can never verdict a row in
// someone else's outfit, no matter how it reached the DAL. The other
// preconditions the product cares about -- the garment actually being part
// of this outfit, and the outfit not being `rejected` -- are checked in the
// resolver as shape validation (.claude/CLAUDE.md), which is sound here only
// because verdicts have no agent write path. A null return means nothing
// matched (unknown/!owned outfit, or garment not in it); the resolver has
// already distinguished those cases before calling.
export async function setPieceVerdict(
  db: Queryable,
  userId: number,
  outfitId: number,
  garmentId: number,
  verdict: PieceVerdict | null,
): Promise<Outfit | null> {
  const rows = await queryRows<{ garment_id: number }>(
    db,
    `UPDATE outfit_garments og
     SET verdict = $3,
         verdict_at = CASE WHEN $3::text IS NULL THEN NULL ELSE now() END
     FROM outfits o
     WHERE og.outfit_id = $1
       AND og.garment_id = $2
       AND o.outfit_id = og.outfit_id
       AND o.user_id = $4
     RETURNING og.garment_id`,
    [outfitId, garmentId, verdict, userId],
  );
  return rows.length === 0 ? null : getOutfit(db, userId, outfitId);
}

// --- multi-statement writes (TxClient) --------------------------------------
//
// Transaction ownership is caller-side (see the server/transaction dev spec
// §0) -- neither function below opens its own transaction. A resolver or
// agent tool calls composition.ts's withTransaction and passes the
// resulting tx in; if the wear-counter update fails after the status flip,
// the caller's rollback undoes both, so a worn outfit can never end up with
// stale wear counts.

// Marking an outfit worn is the only point wear counters advance (no
// separate wear-events table -- see db/schema.sql), so this bumps
// wears_since_wash for every member garment atomically with the status flip.
//
// Guard: unlike acceptOutfit/rejectOutfit (which only fire from
// status = 'proposed'), an already-'worn' outfit is a legitimate target
// here too -- the same outfit_id being worn again on a later day is how a
// repeat wear gets recorded, since there's no separate wear-events table to
// log it in instead. What must not happen is the same wear being counted
// twice: a double-tap or retried call on an outfit already marked worn
// within the last day is treated as the *same* wear event and is a no-op
// (returns null), not a second bump of every member garment's
// wears_since_wash. More than a day past the existing worn_on, it's treated
// as a new, later wear and proceeds normally, counters included.
export async function markOutfitWorn(
  tx: TxClient,
  userId: number,
  outfitId: number,
  wornOn?: string,
): Promise<Outfit | null> {
  const rows = await queryRows<{ outfit_id: number }>(
    tx,
    `UPDATE outfits SET status = 'worn', worn_on = COALESCE($3, CURRENT_DATE)
     WHERE outfit_id = $1 AND user_id = $2
       AND (status != 'worn' OR (CURRENT_DATE - worn_on) > 1)
     RETURNING outfit_id`,
    [outfitId, userId, wornOn ?? null],
  );
  if (rows.length === 0) return null;

  const memberRows = await queryRows<{ garment_id: number }>(
    tx,
    `SELECT garment_id FROM outfit_garments WHERE outfit_id = $1`,
    [outfitId],
  );
  await incrementWearCounts(
    tx,
    memberRows.map((r) => r.garment_id),
  );

  return getOutfit(tx, userId, outfitId);
}

// Backs logManualOutfit: records an already-worn outfit that the agent never
// proposed (origin = 'manual', status = 'worn' from the start -- there's no
// 'proposed' phase to pass through for something the user is logging after
// the fact). Also bumps wear counters, same as markOutfitWorn.
export async function logManualOutfit(
  tx: TxClient,
  userId: number,
  input: LogManualOutfitInput,
): Promise<Outfit> {
  // Every garment in the outfit must belong to this user -- without this,
  // a caller could link someone else's garment into their own outfit,
  // creating a cross-tenant outfit_garments row and bumping a stranger's
  // wear counters.
  const owned = await queryRows<{ garment_id: number }>(
    tx,
    `SELECT garment_id FROM garments WHERE garment_id = ANY($1::int[]) AND user_id = $2`,
    [input.garmentIds, userId],
  );
  if (owned.length !== new Set(input.garmentIds).size) {
    throw new InvariantViolation("NOT_OWNED", {
      operation: "logManualOutfit",
      userId,
      garmentIds: input.garmentIds,
    });
  }

  const inserted = await queryRows<{ outfit_id: number }>(
    tx,
    `INSERT INTO outfits (
       user_id, status, worn_on, origin, requested_vibe,
       weather_temp_c, weather_condition, occasion
     ) VALUES ($1, 'worn', $2, 'manual', $3, $4, $5, $6)
     RETURNING outfit_id`,
    [
      userId,
      input.wornOn,
      input.requestedVibe ?? null,
      input.weatherTempC ?? null,
      input.weatherCondition ?? null,
      input.occasion ?? null,
    ],
  );
  const outfitId = inserted[0].outfit_id;

  await tx.query(
    `INSERT INTO outfit_garments (outfit_id, garment_id)
     SELECT $1, unnest($2::int[])`,
    [outfitId, input.garmentIds],
  );
  await incrementWearCounts(tx, input.garmentIds);

  return (await getOutfit(tx, userId, outfitId))!;
}

// Backs the Fits screen's re-wear action (feature 5): "I wore this look
// again." Creates a NEW worn outfit rather than mutating the source --
// origin = 'manual', status = 'worn' from the start, same as logManualOutfit
// (the source may have been an agent proposal, but this instance was not
// proposed, it was logged). Returns null if the source isn't the user's or
// doesn't exist.
//
// What carries over: the garment set and the whole look-card presentation
// (title / colors / composite / per-piece rationale, hotspots, cutouts) --
// it is visually the same look, so the Fits entry should render identically.
// What does NOT carry over: the decision-time weather/vibe/occasion snapshot
// (a re-wear has no decision context -- the user just put it on) and the
// piece-level verdicts (those were about reviewing that specific proposal).
// Wear counters are bumped, same as every other path that sets worn_on.
//
// Retired/dirty garments are not rejected here, matching logManualOutfit: a
// manual log records what was actually worn, it is not a proposal to vet.
export async function rewearOutfit(
  tx: TxClient,
  userId: number,
  sourceOutfitId: number,
  wornOn?: string,
): Promise<Outfit | null> {
  const inserted = await queryRows<{ outfit_id: number }>(
    tx,
    `INSERT INTO outfits (
       user_id, status, worn_on, origin,
       title, meta_line, accent_color, wash_color_a, wash_color_b, composite_image_key
     )
     SELECT $1, 'worn', COALESCE($2, CURRENT_DATE), 'manual',
            title, meta_line, accent_color, wash_color_a, wash_color_b, composite_image_key
     FROM outfits
     WHERE outfit_id = $3 AND user_id = $1
     RETURNING outfit_id`,
    [userId, wornOn ?? null, sourceOutfitId],
  );
  if (inserted.length === 0) return null;
  const newOutfitId = inserted[0].outfit_id;

  const copied = await queryRows<{ garment_id: number }>(
    tx,
    `INSERT INTO outfit_garments (
       outfit_id, garment_id, rationale, hotspot_x, hotspot_y, cutout_image_key
     )
     SELECT $1, garment_id, rationale, hotspot_x, hotspot_y, cutout_image_key
     FROM outfit_garments
     WHERE outfit_id = $2
     RETURNING garment_id`,
    [newOutfitId, sourceOutfitId],
  );
  await incrementWearCounts(
    tx,
    copied.map((r) => r.garment_id),
  );

  return (await getOutfit(tx, userId, newOutfitId))!;
}

// Backs the propose_outfit tool (tool layer dev spec §4.4). status =
// 'proposed', worn_on = NULL -- this is the approval gate expressed as data;
// only markOutfitWorn (user-only, through GraphQL) ever sets worn_on.
// Unlike logManualOutfit/markOutfitWorn, this never touches wear counters --
// proposing is not wearing.
//
// DAL-level legality checks beyond ownership, because the model asserting a
// garment_id is valid -- or that a handful of pieces is a whole outfit -- is
// not evidence that it is. Checked in this order:
//   1. NOT_OWNED / GARMENT_NOT_AVAILABLE: per-garment. Every garment must be
//      the user's, un-retired, and clean -- something get_candidates could
//      have returned this turn.
//   2. OUTFIT_INCOMPATIBLE_PAIR: no two garments in the set may carry a
//      'never_pair' edge. This is its first throw site (see db/errors.ts and
//      db/transaction.test.ts's sentinel use of it).
//   3. OUTFIT_INCOMPLETE: the set must cover every required structural slot
//      (top / bottom / footwear -- api/dal/outfitComposition.ts). Checked
//      last of the set-level rules: an incompatible pair has to be broken no
//      matter what else the model adds, so that gap is the more urgent one
//      to surface first.
export async function proposeOutfit(
  tx: TxClient,
  userId: number,
  input: ProposeOutfitInput,
): Promise<Outfit> {
  const owned = await queryRows<{
    garment_id: number;
    is_available: boolean;
    layer: GarmentLayer;
  }>(
    tx,
    `SELECT g.garment_id,
            gt.layer,
            (g.retired_at IS NULL
             AND g.wears_since_wash < COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash)
            ) AS is_available
     FROM garments g
     JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
     WHERE g.garment_id = ANY($1::int[]) AND g.user_id = $2`,
    [input.garmentIds, userId],
  );
  if (owned.length !== new Set(input.garmentIds).size) {
    throw new InvariantViolation("NOT_OWNED", {
      operation: "proposeOutfit",
      userId,
      garmentIds: input.garmentIds,
    });
  }
  const unavailable = owned.filter((r) => !r.is_available);
  if (unavailable.length > 0) {
    throw new InvariantViolation("GARMENT_NOT_AVAILABLE", {
      operation: "proposeOutfit",
      userId,
      garmentIds: unavailable.map((r) => r.garment_id),
    });
  }

  const incompatiblePair = await findNeverPairEdge(tx, input.garmentIds);
  if (incompatiblePair) {
    throw new InvariantViolation("OUTFIT_INCOMPATIBLE_PAIR", {
      operation: "proposeOutfit",
      userId,
      garmentAId: incompatiblePair.garmentAId,
      garmentBId: incompatiblePair.garmentBId,
    });
  }

  const missing = missingRequiredLayers(owned.map((r) => r.layer));
  if (missing.length > 0) {
    throw new InvariantViolation("OUTFIT_INCOMPLETE", {
      operation: "proposeOutfit",
      userId,
      missing,
      required: [...REQUIRED_OUTFIT_LAYERS],
    });
  }

  const inserted = await queryRows<{ outfit_id: number }>(
    tx,
    `INSERT INTO outfits (
       user_id, status, origin, requested_vibe,
       weather_temp_c, weather_condition, occasion, rationale,
       title, meta_line, accent_color, wash_color_a, wash_color_b
     ) VALUES ($1, 'proposed', 'agent', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING outfit_id`,
    [
      userId,
      input.requestedVibe ?? null,
      input.weatherTempC ?? null,
      input.weatherCondition ?? null,
      input.occasion ?? null,
      input.rationale,
      input.title ?? null,
      input.metaLine ?? null,
      input.accentColor ?? null,
      input.washColorA ?? null,
      input.washColorB ?? null,
    ],
  );
  const outfitId = inserted[0].outfit_id;

  await tx.query(
    `INSERT INTO outfit_garments (outfit_id, garment_id)
     SELECT $1, unnest($2::int[])`,
    [outfitId, input.garmentIds],
  );

  // Per-piece rationale, if supplied. Only rows already inserted above are
  // touched -- a rationale for a garment id not in the outfit is silently
  // dropped by the join, same tolerance as pieceRationales' doc contract.
  if (input.pieceRationales && input.pieceRationales.length > 0) {
    await tx.query(
      `UPDATE outfit_garments og SET rationale = v.rationale
       FROM (SELECT unnest($2::int[]) AS garment_id, unnest($3::text[]) AS rationale) v
       WHERE og.outfit_id = $1 AND og.garment_id = v.garment_id`,
      [
        outfitId,
        input.pieceRationales.map((p) => p.garmentId),
        input.pieceRationales.map((p) => p.rationale),
      ],
    );
  }

  return (await getOutfit(tx, userId, outfitId))!;
}

// Backs GarmentView.last_worn_days_ago (tool layer dev spec §5) for an
// arbitrary set of garments, e.g. get_candidates' result -- unlike
// getRecentlyWornGarments below, this has no time window, since a garment
// last worn 60 days ago still has a last-worn date, just not a "recent"
// one. Garments never worn are simply absent from the returned map.
export async function getLastWornDates(
  db: Queryable,
  userId: number,
  garmentIds: number[],
): Promise<Map<number, string>> {
  if (garmentIds.length === 0) return new Map();
  const rows = await queryRows<{ garment_id: number; last_worn_on: string }>(
    db,
    `SELECT og.garment_id, MAX(o.worn_on) AS last_worn_on
     FROM outfit_garments og
     JOIN outfits o ON o.outfit_id = og.outfit_id
     WHERE o.user_id = $1 AND o.worn_on IS NOT NULL
       AND og.garment_id = ANY($2::int[])
     GROUP BY og.garment_id`,
    [userId, garmentIds],
  );
  return new Map(rows.map((row) => [row.garment_id, row.last_worn_on]));
}

// Backs get_recent_outfits. Recency is derived, not stored (no wear-events
// table -- db/schema.sql): joins outfit_garments -> outfits, filters on
// worn_on IS NOT NULL (the proposal/reality boundary), takes MAX(worn_on)
// per garment, and orders by that descending -- ordering is by recency, not
// wear frequency, since the tool exists to avoid repeating something worn
// recently, not to surface what's worn most.
export async function getRecentlyWornGarments(
  db: Queryable,
  userId: number,
  sinceDate: string,
): Promise<RecentlyWornGarment[]> {
  const rows = await queryRows<{
    garment_id: number;
    type_name: string;
    last_worn_on: string;
  }>(
    db,
    `SELECT g.garment_id, gt.name AS type_name, MAX(o.worn_on) AS last_worn_on
     FROM outfit_garments og
     JOIN outfits o ON o.outfit_id = og.outfit_id
     JOIN garments g ON g.garment_id = og.garment_id
     JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
     WHERE o.user_id = $1 AND o.worn_on IS NOT NULL AND o.worn_on >= $2
     GROUP BY g.garment_id, gt.name
     ORDER BY last_worn_on DESC`,
    [userId, sinceDate],
  );
  return rows.map((row) => ({
    garmentId: row.garment_id,
    garmentTypeName: row.type_name,
    lastWornOn: row.last_worn_on,
  }));
}

// Backs get_outfit_feedback (feature 6). The most recent outfits that carry
// explicit feedback -- rejected (a rejection_reason, present or not, still
// counts as a whole-look "no") or holding at least one piece-level verdict.
// Silent proposals (accepted/worn with no verdicts, or still proposed and
// untouched) are omitted: they're not signal the agent should steer on.
// Ordered newest-first by proposed_at, capped at `limit`.
export async function getOutfitFeedback(
  db: Queryable,
  userId: number,
  limit: number,
): Promise<OutfitFeedback[]> {
  const outfitRows = await queryRows<{
    outfit_id: number;
    status: OutfitStatus;
    worn_on: string | null;
    rejection_reason: string | null;
    proposed_at: string;
  }>(
    db,
    `SELECT o.outfit_id, o.status, o.worn_on, o.rejection_reason, o.proposed_at
     FROM outfits o
     WHERE o.user_id = $1
       AND (
         o.status = 'rejected'
         OR EXISTS (
           SELECT 1 FROM outfit_garments og
           WHERE og.outfit_id = o.outfit_id AND og.verdict IS NOT NULL
         )
       )
     ORDER BY o.proposed_at DESC, o.outfit_id DESC
     LIMIT $2`,
    [userId, limit],
  );
  if (outfitRows.length === 0) return [];

  const pieceRows = await queryRows<{
    outfit_id: number;
    garment_id: number;
    type_name: string;
    verdict: PieceVerdict | null;
  }>(
    db,
    `SELECT og.outfit_id, og.garment_id, gt.name AS type_name, og.verdict
     FROM outfit_garments og
     JOIN garments g ON g.garment_id = og.garment_id
     JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
     WHERE og.outfit_id = ANY($1::int[])
     ORDER BY og.garment_id`,
    [outfitRows.map((r) => r.outfit_id)],
  );
  const piecesByOutfit = new Map<number, OutfitFeedback["pieces"]>();
  for (const p of pieceRows) {
    if (!piecesByOutfit.has(p.outfit_id)) piecesByOutfit.set(p.outfit_id, []);
    piecesByOutfit.get(p.outfit_id)!.push({
      garmentId: p.garment_id,
      garmentTypeName: p.type_name,
      verdict: p.verdict,
    });
  }

  return outfitRows.map((o) => ({
    outfitId: o.outfit_id,
    status: o.status,
    wornOn: o.worn_on,
    rejectionReason: o.rejection_reason,
    proposedAt: o.proposed_at,
    pieces: piecesByOutfit.get(o.outfit_id) ?? [],
  }));
}
