/**
 * The frame every screen sits in: a full-bleed wash background, the black
 * status pill fused to the top, and a content area that clears the pill and
 * the floating tab bar.
 *
 * `light` inverts the status-bar text (Add is the one dark screen).
 */
import type { ReactNode } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space } from '../../theme/tokens';
import { StatusPill } from './StatusPill';
import { TAB_BAR_SPACE } from './TabBar';

export interface ScreenScaffoldProps {
  wash: string;
  /** Status-pill contents. */
  pillIcon?: string;
  pillLabel: string;
  pillDark?: boolean;
  /** Dark screen (Add) — flips status-bar text to light. */
  light?: boolean;
  /** Set false on screens whose content scrolls edge-to-edge under the pill. */
  padContent?: boolean;
  children: ReactNode;
}

export function ScreenScaffold({
  wash,
  pillIcon,
  pillLabel,
  pillDark = true,
  light = false,
  padContent = true,
  children,
}: ScreenScaffoldProps) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(space.datelineTop, insets.top + 44);

  return (
    <View style={[styles.root, { backgroundColor: wash }]}>
      <StatusBar
        barStyle={light ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <StatusPill icon={pillIcon} label={pillLabel} dark={pillDark} />
      <View
        style={[
          styles.content,
          padContent && { paddingTop: topPad },
          { paddingBottom: TAB_BAR_SPACE + insets.bottom },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
});
