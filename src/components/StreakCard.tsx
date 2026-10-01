import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import type { LanguageCode } from '@/content/types';
import type { Streak } from '@/lib/api';
import { activeStreak, practicedToday } from '@/lib/day';
import { t } from '@/lib/i18n';
import { colors, radius, spacing } from '@/theme';

export function StreakCard({ ui, streak }: { ui: LanguageCode; streak: Streak }) {
  const count = activeStreak(streak);
  const today = practicedToday(streak);
  const subtitle = count === 0 ? t(ui, 'streakNone') : today ? t(ui, 'streakToday') : t(ui, 'streakKeep');

  return (
    <View style={[styles.card, today && styles.cardActive]}>
      <Ionicons name="flame" size={36} color={count > 0 ? colors.warning : colors.border} />
      <View style={styles.text}>
        <Text style={styles.count}>{t(ui, 'streakDays', { count })}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardActive: { backgroundColor: '#FFF7E6', borderColor: '#FDE3B0' },
  text: { flex: 1, gap: 2 },
  count: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted },
});
