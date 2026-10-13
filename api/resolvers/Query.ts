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
import { FALLBACK_LOCATION, tempFToC } from '../../composition';
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

  // Thicker than the rest of this file by necessity: the forecast is not a
  // DAL read, so the location lookup, the fallback, and the F->C conversion
  // have nowhere else to sit. It stays a read of two sources, not a
  // decision -- no legality question is being answered here.
  weather: async (_parent: unknown, _args: unknown, ctx: RequestContext) => {
    const user = await getUser(ctx.pool, ctx.userId);
    const location =
      user?.latitude !== null && user?.longitude !== null && user !== null
        ? { latitude: user.latitude, longitude: user.longitude }
        : FALLBACK_LOCATION;

    const snapshot = await ctx.weatherProvider.forecast(location, new Date());
    return {
      tempC: tempFToC(snapshot.tempF),
      condition: snapshot.condition,
      source: snapshot.source,
    };
  },

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
