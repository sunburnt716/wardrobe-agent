// Connection/transaction primitives shared by every DAL function. Nothing
// here is domain-specific -- see api/dal for the query bodies that use it.
import type { QueryResultRow } from 'pg';

// Only rows/rowCount, not pg's full QueryResult -- no DAL call site ever
// reads .command, .oid, or .fields (queryRows only touches .rows; a couple
// of direct callers in api/dal/garments.ts and api/dal/compatibility.ts
// check .rowCount). A real pg query result still satisfies this
// structurally (it has strictly more fields), so nothing else changes; a
// test fake only needs to return these two.
export interface QueryResultLike<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number | null;
}

export interface Queryable {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResultLike<T>>;
}

declare const txBrand: unique symbol;

// A Queryable that is provably mid-transaction. `declare const` emits no
// JS -- this costs nothing at runtime. Because TxClient extends Queryable,
// a TxClient satisfies any function that only asks for Queryable, but a
// bare Pool can never satisfy a function that asks for TxClient: nothing
// can produce the brand except withTransaction below, immediately after
// BEGIN succeeds. Passing a pool where a transaction is required is a
// compile error, not a production incident -- see db/schema.sql's
// multi-statement writes (garment + tags, outfit status + wear counters)
// for what a half-committed write would otherwise look like.
export interface TxClient extends Queryable {
  readonly [txBrand]: true;
}

// Only what withTransaction actually calls on its first argument --
// deliberately narrower than pg's Pool (which has a much larger surface:
// query(), end(), on(), totalCount, etc.). withTransaction only ever calls
// .connect(), so that's all this asks for. A real Pool satisfies this
// structurally with no wrapper needed; a test fake only has to implement
// one method instead of stubbing the rest of Pool.
export interface Connectable {
  connect(): Promise<Queryable & { release(): void }>;
}

export async function queryRows<T extends QueryResultRow = QueryResultRow>(
  db: Queryable,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db.query<T>(text, params);
  return result.rows;
}

// The single brand assertion in the codebase. A second occurrence anywhere
// else is a review failure -- it's the escape hatch that makes the branded
// type meaningful, and it's earned here by having just opened the
// transaction.
export async function withTransaction<T>(
  pool: Connectable,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = client as unknown as TxClient;
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    // Log the actual failure before attempting rollback -- if ROLLBACK
    // itself throws (e.g. connection already dropped), the catch below
    // would otherwise be the only trace left and it would bury this one.
    console.error('[db] transaction failed, rolling back:', err);
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[db] rollback also failed:', rollbackErr);
    }
    // Rethrow the original error unmodified -- no wrapping, no logging
    // substitution. It may carry an InvariantViolation code that a caller
    // further up (the GraphQL error mask, a Tier 1 eval) asserts on.
    throw err;
  } finally {
    client.release();
  }
}
