// Raw parameterized-SQL fixture helpers for the DAL test suite. These
// deliberately do NOT call into api/dal's own create*/insert functions --
// fixture setup must not depend on the code under test, or a bug in (say)
// createGarment could make its own tests' fixtures wrong in a way that
// cancels the bug out instead of exposing it.
import type { Queryable } from './transaction';

export async function insertUser(
  db: Queryable,
  overrides: { displayName?: string; genderIdentity?: string | null } = {},
): Promise<number> {
  const result = await db.query<{ user_id: number }>(
    `INSERT INTO users (display_name, gender_identity) VALUES ($1, $2) RETURNING user_id`,
    [overrides.displayName ?? 'Test User', overrides.genderIdentity ?? null],
  );
  return result.rows[0].user_id;
}

export async function insertGarmentType(
  db: Queryable,
  overrides: {
    name?: string;
    layer?: string;
    defaultWearsBeforeWash?: number;
  } = {},
): Promise<number> {
  const result = await db.query<{ garment_type_id: number }>(
    `INSERT INTO garment_types (name, layer, default_wears_before_wash)
     VALUES ($1, $2, $3) RETURNING garment_type_id`,
    [
      overrides.name ?? `test_type_${Math.random().toString(36).slice(2, 10)}`,
      overrides.layer ?? 'base',
      overrides.defaultWearsBeforeWash ?? 3,
    ],
  );
  return result.rows[0].garment_type_id;
}

export interface GarmentOverrides {
  acquiredAt?: string | null;
  warmthRating?: number | null;
  formalityBand?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  texture?: string | null;
  silhouette?: string | null;
  waterResistant?: boolean;
  wearsSinceWash?: number;
  wearsBeforeWashOverride?: number | null;
  retiredAt?: string | null;
}

export async function insertGarment(
  db: Queryable,
  userId: number,
  garmentTypeId: number,
  overrides: GarmentOverrides = {},
): Promise<number> {
  const result = await db.query<{ garment_id: number }>(
    `INSERT INTO garments (
       user_id, garment_type_id, acquired_at, warmth_rating, formality_band,
       primary_color, secondary_color, texture, silhouette, water_resistant,
       wears_since_wash, wears_before_wash_override, retired_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING garment_id`,
    [
      userId,
      garmentTypeId,
      overrides.acquiredAt ?? null,
      // formality_band / warmth_rating are NOT NULL (db/migrations/002).
      // Default both to the mid band so a test that doesn't care can stay
      // silent; a test exercising the formality or warmth filter must pass
      // explicit values (a mid-band default sits inside most filter windows).
      overrides.warmthRating ?? 3,
      overrides.formalityBand ?? 3,
      overrides.primaryColor ?? 'blue',
      overrides.secondaryColor ?? null,
      overrides.texture ?? null,
      overrides.silhouette ?? null,
      overrides.waterResistant ?? false,
      overrides.wearsSinceWash ?? 0,
      overrides.wearsBeforeWashOverride ?? null,
      overrides.retiredAt ?? null,
    ],
  );
  return result.rows[0].garment_id;
}

export interface OutfitOverrides {
  status?: string;
  wornOn?: string | null;
  origin?: string;
  requestedVibe?: string | null;
  weatherTempC?: number | null;
  weatherCondition?: string | null;
  occasion?: string | null;
  rejectionReason?: string | null;
  rationale?: string | null;
  title?: string | null;
  metaLine?: string | null;
  accentColor?: string | null;
  washColorA?: string | null;
  washColorB?: string | null;
  compositeImageKey?: string | null;
}

export async function insertOutfit(
  db: Queryable,
  userId: number,
  overrides: OutfitOverrides = {},
): Promise<number> {
  const result = await db.query<{ outfit_id: number }>(
    `INSERT INTO outfits (
       user_id, status, worn_on, origin, requested_vibe,
       weather_temp_c, weather_condition, occasion, rejection_reason, rationale,
       title, meta_line, accent_color, wash_color_a, wash_color_b, composite_image_key
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING outfit_id`,
    [
      userId,
      overrides.status ?? 'proposed',
      overrides.wornOn ?? null,
      overrides.origin ?? 'agent',
      overrides.requestedVibe ?? null,
      overrides.weatherTempC ?? null,
      overrides.weatherCondition ?? null,
      overrides.occasion ?? null,
      overrides.rejectionReason ?? null,
      overrides.rationale ?? null,
      overrides.title ?? null,
      overrides.metaLine ?? null,
      overrides.accentColor ?? null,
      overrides.washColorA ?? null,
      overrides.washColorB ?? null,
      overrides.compositeImageKey ?? null,
    ],
  );
  return result.rows[0].outfit_id;
}

export async function linkOutfitGarment(
  db: Queryable,
  outfitId: number,
  garmentId: number,
  overrides: {
    verdict?: 'love' | 'not_this' | null;
    rationale?: string | null;
    hotspotX?: number | null;
    hotspotY?: number | null;
    cutoutImageKey?: string | null;
  } = {},
): Promise<void> {
  const verdict = overrides.verdict ?? null;
  await db.query(
    `INSERT INTO outfit_garments (
       outfit_id, garment_id, verdict, verdict_at,
       rationale, hotspot_x, hotspot_y, cutout_image_key
     )
     VALUES ($1, $2, $3, CASE WHEN $3::text IS NULL THEN NULL ELSE now() END,
             $4, $5, $6, $7)`,
    [
      outfitId,
      garmentId,
      verdict,
      overrides.rationale ?? null,
      overrides.hotspotX ?? null,
      overrides.hotspotY ?? null,
      overrides.cutoutImageKey ?? null,
    ],
  );
}

export async function insertCompatibilityEdge(
  db: Queryable,
  garmentAId: number,
  garmentBId: number,
  overrides: {
    polarity?: string;
    source?: string;
    writtenBy?: string;
    note?: string | null;
  } = {},
): Promise<void> {
  const a = Math.min(garmentAId, garmentBId);
  const b = Math.max(garmentAId, garmentBId);
  await db.query(
    `INSERT INTO garment_compatibility (garment_a_id, garment_b_id, polarity, source, written_by, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      a,
      b,
      overrides.polarity ?? 'never_pair',
      overrides.source ?? 'manual',
      overrides.writtenBy ?? 'user',
      overrides.note ?? null,
    ],
  );
}
