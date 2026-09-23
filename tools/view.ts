// The DAL-row -> model-view projection (tool layer dev spec §5). Every
// field here is something the model may reason about; fields are excluded
// deliberately, not by omission -- see the table in the spec for why each
// excluded field was cut.
import type { Garment } from '../api/dal/types';

export interface GarmentView {
  id: string; // stable; the model references this, never describes garments in prose
  type: string; // garment_types.layer -- the structural slot, not the specific type name
  // garment_types.name -- the specific kind ('oxford shirt', 'chelsea boot').
  // Added so the model can write a per-piece rationale that names the garment
  // ("the merino crewneck") instead of just its slot.
  name: string;
  color: string;
  secondary_color: string | null;
  texture: string | null;
  // Raw 1-5 formality band (1 = most casual, 5 = most formal), straight from
  // the column the pre-filter uses. Not a label: see tools/formality.ts.
  formality: number;
  last_worn_days_ago: number | null; // null = never worn
}

export function toModelView(
  garment: Garment,
  lastWornDaysAgo: number | null,
): GarmentView {
  return {
    id: String(garment.id),
    type: garment.type.layer,
    name: garment.type.name,
    color: garment.primaryColor ?? 'unspecified',
    secondary_color: garment.secondaryColor,
    texture: garment.texture,
    formality: garment.formalityBand,
    last_worn_days_ago: lastWornDaysAgo,
  };
}
