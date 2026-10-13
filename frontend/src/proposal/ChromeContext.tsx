/**
 * PROPOSAL ONLY. Shared "how hidden is the chrome" value, so a screen's
 * scrolling can move furniture that lives outside that screen (the tab bar
 * is a sibling of the pager, not a child of the scroll view).
 *
 * 0 = chrome fully shown, 1 = fully hidden. Everything downstream reads it as
 * a multiplier on a translateY, never as a height: animating a layout
 * property from a worklet forces a Yoga pass on the UI thread every frame and
 * crashes on Fabric (see the note in components/today/ProgressRail.tsx).
 *
 * Worklet discipline, same file for the same reason: the handler below closes
 * over shared values and plain numbers only. No tokens object, no helper
 * function — `colour.inkA()` in a worklet is what crashed the app on load.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/** Past this many px from the top, scrolling down is allowed to hide chrome.
 *  Below it the chrome always returns, so the top of a list is never clipped. */
const TOP_ZONE = 10;
/** Scroll delta that counts as intent. Without a threshold the bar flickers
 *  on the tiny deltas a finger produces while holding still. */
const INTENT = 5;
const DURATION = 190;

interface Chrome {
  /** 0 shown .. 1 hidden. */
  hidden: SharedValue<number>;
  /** Force chrome back, e.g. when the destination changes. */
  reveal: () => void;
}

const Ctx = createContext<Chrome | null>(null);

export function ChromeProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);

  const value = useMemo<Chrome>(
    () => ({
      hidden,
      reveal: () => {
        hidden.value = withTiming(0, { duration: DURATION });
      },
    }),
    [hidden],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChrome(): Chrome {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChrome must be used within <ChromeProvider>');
  return v;
}

/**
 * Scroll handler for one scrolling screen. `lastY` is per-screen so swiping
 * between destinations doesn't make the next screen think the finger moved;
 * `hidden` is shared so the tab bar and header respond wherever you scroll.
 */
export function useChromeScroll() {
  const { hidden } = useChrome();
  const lastY = useSharedValue(0);

  return useAnimatedScrollHandler({
    onScroll: (e) => {
      const y = e.contentOffset.y;
      const dy = y - lastY.value;

      if (y <= TOP_ZONE) {
        hidden.value = withTiming(0, { duration: DURATION });
      } else if (dy > INTENT) {
        hidden.value = withTiming(1, { duration: DURATION });
      } else if (dy < -INTENT) {
        hidden.value = withTiming(0, { duration: DURATION });
      }

      lastY.value = y;
    },
  });
}
