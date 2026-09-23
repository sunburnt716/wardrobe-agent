import { queryRows, type Queryable } from '../../db/transaction';
import type { User } from './types';

interface UserRow {
  user_id: number;
  display_name: string;
  gender_identity: string | null;
  service_started_at: string;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.user_id,
    displayName: row.display_name,
    genderIdentity: row.gender_identity,
    serviceStartedAt: row.service_started_at,
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
    `SELECT user_id, display_name, gender_identity, service_started_at
     FROM users WHERE user_id = $1`,
    [userId],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
}
