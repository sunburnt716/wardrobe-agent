-- Wardrobe Agent schema
-- Plain CREATE TABLE (not IF NOT EXISTS): this schema is still in flux and gets
-- dropped and rebuilt often. IF NOT EXISTS would silently skip tables that
-- already exist instead of failing loudly on a stale/partial database.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    user_id              SERIAL PRIMARY KEY,
    display_name         TEXT NOT NULL,
    gender_identity       TEXT,
    service_started_at    DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ---------------------------------------------------------------------------
-- garment_types
-- Type-level only: one row per kind of garment, shared across all instances.
-- No user_id here, and nothing that varies between two garments of the same
-- type (that belongs on garments).
-- ---------------------------------------------------------------------------
CREATE TABLE garment_types (
    garment_type_id            SERIAL PRIMARY KEY,
    name                       TEXT NOT NULL UNIQUE,
    layer                      TEXT NOT NULL CHECK (layer IN ('base', 'mid', 'outer', 'bottom', 'footwear', 'accessory')),
    default_wears_before_wash  INT NOT NULL
);

-- ---------------------------------------------------------------------------
-- garments
-- Instance table. Age and clean state are deliberately not stored here:
--   - garment age is derived from acquired_at at query time.
--   - clean state is computed as
--       wears_since_wash < COALESCE(wears_before_wash_override, default_wears_before_wash)
--     via a join to garment_types.
-- ---------------------------------------------------------------------------
CREATE TABLE garments (
    garment_id                   SERIAL PRIMARY KEY,
    user_id                      INT NOT NULL REFERENCES users(user_id),
    garment_type_id              INT NOT NULL REFERENCES garment_types(garment_type_id),
    acquired_at                  DATE,
    retired_at                   DATE,
    -- NOT NULL with no default (see db/migrations/002): a stored NULL let
    -- get_candidates fabricate a 'casual' label and made the formality
    -- pre-filter fail-open. Callers without a real value apply an explicit
    -- fallback (createGarment in api/dal/garments.ts), never the schema.
    -- Both are 1-5 int bands; the scale is documented in CLAUDE.md.
    warmth_rating                SMALLINT NOT NULL CHECK (warmth_rating BETWEEN 1 AND 5),
    formality_band               SMALLINT NOT NULL CHECK (formality_band BETWEEN 1 AND 5),
    primary_color                TEXT,
    secondary_color               TEXT,
    texture                      TEXT,
    silhouette                   TEXT,
    water_resistant               BOOLEAN NOT NULL DEFAULT FALSE,
    wears_since_wash              INT NOT NULL DEFAULT 0,
    last_washed_at                TIMESTAMPTZ,
    wears_before_wash_override     INT,
    photo_key                    TEXT
);

CREATE INDEX idx_garments_user_id ON garments(user_id);
CREATE INDEX idx_garments_active_user_id ON garments(user_id) WHERE retired_at IS NULL;

-- ---------------------------------------------------------------------------
-- garment_tags
-- Open-ended descriptors only (e.g. 'vintage', 'gift-from-mom'). Color,
-- texture, and silhouette are typed columns on garments, not tags, because a
-- tag carries no indication of which axis it belongs to.
-- ---------------------------------------------------------------------------
CREATE TABLE garment_tags (
    garment_id  INT NOT NULL REFERENCES garments(garment_id) ON DELETE CASCADE,
    tag         TEXT NOT NULL,
    PRIMARY KEY (garment_id, tag)
);

-- ---------------------------------------------------------------------------
-- garment_compatibility
-- Hand-entered exceptions only; general color/texture/silhouette rules live
-- in solver logic, not as rows here. Expect this table to be empty initially.
--
-- Symmetry: garment_a_id < garment_b_id makes it structurally impossible to
-- store the same pair twice in opposite order. Write paths must normalize by
-- swapping so the smaller id comes first; read paths must check both
-- directions. Never insert a second row for the reverse direction.
-- ---------------------------------------------------------------------------
-- source/written_by: distinguishes a learned edge (agent-inferred) from a
-- hand-entered one, and who wrote it. Deliberately NOT part of the primary
-- key -- one row per pair, precedence (learned > manual) resolved once at
-- write time in upsertCompatibilityEdge, not re-resolved on every read.
-- Type-level "strict" rules (e.g. white socks never with dress shoes) do NOT
-- get a source value here -- they live in solver logic instead, because a
-- rule materialized as a row against two specific garment_ids silently stops
-- applying the next time a matching garment is added.
CREATE TABLE garment_compatibility (
    garment_a_id  INT NOT NULL REFERENCES garments(garment_id) ON DELETE CASCADE,
    garment_b_id  INT NOT NULL REFERENCES garments(garment_id) ON DELETE CASCADE,
    polarity      TEXT NOT NULL CHECK (polarity IN ('pairs_well', 'never_pair')),
    source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('learned', 'manual')),
    written_by    TEXT NOT NULL DEFAULT 'user' CHECK (written_by IN ('user', 'agent')),
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (garment_a_id, garment_b_id),
    CHECK (garment_a_id < garment_b_id)
);

-- ---------------------------------------------------------------------------
-- outfits
-- No separate wear-events or decision-log table: an outfits row mutates
-- through its status values, and wear history is derived from rows where
-- status = 'worn'. origin = 'manual' is how a manually logged outfit (never
-- proposed by the agent) is recorded.
--
-- weather_temp_c / weather_condition / requested_vibe are decision context,
-- snapshotted at proposal time -- this is what makes evaluation possible
-- later, since grading against actual historical weather (rather than what
-- the agent was told) would miss exactly the failures worth catching.
--
-- title / meta_line / accent_color / wash_color_a / wash_color_b are the
-- agent-authored presentation for the Fitcheck look card (db/migrations/004);
-- composite_image_key is the rendered look, written later by the extraction
-- pipeline (opaque storage key, same contract as garments.photo_key). All
-- nullable: a proposal is stored before the card is assembled.
-- ---------------------------------------------------------------------------
CREATE TABLE outfits (
    outfit_id         SERIAL PRIMARY KEY,
    user_id           INT NOT NULL REFERENCES users(user_id),
    status            TEXT NOT NULL CHECK (status IN ('proposed', 'accepted', 'rejected', 'worn')),
    proposed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    worn_on           DATE,
    origin            TEXT NOT NULL DEFAULT 'agent' CHECK (origin IN ('agent', 'manual')),
    requested_vibe    TEXT,
    weather_temp_c    INT,
    weather_condition TEXT,
    occasion          TEXT,
    rejection_reason  TEXT,
    -- Agent's proposal-time justification (see db/migrations/001). Null for
    -- outfits with no rationale, e.g. origin = 'manual' log entries.
    rationale         TEXT,
    title               TEXT,
    meta_line           TEXT,
    accent_color        TEXT,
    wash_color_a        TEXT,
    wash_color_b        TEXT,
    composite_image_key TEXT
);

CREATE INDEX idx_outfits_user_worn_on ON outfits(user_id, worn_on DESC);

-- ---------------------------------------------------------------------------
-- outfit_garments
-- Junction table only. No role column ('top', 'bottom', 'shoes') -- that is
-- derivable from garment_types.layer and storing it here would create a
-- value that can disagree with the type.
--
-- Asymmetric cascade is deliberate: deleting an outfit removes its
-- membership rows, but deleting a garment referenced by past outfits must
-- fail loudly rather than silently erasing history. Garments are retired via
-- retired_at, never deleted once worn.
--
-- verdict / verdict_at (see db/migrations/003): the user's piece-level
-- love / not-this reaction to this garment within this specific look. Both
-- nullable -- NULL is "no opinion", the common case. Current state only, not
-- an event log: the value is mutated in place and toggle history is not
-- kept, consistent with the "no decision-log table" rule in .claude/CLAUDE.md.
-- verdict_pair_null keeps the two columns null-together or set-together.
--
-- rationale / hotspot_x / hotspot_y / cutout_image_key (see
-- db/migrations/004): per-piece presentation for the Today screen. rationale
-- (why THIS piece) is agent-authored; hotspot_x/y (normalized 0..1 centroid
-- of the piece in the composite) and cutout_image_key are written by the
-- extraction pipeline, never hand-placed. hotspot_pair_null + the range
-- checks hold the normalized-fraction contract at the column.
-- ---------------------------------------------------------------------------
CREATE TABLE outfit_garments (
    outfit_id   INT NOT NULL REFERENCES outfits(outfit_id) ON DELETE CASCADE,
    garment_id  INT NOT NULL REFERENCES garments(garment_id),
    verdict     TEXT CHECK (verdict IN ('love', 'not_this')),
    verdict_at  TIMESTAMPTZ,
    rationale        TEXT,
    hotspot_x        REAL,
    hotspot_y        REAL,
    cutout_image_key TEXT,
    PRIMARY KEY (outfit_id, garment_id),
    CONSTRAINT verdict_pair_null CHECK ((verdict IS NULL) = (verdict_at IS NULL)),
    CONSTRAINT hotspot_pair_null CHECK ((hotspot_x IS NULL) = (hotspot_y IS NULL)),
    CONSTRAINT hotspot_x_range CHECK (hotspot_x IS NULL OR (hotspot_x >= 0 AND hotspot_x <= 1)),
    CONSTRAINT hotspot_y_range CHECK (hotspot_y IS NULL OR (hotspot_y >= 0 AND hotspot_y <= 1))
);
