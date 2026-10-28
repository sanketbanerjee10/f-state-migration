export type SupportedLanguage =
  | 'en'
  | 'ko'
  | 'ja'
  | 'vi'
  | 'zh-CN'
  | 'es'
  | 'fr'
  | 'de'
  | 'zh-TW'
  | 'ru'
  | 'id'
  | 'pt-BR'
  | 'th'
  | 'tr'
  | 'ar';

export interface LanguageMetadata {
  code: SupportedLanguage;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  'en',
  'ko',
  'ja',
  'vi',
  'zh-CN',
  'es',
  'fr',
  'de',
  'zh-TW',
  'ru',
  'id',
  'pt-BR',
  'th',
  'tr',
  'ar',
];

export const LANGUAGE_METADATA: readonly LanguageMetadata[] = [
  { code: 'en', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ko', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ja', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'vi', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'zh-CN', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'es', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh-TW', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'ru', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'id', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'pt-BR', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'th', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'tr', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', nativeName: 'العربية', flag: '🇸🇦' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(language as SupportedLanguage);
}

export function getLanguageMetadata(language: string): LanguageMetadata {
  return (
    LANGUAGE_METADATA.find((item) => item.code === language) ??
    LANGUAGE_METADATA[0]
  );
}
