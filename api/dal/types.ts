// TS shapes mirroring api/schema.graphql. Field names match the GraphQL
// types field-for-field so resolvers can pass these straight through.
//
// Enum values here are the lowercase/snake_case forms stored in Postgres
// (matching the CHECK constraints in db/schema.sql), not the uppercase
// GraphQL enum names (BASE, PROPOSED, ...). That translation is a resolver
// concern, not a DAL one.

export type GarmentLayer =
  | 'base'
  | 'mid'
  | 'outer'
  | 'bottom'
  | 'footwear'
  | 'accessory';

export type OutfitStatus = 'proposed' | 'accepted' | 'rejected' | 'worn';
export type OutfitOrigin = 'agent' | 'manual';
export type PieceVerdict = 'love' | 'not_this';
export type CompatibilityPolarity = 'pairs_well' | 'never_pair';
export type CompatibilitySource = 'learned' | 'manual';
export type Actor = 'user' | 'agent';

// --- Object types ----------------------------------------------------------

export interface User {
  id: number;
  displayName: string;
  genderIdentity: string | null;
  serviceStartedAt: string; // date (YYYY-MM-DD)
}

export interface GarmentType {
  id: number;
  name: string;
  layer: GarmentLayer;
  defaultWearsBeforeWash: number;
}

export interface Garment {
  id: number;
  type: GarmentType;
  acquiredAt: string | null;
  retiredAt: string | null;
  ageDays: number | null;
  // NOT NULL in the schema (db/migrations/002) -- always a 1-5 band.
  warmthRating: number;
  formalityBand: number;
  primaryColor: string | null;
  secondaryColor: string | null;
  texture: string | null;
  silhouette: string | null;
  waterResistant: boolean;
  wearsSinceWash: number;
  lastWashedAt: string | null;
  isClean: boolean;
  photoKey: string | null;
  tags: string[];
  // incompatibleWith is deliberately not a field here. It's its own relation
  // (see compatibility.ts: getIncompatibleEdgesForGarment) so a plain garment
  // read never pays for a compatibility-table join it didn't ask for.
}

// One garment as it sits inside a specific outfit, carrying the user's
// piece-level verdict for that (outfit, garment) pair. verdict is null when
// the user hasn't reacted to this piece (the common case); verdictAt tracks
// it 1:1 (see the verdict_pair_null constraint in db/schema.sql).
export interface OutfitPiece {
  garment: Garment;
  verdict: PieceVerdict | null;
  verdictAt: string | null; // timestamptz, ISO string
  // Presentation (db/migrations/004). rationale is agent-authored (why this
  // piece); hotspotX/Y (normalized 0..1) and cutoutImageKey come from the
  // extraction pipeline. All null until written by their respective author.
  rationale: string | null;
  hotspotX: number | null;
  hotspotY: number | null;
  cutoutImageKey: string | null;
}

export interface Outfit {
  id: number;
  status: OutfitStatus;
  origin: OutfitOrigin;
  proposedAt: string; // timestamptz, ISO string
  wornOn: string | null;
  requestedVibe: string | null;
  weatherTempC: number | null;
  weatherCondition: string | null;
  occasion: string | null;
  rejectionReason: string | null;
  rationale: string | null;
  // Agent-authored look-card presentation (db/migrations/004); compositeImageKey
  // is written later by the extraction pipeline. Null on an un-rendered proposal.
  title: string | null;
  metaLine: string | null;
  accentColor: string | null;
  washColorA: string | null;
  washColorB: string | null;
  compositeImageKey: string | null;
  // Replaces a flat `garments: Garment[]`: every read carries the
  // per-piece verdict alongside the garment, since a verdict has no meaning
  // outside the look it was given in.
  pieces: OutfitPiece[];
}

export interface CompatibilityEdge {
  garmentA: Garment;
  garmentB: Garment;
  polarity: CompatibilityPolarity;
  source: CompatibilitySource;
  writtenBy: Actor;
  note: string | null;
  createdAt: string;
}

// --- Query filter / arg shapes (mirroring GraphQL input types) -------------

export interface IntRange {
  min?: number;
  max?: number;
}

export interface GarmentFilters {
  layers?: GarmentLayer[];
  includeRetired?: boolean;
  onlyClean?: boolean;
  formalityBand?: IntRange;
  tags?: string[];
  // Matches a garment whose primary OR secondary color equals any of these
  // (case-insensitive). Backs the Closet filter row.
  colors?: string[];
}

export interface OutfitFilters {
  statuses?: OutfitStatus[];
  wornSince?: string;
  wornBefore?: string;
  limit?: number;
}

export interface OutfitContext {
  tempC: number;
  weatherCondition?: string;
  occasion?: string;
  requestedVibe?: string;
  formalityTarget?: number;
}

// --- Mutation input shapes ---------------------------------------------------

export interface CreateGarmentInput {
  garmentTypeId: number;
  acquiredAt?: string;
  warmthRating?: number;
  formalityBand?: number;
  primaryColor?: string;
  secondaryColor?: string;
  texture?: string;
  silhouette?: string;
  waterResistant?: boolean;
  wearsBeforeWashOverride?: number;
  photoKey?: string;
  tags?: string[];
}

// A key is present-and-set to overwrite that column, or absent to leave it
// untouched -- there's no separate "clear this field" sentinel, matching
// what the nullable-but-optional GraphQL input itself can express.
export interface UpdateGarmentInput {
  acquiredAt?: string | null;
  // No `| null`: both columns are NOT NULL (db/migrations/002). Omit the key
  // to leave the value untouched; there is no "clear it" for these two.
  warmthRating?: number;
  formalityBand?: number;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  texture?: string | null;
  silhouette?: string | null;
  waterResistant?: boolean;
  wearsBeforeWashOverride?: number | null;
  photoKey?: string | null;
  tags?: string[];
}

export interface LogManualOutfitInput {
  garmentIds: number[];
  wornOn: string;
  requestedVibe?: string;
  weatherTempC?: number;
  weatherCondition?: string;
  occasion?: string;
}

// Backs proposeOutfit (agent-only entry point; see api/dal/outfits.ts and
// the tool layer dev spec's propose_outfit). The weather/occasion/vibe
// fields are the decision-time snapshot (db/schema.sql) -- the tool handler
// sources them from the ambient AgentContext and the get_candidates call
// earlier in the same conversation, never from propose_outfit's own model
// input, so the model cannot fabricate what it was told.
export interface ProposeOutfitInput {
  garmentIds: number[];
  rationale: string;
  requestedVibe?: string;
  weatherTempC?: number;
  weatherCondition?: string;
  occasion?: string;
  // Look-card presentation (db/migrations/004). Optional and currently
  // unset by the propose_outfit tool -- the columns and this write path
  // exist so widening the tool schema is the only remaining step. Never
  // sourced from the extraction pipeline's fields (composite/cutout/hotspot).
  title?: string;
  metaLine?: string;
  accentColor?: string;
  washColorA?: string;
  washColorB?: string;
  // Per-piece rationale, keyed by garment id. Ids not in garmentIds are
  // ignored.
  pieceRationales?: { garmentId: number; rationale: string }[];
}

// Backs get_wardrobe_summary. confirmedOutfitsCount counts worn_on IS NOT
// NULL rows -- the proposal/reality boundary (.claude/CLAUDE.md) -- not
// status = 'accepted', which is still just an unworn proposal.
//
// byLayer keys on garment_types.layer ('base'/'mid'/'outer'/'bottom'/
// 'footwear'/'accessory'), not garment_types.name -- the summary exists to
// answer "what does the user own" at the structural-slot level a proposal
// needs to fill, not enumerate every distinct type name. Same choice as
// get_candidates' counts_by_type (see tools/view.ts).
export interface WardrobeSummary {
  totalGarments: number;
  byLayer: Record<string, number>;
  byFormality: Record<string, number>;
  unavailableCount: number;
  confirmedOutfitsCount: number;
}

// Backs get_recent_outfits. One row per garment, most-recently-worn first --
// see api/dal/outfits.ts's getRecentlyWornGarments for the derivation.
export interface RecentlyWornGarment {
  garmentId: number;
  garmentTypeName: string;
  lastWornOn: string;
}

// Backs get_outfit_feedback (feature 6). One entry per recent outfit that
// carries explicit user feedback -- a rejection reason, or at least one
// piece-level verdict. Positive and negative signal in one payload so the
// agent can steer toward loved pairings and away from rejected ones.
export interface OutfitFeedbackPiece {
  garmentId: number;
  garmentTypeName: string;
  verdict: PieceVerdict | null;
}

export interface OutfitFeedback {
  outfitId: number;
  status: OutfitStatus;
  wornOn: string | null;
  rejectionReason: string | null;
  proposedAt: string;
  pieces: OutfitFeedbackPiece[];
}

export interface SetCompatibilityEdgeInput {
  garmentAId: number;
  garmentBId: number;
  polarity: CompatibilityPolarity;
  note?: string;
}
