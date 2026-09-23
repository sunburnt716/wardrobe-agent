/**
 * SEAM. Today's proposed looks + the weather for the status pill.
 *
 * Piece verdicts and whole-look accept/reject are NOT here — they're user
 * writes and live in the Today session store (`../state/todaySession.ts`),
 * which is where their `TODO(backend)` mutations sit.
 */
import { MOCK_PROPOSALS, MOCK_TODAY_DATE, MOCK_WEATHER } from './mock';
import type { Outfit, WeatherContext } from './types';

export interface TodayData {
  proposals: Outfit[];
  weather: WeatherContext;
  date: string;
  status: 'loading' | 'ready' | 'empty' | 'error';
}

export function useToday(): TodayData {
  // TODO(backend): replace with
  //   Query.outfits({ filters: { statuses: [PROPOSED] } })  -> proposals
  //   Query.weather                                          -> weather
  // and derive `status` from the query state / proposals.length.
  return {
    proposals: MOCK_PROPOSALS,
    weather: MOCK_WEATHER,
    date: MOCK_TODAY_DATE,
    status: 'ready',
  };
}
