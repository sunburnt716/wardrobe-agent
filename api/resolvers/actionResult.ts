// Mirrors the GraphQL ActionResult type (api/schema.graphql). Mutation
// resolvers build one of these from a DAL result instead of throwing --
// "not found" / "not yours" / "already retired" are expected business
// outcomes a well-behaved client can act on, not unexpected failures (see
// the resolver-layer dev spec's §9).
import type { CompatibilityEdge, Garment, Outfit } from '../dal';
import type { InvariantViolation } from '../../db/errors';

export interface ActionResult {
  success: boolean;
  code?: string;
  message?: string;
  garment?: Garment | null;
  outfit?: Outfit | null;
  edge?: CompatibilityEdge | null;
}

// A null from the DAL is deliberately ambiguous between "doesn't exist" and
// "isn't yours" -- see getGarment's comment in api/dal/garments.ts. Do not
// try to tell those apart here either.
export function garmentResult(garment: Garment | null): ActionResult {
  return garment
    ? { success: true, garment }
    : { success: false, code: 'NOT_FOUND', message: 'Garment not found.' };
}

export function outfitResult(outfit: Outfit | null): ActionResult {
  return outfit
    ? { success: true, outfit }
    : { success: false, code: 'NOT_FOUND', message: 'Outfit not found.' };
}

export function edgeResult(edge: CompatibilityEdge): ActionResult {
  return { success: true, edge };
}

// InvariantViolation.message is just its code (Error's message ctor arg) --
// detail carries the operands, which may include ids that aren't the
// client's business to see. Never forward err.message/err.detail directly
// (same "don't leak Postgres error text" rule the spec applies to
// constraint violations). Log the full error for debugging (same pattern as
// db/transaction.ts's withTransaction), return a generic message.
export function invariantResult(err: InvariantViolation): ActionResult {
  console.error('[resolvers] invariant violation:', err.code, err.detail);
  return {
    success: false,
    code: err.code,
    message: 'One or more referenced garments do not belong to you.',
  };
}
