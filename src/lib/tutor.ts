import { localDay } from './day';
import { apiRequest, type Profile, type Streak } from './api';

export interface Utterance {
  audioUri?: string;
  text?: string;
}

export interface CheckResult {
  transcript: string;
  correct: boolean;
  feedback: string | null;
  streak: Streak | null;
}

export interface ChatResult {
  transcript: string;
  reply: string;
  translation: string | null;
  correction: string | null;
  audioBase64: string | null;
  streak: Streak | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Scenario {
  topic: string;
  goal: string;
}

const AUDIO_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
};

function tutorForm(mode: 'check' | 'chat', profile: Profile, utterance: Utterance): FormData {
  const form = new FormData();
  form.append('mode', mode);
  form.append('targetLanguage', profile.targetLanguage);
  form.append('nativeLanguage', profile.nativeLanguage);
  form.append('level', profile.level);
  form.append('day', localDay());
  if (utterance.audioUri) {
    const extension = utterance.audioUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'm4a';
    const type = AUDIO_TYPES[extension] ?? 'audio/mp4';
    // React Native's FormData accepts a file descriptor object in place of a Blob.
    form.append('audio', { uri: utterance.audioUri, name: `speech.${extension}`, type } as unknown as Blob);
  } else if (utterance.text) {
    form.append('text', utterance.text);
  }
  return form;
}

export function checkSpeech(profile: Profile, utterance: Utterance, expected: string) {
  const form = tutorForm('check', profile, utterance);
  form.append('expected', expected);
  return apiRequest<CheckResult>('POST', '/tutor', form);
}

export function chatTurn(profile: Profile, utterance: Utterance, scenario: Scenario, history: ChatTurn[]) {
  const form = tutorForm('chat', profile, utterance);
  form.append('scenario', JSON.stringify(scenario));
  form.append('history', JSON.stringify(history));
  return apiRequest<ChatResult>('POST', '/tutor', form);
}
