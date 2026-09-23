// Eval: propose_outfit's required look card (Fitcheck design spec §4).
//
// Pins:
//   1. A complete valid card persists onto the outfit + every piece.
//   2. One malformed card gets a corrective retry; a valid retry persists.
//   3. A card that stays invalid after the retry: the proposal is DISCARDED
//      (no outfits row, and specifically NOT status='rejected') and a report
//      is filed for in-app review.
//   4. get_palette returns per-garment swatches for the candidate set.
//
// Mutations that should turn these red:
//   - make presentation fields optional in tools/schemas.ts  -> evals 1a/2/3
//   - drop the one-retry allowance (fail on first)           -> eval 2
//   - persist the outfit before validating the card          -> eval 3
//   - mark the discarded proposal rejected                   -> eval 3
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { testPool } from '../db/testDb';
import {
  callGetCandidates,
  callGetPalette,
  callProposeOutfit,
  makeWorld,
  validCard,
} from './harness';

test('eval: a complete look card persists on the outfit and every piece', async () => {
  const w = await makeWorld();
  try {
    const result = await w.run([
      callGetCandidates(),
      callProposeOutfit(validCard([...w.garmentIds])),
    ]);

    assert.equal(result.terminatedReason, 'proposed');
    assert.equal(result.outfitProposed, true);

    const outfits = await w.outfitsForUser();
    assert.equal(outfits.length, 1);
    assert.equal(outfits[0].status, 'proposed');
    assert.equal(outfits[0].title, 'Off Duty');

    const { rows } = await testPool.query(
      `SELECT meta_line, accent_color, wash_color_a, wash_color_b FROM outfits WHERE outfit_id = $1`,
      [outfits[0].outfit_id],
    );
    assert.equal(rows[0].meta_line, 'THREE PIECES · CASUAL');
    assert.equal(rows[0].accent_color, '#2f4a7a');

    const pieces = await w.piecesForOutfit(outfits[0].outfit_id);
    assert.equal(pieces.length, 3);
    assert.ok(pieces.every((p) => p.rationale && p.rationale.length > 0));

    assert.equal(w.reports.length, 0);
  } finally {
    await w.cleanup();
  }
});

test('eval: a malformed card gets one corrective retry, then a valid retry persists', async () => {
  const w = await makeWorld();
  try {
    const bad = validCard([...w.garmentIds]);
    delete (bad as Record<string, unknown>).piece_rationales; // card incomplete

    const result = await w.run([
      callGetCandidates(),
      callProposeOutfit(bad, 'tu_bad'),
      callProposeOutfit(validCard([...w.garmentIds]), 'tu_ok'),
    ]);

    assert.equal(result.terminatedReason, 'proposed');
    const outfits = await w.outfitsForUser();
    assert.equal(outfits.length, 1);
    assert.equal(outfits[0].status, 'proposed');
    assert.equal(w.reports.length, 0);
  } finally {
    await w.cleanup();
  }
});

test('eval: a card that stays invalid is discarded and reported, never persisted or rejected', async () => {
  const w = await makeWorld();
  try {
    const bad = validCard([...w.garmentIds]);
    (bad as Record<string, unknown>).accent_color = 'navy'; // not #rrggbb

    const result = await w.run([
      callGetCandidates(),
      callProposeOutfit(bad, 'tu_bad1'),
      callProposeOutfit(bad, 'tu_bad2'),
    ]);

    assert.equal(result.terminatedReason, 'proposal_discarded');
    assert.equal(result.outfitProposed, false);

    // Nothing persisted -- and crucially no 'rejected' row.
    const outfits = await w.outfitsForUser();
    assert.deepEqual(outfits, []);

    // A report was filed with the garment set and the validation errors.
    assert.equal(w.reports.length, 1);
    assert.equal(w.reports[0].userId, w.userId);
    assert.deepEqual(
      [...w.reports[0].garmentIds].sort((a, b) => a - b),
      [...w.garmentIds].sort((a, b) => a - b),
    );
    assert.ok(w.reports[0].validationErrors.some((e) => e.includes('accent_color')));
  } finally {
    await w.cleanup();
  }
});

test('eval: get_palette returns per-garment swatches for the candidate set', async () => {
  const w = await makeWorld();
  try {
    // Drive one loop turn that calls get_palette, then ends the turn.
    const result = await w.run([
      callGetCandidates(),
      callGetPalette([...w.garmentIds]),
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] },
    ]);

    assert.equal(result.terminatedReason, 'end_turn');
    // The palette tool_result is in the transcript.
    const toolResults = result.messages
      .filter((m) => m.role === 'user' && Array.isArray(m.content))
      .flatMap((m) => m.content as { type: string; content: string }[])
      .filter((b) => b.type === 'tool_result');
    const paletteResult = toolResults.find((b) => b.content.includes('swatches'));
    assert.ok(paletteResult, 'get_palette returned a swatches payload');
    const payload = JSON.parse(paletteResult!.content) as {
      palettes: { garment_id: string; swatches: { hex: string }[] }[];
    };
    assert.equal(payload.palettes.length, 3);
    assert.ok(payload.palettes.every((p) => p.swatches.length > 0));
  } finally {
    await w.cleanup();
  }
});
