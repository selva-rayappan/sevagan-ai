import { Language } from '../../domain/enums';

// Meta's template API expects a BCP-47 language code per approved template
// translation, not our internal Language enum value.
const META_TEMPLATE_LANGUAGE_CODES: Record<Language, string> = {
  [Language.EN]: 'en_US',
  [Language.TA]: 'ta',
};

export function toMetaTemplateLanguageCode(language: Language): string {
  return META_TEMPLATE_LANGUAGE_CODES[language];
}
