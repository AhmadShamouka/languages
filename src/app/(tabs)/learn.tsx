import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Heading, Muted, ProgressBar, Screen, Title } from '@/components/ui';
import { allLessons, getCourse, localize } from '@/lib/course';
import { languageLabel, t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { colors, spacing } from '@/theme';

export default function LearnScreen() {
  const { profile, ui, completed } = useLearner();
  const target = profile.targetLanguage;
  const course = getCourse(target);
  const total = allLessons(target).length;

  return (
    <Screen>
      <Title>
        {languageLabel(ui, target)} · {course.level}
      </Title>
      <View style={styles.progress}>
        <Muted>{t(ui, 'lessonsDone', { done: completed.size, total })}</Muted>
        <ProgressBar value={completed.size / total} />
      </View>

      {course.units.map((unit, index) => (
        <Card key={unit.id}>
          <Muted>{t(ui, 'unit', { number: index + 1 })}</Muted>
          <Heading>{localize(unit.title, ui)}</Heading>
          {unit.lessons.map((lesson) => {
            const done = completed.has(lesson.id);
            return (
              <Pressable
                key={lesson.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })}
                style={({ pressed }) => [styles.lessonRow, pressed && styles.pressed]}>
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={done ? colors.success : colors.border}
                />
                <View style={styles.lessonText}>
                  <Text style={styles.lessonTitle}>{localize(lesson.title, ui)}</Text>
                  <Muted>{lesson.items.map((item) => item.text).slice(0, 3).join(' · ')}</Muted>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </Pressable>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.sm },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  lessonText: { flex: 1, gap: 2 },
  lessonTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
});
