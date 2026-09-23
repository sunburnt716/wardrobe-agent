// get_candidates (tool layer dev spec §4.1). Forced as the first tool call
// of every loop iteration (see agent/loop.ts) -- candidates are always
// needed, and forcing it removes a sequencing failure mode.
import { listCandidateGarments } from '../api/dal/garments';
import { REQUIRED_OUTFIT_LAYERS } from '../api/dal/outfitComposition';
import { getLastWornDates } from '../api/dal/outfits';
import type { AgentContext } from '../agent/context';
import { applyStatedWeather } from '../agent/weather';
import { daysAgo } from './dates';
import { FORMALITY_BAND_BY_LEVEL } from './formality';
import { getCandidatesSchema } from './schemas';
import { errorResult, okResult, type ToolResult } from './toolResult';
import { toModelView } from './view';

export async function getCandidates(
  ctx: AgentContext,
  toolUseId: string,
  rawInput: unknown,
): Promise<ToolResult> {
  const parsed = getCandidatesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(toolUseId, `Invalid input: ${parsed.error.message}`);
  }
  const input = parsed.data;

  // Stashed so propose_outfit can snapshot the same occasion/vibe onto the
  // outfits row later this conversation (db/schema.sql's decision-time
  // snapshot invariant) -- notes doubles as the free-text occasion/vibe
  // description since get_candidates has no separate vibe field.
  // candidateGarmentIds is filled in below, once the candidates are known --
  // get_palette defaults to that set.
  ctx.lastCandidateCall = { occasion: input.notes };

  // Weather override: fold any newly stated fields into the running
  // statedWeather (a mid-conversation "actually it's raining" adds to an
  // earlier "it's 80"), then recompute the effective weather from the
  // untouched forecast. Writing it back to ctx.weather is what makes
  // propose_outfit's decision snapshot record what the proposal was actually
  // made on -- see agent/weather.ts and agent/context.ts.
  if (input.stated_temp_f !== undefined || input.stated_condition !== undefined) {
    ctx.statedWeather = {
      ...ctx.statedWeather,
      ...(input.stated_temp_f !== undefined && { tempF: input.stated_temp_f }),
      ...(input.stated_condition !== undefined && {
        condition: input.stated_condition,
      }),
    };
  }
  ctx.weather = applyStatedWeather(ctx.forecastWeather, ctx.statedWeather);

  const candidates = await listCandidateGarments(ctx.pool, ctx.userId, {
    tempC: (ctx.weather.tempF - 32) * (5 / 9),
    weatherCondition: ctx.weather.condition,
    formalityTarget: FORMALITY_BAND_BY_LEVEL[input.formality],
  });

  ctx.lastCandidateCall.candidateGarmentIds = candidates.map((g) => g.id);

  const lastWorn = await getLastWornDates(
    ctx.pool,
    ctx.userId,
    candidates.map((g) => g.id),
  );

  const views = candidates.map((g) => {
    const lastWornOn = lastWorn.get(g.id);
    return toModelView(g, lastWornOn ? daysAgo(ctx.now, lastWornOn) : null);
  });

  const countsByType: Record<string, number> = {};
  for (const view of views) {
    countsByType[view.type] = (countsByType[view.type] ?? 0) + 1;
  }

  // Required-slot coverage, stated explicitly. counts_by_type omits a layer
  // with zero candidates, so an empty required slot would only show as a
  // *missing key* -- easy for the model to miss. required_slots always keys
  // all three (0 when empty); missing_required_slots is the gap list. If it's
  // non-empty, a complete outfit isn't possible from this wardrobe today and
  // the model should explain that rather than propose_outfit (which would
  // reject it as OUTFIT_INCOMPLETE anyway).
  const requiredSlots: Record<string, number> = {};
  for (const layer of REQUIRED_OUTFIT_LAYERS) {
    requiredSlots[layer] = countsByType[layer] ?? 0;
  }
  const missingRequiredSlots = REQUIRED_OUTFIT_LAYERS.filter(
    (layer) => (countsByType[layer] ?? 0) === 0,
  );

  return okResult(toolUseId, {
    candidates: views,
    counts_by_type: countsByType,
    required_slots: requiredSlots,
    missing_required_slots: missingRequiredSlots,
    // forecast is always the untouched provider reading; weather_used is what
    // the filter above actually ran on. They differ only when the user has
    // stated the weather (weather_used.source === 'user_stated'), in which
    // case the model should tell the user the forecast and that it went with
    // their statement.
    forecast: weatherReport(ctx.forecastWeather),
    weather_used: weatherReport(ctx.weather),
  });
}

function weatherReport(w: {
  tempF: number;
  condition: string;
  source: string;
}): { temp_f: number; condition: string; source: string } {
  return { temp_f: Math.round(w.tempF), condition: w.condition, source: w.source };
}
