// Test database bootstrap. Connects to a disposable database (never the
// app's own DATABASE_URL -- see composition.ts) and applies db/schema.sql
// verbatim, so the test suite runs against the actual production schema,
// never a hand-maintained parallel copy that could drift from it.
//
// Requires DATABASE_URL_TEST in the environment, pointing at a database a
// test role can freely write to (CREATE TABLE / DROP TABLE / INSERT /
// DELETE). Fails loudly at import time if it's unset -- the DAL test suite
// should never silently skip or fall back to the real database.
import './pgTypeParsers';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import {
  withTransaction,
  type Connectable,
  type TxClient,
} from './transaction';

const connectionString = process.env.DATABASE_URL_TEST;
if (!connectionString) {
  throw new Error(
    'db/testDb: DATABASE_URL_TEST is not set. Point it at a disposable ' +
      'test database (e.g. postgres://user:pass@localhost:5432/wardrobe_agent_test) ' +
      'before running the DAL suite.',
  );
}

export const testPool: Pool = new Pool({ connectionString });

// db/schema.sql uses plain CREATE TABLE (not IF NOT EXISTS) by design --
// its own header comment says it's meant to fail loudly on a stale/partial
// database rather than silently skip. So resetting means dropping
// everything first. Only ever call this against DATABASE_URL_TEST.
export async function resetTestSchema(): Promise<void> {
  await testPool.query(
    `DROP TABLE IF EXISTS outfit_garments, outfits, garment_compatibility, garment_tags, garments, garment_types, users CASCADE`,
  );
  const schemaSql = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  await testPool.query(schemaSql);
}

// Sentinel thrown by withRollback's fn wrapper so the *real* withTransaction
// (imported unchanged, no second brand cast -- see db/transaction.ts's
// "exactly once" rule and .claude/CLAUDE.md's explicit call-out of it)
// always takes its ROLLBACK path, never COMMIT, regardless of whether the
// test's own fn succeeded or threw a different error.
class ForcedRollback extends Error {
  constructor(readonly value: unknown) {
    super('db/testDb: forced rollback for test isolation (not a real failure)');
  }
}

// Transaction-per-test: runs fn inside a real transaction via the
// production withTransaction, then forces a rollback so nothing a test
// does is ever committed -- no manual cleanup between tests, and no new
// brand-cast call site. If fn itself throws (e.g. asserting on an
// InvariantViolation), that error propagates through withTransaction's own
// rollback path and out of this function unchanged; only a normal return
// from fn gets intercepted and rolled back.
export async function withRollback<T>(
  pool: Connectable,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  try {
    await withTransaction(pool, async (tx) => {
      const result = await fn(tx);
      throw new ForcedRollback(result);
    });
    throw new Error(
      'db/testDb: withRollback expected a forced rollback but got a commit',
    );
  } catch (err) {
    if (err instanceof ForcedRollback) {
      return err.value as T;
    }
    throw err;
  }
}
