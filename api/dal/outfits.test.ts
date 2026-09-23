// DAL suite for outfits.ts. Real Postgres, transaction-per-test.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testPool, withRollback } from '../../db/testDb';
import { withTransaction } from '../../db/transaction';
import { InvariantViolation } from '../../db/errors';
import * as fx from '../../db/testFixtures';
import { getGarment } from './garments';
import {
  acceptOutfit,
  getLastWornDates,
  getOutfit,
  getOutfitFeedback,
  getRecentlyWornGarments,
  logManualOutfit,
  markOutfitWorn,
  proposeOutfit,
  rejectOutfit,
  rewearOutfit,
  setPieceVerdict,
} from './outfits';

// --- ownership scoping (resolver spec §4) -----------------------------------

test('getOutfit: another user\'s outfit and a nonexistent id both return null', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const outfitId = await fx.insertOutfit(tx, userA);

    assert.equal(await getOutfit(tx, userB, outfitId), null);
    assert.equal(await getOutfit(tx, userA, outfitId + 999999), null);
  });
});

test('acceptOutfit: another user\'s outfit is a true no-op', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const outfitId = await fx.insertOutfit(tx, userA, { status: 'proposed' });

    const result = await acceptOutfit(tx, userB, outfitId);
    assert.equal(result, null);

    const stillProposed = await getOutfit(tx, userA, outfitId);
    assert.equal(stillProposed!.status, 'proposed');
  });
});

test('rejectOutfit: another user\'s outfit is a true no-op', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const outfitId = await fx.insertOutfit(tx, userA, { status: 'proposed' });

    const result = await rejectOutfit(tx, userB, outfitId, 'not my style');
    assert.equal(result, null);

    const stillProposed = await getOutfit(tx, userA, outfitId);
    assert.equal(stillProposed!.status, 'proposed');
    assert.equal(stillProposed!.rejectionReason, null);
  });
});

// --- wear counters (db/schema.sql: no wear-events table) --------------------

test('markOutfitWorn increments wears_since_wash for every member garment atomically with the status flip', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId, {
      wearsSinceWash: 0,
    });
    const g2 = await fx.insertGarment(tx, userId, typeId, {
      wearsSinceWash: 2,
    });
    const outfitId = await fx.insertOutfit(tx, userId, { status: 'proposed' });
    await fx.linkOutfitGarment(tx, outfitId, g1);
    await fx.linkOutfitGarment(tx, outfitId, g2);

    const worn = await markOutfitWorn(tx, userId, outfitId, '2026-01-01');
    assert.equal(worn!.status, 'worn');
    assert.equal(worn!.wornOn, '2026-01-01');

    const garment1 = await getGarment(tx, userId, g1);
    const garment2 = await getGarment(tx, userId, g2);
    assert.equal(garment1!.wearsSinceWash, 1);
    assert.equal(garment2!.wearsSinceWash, 3);
  });
});

// --- markOutfitWorn's re-mark guard (double-count prevention) --------------

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

test('markOutfitWorn: re-marking an outfit already worn within the last day is a no-op, not a second wear-counter bump', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 1 });

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const outfitId = await fx.insertOutfit(tx, userId, {
      status: 'worn',
      wornOn: isoDate(yesterday),
    });
    await fx.linkOutfitGarment(tx, outfitId, g1);

    const result = await markOutfitWorn(tx, userId, outfitId);
    assert.equal(result, null);

    const garment = await getGarment(tx, userId, g1);
    assert.equal(garment!.wearsSinceWash, 1); // unchanged -- not double-counted
  });
});

test('markOutfitWorn: re-marking an outfit last worn more than a day ago is treated as a new wear', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 1 });

    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    const outfitId = await fx.insertOutfit(tx, userId, {
      status: 'worn',
      wornOn: isoDate(threeDaysAgo),
    });
    await fx.linkOutfitGarment(tx, outfitId, g1);

    const today = isoDate(new Date());
    const result = await markOutfitWorn(tx, userId, outfitId, today);

    assert.ok(result);
    assert.equal(result!.wornOn, today);
    const garment = await getGarment(tx, userId, g1);
    assert.equal(garment!.wearsSinceWash, 2); // bumped again -- a genuine second wear
  });
});

// --- edge case: empty garment list (user's "test edge cases" ask) ----------

test('logManualOutfit with an empty garmentIds array creates a garmentless outfit, does not crash', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);

    const outfit = await logManualOutfit(tx, userId, {
      garmentIds: [],
      wornOn: '2026-01-01',
    });

    assert.equal(outfit.status, 'worn');
    assert.deepEqual(outfit.pieces, []);
  });
});

// --- cross-tenant integrity + atomicity (server spec §0/§2.2) --------------
//
// Real withTransaction (not withRollback), so the failure rolls back for
// real and a fresh query afterward proves nothing persisted.

test('logManualOutfit: mixed-ownership garmentIds throws NOT_OWNED and commits nothing', async () => {
  const userA = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const userB = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const typeId = await withTransaction(testPool, (tx) =>
    fx.insertGarmentType(tx),
  );
  const ownedGarment = await withTransaction(testPool, (tx) =>
    fx.insertGarment(tx, userA, typeId, { wearsSinceWash: 0 }),
  );
  const strangersGarment = await withTransaction(testPool, (tx) =>
    fx.insertGarment(tx, userB, typeId),
  );

  let caught: unknown;
  try {
    await withTransaction(testPool, (tx) =>
      logManualOutfit(tx, userA, {
        garmentIds: [ownedGarment, strangersGarment],
        wornOn: '2026-01-01',
      }),
    );
  } catch (err) {
    caught = err;
  }

  assert.ok(caught instanceof InvariantViolation);
  assert.equal((caught as InvariantViolation).code, 'NOT_OWNED');

  // Nothing committed: no outfit, no membership rows, and the *owned*
  // garment's wear counter was not bumped either -- the ownership check
  // must prevent the whole write, not just the stranger's garment's part
  // of it.
  const outfitRows = (
    await testPool.query(`SELECT outfit_id FROM outfits WHERE user_id = $1`, [
      userA,
    ])
  ).rows;
  assert.equal(outfitRows.length, 0);

  const finalGarment = await testPool.query(
    `SELECT wears_since_wash FROM garments WHERE garment_id = $1`,
    [ownedGarment],
  );
  assert.equal(finalGarment.rows[0].wears_since_wash, 0);

  await testPool.query(
    `DELETE FROM garments WHERE garment_id = ANY($1::int[])`,
    [[ownedGarment, strangersGarment]],
  );
  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = $1`, [
    typeId,
  ]);
  await testPool.query(`DELETE FROM users WHERE user_id = ANY($1::int[])`, [
    [userA, userB],
  ]);
});

// --- proposeOutfit (tool layer dev spec §4.4) -------------------------------

// A complete proposal must span the required layers (top/bottom/footwear --
// api/dal/outfitComposition.ts), so the fixtures here build all three; the
// error-path tests below only need to reach their own check, which fires
// before OUTFIT_INCOMPLETE.
async function completeGarmentSet(
  tx: Parameters<typeof fx.insertGarment>[0],
  userId: number,
  overrides: fx.GarmentOverrides = {},
): Promise<number[]> {
  const base = await fx.insertGarmentType(tx, { layer: 'base' });
  const bottom = await fx.insertGarmentType(tx, { layer: 'bottom' });
  const footwear = await fx.insertGarmentType(tx, { layer: 'footwear' });
  return Promise.all([
    fx.insertGarment(tx, userId, base, overrides),
    fx.insertGarment(tx, userId, bottom, overrides),
    fx.insertGarment(tx, userId, footwear, overrides),
  ]);
}

test('proposeOutfit: creates a proposed outfit with worn_on null and the rationale/weather snapshot stored', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const garmentIds = await completeGarmentSet(tx, userId);

    const outfit = await proposeOutfit(tx, userId, {
      garmentIds,
      rationale: 'Both pieces sit at the same formality and suit clear, 65F weather.',
      weatherTempC: 18,
      weatherCondition: 'clear',
      occasion: 'client dinner',
    });

    assert.equal(outfit.status, 'proposed');
    assert.equal(outfit.origin, 'agent');
    assert.equal(outfit.wornOn, null);
    assert.equal(
      outfit.rationale,
      'Both pieces sit at the same formality and suit clear, 65F weather.',
    );
    assert.equal(outfit.weatherTempC, 18);
    assert.equal(outfit.weatherCondition, 'clear');
    assert.equal(outfit.occasion, 'client dinner');
    assert.equal(outfit.pieces.length, garmentIds.length);
    // A fresh proposal carries no verdicts.
    assert.deepEqual(
      outfit.pieces.map((p) => p.verdict),
      garmentIds.map(() => null),
    );
  });
});

test('proposeOutfit: stores agent-authored presentation fields and per-piece rationale (db/migrations/004)', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const garmentIds = await completeGarmentSet(tx, userId);

    const outfit = await proposeOutfit(tx, userId, {
      garmentIds,
      rationale: 'overall',
      title: 'Rain-ready',
      metaLine: 'THREE LAYERS · SMART',
      accentColor: '#4b6157',
      washColorA: '#e7dcc6',
      washColorB: '#cfd8d2',
      pieceRationales: [
        { garmentId: garmentIds[0], rationale: 'anchors the palette' },
        { garmentId: 999999, rationale: 'ignored -- not in the outfit' },
      ],
    });

    assert.equal(outfit.title, 'Rain-ready');
    assert.equal(outfit.metaLine, 'THREE LAYERS · SMART');
    assert.equal(outfit.accentColor, '#4b6157');
    assert.equal(outfit.washColorA, '#e7dcc6');
    assert.equal(outfit.washColorB, '#cfd8d2');
    assert.equal(outfit.compositeImageKey, null); // pipeline-authored, not set here
    assert.equal(
      outfit.pieces.find((p) => p.garment.id === garmentIds[0])!.rationale,
      'anchors the palette',
    );
    assert.equal(
      outfit.pieces.find((p) => p.garment.id === garmentIds[1])!.rationale,
      null,
    );
  });
});

// --- rewearOutfit (feature 5) ---------------------------------------------

test('rewearOutfit: creates a new worn manual outfit, clones garments + presentation, bumps counters', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 0 });
    const g2 = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 4 });
    const source = await fx.insertOutfit(tx, userId, {
      status: 'worn',
      wornOn: '2026-01-01',
      title: 'All charcoal',
      compositeImageKey: 'composite/abc',
      weatherCondition: 'clear',
    });
    await fx.linkOutfitGarment(tx, source, g1, {
      rationale: 'the anchor',
      hotspotX: 0.5,
      hotspotY: 0.3,
      verdict: 'love',
    });
    await fx.linkOutfitGarment(tx, source, g2);

    const rewear = await rewearOutfit(tx, userId, source, '2026-02-14');

    assert.ok(rewear);
    assert.notEqual(rewear!.id, source);
    assert.equal(rewear!.status, 'worn');
    assert.equal(rewear!.origin, 'manual');
    assert.equal(rewear!.wornOn, '2026-02-14');
    // presentation carried over
    assert.equal(rewear!.title, 'All charcoal');
    assert.equal(rewear!.compositeImageKey, 'composite/abc');
    const p1 = rewear!.pieces.find((p) => p.garment.id === g1)!;
    assert.equal(p1.rationale, 'the anchor');
    assert.equal(p1.hotspotX, 0.5);
    // NOT carried over: decision snapshot and verdicts
    assert.equal(rewear!.weatherCondition, null);
    assert.equal(p1.verdict, null);
    // counters bumped
    assert.equal((await getGarment(tx, userId, g1))!.wearsSinceWash, 1);
    assert.equal((await getGarment(tx, userId, g2))!.wearsSinceWash, 5);
    // source untouched
    assert.equal((await getOutfit(tx, userId, source))!.wornOn, '2026-01-01');
  });
});

test("rewearOutfit: another user's outfit returns null and writes nothing", async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userA, typeId, { wearsSinceWash: 2 });
    const source = await fx.insertOutfit(tx, userA, { status: 'worn', wornOn: '2026-01-01' });
    await fx.linkOutfitGarment(tx, source, g1);

    const result = await rewearOutfit(tx, userB, source, '2026-02-14');
    assert.equal(result, null);

    const outfitCount = (
      await tx.query(`SELECT COUNT(*)::int AS n FROM outfits WHERE user_id = $1`, [userB])
    ).rows[0].n;
    assert.equal(outfitCount, 0);
    assert.equal((await getGarment(tx, userA, g1))!.wearsSinceWash, 2); // not bumped
  });
});

// --- getOutfitFeedback (feature 6) ---------------------------------------

test('getOutfitFeedback: returns rejected and verdict-bearing outfits newest-first, omits silent ones', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId);
    const g2 = await fx.insertGarment(tx, userId, typeId);

    // oldest: rejected
    const rejected = await fx.insertOutfit(tx, userId, {
      status: 'rejected',
      rejectionReason: 'too warm',
    });
    await fx.linkOutfitGarment(tx, rejected, g1);

    // middle: silent accepted -- should be omitted
    const silent = await fx.insertOutfit(tx, userId, { status: 'accepted' });
    await fx.linkOutfitGarment(tx, silent, g1);

    // newest: has a piece verdict
    const verdicted = await fx.insertOutfit(tx, userId, { status: 'proposed' });
    await fx.linkOutfitGarment(tx, verdicted, g1, { verdict: 'not_this' });
    await fx.linkOutfitGarment(tx, verdicted, g2, { verdict: 'love' });

    const feedback = await getOutfitFeedback(tx, userId, 10);

    assert.deepEqual(
      feedback.map((f) => f.outfitId),
      [verdicted, rejected],
    );
    assert.equal(feedback[0].pieces.length, 2);
    assert.equal(
      feedback[0].pieces.find((p) => p.garmentId === g1)!.verdict,
      'not_this',
    );
    assert.equal(feedback[1].rejectionReason, 'too warm');
  });
});

test('getOutfitFeedback: respects the limit and never returns another user\'s outfits', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g = await fx.insertGarment(tx, userA, typeId);

    for (let i = 0; i < 3; i++) {
      const o = await fx.insertOutfit(tx, userA, { status: 'rejected' });
      await fx.linkOutfitGarment(tx, o, g);
    }
    const strangerG = await fx.insertGarment(tx, userB, typeId);
    const strangerOutfit = await fx.insertOutfit(tx, userB, { status: 'rejected' });
    await fx.linkOutfitGarment(tx, strangerOutfit, strangerG);

    const feedback = await getOutfitFeedback(tx, userA, 2);
    assert.equal(feedback.length, 2);
    assert.ok(feedback.every((f) => f.outfitId !== strangerOutfit));
  });
});

test('proposeOutfit: does not bump wear counters (proposing is not wearing)', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const garmentIds = await completeGarmentSet(tx, userId, { wearsSinceWash: 0 });

    await proposeOutfit(tx, userId, { garmentIds, rationale: 'test' });

    const garment1 = await getGarment(tx, userId, garmentIds[0]);
    assert.equal(garment1!.wearsSinceWash, 0);
  });
});

test('proposeOutfit: a garment_id belonging to another user throws NOT_OWNED', async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const owned = await fx.insertGarment(tx, userA, typeId);
    const strangers = await fx.insertGarment(tx, userB, typeId);

    let caught: unknown;
    try {
      await proposeOutfit(tx, userA, {
        garmentIds: [owned, strangers],
        rationale: 'test',
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof InvariantViolation);
    assert.equal((caught as InvariantViolation).code, 'NOT_OWNED');
  });
});

test('proposeOutfit: a dirty garment throws GARMENT_NOT_AVAILABLE', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx, { defaultWearsBeforeWash: 2 });
    const clean = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 0 });
    const dirty = await fx.insertGarment(tx, userId, typeId, { wearsSinceWash: 2 });

    let caught: unknown;
    try {
      await proposeOutfit(tx, userId, {
        garmentIds: [clean, dirty],
        rationale: 'test',
      });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof InvariantViolation);
    assert.equal((caught as InvariantViolation).code, 'GARMENT_NOT_AVAILABLE');
  });
});

test('proposeOutfit: a retired garment throws GARMENT_NOT_AVAILABLE', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const active = await fx.insertGarment(tx, userId, typeId);
    const retired = await fx.insertGarment(tx, userId, typeId, {
      retiredAt: '2020-01-01',
    });

    await assert.rejects(
      () =>
        proposeOutfit(tx, userId, {
          garmentIds: [active, retired],
          rationale: 'test',
        }),
      (err: unknown) =>
        err instanceof InvariantViolation && err.code === 'GARMENT_NOT_AVAILABLE',
    );
  });
});

test('proposeOutfit: a never_pair edge between two proposed garments throws OUTFIT_INCOMPATIBLE_PAIR', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const g1 = await fx.insertGarment(tx, userId, typeId);
    const g2 = await fx.insertGarment(tx, userId, typeId);
    await fx.insertCompatibilityEdge(tx, g1, g2, { polarity: 'never_pair' });

    await assert.rejects(
      () => proposeOutfit(tx, userId, { garmentIds: [g1, g2], rationale: 'test' }),
      (err: unknown) =>
        err instanceof InvariantViolation && err.code === 'OUTFIT_INCOMPATIBLE_PAIR',
    );
  });
});

test('proposeOutfit: mid-transaction failure (incompatible pair) commits nothing', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const typeId = await withTransaction(testPool, (tx) => fx.insertGarmentType(tx));
  const g1 = await withTransaction(testPool, (tx) => fx.insertGarment(tx, userId, typeId));
  const g2 = await withTransaction(testPool, (tx) => fx.insertGarment(tx, userId, typeId));
  await withTransaction(testPool, (tx) =>
    fx.insertCompatibilityEdge(tx, g1, g2, { polarity: 'never_pair' }),
  );

  await assert.rejects(() =>
    withTransaction(testPool, (tx) =>
      proposeOutfit(tx, userId, { garmentIds: [g1, g2], rationale: 'test' }),
    ),
  );

  const outfitRows = (
    await testPool.query(`SELECT outfit_id FROM outfits WHERE user_id = $1`, [userId])
  ).rows;
  assert.equal(outfitRows.length, 0);

  await testPool.query(`DELETE FROM garment_compatibility WHERE garment_a_id = ANY($1::int[])`, [
    [g1, g2],
  ]);
  await testPool.query(`DELETE FROM garments WHERE garment_id = ANY($1::int[])`, [[g1, g2]]);
  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = $1`, [typeId]);
  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});

// --- recency derivation (db/schema.sql: no wear-events table) ---------------

test('getLastWornDates: returns MAX(worn_on) per garment, omits never-worn garments', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const wornTwice = await fx.insertGarment(tx, userId, typeId);
    const neverWorn = await fx.insertGarment(tx, userId, typeId);

    const outfit1 = await fx.insertOutfit(tx, userId, { status: 'worn', wornOn: '2026-01-01' });
    await fx.linkOutfitGarment(tx, outfit1, wornTwice);
    const outfit2 = await fx.insertOutfit(tx, userId, { status: 'worn', wornOn: '2026-01-10' });
    await fx.linkOutfitGarment(tx, outfit2, wornTwice);

    const dates = await getLastWornDates(tx, userId, [wornTwice, neverWorn]);
    assert.equal(dates.get(wornTwice), '2026-01-10');
    assert.equal(dates.has(neverWorn), false);
  });
});

test('getRecentlyWornGarments: orders by recency descending and excludes outside the window', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const recent = await fx.insertGarment(tx, userId, typeId);
    const stale = await fx.insertGarment(tx, userId, typeId);

    const recentOutfit = await fx.insertOutfit(tx, userId, {
      status: 'worn',
      wornOn: '2026-01-20',
    });
    await fx.linkOutfitGarment(tx, recentOutfit, recent);
    const staleOutfit = await fx.insertOutfit(tx, userId, {
      status: 'worn',
      wornOn: '2025-06-01',
    });
    await fx.linkOutfitGarment(tx, staleOutfit, stale);

    const result = await getRecentlyWornGarments(tx, userId, '2026-01-01');
    assert.deepEqual(
      result.map((r) => r.garmentId),
      [recent],
    );
  });
});

test('getRecentlyWornGarments: a proposed (not yet worn) outfit does not count', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const garmentId = await fx.insertGarment(tx, userId, typeId);
    const outfitId = await fx.insertOutfit(tx, userId, { status: 'proposed' });
    await fx.linkOutfitGarment(tx, outfitId, garmentId);

    const result = await getRecentlyWornGarments(tx, userId, '2020-01-01');
    assert.deepEqual(result, []);
  });
});

// --- piece-level verdicts (Fitcheck design spec 1; db/migrations/003) -------
//
// The DAL function itself enforces only cross-tenant scoping. "garment not
// in this outfit" and "outfit is rejected" are resolver-side shape checks
// (see api/resolvers/Mutation.test.ts), so they aren't re-asserted here.

async function outfitWithOnePiece(
  tx: Parameters<typeof fx.insertGarment>[0],
  userId: number,
): Promise<{ outfitId: number; garmentId: number }> {
  const typeId = await fx.insertGarmentType(tx);
  const garmentId = await fx.insertGarment(tx, userId, typeId);
  const outfitId = await fx.insertOutfit(tx, userId, { status: 'proposed' });
  await fx.linkOutfitGarment(tx, outfitId, garmentId);
  return { outfitId, garmentId };
}

test('setPieceVerdict: sets a verdict and stamps verdict_at on the matching piece only', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const { outfitId, garmentId } = await outfitWithOnePiece(tx, userId);

    const outfit = await setPieceVerdict(tx, userId, outfitId, garmentId, 'love');

    const piece = outfit!.pieces.find((p) => p.garment.id === garmentId)!;
    assert.equal(piece.verdict, 'love');
    assert.ok(piece.verdictAt, 'verdict_at is stamped when a verdict is set');
  });
});

test('setPieceVerdict: a second call overwrites the verdict in place (no history kept)', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const { outfitId, garmentId } = await outfitWithOnePiece(tx, userId);

    await setPieceVerdict(tx, userId, outfitId, garmentId, 'love');
    const outfit = await setPieceVerdict(
      tx,
      userId,
      outfitId,
      garmentId,
      'not_this',
    );

    const verdicts = (
      await tx.query(
        `SELECT verdict FROM outfit_garments WHERE outfit_id = $1 AND garment_id = $2`,
        [outfitId, garmentId],
      )
    ).rows;
    assert.equal(verdicts.length, 1); // one row, mutated -- not appended
    assert.equal(
      outfit!.pieces.find((p) => p.garment.id === garmentId)!.verdict,
      'not_this',
    );
  });
});

test('setPieceVerdict: passing null clears verdict and verdict_at together', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const { outfitId, garmentId } = await outfitWithOnePiece(tx, userId);

    await setPieceVerdict(tx, userId, outfitId, garmentId, 'love');
    const outfit = await setPieceVerdict(tx, userId, outfitId, garmentId, null);

    const piece = outfit!.pieces.find((p) => p.garment.id === garmentId)!;
    assert.equal(piece.verdict, null);
    assert.equal(piece.verdictAt, null);
  });
});

test("setPieceVerdict: another user's outfit is a true no-op", async () => {
  await withRollback(testPool, async (tx) => {
    const userA = await fx.insertUser(tx);
    const userB = await fx.insertUser(tx);
    const { outfitId, garmentId } = await outfitWithOnePiece(tx, userA);

    const result = await setPieceVerdict(tx, userB, outfitId, garmentId, 'love');
    assert.equal(result, null);

    const stored = (
      await tx.query(
        `SELECT verdict FROM outfit_garments WHERE outfit_id = $1 AND garment_id = $2`,
        [outfitId, garmentId],
      )
    ).rows[0];
    assert.equal(stored.verdict, null); // untouched
  });
});

test('mapOutfitRow surfaces a stored verdict on the right piece', async () => {
  await withRollback(testPool, async (tx) => {
    const userId = await fx.insertUser(tx);
    const typeId = await fx.insertGarmentType(tx);
    const loved = await fx.insertGarment(tx, userId, typeId);
    const plain = await fx.insertGarment(tx, userId, typeId);
    const outfitId = await fx.insertOutfit(tx, userId, { status: 'proposed' });
    await fx.linkOutfitGarment(tx, outfitId, loved, { verdict: 'love' });
    await fx.linkOutfitGarment(tx, outfitId, plain);

    const outfit = await getOutfit(tx, userId, outfitId);
    assert.equal(
      outfit!.pieces.find((p) => p.garment.id === loved)!.verdict,
      'love',
    );
    assert.equal(
      outfit!.pieces.find((p) => p.garment.id === plain)!.verdict,
      null,
    );
  });
});
