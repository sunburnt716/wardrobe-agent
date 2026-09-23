/**
 * Closet — the wardrobe as a print catalogue. Filter row, then a two-column
 * masonry of tiles. The status pill carries the live "due a wash" count.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { colour } from '../theme/tokens';
import { DatelineHeader } from '../components/layout/DatelineHeader';
import { ScreenScaffold } from '../components/layout/ScreenScaffold';
import { ClosetMasonry } from '../components/closet/ClosetMasonry';
import { FilterRow } from '../components/closet/FilterRow';
import { AppText } from '../components/primitives/AppText';
import { useCloset } from '../data/useCloset';

export function ClosetScreen() {
  const { items, totalCount, filters, activeFilterId, setFilter, washCount } =
    useCloset();

  return (
    <ScreenScaffold
      wash={colour.washCloset}
      pillIcon="washing-machine"
      pillLabel={`${washCount} due a wash`}
    >
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {items.length > 0 ? (
          <ClosetMasonry items={items} />
        ) : (
          <View style={styles.empty}>
            <AppText variant="metaItalic">Nothing here under that filter.</AppText>
          </View>
        )}
      </ScrollView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
});
