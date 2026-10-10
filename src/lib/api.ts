import { File, Paths, UploadType } from 'expo-file-system';

import type { LanguageCode } from '@/content/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '') ?? '';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export interface Streak {
  count: number;
  lastDate: string | null;
}

export type PlanId = 'free' | 'day' | 'week' | 'month' | 'year';

export interface Profile {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level: string;
  plan: PlanId;
  planExpiresAt: string | null;
  ads: boolean;
  callSeconds: number;
  streak: Streak;
}

export interface User {
  id: number;
  email: string;
}

export interface CompletedLesson {
  language: LanguageCode;
  lessonId: string;
}

export interface MeResponse {
  user: User;
  profile: Profile | null;
  completedLessons: CompletedLesson[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiRequest<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: object | FormData): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'not_configured', 'EXPO_PUBLIC_API_URL is not set. See README.md.');
  }

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, 'network', 'Network request failed.');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(response.status, error?.code ?? 'server_error', error?.message ?? `Request failed (${response.status}).`);
  }
  return data as T;
}

const AUDIO_TYPES: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
};

function parseBody(status: number, body: string) {
  const data = body ? (JSON.parse(body) as { error?: { code?: string; message?: string } }) : null;
  if (status < 200 || status >= 300) {
    throw new ApiError(status, data?.error?.code ?? 'server_error', data?.error?.message ?? `Request failed (${status}).`);
  }
  return data;
}

/**
 * Uploads a recording with the native file uploader. React Native's fetch
 * reports a failed file upload as a network error even when the server is up.
 */
export async function uploadAudio<T>(path: string, audioUri: string, fields: Record<string, string>): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, 'not_configured', 'EXPO_PUBLIC_API_URL is not set. See README.md.');
  }

  const bare = audioUri.split('?')[0];
  const ext = bare.split('.').pop()?.toLowerCase() ?? '';
  const extension = ext in AUDIO_TYPES ? ext : 'm4a';
  const normalized = /^[a-z][a-z0-9+.-]*:/i.test(audioUri) ? audioUri : `file://${audioUri}`;
  const source = new File(normalized);
  const dest = new File(Paths.cache, `speech-${Date.now()}.${extension}`);

  try {
    if (!source.exists) {
      throw new ApiError(422, 'upload_failed', 'The recording could not be read. Try again.');
    }
    await source.copy(dest);
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (authToken) headers.Authorization = `Bearer ${authToken}`;
    const result = await dest.upload(`${API_URL}${path}`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'audio',
      mimeType: AUDIO_TYPES[extension],
      headers,
      parameters: fields,
    });
    return parseBody(result.status, result.body) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof SyntaxError) {
      throw new ApiError(502, 'server_error', 'The server sent an unreadable response.');
    }
    throw new ApiError(0, 'network', 'Network request failed.');
  } finally {
    if (dest.exists) dest.delete();
  }
}
