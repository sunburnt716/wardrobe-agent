-- Per-user location for the weather forecast (agent/weather.ts). Closes the
-- seam agent/loop.ts and agent/runtime.ts both flagged: until now every user
-- resolved to one hardcoded coordinate pair, so every forecast was for the
-- same city.
--
-- Coordinates only. City name and timezone are deliberately not columns --
-- they'd be a second representation of the same fact, free to drift from the
-- lat/long the forecast provider actually reads.
--
-- Acquisition is device-side: only the handset knows its GPS, so a server
-- cannot derive this (IP geolocation is wrong behind a VPN or on cell
-- networks). These columns are storage for what the client reports, read by
-- both the GraphQL weather query and the headless agent -- which has no
-- device to ask, and is the whole reason this is persisted rather than held
-- in the client.
--
-- Nullable and null-together: a user who has not granted location has
-- neither coordinate, and the forecast falls back rather than failing --
-- agent/weather.ts's "there is always a forecast snapshot" floor.
--
-- The range checks enforce the coordinate contract at the column, so a
-- miscalibrated client fails loudly instead of silently forecasting for the
-- wrong hemisphere -- same reasoning as 004's hotspot range checks. Being
-- state-independent, these are shape rules, so the resolver validates them
-- too; no InvariantCode is added (the §7 "where does InvariantCode live"
-- decision stays untouched).

ALTER TABLE users
  ADD COLUMN latitude  REAL,
  ADD COLUMN longitude REAL,
  ADD CONSTRAINT location_pair_null CHECK ((latitude IS NULL) = (longitude IS NULL)),
  ADD CONSTRAINT latitude_range  CHECK (latitude  IS NULL OR (latitude  >= -90  AND latitude  <= 90)),
  ADD CONSTRAINT longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
