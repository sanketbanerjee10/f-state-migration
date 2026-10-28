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

function LanguageFlag({ code }: { code: SupportedLanguage }) {
  const flagProps = {
    className: 'language-selector-flag',
    viewBox: '0 0 24 16',
    'aria-hidden': true as const,
  };

  switch (code) {
    case 'en':
      return <svg {...flagProps}><rect width="24" height="16" fill="#243b75" /><path d="M0 0 24 16M24 0 0 16" stroke="white" strokeWidth="4" /><path d="M0 0 24 16M24 0 0 16" stroke="#cf142b" strokeWidth="1.5" /><path d="M12 0v16M0 8h24" stroke="white" strokeWidth="6" /><path d="M12 0v16M0 8h24" stroke="#cf142b" strokeWidth="2.5" /></svg>;
    case 'ko':
      return <svg {...flagProps}><rect width="24" height="16" fill="white" /><path d="M12 4a4 4 0 0 1 0 8 2 2 0 0 0 0-4 2 2 0 0 1 0-4" fill="#cd2e3a" /><path d="M12 12a4 4 0 0 1 0-8 2 2 0 0 0 0 4 2 2 0 0 1 0 4" fill="#0047a0" /><path d="m4 3 3 3m-4-2 3 3m11 3 3 3m-2-4 3 3" stroke="#111" strokeWidth="1" /></svg>;
    case 'ja':
      return <svg {...flagProps}><rect width="24" height="16" fill="white" /><circle cx="12" cy="8" r="4.3" fill="#bc002d" /></svg>;
    case 'vi':
      return <svg {...flagProps}><rect width="24" height="16" fill="#da251d" /><path d="m12 3 1.2 3.5H17l-3.1 2.2 1.2 3.6-3.1-2.2-3.1 2.2 1.2-3.6L7 6.5h3.8z" fill="#ff0" /></svg>;
    case 'zh-CN':
      return <svg {...flagProps}><rect width="24" height="16" fill="#de2910" /><path d="m5 2 1 2.2 2.4.2-1.8 1.5.6 2.3L5 7l-2.2 1.2.6-2.3L1.6 4.4 4 4.2z" fill="#ffde00" /><circle cx="10.5" cy="2.8" r=".7" fill="#ffde00" /><circle cx="12" cy="5" r=".7" fill="#ffde00" /><circle cx="11.5" cy="7.5" r=".7" fill="#ffde00" /><circle cx="9.5" cy="9" r=".7" fill="#ffde00" /></svg>;
    case 'es':
      return <svg {...flagProps}><rect width="24" height="4" fill="#aa151b" /><rect y="4" width="24" height="8" fill="#f1bf00" /><rect y="12" width="24" height="4" fill="#aa151b" /><rect x="5" y="5.5" width="1" height="4" fill="#aa151b" /></svg>;
    case 'fr':
      return <svg {...flagProps}><rect width="8" height="16" fill="#002395" /><rect x="8" width="8" height="16" fill="white" /><rect x="16" width="8" height="16" fill="#ed2939" /></svg>;
    case 'de':
      return <svg {...flagProps}><rect width="24" height="5.33" fill="#111" /><rect y="5.33" width="24" height="5.34" fill="#d00" /><rect y="10.67" width="24" height="5.33" fill="#ffce00" /></svg>;
    case 'zh-TW':
      return <svg {...flagProps}><rect width="24" height="16" fill="#fe0000" /><rect x="1" y="1" width="10" height="7" fill="#000095" /><circle cx="6" cy="4.5" r="2" fill="white" /><circle cx="6" cy="4.5" r="1" fill="#000095" /><path d="M6 1.8v.8m0 3.8v.8m-2.7-2.7h.8m3.8 0h.8M4.1 2.6l.6.6m2.6 2.6.6.6m0-3.8-.6.6m-2.6 2.6-.6.6" stroke="white" strokeWidth=".5" /></svg>;
    case 'ru':
      return <svg {...flagProps}><rect width="24" height="5.33" fill="white" /><rect y="5.33" width="24" height="5.34" fill="#0039a6" /><rect y="10.67" width="24" height="5.33" fill="#d52b1e" /></svg>;
    case 'id':
      return <svg {...flagProps}><rect width="24" height="8" fill="#ce1126" /><rect y="8" width="24" height="8" fill="white" /></svg>;
    case 'pt-BR':
      return <svg {...flagProps}><rect width="24" height="16" fill="#009b3a" /><path d="m12 2 9 6-9 6-9-6z" fill="#ffdf00" /><circle cx="12" cy="8" r="3.5" fill="#002776" /><path d="M9 7.3a5 5 0 0 1 6 1" fill="none" stroke="white" strokeWidth=".55" /></svg>;
    case 'th':
      return <svg {...flagProps}><rect width="24" height="2.67" fill="#a51931" /><rect y="2.67" width="24" height="2.67" fill="white" /><rect y="5.34" width="24" height="5.32" fill="#2d2a4a" /><rect y="10.66" width="24" height="2.67" fill="white" /><rect y="13.33" width="24" height="2.67" fill="#a51931" /></svg>;
    case 'tr':
      return <svg {...flagProps}><rect width="24" height="16" fill="#e30a17" /><circle cx="9" cy="8" r="4" fill="white" /><circle cx="10.2" cy="8" r="3.2" fill="#e30a17" /><path d="m15 5.2.8 2 2.2.1-1.7 1.3.6 2.1-1.9-1.2-1.8 1.2.6-2.1-1.7-1.3 2.2-.1z" fill="white" /></svg>;
    case 'ar':
      return <svg {...flagProps}><rect width="24" height="16" fill="#006c35" /><path d="M5 10.5h14M7 12.5h10" stroke="white" strokeWidth=".8" /><path d="M8 11.6h8" stroke="white" strokeWidth="1.1" /><path d="m15 11.6 2 1" stroke="white" strokeWidth=".6" /></svg>;
  }
}

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
          <LanguageFlag code={selected.code} />
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
              hideIndicator
              className="language-selector-option"
            >
              <LanguageFlag code={language.code} />
              <span>{language.nativeName}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
