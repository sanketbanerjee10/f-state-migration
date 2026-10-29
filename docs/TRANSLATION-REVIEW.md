# Translation Review: Current Resweep

This inventory includes a second, independent full-file sweep of all 783 string keys in each of the 14 locale files (10,962 localized values total). It compared locale strings with `en.json`, searched for contiguous English source phrases, and separately checked domain terms such as State, Volcano War, Hero, Troop, Arena, and migration passes. It found no untranslated game terms or mixed-language sentences. Player names, sample IDs, file-format labels, placeholders, and established acronyms accompanied by a localized explanation are treated as identifiers; familiar words that are also standard in the target language are not reported as untranslated English.

## Unchanged English strings

No locale values exactly matching English with five or more whitespace-separated words were found.

| Target language | Locale file | Candidate strings |
| --- | --- | ---: |
| Arabic (`ar`) | [`ar.json`](../src/i18n/locales/ar.json) | 0 |
| German (`de`) | [`de.json`](../src/i18n/locales/de.json) | 0 |
| Spanish (`es`) | [`es.json`](../src/i18n/locales/es.json) | 0 |
| French (`fr`) | [`fr.json`](../src/i18n/locales/fr.json) | 0 |
| Indonesian (`id`) | [`id.json`](../src/i18n/locales/id.json) | 0 |
| Japanese (`ja`) | [`ja.json`](../src/i18n/locales/ja.json) | 0 |
| Korean (`ko`) | [`ko.json`](../src/i18n/locales/ko.json) | 0 |
| Brazilian Portuguese (`pt-BR`) | [`pt-BR.json`](../src/i18n/locales/pt-BR.json) | 0 |
| Russian (`ru`) | [`ru.json`](../src/i18n/locales/ru.json) | 0 |
| Thai (`th`) | [`th.json`](../src/i18n/locales/th.json) | 0 |
| Turkish (`tr`) | [`tr.json`](../src/i18n/locales/tr.json) | 0 |
| Vietnamese (`vi`) | [`vi.json`](../src/i18n/locales/vi.json) | 0 |
| Simplified Chinese (`zh-CN`) | [`zh-CN.json`](../src/i18n/locales/zh-CN.json) | 0 |
| Traditional Chinese (`zh-TW`) | [`zh-TW.json`](../src/i18n/locales/zh-TW.json) | 0 |

**Total: 0 unchanged-English candidates across 0 target languages.**

## Mixed-language findings

The full-file resweep found no remaining mixed-language sentences or untranslated game terminology. Remaining English-script items are limited to player names, sample identifiers/codes, file formats, placeholders, and established acronyms explained in the localized text.

| Target language | Locale file | Remaining findings |
| --- | --- | ---: |
| Arabic (`ar`) | [`ar.json`](../src/i18n/locales/ar.json) | 0 |
| German (`de`) | [`de.json`](../src/i18n/locales/de.json) | 0 |
| Spanish (`es`) | [`es.json`](../src/i18n/locales/es.json) | 0 |
| French (`fr`) | [`fr.json`](../src/i18n/locales/fr.json) | 0 |
| Indonesian (`id`) | [`id.json`](../src/i18n/locales/id.json) | 0 |
| Japanese (`ja`) | [`ja.json`](../src/i18n/locales/ja.json) | 0 |
| Korean (`ko`) | [`ko.json`](../src/i18n/locales/ko.json) | 0 |
| Brazilian Portuguese (`pt-BR`) | [`pt-BR.json`](../src/i18n/locales/pt-BR.json) | 0 |
| Russian (`ru`) | [`ru.json`](../src/i18n/locales/ru.json) | 0 |
| Thai (`th`) | [`th.json`](../src/i18n/locales/th.json) | 0 |
| Turkish (`tr`) | [`tr.json`](../src/i18n/locales/tr.json) | 0 |
| Vietnamese (`vi`) | [`vi.json`](../src/i18n/locales/vi.json) | 0 |
| Simplified Chinese (`zh-CN`) | [`zh-CN.json`](../src/i18n/locales/zh-CN.json) | 0 |
| Traditional Chinese (`zh-TW`) | [`zh-TW.json`](../src/i18n/locales/zh-TW.json) | 0 |

**Total: 0 remaining mixed-language findings across 0 locale files.**
