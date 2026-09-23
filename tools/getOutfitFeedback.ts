// get_outfit_feedback (feature 6). Read-only: recent outfits that carry
// explicit user feedback -- a rejection, or a piece-level love / not_this --
// so the agent can steer toward loved pairings and away from rejected ones.
// Recency and feedback are two different concerns, so this is its own tool
// rather than fields bolted onto get_recent_outfits.
import { getOutfitFeedback as getOutfitFeedbackDal } from '../api/dal/outfits';
import type { AgentContext } from '../agent/context';
import { getOutfitFeedbackSchema } from './schemas';
import { errorResult, okResult, type ToolResult } from './toolResult';

const DEFAULT_LIMIT = 10;

export async function getOutfitFeedback(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = getOutfitFeedbackSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(toolUseId, `Invalid input: ${parsed.error.message}`);
  }
  const limit = parsed.data.limit ?? DEFAULT_LIMIT;

  const rows = await getOutfitFeedbackDal(ctx.pool, ctx.userId, limit);

  return okResult(toolUseId, {
    feedback: rows.map((row) => ({
      outfit_id: String(row.outfitId),
      status: row.status,
      worn_on: row.wornOn,
      rejection_reason: row.rejectionReason,
      pieces: row.pieces.map((p) => ({
        garment_id: String(p.garmentId),
        type: p.garmentTypeName,
        verdict: p.verdict, // 'love' | 'not_this' | null
      })),
    })),
  });
}
