import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LanguagePicker } from '@/components/LanguagePicker';
import { Button, ErrorText, Heading, Screen, Title } from '@/components/ui';
import type { LanguageCode } from '@/content/types';
import { errorMessage } from '@/lib/errors';
import { deviceLanguage, t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { spacing } from '@/theme';

export default function OnboardingScreen() {
  const { saveProfile } = useSession();
  const [native, setNative] = useState<LanguageCode>(deviceLanguage());
  const [target, setTarget] = useState<LanguageCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseNative = (language: LanguageCode) => {
    setNative(language);
    if (target === language) setTarget(null);
  };

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await saveProfile({ nativeLanguage: native, targetLanguage: target, level: 'A1' });
    } catch (e) {
      setError(errorMessage(native, e));
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Title style={styles.title}>{t(native, 'onboardingTitle')}</Title>

      <View style={styles.section}>
        <Heading>{t(native, 'nativeQuestion')}</Heading>
        <LanguagePicker ui={native} value={native} onChange={chooseNative} />
      </View>

      <View style={styles.section}>
        <Heading>{t(native, 'targetQuestion')}</Heading>
        <LanguagePicker ui={native} value={target} onChange={setTarget} exclude={native} />
      </View>

      <ErrorText message={error} />
      <Button label={t(native, 'continue')} onPress={submit} disabled={!target} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xl },
  section: { gap: spacing.sm, marginVertical: spacing.sm },
});
