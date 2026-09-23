/**
 * Per-session state for the Today screen: which look is showing, which
 * garment's detail sheet is open, and the verdicts the user has given.
 *
 * Two verdict layers, per the design (design-spec §1):
 *   - piece verdicts  — love / not-this on ONE garment WITHIN ONE look,
 *     keyed by `${lookIndex}:${pieceIndex}` so the same garment can carry a
 *     different verdict in a different look
 *   - look verdicts   — accept / reject the whole proposal
 *
 * Toggle semantics (README "verdicts"): tapping the already-active choice
 * clears it (back to no-opinion). Accepting a look does NOT clear its piece
 * verdicts — they're independent signal the recommender wants either way.
 *
 * Context + useReducer, no external store. The provider is mounted around
 * the Today screen only; bottom-tab screens stay mounted, so state survives
 * tab switches within a session.
 */
import { createContext, useContext, useMemo, useReducer } from 'react';
import type { Verdict } from '../data/types';

export type LookVerdict = 'ACCEPT' | 'REJECT';

interface State {
  lookIndex: number;
  openPieceIndex: number | null;
  pieceVerdicts: Record<string, Verdict>;
  lookVerdicts: Record<number, LookVerdict>;
}

type Action =
  | { type: 'setLook'; index: number }
  | { type: 'flyToLook'; direction: 1 | -1 }
  | { type: 'openPiece'; index: number }
  | { type: 'closePiece' }
  | { type: 'votePiece'; verdict: Verdict }
  | { type: 'commitLook'; verdict: LookVerdict };

const pieceKey = (lookIndex: number, pieceIndex: number) =>
  `${lookIndex}:${pieceIndex}`;

/** Immutably drop one key from a record. */
function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _drop, ...rest } = record;
  return rest;
}
function withoutNum<T>(record: Record<number, T>, key: number): Record<number, T> {
  const { [key]: _drop, ...rest } = record;
  return rest;
}

function makeReducer(lookCount: number) {
  return function reducer(state: State, action: Action): State {
    switch (action.type) {
      case 'setLook':
        return { ...state, lookIndex: action.index, openPieceIndex: null };

      case 'flyToLook': {
        const next =
          (state.lookIndex + action.direction + lookCount) % lookCount;
        return { ...state, lookIndex: next, openPieceIndex: null };
      }

      case 'openPiece':
        return {
          ...state,
          // tap the open one to close; tap a different one to switch
          openPieceIndex:
            state.openPieceIndex === action.index ? null : action.index,
        };

      case 'closePiece':
        return { ...state, openPieceIndex: null };

      case 'votePiece': {
        if (state.openPieceIndex === null) return state;
        const key = pieceKey(state.lookIndex, state.openPieceIndex);
        const current = state.pieceVerdicts[key];
        return {
          ...state,
          pieceVerdicts:
            current === action.verdict
              ? without(state.pieceVerdicts, key)
              : { ...state.pieceVerdicts, [key]: action.verdict },
        };
      }

      case 'commitLook': {
        const current = state.lookVerdicts[state.lookIndex];
        return {
          ...state,
          lookVerdicts:
            current === action.verdict
              ? withoutNum(state.lookVerdicts, state.lookIndex)
              : { ...state.lookVerdicts, [state.lookIndex]: action.verdict },
        };
      }

      default:
        return state;
    }
  };
}

const INITIAL: State = {
  lookIndex: 0,
  openPieceIndex: null,
  pieceVerdicts: {},
  lookVerdicts: {},
};

// --- context plumbing -----------------------------------------------

export interface TodaySession {
  lookIndex: number;
  openPieceIndex: number | null;
  /** Verdict for a piece in the CURRENT look, or null. */
  pieceVerdict: (pieceIndex: number) => Verdict | null;
  /** Verdict on the CURRENT whole look, or null. */
  lookVerdict: () => LookVerdict | null;
  setLook: (index: number) => void;
  flyToLook: (direction: 1 | -1) => void;
  openPiece: (index: number) => void;
  closePiece: () => void;
  votePiece: (verdict: Verdict) => void;
  commitLook: (verdict: LookVerdict) => void;
}

const Ctx = createContext<TodaySession | null>(null);

export function useTodaySession(): TodaySession {
  const value = useContext(Ctx);
  if (!value) {
    throw new Error('useTodaySession must be used within <TodaySessionProvider>');
  }
  return value;
}

export function useTodaySessionValue(lookCount: number): TodaySession {
  // safeguard: never a zero modulus. Memoised so `useReducer` keeps one
  // reducer identity across renders.
  const reducer = useMemo(
    () => makeReducer(Math.max(lookCount, 1)),
    [lookCount],
  );
  const [state, dispatch] = useReducer(reducer, INITIAL);

  return useMemo<TodaySession>(
    () => ({
      lookIndex: state.lookIndex,
      openPieceIndex: state.openPieceIndex,
      pieceVerdict: (pieceIndex) =>
        state.pieceVerdicts[pieceKey(state.lookIndex, pieceIndex)] ?? null,
      lookVerdict: () => state.lookVerdicts[state.lookIndex] ?? null,
      setLook: (index) => dispatch({ type: 'setLook', index }),
      flyToLook: (direction) => dispatch({ type: 'flyToLook', direction }),
      openPiece: (index) => dispatch({ type: 'openPiece', index }),
      closePiece: () => dispatch({ type: 'closePiece' }),
      votePiece: (verdict) => dispatch({ type: 'votePiece', verdict }),
      commitLook: (verdict) => dispatch({ type: 'commitLook', verdict }),
    }),
    [state],
  );
}

export const TodaySessionContext = Ctx;
