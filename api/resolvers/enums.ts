// Top-level keys in the resolver map, alongside Query and Mutation -- not
// nested inside them. Without this, a resolver receives the GraphQL enum
// string ("FOOTWEAR") as-is, passes it straight to SQL, matches zero rows,
// and silently returns []. NEVER_PAIR -> never_pair is why a blanket
// .toLowerCase() isn't a substitute for this map.
export const enumResolvers = {
  GarmentLayer: {
    BASE: 'base',
    MID: 'mid',
    OUTER: 'outer',
    BOTTOM: 'bottom',
    FOOTWEAR: 'footwear',
    ACCESSORY: 'accessory',
  },
  OutfitStatus: {
    PROPOSED: 'proposed',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    WORN: 'worn',
  },
  OutfitOrigin: {
    AGENT: 'agent',
    MANUAL: 'manual',
  },
  PieceVerdict: {
    LOVE: 'love',
    NOT_THIS: 'not_this',
  },
  CompatibilityPolarity: {
    PAIRS_WELL: 'pairs_well',
    NEVER_PAIR: 'never_pair',
  },
  CompatibilitySource: {
    LEARNED: 'learned',
    MANUAL: 'manual',
  },
  Actor: {
    USER: 'user',
    AGENT: 'agent',
  },
};
