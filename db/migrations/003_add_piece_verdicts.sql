-- Piece-level verdicts: the user's love / not-this reaction to a single
-- garment *in the context of one proposed look* (Fitcheck design spec §1).
-- Captured per (outfit, garment) so the recommender can eventually learn
-- compatibility edges ("this knit, but not with these jeans") rather than a
-- flat per-item rating.
--
-- Current state only, not an event log. This is deliberately consistent with
-- the "no wear-events or decision-log table" rule (.claude/CLAUDE.md): the
-- verdict is mutated in place on the membership row -- love -> not_this ->
-- cleared -- and the toggle history is not kept. If a use for the history
-- appears later (how often someone flip-flopped), that is a new table and a
-- separate decision, not a widening of these columns.
--
-- Both columns nullable: the common case is a piece the user never reacted
-- to. NULL verdict = no opinion, which is the third marker state in the UI
-- (plain dot, not heart or x).
--
-- verdict_pair_null keeps the two columns from drifting apart: a verdict
-- without a timestamp (or the reverse) is unrepresentable. Write paths set
-- both together or clear both together.
ALTER TABLE outfit_garments
  ADD COLUMN verdict     TEXT CHECK (verdict IN ('love', 'not_this')),
  ADD COLUMN verdict_at  TIMESTAMPTZ,
  ADD CONSTRAINT verdict_pair_null CHECK ((verdict IS NULL) = (verdict_at IS NULL));
