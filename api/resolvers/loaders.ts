import type { Pool } from 'pg';
import DataLoader from 'dataloader';
import { getEdgesTouchingGarments, type CompatibilityEdge } from '../dal';

// Only one loader here, not the four a generic "one loader per relation"
// pass would produce. api/dal/garmentMapper.ts and outfits.ts's
// mapOutfitRow deliberately join garment_types and garment_tags eagerly
// onto Garment, and outfit_garments eagerly onto Outfit -- so
// Garment.type, Garment.tags, and Outfit.pieces already sit on the
// parent object and fall through to GraphQL's default resolver with zero
// extra queries. Garment.incompatibleWith is the one relation the DAL
// deliberately does NOT embed (a plain garment read shouldn't pay for the
// compatibility-table join), so it's the only field that needs batching.
export interface Loaders {
  edgesTouching: DataLoader<number, CompatibilityEdge[]>;
}

// Constructed once per request (see context.ts) -- a loader built at module
// scope would cache across requests and could serve one user's data to
// another with no query to trace, since no query would even run on a cache
// hit. userId is captured in the closure below at construction time; every
// .load() call after that takes only the batch key.
export function buildLoaders(pool: Pool, userId: number): Loaders {
  return {
    edgesTouching: new DataLoader<number, CompatibilityEdge[]>(
      async (garmentIds) => {
        const requested = new Set(garmentIds);
        const edges = await getEdgesTouchingGarments(
          pool,
          userId,
          [...garmentIds],
        );

        const byGarment = new Map<number, CompatibilityEdge[]>();
        for (const edge of edges) {
          for (const id of [edge.garmentA.id, edge.garmentB.id]) {
            if (!requested.has(id)) continue;
            if (!byGarment.has(id)) byGarment.set(id, []);
            byGarment.get(id)!.push(edge);
          }
        }

        // Map over keys, never over rows: an edge touching zero of the
        // requested ids produces no entry, and DataLoader requires the
        // result array to match garmentIds 1:1 in length and order.
        return garmentIds.map((id) => byGarment.get(id) ?? []);
      },
    ),
  };
}
