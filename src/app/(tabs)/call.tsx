import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecordButton } from '@/components/RecordButton';
import { Body, Button, Card, ErrorText, Muted, Screen, Title } from '@/components/ui';
import { useSpeechRecorder } from '@/hooks/useSpeechRecorder';
import { playClipAudio, stopAllAudio } from '@/lib/audio';
import { joinCall, leaveCall, pollCall, uploadCallClip, type CallState } from '@/lib/calls';
import { errorMessage } from '@/lib/errors';
import { languageLabel, t } from '@/lib/i18n';
import { useLearner } from '@/lib/session';
import { spacing } from '@/theme';

const EMPTY: CallState = { status: 'idle', call: null, clips: [] };

export default function CallScreen() {
  const { profile, ui } = useLearner();
  const [state, setState] = useState<CallState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const afterRef = useRef(0);
  const callIdRef = useRef<number | null>(null);
  const playedRef = useRef(new Set<number>());

  const apply = useCallback((next: CallState) => {
    if (next.call) callIdRef.current = next.call.id;
    if (next.status === 'idle') callIdRef.current = null;
    setSecondsLeft(next.call?.secondsLeft ?? 0);
    for (const clip of next.clips) {
      afterRef.current = Math.max(afterRef.current, clip.id);
      if (!playedRef.current.has(clip.id)) {
        playedRef.current.add(clip.id);
        playClipAudio(clip.audioBase64, clip.extension);
      }
    }
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    const next = await pollCall(afterRef.current, callIdRef.current);
    apply(next);
  }, [apply]);

  const searching = state.status === 'waiting' || state.status === 'matched';

  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => {
      refresh().catch((e) => setError(errorMessage(ui, e)));
    }, 2000);
    return () => clearInterval(timer);
  }, [searching, refresh, ui]);

  useEffect(() => {
    if (state.status !== 'matched') return;
    const timer = setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [state.status, state.call?.id]);

  useEffect(() => stopAllAudio, []);

  const recorder = useSpeechRecorder(async (uri) => {
    setBusy(true);
    setError(null);
    try {
      await uploadCallClip(uri);
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setBusy(false);
    }
  }, 20);

  const findPartner = async () => {
    setBusy(true);
    setError(null);
    afterRef.current = 0;
    playedRef.current.clear();
    try {
      apply(await joinCall());
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setBusy(false);
    }
  };

  const hangUp = async () => {
    if (recorder.isRecording) await recorder.stop();
    setBusy(true);
    try {
      await leaveCall();
      callIdRef.current = null;
      setState(EMPTY);
    } catch (e) {
      setError(errorMessage(ui, e));
    } finally {
      setBusy(false);
    }
  };

  const language = languageLabel(ui, profile.targetLanguage);

  return (
    <Screen>
      <Title>{t(ui, 'tabCall')}</Title>
      <Muted>
        {language} · {profile.level}
      </Muted>

      {state.status === 'idle' && (
        <Card>
          <Body>{t(ui, 'callWaiting')}</Body>
          <Button label={t(ui, 'findPartner')} onPress={findPartner} loading={busy} />
        </Card>
      )}

      {state.status === 'waiting' && (
        <Card>
          <Body>{t(ui, 'searchingCall', { language, level: profile.level })}</Body>
          <Muted>{t(ui, 'callWaiting')}</Muted>
          <Button variant="secondary" label={t(ui, 'leaveCall')} onPress={hangUp} loading={busy} />
        </Card>
      )}

      {state.status === 'matched' && state.call && (
        <Card>
          <Body>{t(ui, 'inCall')}</Body>
          <Muted>{t(ui, 'callWith', { language: languageLabel(ui, state.call.language), level: state.call.level })}</Muted>
          <Muted>{t(ui, 'callEnds', { seconds: secondsLeft })}</Muted>
          <RecordButton
            recording={recorder.isRecording}
            busy={busy}
            label={recorder.isRecording ? `${t(ui, 'tapToStop')} · ${recorder.seconds}s` : t(ui, 'tapToSpeak')}
            onPress={recorder.isRecording ? recorder.stop : recorder.start}
          />
          {recorder.permissionDenied && <ErrorText message={t(ui, 'micDenied')} />}
          <Button variant="secondary" label={t(ui, 'leaveCall')} onPress={hangUp} />
        </Card>
      )}

      {state.status === 'ended' && (
        <Card>
          <Body>{t(ui, 'callEnded')}</Body>
          <Button label={t(ui, 'findPartner')} onPress={findPartner} loading={busy} />
        </Card>
      )}

      <ErrorText message={error} />
      <View style={styles.ad}>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  ad: { marginTop: spacing.sm },
});
