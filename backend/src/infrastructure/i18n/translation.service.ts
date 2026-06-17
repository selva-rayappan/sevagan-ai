import { Injectable } from '@nestjs/common';
import { Language } from '../../domain/enums/language.enum';
import * as enLocale from './locales/en.json';
import * as taLocale from './locales/ta.json';

type Locale = typeof enLocale;
type TranslationParams = Record<string, string | number>;

const LOCALES: Record<Language, Locale> = {
  [Language.EN]: enLocale,
  [Language.TA]: taLocale,
};

@Injectable()
export class TranslationService {
  /**
   * Resolves a dot-notation key against the locale object.
   * e.g. "customer.welcome" → locales.customer.welcome
   * Falls back to EN if the key is missing in the requested language.
   */
  translate(key: string, language: Language = Language.EN, params?: TranslationParams): string {
    const template =
      this.resolve(LOCALES[language], key) ??
      this.resolve(LOCALES[Language.EN], key) ??
      key;

    return params ? this.interpolate(template, params) : template;
  }

  private resolve(locale: Record<string, unknown>, key: string): string | undefined {
    const value = key.split('.').reduce<unknown>((obj, segment) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[segment];
      }
      return undefined;
    }, locale);

    return typeof value === 'string' ? value : undefined;
  }

  private interpolate(template: string, params: TranslationParams): string {
    return Object.entries(params).reduce(
      (result, [key, value]) =>
        result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value)),
      template,
    );
  }
}
