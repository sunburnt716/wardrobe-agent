import type { Garment as GarmentModel } from "../dal";
import type { RequestContext } from "./context";

// The only Garment field that needs a resolver. id, type, primaryColor,
// warmthRating, tags, etc. all fall through to GraphQL's default resolver
// because api/dal/garmentMapper.ts already puts matching camelCase
// properties on the domain object (see loaders.ts for why). incompatibleWith
// is the one relation the DAL deliberately doesn't embed, so it goes
// through the batched edgesTouching loader to avoid N+1 across a garment list.
export const Garment = {
  incompatibleWith: (
    garment: GarmentModel,
    _args: unknown,
    ctx: RequestContext,
  ) => ctx.loaders.edgesTouching.load(garment.id),
};
