// DAL suite for garments.ts. Real Postgres, transaction-per-test (see
// db/testDb.ts's withRollback) -- nothing here is mocked. Each test cites
// the spec section or schema.sql invariant it's derived from; see
// wardrobe-resolver-dev-spec.md and db/schema.sql.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testPool, withRollback } from '../../db/testDb';
import { withTransaction } from '../../db/transaction';
import * as fx from '../../db/testFixtures';
import {
  createGarment,
  getGarment,
  getWardrobeSummary,
  listCandidateGarments,
  listGarments,
  retireGarment,
  updateGarment,
  washGarment,
} from './garments';

// --- ownership scoping (resolver spec §4) -----------------------------------

test('getGarment: another user\'s garment and a nonexistent id both return null', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userA, typeId);

    const crossTenant = await getGarment(tx, userB, garmentId);
    const nonexistent = await getGarment(tx, userA, garmentId + 999999);

    // Same assertion for both -- resolver spec §4: "a garment belonging to
    // someone else returns null, indistinguishable from one that does not
    // exist. That indistinguishability is intentional."
    assert.equal(crossTenant, null);
    assert.equal(nonexistent, null);
  });
});

test('retireGarment: another user\'s garment is a true no-op, not just a null return', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userA, typeId);

    const result = await retireGarment(tx, userB, garmentId);
    assert.equal(result, null);

    // Confirm the row itself is unchanged, not just that the caller got
    // null back -- a null return masking a write would be worse than an
    // error.
    const stillOwned = await getGarment(tx, userA, garmentId);
    assert.equal(stillOwned!.retiredAt, null);
  });
});

test('washGarment: another user\'s garment is a true no-op', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userA, typeId, {
      wearsSinceWash: 3,
    });

    const result = await washGarment(tx, userB, garmentId);
    assert.equal(result, null);

    const stillDirty = await getGarment(tx, userA, garmentId);
    assert.equal(stillDirty!.wearsSinceWash, 3);
  });
});

test('updateGarment (tags-only path): another user\'s garment is a true no-op', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userA, typeId);

    const result = await updateGarment(tx, userB, garmentId, {
      tags: ['stolen-tag'],
    });
    assert.equal(result, null);

    const stillUntagged = await getGarment(tx, userA, garmentId);
    assert.deepEqual(stillUntagged!.tags, []);
  });
});

test('retireGarment is idempotent: retiring an already-retired garment is a no-op', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userId, typeId);

    const first = await retireGarment(tx, userId, garmentId);
    assert.ok(first);
    const second = await retireGarment(tx, userId, garmentId);
    assert.equal(second, null);
  });
});

// --- derived-not-stored invariant (db/schema.sql) ---------------------------

test('isClean is computed from wears_since_wash vs COALESCE(override, type default)', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx, {
      defaultWearsBeforeWash: 4,
    });

    // Under the override (2), not the type default (4): dirty despite being
    // "clean" by the default alone -- exercises COALESCE, not just the
    // threshold crossing (mirrors db/seed.sql's wool_sweater case).
    const overridden = await fx.insertGarment(tx, userId, typeId, {
      wearsSinceWash: 3,
      wearsBeforeWashOverride: 2,
    });
    // No override: falls back to the type default.
    const defaulted = await fx.insertGarment(tx, userId, typeId, {
      wearsSinceWash: 3,
    });

    const overriddenGarment = await getGarment(tx, userId, overridden);
    const defaultedGarment = await getGarment(tx, userId, defaulted);

    assert.equal(overriddenGarment!.isClean, false);
    assert.equal(defaultedGarment!.isClean, true);
  });
});

// --- schema-canonical constraints (db/schema.sql), defense in depth --------

test('createGarment: formality_band outside 1-5 is rejected by the DB, not silently accepted', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);

    await assert.rejects(() =>
      createGarment(tx, userId, { garmentTypeId: typeId, formalityBand: 6 }),
    );
  });
});

test('createGarment: warmth_rating outside 1-5 is rejected by the DB', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);

    await assert.rejects(() =>
      createGarment(tx, userId, { garmentTypeId: typeId, warmthRating: 0 }),
    );
  });
});

// --- SQL-injection-shaped input (parameterization holds) --------------------

test('SQL-injection-shaped text is stored and read back verbatim as data', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const payload = "'; DROP TABLE garments; --";

    const garment = await createGarment(tx, userId, {
      garmentTypeId: typeId,
      primaryColor: payload,
      tags: [payload],
    });

    assert.equal(garment.primaryColor, payload);
    assert.deepEqual(garment.tags, [payload]);

    // The table is still here to prove it.
    const stillThere = await getGarment(tx, userId, garment.id);
    assert.ok(stillThere);
  });
});

// --- atomicity (server spec §0/§2.2) ----------------------------------------
//
// Uses the real withTransaction directly (not withRollback's forced-rollback
// wrapper), because the point is to let the failure roll back for real and
// then confirm nothing persisted via a fresh query afterward.

test('createGarment: a mid-transaction failure (duplicate tag) commits nothing, not even the garment row', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const typeId = await withTransaction(testPool, (tx) =>
    fx.insertGarmentType(tx),
  );

  await assert.rejects(() =>
    withTransaction(testPool, (tx) =>
      createGarment(tx, userId, {
        garmentTypeId: typeId,
        // garment_tags' composite PK (garment_id, tag) rejects this in the
        // same INSERT ... unnest() statement, aborting the whole statement
        // -- and, if createGarment's earlier garments INSERT weren't in the
        // same transaction, it would survive this failure. It must not.
        tags: ['vintage', 'vintage'],
      }),
    ),
  );

  const rows = (
    await testPool.query(
      `SELECT garment_id FROM garments WHERE user_id = $1 AND garment_type_id = $2`,
      [userId, typeId],
    )
  ).rows;
  assert.equal(rows.length, 0);

  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = $1`, [
    typeId,
  ]);
  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});

// --- weather-aware pre-filter (tool layer dev spec §3/§4.1) -----------------

test('listCandidateGarments: rain excludes a non-water-resistant outer garment but keeps a water-resistant one', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const outerType = await fx.insertGarmentType(tx, { layer: 'outer' });
    const dryJacket = await fx.insertGarment(tx, userId, outerType, {
      waterResistant: false,
    });
    const rainJacket = await fx.insertGarment(tx, userId, outerType, {
      waterResistant: true,
    });

    const candidates = await listCandidateGarments(tx, userId, {
      tempC: 15,
      weatherCondition: 'rain',
    });

    const ids = candidates.map((g) => g.id);
    assert.ok(!ids.includes(dryJacket));
    assert.ok(ids.includes(rainJacket));
  });
});

test('listCandidateGarments: rain does not exclude a base-layer garment regardless of water_resistant', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const baseType = await fx.insertGarmentType(tx, { layer: 'base' });
    const shirt = await fx.insertGarment(tx, userId, baseType, {
      waterResistant: false,
    });

    const candidates = await listCandidateGarments(tx, userId, {
      tempC: 15,
      weatherCondition: 'rain',
    });

    assert.ok(candidates.map((g) => g.id).includes(shirt));
  });
});

test('listCandidateGarments: clear weather does not filter on water_resistant at all', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const outerType = await fx.insertGarmentType(tx, { layer: 'outer' });
    const dryJacket = await fx.insertGarment(tx, userId, outerType, {
      waterResistant: false,
    });

    const candidates = await listCandidateGarments(tx, userId, {
      tempC: 15,
      weatherCondition: 'clear',
    });

    assert.ok(candidates.map((g) => g.id).includes(dryJacket));
  });
});

// --- get_wardrobe_summary (tool layer dev spec §4.2) ------------------------

test('getWardrobeSummary: counts active garments by layer, formality, and dirty-unavailable', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const baseType = await fx.insertGarmentType(tx, {
      layer: 'base',
      defaultWearsBeforeWash: 2,
    });
    const outerType = await fx.insertGarmentType(tx, { layer: 'outer' });

    await fx.insertGarment(tx, userId, baseType, {
      formalityBand: 2,
      wearsSinceWash: 0,
    });
    await fx.insertGarment(tx, userId, baseType, {
      formalityBand: 2,
      wearsSinceWash: 3, // dirty -> unavailable
    });
    await fx.insertGarment(tx, userId, outerType, {
      formalityBand: 3,
      retiredAt: '2020-01-01', // excluded entirely
    });

    const summary = await getWardrobeSummary(tx, userId);

    assert.equal(summary.totalGarments, 2);
    assert.equal(summary.byLayer.base, 2);
    assert.equal(summary.byLayer.outer, undefined);
    assert.equal(summary.byFormality['2'], 2);
    assert.equal(summary.unavailableCount, 1);
  });
});

test('getWardrobeSummary: confirmedOutfitsCount counts worn_on IS NOT NULL, not status = accepted', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    await fx.insertOutfit(tx, userId, { status: 'accepted' }); // unworn -- not confirmed
    await fx.insertOutfit(tx, userId, { status: 'worn', wornOn: '2026-01-01' });

    const summary = await getWardrobeSummary(tx, userId);
    assert.equal(summary.confirmedOutfitsCount, 1);
  });
});

// --- listGarments colour filter (Closet, feature 1) -----------------------

test('listGarments: colors filter matches primary OR secondary color, case-insensitively', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const navyPrimary = await fx.insertGarment(tx, userId, typeId, {
      primaryColor: 'Navy',
    });
    const navySecondary = await fx.insertGarment(tx, userId, typeId, {
      primaryColor: 'white',
      secondaryColor: 'NAVY',
    });
    await fx.insertGarment(tx, userId, typeId, { primaryColor: 'olive' });

    const navy = await listGarments(tx, userId, { colors: ['navy'] });
    assert.deepEqual(
      navy.map((g) => g.id).sort((a, b) => a - b),
      [navyPrimary, navySecondary].sort((a, b) => a - b),
    );
  });
});
