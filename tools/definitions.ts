// Tool definitions sent to the model. Descriptions are verbatim from the
// tool layer dev spec §4 -- these strings are prompt surface, not
// documentation, and must not be reworded casually. input_schema is
// hand-written JSON Schema mirroring tools/schemas.ts's Zod shapes; the two
// must be kept in sync by hand since no schema-derivation library is a
// project dependency.
import type { ToolDefinition } from '../agent/modelClient';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'get_candidates',
    description:
      "Returns garments from the user's wardrobe that are valid for the described occasion, after hard constraints have been applied. Hard constraints (weather suitability, cleanliness, availability, and compatibility exclusions) are enforced before this returns — every garment in the result is already legal to wear today. Each garment's `formality` is a number from 1 (most casual, e.g. gym wear) to 5 (most formal, e.g. black tie); 2 is everyday casual, 3 is smart casual, 4 is business. Call this before proposing an outfit. The result reports `missing_required_slots`: the required outfit slots (top/base, bottom, footwear) that currently have no candidate. If that list is non-empty, or the result is otherwise too thin to dress the occasion, do not propose an outfit; explain the gap to the user instead. The result also reports `forecast` and `weather_used`: dress for `weather_used` and tell the user the `forecast`. Only set `stated_temp_f` / `stated_condition` when the user explicitly states the current weather where they are, or tells you to ignore the forecast — do not infer them from the season or set them just because the request mentions being hot or cold.",
    input_schema: {
      type: 'object',
      properties: {
        formality: {
          type: 'string',
          enum: ['casual', 'smart_casual', 'business', 'formal'],
        },
        activity_level: {
          type: 'string',
          enum: ['low', 'moderate', 'high'],
        },
        notes: { type: 'string', maxLength: 200 },
        stated_temp_f: {
          type: 'number',
          minimum: -60,
          maximum: 140,
          description:
            'Current temperature in °F, ONLY if the user explicitly stated it or told you to disregard the forecast.',
        },
        stated_condition: {
          type: 'string',
          enum: ['clear', 'rain', 'snow', 'wind'],
          description:
            'Current sky condition, ONLY if the user explicitly stated it or told you to disregard the forecast.',
        },
      },
      required: ['formality'],
    },
  },
  {
    name: 'get_wardrobe_summary',
    description:
      "Returns aggregate counts describing the user's wardrobe: how many garments they own by type, their distribution across formality levels, and how many items are currently unavailable. Use this to answer questions about what the user owns in general, or to explain why a request cannot be satisfied. This returns counts only — to see specific garments, use get_candidates.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_recent_outfits',
    description:
      'Returns garments the user has actually worn in the last 7 days, most recent first, based on confirmed wear records. Use this to avoid proposing something the user wore recently, or to answer questions about what they have been wearing. Absence from this list means the garment has not been worn in the window, not that it is unavailable.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 30 },
      },
    },
  },
  {
    name: 'get_palette',
    description:
      "Returns dominant colour swatches for garments, sampled from each garment, so you can choose the look card's colours. Call this after get_candidates and before propose_outfit. Each swatch is a hex colour with a rough coverage share (0-1). Use the swatches to choose one `accent_color` (a saturated colour that reads against warm paper) and two `wash_color_a` / `wash_color_b` values (a light background gradient). garment_ids is optional and defaults to the last get_candidates result; garments with no colour information are omitted.",
    input_schema: {
      type: 'object',
      properties: {
        garment_ids: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  },
  {
    name: 'get_outfit_feedback',
    description:
      "Returns the user's recent outfit proposals that carry explicit feedback: either the whole look was rejected, or individual garments in it were marked love or not_this. Use this before proposing to avoid repeating a combination the user has already reacted against, and to favour pieces they have loved. A garment marked not_this appears in the context of one specific look — it is a signal about that pairing, not a blanket exclusion of the garment. Returns nothing when the user has given no feedback yet.",
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: 'propose_outfit',
    description:
      'Records a proposed outfit for the user to review. Every garment_id must come from a prior get_candidates result in this conversation. The garments must together cover at least a top (base layer), a bottom, and footwear — a proposal missing any of those is rejected. The proposal is saved as a suggestion only — the user confirms separately whether they actually wore it. Provide a brief `rationale` explaining why these pieces work together for the stated occasion. ' +
      'You must also produce the look card: a `title` of two or three words; one `meta_line` in uppercase summarising the look (e.g. "THREE LAYERS · SMART"); `accent_color` and `wash_color_a` / `wash_color_b` as #rrggbb hex, chosen from a prior get_palette result; and `piece_rationales` — exactly one short sentence per garment_id explaining why that piece is in the look. A proposal whose card is incomplete or malformed is discarded after one retry, not saved. Call this at most once per conversation.',
    input_schema: {
      type: 'object',
      properties: {
        garment_ids: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
        },
        rationale: { type: 'string', maxLength: 400 },
        title: { type: 'string', minLength: 1, maxLength: 40 },
        meta_line: { type: 'string', minLength: 1, maxLength: 60 },
        accent_color: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        wash_color_a: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        wash_color_b: { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' },
        piece_rationales: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            properties: {
              garment_id: { type: 'string' },
              rationale: { type: 'string', minLength: 1, maxLength: 200 },
            },
            required: ['garment_id', 'rationale'],
          },
        },
      },
      required: [
        'garment_ids',
        'rationale',
        'title',
        'meta_line',
        'accent_color',
        'wash_color_a',
        'wash_color_b',
        'piece_rationales',
      ],
    },
  },
];
