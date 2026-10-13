/**
 * PROPOSAL ONLY. The app shell: four swipeable destinations, a yielding tab
 * bar, and Add as a modal rather than a tab.
 *
 * Swipe is a horizontal paging ScrollView rather than a pan gesture or a
 * pager library. Two reasons. First, no new dependency -- the tree is
 * deliberately small, and react-native-pager-view / material-top-tabs would
 * each add one. Second, RN's own paging is native-driven, so it cannot
 * desynchronise from the finger the way hand-rolled gesture maths can, and it
 * needs no worklet at all. Instagram added exactly this in 2025-26.
 *
 * The trade-off, stated plainly: paging mounts all four destinations eagerly,
 * where React Navigation's bottom-tabs mounts lazily. For four mock-data
 * screens that is cheap and makes the swipe smooth from the first frame. It
 * would need revisiting against real queries.
 *
 * Add uses RN's built-in Modal -- again no new dependency -- which also gets
 * the right semantics for free: it is a mode you enter and leave, not a place
 * you navigate to, which is what the design spec already says by making it
 * the one dark surface in the app.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { colour } from '../theme/tokens';
import { AddScreen } from '../screens/AddScreen';
import { IconButton } from '../components/primitives/Pill';
import { useChrome } from './ChromeContext';
import { useSavedLooks } from './SavedLooksProvider';
import { DESTINATIONS, YieldingTabBar } from './YieldingTabBar';
import { PTodayScreen } from './screens/PTodayScreen';
import { PClosetScreen } from './screens/PClosetScreen';
import { PAskScreen } from './screens/PAskScreen';
import { PFitsScreen } from './screens/PFitsScreen';

const SCREEN_W = Dimensions.get('window').width;

export function SwipeShell() {
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  // Ask -> Today handoff. The shell owns it because the two screens are
  // siblings in the pager; PTodayScreen clears it once it has selected.
  const [requestedLook, setRequestedLook] = useState<string | null>(null);
  const { reveal } = useChrome();
  const { count } = useSavedLooks();

  const openAdd = useCallback(() => setAddOpen(true), []);

  /** Tab tap -> animate the pager. Chrome comes back so you can see where you
   *  landed; arriving on a screen with the bar still hidden is disorienting. */
  const goTo = useCallback(
    (i: number) => {
      scroller.current?.scrollTo({ x: i * SCREEN_W, animated: true });
      setIndex(i);
      reveal();
    },
    [reveal],
  );

  /** Swipe settled. Momentum end rather than onScroll: updating React state
   *  every frame of a drag would re-render four screens per frame. */
  const onSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
      if (next !== index) {
        setIndex(next);
        reveal();
      }
    },
    [index, reveal],
  );

  /** "Open in Today" on an Ask look card: carry the id, then go to Today. */
  const openLook = useCallback(
    (outfitId: string) => {
      setRequestedLook(outfitId);
      goTo(0);
    },
    [goTo],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettled}
        // The vertical lists inside each page must win the gesture, or a
        // slightly diagonal flick steals the scroll sideways.
        directionalLockEnabled
        scrollEventThrottle={16}
      >
        <View style={styles.page}>
          <PTodayScreen
            onAdd={openAdd}
            requestedLook={requestedLook}
            onLookShown={() => setRequestedLook(null)}
          />
        </View>
        <View style={styles.page}>
          <PClosetScreen />
        </View>
        <View style={styles.page}>
          <PAskScreen onOpenLook={openLook} />
        </View>
        <View style={styles.page}>
          <PFitsScreen />
        </View>
      </ScrollView>

      <YieldingTabBar index={index} onSelect={goTo} savedCount={count} />

      <Modal
        visible={addOpen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalRoot}>
          <AddScreen />
          <View style={styles.modalClose}>
            <IconButton
              icon="x"
              size={44}
              iconSize={18}
              background="rgba(253,250,244,0.14)"
              color={colour.paperAlt}
              onPress={() => setAddOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Exported so the shell's destination list stays the single source of truth. */
export const DESTINATION_COUNT = DESTINATIONS.length;

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: {
    width: SCREEN_W,
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colour.washAdd,
  },
  // Add is a mode, so it needs an explicit way out. A tab never did.
  modalClose: {
    position: 'absolute',
    top: 54,
    right: 18,
    zIndex: 20,
  },
});
