// Maps get_candidates' 4-value model vocabulary (tools/schemas.ts) onto
// garments.formality_band's 1-5 int scale (db/schema.sql). This is the
// forward direction only -- request label -> band target for the pre-filter.
//
// There is no reverse map any more. A garment's band is surfaced to the
// model as the raw 1-5 number (tools/view.ts), not translated back to a
// label: band 3 has no label of its own, and every string translation
// between the model and the band the DAL actually filters on is a chance for
// the two to disagree.

export type ModelFormality = 'casual' | 'smart_casual' | 'business' | 'formal';

export const FORMALITY_BAND_BY_LEVEL: Record<ModelFormality, number> = {
  casual: 1,
  smart_casual: 2,
  business: 4,
  formal: 5,
};
