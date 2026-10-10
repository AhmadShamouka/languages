import ar from '@/content/ar/a1.json';
import de from '@/content/de/a1.json';
import en from '@/content/en/a1.json';
import fr from '@/content/fr/a1.json';
import it from '@/content/it/a1.json';
import type { Course, LanguageCode, Lesson, Localized, Unit } from '@/content/types';

const courses: Record<LanguageCode, Course> = {
  de: de as Course,
  en: en as Course,
  fr: fr as Course,
  ar: ar as Course,
  it: it as Course,
};

export const SPEECH_LOCALES: Record<LanguageCode, string> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  ar: 'ar-SA',
  it: 'it-IT',
};

export function writingDirection(language: LanguageCode): 'rtl' | 'ltr' {
  return language === 'ar' ? 'rtl' : 'ltr';
}

export function getCourse(language: LanguageCode): Course {
  return courses[language];
}

export interface LessonRef {
  lesson: Lesson;
  unit: Unit;
  unitNumber: number;
}

export function allLessons(language: LanguageCode): LessonRef[] {
  return getCourse(language).units.flatMap((unit, index) =>
    unit.lessons.map((lesson) => ({ lesson, unit, unitNumber: index + 1 }))
  );
}

export function findLesson(language: LanguageCode, lessonId: string): LessonRef | undefined {
  return allLessons(language).find((ref) => ref.lesson.id === lessonId);
}

/** First lesson not yet completed, in course order. */
export function nextLesson(language: LanguageCode, completed: ReadonlySet<string>): LessonRef | undefined {
  return allLessons(language).find((ref) => !completed.has(ref.lesson.id));
}

export function localize(text: Localized, native: LanguageCode): string {
  return text[native] ?? text.en ?? Object.values(text)[0] ?? '';
}
