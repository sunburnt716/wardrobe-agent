// Resolver-layer suite for Query.ts. No database -- these test the
// resolver's actual job per resolver spec §1/§4: thin wiring, ID
// coercion, and calling the right DAL function with the right args.
//
// Structural note: node:test's --experimental-test-module-mocks throws
// "Cannot mock '../dal'. The module is already mocked" if a second
// top-level test() in this file tries to mock the same specifier again
// (confirmed empirically -- even calling .restore() on the returned
// MockModuleContext doesn't reliably unblock a fresh re-mock in this Node
// version). So this file is ONE outer test with a single t.mock.module
// call and nested t.test() subtests, which do share that one mock safely.
import assert from 'node:assert/strict';
import { test } from 'node:test';
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

test('Query resolvers', async (t) => {
  const getGarmentCalls: unknown[][] = [];
  let getGarmentReturn: unknown = null;
  let listGarmentsFilters: unknown;

  const real = await import('../dal');
  t.mock.module('../dal', {
    namedExports: {
      ...real,
      getGarment: async (...args: unknown[]) => {
        getGarmentCalls.push(args);
        return getGarmentReturn;
      },
      listGarments: async (
        _db: unknown,
        _userId: unknown,
        filters: unknown,
      ) => {
        listGarmentsFilters = filters;
        return [];
      },
    },
  });
  const { Query } = await import('./Query');

  // --- ID coercion (resolver spec §4) ---------------------------------
  //
  // The spec says *why* coercion has to happen here ("WHERE garment_id =
  // '47'" would otherwise fail silently via implicit cast) but never
  // specifies what should happen for a malformed numeric string. This is
  // a documented gap, not something to invent an answer for -- this
  // subtest captures what Number(id) actually produces and what reaches
  // the DAL, as a finding to report.
  await t.test('Number(id) coercion for malformed ids', async () => {
    const ctx = fakeContext({ userId: 42 });
    getGarmentCalls.length = 0;

    await Query.garment(undefined, { id: 'abc' }, ctx);
    await Query.garment(undefined, { id: '1.5' }, ctx);
    await Query.garment(undefined, { id: '-1' }, ctx);
    await Query.garment(undefined, { id: '' }, ctx);
    await Query.garment(undefined, { id: '47' }, ctx);

    assert.ok(Number.isNaN(getGarmentCalls[0][2])); // 'abc' -> NaN
    assert.equal(getGarmentCalls[1][2], 1.5); // '1.5' -> a non-integer id
    assert.equal(getGarmentCalls[2][2], -1); // '-1' -> a negative id
    assert.equal(getGarmentCalls[3][2], 0); // '' -> 0, not NaN -- easy to miss
    assert.equal(getGarmentCalls[4][2], 47); // the well-formed case, for contrast

    for (const call of getGarmentCalls) {
      assert.equal(call[0], ctx.pool);
      assert.equal(call[1], 42);
    }
  });

  // --- ownership indistinguishability (resolver spec §4) ---------------

  await t.test('a null DAL result is passed straight through, no NOT_FOUND/NOT_OWNED distinction manufactured here', async () => {
    getGarmentReturn = null;
    const result = await Query.garment(undefined, { id: '1' }, fakeContext());
    assert.equal(result, null);
  });

  // --- filter/arg passthrough -------------------------------------------

  await t.test('filters object reaches the DAL unchanged', async () => {
    const filters = { onlyClean: true, layers: ['base' as const] };
    await Query.garments(undefined, { filters }, fakeContext());
    assert.equal(listGarmentsFilters, filters);
  });
});
