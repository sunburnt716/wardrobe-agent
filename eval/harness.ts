// Eval harness. Unlike the unit suites, an eval runs a whole agent
// trajectory -- model turns scripted, tools and DB real -- and asserts on
// the end state (what got persisted, what report was filed, how the loop
// terminated). It derives from the design spec, not the implementation:
// each eval names the spec behaviour it pins.
//
// Real Postgres via db/testDb's pool. runAgentLoop opens its own
// transactions through deps.withTransaction, so a test cannot wrap the whole
// run in one rollback -- each eval cleans up the rows it made, same pattern
// as agent/loop.test.ts.
import { testPool } from '../db/testDb';
import { withTransaction } from '../db/transaction';
import * as fx from '../db/testFixtures';
import { runAgentLoop, type LoopDeps, type LoopResult } from '../agent/loop';
import type {
  ConversationMessage,
  ModelClient,
  ModelResponse,
  ToolChoice,
} from '../agent/modelClient';
import type { PaletteProvider, Swatch } from '../agent/palette';
import type { ProposalReport, ProposalReportSink } from '../agent/proposalReport';
import type { Location, WeatherProvider } from '../agent/weather';

export function scriptedModel(script: ModelResponse[]): ModelClient & {
  calls: { messages: ConversationMessage[]; toolChoice: ToolChoice }[];
} {
  const calls: { messages: ConversationMessage[]; toolChoice: ToolChoice }[] = [];
  return {
    calls,
    async send(params) {
      calls.push({ messages: params.messages, toolChoice: params.toolChoice });
      const response = script[calls.length - 1];
      if (!response) throw new Error('scriptedModel: script exhausted');
      return response;
    },
  };
}

const clearWeather: WeatherProvider = {
  async forecast() {
    return { condition: 'clear' as const, tempF: 65, source: 'live' as const };
  },
};

// Every garment gets the same two swatches, enough for the model to pick an
// accent + wash gradient in a scripted trajectory.
export const fixedPalette: PaletteProvider = {
  async extract(garments) {
    const swatches: Swatch[] = [
      { hex: '#2f4a7a', coverage: 1 },
      { hex: '#cfd8d2', coverage: 0.4 },
    ];
    return new Map(garments.map((g) => [g.garmentId, swatches]));
  },
};

export interface EvalWorld {
  userId: number;
  // A complete outfit: [base, bottom, footwear].
  garmentIds: [number, number, number];
  typeIds: number[];
  reports: ProposalReport[];
  run(script: ModelResponse[], message?: string): Promise<LoopResult>;
  outfitsForUser(): Promise<
    { outfit_id: number; status: string; title: string | null; worn_on: string | null }[]
  >;
  piecesForOutfit(
    outfitId: number,
  ): Promise<{ garment_id: number; rationale: string | null }[]>;
  cleanup(): Promise<void>;
}

export async function makeWorld(): Promise<EvalWorld> {
  const { userId, garmentIds, typeIds } = await withTransaction(
    testPool,
    async (tx) => {
      const uid = await fx.insertUser(tx);
      const base = await fx.insertGarmentType(tx, { layer: 'base' });
      const bottom = await fx.insertGarmentType(tx, { layer: 'bottom' });
      const footwear = await fx.insertGarmentType(tx, { layer: 'footwear' });
      // Sequential: these share one tx client, which can't run queries in
      // parallel.
      const gids: number[] = [
        await fx.insertGarment(tx, uid, base, { primaryColor: 'navy' }),
        await fx.insertGarment(tx, uid, bottom, { primaryColor: 'charcoal' }),
        await fx.insertGarment(tx, uid, footwear, { primaryColor: 'brown' }),
      ];
      return {
        userId: uid,
        garmentIds: gids as [number, number, number],
        typeIds: [base, bottom, footwear],
      };
    },
  );

  const reports: ProposalReport[] = [];
  const sink: ProposalReportSink = { file: async (r) => void reports.push(r) };

  const deps = (script: ModelResponse[]): LoopDeps => ({
    modelClient: scriptedModel(script),
    weatherProvider: clearWeather,
    getLocationForUser: async (): Promise<Location> => ({ latitude: 0, longitude: 0 }),
    pool: testPool,
    withTransaction: (fn) => withTransaction(testPool, fn),
    now: () => new Date('2026-01-15T00:00:00Z'),
    paletteProvider: fixedPalette,
    proposalReportSink: sink,
  });

  return {
    userId,
    garmentIds,
    typeIds,
    reports,
    run: (script, message = 'What should I wear today?') =>
      runAgentLoop(deps(script), userId, message),
    async outfitsForUser() {
      const { rows } = await testPool.query(
        `SELECT outfit_id, status, title, worn_on FROM outfits WHERE user_id = $1 ORDER BY outfit_id`,
        [userId],
      );
      return rows;
    },
    async piecesForOutfit(outfitId: number) {
      const { rows } = await testPool.query(
        `SELECT garment_id, rationale FROM outfit_garments WHERE outfit_id = $1 ORDER BY garment_id`,
        [outfitId],
      );
      return rows;
    },
    async cleanup() {
      await testPool.query(
        `DELETE FROM outfit_garments WHERE outfit_id IN (SELECT outfit_id FROM outfits WHERE user_id = $1)`,
        [userId],
      );
      await testPool.query(`DELETE FROM outfits WHERE user_id = $1`, [userId]);
      await testPool.query(`DELETE FROM garments WHERE garment_id = ANY($1::int[])`, [
        garmentIds,
      ]);
      await testPool.query(`DELETE FROM garment_types WHERE garment_type_id = ANY($1::int[])`, [
        typeIds,
      ]);
      await testPool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
    },
  };
}

// --- scripted-response builders -----------------------------------------

export function callGetCandidates(id = 'tu_cand'): ModelResponse {
  return {
    stop_reason: 'tool_use',
    content: [
      { type: 'tool_use', id, name: 'get_candidates', input: { formality: 'casual' } },
    ],
  };
}

export function callGetPalette(garmentIds: number[], id = 'tu_pal'): ModelResponse {
  return {
    stop_reason: 'tool_use',
    content: [
      {
        type: 'tool_use',
        id,
        name: 'get_palette',
        input: { garment_ids: garmentIds.map(String) },
      },
    ],
  };
}

export function callProposeOutfit(
  input: Record<string, unknown>,
  id = 'tu_prop',
): ModelResponse {
  return {
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', id, name: 'propose_outfit', input }],
  };
}

export function validCard(garmentIds: number[]): Record<string, unknown> {
  return {
    garment_ids: garmentIds.map(String),
    rationale: 'Everything sits at the same formality for a casual day.',
    title: 'Off Duty',
    meta_line: 'THREE PIECES · CASUAL',
    accent_color: '#2f4a7a',
    wash_color_a: '#e7dcc6',
    wash_color_b: '#cfd8d2',
    piece_rationales: garmentIds.map((gid, i) => ({
      garment_id: String(gid),
      rationale: `piece ${i + 1} anchors the look.`,
    })),
  };
}
