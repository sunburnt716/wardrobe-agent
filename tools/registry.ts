// Dispatch table + error contract (tool layer dev spec §6/§8). Dispatch is
// on name via a lookup table, not by trusting the model -- an unrecognized
// name returns is_error rather than throwing. tool_use_id is a per-
// invocation correlation id, echoed back, never used for routing.
import type { AgentContext } from '../agent/context';
import { getCandidates } from './getCandidates';
import { getOutfitFeedback } from './getOutfitFeedback';
import { getPalette } from './getPalette';
import { getRecentOutfits } from './getRecentOutfits';
import { getWardrobeSummary } from './getWardrobeSummary';
import { proposeOutfit } from './proposeOutfit';
import { errorResult, type ToolResult } from './toolResult';

export type ToolName =
  | 'get_candidates'
  | 'get_wardrobe_summary'
  | 'get_recent_outfits'
  | 'get_outfit_feedback'
  | 'get_palette'
  | 'propose_outfit';

type ToolHandler = (
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
) => Promise<ToolResult>;

export const registry: Record<ToolName, ToolHandler> = {
  get_candidates: getCandidates,
  get_wardrobe_summary: getWardrobeSummary,
  get_recent_outfits: getRecentOutfits,
  get_outfit_feedback: getOutfitFeedback,
  get_palette: getPalette,
  propose_outfit: proposeOutfit,
};

export interface ToolUseBlock {
  tool_use_id: string;
  name: string;
  input: unknown;
}

// Recoverable errors (Zod failure, unknown name, InvariantViolation) become
// is_error results and the loop continues -- the model can read the error
// and correct (tool layer dev spec §8). Anything else (DB connection
// failure, an unexpected exception from inside a handler) is fatal and
// propagates so the loop dies rather than letting the model improvise
// around it.
export async function dispatchToolCall(
  ctx: AgentContext,
  block: ToolUseBlock,
): Promise<ToolResult> {
  const handler = registry[block.name as ToolName];
  if (!handler) {
    return errorResult(
      block.tool_use_id,
      `Unknown tool: ${block.name}. Valid tools: ${Object.keys(registry).join(', ')}.`,
    );
  }
  return handler(ctx, block.tool_use_id, block.input);
}
