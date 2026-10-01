import type { LanguageCode } from '@/content/types';

const en = {
  appName: 'LinguaTalk',
  tagline: 'Learn German, English, and French by speaking.',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signUp: 'Create account',
  noAccount: "Don't have an account? Create one",
  haveAccount: 'Already have an account? Sign in',
  signOut: 'Sign out',
  passwordHint: 'At least 8 characters',

  onboardingTitle: 'Set up your learning',
  nativeQuestion: 'I speak',
  targetQuestion: 'I want to learn',
  continue: 'Continue',

  tabHome: 'Home',
  tabLearn: 'Learn',
  tabSpeak: 'Speak',
  tabProfile: 'Profile',

  hello: 'Welcome back!',
  learning: 'Learning {language}',
  streakDays: '{count}-day streak',
  streakNone: 'Practice today to start a streak',
  streakToday: 'You practiced today',
  streakKeep: 'Practice today to keep it going',
  lessonsDone: '{done} of {total} lessons done',
  upNext: 'Up next',
  startLesson: 'Start lesson',
  allDone: 'You finished every A1 lesson. Keep speaking to stay sharp!',
  practiceSpeaking: 'Practice speaking',
  unit: 'Unit {number}',
  done: 'Done',

  word: 'Word',
  phrase: 'Phrase',
  sentence: 'Sentence',
  listen: 'Listen',
  tapToSpeak: 'Tap to speak',
  tapToStop: 'Tap to stop',
  checking: 'Checking…',
  next: 'Next',
  skip: 'Skip',
  finish: 'Finish lesson',
  weHeard: 'We heard',
  correct: "That's right!",
  tryAgain: 'Try again',
  itemOf: '{current} of {total}',
  lessonComplete: 'Lesson complete!',
  lessonCompleteBody: 'Now use what you learned in a short conversation.',
  practiceRolePlay: 'Practice the role-play',
  backToLessons: 'Back to lessons',

  rolePlay: 'Role-play',
  freePractice: 'Free practice',
  chooseLesson: 'Choose a scenario',
  goal: 'Goal',
  trySaying: 'Try saying',
  freeGoal: 'Say anything about "{topic}". The tutor will reply and correct you.',
  typeInstead: 'Type instead',
  speakInstead: 'Speak instead',
  typeMessage: 'Type in {language}…',
  send: 'Send',
  showTranslation: 'Show translation',
  correction: 'Tip',
  startOver: 'Start over',
  thinking: 'Thinking…',

  profileTitle: 'Your profile',
  nativeLanguage: 'Your language',
  targetLanguage: 'Learning',
  level: 'Level',
  save: 'Save',
  saved: 'Saved',

  micDenied: 'Microphone access is needed to speak. Enable it in your phone settings.',
  errorGeneric: 'Something went wrong. Please try again.',
  errorNetwork: "Can't reach the server. Check your connection.",
  errorNothingHeard: "We couldn't hear anything. Try again a little louder.",
  errorDailyLimit: "You've reached today's speaking limit. Come back tomorrow!",
  errorCredentials: 'Email or password is incorrect.',
  errorEmailTaken: 'An account with this email already exists.',
};

export type StringKey = keyof typeof en;

const de: Record<StringKey, string> = {
  appName: 'LinguaTalk',
  tagline: 'Lerne Deutsch, Englisch und Französisch durch Sprechen.',
  email: 'E-Mail',
  password: 'Passwort',
  signIn: 'Anmelden',
  signUp: 'Konto erstellen',
  noAccount: 'Noch kein Konto? Jetzt erstellen',
  haveAccount: 'Schon ein Konto? Anmelden',
  signOut: 'Abmelden',
  passwordHint: 'Mindestens 8 Zeichen',

  onboardingTitle: 'Richte dein Lernen ein',
  nativeQuestion: 'Ich spreche',
  targetQuestion: 'Ich möchte lernen',
  continue: 'Weiter',

  tabHome: 'Start',
  tabLearn: 'Lernen',
  tabSpeak: 'Sprechen',
  tabProfile: 'Profil',

  hello: 'Willkommen zurück!',
  learning: 'Du lernst {language}',
  streakDays: '{count} Tage in Folge',
  streakNone: 'Übe heute, um eine Serie zu starten',
  streakToday: 'Du hast heute geübt',
  streakKeep: 'Übe heute, um deine Serie zu halten',
  lessonsDone: '{done} von {total} Lektionen erledigt',
  upNext: 'Als Nächstes',
  startLesson: 'Lektion starten',
  allDone: 'Du hast alle A1-Lektionen geschafft. Sprich weiter, um in Übung zu bleiben!',
  practiceSpeaking: 'Sprechen üben',
  unit: 'Einheit {number}',
  done: 'Erledigt',

  word: 'Wort',
  phrase: 'Ausdruck',
  sentence: 'Satz',
  listen: 'Anhören',
  tapToSpeak: 'Zum Sprechen tippen',
  tapToStop: 'Zum Beenden tippen',
  checking: 'Wird geprüft…',
  next: 'Weiter',
  skip: 'Überspringen',
  finish: 'Lektion abschließen',
  weHeard: 'Wir haben gehört',
  correct: 'Richtig!',
  tryAgain: 'Nochmal versuchen',
  itemOf: '{current} von {total}',
  lessonComplete: 'Lektion geschafft!',
  lessonCompleteBody: 'Nutze das Gelernte jetzt in einem kurzen Gespräch.',
  practiceRolePlay: 'Rollenspiel üben',
  backToLessons: 'Zurück zu den Lektionen',

  rolePlay: 'Rollenspiel',
  freePractice: 'Freies Üben',
  chooseLesson: 'Wähle eine Situation',
  goal: 'Ziel',
  trySaying: 'Sag zum Beispiel',
  freeGoal: 'Sag etwas zum Thema „{topic}“. Der Tutor antwortet und korrigiert dich.',
  typeInstead: 'Lieber tippen',
  speakInstead: 'Lieber sprechen',
  typeMessage: 'Auf {language} schreiben…',
  send: 'Senden',
  showTranslation: 'Übersetzung zeigen',
  correction: 'Tipp',
  startOver: 'Neu beginnen',
  thinking: 'Denkt nach…',

  profileTitle: 'Dein Profil',
  nativeLanguage: 'Deine Sprache',
  targetLanguage: 'Du lernst',
  level: 'Niveau',
  save: 'Speichern',
  saved: 'Gespeichert',

  micDenied: 'Zum Sprechen braucht die App Zugriff auf das Mikrofon. Erlaube ihn in den Einstellungen.',
  errorGeneric: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  errorNetwork: 'Der Server ist nicht erreichbar. Prüfe deine Verbindung.',
  errorNothingHeard: 'Wir konnten nichts hören. Versuche es etwas lauter.',
  errorDailyLimit: 'Du hast dein Sprechlimit für heute erreicht. Komm morgen wieder!',
  errorCredentials: 'E-Mail oder Passwort ist falsch.',
  errorEmailTaken: 'Mit dieser E-Mail gibt es bereits ein Konto.',
};

const fr: Record<StringKey, string> = {
  appName: 'LinguaTalk',
  tagline: "Apprends l'allemand, l'anglais et le français en parlant.",
  email: 'E-mail',
  password: 'Mot de passe',
  signIn: 'Se connecter',
  signUp: 'Créer un compte',
  noAccount: 'Pas encore de compte ? Crée-le',
  haveAccount: 'Déjà un compte ? Connecte-toi',
  signOut: 'Se déconnecter',
  passwordHint: 'Au moins 8 caractères',

  onboardingTitle: 'Configure ton apprentissage',
  nativeQuestion: 'Je parle',
  targetQuestion: 'Je veux apprendre',
  continue: 'Continuer',

  tabHome: 'Accueil',
  tabLearn: 'Apprendre',
  tabSpeak: 'Parler',
  tabProfile: 'Profil',

  hello: 'Bon retour !',
  learning: 'Tu apprends : {language}',
  streakDays: '{count} jours de suite',
  streakNone: "Entraîne-toi aujourd'hui pour lancer une série",
  streakToday: "Tu t'es entraîné aujourd'hui",
  streakKeep: "Entraîne-toi aujourd'hui pour garder ta série",
  lessonsDone: '{done} leçons sur {total} terminées',
  upNext: 'Prochaine leçon',
  startLesson: 'Commencer la leçon',
  allDone: 'Tu as terminé toutes les leçons A1. Continue à parler pour garder le rythme !',
  practiceSpeaking: "S'entraîner à parler",
  unit: 'Unité {number}',
  done: 'Terminé',

  word: 'Mot',
  phrase: 'Expression',
  sentence: 'Phrase',
  listen: 'Écouter',
  tapToSpeak: 'Touche pour parler',
  tapToStop: 'Touche pour arrêter',
  checking: 'Vérification…',
  next: 'Suivant',
  skip: 'Passer',
  finish: 'Terminer la leçon',
  weHeard: 'Nous avons entendu',
  correct: "C'est juste !",
  tryAgain: 'Réessayer',
  itemOf: '{current} sur {total}',
  lessonComplete: 'Leçon terminée !',
  lessonCompleteBody: 'Utilise maintenant ce que tu as appris dans une courte conversation.',
  practiceRolePlay: 'Faire le jeu de rôle',
  backToLessons: 'Retour aux leçons',

  rolePlay: 'Jeu de rôle',
  freePractice: 'Pratique libre',
  chooseLesson: 'Choisis une situation',
  goal: 'Objectif',
  trySaying: 'Essaie de dire',
  freeGoal: 'Dis ce que tu veux sur « {topic} ». Le tuteur te répond et te corrige.',
  typeInstead: 'Écrire plutôt',
  speakInstead: 'Parler plutôt',
  typeMessage: 'Écris en {language}…',
  send: 'Envoyer',
  showTranslation: 'Voir la traduction',
  correction: 'Conseil',
  startOver: 'Recommencer',
  thinking: 'Réflexion…',

  profileTitle: 'Ton profil',
  nativeLanguage: 'Ta langue',
  targetLanguage: "Tu apprends",
  level: 'Niveau',
  save: 'Enregistrer',
  saved: 'Enregistré',

  micDenied: "L'accès au micro est nécessaire pour parler. Active-le dans les réglages du téléphone.",
  errorGeneric: "Une erreur s'est produite. Réessaie.",
  errorNetwork: 'Impossible de joindre le serveur. Vérifie ta connexion.',
  errorNothingHeard: "Nous n'avons rien entendu. Réessaie un peu plus fort.",
  errorDailyLimit: "Tu as atteint la limite de parole pour aujourd'hui. Reviens demain !",
  errorCredentials: "L'e-mail ou le mot de passe est incorrect.",
  errorEmailTaken: 'Un compte existe déjà avec cet e-mail.',
};

const strings: Record<LanguageCode, Record<StringKey, string>> = { en, de, fr };

/** Language names, written in each UI language. */
const languageNames: Record<LanguageCode, Record<LanguageCode, string>> = {
  en: { de: 'German', en: 'English', fr: 'French' },
  de: { de: 'Deutsch', en: 'Englisch', fr: 'Französisch' },
  fr: { de: 'allemand', en: 'anglais', fr: 'français' },
};

export function t(ui: LanguageCode, key: StringKey, vars: Record<string, string | number> = {}): string {
  return strings[ui][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}

export function languageName(ui: LanguageCode, language: LanguageCode): string {
  return languageNames[ui][language];
}

/** Capitalised for labels and buttons (French names are lowercase mid-sentence). */
export function languageLabel(ui: LanguageCode, language: LanguageCode): string {
  const name = languageName(ui, language);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function deviceLanguage(): LanguageCode {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  if (locale.startsWith('de')) return 'de';
  if (locale.startsWith('fr')) return 'fr';
  return 'en';
}
