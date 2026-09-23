/**
 * SEAM. The wardrobe grid, the filter row, and the "due a wash" count for
 * the status pill.
 */
import { useMemo, useState } from 'react';
import {
  MOCK_CLOSET,
  MOCK_CLOSET_FILTERS,
  MOCK_CLOSET_WASH_COUNT,
} from './mock';
import type { ClosetFilter, ClosetItem } from './types';

export interface ClosetData {
  items: ClosetItem[];
  /** Total owned garments, ignoring the active filter (the header count). */
  totalCount: number;
  filters: ClosetFilter[];
  activeFilterId: string;
  setFilter: (id: string) => void;
  washCount: number;
  status: 'loading' | 'ready' | 'empty' | 'error';
}

/** Local-only filter matcher until the backend applies `GarmentFilters`. */
function matches(item: ClosetItem, filterId: string): boolean {
  switch (filterId) {
    case 'all':
      return true;
    case 'tops':
      return item.layer === 'base';
    case 'knitwear':
      return item.layer === 'mid';
    case 'bottoms':
      return item.layer === 'bottom';
    case 'outerwear':
      return item.layer === 'outer';
    case 'shoes':
      return item.layer === 'footwear';
    default:
      return true;
  }
}

export function useCloset(): ClosetData {
  const [activeFilterId, setActiveFilterId] = useState('all');

  // TODO(backend): Query.garments({ filters })  — pass the active filter as
  // GarmentFilters (layers / colors / onlyClean) instead of matching here.
  const items = useMemo(
    () => MOCK_CLOSET.filter((i) => matches(i, activeFilterId)),
    [activeFilterId],
  );

  return {
    items,
    totalCount: MOCK_CLOSET.length,
    filters: MOCK_CLOSET_FILTERS,
    activeFilterId,
    setFilter: setActiveFilterId,
    // TODO(backend): count from Query.garments({ filters: { onlyClean: false } }).
    washCount: MOCK_CLOSET_WASH_COUNT,
    status: 'ready',
  };
}
