# Frontend translations

Translation dictionaries are local JSON resources stored in `locales/`. Keep the existing flat namespace structure unless a future migration intentionally changes it.

- File names are stable i18next language codes: `en.json`, `ko.json`, `ja.json`, `vi.json`, `zh-CN.json`, `es.json`, `fr.json`, `de.json`, `zh-TW.json`, `ru.json`, `id.json`, `pt-BR.json`, `th.json`, `tr.json`, and `ar.json`.
- Translation keys use nested JSON objects, for example:

  ```json
  {
    "application": {
      "submit": "Submit application"
    }
  }
  ```

- Keep locale keys aligned with `en.json`. Preserve interpolation placeholders exactly, including their names and braces (for example, `{{count}}`, `{{stepNumber}}`, and `{{totalSteps}}`); translated text must retain every placeholder used by the English value.
- English is the fallback language. Empty locale objects are registered and ready for translation content; missing keys continue to use English.
- Browser-language detection maps regional language tags to the supported language (for example, `es-MX` to Spanish and `zh-Hant-HK` to Traditional Chinese). A manually selected language is persisted in local storage and takes precedence on subsequent visits.
- To add a language, add `<language-code>.json`, register the code in `SUPPORTED_LANGUAGES`, add its import and resource entry in `i18n/index.ts`, and add a native name and flag in `languages.ts`. The selector derives its options from that metadata.
- Components can consume translations with `useTranslation()` once the JSON keys exist. Existing hardcoded interface text does not need to be translated at the same time.

## Translation review

The supplied fixes in [Translation-fixes.md](../../docs/Translation-fixes.md) have been integrated into their locale JSON files. Use the [translation review inventory](../../docs/TRANSLATION-REVIEW.md) for the latest full-file sweep of unchanged English strings, mixed-language sentences, and game terminology. Resolved findings are omitted; only current findings are listed. Preserve interpolation placeholders when translating and check that the result fits its UI context.
