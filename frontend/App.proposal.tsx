/**
 * PROPOSAL ENTRY -- a UX proposition, not a replacement. Nothing under
 * src/ outside src/proposal/ was modified to build this.
 *
 * TO REVERT: change the import in index.js back to './App'. That is the whole
 * revert. To delete it entirely, remove App.proposal.tsx and src/proposal/.
 *
 * WHAT IS DIFFERENT (from the Pinterest/Instagram benchmark research):
 *
 *   1. Apple guidance -- `add` is no longer a tab. Apple's position is that
 *      tabs are for navigation, not for taking action, and they moved an Add
 *      button out of the tab bar for that reason; Instagram did the same in
 *      2025-26, moving `+` to the header. Add is now the terracotta button in
 *      the header's left slot and opens as a modal. Four destinations remain,
 *      all of them places. Labels are kept -- NN/g and Apple both say icons
 *      need them, and Pinterest's unlabelled bar is the counter-example, not
 *      the model.
 *
 *   2. Chrome that yields on scroll -- on Closet and Fits, the dateline and
 *      its sub-row slide up and the tab bar slides down as you scroll down,
 *      both returning the instant you scroll up. The header floats over the
 *      scroll view rather than sitting above it in flow, so hiding it
 *      actually returns the space. Today is exempt: it does not scroll, so
 *      there is nothing to yield against.
 *
 *   3. Swipe between destinations -- a horizontal paging ScrollView, so the
 *      four destinations swipe as well as tap. No new dependency.
 *
 *   4. Save for later -- the bookmark in Today's commit row, surfaced under
 *      Fits > Saved with a count on the tab. Independent of accept/reject:
 *      saving a look you rejected today is a normal thing to do.
 *
 * WHAT IS DELIBERATELY UNCHANGED: every token, the type scale, the newspaper
 * dateline furniture, the card stack, the hotspots, the progress rail, the
 * detail sheet, the masonry, the status pill, the press-scale feel. The brief
 * was experience, not visual design.
 */
import { View } from "react-native";
import { ApolloProvider } from "@apollo/client/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apolloClient } from "./src/apollo/client";
import { useAppFonts } from "./src/theme/fonts";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { colour } from "./src/theme/tokens";
import { ChromeProvider } from "./src/proposal/ChromeContext";
import { LookVerdictsProvider } from "./src/proposal/LookVerdictsProvider";
import { SavedLooksProvider } from "./src/proposal/SavedLooksProvider";
import { SwipeShell } from "./src/proposal/SwipeShell";

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  // Same hold as App.tsx: the ground paper colour, never null, so the first
  // frame is not a platform-default white or black flash.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colour.paperAlt }} />;
  }

  return (
    <ApolloProvider client={apolloClient}>
      {/* Pinned to 'light' deliberately. The palette, surface tiers and
          elevation system are complete and verified, but the ~28 components
          that bake colours into StyleSheet.create have not been converted
          yet. Following the system here would show a half-themed app, which
          is worse than no dark mode. Change to "system" once the conversion
          pass is done. */}
      <ThemeProvider initial="light">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <SavedLooksProvider>
              <LookVerdictsProvider>
                <ChromeProvider>
                  <SwipeShell />
                </ChromeProvider>
              </LookVerdictsProvider>
            </SavedLooksProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    </ApolloProvider>
  );
}
