// Test spec: withTransaction only, no database, no DAL, no domain objects.
// This function is generic -- it knows nothing about garments or outfits --
// so the entire suite runs against a fake with no fixtures. See
// db/transaction.ts for what's under test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTransaction, type Connectable, type Queryable } from './transaction';
import { InvariantViolation } from './errors';

const SENTINEL_RESULT = { id: 'outfit-1' };
const SENTINEL_ERROR = new InvariantViolation('OUTFIT_INCOMPATIBLE_PAIR', {});

const ok = async () => SENTINEL_RESULT;
const boom = async () => {
  throw SENTINEL_ERROR;
};

// Fake stand-in for withTransaction's first parameter. Only implements
// Connectable (connect() -> a client with query()/release()) -- see the
// Connectable narrowing in db/transaction.ts, which exists specifically so
// this fake doesn't need to stub the rest of pg.Pool's surface.
function createFakePool(opts: { failOn?: string } = {}) {
  const statements: string[] = [];
  const state = { releaseCount: 0 };

  const client: Queryable & { release(): void } = {
    async query(text: string) {
      statements.push(text);
      if (opts.failOn !== undefined && text === opts.failOn) {
        throw new Error(`fake failure on ${text}`);
      }
      return { rows: [], rowCount: 0 };
    },
    release() {
      state.releaseCount += 1;
    },
  };

  const pool: Connectable = {
    async connect() {
      return client;
    },
  };

  return { pool, statements, state };
}

test('commits on success', async () => {
  const fake = createFakePool();

  const result = await withTransaction(fake.pool, ok);

  assert.deepStrictEqual(fake.statements, ['BEGIN', 'COMMIT']);
  assert.ok(!fake.statements.includes('ROLLBACK'));
  assert.strictEqual(result, SENTINEL_RESULT);
  assert.strictEqual(fake.state.releaseCount, 1);
});

test('rolls back and rethrows on failure', async () => {
  const fake = createFakePool();

  let caught: unknown;
  try {
    await withTransaction(fake.pool, boom);
    assert.fail('expected withTransaction to reject');
  } catch (err) {
    caught = err;
  }

  assert.strictEqual(caught, SENTINEL_ERROR);
  assert.deepStrictEqual(fake.statements, ['BEGIN', 'ROLLBACK']);
  assert.ok(!fake.statements.includes('COMMIT'));
  assert.strictEqual(fake.state.releaseCount, 1);
});

test('original error survives a failing rollback', async () => {
  const fake = createFakePool({ failOn: 'ROLLBACK' });

  let caught: unknown;
  try {
    await withTransaction(fake.pool, boom);
    assert.fail('expected withTransaction to reject');
  } catch (err) {
    caught = err;
  }

  assert.strictEqual(caught, SENTINEL_ERROR);
  assert.ok(caught instanceof InvariantViolation);
  assert.strictEqual(
    (caught as InvariantViolation).code,
    'OUTFIT_INCOMPATIBLE_PAIR',
  );
  assert.strictEqual(fake.state.releaseCount, 1);
});
