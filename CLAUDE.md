# Wardrobe Agent

An agent that proposes, tracks, and learns from a user's outfit choices.

## Project layout

- `agent/` — agent logic (prompting, planning, tool orchestration)
- `api/` — API layer (GraphQL schema will live here as `schema.graphql`)
- `db/` — `schema.sql` and `seed.sql`
- `eval/` — evaluation harness and test cases
- `src/` — application source
- `tools/` — tool implementations the agent calls
- `Metrics.md` — what's being measured and why

## Schema invariants

These are load-bearing decisions from `db/schema.sql`. Don't casually
"clean up" against them without checking why they're there.

- **snake_case everywhere.** Unquoted camelCase identifiers get folded to
  lowercase by Postgres, so camelCase columns/tables are never used.
- **Derived, not stored.**
  - Garment age/tenure is never a column — it's computed from `acquired_at`
    at query time. A stored age is wrong the day after it's written.
  - Clean/dirty is never a boolean column — it's computed as
    `wears_since_wash < COALESCE(wears_before_wash_override, default_wears_before_wash)`
    via a join from `garments` to `garment_types`. A flag would drift out of
    sync with the counters that actually determine it.
- **Instance-level attributes are columns on `garments`, not tags and not on
  `garment_types`.** `primary_color`, `secondary_color`, `texture`, and
  `silhouette` vary between two garments of the same type (two oxford shirts
  can be different colors), so they live on the instance row where the
  constraint solver can query them directly. `garment_tags` is reserved for
  open-ended descriptors on an axis that isn't known in advance
  (`'vintage'`, `'gift-from-mom'`) — a tag value carries no indication of
  which axis it belongs to, so anything a rule needs to compare across
  garments must be a typed column, not a tag.
- **`formality_band` and `warmth_rating` are `NOT NULL`, 1–5, no default.**
  Both are `SMALLINT NOT NULL` on `garments` with `CHECK (… BETWEEN 1 AND 5)`
  and deliberately no column default (`db/migrations/002`). A stored `NULL`
  previously let `get_candidates` hand the model a fabricated `'casual'`
  label and made the formality pre-filter fail-open. A default would
  reintroduce the same silent-wrong-value with a number instead of a `NULL`,
  so callers without a real value apply an explicit fallback at their own
  layer (`createGarment`: warmth `3`, formality `1`), never the schema.
  - **Formality scale:** `1` gym/loungewear, `2` everyday casual, `3` smart
    casual, `4` business, `5` black tie. `get_candidates`' four request
    levels map on via `FORMALITY_BAND_BY_LEVEL` (`casual→1`, `smart_casual→2`,
    `business→4`, `formal→5`); band `3` has no request level of its own.
  - **Warmth scale:** `1` hot-weather only (linen, mesh) … `5` deep-winter
    (melton overcoat, heavy knit). `listCandidateGarments` centres a `±1`
    window on the band the temperature calls for (`warmthBandForTempC`:
    ≥24 °C→1, 16→2, 8→3, 0→4, below 0→5); `layer = 'base'` is exempt, since
    a thin tee is worn both under a coat and on its own. These thresholds
    are a fixed curve for now — a future per-user preference (some people
    run hot/cold) is a schema change, tracked as `TODO(ui)` in
    `api/dal/garments.ts`.
- **Compatibility is symmetric and structurally deduplicated.**
  `garment_compatibility` has `CHECK (garment_a_id < garment_b_id)`, so the
  same pair can never be stored in both orders. Write paths must normalize
  by swapping (or using `LEAST`/`GREATEST`) so the smaller id is always
  `garment_a_id`; read paths must not assume a query on `garment_a_id` alone
  covers a garment's exceptions — check both columns. This table holds
  hand-entered exceptions only; general color/texture/silhouette rules
  belong in solver logic, not as rows here.
- **Asymmetric cascade on `outfit_garments`.** Deleting an outfit cascades
  and removes its `outfit_garments` rows. Deleting a garment referenced by
  a past outfit must fail loudly (no cascade) rather than silently erasing
  wear history — garments are retired via `retired_at`, never deleted once
  they've been worn.
- **No wear-events or decision-log table.** A single `outfits` row mutates
  through its `status` values (`proposed` → `accepted`/`rejected` →
  `worn`); wear history is derived from `status = 'worn'` rows. This is a
  known, deliberate simplification for now.
- **Piece-level verdicts are current-state columns on `outfit_garments`,
  not an event log.** `verdict` (`'love'`/`'not_this'`/`NULL`) and
  `verdict_at` record the user's reaction to one garment *within one look*
  (`db/migrations/003`). They're mutated in place — toggle history is not
  kept, same reasoning as the no-decision-log rule above. `NULL` verdict is
  "no opinion", the common case, with `verdict_pair_null` keeping the two
  columns null-together or set-together. Only the user actor writes them
  (`setPieceVerdict`); the agent reads them at most. The "garment must be in
  this outfit" and "outfit isn't `rejected`" checks are enforced in the
  resolver as shape validation, not the DAL — this is the one exception to
  "invariants live in the DAL", and it holds only because verdicts have no
  agent write path. If one is ever added, those checks move to the DAL.
  Cross-tenant scoping (`user_id`) stays in the DAL regardless.
- **Weather/vibe context on `outfits` is a decision-time snapshot**, not a
  live lookup — it records what the agent actually dressed for when it
  proposed the outfit, which is what makes later evaluation possible. That
  is the forecast (`agent/weather.ts`, always present — live or fallback),
  unless the user explicitly states the weather where they are or tells the
  agent to disregard the forecast, in which case `get_candidates`
  (`stated_temp_f` / `stated_condition`) folds that over the forecast and it
  becomes the effective weather (`source = 'user_stated'`) for both the
  filter and this snapshot. The forecast is never *removed* — there is
  always a floor — and the model cannot set the override from the season or
  from the request merely mentioning temperature.
- **A proposed outfit must cover the required structural slots** — a top
  (`base` layer), a `bottom`, and `footwear`. This is a DAL invariant
  (`proposeOutfit` throws `OUTFIT_INCOMPLETE`), not a schema constraint:
  `outfit_garments` can't express "spans these layers". The required set
  lives in `api/dal/outfitComposition.ts`; `mid`/`outer`/`accessory` are
  additive and never required. Socks are modelled as `accessory`, not
  `base`, so "has a `base` garment" reliably means "has a top" — a future
  hosiery type under `base` would break that and needs a real
  top-vs-other role on `garment_types`. `logManualOutfit` deliberately does
  **not** enforce this — a manual log records what was actually worn, not a
  suggestion to vet.
- **Look-card presentation has two distinct authors** (`db/migrations/004`).
  Agent-authored at propose time and now **required** by the `propose_outfit`
  tool: `outfits.title` / `meta_line` / `accent_color` / `wash_color_a` /
  `wash_color_b`, and `outfit_garments.rationale` (why *this* piece, vs
  `outfits.rationale` for the whole look — one entry per garment).
  Extraction-pipeline-authored after the fact: `outfits.composite_image_key`,
  `outfit_garments.cutout_image_key`, and `hotspot_x` / `hotspot_y`
  (normalized 0–1 centroid of the piece in the composite — never
  hand-placed; `hotspot_pair_null` + range checks enforce the contract at
  the column). All nullable — a proposal is stored before its card is
  assembled.
- **A malformed look card is discarded, not persisted, not rejected.**
  `propose_outfit` validates the card before the DAL write. A bad garment
  set is a recoverable `is_error` (the model retries). A bad *card* gets
  exactly one corrective retry (`AgentContext.presentationFailures`); the
  second failure files a report (`agent/proposalReport.ts` →
  `ProposalReportSink`, currently a JSON file, eventually the in-app inbox),
  returns a `ToolResult` with the internal `endLoop` flag, and the loop
  terminates `proposal_discarded`. No `outfits` row is written and
  **nothing is marked `rejected`** — `rejected` is a user verdict on a look
  they saw, and `get_outfit_feedback` reads it as signal.
- **`get_palette` supplies the card's colours.** The agent can't derive a
  hex from the coarse colour string in `get_candidates`, so it calls
  `get_palette` (backed by `AgentContext.paletteProvider`) for per-garment
  swatches. `LookupPaletteProvider` (colour-name → hex table) ships now;
  `ImagePaletteProvider` (dominant-colour extraction from `photo_key`) swaps
  in at `composition.ts` when the image pipeline exists — the tool contract
  and prompt don't change.
- **Re-wear creates a new `outfits` row, never mutates the source**
  (`rewearOutfit`, feature 5). `origin = 'manual'`, `status = 'worn'` from
  the start, garment set + presentation cloned, wear counters bumped. The
  decision-time weather/vibe/occasion snapshot and piece verdicts are
  deliberately **not** carried over — a re-wear has no decision context and
  the verdicts were about reviewing that specific proposal. Retired/dirty
  garments are not rejected, same as `logManualOutfit`.
- **`get_outfit_feedback` is an agent read of user feedback** — recent
  outfits that were rejected or carry a piece-level verdict. Read-only; the
  agent does not write verdicts or (yet) `learned` compatibility edges from
  them.
