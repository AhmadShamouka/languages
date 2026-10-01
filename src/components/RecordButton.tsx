import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function RecordButton({
  recording,
  busy,
  label,
  onPress,
  size = 84,
}: {
  recording: boolean;
  busy?: boolean;
  label?: string;
  onPress: () => void;
  size?: number;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          { width: size, height: size, borderRadius: size / 2 },
          recording && styles.recording,
          busy && styles.busy,
          pressed && styles.pressed,
        ]}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Ionicons name={recording ? 'stop' : 'mic'} size={size * 0.42} color="#fff" />
        )}
      </Pressable>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  button: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  recording: { backgroundColor: colors.danger },
  busy: { backgroundColor: colors.muted },
  pressed: { opacity: 0.85 },
  label: { color: colors.muted, fontSize: 14 },
});
