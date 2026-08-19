import { Language } from '../../domain/enums';

/**
 * Category names are admin-entered, bilingual data — not app-shipped i18n
 * strings — so they live on the ServiceCategory row itself (name/nameTa)
 * rather than en.json/ta.json. Falls back to the English name whenever no
 * Tamil name has been set yet, so a newly-added category degrades to
 * readable English instead of a blank or literal translation key.
 */
export function getServiceCategoryLabel(
  category: { name: string; nameTa?: string | null },
  language: Language,
): string {
  return language === Language.TA && category.nameTa ? category.nameTa : category.name;
}
