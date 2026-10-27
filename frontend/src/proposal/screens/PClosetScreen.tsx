/**
 * PROPOSAL ONLY. Closet with yielding chrome.
 *
 * The masonry, the tiles and the underlined filter words are untouched -- they
 * are already the Pinterest pattern and the research found nothing to change.
 * The only difference is that the dateline and the filter row slide away as
 * you scroll down and come back the moment you scroll up, which is what
 * Pinterest's responsive bar does and what iOS 2025 tab bars do natively.
 *
 * This is the screen where the gain is biggest: a long masonry is exactly the
 * case where ~32% chrome costs the most.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { colour } from '../../theme/tokens';
import { DatelineHeader } from '../../components/layout/DatelineHeader';
import { ClosetMasonry } from '../../components/closet/ClosetMasonry';
import { FilterRow } from '../../components/closet/FilterRow';
import { GarmentStatsSheet } from '../../components/closet/GarmentStatsSheet';
import { AppText } from '../../components/primitives/AppText';
import { useCloset } from '../../data/useCloset';
import type { ClosetItem } from '../../data/types';
import { useChromeScroll } from '../ChromeContext';
import { YieldScaffold, useScrollBottomPad } from '../YieldScaffold';

export function PClosetScreen() {
  const { items, totalCount, filters, activeFilterId, setFilter, washCount } =
    useCloset();
  // Which garment's stats are open, if any.
  const [selected, setSelected] = useState<ClosetItem | null>(null);

  const onScroll = useChromeScroll();
  const bottomPad = useScrollBottomPad();

  return (
    <YieldScaffold
      wash={colour.washCloset}
      pillIcon="washing-machine"
      pillLabel={`${washCount} due a wash`}
      header={
        <>
          <DatelineHeader
            left={`${totalCount} pieces`}
            center="Closet"
            rightIcon="magnifying-glass"
          />
          <FilterRow
            filters={filters}
            activeId={activeFilterId}
            onSelect={setFilter}
          />
        </>
      }
    >
      {(topPad) => (
        <>
          <Animated.ScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: topPad,
              paddingBottom: bottomPad,
            }}
          >
            {items.length > 0 ? (
              <ClosetMasonry items={items} onSelect={setSelected} />
            ) : (
              <View style={styles.empty}>
                <AppText variant="metaItalic">
                  Nothing here under that filter.
                </AppText>
              </View>
            )}
          </Animated.ScrollView>

          {/* Above the yielding header (zIndex 5) and the status pill (9),
              or the sheet would slide up behind the furniture. */}
          <View style={styles.sheetLayer} pointerEvents="box-none">
            <GarmentStatsSheet
              item={selected}
              onClose={() => setSelected(null)}
            />
          </View>
        </>
      )}
    </YieldScaffold>
  );
}

const styles = StyleSheet.create({
  sheetLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
