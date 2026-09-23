/**
 * Add — the one dark screen, so capture feels like a different mode. A
 * viewfinder up top, then the raised light panel of what the model read.
 */
import { StyleSheet, View } from 'react-native';
import { colour } from '../theme/tokens';
import { DatelineHeader } from '../components/layout/DatelineHeader';
import { ScreenScaffold } from '../components/layout/ScreenScaffold';
import { ReadFromPhotoSheet } from '../components/add/ReadFromPhotoSheet';
import { Viewfinder } from '../components/add/Viewfinder';
import { useAddGarment } from '../data/useAddGarment';

export function AddScreen() {
  const {
    detected,
    waterResistant,
    setWaterResistant,
    commit,
    retake,
  } = useAddGarment();

  return (
    <ScreenScaffold
      wash={colour.washAdd}
      light
      pillIcon="crosshair"
      pillLabel="Item found"
    >
      <DatelineHeader
        left="Step 1 of 2"
        center="Add a piece"
        rightIcon="lightning"
        tone="light"
      />

      <View style={styles.body}>
        <Viewfinder confidenceLabel={detected.confidenceLabel} />
      </View>

      <ReadFromPhotoSheet
        detected={detected}
        waterResistant={waterResistant}
        onWaterResistantChange={setWaterResistant}
        onCommit={commit}
        onRetake={retake}
      />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingVertical: 16,
  },
});
