/**
 * TEMPORARY DIAGNOSTIC -- bisect round 3. Delete this file and revert
 * index.js when done.
 *
 * ROUND 1 FOUND: ProgressRail animated `flexGrow` (a layout property) in
 * useAnimatedStyle, which segfaults on Fabric. Fixed, and a full scan
 * confirmed no other layout property is animated anywhere in src/.
 *
 * ROUND 2's PREMISE IS DEAD. It assumed the remaining fault was in
 * WholeLookVerdict, TodaySessionProvider, or the custom TabBar. All three
 * were read closely and are clean: WholeLookVerdict animates only
 * `transform`, the provider is plain useReducer, TabBar animates nothing.
 * Separately ruled out by measurement, not inspection:
 *   - native module versions all match Expo Go SDK 57 exactly
 *   - Metro serverRoot is `frontend`, not the backend dir
 *   - exactly one copy of react / react-native in the tree
 *   - phosphor deep imports resolve and export what Icon.tsx names
 *   - the worklets babel plugin is NOT applied twice (output identical)
 *   - tsc --noEmit is clean
 *
 * So the fault is very likely BELOW our components -- which is exactly why
 * removing components keeps failing to isolate it. Round 3 therefore
 * bisects the NATIVE STACK instead of our screens, from a bare-RN floor
 * upward.
 *
 * HOW TO USE: set LEVEL below, reload Expo Go, record renders/crashes, then
 * bump to the next level. The FIRST level that crashes names the culprit.
 *
 * RESULTS SO FAR (keep this updated -- it is the only record that survives
 * between sessions):
 *   13  bare React Native only              RENDERS -- floor is clean
 *   14  + safe-area-context                 RENDERS -- native insets fine
 *   15  + gesture-handler                   RENDERS -- but see CAVEAT below
 *   16  + reanimated (live worklet)         RENDERS + PULSES -- UI runtime
 *                                           ticks every frame; strongest
 *                                           pass of the ladder so far
 *   17  + react-native-svg (phosphor icon)  RENDERS -- pulse + icon both
 *                                           visible, so svg and reanimated
 *                                           coexist as they do in the app
 *   18  + expo-font (useAppFonts)           RENDERS -- fonts register, no
 *                                           hang (a hang here would look
 *                                           like a crash in the real app,
 *                                           which gates on `loaded`)
 *   19  + Apollo (ApolloProvider + client)  RENDERS -- no visible change is
 *                                           correct; ApolloProvider is a
 *                                           context provider. Proves ESM/CJS
 *                                           module eval + client construction
 *   20  + navigation / react-native-screens RENDERS -- native screen
 *                                           containers mount and tab
 *                                           switching works
 *   21  + our custom TabBar                 RENDERS -- and this was the
 *                                           cleanest single-variable test in
 *                                           the ladder: 20 vs 21 differ ONLY
 *                                           in who draws the tab bar
 *   22  + the real RootNavigator (5 screens) *** CRASHES *** -> TodayScreen
 *   23  Hotspot minimal repro (pct/dashed)  RENDERS -- diagnosis WRONG,
 *                                           percentage layout in a
 *                                           reanimated style is fine
 *   24  worklet calling a captured function *** CRASHES *** ROOT CAUSE
 *                                           = ProgressRail's colour.inkA()
 *
 * So after nine clean rungs the ENTIRE native stack is exonerated:
 * safe-area, gesture-handler, reanimated, svg, expo-font, Apollo,
 * react-native-screens, navigation and our own TabBar all mount and run.
 * The fault is in a SCREEN. Use the SCREEN switch below to name which.
 *
 * NOTE for level 22: every data hook in src/data/ returns mock data -- no
 * Apollo query runs anywhere in the app yet. So 22 is fully offline and
 * deterministic, and nothing about this crash can be network-related.
 *
 * Levels 19-21 were added mid-ladder: the original 13-18 never loaded
 * Apollo, React Navigation or react-native-screens, yet the real App.tsx
 * wraps everything in ApolloProvider and NavigationContainer. Without them
 * the ladder would have run out of rungs with the crash still unexplained.
 *
 * Level 13 rendering is a real result, not a null one: it rules out the
 * toolchain, Hermes, the Metro transform cache, registerRootComponent and
 * Expo Go itself. Whatever crashes the app is a library we chose, and it is
 * reached through JS-side module evaluation -- so one of 14-18 will name it.
 *
 * CAVEAT ON LEVEL 15 -- gesture-handler is NOT fully cleared. Its documented
 * requirement is that `import 'react-native-gesture-handler'` be the FIRST
 * statement in the entry file; this ladder requires it lazily inside App()
 * instead, which is the opposite of production ordering. Passing here proves
 * module eval + GestureHandlerRootView mount are safe, NOT that the real
 * import order is. If 16-18 all pass, run LEVEL 15.5, which reproduces the
 * production ordering and is the one rung this structure cannot otherwise
 * reach.
 *
 * Imports are `require()` inside each branch on purpose. A top-level
 * `import` evaluates its module -- and runs that library's JS-side native
 * install -- even when the component never renders it, which would defeat
 * the whole ladder.
 */
import { Text, View } from 'react-native';

/** Bump one at a time: 13 -> 14 -> ... -> 22. See RESULTS above. */
const LEVEL = 24 as 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

/**
 * LEVEL 22 ONLY -- which real screen to mount. `all` is the real
 * RootNavigator (crashes); the single names mount exactly ONE real screen
 * behind the real custom TabBar, so the crashing screen can be named.
 *
 * Start at 'today': bottom-tabs mounts lazily, so with `all` only the
 * initial route ('today') actually rendered -- which makes TodayScreen the
 * prime suspect rather than one of the other four.
 *
 * SCREEN RESULTS:
 *   today   <- current
 *   closet  not yet run
 *   add     not yet run
 *   ask     not yet run
 *   fits    not yet run
 */
const SCREEN = 'today' as 'all' | 'today' | 'closet' | 'add' | 'ask' | 'fits';

/**
 * LEVEL 23 ONLY -- minimal repro of Hotspot, discriminating between its two
 * suspect traits. Hotspot is the only component in the app that hands
 * PERCENTAGE layout values to a reanimated-managed style: it passes
 * `left/top/width/height` as '%' strings into PressScale, which merges them
 * into an AnimatedPressable alongside a useAnimatedStyle transform.
 * It also combines `borderStyle: 'dashed'` with `borderRadius`.
 *
 * This probe uses NO app code, so a crash here is a reproduction we could
 * file upstream rather than a bug in our composition.
 *
 *   'pct'    percentage layout inside an animated style, square borders
 *   'dashed' dashed border + borderRadius, plain px layout
 *   'both'   exactly what Hotspot does today
 *   'none'   control: px layout, square borders (must render)
 *
 * VARIANT RESULTS:
 *   both    <- current (confirm the repro reproduces at all)
 *   pct     not yet run
 *   dashed  not yet run
 *   none    not yet run
 */
const VARIANT = 'both' as 'pct' | 'dashed' | 'both' | 'none';

/**
 * LEVEL 24 ONLY -- the real suspect.
 *
 * ProgressRail's worklet calls `colour.inkA(0.18)`, and `colour.inkA` is a
 * plain arrow function on the tokens object (theme/tokens.ts). Compiling
 * every animated component shows ProgressRail is the ONLY worklet in the app
 * that captures a non-shared-value object:
 *
 *   ProgressRail      __closure={on, colour}   <-- captures the tokens object
 *   PressScale        __closure={scale}
 *   Sheet             __closure={progress} / {progress, panelH}
 *   WholeLookVerdict  __closure={committed, pressed}
 *   Toggle            __closure={x}
 *
 * Reanimated serializes closure values into the UI runtime. Shared values and
 * numbers cross fine; a FUNCTION cannot, so calling it synchronously on the
 * UI thread is the fault. Round 1 removed this component's animated
 * `flexGrow` but left the function call behind -- its comment reasons about
 * the animated PROPERTY being safe and never considers the CALL.
 *
 *   'fn'    worklet calls a captured plain function (repro of ProgressRail)
 *   'const' worklet uses pre-computed strings (the candidate fix)
 *
 * WORKLET RESULTS:
 *   fn     *** CRASHES *** -- ROOT CAUSE CONFIRMED, with no app code in the
 *          tree at all. A captured function called on the UI thread is the
 *          fault; the two variants differ in nothing else.
 *   const  <- current (must render, which validates the fix before
 *          ProgressRail is touched)
 */
const WORKLET = 'const' as 'fn' | 'const';

const LABELS: Record<number, string> = {
  13: 'bare React Native only',
  14: '+ safe-area-context',
  15: '+ gesture-handler',
  16: '+ reanimated (live worklet)',
  17: '+ react-native-svg (one phosphor icon)',
  18: '+ expo-font (useAppFonts)',
  19: '+ Apollo (ApolloProvider + real client)',
  20: '+ navigation / react-native-screens',
  21: '+ our custom TabBar',
  22: '+ the real RootNavigator (5 real screens)',
};

/** Plain banner, no third-party anything. If LEVEL 13 crashes, the fault is
 *  in the toolchain or Expo Go itself, not in any library we chose. */
function Banner() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fdfaf4',
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 28, color: '#201e1d' }}>Level {LEVEL}</Text>
      <Text style={{ fontSize: 15, color: '#201e1d', marginTop: 8 }}>
        {LABELS[LEVEL]}
      </Text>
      <Text style={{ fontSize: 13, color: '#8a8580', marginTop: 20 }}>
        If you can read this, this level is clean.
      </Text>
    </View>
  );
}

/**
 * Level 16 wrapper: a worklet that actually runs on the UI thread. Merely
 * importing reanimated is a weaker test than driving one, so this animates
 * opacity -- a paint property, deliberately not a layout one. The visible
 * ~700ms pulse IS the result: it proves the UI runtime re-evaluates the
 * worklet every frame, not just that the library mounted.
 *
 * This is a WRAPPER, not an alternative to the other probes. Every level
 * must be cumulative with the ones below it -- the real app runs reanimated
 * AND svg AND fonts together, so a level that quietly dropped reanimated
 * while testing svg would prove nothing about the real app.
 */
function ReanimatedWrap({ children }: { children: React.ReactNode }) {
  const Reanimated = require('react-native-reanimated');
  const Animated = Reanimated.default;
  const { useAnimatedStyle, useSharedValue, withRepeat, withTiming } = Reanimated;
  const { useEffect } = require('react');

  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

/**
 * The banner plus whatever the current level adds to it:
 *   17 -- one phosphor icon, the real react-native-svg exercise, since every
 *         icon renders through IconBase -> Svg
 *   18 -- expo-font registration, reported but never gated on; gating would
 *         hide a hang as a blank screen instead of a stuck level
 *
 * The conditional `require` + hook calls are safe because LEVEL is a module
 * constant: hook order cannot change at runtime within one build.
 */
function Content() {
  let fontLine: React.ReactNode = null;
  if (LEVEL >= 18) {
    const { useAppFonts } = require('./src/theme/fonts');
    const [loaded, error] = useAppFonts();
    fontLine = (
      <Text style={styles.note}>
        fonts loaded={String(loaded)} error={String(error?.message ?? null)}
      </Text>
    );
  }

  let icon: React.ReactNode = null;
  if (LEVEL >= 17) {
    const { SparkleIcon } = require('phosphor-react-native/src/icons/Sparkle');
    icon = (
      <View style={{ alignItems: 'center' }}>
        <SparkleIcon size={44} color="#b85c38" weight="duotone" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Banner />
      <View style={{ paddingBottom: 48, gap: 10 }}>
        {icon}
        {fontLine}
      </View>
    </View>
  );
}

/**
 * Levels 20-21: navigation, which is also the only thing that loads
 * react-native-screens (a native module bottom-tabs pulls in and that no
 * earlier rung touches).
 *
 * 20 uses the DEFAULT tab bar; 21 swaps in our custom one. The two differ by
 * exactly that, so 20-passes-but-21-crashes isolates TabBar -- the
 * comparison round 2 intended but never reached. Screens are the probe
 * Content so the lower rungs stay live inside the navigator.
 */
function NavWrap() {
  const {
    createBottomTabNavigator,
  } = require('@react-navigation/bottom-tabs');
  const { NavigationContainer } = require('@react-navigation/native');

  // Level 22: the real navigator and the five real screens. CRASHES -- so the
  // fault is in a SCREEN, and SCREEN below names which one.
  if (LEVEL >= 22 && SCREEN === 'all') {
    const { RootNavigator } = require('./src/navigation/RootNavigator');
    return (
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    );
  }

  const Tab = createBottomTabNavigator();

  // Level 22 with a single screen named: the real custom TabBar, one real
  // screen, nothing else. `require` is inside the branch so the other four
  // screens are never even evaluated.
  if (LEVEL >= 22) {
    const REAL = {
      today: () => require('./src/screens/TodayScreen').TodayScreen,
      closet: () => require('./src/screens/ClosetScreen').ClosetScreen,
      add: () => require('./src/screens/AddScreen').AddScreen,
      ask: () => require('./src/screens/AskScreen').AskScreen,
      fits: () => require('./src/screens/FitsScreen').FitsScreen,
    } as const;
    const Screen = REAL[SCREEN as Exclude<typeof SCREEN, 'all'>]();

    return (
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(
            props: import('@react-navigation/bottom-tabs').BottomTabBarProps,
          ) => {
            const { TabBar } = require('./src/components/layout/TabBar');
            return <TabBar {...props} />;
          }}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name={SCREEN} component={Screen} />
        </Tab.Navigator>
      </NavigationContainer>
    );
  }

  // The ONLY difference between 20 and 21: who draws the tab bar. Two routes,
  // not one, so the custom bar actually has to lay out multiple tabs.
  const custom = LEVEL >= 21;
  const navProps = custom
    ? {
        tabBar: (
          props: import('@react-navigation/bottom-tabs').BottomTabBarProps,
        ) => {
          const { TabBar } = require('./src/components/layout/TabBar');
          return <TabBar {...props} />;
        },
      }
    : {};

  return (
    <NavigationContainer>
      <Tab.Navigator {...navProps} screenOptions={{ headerShown: false }}>
        <Tab.Screen name="today" component={Content} />
        <Tab.Screen name="closet" component={Content} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

/**
 * Level 23: Hotspot's shape, rebuilt from scratch. Four absolutely-positioned
 * PressScale regions inside an aspect-ratio box, using the real mock box
 * coordinates. Uses our PressScale because the reanimated style merge is the
 * thing under test -- but no Hotspot, no OutfitCard, no screen.
 */
function HotspotRepro() {
  const { PressScale } = require('./src/components/primitives/PressScale');

  // The real placeholder coords from src/data/mock.ts, look 01.
  const BOXES: Array<[number, number, number, number]> = [
    [9.9, 11.8, 23.9, 36.4],
    [36.1, 6.4, 28.3, 19.5],
    [35.1, 29.5, 33.8, 21.4],
    [34.6, 55, 18.9, 34.1],
  ];

  const usePct = VARIANT === 'pct' || VARIANT === 'both';
  const useDashed = VARIANT === 'dashed' || VARIANT === 'both';

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfaf4', paddingTop: 80 }}>
      <Text style={{ textAlign: 'center', fontSize: 22, color: '#201e1d' }}>
        Level 23 — {VARIANT}
      </Text>
      <Text style={styles.note}>
        pct={String(usePct)} dashed={String(useDashed)}
      </Text>

      <View style={{ width: '100%', aspectRatio: 402 / 440, marginTop: 24 }}>
        <View style={{ flex: 1, backgroundColor: '#e7dcc6' }}>
          {BOXES.map(([x, y, w, h], i) => (
            <PressScale
              key={i}
              onPress={() => {}}
              style={[
                {
                  position: 'absolute' as const,
                  borderWidth: 2,
                  borderColor: '#4b6157',
                  backgroundColor: 'rgba(75,97,87,0.10)',
                },
                useDashed
                  ? { borderStyle: 'dashed' as const, borderRadius: 18 }
                  : null,
                usePct
                  ? {
                      left: `${x}%` as const,
                      top: `${y}%` as const,
                      width: `${w}%` as const,
                      height: `${h}%` as const,
                    }
                  : { left: 40 + i * 10, top: 40 + i * 60, width: 90, height: 50 },
              ]}
            >
              <View />
            </PressScale>
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Level 24: ProgressRail's worklet, reduced to its essence. No app code at
 * all -- a local object with a function on it, exactly like `colour.inkA`.
 * 'fn' calls it inside the worklet; 'const' reads pre-computed strings.
 */
function WorkletFnRepro() {
  const Reanimated = require('react-native-reanimated');
  const Animated = Reanimated.default;
  const { useAnimatedStyle, useSharedValue, withRepeat, withTiming } = Reanimated;
  const { useEffect } = require('react');

  // Stand-in for the `colour` tokens object: a plain function on an object.
  const palette = {
    brand: '#b3512f',
    inkA: (a: number) => `rgba(32,30,29,${a})`,
  };
  const FLAT_ON = '#b3512f';
  const FLAT_OFF = 'rgba(32,30,29,0.18)';

  const on = useSharedValue(0);
  useEffect(() => {
    on.value = withRepeat(withTiming(1, { duration: 320 }), -1, true);
  }, [on]);

  // The two worklets differ ONLY in whether a captured function is called.
  const fnStyle = useAnimatedStyle(() => ({
    backgroundColor: on.value > 0.5 ? palette.brand : palette.inkA(0.18),
  }));
  const constStyle = useAnimatedStyle(() => ({
    backgroundColor: on.value > 0.5 ? FLAT_ON : FLAT_OFF,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#fdfaf4', paddingTop: 90 }}>
      <Text style={{ textAlign: 'center', fontSize: 22, color: '#201e1d' }}>
        Level 24 — {WORKLET}
      </Text>
      <Text style={styles.note}>
        {WORKLET === 'fn'
          ? 'worklet CALLS a captured function (ProgressRail as written)'
          : 'worklet reads pre-computed strings (candidate fix)'}
      </Text>
      <View style={{ paddingHorizontal: 40, paddingTop: 40 }}>
        <Animated.View
          style={[
            { height: 24, borderRadius: 999 },
            WORKLET === 'fn' ? fnStyle : constStyle,
          ]}
        />
      </View>
    </View>
  );
}

export default function App() {
  if (LEVEL >= 24) {
    return <WorkletFnRepro />;
  }

  if (LEVEL >= 23) {
    return <HotspotRepro />;
  }

  // Built additively: each level keeps everything the levels below it added.
  // From 20 up the navigator owns the content, since screens must mount
  // inside it -- the lower rungs stay live because Content is the screen.
  let tree: React.ReactNode = LEVEL >= 20 ? <NavWrap /> : <Content />;

  if (LEVEL >= 19) {
    const { ApolloProvider } = require('@apollo/client/react');
    const { apolloClient } = require('./src/apollo/client');
    tree = <ApolloProvider client={apolloClient}>{tree}</ApolloProvider>;
  }

  if (LEVEL >= 16) {
    tree = <ReanimatedWrap>{tree}</ReanimatedWrap>;
  }

  if (LEVEL >= 15) {
    const { GestureHandlerRootView } = require('react-native-gesture-handler');
    tree = (
      <GestureHandlerRootView style={{ flex: 1 }}>
        {tree}
      </GestureHandlerRootView>
    );
  }

  if (LEVEL >= 14) {
    const { SafeAreaProvider } = require('react-native-safe-area-context');
    tree = <SafeAreaProvider>{tree}</SafeAreaProvider>;
  }

  return <>{tree}</>;
}

const styles = {
  note: {
    textAlign: 'center' as const,
    fontSize: 13,
    color: '#8a8580',
  },
};
