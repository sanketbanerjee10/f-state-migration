import i18next from 'i18next';
import type { BackendModule } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
  type SupportedLanguage,
} from './languages';

export const LANGUAGE_STORAGE_KEY = 'i18nextLng';

const localeLoaders = {
  en: () => import('./locales/en.json'),
  ko: () => import('./locales/ko.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
  'zh-CN': () => import('./locales/zh-CN.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  de: () => import('./locales/de.json'),
  'zh-TW': () => import('./locales/zh-TW.json'),
  ru: () => import('./locales/ru.json'),
  id: () => import('./locales/id.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  th: () => import('./locales/th.json'),
  tr: () => import('./locales/tr.json'),
  ar: () => import('./locales/ar.json'),
} satisfies Record<SupportedLanguage, () => Promise<{ default: Record<string, unknown> }>>;

const localeBackend: BackendModule = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    if (namespace !== 'translation') {
      callback(new Error(`Unsupported translation namespace: ${namespace}`), false);
      return;
    }
    if (!isSupportedLanguage(language)) {
      callback(new Error(`Unsupported translation language: ${language}`), false);
      return;
    }

    void localeLoaders[language]()
      .then(({ default: translations }) => callback(null, translations))
      .catch((error: unknown) => {
        callback(error instanceof Error ? error : new Error(String(error)), false);
      });
  },
};

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

export const i18nReady = i18next
  .use(localeBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .on('languageChanged', (language) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = i18next.dir(language);
    }
  })
  .init({
    ns: ['translation'],
    supportedLngs: [...SUPPORTED_LANGUAGES],
    fallbackLng: DEFAULT_LANGUAGE,
    load: 'currentOnly',
    nonExplicitSupportedLngs: false,
    detection: {
      order: ['localStorage', 'navigator'],
      caches: [],
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
