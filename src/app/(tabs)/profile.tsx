import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { StreakCard } from '@/components/StreakCard';
import { Body, Button, Card, ErrorText, Heading, Muted, Screen, Title } from '@/components/ui';
import type { LanguageCode } from '@/content/types';
import { allLessons } from '@/lib/course';
import { errorMessage } from '@/lib/errors';
import { t, type StringKey } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { spacing } from '@/theme';

export default function ProfileScreen() {
  const { user, profile, ui, completed, saveProfile, signOut } = useLearner();
  const [native, setNative] = useState<LanguageCode>(profile.nativeLanguage);
  const [target, setTarget] = useState<LanguageCode | null>(profile.targetLanguage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changed = native !== profile.nativeLanguage || target !== profile.targetLanguage;

  const chooseNative = (language: LanguageCode) => {
    setNative(language);
    setSaved(false);
    if (target === language) setTarget(null);
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ nativeLanguage: native, targetLanguage: target });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>{t(ui, 'profileTitle')}</Title>
      <Muted>{user?.email}</Muted>

      <StreakCard ui={ui} streak={profile.streak} />

      <Card>
        <Heading>{t(ui, 'yourPlan')}</Heading>
        <Body>{t(ui, planLabel(profile.plan))}</Body>
        {profile.plan !== 'free' && profile.planExpiresAt ? (
          <Muted>{t(ui, 'planActive', { date: profile.planExpiresAt.slice(0, 10) })}</Muted>
        ) : (
          <Muted>{t(ui, 'planFreeBody')}</Muted>
        )}
        <Button label={t(ui, 'seePlans')} onPress={() => router.push('/plans')} />
      </Card>

      <Card>
        <View style={styles.statRow}>
          <Muted>{t(ui, 'level')}</Muted>
          <Body style={styles.stat}>{profile.level}</Body>
        </View>
        <View style={styles.statRow}>
          <Muted>{t(ui, 'tabLearn')}</Muted>
          <Body style={styles.stat}>
            {t(ui, 'lessonsDone', { done: completed.size, total: allLessons(profile.targetLanguage).length })}
          </Body>
        </View>
      </Card>

      <Card>
        <Heading>{t(ui, 'nativeLanguage')}</Heading>
        <LanguagePicker ui={ui} value={native} onChange={chooseNative} />
        <Heading style={styles.spaced}>{t(ui, 'targetLanguage')}</Heading>
        <LanguagePicker
          ui={ui}
          value={target}
          onChange={(language) => {
            setTarget(language);
            setSaved(false);
          }}
          exclude={native}
        />
        <ErrorText message={error} />
        <Button
          label={saved && !changed ? t(ui, 'saved') : t(ui, 'save')}
          onPress={save}
          disabled={!changed || !target}
          loading={saving}
          style={styles.spaced}
        />
      </Card>

      <Button variant="ghost" label={t(ui, 'signOut')} onPress={signOut} />
    </Screen>
  );
}

function planLabel(plan: string): StringKey {
  if (plan === 'day') return 'planDay';
  if (plan === 'week') return 'planWeek';
  if (plan === 'month') return 'planMonth';
  if (plan === 'year') return 'planYear';
  return 'planFree';
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stat: { fontWeight: '600' },
  spaced: { marginTop: spacing.sm },
});
