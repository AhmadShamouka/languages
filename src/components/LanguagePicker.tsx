import { StyleSheet, View } from 'react-native';

import type { LanguageCode } from '@/content/types';
import { languageLabel } from '@/lib/i18n';
import { spacing } from '@/theme';
import { Chip } from './ui';

export const ALL_LANGUAGES: LanguageCode[] = ['en', 'de', 'fr', 'it', 'ar'];

export function LanguagePicker({
  ui,
  value,
  onChange,
  exclude,
}: {
  ui: LanguageCode;
  value: LanguageCode | null;
  onChange: (language: LanguageCode) => void;
  exclude?: LanguageCode | null;
}) {
  return (
    <View style={styles.row}>
      {ALL_LANGUAGES.filter((language) => language !== exclude).map((language) => (
        <Chip
          key={language}
          label={languageLabel(ui, language)}
          selected={value === language}
          onPress={() => onChange(language)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
