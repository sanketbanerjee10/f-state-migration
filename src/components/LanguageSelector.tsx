import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_STORAGE_KEY } from '@/i18n';
import {
  LANGUAGE_METADATA,
  SUPPORTED_LANGUAGES,
  getLanguageMetadata,
  isSupportedLanguage,
  type SupportedLanguage,
} from '@/i18n/languages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.language || i18n.resolvedLanguage || 'en';
  const activeCode = isSupportedLanguage(activeLanguage) ? activeLanguage : 'en';
  const selectedCode: SupportedLanguage = isSupportedLanguage(activeCode)
    ? activeCode
    : 'en';
  const selected = getLanguageMetadata(selectedCode);

  const selectLanguage = (code: string) => {
    if (!isSupportedLanguage(code)) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
    void i18n.changeLanguage(code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="language-selector-trigger"
          aria-label={t('common.labels.language', { language: selected.nativeName })}
        >
          <span className="language-selector-flag" aria-hidden="true">
            {selected.flag}
          </span>
          <span className="language-selector-name">{selected.nativeName}</span>
          <ChevronDown className="language-selector-chevron" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="language-selector-menu"
      >
        <DropdownMenuRadioGroup value={selectedCode} onValueChange={selectLanguage}>
          {LANGUAGE_METADATA.filter((language) =>
            SUPPORTED_LANGUAGES.includes(language.code),
          ).map((language) => (
            <DropdownMenuRadioItem
              key={language.code}
              value={language.code}
              className="language-selector-option"
            >
              <span className="language-selector-flag" aria-hidden="true">
                {language.flag}
              </span>
              <span>{language.nativeName}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
