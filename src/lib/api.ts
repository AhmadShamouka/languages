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

export interface Profile {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level: string;
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
