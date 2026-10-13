/**
 * PROPOSAL ONLY. Whole-look accept/reject, keyed by OUTFIT ID.
 *
 * Why this exists rather than reusing state/todaySession.ts: the shipped
 * store keys look verdicts by lookIndex and exposes `lookVerdict()` for the
 * current index only, because the shipped design has one fixed button row
 * acting on whichever look is showing. Once the buttons live on the cards,
 * every card needs its own verdict simultaneously, and an index-keyed store
 * read through a no-argument accessor cannot express that.
 *
 * Keying by id rather than index is also just more correct: an index is a
 * position in today's list, so it would reattach a verdict to a different
 * outfit the moment the list reordered.
 *
 * Toggle semantics match the shipped store: tapping the active choice clears
 * it back to no-opinion. Saving stays in SavedLooksProvider and is a separate
 * axis -- rejecting a look you have saved is a normal combination.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type LookVerdict = 'ACCEPT' | 'REJECT';

interface LookVerdicts {
  verdictFor: (outfitId: string) => LookVerdict | null;
  commit: (outfitId: string, verdict: LookVerdict) => void;
  /** Rejecting dismisses the look from Today. Most recent first. */
  rejectedIds: string[];
  isRejected: (outfitId: string) => boolean;
}

const Ctx = createContext<LookVerdicts | null>(null);

export function LookVerdictsProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<Record<string, LookVerdict>>({});
  // Ordered separately from `map`, because a disliked-outfits view will want
  // "most recently rejected first" and an object's key order would not
  // survive a round trip through the backend.
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);

  const verdictFor = useCallback(
    (outfitId: string) => map[outfitId] ?? null,
    [map],
  );

  const isRejected = useCallback(
    (outfitId: string) => map[outfitId] === 'REJECT',
    [map],
  );

  const commit = useCallback((outfitId: string, verdict: LookVerdict) => {
    // REJECT is terminal here, not a toggle. The card leaves Today the moment
    // it is rejected, so there is no longer any affordance to un-reject it --
    // offering toggle semantics we cannot reach would be a lie.
    //
    // TODO(backend): Mutation.rejectOutfit(id: outfitId, reason: String) sets
    // outfits.status = REJECTED, which is what get_outfit_feedback reads as
    // signal. ACCEPT maps to markOutfitWorn. Nothing is persisted yet -- this
    // store is session-local on purpose.
    if (verdict === 'REJECT') {
      setMap((prev) => ({ ...prev, [outfitId]: 'REJECT' }));
      setRejectedIds((prev) =>
        prev.includes(outfitId) ? prev : [outfitId, ...prev],
      );
      return;
    }

    setMap((prev) => {
      if (prev[outfitId] === verdict) {
        const { [outfitId]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [outfitId]: verdict };
    });
  }, []);

  const value = useMemo<LookVerdicts>(
    () => ({ verdictFor, commit, rejectedIds, isRejected }),
    [verdictFor, commit, rejectedIds, isRejected],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLookVerdicts(): LookVerdicts {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useLookVerdicts must be used within <LookVerdictsProvider>');
  }
  return v;
}
