// Resolver-layer suite for Mutation.ts. No database -- the DAL is faked.
// These test the resolver's actual job (resolver spec §1/§7/§9): thin
// wiring, opening a transaction only where the DAL function requires
// TxClient, and shaping a DAL result/throw into an ActionResult without
// leaking internals.
//
// Structural note: same as Query.test.ts -- node:test's
// --experimental-test-module-mocks does not reliably support re-mocking
// the same specifier across separate top-level test()s in one process
// (confirmed empirically, including with explicit .restore()). So this
// file is ONE outer test with a single t.mock.module call, driving a
// mutable fake DAL, and nested t.test() subtests per scenario.
//
// What is deliberately NOT tested here: whether source/writtenBy can
// actually be overridden (that guarantee is enforced by the DAL hardcoding
// it, not by anything in this file -- see
// api/dal/compatibility.test.ts's setCompatibilityEdge test for the real
// proof, per resolver spec §7.1).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvariantViolation } from '../../db/errors';
import type { RequestContext } from './context';

function fakeContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    userId: 1,
    actor: 'user',
    loaders: {} as RequestContext['loaders'],
    pool: {} as RequestContext['pool'],
    withTransaction: async (fn) => fn({} as never),
    ...overrides,
  };
}

test('Mutation resolvers', async (t) => {
  let retireGarmentReturn: unknown = null;
  let logManualOutfitImpl: () => Promise<unknown> = async () => ({ id: 1 });
  const deleteEdgeCalls: unknown[][] = [];
  let deleteEdgeReturn = false;
  let getOutfitReturn: unknown = null;
  const setPieceVerdictCalls: unknown[][] = [];
  let setPieceVerdictReturn: unknown = { id: 1 };
  const rewearOutfitCalls: unknown[][] = [];
  let rewearOutfitReturn: unknown = { id: 2 };

  const real = await import('../dal');
  t.mock.module('../dal', {
    namedExports: {
      ...real,
      retireGarment: async () => retireGarmentReturn,
      createGarment: async () => ({ id: 1 }),
      logManualOutfit: async () => logManualOutfitImpl(),
      deleteCompatibilityEdge: async (...args: unknown[]) => {
        deleteEdgeCalls.push(args);
        return deleteEdgeReturn;
      },
      getOutfit: async () => getOutfitReturn,
      setPieceVerdict: async (...args: unknown[]) => {
        setPieceVerdictCalls.push(args);
        return setPieceVerdictReturn;
      },
      rewearOutfit: async (...args: unknown[]) => {
        rewearOutfitCalls.push(args);
        return rewearOutfitReturn;
      },
    },
  });
  const { Mutation } = await import('./Mutation');

  // --- ActionResult shaping (resolver spec §9) --------------------------

  await t.test('a null from the DAL becomes {success: false, code: NOT_FOUND}', async () => {
    retireGarmentReturn = null;
    const result = await Mutation.retireGarment(
      undefined,
      { id: '1' },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'NOT_FOUND');
  });

  await t.test('a successful DAL result becomes {success: true, garment}', async () => {
    const fakeGarment = { id: 7, primaryColor: 'blue' };
    retireGarmentReturn = fakeGarment;
    const result = await Mutation.retireGarment(
      undefined,
      { id: '7' },
      fakeContext(),
    );
    assert.equal(result.success, true);
    assert.equal(result.garment, fakeGarment);
  });

  await t.test('an InvariantViolation becomes {success: false, code} without leaking detail into message', async () => {
    logManualOutfitImpl = async () => {
      throw new InvariantViolation('NOT_OWNED', {
        userId: 1,
        garmentIds: [2, 3],
        secretDetail: 'should never reach the client',
      });
    };
    const result = await Mutation.logManualOutfit(
      undefined,
      { input: { garmentIds: [2, 3], wornOn: '2026-01-01' } },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'NOT_OWNED');
    assert.ok(!result.message?.includes('secretDetail'));
    assert.ok(!result.message?.includes('should never reach the client'));
  });

  await t.test('an unrecognized thrown error (not InvariantViolation) is not swallowed into an ActionResult', async () => {
    logManualOutfitImpl = async () => {
      throw new Error('connection reset');
    };
    await assert.rejects(
      () =>
        Mutation.logManualOutfit(
          undefined,
          { input: { garmentIds: [1], wornOn: '2026-01-01' } },
          fakeContext(),
        ),
      /connection reset/,
    );
  });

  // --- setPieceVerdict shape guards (resolver-side, not DAL) --------------

  await t.test('setPieceVerdict: unknown/not-owned outfit -> NOT_FOUND, DAL not called', async () => {
    getOutfitReturn = null;
    setPieceVerdictCalls.length = 0;
    const result = await Mutation.setPieceVerdict(
      undefined,
      { outfitId: '1', garmentId: '2', verdict: 'love' },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'NOT_FOUND');
    assert.equal(setPieceVerdictCalls.length, 0);
  });

  await t.test('setPieceVerdict: a rejected outfit -> OUTFIT_REJECTED, DAL not called', async () => {
    getOutfitReturn = {
      id: 1,
      status: 'rejected',
      pieces: [{ garment: { id: 2 } }],
    };
    setPieceVerdictCalls.length = 0;
    const result = await Mutation.setPieceVerdict(
      undefined,
      { outfitId: '1', garmentId: '2', verdict: 'love' },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'OUTFIT_REJECTED');
    assert.equal(setPieceVerdictCalls.length, 0);
  });

  await t.test('setPieceVerdict: garment not in the outfit -> GARMENT_NOT_IN_OUTFIT, DAL not called', async () => {
    getOutfitReturn = {
      id: 1,
      status: 'proposed',
      pieces: [{ garment: { id: 99 } }],
    };
    setPieceVerdictCalls.length = 0;
    const result = await Mutation.setPieceVerdict(
      undefined,
      { outfitId: '1', garmentId: '2', verdict: 'love' },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'GARMENT_NOT_IN_OUTFIT');
    assert.equal(setPieceVerdictCalls.length, 0);
  });

  await t.test('setPieceVerdict: valid request coerces ids, passes verdict through, shapes the outfit result', async () => {
    getOutfitReturn = {
      id: 1,
      status: 'proposed',
      pieces: [{ garment: { id: 2 } }],
    };
    const updated = { id: 1, status: 'proposed', pieces: [] };
    setPieceVerdictReturn = updated;
    setPieceVerdictCalls.length = 0;
    const result = await Mutation.setPieceVerdict(
      undefined,
      { outfitId: '1', garmentId: '2', verdict: 'not_this' },
      fakeContext({ userId: 5 }),
    );
    assert.deepEqual(setPieceVerdictCalls[0].slice(1), [5, 1, 2, 'not_this']);
    assert.equal(result.success, true);
    assert.equal(result.outfit, updated);
  });

  await t.test('setPieceVerdict: omitted verdict is passed to the DAL as null (clear)', async () => {
    getOutfitReturn = {
      id: 1,
      status: 'proposed',
      pieces: [{ garment: { id: 2 } }],
    };
    setPieceVerdictReturn = { id: 1, status: 'proposed', pieces: [] };
    setPieceVerdictCalls.length = 0;
    await Mutation.setPieceVerdict(
      undefined,
      { outfitId: '1', garmentId: '2' },
      fakeContext(),
    );
    assert.equal(setPieceVerdictCalls[0][4], null);
  });

  // --- rewearOutfit (feature 5) -----------------------------------------

  await t.test('rewearOutfit: opens a transaction, coerces id, shapes the new outfit result', async () => {
    let withTransactionCalls = 0;
    rewearOutfitCalls.length = 0;
    const updated = { id: 2, status: 'worn', pieces: [] };
    rewearOutfitReturn = updated;
    const ctx = fakeContext({
      userId: 9,
      withTransaction: async (fn) => {
        withTransactionCalls += 1;
        return fn({} as never);
      },
    });

    const result = await Mutation.rewearOutfit(
      undefined,
      { id: '7', wornOn: '2026-02-14' },
      ctx,
    );

    assert.equal(withTransactionCalls, 1);
    assert.deepEqual(rewearOutfitCalls[0].slice(1), [9, 7, '2026-02-14']);
    assert.equal(result.success, true);
    assert.equal(result.outfit, updated);
  });

  await t.test('rewearOutfit: a null from the DAL (not the caller\'s outfit) becomes NOT_FOUND', async () => {
    rewearOutfitReturn = null;
    const result = await Mutation.rewearOutfit(
      undefined,
      { id: '7' },
      fakeContext(),
    );
    assert.equal(result.success, false);
    assert.equal(result.code, 'NOT_FOUND');
  });

  // --- transaction boundary placement (resolver spec §7.3) ---------------

  await t.test('createGarment opens a transaction (multi-statement write); retireGarment does not (single-statement)', async () => {
    let withTransactionCalls = 0;
    retireGarmentReturn = { id: 1 };
    const ctx = fakeContext({
      withTransaction: async (fn) => {
        withTransactionCalls += 1;
        return fn({} as never);
      },
    });

    await Mutation.createGarment(
      undefined,
      { input: { garmentTypeId: 1 } },
      ctx,
    );
    assert.equal(withTransactionCalls, 1);

    await Mutation.retireGarment(undefined, { id: '1' }, ctx);
    // Unchanged -- retireGarment is a single-statement write and passes
    // ctx.pool directly, per the server spec §3 Queryable/TxClient split.
    assert.equal(withTransactionCalls, 1);
  });

  // --- ID coercion + ownership-agnostic pass-through ----------------------

  await t.test('deleteCompatibilityEdge coerces both ids and returns success purely from the DAL boolean', async () => {
    deleteEdgeCalls.length = 0;
    deleteEdgeReturn = false;
    const result = await Mutation.deleteCompatibilityEdge(
      undefined,
      { garmentAId: '10', garmentBId: '20' },
      fakeContext({ userId: 5 }),
    );

    assert.equal(deleteEdgeCalls[0][1], 5); // ctx.userId
    assert.equal(deleteEdgeCalls[0][2], 10); // coerced from '10'
    assert.equal(deleteEdgeCalls[0][3], 20); // coerced from '20'
    assert.equal(result.success, false);
    assert.equal(result.code, 'NOT_FOUND');
  });
});
