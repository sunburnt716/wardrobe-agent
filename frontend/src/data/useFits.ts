/**
 * SEAM. Worn-outfit history — the week strip and the run of back issues.
 */
import { useCallback } from 'react';
import {
  MOCK_FITS,
  MOCK_WEEK,
  MOCK_WORN_DAY_COUNT,
} from './mock';
import type { FitEntry, WeekDay } from './types';

export interface FitsData {
  week: WeekDay[];
  entries: FitEntry[];
  wornDayCount: number;
  month: string;
  rewear: (outfitId: string) => void;
  status: 'loading' | 'ready' | 'empty' | 'error';
}

export function useFits(): FitsData {
  // TODO(backend): Query.outfits({ filters: { statuses: [WORN], wornSince, wornBefore } })
  //   -> entries + week strip; wornDayCount derived.
  const rewear = useCallback((outfitId: string) => {
    // TODO(backend): Mutation.rewearOutfit(id: outfitId)
    console.log('[stub] rewear', outfitId);
  }, []);

  return {
    week: MOCK_WEEK,
    entries: MOCK_FITS,
    wornDayCount: MOCK_WORN_DAY_COUNT,
    month: 'September',
    rewear,
    status: 'ready',
  };
}
