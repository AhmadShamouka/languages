import { apiRequest, uploadAudio, type Profile, type Streak } from './api';
import { localDay } from './day';

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

function tutorFields(mode: 'check' | 'chat', profile: Profile): Record<string, string> {
  return {
    mode,
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    level: profile.level,
    day: localDay(),
  };
}

export function checkSpeech(profile: Profile, utterance: Utterance, expected: string) {
  const fields = { ...tutorFields('check', profile), expected };
  if (utterance.audioUri) return uploadAudio<CheckResult>('/tutor', utterance.audioUri, fields);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (utterance.text) form.append('text', utterance.text);
  return apiRequest<CheckResult>('POST', '/tutor', form);
}

export function chatTurn(profile: Profile, utterance: Utterance, scenario: Scenario, history: ChatTurn[]) {
  const fields = {
    ...tutorFields('chat', profile),
    scenario: JSON.stringify(scenario),
    history: JSON.stringify(history),
  };
  if (utterance.audioUri) return uploadAudio<ChatResult>('/tutor', utterance.audioUri, fields);
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  if (utterance.text) form.append('text', utterance.text);
  return apiRequest<ChatResult>('POST', '/tutor', form);
}
