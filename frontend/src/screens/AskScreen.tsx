/**
 * Ask — the stylist conversation. The status pill shows "Thinking…" while a
 * reply is pending. A reply can carry an openable look card that hands off
 * to Today.
 */
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { colour } from '../theme/tokens';
import { DatelineHeader } from '../components/layout/DatelineHeader';
import { ScreenScaffold } from '../components/layout/ScreenScaffold';
import { AskInput } from '../components/ask/AskInput';
import { ChatThread } from '../components/ask/ChatThread';
import { SuggestionPills } from '../components/ask/SuggestionPills';
import { useAsk } from '../data/useAsk';
import { MOCK_TODAY_DATE } from '../data/mock';
import type { RootTabParamList } from '../navigation/RootNavigator';

export function AskScreen() {
  const { messages, suggestions, thinking, send } = useAsk();
  const navigation =
    useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const openLook = (outfitId: string) => {
    navigation.navigate('today', { look: outfitId });
  };

  return (
    <ScreenScaffold
      wash={colour.washAsk}
      pillIcon="sparkle"
      pillLabel={thinking ? 'Thinking…' : 'Stylist'}
    >
      <DatelineHeader
        left={MOCK_TODAY_DATE}
        center="Ask"
        rightIcon="dots-three"
      />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.thread}>
          <ChatThread messages={messages} onOpenLook={openLook} />
        </View>
        <SuggestionPills suggestions={suggestions} onPick={send} />
        <AskInput onSend={send} />
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  thread: { flex: 1 },
});
