// Loop contract (tool layer dev spec §7). Pure orchestration -- no DAL
// access here, all of that lives behind dispatchToolCall (tools/registry.ts).
import type { Pool } from 'pg';
import type { TxClient } from '../db/transaction';
import { dispatchToolCall, type ToolUseBlock } from '../tools/registry';
import { toolDefinitions } from '../tools/definitions';
import type { AgentContext } from './context';
import type {
  ConversationMessage,
  ModelClient,
  ToolResultBlock,
} from './modelClient';
import type { PaletteProvider } from './palette';
import type { ProposalReportSink } from './proposalReport';
import type { Location, WeatherProvider } from './weather';

export const MAX_ITERATIONS = 6;

const SYSTEM_PROMPT =
  'You are a wardrobe assistant. Propose one outfit for the occasion the ' +
  'user describes, using only garments returned by get_candidates. Always ' +
  'call get_candidates first. A complete outfit must include at least a top ' +
  '(a base-layer garment), a bottom, and footwear; you may add mid, outer, ' +
  'or accessory garments on top of that. get_candidates reports ' +
  'missing_required_slots -- if it is non-empty, or the candidates are ' +
  'otherwise insufficient, do not call propose_outfit; explain which slot ' +
  'is empty instead. ' +
  'Before proposing, you may call get_outfit_feedback to see which looks and ' +
  'pairings the user has previously rejected or marked not-this, and avoid ' +
  'repeating them. ' +
  'Weather: dress the user for the forecast that get_candidates reports, and ' +
  "state the forecast in your reply. Only when the user explicitly tells you " +
  'the current weather where they are, or to disregard the forecast, pass it ' +
  'as stated_temp_f / stated_condition -- then say what the forecast was and ' +
  'that you went with what they told you instead. ' +
  'Before proposing, call get_palette to get colour swatches for the ' +
  'garments, then include the full look card in propose_outfit: a two or ' +
  'three word title; one uppercase meta_line (e.g. "THREE LAYERS - SMART"); ' +
  'accent_color and wash_color_a / wash_color_b as #rrggbb hex chosen from ' +
  'the palette; and piece_rationales -- one short sentence per garment on why ' +
  'it is in the look. Every garment_id needs its own piece_rationales entry.';

export interface LoopResult {
  text: string | null;
  outfitProposed: boolean;
  terminatedReason:
    | 'end_turn'
    | 'proposed'
    | 'max_iterations'
    // propose_outfit produced a valid garment set but could not format a
    // valid look card after one retry: the proposal was discarded (not
    // persisted, not rejected) and a report was filed. See
    // tools/proposeOutfit.ts.
    | 'proposal_discarded';
  messages: ConversationMessage[];
}

// Deps are injected (model client, weather provider, location lookup, db
// handles) so the loop itself never constructs a Pool or an Anthropic
// client -- composition.ts owns that, same rule as every other entry point
// (see agent/runtime.ts).
export interface LoopDeps {
  modelClient: ModelClient;
  weatherProvider: WeatherProvider;
  // Location is meant to come from the user's profile (tool layer dev spec
  // §3), never a model-supplied parameter -- but db/schema.sql's users
  // table has no location column yet. Injected here as an open seam rather
  // than guessed at, pending that schema decision.
  getLocationForUser: (userId: number) => Promise<Location>;
  pool: Pool;
  withTransaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>;
  now: () => Date;
  paletteProvider: PaletteProvider;
  proposalReportSink: ProposalReportSink;
}

export async function runAgentLoop(
  deps: LoopDeps,
  userId: number,
  userMessage: string,
): Promise<LoopResult> {
  const now = deps.now();
  const location = await deps.getLocationForUser(userId);
  const forecast = await deps.weatherProvider.forecast(location, now);

  const ctx: AgentContext = {
    userId,
    pool: deps.pool,
    withTransaction: deps.withTransaction,
    weather: forecast,
    forecastWeather: forecast,
    statedWeather: null,
    now,
    lastCandidateCall: null,
    paletteProvider: deps.paletteProvider,
    proposalReportSink: deps.proposalReportSink,
    presentationFailures: 0,
  };

  const messages: ConversationMessage[] = [
    { role: 'user', content: userMessage },
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await deps.modelClient.send({
      system: SYSTEM_PROMPT,
      messages,
      tools: toolDefinitions,
      // First turn only: candidates are always needed, so forcing removes
      // a sequencing failure mode (tool layer dev spec §7).
      toolChoice: iteration === 0 ? { type: 'tool', name: 'get_candidates' } : { type: 'auto' },
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map((block) => block.text)
        .join('');
      return { text, outfitProposed: false, terminatedReason: 'end_turn', messages };
    }

    if (response.stop_reason !== 'tool_use') {
      // max_tokens / stop_sequence: not modeled by the contract as a
      // recoverable branch. Treat as end of loop with whatever text exists.
      return { text: null, outfitProposed: false, terminatedReason: 'end_turn', messages };
    }

    // Assistant message appended VERBATIM -- the API is stateless, and the
    // model loses what it just said otherwise (tool layer dev spec §7).
    messages.push({ role: 'assistant', content: response.content });

    const toolUseBlocks = response.content.filter(
      (block): block is { type: 'tool_use'; id: string; name: string; input: unknown } =>
        block.type === 'tool_use',
    );

    const results: ToolResultBlock[] = [];
    let proposedThisTurn = false;
    let discardedThisTurn = false;
    for (const block of toolUseBlocks) {
      const toolUse: ToolUseBlock = {
        tool_use_id: block.id,
        name: block.name,
        input: block.input,
      };
      const result = await dispatchToolCall(ctx, toolUse);
      results.push({
        type: 'tool_result',
        tool_use_id: result.tool_use_id,
        is_error: result.is_error,
        content: result.content,
      });
      // endLoop is internal to the tool layer -- it never goes into the
      // ToolResultBlock above, only steers the loop here.
      if (result.endLoop) {
        discardedThisTurn = true;
      }
      if (block.name === 'propose_outfit' && !result.is_error) {
        proposedThisTurn = true;
      }
    }

    // All results in ONE user message (tool layer dev spec §7c).
    messages.push({ role: 'user', content: results });

    if (discardedThisTurn) {
      return {
        text: null,
        outfitProposed: false,
        terminatedReason: 'proposal_discarded',
        messages,
      };
    }

    if (proposedThisTurn) {
      return { text: null, outfitProposed: true, terminatedReason: 'proposed', messages };
    }
  }

  return { text: null, outfitProposed: false, terminatedReason: 'max_iterations', messages };
}
