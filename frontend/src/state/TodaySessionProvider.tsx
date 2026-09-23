import type { ReactNode } from 'react';
import {
  TodaySessionContext,
  useTodaySessionValue,
} from './todaySession';

/**
 * Wrap the Today screen. `lookCount` comes from the loaded proposals and
 * bounds the wrap-around in `flyToLook`.
 */
export function TodaySessionProvider({
  lookCount,
  children,
}: {
  lookCount: number;
  children: ReactNode;
}) {
  const value = useTodaySessionValue(lookCount);
  return (
    <TodaySessionContext.Provider value={value}>
      {children}
    </TodaySessionContext.Provider>
  );
}
