import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { errorMessage } from '@/lib/errors';
import { t } from '@/lib/i18n';
import { useSession } from '@/lib/session';
import { colors, radius, spacing } from '@/theme';

export default function SignInScreen() {
  const { ui, signIn, signUp } = useSession();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await (mode === 'signIn' ? signIn : signUp)(email, password);
    } catch (e) {
      setError(errorMessage(ui, e));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Title>{t(ui, 'appName')}</Title>
          <Body style={styles.tagline}>{t(ui, 'tagline')}</Body>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t(ui, 'email')}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder={t(ui, 'password')}
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
          />
          {mode === 'signUp' && <Muted>{t(ui, 'passwordHint')}</Muted>}
          <ErrorText message={error} />
          <Button
            label={t(ui, mode === 'signIn' ? 'signIn' : 'signUp')}
            onPress={submit}
            loading={busy}
            disabled={!email || !password}
          />
          <Button
            variant="ghost"
            label={t(ui, mode === 'signIn' ? 'noAccount' : 'haveAccount')}
            onPress={() => {
              setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              setError(null);
            }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { marginTop: spacing.xl * 2, gap: spacing.sm },
  tagline: { color: colors.muted },
  form: { marginTop: spacing.xl, gap: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
});
