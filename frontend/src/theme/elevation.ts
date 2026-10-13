/**
 * Elevation that works in both themes.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Fitcheck's hierarchy is entirely shadow-based — the design forbids hairline
 * boxes for layout, so depth is the only separator. On a dark ground a cast
 * shadow is nearly invisible: there is no lighter surface for it to darken.
 * A dark theme built by inverting colours therefore loses ALL hierarchy, not
 * just some contrast.
 *
 * So elevation is a pair of mechanisms behind one name:
 *   light -> a cast shadow (shadows.ts, unchanged)
 *   dark  -> a lighter tonal surface, plus a faint rim at the top tiers
 *
 * `elevation(tier, t)` returns whichever applies, so a component asks for a
 * TIER and never for a shadow. That is the API worth having: a caller should
 * not know which trick the current theme uses.
 *
 * Tiers match shadows.ts so the two stay in step:
 *   1 badge  2 soft  3 card  4 chrome  5 sheet
 */
import type { ViewStyle } from 'react-native';
import type { Palette } from './palette';
import { shadow, type ShadowName } from './shadows';

export type Tier = 'badge' | 'soft' | 'card' | 'tabBar' | 'sheet';

/** Which tonal surface each tier sits on in dark mode. */
const DARK_SURFACE: Record<Tier, keyof Palette> = {
  badge: 'surface2',
  soft: 'surface1',
  card: 'surface2',
  tabBar: 'surface2',
  sheet: 'surface3',
};

/**
 * A 1px top rim on the upper tiers. On dark, a tonal step alone reads as flat
 * at larger sizes; a barely-visible light edge along the top sells the idea
 * that the surface is catching light from above. This is also what iOS 27
 * added to Liquid Glass for the same reason — a darkened edge for separation.
 */
const DARK_RIM: Partial<Record<Tier, number>> = {
  card: 0.06,
  tabBar: 0.08,
  sheet: 0.1,
};

/**
 * Elevation for a tier under the active palette. Spread onto any View.
 *
 * Returns a BACKGROUND on dark, so the caller must not also set one — or must
 * spread this after its own. On light it returns only shadow properties and
 * leaves the background alone, matching today's behaviour.
 */
export function elevation(tier: Tier, t: Palette): ViewStyle {
  if (!t.isDark) {
    return shadow(tier as ShadowName);
  }

  const rim = DARK_RIM[tier];
  return {
    backgroundColor: t[DARK_SURFACE[tier]] as string,
    ...(rim
      ? {
          borderTopWidth: 1,
          borderTopColor: `rgba(243,235,223,${rim})`,
        }
      : null),
    // Kept so Android still ranks these views in its own z-order, even though
    // the visible separation now comes from the tonal step.
    elevation: tier === 'sheet' ? 24 : tier === 'card' ? 12 : 4,
  };
}

/** The surface colour for a tier, when a component needs the fill only. */
export function surfaceFor(tier: Tier, t: Palette): string {
  return t.isDark ? (t[DARK_SURFACE[tier]] as string) : t.surface1;
}
