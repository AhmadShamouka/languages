// Checks that the three course files stay structurally identical and fully translated.
// Run with: npm run validate:content
import { readFileSync } from 'node:fs';

const LANGUAGES = ['de', 'en', 'fr'];
const KINDS = ['word', 'phrase', 'sentence'];
const errors = [];

const load = (language) => JSON.parse(readFileSync(new URL(`../src/content/${language}/a1.json`, import.meta.url), 'utf8'));
const courses = Object.fromEntries(LANGUAGES.map((language) => [language, load(language)]));

function checkLocalized(value, course, where) {
  for (const language of LANGUAGES) {
    if (language === course) continue;
    if (typeof value?.[language] !== 'string' || !value[language].trim()) {
      errors.push(`${course}: ${where} is missing "${language}"`);
    }
  }
}

function outline(course) {
  return course.units.map((unit) => [unit.id, unit.lessons.map((lesson) => [lesson.id, lesson.items.map((item) => item.id)])]);
}

for (const [language, course] of Object.entries(courses)) {
  if (course.language !== language) errors.push(`${language}: language field is "${course.language}"`);
  const itemIds = new Set();
  for (const unit of course.units) {
    checkLocalized(unit.title, language, `unit ${unit.id} title`);
    for (const lesson of unit.lessons) {
      checkLocalized(lesson.title, language, `lesson ${lesson.id} title`);
      if (!/^[a-z0-9-]{1,64}$/.test(lesson.id)) errors.push(`${language}: lesson id ${lesson.id} is not API-safe`);
      for (const item of lesson.items) {
        if (itemIds.has(item.id)) errors.push(`${language}: duplicate item id ${item.id}`);
        itemIds.add(item.id);
        if (!KINDS.includes(item.kind)) errors.push(`${language}: ${item.id} has kind "${item.kind}"`);
        if (!item.text?.trim()) errors.push(`${language}: ${item.id} has no text`);
        checkLocalized(item.gloss, language, `${item.id} gloss`);
        checkLocalized(item.prompt, language, `${item.id} prompt`);
      }
      const rolePlay = lesson.rolePlay;
      if (!rolePlay?.topic || !rolePlay.opening) errors.push(`${language}: ${lesson.id} role-play needs topic and opening`);
      if (!rolePlay?.starterLines?.length) errors.push(`${language}: ${lesson.id} role-play needs starter lines`);
      checkLocalized(rolePlay?.goal, language, `${lesson.id} role-play goal`);
    }
  }
}

const reference = JSON.stringify(outline(courses.en));
for (const language of LANGUAGES) {
  if (JSON.stringify(outline(courses[language])) !== reference) {
    errors.push(`${language}: units, lessons, or items differ from the English course outline`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const lessons = courses.en.units.flatMap((unit) => unit.lessons);
console.log(`OK: ${courses.en.units.length} units, ${lessons.length} lessons, ${lessons.flatMap((l) => l.items).length} items per language`);
