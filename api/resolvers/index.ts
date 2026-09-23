import { Query } from './Query';
import { Mutation } from './Mutation';
import { Garment } from './Garment';
import { enumResolvers } from './enums';

// No Outfit.ts / OutfitPiece.ts: Outfit.pieces (each with .garment, .verdict,
// .verdictAt) already sits on the domain object returned by
// api/dal/outfits.ts (mapOutfitRow embeds it on every read), so both the
// list and each piece's fields fall through to GraphQL's default resolver --
// see the comment in loaders.ts/Garment.ts for why this DAL embeds some
// relations eagerly and defers others.
export const resolvers = {
  Query,
  Mutation,
  Garment,
  ...enumResolvers,
};
