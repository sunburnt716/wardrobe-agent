/**
 * The black pill at top-centre, designed to fuse with a Dynamic-Island
 * camera cutout on iOS. The large top padding is deliberate (README). On
 * Android / notchless devices it reads as a normal rounded pill near the
 * status bar.
 *
 * The real iOS Live Activity is a separate native target (deferred); this is
 * the in-app visual.
 */
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colour } from '../../theme/tokens';
import { AppText } from '../primitives/AppText';
import { Icon } from '../primitives/Icon';

export function StatusPill({
  icon,
  label,
  dark = true,
}: {
  icon?: string;
  label: string;
  dark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.pill,
        {
          top: isAndroid ? insets.top + 6 : 11,
          paddingTop: isAndroid ? 8 : 39,
          backgroundColor: dark ? '#000' : colour.paper,
        },
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <Icon
            name={icon}
            size={12}
            color={dark ? colour.pillInk : colour.ink}
            weight="duotone"
          />
        ) : null}
        <AppText
          variant="pillLabel"
          style={{ color: dark ? colour.pillInk : colour.ink }}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    left: '50%',
    marginLeft: -63,
    width: 126,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingBottom: 7,
    zIndex: 9,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
});
