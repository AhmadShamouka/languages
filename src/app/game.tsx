import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Body, Button, Card, Muted, Screen, Title } from '@/components/ui';
import { allLessons, localize, writingDirection } from '@/lib/course';
import { t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { colors, radius, spacing } from '@/theme';

const ROUNDS = 5;

interface Round {
  prompt: string;
  answer: string;
  choices: string[];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeRounds(target: ReturnType<typeof useLearner>['profile']['targetLanguage'], ui: ReturnType<typeof useLearner>['ui']): Round[] {
  const items = allLessons(target).flatMap((ref) => ref.lesson.items);
  return shuffle(items)
    .slice(0, ROUNDS)
    .map((item) => {
      const answer = localize(item.gloss, ui);
      const others = shuffle(items.filter((candidate) => localize(candidate.gloss, ui) !== answer)).slice(0, 3);
      return {
        prompt: item.text,
        answer,
        choices: shuffle([answer, ...others.map((candidate) => localize(candidate.gloss, ui))]),
      };
    });
}

export default function GameScreen() {
  const { profile, ui } = useLearner();
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => makeRounds(profile.targetLanguage, ui), [profile.targetLanguage, ui, seed]);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);

  const round = rounds[index];
  const finished = index >= rounds.length;

  const choose = (choice: string) => {
    if (picked || !round) return;
    setPicked(choice);
    if (choice === round.answer) setScore((current) => current + 1);
  };

  const restart = () => {
    setIndex(0);
    setScore(0);
    setPicked(null);
    setSeed((current) => current + 1);
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t(ui, 'gameTitle'), headerShown: true }} />
      <Title>{t(ui, 'gameTitle')}</Title>
      {finished || !round ? (
        <Card>
          <Body>{t(ui, 'gameScore', { score, total: rounds.length })}</Body>
          <Button label={t(ui, 'gameAgain')} onPress={restart} />
        </Card>
      ) : (
        <Card>
          <Muted>
            {t(ui, 'itemOf', { current: index + 1, total: rounds.length })} · {t(ui, 'gamePrompt')}
          </Muted>
          <Text style={[styles.prompt, { writingDirection: writingDirection(profile.targetLanguage) }]}>{round.prompt}</Text>
          {round.choices.map((choice, choiceIndex) => {
            const correct = picked !== null && choice === round.answer;
            const wrong = picked === choice && choice !== round.answer;
            return (
              <Pressable
                key={`${choiceIndex}-${choice}`}
                accessibilityRole="button"
                disabled={picked !== null}
                onPress={() => choose(choice)}
                style={[styles.choice, correct && styles.good, wrong && styles.bad]}>
                <Text style={styles.choiceText}>{choice}</Text>
              </Pressable>
            );
          })}
          {picked && (
            <Button
              label={index + 1 === rounds.length ? t(ui, 'finish') : t(ui, 'next')}
              onPress={() => {
                setPicked(null);
                setIndex((current) => current + 1);
              }}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', marginVertical: spacing.sm },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.background,
  },
  choiceText: { fontSize: 16, color: colors.text },
  good: { backgroundColor: colors.successSoft, borderColor: colors.success },
  bad: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
});
