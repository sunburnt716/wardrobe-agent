// get_recent_outfits (tool layer dev spec §4.3). Returns garments, not
// outfits -- per-garment recency is what the avoid-repetition decision
// needs; outfit-level grouping isn't useful for that.
import { getRecentlyWornGarments } from '../api/dal/outfits';
import type { AgentContext } from '../agent/context';
import { dateNDaysAgo } from './dates';
import { getRecentOutfitsSchema } from './schemas';
import { errorResult, okResult, type ToolResult } from './toolResult';

const DEFAULT_DAYS = 7;

export async function getRecentOutfits(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = getRecentOutfitsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(toolUseId, `Invalid input: ${parsed.error.message}`);
  }
  const days = parsed.data.days ?? DEFAULT_DAYS;

  const since = dateNDaysAgo(ctx.now, days);
  const rows = await getRecentlyWornGarments(ctx.pool, ctx.userId, since);

  return okResult(toolUseId, {
    recent: rows.map((row) => ({
      garment_id: String(row.garmentId),
      type: row.garmentTypeName,
      last_worn: row.lastWornOn,
    })),
  });
}
