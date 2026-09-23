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

const RECIPES = {
  /** Resting outfit card: 0 34px 60px -30 / 0 4px 12px -8. */
  card: { y: 16, radius: 22, opacity: 0.3, elevation: 14 },
  /** Floating tab bar: 0 16px 32px -20 / 0 3px 8px -6. */
  tabBar: { y: 10, radius: 16, opacity: 0.32, elevation: 12 },
  /** Detail sheet (shadow points UP): 0 -10px 60px -20. */
  sheet: { y: -8, radius: 24, opacity: 0.4, elevation: 24 },
  /** List rows, chat bubbles, closet tiles: 0 14–20px 26–38px -16..-20. */
  soft: { y: 12, radius: 16, opacity: 0.28, elevation: 8 },
  /** Small verdict badge. */
  badge: { y: 5, radius: 8, opacity: 0.4, elevation: 6 },
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
