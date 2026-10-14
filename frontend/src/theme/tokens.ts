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

  /**
   * Card / sheet surfaces — every raised object: outfit cards, sheets, the
   * tab bar, closet tiles, list rows.
   *
   * Was #fffdf9, which is white with only 6 points of warmth (R-B). Against
   * `washCloset` that is a 1.34 luminance jump and reads as a cut-out rather
   * than a sheet of paper. This is 15 points warm — 2.5x — so it harmonises
   * A hint of beige on a white page — enough to be a surface, not enough to
   * stop reading as white. Lift over the page is 1.087.
   *
   * This completes a three-step ground scale, which is what the palette was
   * missing when the card was pure white:
   *
   *   page    #ffffff   1.000   the ground
   *   paper   #f9f5ed   1.087   content sits on this
   *   chrome  #e4ddd0   1.350   persistent furniture
   *
   * A card is now separated three ways at once, each doing a different job:
   * the TONE says it is a different surface, the `hairline` border says
   * exactly where it ends, and the shadow says how far off the page it sits.
   * White-on-white asked the shadow to do all three, which is why cards were
   * hard to find.
   *
   * Warmer options, all clearing AA: #f7f2e7, #f4eee1. Cooler: #fbf8f2.
   */
  paper: '#f9f5ed',
  /**
   * Persistent chrome: the floating nav bar, the Ask input, suggestion
   * pills. The beige the cards used to carry.
   *
   * Content surfaces are white and furniture is beige, which is what keeps
   * the two legible against each other now that the page is also white. It
   * also gives the chrome a constant identity — the nav bar looks the same
   * on every screen regardless of what the content is doing.
   *
   * Text on this must use `brandInk`, not `brand`: plain brand measures
   * 3.76:1 here, under AA.
   */
  chrome: '#e4ddd0',
  /**
   * Card edge. 1px, warm, barely there.
   *
   * This is a DEPARTURE from the handoff spec, which says "no hairline boxes
   * anywhere for layout" and "rules never around content". That rule was
   * sound while every card had a tonal step under it — a near-white card on
   * a tinted wash separates on its own and a border would have been noise.
   * With a white card on a white page the step is 1.000 and shadow alone was
   * not enough to say where a card starts.
   *
   * So the rule's premise changed, not the rule's reasoning. If cards ever
   * regain a tonal ground, this should go away again.
   */
  hairline: 'rgba(32,30,29,0.12)',
  /**
   * The GROUND the app sits on, and text/icons drawn ON dark fills (a label
   * on a brand button, the icon in a verdict badge). Deliberately NOT
   * softened with `paper`: it measures 4.88:1 on `brand`, so darkening it
   * would push button labels under the 4.5:1 floor. Two roles, two tokens.
   */
  paperAlt: '#fdfaf4',

  /**
   * Per-screen wash backgrounds — the app's ground, behind every card.
   *
   * Deepened so cards read as raised. The old set gave the card wildly
   * different apparent elevation per screen: 1.07 lift on Today (whose wash
   * was itself nearly white, so cards barely separated) against 1.33 on
   * Fits. Same card, same shadow, different height — which is a large part
   * of what made the app feel unsettled.
   *
   * Now 1.37 / 1.42 / 1.44 / 1.46 — a 0.09 spread instead of 0.26, so a card
   * sits at the same height everywhere.
   *
   * HOW DARK THESE CAN GO IS CAPPED BY TEXT, not by taste. These are dark
   * grounds carrying DARK text, so every step down costs legibility. The
   * binding constraint is `brandInk` (the active filter word), which fails
   * AA before `inkA(0.7)` does. Worst case in this set is 4.93:1 — real
   * margin over 4.5, but not much room to go darker. Re-check with the
   * contrast script before deepening any of these further.
   *
   * NEUTRALISED at constant luminance. The deepened set above was also more
   * SATURATED (chroma ~44 on Today and Closet), which read as tan and gold
   * rather than as paper. Each wash is now blended toward a grey of exactly
   * the same relative luminance, keeping 45% of its original chroma.
   *
   * Because luminance is preserved, this costs nothing: card lift and every
   * text ratio are unchanged to three decimal places. Hue is a free dial here
   * and contrast is not — worth remembering, since it means the look can be
   * retuned without redoing any of the accessibility work.
   *
   * To go further, blend further toward the same greys:
   *   30% chroma -> #dbd6ce / #d6d3c9 / #cfd2d7 / #d1cfcd
   *   18% chroma -> #d9d6d1 / #d5d3cd / #d0d2d5 / #d0cfce
   *
   * NOW WHITE. The tinted grounds were replaced by a white page with beige
   * cards, which inverts the figure/ground relationship.
   *
   * CONSEQUENCE, stated plainly: the per-screen colour identity is gone.
   * These four tokens are kept as separate entries rather than collapsed
   * into one so that bringing it back is a value change, not a refactor —
   * every screen still asks for its own wash by name.
   *
   * Per-LOOK colour survives, and is now the only colour the app varies:
   * LookStage still washes a look's stage from its own garment colours.
   */
  washToday: '#ffffff',
  washCloset: '#ffffff',
  washAsk: '#ffffff',
  washFits: '#ffffff',
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
 *   inline (11) < grouped (14) < primary (19) < modal (26) < pill
 *
 * Sharpened from 14/18/24/32. Softer corners read as friendly-generic; these
 * crisper ones sit better against the newspaper furniture — the 4px rule, the
 * hairline, the justified dateline — which is the app's actual character.
 * This runs slightly under the original handoff spec ("30px radius on sheets,
 * 20-24px on cards"); that was deliberate, not drift.
 *
 * `pill` stays fully round, so ACTIONS keep their shape while SURFACES get
 * sharper. That contrast is now doing work: anything round is pressable,
 * anything cornered is a surface.
 */
export const radius = {
  /** Dense, inline, many-per-screen: closet tiles, small thumbnails. */
  tile: 11,
  /** Grouped items in a run: chat bubbles, back-issue cards. */
  bubble: 14,
  /** A primary surface the screen is about: the outfit card. */
  card: 19,
  /** Modal surfaces that sit above everything: the detail sheet. */
  sheet: 26,
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
