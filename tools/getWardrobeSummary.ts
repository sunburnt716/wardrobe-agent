// get_wardrobe_summary (tool layer dev spec §4.2). No parameters -- takes
// {} and always returns the whole-wardrobe aggregate.
import { getWardrobeSummary as getWardrobeSummaryDal } from '../api/dal/garments';
import type { AgentContext } from '../agent/context';
import { getWardrobeSummarySchema } from './schemas';
import { errorResult, okResult, type ToolResult } from './toolResult';

export async function getWardrobeSummary(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = getWardrobeSummarySchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(toolUseId, `Invalid input: ${parsed.error.message}`);
  }

  const summary = await getWardrobeSummaryDal(ctx.pool, ctx.userId);

  return okResult(toolUseId, {
    total_garments: summary.totalGarments,
    by_type: summary.byLayer,
    by_formality: summary.byFormality,
    unavailable_count: summary.unavailableCount,
    confirmed_outfits_count: summary.confirmedOutfitsCount,
  });
}
