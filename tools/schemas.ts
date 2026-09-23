// Zod schemas for tool input (tool layer dev spec §4). Model output is
// untrusted input -- these are the boundary between "the model sent
// something weird" and the DAL, which trusts its callers' shapes.
import { z } from 'zod';

export const FORMALITY_LEVELS = [
  'casual',
  'smart_casual',
  'business',
  'formal',
] as const;

export const getCandidatesSchema = z.object({
  formality: z.enum(FORMALITY_LEVELS),
  activity_level: z.enum(['low', 'moderate', 'high']).optional(),
  notes: z.string().max(200).optional(),
  // Weather override. Set ONLY when the user explicitly states the current
  // weather where they are, or tells you to disregard the forecast -- never
  // inferred from the season or set just because the request mentions
  // weather. Each field independently overrides the forecast for that field.
  stated_temp_f: z.number().min(-60).max(140).optional(),
  stated_condition: z.enum(['clear', 'rain', 'snow', 'wind']).optional(),
});
export type GetCandidatesInput = z.infer<typeof getCandidatesSchema>;

export const getWardrobeSummarySchema = z.object({});
export type GetWardrobeSummaryInput = z.infer<typeof getWardrobeSummarySchema>;

export const getRecentOutfitsSchema = z.object({
  days: z.number().int().min(1).max(30).optional(),
});
export type GetRecentOutfitsInput = z.infer<typeof getRecentOutfitsSchema>;

export const getOutfitFeedbackSchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
});
export type GetOutfitFeedbackInput = z.infer<typeof getOutfitFeedbackSchema>;

export const getPaletteSchema = z.object({
  // Optional: defaults to the last get_candidates result's garments.
  garment_ids: z.array(z.string()).optional(),
});
export type GetPaletteInput = z.infer<typeof getPaletteSchema>;

const HEX_COLOR = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'must be a #rrggbb hex colour');

// The look-card presentation is required (Fitcheck design spec §4). The
// handler validates in two passes against this one schema and classifies a
// failure by whether every failing path is in PRESENTATION_PATHS -- a bad
// garment set is a "fix it and retry" for the model, a bad card after one
// retry is discarded and reported (tools/proposeOutfit.ts).
export const PRESENTATION_PATHS = new Set([
  'title',
  'meta_line',
  'accent_color',
  'wash_color_a',
  'wash_color_b',
  'piece_rationales',
]);

export const proposeOutfitSchema = z
  .object({
    garment_ids: z.array(z.string()).min(2),
    rationale: z.string().max(400),
    // Two or three words -- enforced as a length cap here; the "words" part
    // is prompt guidance and an eval rubric item, not a runtime gate.
    title: z.string().min(1).max(40),
    // One uppercase meta line, e.g. "THREE LAYERS · SMART".
    meta_line: z.string().min(1).max(60),
    accent_color: HEX_COLOR,
    wash_color_a: HEX_COLOR,
    wash_color_b: HEX_COLOR,
    // One entry per garment in garment_ids -- exactly, no more, no fewer.
    piece_rationales: z
      .array(
        z.object({
          garment_id: z.string(),
          rationale: z.string().min(1).max(200),
        }),
      )
      .min(2),
  })
  .superRefine((val, ctx) => {
    // Only meaningful once both arrays parsed; if either failed its base
    // check, that issue already carries the right path.
    if (!Array.isArray(val.garment_ids) || !Array.isArray(val.piece_rationales)) {
      return;
    }
    const ids = new Set(val.garment_ids);
    const covered = new Set(val.piece_rationales.map((p) => p.garment_id));
    const missing = [...ids].filter((id) => !covered.has(id));
    const extra = [...covered].filter((id) => !ids.has(id));
    if (missing.length > 0 || extra.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['piece_rationales'],
        message:
          `piece_rationales must have exactly one entry per garment_id` +
          (missing.length ? `; missing: ${missing.join(', ')}` : '') +
          (extra.length ? `; not in outfit: ${extra.join(', ')}` : ''),
      });
    }
  });
export type ProposeOutfitToolInput = z.infer<typeof proposeOutfitSchema>;
