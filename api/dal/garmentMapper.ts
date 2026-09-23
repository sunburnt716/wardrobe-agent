// Shared SQL fragment + row mapper for Garment reads. Reused by garments.ts,
// outfits.ts (Outfit.pieces[].garment), and compatibility.ts (CompatibilityEdge's
// garmentA/garmentB) so every path that returns a Garment computes ageDays,
// isClean, and tags identically -- these are the "derived, not stored"
// fields called out in db/schema.sql, and they must never drift apart.
import type { Garment, GarmentLayer } from './types';

export const GARMENT_SELECT_COLUMNS = `
  g.garment_id,
  g.acquired_at,
  g.retired_at,
  CASE WHEN g.acquired_at IS NULL THEN NULL ELSE (CURRENT_DATE - g.acquired_at) END AS age_days,
  g.warmth_rating,
  g.formality_band,
  g.primary_color,
  g.secondary_color,
  g.texture,
  g.silhouette,
  g.water_resistant,
  g.wears_since_wash,
  g.last_washed_at,
  (g.wears_since_wash < COALESCE(g.wears_before_wash_override, gt.default_wears_before_wash)) AS is_clean,
  g.photo_key,
  gt.garment_type_id,
  gt.name AS type_name,
  gt.layer AS type_layer,
  gt.default_wears_before_wash AS type_default_wears_before_wash,
  COALESCE(tag_agg.tags, ARRAY[]::text[]) AS tags
`;

export const GARMENT_FROM_CLAUSE = `
  FROM garments g
  JOIN garment_types gt ON gt.garment_type_id = g.garment_type_id
  LEFT JOIN LATERAL (
    SELECT array_agg(t.tag ORDER BY t.tag) AS tags
    FROM garment_tags t
    WHERE t.garment_id = g.garment_id
  ) tag_agg ON TRUE
`;

export interface GarmentRow {
  garment_id: number;
  acquired_at: string | null;
  retired_at: string | null;
  age_days: number | null;
  warmth_rating: number;
  formality_band: number;
  primary_color: string | null;
  secondary_color: string | null;
  texture: string | null;
  silhouette: string | null;
  water_resistant: boolean;
  wears_since_wash: number;
  last_washed_at: string | null;
  is_clean: boolean;
  photo_key: string | null;
  garment_type_id: number;
  type_name: string;
  type_layer: GarmentLayer;
  type_default_wears_before_wash: number;
  tags: string[];
}

export function mapGarmentRow(row: GarmentRow): Garment {
  return {
    id: row.garment_id,
    type: {
      id: row.garment_type_id,
      name: row.type_name,
      layer: row.type_layer,
      defaultWearsBeforeWash: row.type_default_wears_before_wash,
    },
    acquiredAt: row.acquired_at,
    retiredAt: row.retired_at,
    ageDays: row.age_days,
    warmthRating: row.warmth_rating,
    formalityBand: row.formality_band,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    texture: row.texture,
    silhouette: row.silhouette,
    waterResistant: row.water_resistant,
    wearsSinceWash: row.wears_since_wash,
    lastWashedAt: row.last_washed_at,
    isClean: row.is_clean,
    photoKey: row.photo_key,
    tags: row.tags,
  };
}
