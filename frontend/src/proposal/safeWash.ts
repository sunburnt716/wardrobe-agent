/**
 * PROPOSAL ONLY. Turn a look's tint into a screen background that is
 * guaranteed to stay readable.
 *
 * WHY A FUNCTION AND NOT JUST THE TINT
 *
 * The Ask screen takes the colour of the look being discussed, which is the
 * design's own idea — "the app's colour changes daily and is tied to real
 * data". But the screen carries TEXT: the dateline date, the screen title,
 * the ellipsis icon, all drawn in `ink` and `brandInk` straight onto the
 * background.
 *
 * A tint is whatever dominant-colour extraction pulled off a garment. In the
 * mock data alone they run from #f4efe6 (near white) to #33405c (near navy).
 * Painting a dark navy behind dark text produces an unreadable header, and a
 * 20% blend of that navy ALREADY fails AA. So the tint cannot be trusted and
 * cannot be blended at a fixed ratio either.
 *
 * This walks the tint back toward the screen's base wash until every text
 * role on that background clears AA with margin. Light tints keep ~40% of
 * their colour; a near-navy keeps 5% and is effectively just the base. The
 * screen is always tinted as far as it safely can be, and never further.
 *
 * Termination: the base wash itself already passes, so the loop always ends.
 */
import { colour } from '../theme/tokens';

type RGB = [number, number, number];

function hexToRgb(h: string): RGB {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function rgbToHex(c: RGB): string {
  return '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function channel(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(c: RGB): number {
  return 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2]);
}

function contrast(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] * t + b[0] * (1 - t),
    a[1] * t + b[1] * (1 - t),
    a[2] * t + b[2] * (1 - t),
  ];
}

/** Composite a translucent ink over a background, as the renderer would. */
function over(fg: RGB, bg: RGB, alpha: number): RGB {
  return [
    alpha * fg[0] + (1 - alpha) * bg[0],
    alpha * fg[1] + (1 - alpha) * bg[1],
    alpha * fg[2] + (1 - alpha) * bg[2],
  ];
}

const INK = hexToRgb(colour.ink);
const BRAND_INK = hexToRgb(colour.brandInk);

/** Every text role actually drawn directly on a screen wash. */
function readable(bg: RGB): boolean {
  return (
    Math.min(
      contrast(INK, bg),
      contrast(over(INK, bg, 0.7), bg),
      contrast(BRAND_INK, bg),
    ) >= 4.6
  );
}

/** Strongest tint we ever apply, before safety pulls it back. */
const MAX_TINT = 0.4;

/**
 * A background that leans toward `tint` as far as the text on it allows.
 * Returns `base` unchanged when `tint` is null or unusable.
 */
export function safeWash(tint: string | null | undefined, base: string): string {
  if (!tint || !/^#[0-9a-fA-F]{6}$/.test(tint)) return base;

  const t = hexToRgb(tint);
  const b = hexToRgb(base);

  for (let strength = MAX_TINT; strength > 0; strength -= 0.05) {
    const candidate = mix(t, b, strength);
    if (readable(candidate)) return rgbToHex(candidate);
  }
  return base;
}

/**
 * A readable two-stop wash for a full-screen backdrop.
 *
 * A single safe colour is often invisible: `safeWash('#c8d2ea', washAsk)`
 * returns #c9d2e6, three units from the base, because an indigo look on the
 * indigo Ask wash has almost nothing to shift. A vertical ramp reads as a
 * wash across the whole page even when the hue barely moves, because the eye
 * sees the GRADIENT rather than the absolute colour.
 *
 * The darker stop is pulled toward ink and then clamped the same way the
 * light one is, so the bottom of the screen stays as readable as the top.
 */
export function washPair(
  tint: string | null | undefined,
  base: string,
): [string, string] {
  const top = safeWash(tint, base);
  const t = hexToRgb(top);

  // Step the bottom down until it is both visibly darker and still readable.
  for (let depth = 0.16; depth > 0; depth -= 0.02) {
    const candidate = mix(INK, t, depth);
    if (readable(candidate)) return [top, rgbToHex(candidate)];
  }
  return [top, top];
}
