/**
 * Font families and the named text styles used across the app.
 *
 * Display is Yeseva One; body is Lora (a serif — the spec forbids
 * sans-serif anywhere). Family strings are PostScript names; the .ttf files
 * are linked natively (see assets/fonts/README.md), so there is no runtime
 * font loader.
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
    fontSize: 17,
    letterSpacing: -0.17,
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

  /** Uppercase micro-label — dateline date, position counter. */
  microLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colour.ink,
  },

  /** Uppercase micro-label, smaller — tab labels, tile meta. */
  microLabelSm: {
    fontFamily: font.bodySemiBold,
    fontSize: 9.5,
    letterSpacing: 0.95,
    textTransform: 'uppercase',
    color: colour.inkA(0.6),
  },

  /** Status pill text (on the black pill). */
  pillLabel: {
    fontFamily: font.bodySemiBold,
    fontSize: 8.5,
    letterSpacing: 0.85,
    textTransform: 'uppercase',
    color: colour.pillInk,
  },

  /** Chip text. */
  chip: {
    fontFamily: font.bodySemiBold,
    fontSize: 11.5,
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
