/**
 * PROPOSAL ONLY. "Save for later" — Pinterest's core verb, which Fitcheck
 * currently has no equivalent of.
 *
 * This is deliberately NOT the same axis as the look verdict. Today's
 * accept/reject answers "am I wearing this now"; saving answers "I want this
 * some other day". A look can be saved and rejected at once — that is a
 * normal combination (right look, wrong weather), not a contradiction, which
 * is why this is a separate store rather than a fifth `status` value.
 *
 * Session-local, in memory. The real thing is a schema change (an outfit
 * status or a saved-looks table) and is explicitly out of scope here.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Outfit } from '../data/types';

interface SavedLooks {
  /** Insertion-ordered, most recently saved first. */
  saved: Outfit[];
  isSaved: (outfitId: string) => boolean;
  toggle: (outfit: Outfit) => void;
  remove: (outfitId: string) => void;
  count: number;
}

const Ctx = createContext<SavedLooks | null>(null);

export function SavedLooksProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Outfit[]>([]);

  const isSaved = useCallback(
    (outfitId: string) => saved.some((o) => o.id === outfitId),
    [saved],
  );

  const toggle = useCallback((outfit: Outfit) => {
    setSaved((prev) =>
      prev.some((o) => o.id === outfit.id)
        ? prev.filter((o) => o.id !== outfit.id)
        : [outfit, ...prev],
    );
  }, []);

  const remove = useCallback((outfitId: string) => {
    setSaved((prev) => prev.filter((o) => o.id !== outfitId));
  }, []);

  const value = useMemo<SavedLooks>(
    () => ({ saved, isSaved, toggle, remove, count: saved.length }),
    [saved, isSaved, toggle, remove],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedLooks(): SavedLooks {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error('useSavedLooks must be used within <SavedLooksProvider>');
  }
  return v;
}
