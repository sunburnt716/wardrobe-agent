/**
 * The dark capture frame. A 3:4 image slot with a dashed cyan detection
 * rectangle and a confidence read. The camera itself isn't wired
 * (TODO(native) in useAddGarment) — this shows the post-detection state.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { AppText } from '../primitives/AppText';
import { ImageSlot } from '../primitives/ImageSlot';

export function Viewfinder({ confidenceLabel }: { confidenceLabel: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <ImageSlot
          tint="#3a3633"
          icon="hoodie"
          iconSize={64}
          borderRadius={radius.sheet}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.detectRect} />
        <AppText style={styles.label}>{confidenceLabel}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  frame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: radius.sheet,
    overflow: 'hidden',
  },
  detectRect: {
    position: 'absolute',
    left: 30,
    right: 30,
    top: 60,
    bottom: 100,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,136,176,0.9)',
    borderRadius: 14,
  },
  label: {
    position: 'absolute',
    left: 30,
    top: 36,
    fontFamily: 'Lora-SemiBold',
    fontSize: 9,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: colour.detect,
  },
});
