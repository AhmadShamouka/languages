export type LanguageCode = 'de' | 'en' | 'fr';

/** Text in the learner's native language. Each course file covers the two languages it is not teaching. */
export type Localized = Partial<Record<LanguageCode, string>>;

export type ItemKind = 'word' | 'phrase' | 'sentence';

export interface CurriculumItem {
  id: string;
  kind: ItemKind;
  /** What the learner hears and says, in the language being taught. */
  text: string;
  gloss: Localized;
  prompt: Localized;
}

export interface RolePlay {
  /** Scenario description for the AI tutor. */
  topic: string;
  goal: Localized;
  /** The tutor's first line, in the language being taught. */
  opening: string;
  /** Example lines the learner can say to get started. */
  starterLines: string[];
}

export interface Lesson {
  id: string;
  title: Localized;
  items: CurriculumItem[];
  rolePlay: RolePlay;
}

export interface Unit {
  id: string;
  title: Localized;
  lessons: Lesson[];
}

export interface Course {
  language: LanguageCode;
  level: 'A1';
  units: Unit[];
}
