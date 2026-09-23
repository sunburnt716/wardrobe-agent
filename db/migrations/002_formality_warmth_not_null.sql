-- formality_band and warmth_rating were nullable, and every historical row
-- left them NULL. Three bugs followed from that: get_candidates handed the
-- model a fabricated 'casual' label for a NULL band (tools/view.ts), the
-- formality pre-filter was fail-open (`formality_band IS NULL OR ...`), and
-- the weather pre-fetch had no warmth column to filter against. Making both
-- columns NOT NULL removes the unrepresentable state at the source.
--
-- No column DEFAULT, deliberately (formality/warmth data contract spec): a
-- default reintroduces the same silent-wrong-value problem with a number
-- instead of a NULL. Callers that legitimately don't know a value apply a
-- documented fallback at their own layer -- see createGarment in
-- api/dal/garments.ts -- where it can later be replaced by an inference step
-- rather than being baked into the table.

-- Backfill pre-contract rows with the neutral mid band (3). These are rows
-- written before a value was required; 3 is "unknown, assume middle", not a
-- claim about the garment. New writes must state a real value.
UPDATE garments SET formality_band = 3 WHERE formality_band IS NULL;
UPDATE garments SET warmth_rating  = 3 WHERE warmth_rating  IS NULL;

ALTER TABLE garments
  ALTER COLUMN formality_band TYPE SMALLINT,
  ALTER COLUMN formality_band SET NOT NULL,
  ALTER COLUMN warmth_rating  TYPE SMALLINT,
  ALTER COLUMN warmth_rating  SET NOT NULL;
