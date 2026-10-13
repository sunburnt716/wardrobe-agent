import { queryRows, type Queryable } from '../../db/transaction';
import type { User } from './types';

interface UserRow {
  user_id: number;
  display_name: string;
  gender_identity: string | null;
  service_started_at: string;
  latitude: number | null;
  longitude: number | null;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.user_id,
    displayName: row.display_name,
    genderIdentity: row.gender_identity,
    serviceStartedAt: row.service_started_at,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

// Backs Query.me -- the resolver layer supplies userId from request context
// (auth/session), the DAL just knows how to fetch a user by id.
export async function getUser(
  db: Queryable,
  userId: number,
): Promise<User | null> {
  const rows = await queryRows<UserRow>(
    db,
    `SELECT user_id, display_name, gender_identity, service_started_at,
            latitude, longitude
     FROM users WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}

// Backs Mutation.setLocation. Single-statement write, so Queryable rather
// than TxClient. Coordinate range is a state-independent shape rule --
// validated in the resolver and enforced at the column (db/migrations/005),
// so there is no invariant for this function to check. Only the user actor
// writes location; the agent reads it.
export async function setUserLocation(
  db: Queryable,
  userId: number,
  latitude: number,
  longitude: number,
): Promise<User | null> {
  const rows = await queryRows<UserRow>(
    db,
    `UPDATE users SET latitude = $2, longitude = $3
     WHERE user_id = $1
     RETURNING *`,
    [userId, latitude, longitude],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}
