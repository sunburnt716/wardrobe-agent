import {
  acceptOutfit,
  createGarment,
  deleteCompatibilityEdge,
  getOutfit,
  logManualOutfit,
  markOutfitWorn,
  rejectOutfit,
  retireGarment,
  rewearOutfit,
  setCompatibilityEdge,
  setPieceVerdict,
  updateGarment,
  washGarment,
  type CreateGarmentInput,
  type LogManualOutfitInput,
  type PieceVerdict,
  type SetCompatibilityEdgeInput,
  type UpdateGarmentInput,
} from '../dal';
import { InvariantViolation } from '../../db/errors';
import type { RequestContext } from './context';
import {
  edgeResult,
  garmentResult,
  invariantResult,
  outfitResult,
  type ActionResult,
} from './actionResult';

// Same thinness as Query.ts: no validation, no ownership check, no legality
// decision here -- all of that is DAL-side, because the agent bypasses this
// layer entirely and calls DAL functions directly. A resolver longer than a
// few lines is a signal something belongs one layer down.
//
// Transaction boundaries are opened here, not in the DAL (see the
// server/transaction dev spec §0/§3): single-statement writes pass
// ctx.pool straight through; multi-statement writes call
// ctx.withTransaction and pass the resulting TxClient in.
export const Mutation = {
  createGarment: (
    _parent: unknown,
    { input }: { input: CreateGarmentInput },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) =>
      garmentResult(await createGarment(tx, ctx.userId, input)),
    ),

  updateGarment: (
    _parent: unknown,
    { id, input }: { id: string; input: UpdateGarmentInput },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) =>
      garmentResult(await updateGarment(tx, ctx.userId, Number(id), input)),
    ),

  retireGarment: async (
    _parent: unknown,
    { id }: { id: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    garmentResult(await retireGarment(ctx.pool, ctx.userId, Number(id))),

  washGarment: async (
    _parent: unknown,
    { id }: { id: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    garmentResult(await washGarment(ctx.pool, ctx.userId, Number(id))),

  acceptOutfit: async (
    _parent: unknown,
    { id }: { id: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    outfitResult(await acceptOutfit(ctx.pool, ctx.userId, Number(id))),

  rejectOutfit: async (
    _parent: unknown,
    { id, reason }: { id: string; reason?: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    outfitResult(
      await rejectOutfit(ctx.pool, ctx.userId, Number(id), reason),
    ),

  markOutfitWorn: (
    _parent: unknown,
    { id, wornOn }: { id: string; wornOn?: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) =>
      outfitResult(await markOutfitWorn(tx, ctx.userId, Number(id), wornOn)),
    ),

  logManualOutfit: (
    _parent: unknown,
    { input }: { input: LogManualOutfitInput },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) => {
      try {
        return outfitResult(await logManualOutfit(tx, ctx.userId, input));
      } catch (err) {
        if (err instanceof InvariantViolation) return invariantResult(err);
        throw err;
      }
    }),

  rewearOutfit: (
    _parent: unknown,
    { id, wornOn }: { id: string; wornOn?: string },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) =>
      outfitResult(await rewearOutfit(tx, ctx.userId, Number(id), wornOn)),
    ),

  // Longer than the other resolvers on purpose: the two guards below are
  // shape validation (is this request well-formed against the outfit it
  // names), not invariants. They live here rather than the DAL because
  // verdicts are a user-only action with no agent write path -- see
  // .claude/CLAUDE.md. Cross-tenant scoping still happens in the DAL.
  setPieceVerdict: async (
    _parent: unknown,
    {
      outfitId,
      garmentId,
      verdict,
    }: { outfitId: string; garmentId: string; verdict?: PieceVerdict | null },
    ctx: RequestContext,
  ): Promise<ActionResult> => {
    const outfit = await getOutfit(ctx.pool, ctx.userId, Number(outfitId));
    if (!outfit) {
      return { success: false, code: 'NOT_FOUND', message: 'Outfit not found.' };
    }
    if (outfit.status === 'rejected') {
      return {
        success: false,
        code: 'OUTFIT_REJECTED',
        message: 'This outfit was rejected; piece verdicts are closed.',
      };
    }
    if (!outfit.pieces.some((p) => p.garment.id === Number(garmentId))) {
      return {
        success: false,
        code: 'GARMENT_NOT_IN_OUTFIT',
        message: 'That garment is not part of this outfit.',
      };
    }
    return outfitResult(
      await setPieceVerdict(
        ctx.pool,
        ctx.userId,
        Number(outfitId),
        Number(garmentId),
        verdict ?? null,
      ),
    );
  },

  // source/writtenBy are hardcoded here, never read from client input --
  // SetCompatibilityEdgeInput has no source field in the SDL. The agent's
  // tool wrapper (not this file) is the only caller that ever passes
  // source: 'learned' to the DAL directly.
  setCompatibilityEdge: (
    _parent: unknown,
    { input }: { input: SetCompatibilityEdgeInput },
    ctx: RequestContext,
  ): Promise<ActionResult> =>
    ctx.withTransaction(async (tx) => {
      try {
        return edgeResult(
          await setCompatibilityEdge(tx, ctx.userId, input),
        );
      } catch (err) {
        if (err instanceof InvariantViolation) return invariantResult(err);
        throw err;
      }
    }),

  deleteCompatibilityEdge: async (
    _parent: unknown,
    { garmentAId, garmentBId }: { garmentAId: string; garmentBId: string },
    ctx: RequestContext,
  ): Promise<ActionResult> => {
    const deleted = await deleteCompatibilityEdge(
      ctx.pool,
      ctx.userId,
      Number(garmentAId),
      Number(garmentBId),
    );
    return deleted
      ? { success: true }
      : {
          success: false,
          code: 'NOT_FOUND',
          message: 'Compatibility edge not found.',
        };
  },
};
