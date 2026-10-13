import type { Pool } from 'pg';
import { pool, weatherProvider, withTransaction } from '../../composition';
import type { WeatherProvider } from '../../agent/weather';
import type { TxClient } from '../../db/transaction';
import { buildLoaders, type Loaders } from './loaders';

export type Actor = 'user' | 'agent';

// Built once per request, before execution, and shared by every resolver in
// that request. The client cannot set any of it -- that's what makes it
// safe to hold identity. No resolver takes a userId parameter; there is
// nothing to spoof.
export interface RequestContext {
  userId: number;
  actor: Actor;
  loaders: Loaders;
  // Single-statement reads/writes pass this straight to the DAL. Bare Pool
  // satisfies Queryable structurally, so this is fine for anything that
  // doesn't need transactional atomicity -- see db/transaction.ts.
  pool: Pool;
  // Multi-statement writes (createGarment, updateGarment, markOutfitWorn,
  // logManualOutfit, setCompatibilityEdge) call this instead of passing
  // ctx.pool -- it opens a transaction and hands the resolver a branded
  // TxClient, which is the only thing those DAL functions will accept.
  withTransaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>;
  // Injected rather than imported at the resolver so Query.weather can be
  // tested against a fake provider without a network call.
  weatherProvider: WeatherProvider;
}

interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
}

// Phase 1 stub: no real auth yet. Reads x-user-id if present, otherwise
// defaults to user 1 (the only seeded user in db/seed.sql). Real auth is
// deferred deliberately -- the shape of RequestContext doesn't change when
// it arrives, since userId is already the only thing every DAL call reads
// identity from.
export function buildContext(req: IncomingRequest): RequestContext {
  const header = req.headers['x-user-id'];
  const raw = Array.isArray(header) ? header[0] : header;
  const userId = raw !== undefined ? Number(raw) : 1;

  return {
    userId,
    actor: 'user',
    loaders: buildLoaders(pool, userId),
    pool,
    withTransaction,
    weatherProvider,
  };
}
