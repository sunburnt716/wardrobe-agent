import { queryRows, type Queryable } from '../../db/transaction';
import type { GarmentLayer, GarmentType } from './types';

interface GarmentTypeRow {
  garment_type_id: number;
  name: string;
  layer: GarmentLayer;
  default_wears_before_wash: number;
}

function mapGarmentTypeRow(row: GarmentTypeRow): GarmentType {
  return {
    id: row.garment_type_id,
    name: row.name,
    layer: row.layer,
    defaultWearsBeforeWash: row.default_wears_before_wash,
  };
}

export async function getGarmentType(
  db: Queryable,
  garmentTypeId: number,
): Promise<GarmentType | null> {
  const rows = await queryRows<GarmentTypeRow>(
    db,
    `SELECT garment_type_id, name, layer, default_wears_before_wash
     FROM garment_types WHERE garment_type_id = $1`,
    [garmentTypeId],
  );
  return rows[0] ? mapGarmentTypeRow(rows[0]) : null;
}

// Not on the GraphQL Query root directly, but garment_types is small,
// user-independent lookup data (used e.g. to populate CreateGarmentInput
// pickers), so it earns a list function alongside the by-id one.
export async function listGarmentTypes(db: Queryable): Promise<GarmentType[]> {
  const rows = await queryRows<GarmentTypeRow>(
    db,
    `SELECT garment_type_id, name, layer, default_wears_before_wash
     FROM garment_types ORDER BY name`,
  );
  return rows.map(mapGarmentTypeRow);
}
