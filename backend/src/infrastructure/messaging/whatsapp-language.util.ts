import { Language } from '../../domain/enums';

// Meta's template API expects the exact language code the template was
// registered under in Business Manager, not our internal Language enum value —
// this must match verbatim (e.g. 'en' vs 'en_US' are different translations
// to Meta, confirmed via GET /{waba-id}/message_templates).
const META_TEMPLATE_LANGUAGE_CODES: Record<Language, string> = {
  [Language.EN]: 'en',
  [Language.TA]: 'ta',
};

export function toMetaTemplateLanguageCode(language: Language): string {
  return META_TEMPLATE_LANGUAGE_CODES[language];
}
