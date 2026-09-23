/**
 * The message field + send button, docked above the tab bar.
 */
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { colour, radius } from '../../theme/tokens';
import { shadow } from '../../theme/shadows';
import { font } from '../../theme/typography';
import { IconButton } from '../primitives/Pill';

export function AskInput({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState('');

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
  };

  return (
    <View style={styles.row}>
      <View style={[styles.field, shadow('soft')]}>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Ask for a look…"
          placeholderTextColor={colour.inkA(0.5)}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={submit}
          multiline={false}
        />
      </View>
      <IconButton
        icon="arrow-up"
        size={48}
        iconSize={19}
        background={colour.brand}
        color={colour.paperAlt}
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  field: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colour.paperAlt,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: {
    fontFamily: font.body,
    fontSize: 13,
    color: colour.ink,
    padding: 0,
  },
});
