import { View } from 'react-native';
import { ApolloProvider } from '@apollo/client/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { apolloClient } from './src/apollo/client';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppFonts } from './src/theme/fonts';
import { colour } from './src/theme/tokens';

export default function App() {
  const [fontsLoaded, fontError] = useAppFonts();

  // Hold on the ground paper colour rather than returning null — null
  // renders the platform default (white on iOS, black on Android), so the
  // first frame would flash a colour that isn't in the palette.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: colour.paperAlt }} />;
  }

  // TODO(human): decide what happens when `fontError` is non-null.
  //
  // Right now execution just falls through to the normal render, so a font
  // that fails to parse means every `fontFamily` silently resolves to the
  // system sans-serif — the app looks wrong but still works. Decide whether
  // that is the behaviour you want, or something louder.

  return (
    <ApolloProvider client={apolloClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ApolloProvider>
  );
}
