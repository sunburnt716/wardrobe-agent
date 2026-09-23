/**
 * A chat bubble. User bubbles are terracotta and right-aligned with a
 * squared bottom-right corner; agent replies are paper and mirrored.
 */
import { StyleSheet, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import { AppText } from '../primitives/AppText';

export function Bubble({
  role,
  text,
}: {
  role: 'user' | 'agent';
  text: string;
}) {
  const isUser = role === 'user';
  return (
    <View
      style={[
        styles.base,
        shadow('soft'),
        isUser ? styles.user : styles.agent,
      ]}
    >
      <AppText
        variant="bubble"
        style={{ color: isUser ? colour.paperAlt : colour.ink }}
      >
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    maxWidth: '82%',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '78%',
    backgroundColor: colour.brand,
    borderRadius: radius.bubble,
    borderBottomRightRadius: 6,
  },
  agent: {
    alignSelf: 'flex-start',
    backgroundColor: colour.paperAlt,
    borderRadius: radius.bubble,
    borderBottomLeftRadius: 6,
  },
});
