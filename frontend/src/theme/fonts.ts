/**
 * Runtime font registration.
 *
 * The app is managed Expo, so there are no native projects to link .ttf
 * files into — fonts are loaded at startup by `expo-font` instead. The keys
 * below are what `fontFamily` resolves against: expo-font registers each
 * file under the key given here, so these strings are registration names,
 * not the PostScript names inside the files. `src/theme/typography.ts` is
 * the only place that should name them.
 *
 * Lora ships from Google Fonts as a variable font (`Lora[wght].ttf`), which
 * React Native cannot select instances from — a variable file renders at its
 * default weight only, which would silently collapse Medium and SemiBold
 * into Regular. These are the pre-instanced static cuts from
 * `@expo-google-fonts/lora` instead, vendored in `assets/fonts/`.
 */
import { useFonts } from 'expo-font';

export const fontAssets = {
  'YesevaOne-Regular': require('../../assets/fonts/YesevaOne-Regular.ttf'),
  'Lora-Regular': require('../../assets/fonts/Lora-Regular.ttf'),
  'Lora-Italic': require('../../assets/fonts/Lora-Italic.ttf'),
  'Lora-Medium': require('../../assets/fonts/Lora-Medium.ttf'),
  'Lora-SemiBold': require('../../assets/fonts/Lora-SemiBold.ttf'),
} as const;

/**
 * `[loaded, error]`. `loaded` flips true once every family above is
 * registered; `error` is non-null if a file failed to parse. Both are false
 * / null on the first frame, so callers must gate rendering on `loaded` —
 * text mounted before then falls back to the system sans-serif, which the
 * design spec forbids everywhere.
 */
export function useAppFonts(): [boolean, Error | null] {
  const [loaded, error] = useFonts(fontAssets);
  return [loaded, error ?? null];
}
