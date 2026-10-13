/**
 * The single source of truth for colour, spacing, radius, and motion.
 * Every literal here is taken from the design handoff (README.md "Design
 * Tokens"). Components must not hard-code hex values — import from here.
 */

// --- Colour ---------------------------------------------------------------

export const colour = {
  /** The ONE brand colour. Fills, badges, rules, and display type on `paper`
   *  or `washToday`. NOT for small text on the other washes — it measures
   *  3.74:1 on `washCloset` and 3.62:1 on `washFits`, under the 4.5:1 that
   *  text below 24px needs. Use `brandInk` there. */
  brand: '#b3512f',
  /** Brand, deepened — pressed / committed states only. */
  brandDeep: '#8f3d22',
  /** Brand as SMALL TEXT. Same hue, dark enough to clear 4.5:1 on every wash
   *  in the palette (worst case 5.71:1 on `washFits`). Separate from
   *  `brandDeep` on purpose: that one means "pressed", this one means
   *  "terracotta, but legible at label size". */
  brandInk: '#86391f',

  /** Primary text and dark solid fills. `inkSolid` is the same role, used
   *  where a fully opaque dark fill reads better than layered opacity. */
  ink: '#201e1d',
  inkSolid: '#2b2724',

  /** Card / sheet surfaces. */
  paper: '#fffdf9',
  paperAlt: '#fdfaf4',

  /** Per-screen wash backgrounds. */
  washToday: '#f8f0e8',
  washCloset: '#e7dcc6',
  washAsk: '#dde2ef',
  washFits: '#ddd9d4',
  /** Add is the one dark surface in the app. */
  washAdd: '#2a2725',

  /** Status pill text (on the black pill). */
  pillInk: '#f7efe2',

  /** Detection frame on the Add viewfinder. */
  detect: '#7fd4ee',

  /** Verdict tints. Negative signals stay magenta regardless of look, so
   *  they read consistently (design-spec §3). */
  magenta: '#b0004f',
  magentaDeep: '#8d0040',
  positive: '#3b4f46',

  /**
   * Ink at opacity — for secondary text, hairline rules, faint fills.
   * rgba(32,30,29, a) — 32,30,29 is `ink`.
   *
   * ALPHA FLOOR FOR TEXT: 0.7. Measured against every wash in this palette,
   * `inkA(0.7)` clears WCAG AA 4.5:1 with its worst case at 5.18:1, while
   * 0.6 drops to 3.94 and 0.5 to 3.00 — i.e. below AA, and 0.5 is below the
   * 3:1 floor for large text too. Nine call sites were under 0.7 and have
   * been raised. Rules and fills may go lower; text may not.
   */
  inkA: (a: number) => `rgba(32,30,29,${a})`,
  /** Brand at opacity — tints, ghosted numerals, halo. rgba(179,81,47, a). */
  brandA: (a: number) => `rgba(179,81,47,${a})`,
} as const;

// --- Spacing -------------------------------------------------------------

export const space = {
  /** Horizontal screen-edge padding. README: 18–22. */
  edge: 20,
  /** Space cleared at the top for the status pill before the dateline rule. */
  datelineTop: 78,
  /** Bottom padding on the tab bar for the iOS home indicator. */
  homeIndicator: 34,
} as const;

// --- Radius -------------------------------------------------------------

/**
 * Shape scale, graded so radius carries information.
 *
 * It previously ran 20 / 22 / 22 / 26 — four values within 6px, which meant a
 * tile, a card and a chat bubble all read as the same class of object. Shape
 * contrast is one of the strongest signals available for distinguishing
 * object types (it is a core finding behind Material 3 Expressive), and a
 * flat scale spends it for nothing.
 *
 * The steps now rank by how much the object owns the screen:
 *   inline (14) < grouped (18) < primary (24) < modal (32) < pill
 */
export const radius = {
  /** Dense, inline, many-per-screen: closet tiles, small thumbnails. */
  tile: 14,
  /** Grouped items in a run: chat bubbles, back-issue cards. */
  bubble: 18,
  /** A primary surface the screen is about: the outfit card. */
  card: 24,
  /** Modal surfaces that sit above everything: the detail sheet. */
  sheet: 32,
  /** Fully rounded — pills, circles, hotspots, avatars. */
  pill: 999,
} as const;

// --- Motion -----------------------------------------------------------

/**
 * ONE overshoot spring, reused everywhere a transform settles
 * (spring-back, verdict pop, commit scale). Tuned to approximate the
 * design's `cubic-bezier(.2, .9–1.4, .25–.4, 1.06–1)`.
 */
export const spring = {
  gentle: { damping: 18, stiffness: 150, mass: 1 },
  /** More overshoot — verdict badge pop, commit button. */
  pop: { damping: 12, stiffness: 180, mass: 0.9 },
} as const;

export const timing = {
  /** Card fly-off — JS-driven, linear, tied to the look swap. */
  flyOff: 220,
  /** Colour / opacity crossfades. */
  colour: 320,
  /** Sheet opacity. */
  sheetFade: 350,
  /** Press feedback. */
  press: 130,
  /** Hotspot stagger step. */
  stagger: 60,
} as const;

/** Press-scale target — every interactive element dips to this on pressIn. */
export const PRESS_SCALE = 0.94;

/** Drag distance past which a Today card commits to flying off. */
export const SWIPE_THRESHOLD = 64;
