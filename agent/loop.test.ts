// Loop suite (tool layer dev spec §7/§10). Model client is a deterministic
// fake -- zero API calls -- but tool dispatch still hits real Postgres via
// dispatchToolCall, so this uses the real withTransaction (not
// withRollback's forced-rollback wrapper) with manual cleanup, same pattern
// as outfits.test.ts's cross-tenant/atomicity tests.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testPool } from '../db/testDb';
import { withTransaction } from '../db/transaction';
import * as fx from '../db/testFixtures';
import { runAgentLoop, MAX_ITERATIONS, type LoopDeps } from './loop';
import type {
  ConversationMessage,
  ModelClient,
  ModelResponse,
  ToolChoice,
} from './modelClient';
import type { Location, WeatherProvider } from './weather';

function fakeModelClient(script: ModelResponse[]): ModelClient & {
  calls: { messages: ConversationMessage[]; toolChoice: ToolChoice }[];
} {
  const calls: { messages: ConversationMessage[]; toolChoice: ToolChoice }[] = [];
  return {
    calls,
    async send(params) {
      calls.push({ messages: params.messages, toolChoice: params.toolChoice });
      const response = script[calls.length - 1];
      if (!response) throw new Error('fakeModelClient: script exhausted');
      return response;
    },
  };
}

const fakeWeather: WeatherProvider = {
  async forecast(): Promise<{ condition: 'clear'; tempF: number; source: 'live' }> {
    return { condition: 'clear', tempF: 65, source: 'live' };
  },
};

// A syntactically complete look card, for tests whose subject isn't the card.
function validCard(garmentIds: number[]): Record<string, unknown> {
  return {
    title: 'Test Look',
    meta_line: 'THREE PIECES',
    accent_color: '#2f4a7a',
    wash_color_a: '#e7dcc6',
    wash_color_b: '#cfd8d2',
    piece_rationales: garmentIds.map((id) => ({
      garment_id: String(id),
      rationale: 'works with the rest.',
    })),
  };
}

function baseDeps(script: ModelResponse[]): LoopDeps & {
  modelClient: ReturnType<typeof fakeModelClient>;
} {
  return {
    modelClient: fakeModelClient(script),
    weatherProvider: fakeWeather,
    getLocationForUser: async (): Promise<Location> => ({ latitude: 0, longitude: 0 }),
    pool: testPool,
    withTransaction: (fn) => withTransaction(testPool, fn),
    now: () => new Date('2026-01-15T00:00:00Z'),
    paletteProvider: { extract: async () => new Map() },
    proposalReportSink: { file: async () => {} },
  };
}

test('runAgentLoop: forces get_candidates on the first turn, auto after', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  const typeId = await withTransaction(testPool, (tx) => fx.insertGarmentType(tx));

  const deps = baseDeps([
    {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu_1', name: 'get_candidates', input: { formality: 'casual' } }],
    },
    {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Not enough candidates to propose anything.' }],
    },
  ]);

  await runAgentLoop(deps, userId, 'What should I wear today?');

  assert.equal(deps.modelClient.calls.length, 2);
  assert.deepEqual(deps.modelClient.calls[0].toolChoice, { type: 'tool', name: 'get_candidates' });
  assert.deepEqual(deps.modelClient.calls[1].toolChoice, { type: 'auto' });

  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = $1`, [typeId]);
  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});

test('runAgentLoop: happy path terminates deterministically on propose_outfit, commits the proposal', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));
  // A complete outfit needs top + bottom + footwear (api/dal/outfitComposition.ts),
  // or proposeOutfit rejects it as OUTFIT_INCOMPLETE.
  const { garmentIds: [g1, g2, g3], typeIds } = await withTransaction(
    testPool,
    async (tx) => {
      const base = await fx.insertGarmentType(tx, { layer: 'base' });
      const bottom = await fx.insertGarmentType(tx, { layer: 'bottom' });
      const footwear = await fx.insertGarmentType(tx, { layer: 'footwear' });
      const garmentIds = await Promise.all([
        fx.insertGarment(tx, userId, base),
        fx.insertGarment(tx, userId, bottom),
        fx.insertGarment(tx, userId, footwear),
      ]);
      return { garmentIds, typeIds: [base, bottom, footwear] };
    },
  );

  const deps = baseDeps([
    {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu_1', name: 'get_candidates', input: { formality: 'casual' } }],
    },
    {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'tu_2',
          name: 'propose_outfit',
          input: {
            garment_ids: [String(g1), String(g2), String(g3)],
            rationale: 'They match.',
            ...validCard([g1, g2, g3]),
          },
        },
      ],
    },
  ]);

  const result = await runAgentLoop(deps, userId, 'What should I wear today?');

  assert.equal(result.terminatedReason, 'proposed');
  assert.equal(result.outfitProposed, true);
  assert.equal(deps.modelClient.calls.length, 2);

  const outfitRows = (
    await testPool.query(`SELECT status, worn_on FROM outfits WHERE user_id = $1`, [userId])
  ).rows;
  assert.equal(outfitRows.length, 1);
  assert.equal(outfitRows[0].status, 'proposed');
  assert.equal(outfitRows[0].worn_on, null);

  await testPool.query(
    `DELETE FROM outfit_garments WHERE outfit_id IN (SELECT outfit_id FROM outfits WHERE user_id = $1)`,
    [userId],
  );
  await testPool.query(`DELETE FROM outfits WHERE user_id = $1`, [userId]);
  await testPool.query(`DELETE FROM garments WHERE garment_id = ANY($1::int[])`, [[g1, g2, g3]]);
  await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = ANY($1::int[])`, [typeIds]);
  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});

test('runAgentLoop: terminates with max_iterations after MAX_ITERATIONS turns, never calling propose_outfit', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));

  const script: ModelResponse[] = Array.from({ length: MAX_ITERATIONS }, (_, i) => ({
    stop_reason: 'tool_use' as const,
    content: [
      {
        type: 'tool_use' as const,
        id: `tu_${i}`,
        name: 'get_wardrobe_summary',
        input: {},
      },
    ],
  }));
  const deps = baseDeps(script);

  const result = await runAgentLoop(deps, userId, 'What should I wear today?');

  assert.equal(result.terminatedReason, 'max_iterations');
  assert.equal(result.outfitProposed, false);
  assert.equal(deps.modelClient.calls.length, MAX_ITERATIONS);

  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});

test('runAgentLoop: an is_error tool_result (unknown tool) does not terminate the loop early', async () => {
  const userId = await withTransaction(testPool, (tx) => fx.insertUser(tx));

  const deps = baseDeps([
    {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'tu_1', name: 'not_a_real_tool', input: {} }],
    },
    {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Sorry, something went wrong.' }],
    },
  ]);

  const result = await runAgentLoop(deps, userId, 'hi');

  assert.equal(result.terminatedReason, 'end_turn');
  assert.equal(deps.modelClient.calls.length, 2);

  await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
});
