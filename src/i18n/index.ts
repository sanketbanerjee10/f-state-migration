import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import zhCN from './locales/zh-CN.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zhTW from './locales/zh-TW.json';
import ru from './locales/ru.json';
import id from './locales/id.json';
import ptBR from './locales/pt-BR.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import ar from './locales/ar.json';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './languages';

export const LANGUAGE_STORAGE_KEY = 'i18nextLng';

export function resolveSupportedLanguage(language: string | undefined): SupportedLanguage {
  if (!language) return DEFAULT_LANGUAGE;

  const normalized = language.trim().replace(/_/g, '-').toLowerCase();
  const [baseLanguage, ...subtags] = normalized.split('-');
  if (baseLanguage === 'zh') {
    const usesTraditionalChinese =
      subtags.includes('hant') ||
      subtags.some((subtag) => ['tw', 'hk', 'mo'].includes(subtag));
    return usesTraditionalChinese ? 'zh-TW' : 'zh-CN';
  }

  const exactMatches: Record<string, SupportedLanguage> = {
    'pt-br': 'pt-BR',
  };
  const primaryLanguage: Record<string, SupportedLanguage> = {
    en: 'en',
    ko: 'ko',
    ja: 'ja',
    vi: 'vi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    ru: 'ru',
    id: 'id',
    pt: 'pt-BR',
    th: 'th',
    tr: 'tr',
    ar: 'ar',
  };

  return exactMatches[normalized] ?? primaryLanguage[baseLanguage] ?? DEFAULT_LANGUAGE;
}

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .on('languageChanged', (language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = i18next.dir(language);
    }
  })
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
      ja: { translation: ja },
      vi: { translation: vi },
      'zh-CN': { translation: zhCN },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      'zh-TW': { translation: zhTW },
      ru: { translation: ru },
      id: { translation: id },
      'pt-BR': { translation: ptBR },
      th: { translation: th },
      tr: { translation: tr },
      ar: { translation: ar },
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: DEFAULT_LANGUAGE,
    load: 'currentOnly',
    nonExplicitSupportedLngs: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      convertDetectedLanguage: resolveSupportedLanguage,
    },
    interpolation: {
      escapeValue: false,
    },
  })
  .then(() => {
    if (typeof document !== 'undefined') {
      const language = i18next.language ?? i18next.resolvedLanguage ?? DEFAULT_LANGUAGE;
      document.documentElement.lang = language;
      document.documentElement.dir = i18next.dir(language);
    }
  });

export default i18next;
