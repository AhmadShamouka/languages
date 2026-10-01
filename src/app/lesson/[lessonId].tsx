import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RecordButton } from '@/components/RecordButton';
import { Body, Button, Card, Centered, ErrorText, Muted, ProgressBar, Screen, Title } from '@/components/ui';
import { useSpeechRecorder } from '@/hooks/useSpeechRecorder';
import { speak, stopAllAudio } from '@/lib/audio';
import { findLesson, localize } from '@/lib/course';
import { errorMessage } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { checkSpeech, type CheckResult } from '@/lib/tutor';
import { colors, radius, spacing } from '@/theme';

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { profile, ui, completeLesson, updateStreak } = useLearner();
  const ref = findLesson(profile.targetLanguage, lessonId);

  const [index, setIndex] = useState(0);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const items = ref?.lesson.items ?? [];
  const item = items[index];
  const isLast = index === items.length - 1;

  const recorder = useSpeechRecorder(async (uri) => {
    if (!item) return;
    setChecking(true);
    setError(null);
    try {
      const response = await checkSpeech(profile, { audioUri: uri }, item.text);
      setResult(response);
      updateStreak(response.streak);
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setChecking(false);
    }
  });

  useEffect(() => {
    if (item && !finished) speak(item.text, profile.targetLanguage);
  }, [item, finished, profile.targetLanguage]);

  useEffect(() => stopAllAudio, []);

  if (!ref || !item) {
    return (
      <Centered>
        <Body>{t(ui, 'errorGeneric')}</Body>
        <Button label={t(ui, 'backToLessons')} onPress={() => router.back()} />
      </Centered>
    );
  }

  const advance = async () => {
    if (recorder.isRecording) await recorder.stop();
    setResult(null);
    setError(null);
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    setSaving(true);
    try {
      await completeLesson(ref.lesson.id);
      setFinished(true);
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setSaving(false);
    }
  };

  if (finished) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.complete}>
          <Ionicons name="trophy" size={72} color={colors.warning} />
          <Title style={styles.center}>{t(ui, 'lessonComplete')}</Title>
          <Body style={styles.center}>{t(ui, 'lessonCompleteBody')}</Body>
          <Card style={styles.goalCard}>
            <Muted>{t(ui, 'goal')}</Muted>
            <Body>{localize(ref.lesson.rolePlay.goal, ui)}</Body>
          </Card>
          <Button
            label={t(ui, 'practiceRolePlay')}
            onPress={() => router.replace({ pathname: '/speak', params: { lessonId: ref.lesson.id } })}
          />
          <Button variant="secondary" label={t(ui, 'backToLessons')} onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const recordLabel = checking
    ? t(ui, 'checking')
    : recorder.isRecording
      ? `${t(ui, 'tapToStop')} · ${recorder.seconds}s`
      : t(ui, 'tapToSpeak');

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: localize(ref.lesson.title, ui) }} />
      <View style={styles.progressRow}>
        <View style={styles.fill}>
          <ProgressBar value={(index + (result?.correct ? 1 : 0)) / items.length} />
        </View>
        <Muted>{t(ui, 'itemOf', { current: index + 1, total: items.length })}</Muted>
      </View>

      <Card style={styles.itemCard}>
        <Text style={styles.kind}>{t(ui, item.kind)}</Text>
        <Muted style={styles.center}>{localize(item.prompt, ui)}</Muted>
        <Text style={styles.itemText}>{item.text}</Text>
        <Body style={[styles.center, styles.gloss]}>{localize(item.gloss, ui)}</Body>
        <Button
          variant="secondary"
          label={t(ui, 'listen')}
          onPress={() => speak(item.text, profile.targetLanguage)}
          style={styles.listen}
        />
      </Card>

      <RecordButton
        recording={recorder.isRecording}
        busy={checking}
        label={recordLabel}
        onPress={recorder.isRecording ? recorder.stop : recorder.start}
      />
      {recorder.permissionDenied && <ErrorText message={t(ui, 'micDenied')} />}
      <ErrorText message={error} />

      {result && (
        <View style={[styles.result, result.correct ? styles.resultGood : styles.resultBad]}>
          <Muted>{t(ui, 'weHeard')}</Muted>
          <Body style={styles.heard}>“{result.transcript}”</Body>
          <Body style={{ color: result.correct ? colors.success : colors.danger, fontWeight: '600' }}>
            {result.correct ? t(ui, 'correct') : t(ui, 'tryAgain')}
          </Body>
          {result.feedback ? <Body>{result.feedback}</Body> : null}
        </View>
      )}

      <View style={styles.footer}>
        <Button variant="ghost" label={t(ui, 'skip')} onPress={advance} style={styles.fill} disabled={saving} />
        <Button
          label={isLast ? t(ui, 'finish') : t(ui, 'next')}
          onPress={advance}
          disabled={!result || checking}
          loading={saving}
          style={styles.fill}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { textAlign: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemCard: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.md },
  kind: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  itemText: { fontSize: 30, fontWeight: '700', color: colors.text, textAlign: 'center' },
  gloss: { color: colors.muted },
  listen: { alignSelf: 'stretch' },
  result: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  resultGood: { backgroundColor: colors.successSoft },
  resultBad: { backgroundColor: colors.dangerSoft },
  heard: { fontStyle: 'italic' },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  complete: { gap: spacing.md, alignItems: 'stretch', marginTop: spacing.xl },
  goalCard: { marginVertical: spacing.sm },
});
