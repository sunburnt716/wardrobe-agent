// Side-effecting import, required first (before any Pool is constructed) by
// both composition.ts and db/testDb.ts. node-postgres's default parsers
// convert date/timestamp/timestamptz columns into JS Date objects, but
// every date-shaped field in api/dal/types.ts is typed string -- matching
// what the SQL layer actually stores and what callers compare against
// (e.g. outfits.test.ts asserting wornOn === '2026-01-01'). Registering the
// identity parser here makes the runtime match the declared types, instead
// of a Date silently satisfying `string` at compile time via `as` casts
// scattered through the DAL.
import { types } from 'pg';

const DATE_OID = 1082;
const TIMESTAMP_OID = 1114;
const TIMESTAMPTZ_OID = 1184;

const identity = (value: string): string => value;

types.setTypeParser(DATE_OID, identity);
types.setTypeParser(TIMESTAMP_OID, identity);
types.setTypeParser(TIMESTAMPTZ_OID, identity);
