import type { Streak } from './api';

/** The device's local calendar day as YYYY-MM-DD. */
export function localDay(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localDay(date);
}

/** A streak only counts while its last practice was today or yesterday. */
export function activeStreak(streak: Streak | undefined): number {
  if (!streak?.lastDate) return 0;
  return streak.lastDate === localDay() || streak.lastDate === yesterday() ? streak.count : 0;
}

export function practicedToday(streak: Streak | undefined): boolean {
  return streak?.lastDate === localDay();
}
