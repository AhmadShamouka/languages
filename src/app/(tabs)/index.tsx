import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StreakCard } from '@/components/StreakCard';
import { Body, Button, Card, Heading, Muted, ProgressBar, Screen, Title } from '@/components/ui';
import { allLessons, localize, nextLesson } from '@/lib/course';
import { languageLabel, t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const { profile, ui, completed } = useLearner();
  const target = profile.targetLanguage;
  const total = allLessons(target).length;
  const next = nextLesson(target, completed);

  return (
    <Screen>
      <View style={styles.header}>
        <Title>{t(ui, 'hello')}</Title>
        <Muted>
          {t(ui, 'learning', { language: languageLabel(ui, target) })} · {profile.level}
        </Muted>
      </View>

      <StreakCard ui={ui} streak={profile.streak} />

      <Card>
        <Muted>{t(ui, 'lessonsDone', { done: completed.size, total })}</Muted>
        <ProgressBar value={completed.size / total} />
      </Card>

      <Card>
        {next ? (
          <>
            <Muted>
              {t(ui, 'upNext')} · {t(ui, 'unit', { number: next.unitNumber })} · {localize(next.unit.title, ui)}
            </Muted>
            <Heading>{localize(next.lesson.title, ui)}</Heading>
            <Body>{next.lesson.items.map((item) => item.text).join(' · ')}</Body>
            <Button
              label={t(ui, 'startLesson')}
              onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: next.lesson.id } })}
            />
          </>
        ) : (
          <Body>{t(ui, 'allDone')}</Body>
        )}
      </Card>

      <Button variant="secondary" label={t(ui, 'playGame')} onPress={() => router.push('/game')} />
      <Button variant="secondary" label={t(ui, 'findPartner')} onPress={() => router.navigate('/call')} />
      <Button variant="secondary" label={t(ui, 'practiceSpeaking')} onPress={() => router.navigate('/speak')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs, marginTop: spacing.sm },
});
