import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { LanguageCode } from '@/content/types';
import {
  ApiError,
  apiRequest,
  setAuthToken,
  type AuthResponse,
  type CompletedLesson,
  type MeResponse,
  type Profile,
  type Streak,
  type User,
} from './api';
import { localDay } from './day';
import { deviceLanguage } from './i18n';

const TOKEN_KEY = 'auth-token';

type Status = 'loading' | 'signedOut' | 'signedIn';

export interface ProfileInput {
  nativeLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  level?: string;
}

interface SessionValue {
  status: Status;
  user: User | null;
  profile: Profile | null;
  /** Lesson ids completed in the language currently being learned. */
  completed: ReadonlySet<string>;
  /** Language for app text: the learner's own language, or the device language before onboarding. */
  ui: LanguageCode;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (input: ProfileInput) => Promise<void>;
  completeLesson: (lessonId: string) => Promise<void>;
  updateStreak: (streak: Streak | null | undefined) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [completedLessons, setCompletedLessons] = useState<CompletedLesson[]>([]);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
    setProfile(null);
    setCompletedLessons([]);
    setStatus('signedOut');
  }, []);

  const loadMe = useCallback(async () => {
    const me = await apiRequest<MeResponse>('GET', '/me');
    setUser(me.user);
    setProfile(me.profile);
    setCompletedLessons(me.completedLessons);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        setStatus('signedOut');
        return;
      }
      setAuthToken(token);
      try {
        await loadMe();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
        } else {
          // Offline or server down: stay signed out rather than stuck on the splash screen.
          setAuthToken(null);
          setStatus('signedOut');
        }
      }
    })();
  }, [loadMe, clearSession]);

  const authenticate = useCallback(
    async (path: string, email: string, password: string) => {
      const result = await apiRequest<AuthResponse>('POST', path, { email: email.trim(), password });
      setAuthToken(result.token);
      await SecureStore.setItemAsync(TOKEN_KEY, result.token);
      await loadMe();
    },
    [loadMe]
  );

  const withAuth = useCallback(
    async <T,>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await clearSession();
        throw error;
      }
    },
    [clearSession]
  );

  const value = useMemo<SessionValue>(() => {
    const target = profile?.targetLanguage;
    return {
      status,
      user,
      profile,
      completed: new Set(completedLessons.filter((c) => c.language === target).map((c) => c.lessonId)),
      ui: profile?.nativeLanguage ?? deviceLanguage(),
      signIn: (email, password) => authenticate('/auth/login', email, password),
      signUp: (email, password) => authenticate('/auth/register', email, password),
      signOut: async () => {
        await apiRequest('POST', '/auth/logout').catch(() => undefined);
        await clearSession();
      },
      saveProfile: (input) =>
        withAuth(async () => {
          const result = await apiRequest<{ profile: Profile }>('PUT', '/profile', {
            level: profile?.level ?? 'A1',
            ...input,
          });
          setProfile(result.profile);
        }),
      completeLesson: (lessonId) =>
        withAuth(async () => {
          if (!target) return;
          const result = await apiRequest<{ streak: Streak | null }>('POST', '/progress/lessons', {
            language: target,
            lessonId,
            day: localDay(),
          });
          setCompletedLessons((current) =>
            current.some((c) => c.language === target && c.lessonId === lessonId)
              ? current
              : [...current, { language: target, lessonId }]
          );
          if (result.streak) {
            const streak = result.streak;
            setProfile((current) => (current ? { ...current, streak } : current));
          }
        }),
      updateStreak: (streak) => {
        if (streak) setProfile((current) => (current ? { ...current, streak } : current));
      },
    };
  }, [status, user, profile, completedLessons, authenticate, clearSession, withAuth]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

/** Session for screens that only render once onboarding is complete. */
export function useLearner() {
  const session = useSession();
  if (!session.profile) throw new Error('useLearner requires a completed profile');
  return { ...session, profile: session.profile };
}
