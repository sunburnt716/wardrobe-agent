/**
 * Modal bottom sheet: a full-screen scrim (tap to dismiss) and a panel that
 * springs up from below. Used by Today's garment detail sheet.
 *
 * Stays mounted so it can animate out; `pointerEvents` is dropped while
 * closed so it never blocks the screen behind it.
 */
import { type ReactNode, useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colour, radius, spring, timing } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';

const SCREEN_H = Dimensions.get('window').height;

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  /** 5px brand bar across the top of the panel (the detail sheet has one). */
  accentBar?: boolean;
  children: ReactNode;
}

export function Sheet({ visible, onClose, accentBar = true, children }: SheetProps) {
  const [panelH, setPanelH] = useState(SCREEN_H * 0.5);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = visible
      ? withSpring(1, spring.gentle)
      : withTiming(0, { duration: timing.sheetFade });
  }, [visible, progress]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * (panelH * 1.12) }],
  }));

  const onPanelLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setPanelH(h);
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        onLayout={onPanelLayout}
        style={[styles.panel, shadow('sheet'), panelStyle]}
      >
        {accentBar ? <View style={styles.accent} /> : null}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colour.inkA(0.42),
  },
  panel: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: colour.paper,
    borderRadius: radius.sheet,
    overflow: 'hidden',
  },
  accent: {
    height: 5,
    backgroundColor: colour.brand,
  },
});
