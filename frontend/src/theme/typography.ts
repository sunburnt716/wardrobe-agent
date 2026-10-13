/**
 * Font families and the named text styles used across the app.
 *
 * Display is Yeseva One; body is Lora (a serif — the spec forbids
 * sans-serif anywhere). Family strings are the keys `expo-font` registers
 * the .ttf files under — see `src/theme/fonts.ts`, which must have loaded
 * before any of these presets render.
 *
 * RN `letterSpacing` is in points, not `em`, so the CSS `em` values from the
 * design are pre-multiplied by their font size here.
 */
import type { TextStyle } from 'react-native';
import { colour } from './tokens';

export const font = {
  display: 'YesevaOne-Regular',
  body: 'Lora-Regular',
  bodyItalic: 'Lora-Italic',
  bodyMedium: 'Lora-Medium',
  bodySemiBold: 'Lora-SemiBold',
} as const;

/**
 * Named text presets. Spread into a StyleSheet entry or a <Text> style.
 * Colour is included where the design fixes it; otherwise left to the caller.
 */
export const textPresets = {
  /** "Fitcheck" masthead. */
  wordmark: {
    fontFamily: font.display,
    fontSize: 19,
    letterSpacing: -0.19,
    color: colour.brand,
  },

  /** Look title on the Today card, sheet has its own. */
  lookTitle: {
    fontFamily: font.display,
    fontSize: 32,
    lineHeight: 32 * 0.98,
    letterSpacing: -0.32,
    color: colour.ink,
  },

  /** Detected-item name (Add), agent look-card name (Ask), Fits card name. */
  itemTitle: {
    fontFamily: font.display,
    fontSize: 22,
    lineHeight: 22 * 1.05,
    color: colour.ink,
  },

  /** Garment name in the detail sheet. */
  sheetName: {
    fontFamily: font.display,
    fontSize: 27,
    lineHeight: 27 * 1.05,
    letterSpacing: -0.27,
    color: colour.ink,
  },

  /** Garment name on a Closet tile. */
  tileName: {
    fontFamily: font.display,
    fontSize: 13.5,
    lineHeight: 13.5 * 1.15,
    color: colour.ink,
  },

  /** The big ghosted "01" index numeral. */
  indexNumeral: {
    fontFamily: font.display,
    fontSize: 44,
    lineHeight: 44,
    color: colour.brandA(0.22),
  },

  /** Card subtitle / meta ("Three layers, smart enough"). */
  metaItalic: {
    fontFamily: font.bodyItalic,
    fontSize: 14.5,
    color: colour.inkA(0.72),
  },

  /** Hint line ("Tap any piece to read it"). */
  hint: {
    fontFamily: font.bodyItalic,
    fontSize: 14,
    color: colour.inkA(0.8),
  },

  /** Category kicker in the sheet / "Read from the photo". */
  kicker: {
    fontFamily: font.bodyItalic,
    fontSize: 15,
    color: colour.brand,
  },

  /**
   * Uppercase micro-label — dateline date, position counter.
   *
   * Was 10px / 1.8 letter-spacing. A serif at 10px, uppercase AND
   * letter-spaced stacks three legibility costs: uppercase removes
   * word-shape recognition, 10px erases the serifs' detail, and wide
   * tracking removes word cohesion. Raised to 12px and the tracking cut to
   * ~0.09em, which keeps the editorial character while making it readable.
   * Full-strength ink, not an opacity — this tier is information.
   */
  microLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: colour.ink,
  },

  /**
   * Uppercase micro-label, smaller — tab labels, tile meta.
   *
   * The 0.6 alpha here measured 3.94:1, under WCAG AA. It was missed in the
   * first contrast pass because that pass only searched .tsx files and this
   * is a .ts preset — so one failing value reached every tab label and tile
   * meta line in the app. Now at the 0.7 floor.
   */
  microLabelSm: {
    fontFamily: font.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: colour.inkA(0.7),
  },

  /**
   * Status pill text (on the black pill). Was 8.5px — the smallest type in
   * the app, carrying the weather, which is the single thing you most want
   * while deciding what to wear.
   */
  pillLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colour.pillInk,
  },

  /** Chip text. */
  chip: {
    fontFamily: font.bodySemiBold,
    fontSize: 12.5,
    color: colour.inkA(0.9),
  },

  /** Body copy in the detail sheet. */
  note: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colour.inkA(0.85),
  },

  /** Chat bubble body. */
  bubble: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 13 * 1.5,
  },

  /** Primary button label ("Wear this", "Add to closet"). */
  buttonLabel: {
    fontFamily: font.display,
    fontSize: 19,
    letterSpacing: -0.19,
  },

  /** Smaller button label — sheet verdict buttons. */
  buttonLabelSm: {
    fontFamily: font.bodySemiBold,
    fontSize: 13.5,
  },
} satisfies Record<string, TextStyle>;

export type TypeName = keyof typeof textPresets;
