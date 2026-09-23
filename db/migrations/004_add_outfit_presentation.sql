-- Proposal-presentation data for the Fitcheck look card (design spec §4).
-- A proposed outfit is stored the moment the agent commits it; the visual
-- card is assembled afterward, so every column here is nullable and a row
-- with all of them NULL is a legitimate un-rendered proposal.
--
-- Two distinct authors, deliberately kept separate:
--
--   * Agent-authored, at propose time: title, meta_line, accent_color,
--     wash_color_a/b (the outfit row), and outfit_garments.rationale (why
--     THIS piece, distinct from outfits.rationale which is the whole-look
--     justification). Per the current decision these arrive NULL until the
--     propose_outfit tool schema is widened -- the columns and the DAL
--     optional params exist now so that widening is the only remaining step.
--
--   * Detection-pipeline-authored, after the fact: composite_image_key (the
--     rendered look), outfit_garments.cutout_image_key (per-piece cutout),
--     and hotspot_x / hotspot_y (normalized 0..1 centroid of the piece in
--     the composite -- design spec: these MUST come from extraction, never
--     hand-placed). The pipeline that produces these is not built yet; this
--     migration only reserves their shape.
--
-- *_image_key columns are opaque storage keys, same contract as
-- garments.photo_key -- this schema does not model the blob store.
--
-- hotspot_pair_null keeps x and y null-together or set-together; the range
-- checks enforce the normalized-fraction contract at the column so a
-- miscalibrated pipeline fails loudly instead of writing off-image markers.

ALTER TABLE outfits
  ADD COLUMN title               TEXT,
  ADD COLUMN meta_line           TEXT,
  ADD COLUMN accent_color        TEXT,
  ADD COLUMN wash_color_a        TEXT,
  ADD COLUMN wash_color_b        TEXT,
  ADD COLUMN composite_image_key TEXT;

ALTER TABLE outfit_garments
  ADD COLUMN rationale        TEXT,
  ADD COLUMN hotspot_x        REAL,
  ADD COLUMN hotspot_y        REAL,
  ADD COLUMN cutout_image_key TEXT,
  ADD CONSTRAINT hotspot_pair_null CHECK ((hotspot_x IS NULL) = (hotspot_y IS NULL)),
  ADD CONSTRAINT hotspot_x_range CHECK (hotspot_x IS NULL OR (hotspot_x >= 0 AND hotspot_x <= 1)),
  ADD CONSTRAINT hotspot_y_range CHECK (hotspot_y IS NULL OR (hotspot_y >= 0 AND hotspot_y <= 1));
