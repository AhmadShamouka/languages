import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { File, Paths } from 'expo-file-system';

import type { LanguageCode } from '@/content/types';
import { SPEECH_LOCALES } from './course';

/** Model pronunciation with the device's built-in voice, so lessons work offline. */
export function speak(text: string, language: LanguageCode, rate = 0.85) {
  Speech.stop();
  stopReplyAudio();
  Speech.speak(text, { language: SPEECH_LOCALES[language], rate });
}

let replyPlayer: AudioPlayer | null = null;
let replyFile: File | null = null;

/** Plays the tutor's MP3 reply returned by the API as base64. */
export function playReplyAudio(base64: string) {
  Speech.stop();
  stopReplyAudio();
  replyFile?.delete();

  const file = new File(Paths.cache, `tutor-reply-${Date.now()}.wav`);
  file.create();
  file.write(base64, { encoding: 'base64' });
  replyFile = file;

  if (!replyPlayer) replyPlayer = createAudioPlayer(null);
  replyPlayer.replace({ uri: file.uri });
  replyPlayer.play();
}

/** Plays a short voice clip from a call, sent by the API as base64. */
export function playClipAudio(base64: string, extension: string) {
  Speech.stop();
  stopReplyAudio();
  replyFile?.delete();

  const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'm4a';
  const file = new File(Paths.cache, `call-clip-${Date.now()}.${safeExtension}`);
  file.create();
  file.write(base64, { encoding: 'base64' });
  replyFile = file;

  if (!replyPlayer) replyPlayer = createAudioPlayer(null);
  replyPlayer.replace({ uri: file.uri });
  replyPlayer.play();
}

export function stopReplyAudio() {
  replyPlayer?.pause();
}

export function stopAllAudio() {
  Speech.stop();
  stopReplyAudio();
}
