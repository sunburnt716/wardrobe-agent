/**
 * UI data shapes. These mirror the GraphQL schema in
 * `../../../api/schema.graphql` (Outfit, OutfitPiece, Garment, PieceVerdict)
 * so that wiring the real API later is a drop-in: the screens are already
 * coded against these types, they just happen to be fed by `mock.ts` today.
 *
 * Fields marked "placeholder" have no backend source yet — they stand in for
 * real garment photography / the extraction pipeline's output (see the
 * handoff README's Fidelity note).
 */

export type Verdict = 'LOVE' | 'NOT_THIS';

export type GarmentLayer =
  | 'base'
  | 'mid'
  | 'outer'
  | 'bottom'
  | 'footwear'
  | 'accessory';

export interface GarmentChip {
  /** Phosphor icon name, kebab-case (e.g. "drop", "washing-machine"). */
  icon: string;
  label: string;
  /** "warn" gets the terracotta tint (e.g. "Due a wash"). */
  tone?: 'default' | 'warn';
}

export interface Garment {
  id: string;
  name: string;
  /** Display category ("Outerwear", "Mid layer", "Shoes"). Derived from
   *  `type.layer` + role — TODO(backend): map GarmentLayer -> label. */
  category: string;
  layer: GarmentLayer;
  primaryColor: string | null;
  wearsSinceWash: number;
  /** wears_before_wash_override ?? garment_type.default_wears_before_wash.
   *  TODO(backend): surface the effective threshold on the Garment type. */
  washThreshold: number;
  isClean: boolean;
  /** Opaque storage key — no image served yet. When null, render ImageSlot. */
  photoKey: string | null;
  /** placeholder: tint behind the empty image slot until photos land. */
  tintHint: string;
  /** placeholder: phosphor icon name shown inside the empty slot. */
  iconHint: string;
}

export interface OutfitPiece {
  garment: Garment;
  verdict: Verdict | null;
  /** Agent-authored "why this piece" — shown as the detail-sheet note. */
  rationale: string | null;
  /** Status chips. TODO(backend): derive from garment attributes
   *  (waterResistant, warmthRating, isClean) rather than storing. */
  chips: GarmentChip[];
  /**
   * placeholder: [x%, y%, width%, height%] of the garment's tap region
   * within the 402x440 composite, from the design mock's guesses. The real
   * backend stores only a centroid (hotspotX/hotspotY, 0..1); the extraction
   * pipeline will need to emit width/height too, or the UI renders a
   * fixed-size circular marker at the centroid per design-spec §2.
   */
  box: [number, number, number, number] | null;
}

export interface Outfit {
  id: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'WORN';
  title: string;
  metaLine: string;
  /** Per-look accent (backend `accent_color`). UI falls back to colour.brand
   *  when null — the current mocks render everything in the single brand. */
  accentColor: string | null;
  washColorA: string;
  washColorB: string;
  compositeImageKey: string | null;
  pieces: OutfitPiece[];
}

// --- Closet ------------------------------------------------------------

export interface ClosetItem extends Garment {
  /** placeholder: deliberately uneven masonry tile heights. */
  slotHeight: number;
}

export interface ClosetFilter {
  id: string;
  label: string;
}

// --- Ask --------------------------------------------------------------

export interface ChatLookCard {
  outfitId: string;
  name: string;
  pieceCount: number;
  tintHint: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  lookCard?: ChatLookCard;
}

// --- Fits -------------------------------------------------------------

export interface FitVerdictBadge {
  label: string;
  icon: string;
  tone: 'positive' | 'neutral' | 'negative';
}

export interface FitEntry {
  id: string;
  outfitId: string;
  /** "Yesterday · Mon", "Sat 30 Aug". */
  when: string;
  name: string;
  tintHint: string;
  /** "17° wet". */
  weather: string;
  verdict: FitVerdictBadge;
}

export interface WeekDay {
  day: string; // "M"
  date: string; // "28"
  state: 'today' | 'worn' | 'future';
}

// --- Add --------------------------------------------------------------

export interface DetectedGarment {
  name: string;
  /** "Knitwear · 92%". */
  confidenceLabel: string;
  chips: GarmentChip[];
  waterResistant: boolean;
}

// --- Today status pill -----------------------------------------------

export interface WeatherContext {
  /** "18° · rain by 4". */
  label: string;
  icon: string;
}
