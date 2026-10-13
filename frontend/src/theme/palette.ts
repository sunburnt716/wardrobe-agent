/**
 * Light and dark palettes, with the same keys, plus the surface-tier system
 * dark mode needs.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM tokens.ts
 *
 * `tokens.ts` exports a single frozen `colour` object read at module scope,
 * which is why ~20 components can do `StyleSheet.create({ x: { color:
 * colour.ink } })`. A StyleSheet is evaluated ONCE at module load, so a
 * mutable palette or a getter cannot reach those values — they are already
 * baked. Runtime theming therefore requires colours to be resolved at render
 * time, via `useTheme()`. This file is the data for that; `tokens.ts` stays
 * as-is so nothing that currently imports it breaks mid-migration.
 *
 * WHY DARK IS NOT AN INVERSION
 *
 * Fitcheck's hierarchy comes from shadow — "no hairline boxes anywhere for
 * layout" — and shadows are nearly invisible on a dark ground. Inverting the
 * tokens would produce a flat, unreadable screen with no depth cues at all.
 * So dark mode replaces the mechanism: elevation becomes a lighter TONAL
 * SURFACE rather than a cast shadow, which is the approach Material 3 takes.
 * `surface1..3` are those tiers.
 *
 * Every pair below was checked against WCAG AA before being written here:
 * 19 of 19 pass, and the tiers are spaced 1.11 / 1.15 / 1.17 so the steps are
 * actually perceptible — a tier nobody can see is not an elevation cue.
 *
 * The dark ground is warm (#141109, not a neutral grey) on purpose. Fitcheck's
 * identity is warm paper; a cold grey dark mode would read as a different app.
 */

export interface Palette {
  /** The screen behind everything. Tier 0. */
  bg: string;
  /** Tier 1 — resting objects: list rows, tiles, chat bubbles. */
  surface1: string;
  /** Tier 2 — the surface the screen is about, and floating chrome. */
  surface2: string;
  /** Tier 3 — modal surfaces: detail sheets. */
  surface3: string;

  /** Primary text. */
  ink: string;
  /** Ink at an alpha. Text must never go below 0.7 — see tokens.ts. */
  inkA: (a: number) => string;
  /** Opaque dark fill (reject state, status pill). */
  inkSolid: string;

  /** Accent for FILLS, badges, rules and display type. Not small text. */
  brand: string;
  /** Accent pressed / committed. */
  brandDeep: string;
  /** Accent for SMALL TEXT — legible on every surface in this palette. */
  brandInk: string;
  /** Accent at an alpha, for tints and halos. */
  brandA: (a: number) => string;

  /** Rejection, always magenta regardless of look (design-spec §3). */
  magenta: string;
  magentaDeep: string;
  positive: string;

  /** Text on the status pill. */
  pillInk: string;
  /** Detection frame on the Add viewfinder. */
  detect: string;

  /** Per-screen washes. On dark these collapse toward the tiers, because a
   *  pale wash on a dark ground is not a wash, it is a light screen. */
  washToday: string;
  washCloset: string;
  washAsk: string;
  washFits: string;
  washAdd: string;

  /** True when this is the dark palette — for the few places that must know
   *  (StatusBar bar style, whether to draw a shadow or a tonal surface). */
  isDark: boolean;
}

export const lightPalette: Palette = {
  bg: '#fdfaf4',
  surface1: '#fffdf9',
  surface2: '#fffdf9',
  surface3: '#fffdf9',

  ink: '#201e1d',
  inkA: (a) => `rgba(32,30,29,${a})`,
  inkSolid: '#2b2724',

  brand: '#b3512f',
  brandDeep: '#8f3d22',
  brandInk: '#86391f',
  brandA: (a) => `rgba(179,81,47,${a})`,

  magenta: '#b0004f',
  magentaDeep: '#8d0040',
  positive: '#3b4f46',

  pillInk: '#f7efe2',
  detect: '#7fd4ee',

  washToday: '#f8f0e8',
  washCloset: '#e7dcc6',
  washAsk: '#dde2ef',
  washFits: '#ddd9d4',
  washAdd: '#2a2725',

  isDark: false,
};

export const darkPalette: Palette = {
  bg: '#141109',
  surface1: '#201c13',
  surface2: '#2d271b',
  surface3: '#3a3225',

  ink: '#f3ebdf',
  inkA: (a) => `rgba(243,235,223,${a})`,
  // On dark, the "opaque dark fill" role inverts: a reject button must still
  // read as the heavy option, so it becomes the lightest surface, not a
  // darker one. Inverting the token blindly would make it vanish.
  inkSolid: '#4a4030',

  brand: '#e08b5e',
  brandDeep: '#c4714a',
  brandInk: '#f0a87f',
  brandA: (a) => `rgba(224,139,94,${a})`,

  magenta: '#ff6fa6',
  magentaDeep: '#ff8fba',
  positive: '#9bbfa9',

  pillInk: '#f7efe2',
  detect: '#7fd4ee',

  // The per-screen washes are the design's signature — the app changing
  // colour by screen and by look. On dark they cannot stay pale, so each one
  // keeps its HUE as a faint tint over the dark ground instead of a tone.
  washToday: '#1d1811',
  washCloset: '#1f1b12',
  washAsk: '#15171f',
  washFits: '#1a1816',
  washAdd: '#121110',

  isDark: true,
};
