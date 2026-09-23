-- Adds the agent's proposal-time justification, shown alongside a proposed
-- outfit so the user sees why the pieces were chosen, and kept for later
-- evaluation of whether stated reasoning matched what was actually picked.
-- Null for outfits with no rationale (e.g. origin = 'manual' log entries,
-- which were never "proposed" by the agent in the first place).
ALTER TABLE outfits ADD COLUMN rationale TEXT;
