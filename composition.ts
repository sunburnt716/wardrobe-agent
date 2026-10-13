// Owns config load/validate, pool construction, and the withTransaction
// binding. Imported by both entry points (server.ts and agent/runtime.ts)
// and imports neither -- the agent bypasses GraphQL entirely, so pool
// construction can't live behind server.ts's HTTP listener as a side
// effect. Exactly one Pool per process, constructed here.
import { existsSync } from 'node:fs';
import path from 'node:path';
import './db/pgTypeParsers';
import { Pool } from 'pg';
import { withTransaction as txWithTransaction, type TxClient } from './db/transaction';
import {
  OpenMeteoWeatherProvider,
  type Location,
  type WeatherProvider,
} from './agent/weather';

// Load .env before reading any config below. Both entry points import this
// module (server.ts, agent/runtime.ts) and neither loads its own config, so
// this is the single place a .env is applied -- process.loadEnvFile does not
// overwrite variables already set in the real environment, so CI and any
// shell that exports DATABASE_URL/ANTHROPIC_API_KEY directly keep working.
// No-op (not fatal) when the file is absent -- that's a valid deployment.
const envPath = path.join(__dirname, '.env');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'composition: DATABASE_URL is not set. Refusing to construct a pool ' +
      'that would fail on first use instead of at boot.',
  );
}

export const pool = new Pool({ connectionString });

// One provider per process, shared by both entry points for the same reason
// the pool is: server.ts's Query.weather and agent/runtime.ts's loop both
// forecast, and neither should construct its own.
export const weatherProvider: WeatherProvider = new OpenMeteoWeatherProvider();

// Used when a user has no stored coordinates (db/migrations/005 leaves them
// null until the client reports a location). Forecasting somewhere plausible
// is the same floor agent/weather.ts's FALLBACK_SNAPSHOT provides: a
// degraded forecast, never a failed one. Clients detect "no location yet"
// from User.latitude being null, not from this value.
export const FALLBACK_LOCATION: Location = {
  latitude: 40.7128,
  longitude: -74.006,
};

// agent/weather.ts is Fahrenheit internally (stated_temp_f is part of the
// agent's tool vocabulary); every persisted and API-facing temperature is
// Celsius. Same conversion tools/proposeOutfit.ts applies before writing
// outfits.weather_temp_c -- storage and transport stay in one unit, and
// display-unit preference is a presentation concern.
export function tempFToC(tempF: number): number {
  return Math.round((tempF - 32) * (5 / 9));
}

export function withTransaction<T>(
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  return txWithTransaction(pool, fn);
}

// Boot check: fail fast and exit non-zero rather than starting a listener
// that would return 500s for every request. Callers (server.ts,
// agent/runtime.ts) await this before doing anything else.
export async function assertDatabaseReachable(): Promise<void> {
  await pool.query('SELECT 1');
}
