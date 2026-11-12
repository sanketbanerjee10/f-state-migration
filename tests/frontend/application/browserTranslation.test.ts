import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BrowserTranslationError,
  clearBrowserTranslationCacheForTests,
  translateWithBrowserApis,
} from '../../../src/lib/browserTranslation';

type TestTranslatorOptions = {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (monitor: EventTarget) => void;
};

const detectorDestroy = vi.fn();
const detectorDetect = vi.fn();
const detectorCreate = vi.fn();
const translatorAvailability = vi.fn();
const translatorCreate = vi.fn();
const translatorTranslate = vi.fn();
const translatorDestroy = vi.fn();

function installBrowserApis() {
  detectorCreate.mockImplementation(async () => ({
    detect: detectorDetect,
    destroy: detectorDestroy,
  }));
  translatorAvailability.mockResolvedValue('available');
  translatorCreate.mockImplementation(async (options: TestTranslatorOptions) => {
    const monitor = new EventTarget();
    options.monitor?.(monitor);
    return {
      translate: translatorTranslate,
      destroy: translatorDestroy,
    };
  });

  Object.defineProperty(globalThis, 'LanguageDetector', {
    configurable: true,
    value: { create: detectorCreate },
  });
  Object.defineProperty(globalThis, 'Translator', {
    configurable: true,
    value: {
      availability: translatorAvailability,
      create: translatorCreate,
    },
  });
}

beforeEach(() => {
  clearBrowserTranslationCacheForTests();
  vi.clearAllMocks();
  detectorDetect.mockResolvedValue([{ detectedLanguage: 'en', confidence: 0.99 }]);
  translatorTranslate.mockImplementation(async (text: string) => `Translated: ${text}`);
  installBrowserApis();
});

afterEach(() => {
  clearBrowserTranslationCacheForTests();
  Reflect.deleteProperty(globalThis, 'LanguageDetector');
  Reflect.deleteProperty(globalThis, 'Translator');
});

describe('browser-native field translation', () => {
  it('refuses to translate when either native API is unavailable', async () => {
    Reflect.deleteProperty(globalThis, 'Translator');

    await expect(translateWithBrowserApis('A sufficiently long reason', 'ja')).rejects.toMatchObject({
      code: 'unsupported-browser',
      cause: { message: 'Missing browser-native translation APIs: Translator' },
    });
    expect(detectorCreate).not.toHaveBeenCalled();
  });

  it('skips translation when detected source language matches the target', async () => {
    detectorDetect.mockResolvedValue([{ detectedLanguage: 'en-US', confidence: 0.99 }]);

    const result = await translateWithBrowserApis('I would like to join.', 'en');

    expect(result).toMatchObject({
      text: 'I would like to join.',
      sourceLanguage: 'en-US',
      targetLanguage: 'en',
      alreadyInTargetLanguage: true,
    });
    expect(translatorAvailability).not.toHaveBeenCalled();
    expect(translatorCreate).not.toHaveBeenCalled();
    expect(detectorDestroy).toHaveBeenCalledOnce();
  });

  it('normalizes ambiguous Chinese detection independently for each target language', async () => {
    detectorDetect.mockResolvedValue([{ detectedLanguage: 'zh', confidence: 0.9 }]);

    const traditionalChinese = await translateWithBrowserApis('这是一段足够长的内容。', 'zh-TW');
    const english = await translateWithBrowserApis('这是一段足够长的内容。', 'en');

    expect(traditionalChinese).toMatchObject({
      sourceLanguage: 'zh-TW',
      alreadyInTargetLanguage: true,
    });
    expect(english.sourceLanguage).toBe('zh-CN');
    expect(detectorCreate).toHaveBeenCalledOnce();
    expect(translatorAvailability).toHaveBeenCalledOnce();
  });

  it('rejects low-confidence language detection instead of guessing', async () => {
    detectorDetect.mockResolvedValue([{ detectedLanguage: 'vi', confidence: 0.2 }]);

    await expect(translateWithBrowserApis('This text is long enough.', 'en')).rejects.toMatchObject({
      code: 'low-confidence',
    });
    expect(translatorAvailability).not.toHaveBeenCalled();
  });

  it('reports unsupported language pairs without creating a translator', async () => {
    detectorDetect.mockResolvedValue([{ detectedLanguage: 'vi', confidence: 0.99 }]);
    translatorAvailability.mockResolvedValue('unavailable');

    await expect(translateWithBrowserApis('Some Vietnamese words here', 'en')).rejects.toMatchObject({
      code: 'unsupported-pair',
    });
    expect(translatorCreate).not.toHaveBeenCalled();
  });

  it('translates with the selected target, reports download progress, and caches success', async () => {
    detectorDetect.mockResolvedValue([{ detectedLanguage: 'zh-Hans', confidence: 0.95 }]);
    translatorAvailability.mockResolvedValue('downloadable');
    let downloadMonitor: EventTarget | undefined;
    translatorCreate.mockImplementation(async (options: TestTranslatorOptions) => {
      downloadMonitor = new EventTarget();
      options.monitor?.(downloadMonitor);
      const progress = new Event('downloadprogress') as Event & { loaded: number; total: number };
      progress.loaded = 25;
      progress.total = 100;
      downloadMonitor.dispatchEvent(progress);
      return { translate: translatorTranslate, destroy: translatorDestroy };
    });
    const statuses: Array<{ phase: string; progress?: number | null }> = [];
    translatorTranslate.mockResolvedValue('A peaceful home.');

    const first = await translateWithBrowserApis('我想寻找一个安静的家。', 'en', (status) => {
      statuses.push(status);
    });
    const second = await translateWithBrowserApis('我想寻找一个安静的家。', 'en');

    expect(first).toMatchObject({
      text: 'A peaceful home.',
      originalText: '我想寻找一个安静的家。',
      sourceLanguage: 'zh-CN',
      targetLanguage: 'en',
      alreadyInTargetLanguage: false,
    });
    expect(second).toEqual(first);
    expect(translatorAvailability).toHaveBeenCalledOnce();
    expect(translatorCreate).toHaveBeenCalledOnce();
    expect(translatorTranslate).toHaveBeenCalledOnce();
    expect(statuses).toContainEqual({ phase: 'downloading', progress: 0.25 });
  });

  it('keeps target-language translations separate in the session cache', async () => {
    translatorTranslate.mockImplementation(async (_text: string) => `Translation ${translatorTranslate.mock.calls.length}`);

    const japanese = await translateWithBrowserApis('A reason to migrate', 'ja');
    const korean = await translateWithBrowserApis('A reason to migrate', 'ko');

    expect(japanese.targetLanguage).toBe('ja');
    expect(korean.targetLanguage).toBe('ko');
    expect(translatorAvailability).toHaveBeenCalledTimes(2);
    expect(translatorCreate).toHaveBeenCalledTimes(2);
  });

  it('handles empty and very short values without initializing language detection', async () => {
    await expect(translateWithBrowserApis('  ', 'en')).rejects.toMatchObject({
      code: 'text-too-short',
    });
    await expect(translateWithBrowserApis('OK', 'en')).rejects.toBeInstanceOf(BrowserTranslationError);
    expect(detectorCreate).not.toHaveBeenCalled();
  });
});
