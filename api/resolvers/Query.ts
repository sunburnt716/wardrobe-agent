import {
  getGarment,
  getOutfit,
  getUser,
  listCandidateGarments,
  listCompatibilityEdges,
  listGarments,
  listOutfits,
  type GarmentFilters,
  type OutfitContext,
  type OutfitFilters,
} from '../dal';
import type { RequestContext } from './context';

// All two-to-three lines: read from ctx, call the matching DAL function,
// return. Root fields ignore parent. ID (string) -> SERIAL (number)
// coercion happens here, not in the DAL -- see the dev spec's §4. Every
// call passes ctx.pool as the first (Queryable) argument -- these are all
// reads, so none of them need ctx.withTransaction.
//
// Ownership is not checked in this file. getGarment(ctx.pool, ctx.userId, id)
// and getOutfit(ctx.pool, ctx.userId, id) scope inside the DAL query; a
// garment or outfit belonging to someone else returns null, indistinguishable
// from one that doesn't exist.
export const Query = {
  me: (_parent: unknown, _args: unknown, ctx: RequestContext) =>
    getUser(ctx.pool, ctx.userId),

  garment: (
    _parent: unknown,
    { id }: { id: string },
    ctx: RequestContext,
  ) => getGarment(ctx.pool, ctx.userId, Number(id)),

  garments: (
    _parent: unknown,
    { filters }: { filters?: GarmentFilters },
    ctx: RequestContext,
  ) => listGarments(ctx.pool, ctx.userId, filters),

  candidateGarments: (
    _parent: unknown,
    { context }: { context: OutfitContext },
    ctx: RequestContext,
  ) => listCandidateGarments(ctx.pool, ctx.userId, context),

  outfit: (
    _parent: unknown,
    { id }: { id: string },
    ctx: RequestContext,
  ) => getOutfit(ctx.pool, ctx.userId, Number(id)),

  outfits: (
    _parent: unknown,
    { filters }: { filters?: OutfitFilters },
    ctx: RequestContext,
  ) => listOutfits(ctx.pool, ctx.userId, filters),

  compatibility: (
    _parent: unknown,
    { garmentIds }: { garmentIds: string[] },
    ctx: RequestContext,
  ) => listCompatibilityEdges(ctx.pool, ctx.userId, garmentIds.map(Number)),
};
