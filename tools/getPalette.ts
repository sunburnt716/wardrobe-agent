// get_palette (Fitcheck design spec §3). Returns dominant colour swatches
// per garment so the model can choose the look card's accent (one) and wash
// gradient (two) for propose_outfit. Read-only.
//
// garment_ids is optional: it defaults to the garments the last
// get_candidates call returned this conversation. Passing ids the user
// doesn't own, or that have no colour information, just omits them from the
// result.
import { queryRows } from '../db/transaction';
import type { AgentContext } from '../agent/context';
import type { GarmentColorInput } from '../agent/palette';
import { getPaletteSchema } from './schemas';
import { errorResult, okResult, type ToolResult } from './toolResult';

export async function getPalette(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = getPaletteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(toolUseId, `Invalid input: ${parsed.error.message}`);
  }

  const requestedIds = parsed.data.garment_ids?.map((id) => Number(id));
  if (requestedIds && requestedIds.some((id) => !Number.isInteger(id))) {
    return errorResult(toolUseId, 'garment_ids must be numeric garment ids.');
  }

  const ids = requestedIds ?? ctx.lastCandidateCall?.candidateGarmentIds ?? [];
  if (ids.length === 0) {
    return errorResult(
      toolUseId,
      'No garments to sample. Call get_candidates first, or pass garment_ids.',
    );
  }

  // user_id scopes this -- a stranger's garment id yields no row and is
  // simply absent from the provider input.
  const rows = await queryRows<{
    garment_id: number;
    photo_key: string | null;
    primary_color: string | null;
    secondary_color: string | null;
  }>(
    ctx.pool,
    `SELECT garment_id, photo_key, primary_color, secondary_color
     FROM garments WHERE garment_id = ANY($1::int[]) AND user_id = $2`,
    [ids, ctx.userId],
  );

  const providerInput: GarmentColorInput[] = rows.map((r) => ({
    garmentId: r.garment_id,
    photoKey: r.photo_key,
    primaryColor: r.primary_color,
    secondaryColor: r.secondary_color,
  }));

  const palettes = await ctx.paletteProvider.extract(providerInput);

  return okResult(toolUseId, {
    palettes: rows
      .filter((r) => palettes.has(r.garment_id))
      .map((r) => ({
        garment_id: String(r.garment_id),
        swatches: palettes.get(r.garment_id)!.map((s) => ({
          hex: s.hex,
          coverage: s.coverage,
        })),
      })),
  });
}
