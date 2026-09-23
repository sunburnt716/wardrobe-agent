/**
 * The scrolling conversation. Sticks to the bottom as messages arrive.
 */
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { ChatMessage } from '../../data/types';
import { Bubble } from './Bubble';
import { LookCardMessage } from './LookCardMessage';

export function ChatThread({
  messages,
  onOpenLook,
}: {
  messages: ChatMessage[];
  onOpenLook: (outfitId: string) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [messages.length]);

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {messages.map((m) => (
        <View key={m.id} style={styles.row}>
          <Bubble role={m.role} text={m.text} />
          {m.lookCard ? (
            <View style={styles.card}>
              <LookCardMessage card={m.lookCard} onOpen={onOpenLook} />
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 12,
  },
  row: {
    gap: 12,
  },
  card: {
    marginTop: -2,
  },
});
