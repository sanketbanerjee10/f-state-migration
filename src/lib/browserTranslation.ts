import type { SupportedLanguage } from '../i18n/languages';

const TRANSLATION_VERSION = 'browser-translator-v1';
const MIN_CONFIDENCE = 0.5;
const MAX_CACHE_ENTRIES = 100;
const MAX_TRANSLATORS = 3;

export type BrowserTranslationErrorCode =
  | 'unsupported-browser'
  | 'text-too-short'
  | 'detection-failed'
  | 'low-confidence'
  | 'unsupported-pair'
  | 'translator-init-failed'
  | 'model-download-failed'
  | 'translation-failed';

export class BrowserTranslationError extends Error {
  constructor(readonly code: BrowserTranslationErrorCode, cause?: unknown) {
    super(code, { cause });
    this.name = 'BrowserTranslationError';
  }
}

export interface BrowserTranslationResult {
  text: string;
  originalText: string;
  sourceLanguage: string;
  targetLanguage: SupportedLanguage;
  alreadyInTargetLanguage: boolean;
}

export type BrowserTranslationStatus =
  | { phase: 'detecting' }
  | { phase: 'translating' }
  | { phase: 'downloading'; progress: number | null };

interface DetectionResult {
  detectedLanguage: string;
  confidence: number;
}

interface LanguageDetectorInstance {
  detect(text: string): Promise<DetectionResult[]>;
  destroy(): void;
}

interface LanguageDetectorConstructor {
  create(): Promise<LanguageDetectorInstance>;
}

interface DownloadProgressEvent extends Event {
  loaded: number;
  total?: number;
}

interface TranslatorInstance {
  translate(text: string): Promise<string>;
  destroy(): void | Promise<void>;
}

type Availability = 'available' | 'downloadable' | 'downloading' | 'unavailable';

interface TranslatorOptions {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (monitor: EventTarget) => void;
}

interface TranslatorConstructor {
  availability(options: Pick<TranslatorOptions, 'sourceLanguage' | 'targetLanguage'>): Promise<Availability>;
  create(options: TranslatorOptions): Promise<TranslatorInstance>;
}

type NativeTranslationGlobals = typeof globalThis & {
  LanguageDetector?: LanguageDetectorConstructor;
  Translator?: TranslatorConstructor;
};

interface TranslatorEntry {
  instance: TranslatorInstance;
  lastUsed: number;
  listeners: Set<(status: BrowserTranslationStatus) => void>;
}

interface InFlightEntry {
  promise: Promise<BrowserTranslationResult>;
  listeners: Set<(status: BrowserTranslationStatus) => void>;
}

interface TranslatorCreation {
  promise: Promise<TranslatorEntry>;
  listeners: Set<(status: BrowserTranslationStatus) => void>;
}

const translationCache = new Map<string, BrowserTranslationResult>();
const detectionCache = new Map<string, { detectedLanguage: string; confidence: number }>();
const translatorCache = new Map<string, TranslatorEntry>();
const translatorCreations = new Map<string, TranslatorCreation>();
const inFlightTranslations = new Map<string, InFlightEntry>();

function hashText(text: string): string {
  let hash = 14695981039346656037n;
  for (const character of text) {
    hash ^= BigInt(character.codePointAt(0) ?? 0);
    hash = BigInt.asUintN(64, hash * 1099511628211n);
  }
  return hash.toString(16);
}

function remember<T>(cache: Map<string, T>, key: string, value: T): void {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
}

function normalizeDetectedLanguage(language: string, targetLanguage: SupportedLanguage): string {
  try {
    const [canonical] = Intl.getCanonicalLocales(language.replace(/_/g, '-'));
    if (!canonical) throw new Error('Empty language tag');
    const parts = canonical.split('-');
    const base = parts[0].toLowerCase();
    const script = parts.find((part) => part.length === 4)?.toLowerCase();
    const region = parts.find((part) => part.length === 2 || /^\d{3}$/.test(part))?.toLowerCase();

    if (base === 'zh') {
      if (script === 'hant' || ['tw', 'hk', 'mo'].includes(region ?? '')) return 'zh-TW';
      if (script === 'hans' || ['cn', 'sg'].includes(region ?? '')) return 'zh-CN';
      return targetLanguage.startsWith('zh-') ? targetLanguage : 'zh-CN';
    }

    return canonical;
  } catch {
    throw new BrowserTranslationError('detection-failed');
  }
}

function languageBase(language: string): string {
  return language.split('-')[0].toLowerCase();
}

function isSameLanguage(sourceLanguage: string, targetLanguage: string): boolean {
  if (sourceLanguage.startsWith('zh-') && targetLanguage.startsWith('zh-')) {
    return sourceLanguage === targetLanguage;
  }
  return languageBase(sourceLanguage) === languageBase(targetLanguage);
}

function notifyListeners(
  listeners: Set<(status: BrowserTranslationStatus) => void>,
  status: BrowserTranslationStatus,
): void {
  listeners.forEach((listener) => listener(status));
}

async function detectLanguage(
  text: string,
  textHash: string,
  targetLanguage: SupportedLanguage,
  Detector: LanguageDetectorConstructor,
): Promise<{ language: string; confidence: number }> {
  const cachedDetection = detectionCache.get(textHash);
  if (cachedDetection) {
    return {
      language: normalizeDetectedLanguage(cachedDetection.detectedLanguage, targetLanguage),
      confidence: cachedDetection.confidence,
    };
  }

  let detector: LanguageDetectorInstance;
  try {
    detector = await Detector.create();
  } catch (error) {
    throw new BrowserTranslationError('detection-failed', error);
  }

  try {
    const results = await detector.detect(text);
    const bestResult = results[0];
    if (
      !bestResult ||
      typeof bestResult.detectedLanguage !== 'string' ||
      !Number.isFinite(bestResult.confidence) ||
      bestResult.confidence < 0 ||
      bestResult.confidence > 1 ||
      bestResult.confidence < MIN_CONFIDENCE
    ) {
      throw new BrowserTranslationError('low-confidence');
    }

    const detected = {
      detectedLanguage: bestResult.detectedLanguage,
      confidence: bestResult.confidence,
    };
    remember(detectionCache, textHash, detected);
    return {
      language: normalizeDetectedLanguage(detected.detectedLanguage, targetLanguage),
      confidence: detected.confidence,
    };
  } catch (error) {
    if (error instanceof BrowserTranslationError) throw error;
    throw new BrowserTranslationError('detection-failed', error);
  } finally {
    try {
      detector.destroy();
    } catch (error) {
      reportDestroyError(error);
    }
  }
}

function reportDestroyError(error: unknown): void {
  console.error('Browser translation resource cleanup failed', error);
}

function destroyTranslator(entry: TranslatorEntry): void {
  try {
    const result = entry.instance.destroy();
    if (result instanceof Promise) void result.catch(reportDestroyError);
  } catch (error) {
    reportDestroyError(error);
  }
}

async function getTranslator(
  key: string,
  listeners: Set<(status: BrowserTranslationStatus) => void>,
  Translator: TranslatorConstructor,
  sourceLanguage: string,
  targetLanguage: SupportedLanguage,
  availability: Availability,
): Promise<TranslatorEntry> {
  const cached = translatorCache.get(key);
  if (cached) {
    cached.lastUsed = Date.now();
    listeners.forEach((listener) => cached.listeners.add(listener));
    return cached;
  }

  const pendingCreation = translatorCreations.get(key);
  if (pendingCreation) {
    listeners.forEach((listener) => pendingCreation.listeners.add(listener));
    return pendingCreation.promise;
  }

  const creationListeners = new Set(listeners);
  const promise = Translator.create({
    sourceLanguage,
    targetLanguage,
    monitor: (monitor) => {
      monitor.addEventListener('downloadprogress', (event) => {
        const progressEvent = event as DownloadProgressEvent;
        const progress =
          typeof progressEvent.total === 'number' && progressEvent.total > 0
            ? Math.max(0, Math.min(1, progressEvent.loaded / progressEvent.total))
            : null;
        notifyListeners(creationListeners, { phase: 'downloading', progress });
      });
    },
  })
    .then((instance) => {
      const entry: TranslatorEntry = {
        instance,
        lastUsed: Date.now(),
        listeners: creationListeners,
      };
      translatorCache.set(key, entry);
      if (translatorCache.size > MAX_TRANSLATORS) {
        const oldest = [...translatorCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
        if (oldest && oldest[0] !== key) {
          translatorCache.delete(oldest[0]);
          destroyTranslator(oldest[1]);
        }
      }
      if (availability === 'downloadable' || availability === 'downloading') {
        notifyListeners(entry.listeners, { phase: 'downloading', progress: null });
      }
      return entry;
    })
    .catch((error: unknown) => {
      throw new BrowserTranslationError(
        availability === 'downloadable' || availability === 'downloading'
          ? 'model-download-failed'
          : 'translator-init-failed',
        error,
      );
    });
  const creation = { promise, listeners: creationListeners };
  translatorCreations.set(key, creation);
  void promise.then(
    () => {
      if (translatorCreations.get(key) === creation) translatorCreations.delete(key);
    },
    () => {
      if (translatorCreations.get(key) === creation) translatorCreations.delete(key);
    },
  );
  return promise;
}

async function performTranslation(
  text: string,
  textHash: string,
  targetLanguage: SupportedLanguage,
  listeners: Set<(status: BrowserTranslationStatus) => void>,
): Promise<BrowserTranslationResult> {
  const nativeGlobals = globalThis as NativeTranslationGlobals;
  if (!nativeGlobals.LanguageDetector || !nativeGlobals.Translator) {
    const missingApis = [
      !nativeGlobals.LanguageDetector && 'LanguageDetector',
      !nativeGlobals.Translator && 'Translator',
    ].filter((api): api is string => Boolean(api));
    throw new BrowserTranslationError(
      'unsupported-browser',
      new Error(`Missing browser-native translation APIs: ${missingApis.join(', ')}`),
    );
  }

  if (text.trim().length < 3) {
    throw new BrowserTranslationError('text-too-short');
  }

  notifyListeners(listeners, { phase: 'detecting' });
  const source = await detectLanguage(text, textHash, targetLanguage, nativeGlobals.LanguageDetector);
  if (isSameLanguage(source.language, targetLanguage)) {
    return {
      text,
      originalText: text,
      sourceLanguage: source.language,
      targetLanguage,
      alreadyInTargetLanguage: true,
    };
  }

  const cacheKey = `${textHash}:${source.language}:${targetLanguage}:${TRANSLATION_VERSION}`;
  const cachedTranslation = translationCache.get(cacheKey);
  if (cachedTranslation) return cachedTranslation;

  let availability: Availability;
  try {
    availability = await nativeGlobals.Translator.availability({
      sourceLanguage: source.language,
      targetLanguage,
    });
  } catch (error) {
    throw new BrowserTranslationError('unsupported-pair', error);
  }
  if (!['available', 'downloadable', 'downloading'].includes(availability)) {
    throw new BrowserTranslationError(
      'unsupported-pair',
      new Error(`Translator availability returned "${availability}" for ${source.language} to ${targetLanguage}`),
    );
  }

  notifyListeners(listeners, { phase: 'translating' });
  const translator = await getTranslator(
    `${source.language}:${targetLanguage}`,
    listeners,
    nativeGlobals.Translator,
    source.language,
    targetLanguage,
    availability,
  );
  try {
    const translatedText = await translator.instance.translate(text);
    const result: BrowserTranslationResult = {
      text: translatedText,
      originalText: text,
      sourceLanguage: source.language,
      targetLanguage,
      alreadyInTargetLanguage: false,
    };
    remember(translationCache, cacheKey, result);
    return result;
  } catch (error) {
    throw new BrowserTranslationError('translation-failed', error);
  } finally {
    listeners.forEach((listener) => translator.listeners.delete(listener));
  }
}

export function translateWithBrowserApis(
  text: string,
  targetLanguage: SupportedLanguage,
  onStatus: (status: BrowserTranslationStatus) => void = () => {},
): Promise<BrowserTranslationResult> {
  const textHash = hashText(text);
  const requestKey = `${textHash}:${targetLanguage}`;
  const activeRequest = inFlightTranslations.get(requestKey);
  if (activeRequest) {
    activeRequest.listeners.add(onStatus);
    return activeRequest.promise.finally(() => activeRequest.listeners.delete(onStatus));
  }

  const listeners = new Set([onStatus]);
  let entry: InFlightEntry;
  const promise = performTranslation(text, textHash, targetLanguage, listeners).finally(() => {
    if (inFlightTranslations.get(requestKey) === entry) inFlightTranslations.delete(requestKey);
  });
  entry = { listeners, promise };
  inFlightTranslations.set(requestKey, entry);
  return promise.finally(() => listeners.delete(onStatus));
}

export function clearBrowserTranslationCacheForTests(): void {
  translationCache.clear();
  detectionCache.clear();
  inFlightTranslations.clear();
  for (const entry of translatorCache.values()) destroyTranslator(entry);
  translatorCache.clear();
  translatorCreations.clear();
}
