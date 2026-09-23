// Dispatcher suite (tool layer dev spec §10): tool_use block in, tool_result
// block out, no model, no database -- these paths (unknown name, malformed
// input) never reach ctx.pool, so a stub context is enough.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AgentContext } from '../agent/context';
import { dispatchToolCall } from './registry';

function stubContext(): AgentContext {
  return {
    userId: 1,
    pool: undefined as never, // never touched: these tests fail validation first
    withTransaction: undefined as never,
    weather: { condition: 'clear', tempF: 65, source: 'fallback' },
    forecastWeather: { condition: 'clear', tempF: 65, source: 'fallback' },
    statedWeather: null,
    now: new Date('2026-01-15T00:00:00Z'),
    lastCandidateCall: null,
    paletteProvider: { extract: async () => new Map() },
    proposalReportSink: { file: async () => {} },
    presentationFailures: 0,
  };
}

test('dispatchToolCall: unknown tool name returns is_error, not a throw', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_1',
    name: 'delete_wardrobe',
    input: {},
  });

  assert.equal(result.is_error, true);
  assert.equal(result.tool_use_id, 'tu_1');
  assert.match(result.content, /Unknown tool/);
});

test('dispatchToolCall: get_candidates with a missing required field returns is_error', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_2',
    name: 'get_candidates',
    input: { notes: 'dinner' }, // missing required `formality`
  });

  assert.equal(result.is_error, true);
});

test('dispatchToolCall: get_candidates with an invalid formality enum value returns is_error', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_3',
    name: 'get_candidates',
    input: { formality: 'ultra_fancy' },
  });

  assert.equal(result.is_error, true);
});

test('dispatchToolCall: propose_outfit with fewer than 2 garment_ids returns is_error', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_4',
    name: 'propose_outfit',
    input: { garment_ids: ['1'], rationale: 'test' },
  });

  assert.equal(result.is_error, true);
});

test('dispatchToolCall: get_outfit_feedback with a non-integer limit returns is_error', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_6',
    name: 'get_outfit_feedback',
    input: { limit: 2.5 },
  });

  assert.equal(result.is_error, true);
});

test('dispatchToolCall: get_outfit_feedback routes (empty input is valid, so it reaches the stub pool and throws)', async () => {
  await assert.rejects(() =>
    dispatchToolCall(stubContext(), {
      tool_use_id: 'tu_7',
      name: 'get_outfit_feedback',
      input: {},
    }),
  );
});

test('dispatchToolCall: get_palette with a non-array garment_ids returns is_error', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_8',
    name: 'get_palette',
    input: { garment_ids: 'not-an-array' },
  });

  assert.equal(result.is_error, true);
});

test('dispatchToolCall: get_palette with no candidate set and no garment_ids returns is_error', async () => {
  // Valid input shape, but nothing to sample -- reaches the handler, which
  // returns is_error rather than throwing on the stub pool.
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_9',
    name: 'get_palette',
    input: {},
  });

  assert.equal(result.is_error, true);
  assert.match(result.content, /get_candidates/);
});

test('dispatchToolCall: propose_outfit missing the look card is a recoverable is_error, not a throw', async () => {
  const result = await dispatchToolCall(stubContext(), {
    tool_use_id: 'tu_10',
    name: 'propose_outfit',
    input: { garment_ids: ['1', '2', '3'], rationale: 'ok' }, // no title/colours/piece_rationales
  });

  assert.equal(result.is_error, true);
  // First presentation failure -> corrective retry, loop continues.
  assert.notEqual(result.endLoop, true);
});

test('dispatchToolCall: get_wardrobe_summary accepts an empty object', async () => {
  // Reaches the DAL (no fields to fail validation on), so this only proves
  // dispatch routes correctly -- it will throw on the stub pool, which is
  // expected and asserted here rather than swallowed.
  await assert.rejects(() =>
    dispatchToolCall(stubContext(), {
      tool_use_id: 'tu_5',
      name: 'get_wardrobe_summary',
      input: {},
    }),
  );
});
