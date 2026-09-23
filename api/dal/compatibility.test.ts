// DAL suite for compatibility.ts. Real Postgres, transaction-per-test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testPool, withRollback } from '../../db/testDb';
import { withTransaction } from '../../db/transaction';
import { InvariantViolation } from '../../db/errors';
import * as fx from '../../db/testFixtures';
import {
  deleteCompatibilityEdge,
  getIncompatibleEdgesForGarment,
  listCompatibilityEdges,
  setCompatibilityEdge,
  upsertCompatibilityEdge,
} from './compatibility';
import type {
  CompatibilityPolarity,
  CompatibilitySource,
  SetCompatibilityEdgeInput,
} from './types';

// --- normalization (db/schema.sql: CHECK garment_a_id < garment_b_id) ------

test('upsertCompatibilityEdge normalizes garment_a_id < garment_b_id regardless of call order', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const low = await fx.insertGarment(tx, userId, typeId);
    const high = await fx.insertGarment(tx, userId, typeId);

    const edge = await upsertCompatibilityEdge(tx, userId, {
      garmentAId: high, // deliberately passed in reverse order
      garmentBId: low,
      polarity: 'never_pair',
      source: 'manual',
      writtenBy: 'user',
    });

    assert.equal(edge.garmentA.id, low);
    assert.equal(edge.garmentB.id, high);
  });
});

// --- ownership scoping (resolver spec §5.1, db/schema.sql double-join) -----

test('deleteCompatibilityEdge: an edge the caller doesn\'t fully own is not deleted', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const ownGarment = await fx.insertGarment(tx, userA, typeId);
    const strangersGarment = await fx.insertGarment(tx, userB, typeId);
    // Inserted directly (bypassing ownership checks) to set up a state that
    // should never occur via the DAL -- proves the read/delete paths still
    // enforce ownership even against a row that "shouldn't" exist.
    await fx.insertCompatibilityEdge(tx, ownGarment, strangersGarment);

    const deleted = await deleteCompatibilityEdge(
      tx,
      userA,
      ownGarment,
      strangersGarment,
    );
    assert.equal(deleted, false);
  });
});

// --- cross-tenant integrity + atomicity (server spec §0/§2.2) --------------

test('upsertCompatibilityEdge: one garment owned by another user throws NOT_OWNED and writes nothing', async () => {
  const userA = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const userB = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const typeId = await withTransaction(testPool, (tx) =>
    fx.insertGarmentType(tx),
  );
  const ownGarment = await withTransaction(testPool, (tx) =>
    fx.insertGarment(tx, userA, typeId),
  );
  const strangersGarment = await withTransaction(testPool, (tx) =>
    fx.insertGarment(tx, userB, typeId),
  );

  let caught: unknown;
  try {
    await withTransaction(testPool, (tx) =>
      upsertCompatibilityEdge(tx, userA, {
        garmentAId: ownGarment,
        garmentBId: strangersGarment,
        polarity: 'never_pair',
        source: 'manual',
        writtenBy: 'user',
      }),
    );
  } catch (err) {
    caught = err;
  }

  assert.ok(caught instanceof InvariantViolation);
  assert.equal((caught as InvariantViolation).code, 'NOT_OWNED');

  const rows = (
    await testPool.query(
      `SELECT 1 FROM garment_compatibility WHERE garment_a_id = $1 OR garment_b_id = $1`,
      [ownGarment],
    )
  ).rows;
  assert.equal(rows.length, 0);

  await testPool.query(
    `DELETE FROM garments WHERE garment_id = ANY($1::int[])`,
    [[ownGarment, strangersGarment]],
  );
  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = $1`, [
    typeId,
  ]);
  await testPool.query(`DELETE FROM users WHERE user_id = ANY($1::int[])`, [
    [userA, userB],
  ]);
});

// --- source precedence (db/schema.sql source/written_by comment) -----------

test('SOURCE_PRIORITY: a manual write cannot overwrite an existing learned edge, but a second learned write can', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const a = await fx.insertGarment(tx, userId, typeId);
    const b = await fx.insertGarment(tx, userId, typeId);

    await upsertCompatibilityEdge(tx, userId, {
      garmentAId: a,
      garmentBId: b,
      polarity: 'never_pair',
      source: 'learned',
      writtenBy: 'agent',
      note: 'inferred from repeated rejections',
    });

    const afterManualAttempt = await upsertCompatibilityEdge(tx, userId, {
      garmentAId: a,
      garmentBId: b,
      polarity: 'pairs_well',
      source: 'manual',
      writtenBy: 'user',
      note: 'user tried to override',
    });
    assert.equal(afterManualAttempt.source, 'learned');
    assert.equal(afterManualAttempt.polarity, 'never_pair');

    const afterSecondLearned = await upsertCompatibilityEdge(tx, userId, {
      garmentAId: a,
      garmentBId: b,
      polarity: 'pairs_well',
      source: 'learned',
      writtenBy: 'agent',
      note: 'updated inference',
    });
    assert.equal(afterSecondLearned.source, 'learned');
    assert.equal(afterSecondLearned.polarity, 'pairs_well');
  });
});

// --- source cannot be overridden by input (resolver spec §7.1) -------------

test('setCompatibilityEdge always writes source=manual/writtenBy=user, even if the input object carries a forged source field', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const a = await fx.insertGarment(tx, userId, typeId);
    const b = await fx.insertGarment(tx, userId, typeId);

    // SetCompatibilityEdgeInput has no `source` field in the type -- this
    // simulates a payload that reached the DAL with one anyway (a bug
    // upstream, or a caller that bypassed the type system entirely).
    const forgedInput = {
      garmentAId: a,
      garmentBId: b,
      polarity: 'never_pair',
      source: 'learned',
      writtenBy: 'agent',
    } as unknown as SetCompatibilityEdgeInput;

    const edge = await setCompatibilityEdge(tx, userId, forgedInput);

    assert.equal(edge.source, 'manual');
    assert.equal(edge.writtenBy, 'user');
  });
});

// --- both-endpoints-in-set vs either-endpoint (resolver spec §5.1) ---------

test('listCompatibilityEdges (both endpoints in set) differs from getIncompatibleEdgesForGarment (either endpoint)', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const a = await fx.insertGarment(tx, userId, typeId);
    const b = await fx.insertGarment(tx, userId, typeId);
    const outsider = await fx.insertGarment(tx, userId, typeId);

    // Edge between a and b (both will be in the requested set), and a
    // second edge between b and outsider (outsider will NOT be in the set).
    await upsertCompatibilityEdge(tx, userId, {
      garmentAId: a,
      garmentBId: b,
      polarity: 'never_pair',
      source: 'manual',
      writtenBy: 'user',
    });
    await upsertCompatibilityEdge(tx, userId, {
      garmentAId: b,
      garmentBId: outsider,
      polarity: 'never_pair',
      source: 'manual',
      writtenBy: 'user',
    });

    const amongSet = await listCompatibilityEdges(tx, userId, [a, b]);
    const touchingB = await getIncompatibleEdgesForGarment(tx, userId, b);

    // Both endpoints in the requested {a, b} set -- only the a/b edge.
    assert.equal(amongSet.length, 1);

    // Either endpoint touching b -- both edges.
    assert.equal(touchingB.length, 2);
  });
});

// --- schema-canonical constraint, defense in depth --------------------------

test('an invalid polarity value (bypassing the type system) is rejected by the DB CHECK constraint', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const a = await fx.insertGarment(tx, userId, typeId);
    const b = await fx.insertGarment(tx, userId, typeId);

    await assert.rejects(() =>
      upsertCompatibilityEdge(tx, userId, {
        garmentAId: a,
        garmentBId: b,
        // Bypasses TypeScript the way a non-TS caller or a bug could --
        // proves the DB CHECK is real defense in depth, not just relying
        // on the type system.
        polarity: 'sort-of-pairs-well' as unknown as CompatibilityPolarity,
        source: 'manual' as CompatibilitySource,
        writtenBy: 'user',
      }),
    );
  });
});

// --- SQL-injection-shaped input ---------------------------------------------

test('SQL-injection-shaped note text is stored and read back verbatim', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const a = await fx.insertGarment(tx, userId, typeId);
    const b = await fx.insertGarment(tx, userId, typeId);
    const payload = "'; DROP TABLE garment_compatibility; --";

    const edge = await upsertCompatibilityEdge(tx, userId, {
      garmentAId: a,
      garmentBId: b,
      polarity: 'never_pair',
      source: 'manual',
      writtenBy: 'user',
      note: payload,
    });

    assert.equal(edge.note, payload);
  });
});
