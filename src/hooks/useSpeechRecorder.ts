import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { stopReplyAudio } from '@/lib/audio';

const MAX_SECONDS = 30;

/**
 * Records one utterance at a time. `onFinished` receives the file URI when the learner
 * stops, or when the recording hits the length limit.
 */
export function useSpeechRecorder(onFinished: (uri: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 250);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const stoppingRef = useRef(false);

  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);
    Speech.stop();
    stopReplyAudio();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      await recorder.stop();
      // Leaving recording mode sends playback back to the loudspeaker on iOS.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      if (recorder.uri) onFinishedRef.current(recorder.uri);
    } finally {
      stoppingRef.current = false;
    }
  }, [recorder]);

  useEffect(() => {
    if (state.isRecording && state.durationMillis >= MAX_SECONDS * 1000) void stop();
  }, [state.isRecording, state.durationMillis, stop]);

  return {
    isRecording: state.isRecording,
    seconds: Math.floor(state.durationMillis / 1000),
    permissionDenied,
    start,
    stop,
  };
}
