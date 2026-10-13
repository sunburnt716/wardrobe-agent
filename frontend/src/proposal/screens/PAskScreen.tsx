/**
 * PROPOSAL ONLY. Ask, with the look-card handoff done through the shell
 * instead of React Navigation.
 *
 * The shipped AskScreen calls useNavigation() and does
 * `navigation.navigate('today', { look: outfitId })`. This proposal replaced
 * the navigator with a paging ScrollView, so there is no navigation object to
 * find -- hence the prop. Everything else (thread, suggestion pills, input,
 * the "Thinking…" pill) is the shipped component, untouched.
 *
 * Worth noting: the shipped handoff passes `{ look: outfitId }` as a route
 * param that TodayScreen never reads, so tapping "Open in Today" currently
 * lands on Today without selecting the look. Here the id is carried through
 * the shell and PTodayScreen actually selects it, so the handoff completes.
 */
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { colour } from '../../theme/tokens';
import { DatelineHeader } from '../../components/layout/DatelineHeader';
import { ScreenScaffold } from '../../components/layout/ScreenScaffold';
import { AskInput } from '../../components/ask/AskInput';
import { ChatThread } from '../../components/ask/ChatThread';
import { SuggestionPills } from '../../components/ask/SuggestionPills';
import { useAsk } from '../../data/useAsk';
import { MOCK_TODAY_DATE } from '../../data/mock';

export function PAskScreen({
  onOpenLook,
}: {
  onOpenLook: (outfitId: string) => void;
}) {
  const { messages, suggestions, thinking, send } = useAsk();

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
          <ChatThread messages={messages} onOpenLook={onOpenLook} />
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
