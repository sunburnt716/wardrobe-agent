/**
 * The single source of truth for colour, spacing, radius, and motion.
 * Every literal here is taken from the design handoff (README.md "Design
 * Tokens"). Components must not hard-code hex values — import from here.
 */

// --- Colour ---------------------------------------------------------------

export const colour = {
  /** The ONE brand colour. Masthead, active states, primary buttons, badges. */
  brand: '#b3512f',
  /** Brand, deepened — pressed / committed states only. */
  brandDeep: '#8f3d22',

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

  /** Ink at opacity — for secondary text, hairline rules, faint fills.
   *  rgba(32,30,29, a) — 32,30,29 is `ink`. */
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

export const radius = {
  card: 22,
  sheet: 26,
  tile: 20,
  bubble: 22,
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
