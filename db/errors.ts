// The invariant error taxonomy. Thrown only from the DAL -- resolvers throw
// shape errors, never invariant errors. `code` is the stable contract (Tier
// 1 evals and the GraphQL error mask assert on it); `message` is
// human-facing only and may be reworded freely.
//
// Open decision, not resolved here (see the server/transaction dev spec
// §7): whether InvariantCode should stay a compile-time TS union or move to
// data validated at boot, once an eval-harness registry exists that wants
// to define checks without a code change. NOT_OWNED was the first code;
// this is the second, per the spec's "decide before the second, not the
// tenth" -- still not decided, now genuinely due.
//
// OUTFIT_INCOMPATIBLE_PAIR's throw site is proposeOutfit (api/dal/outfits.ts)
// -- it checks garment_compatibility for a 'never_pair' edge among the
// proposed garment_ids before inserting. GARMENT_NOT_AVAILABLE is also
// thrown there, for a garment_id that isn't currently retired=false+clean --
// i.e. one get_candidates would not have returned this turn. OUTFIT_INCOMPLETE
// is thrown there too, when the proposed set doesn't cover every required
// structural slot (top / bottom / footwear -- see
// api/dal/outfitComposition.ts). The model asserting a garment is valid, or
// that a two-piece set is a whole outfit, is not evidence that it is (see
// the tool layer dev spec's propose_outfit behavior).
//
// OUTFIT_INCOMPLETE is the 4th code and, like the 2nd and 3rd, is added to
// this union directly -- the §7 "where does InvariantCode live" decision is
// still open, and every code so far has been a union member, so this keeps
// the de-facto answer consistent rather than committing to a new one.
export type InvariantCode =
  | 'NOT_OWNED'
  | 'OUTFIT_INCOMPATIBLE_PAIR'
  | 'GARMENT_NOT_AVAILABLE'
  | 'OUTFIT_INCOMPLETE';

export class InvariantViolation extends Error {
  constructor(
    readonly code: InvariantCode,
    readonly detail: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'InvariantViolation';
  }
}
