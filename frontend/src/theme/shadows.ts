/**
 * The design uses soft, large-blur, negative-spread shadows and *no*
 * hairline borders for layout. CSS `box-shadow` doesn't port directly:
 *
 *   - iOS wants shadowColor / shadowOffset / shadowOpacity / shadowRadius
 *   - Android has only a single `elevation` number
 *   - CSS negative spread has no RN equivalent (approximated by a tighter
 *     radius), and a two-layer CSS shadow collapses to one here
 *
 * Each recipe below is the closest single-layer approximation of the
 * corresponding README value. `shadow(name)` returns a style object safe to
 * spread on any View.
 */
import { Platform, type ViewStyle } from 'react-native';
import { colour } from './tokens';

type Recipe = {
  /** iOS vertical offset. */
  y: number;
  /** iOS blur (≈ CSS blur / 2). */
  radius: number;
  /** iOS opacity. */
  opacity: number;
  /** Android elevation. */
  elevation: number;
};

/**
 * Elevation scale, graded so depth ranks things.
 *
 * `card`, `soft` and `tabBar` previously sat at blur 16/16/22 and opacity
 * .28/.32/.30 — close enough that elevation did not establish an order. The
 * steps below are deliberately further apart, so a shadow tells you which
 * tier an object is on rather than merely that it has one.
 *
 * Order, lowest to highest: badge < soft < card < tabBar < sheet.
 */
const RECIPES = {
  /** Tier 1 — a small object attached to its parent. Verdict badges. */
  badge: { y: 3, radius: 6, opacity: 0.34, elevation: 4 },
  /** Tier 2 — resting in a run: list rows, chat bubbles, closet tiles. */
  soft: { y: 8, radius: 14, opacity: 0.22, elevation: 7 },
  /** Tier 3 — the surface the screen is about: the outfit card. */
  card: { y: 18, radius: 28, opacity: 0.3, elevation: 16 },
  /** Tier 4 — floating chrome, above content but below modals. */
  tabBar: { y: 12, radius: 22, opacity: 0.3, elevation: 20 },
  /** Tier 5 — modal, and the one that points UP. Detail sheets. */
  sheet: { y: -10, radius: 34, opacity: 0.44, elevation: 28 },
} satisfies Record<string, Recipe>;

export type ShadowName = keyof typeof RECIPES;

export function shadow(name: ShadowName): ViewStyle {
  const r = RECIPES[name];
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colour.ink,
      shadowOffset: { width: 0, height: r.y },
      shadowOpacity: r.opacity,
      shadowRadius: r.radius,
    },
    android: {
      elevation: r.elevation,
      shadowColor: colour.ink,
    },
    default: {},
  })!;
}
