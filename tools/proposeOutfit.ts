// propose_outfit (tool layer dev spec §4.4). The only write tool, and the
// loop's deterministic terminal action (agent/loop.ts) -- termination on
// this call is not left to the model.
//
// The look-card presentation (title, meta_line, accent/wash colours, one
// rationale per piece) is required (Fitcheck design spec §4). Validation
// runs before any DB write, so a bad card never persists a row. The failure
// path is deliberate:
//   - garment set invalid  -> is_error, the model fixes it and retries
//   - card invalid, 1st time -> is_error, one corrective retry
//   - card invalid, 2nd time -> the proposal is DISCARDED (not persisted, not
//       marked rejected) and a report is filed for in-app review
//       (agent/proposalReport.ts); the loop ends.
import { InvariantViolation } from '../db/errors';
import { getLastWornDates, proposeOutfit as proposeOutfitDal } from '../api/dal/outfits';
import type { AgentContext } from '../agent/context';
import { daysAgo } from './dates';
import { PRESENTATION_PATHS, proposeOutfitSchema } from './schemas';
import { discardResult, errorResult, okResult, type ToolResult } from './toolResult';
import { toModelView } from './view';

export async function proposeOutfit(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = proposeOutfitSchema.safeParse(rawInput);
  if (!parsed.success) {
    const issues = parsed.error.issues;
    const paths = issues.map((i) => String(i.path[0] ?? ''));
    const presentationOnly =
      paths.length > 0 && paths.every((p) => PRESENTATION_PATHS.has(p));
    const detail = issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');

    if (!presentationOnly) {
      return errorResult(toolUseId, `Invalid input: ${detail}`);
    }

    ctx.presentationFailures += 1;
    if (ctx.presentationFailures < 2) {
      return errorResult(
        toolUseId,
        `The look card is invalid: ${detail}. Fix only these fields (do not ` +
          `change the garments) and call propose_outfit again.`,
      );
    }

    // Second card failure: discard and report.
    await ctx.proposalReportSink.file({
      userId: ctx.userId,
      occasion: ctx.lastCandidateCall?.occasion ?? null,
      garmentIds: garmentIdsFromRaw(rawInput) ??
        ctx.lastCandidateCall?.candidateGarmentIds ??
        [],
      attemptedAt: ctx.now.toISOString(),
      validationErrors: issues.map(
        (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
      ),
      rawModelInput: rawInput,
    });
    return discardResult(
      toolUseId,
      'The outfit was discarded: its look card could not be produced after a ' +
        'retry. A report was filed for review. Do not try again this turn.',
    );
  }

  const input = parsed.data;

  const garmentIds = input.garment_ids.map((id) => Number(id));
  if (garmentIds.some((id) => !Number.isInteger(id))) {
    return errorResult(toolUseId, 'garment_ids must be numeric garment ids.');
  }

  try {
    const outfit = await ctx.withTransaction((tx) =>
      proposeOutfitDal(tx, ctx.userId, {
        garmentIds,
        rationale: input.rationale,
        // Decision-time snapshot (db/schema.sql): ctx.weather is the effective
        // weather the get_candidates call earlier this conversation filtered
        // on -- the forecast, or the forecast with the user's stated override
        // folded in (agent/weather.ts). Never sourced from propose_outfit's
        // own model input, so the model cannot fabricate the snapshot here.
        weatherTempC: Math.round((ctx.weather.tempF - 32) * (5 / 9)),
        weatherCondition: ctx.weather.condition,
        occasion: ctx.lastCandidateCall?.occasion,
        requestedVibe: ctx.lastCandidateCall?.requestedVibe,
        // Agent-authored look card.
        title: input.title,
        metaLine: input.meta_line,
        accentColor: input.accent_color,
        washColorA: input.wash_color_a,
        washColorB: input.wash_color_b,
        pieceRationales: input.piece_rationales.map((p) => ({
          garmentId: Number(p.garment_id),
          rationale: p.rationale,
        })),
      }),
    );

    const garments = outfit.pieces.map((p) => p.garment);
    const lastWorn = await getLastWornDates(
      ctx.pool,
      ctx.userId,
      garments.map((g) => g.id),
    );
    const garmentViews = garments.map((g) => {
      const lastWornOn = lastWorn.get(g.id);
      return toModelView(g, lastWornOn ? daysAgo(ctx.now, lastWornOn) : null);
    });

    return okResult(toolUseId, {
      outfit_id: String(outfit.id),
      garments: garmentViews,
    });
  } catch (err) {
    if (err instanceof InvariantViolation) {
      // OUTFIT_INCOMPLETE carries the missing slots -- name them so the model
      // can fix the proposal instead of guessing which layer it skipped.
      if (err.code === 'OUTFIT_INCOMPLETE' && Array.isArray(err.detail.missing)) {
        return errorResult(
          toolUseId,
          `Cannot complete: OUTFIT_INCOMPLETE. The proposal is missing a garment for: ${(
            err.detail.missing as string[]
          ).join(', ')}. Every outfit needs at least a top (base), a bottom, and footwear.`,
        );
      }
      return errorResult(toolUseId, `Cannot complete: ${err.code}`);
    }
    throw err;
  }
}

// Best-effort garment ids for the failure report, straight from the raw model
// input -- the schema didn't parse, so input.garment_ids isn't available.
function garmentIdsFromRaw(raw: unknown): number[] | null {
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'garment_ids' in raw &&
    Array.isArray((raw as { garment_ids: unknown }).garment_ids)
  ) {
    const ids = (raw as { garment_ids: unknown[] }).garment_ids
      .map((v) => Number(v))
      .filter((n) => Number.isInteger(n));
    return ids.length > 0 ? ids : null;
  }
  return null;
}
