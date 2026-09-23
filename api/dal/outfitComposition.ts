// What makes a set of garments a *complete* outfit, structurally. Used by
// proposeOutfit (api/dal/outfits.ts) to reject a proposal that skips a
// required slot, and by get_candidates (tools/getCandidates.ts) to tell the
// model up front which required slots it actually has options for.
//
// "Required" here is the minimum a dressed person needs: something on top,
// something on the bottom, something on the feet. mid / outer / accessory
// are additive -- a sweater, a coat, a scarf -- and never required.
//
// KNOWN LIMITATION: `base` currently means "worn against the skin on the
// torso" for tops but garment_types also allows non-torso base items. As of
// db/seed.sql socks are modelled as `accessory`, not `base`, precisely so
// "has a base garment" reliably means "has a top". If a future garment type
// puts hosiery or similar back under `base`, this check needs a real
// top-vs-other distinction (a role on garment_types), not a layer.
import type { GarmentLayer } from './types';

// Order matters: missingRequiredLayers reports gaps in this order, which is
// also head-to-toe reading order for a human-facing message.
export const REQUIRED_OUTFIT_LAYERS: readonly GarmentLayer[] = [
  'base',
  'bottom',
  'footwear',
] as const;

// The required layers not covered by `present`, in REQUIRED_OUTFIT_LAYERS
// order. Empty array => the set covers every required slot.
export function missingRequiredLayers(
  present: readonly GarmentLayer[],
): GarmentLayer[] {
  const have = new Set(present);
  return REQUIRED_OUTFIT_LAYERS.filter((layer) => !have.has(layer));
}
