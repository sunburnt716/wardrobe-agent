/**
 * Runtime theme. Follows the OS by default, with an explicit override for a
 * future in-app setting.
 *
 * MIGRATION PATTERN — read this before converting a component.
 *
 * A colour must be resolved at RENDER time, not module-load time, or it
 * cannot change theme. So a converted component keeps its StyleSheet for
 * everything that is not a colour (layout, radius, spacing, type size) and
 * applies colour inline from the theme:
 *
 *     export function Thing() {
 *       const t = useTheme();
 *       return <View style={[styles.box, { backgroundColor: t.surface1 }]} />;
 *     }
 *     const styles = StyleSheet.create({ box: { padding: 12, borderRadius: radius.card } });
 *
 * That split matters: StyleSheet.create still gets to hoist and share the
 * static half, so converting does not cost the performance benefit of
 * StyleSheet. Only the colours become per-render objects.
 *
 * For a component with many colours, `useThemedStyles` below keeps the whole
 * sheet together and memoises it per theme.
 *
 * DO NOT make the exported `colour` object in tokens.ts mutable to avoid this
 * work. ~20 components bake its values into StyleSheet.create at module load;
 * a mutable object cannot reach them, and the result would be a theme that
 * silently applies to some screens and not others.
 */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { darkPalette, lightPalette, type Palette } from './palette';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeControl {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const PaletteCtx = createContext<Palette>(lightPalette);
const ControlCtx = createContext<ThemeControl>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({
  children,
  initial = 'system',
}: {
  children: ReactNode;
  /** 'light' pins the app to the current look — used while migration is in
   *  progress, so a half-converted screen is never shown in dark. */
  initial?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initial);
  const system = useColorScheme();

  const palette = useMemo(() => {
    const effective = preference === 'system' ? (system ?? 'light') : preference;
    return effective === 'dark' ? darkPalette : lightPalette;
  }, [preference, system]);

  const control = useMemo<ThemeControl>(
    () => ({ preference, setPreference }),
    [preference],
  );

  return (
    <ControlCtx.Provider value={control}>
      <PaletteCtx.Provider value={palette}>{children}</PaletteCtx.Provider>
    </ControlCtx.Provider>
  );
}

/** The active palette. This is what components call. */
export function useTheme(): Palette {
  return useContext(PaletteCtx);
}

/** For a settings toggle. Separate from useTheme so a component that only
 *  needs colours does not re-render when the preference object changes. */
export function useThemeControl(): ThemeControl {
  return useContext(ControlCtx);
}

/**
 * Build a StyleSheet from the active palette, memoised per palette so the
 * sheet is created once per theme rather than once per render.
 *
 *     const styles = useThemedStyles((t) => ({
 *       card: { backgroundColor: t.surface1, borderRadius: radius.card },
 *     }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  build: (t: Palette) => T,
): T {
  const t = useTheme();
  // `build` is expected to be a stable module-scope function; it is
  // deliberately not a dependency, so an inline arrow does not thrash the
  // memo on every render.
  return useMemo(() => StyleSheet.create(build(t)), [t]);
}
