import type { LanguageCode } from '@/content/types';
import { ApiError } from './api';
import { t, type StringKey } from './i18n';

const codeMessages: Record<string, StringKey> = {
  network: 'errorNetwork',
  nothing_heard: 'errorNothingHeard',
  daily_limit: 'errorDailyLimit',
  call_ended: 'callEnded',
  invalid_credentials: 'errorCredentials',
  email_taken: 'errorEmailTaken',
};

/** A message for the learner in their own language, falling back to the server's text. */
export function errorMessage(ui: LanguageCode, error: unknown): string {
  if (error instanceof ApiError) {
    const key = codeMessages[error.code];
    if (key) return t(ui, key);
    if (
      error.status === 422 ||
      error.code === 'not_configured' ||
      error.code === 'ai_not_configured' ||
      error.code === 'ai_failed' ||
      error.code === 'purchase_invalid' ||
      error.code === 'billing_not_configured' ||
      error.code === 'reward_limit'
    ) {
      return error.message;
    }
  }
  return t(ui, 'errorGeneric');
}
