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

- English is the fallback language. Empty locale objects are registered and ready for translation content; missing keys continue to use English.
- Browser-language detection maps regional language tags to the supported language (for example, `es-MX` to Spanish and `zh-Hant-HK` to Traditional Chinese). A manually selected language is persisted in local storage and takes precedence on subsequent visits.
- To add a language, add `<language-code>.json`, register the code in `SUPPORTED_LANGUAGES`, add its import and resource entry in `i18n/index.ts`, and add a native name and flag in `languages.ts`. The selector derives its options from that metadata.
- Components can consume translations with `useTranslation()` once the JSON keys exist. Existing hardcoded interface text does not need to be translated at the same time.
