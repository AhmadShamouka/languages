import type { LanguageCode } from '@/content/types';
import { apiRequest, uploadAudio } from './api';

export interface CallClip {
  id: number;
  extension: string;
  audioBase64: string;
}

export interface CallInfo {
  id: number;
  language: LanguageCode;
  level: string;
  secondsLeft: number;
}

export interface CallState {
  status: 'idle' | 'waiting' | 'matched' | 'ended';
  call: CallInfo | null;
  clips: CallClip[];
}

export function joinCall() {
  return apiRequest<CallState>('POST', '/calls/join');
}

export function pollCall(after: number, callId: number | null) {
  const call = callId ? `&call=${callId}` : '';
  return apiRequest<CallState>('GET', `/calls?after=${after}${call}`);
}

export function leaveCall() {
  return apiRequest<{ ok: boolean }>('POST', '/calls/leave');
}

export function uploadCallClip(audioUri: string) {
  return uploadAudio<{ id: number }>('/calls/clips', audioUri, {});
}
