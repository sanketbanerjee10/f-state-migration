import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Languages, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLanguageMetadata, type SupportedLanguage } from '../i18n/languages';
import { resolveSupportedLanguage } from '../i18n';
import {
  BrowserTranslationError,
  translateWithBrowserApis,
  type BrowserTranslationErrorCode,
  type BrowserTranslationResult,
  type BrowserTranslationStatus,
} from '../lib/browserTranslation';

interface FieldTranslationState {
  result: BrowserTranslationResult | null;
  status: BrowserTranslationStatus | null;
  error: BrowserTranslationErrorCode | null;
  visible: boolean;
}

function getLanguageName(language: string, targetLanguage: SupportedLanguage): string {
  try {
    return new Intl.DisplayNames([targetLanguage], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}

export function useFieldTranslation(text: string): {
  action: ReactNode;
  copyAction: ReactNode;
  panel: ReactNode;
  hasError: boolean;
  errorRevision: number;
} {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.language || i18n.resolvedLanguage || 'en';
  const targetLanguage = resolveSupportedLanguage(activeLanguage);
  const [errorRevision, setErrorRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<number | null>(null);
  const [state, setState] = useState<FieldTranslationState>({
    result: null,
    status: null,
    error: null,
    visible: false,
  });
  const generation = useRef(0);
  const currentRequestKey = useRef('');
  currentRequestKey.current = `${text}\u0000${targetLanguage}`;

  useEffect(() => {
    generation.current += 1;
    setState({ result: null, status: null, error: null, visible: false });
    return () => {
      generation.current += 1;
    };
  }, [text, targetLanguage]);

  useEffect(() => () => {
    if (copiedTimeout.current !== null) window.clearTimeout(copiedTimeout.current);
  }, []);

  const currentResult = Boolean(
    state.result &&
    state.result?.originalText === text &&
    state.result.targetLanguage === targetLanguage,
  );

  const handleTranslate = async () => {
    if (currentResult) {
      setState((previous) => ({ ...previous, visible: !previous.visible }));
      return;
    }

    const requestId = generation.current;
    const requestKey = currentRequestKey.current;
    setState((previous) => ({ ...previous, status: { phase: 'detecting' }, error: null }));
    try {
      const result = await translateWithBrowserApis(text, targetLanguage, (status) => {
        if (generation.current === requestId && currentRequestKey.current === requestKey) {
          setState((previous) => ({ ...previous, status }));
        }
      });
      if (generation.current === requestId && currentRequestKey.current === requestKey) {
        setState({ result, status: null, error: null, visible: true });
      }
    } catch (error) {
      if (generation.current !== requestId || currentRequestKey.current !== requestKey) return;
      const code =
        error instanceof BrowserTranslationError
          ? error.code
          : 'translation-failed';
      // console.log('[State 565] Full on-device translation error', error, {
      //   code,
      //   cause: error instanceof Error ? error.cause : undefined,
      //   targetLanguage,
      //   textLength: text.length,
      //   secureContext: globalThis.isSecureContext,
      //   userAgent: navigator.userAgent,
      //   languageDetectorAvailable: 'LanguageDetector' in globalThis,
      //   translatorAvailable: 'Translator' in globalThis,
      // });
      setState((previous) => ({ ...previous, status: null, error: code }));
      setErrorRevision((revision) => revision + 1);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copiedTimeout.current !== null) window.clearTimeout(copiedTimeout.current);
      copiedTimeout.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimeout.current = null;
      }, 1600);
    } catch (error) {
      console.error('[State 565] Could not copy application text', error);
    }
  };

  const sourceName = state.result
    ? getLanguageName(state.result.sourceLanguage, targetLanguage)
    : '';
  const targetName = getLanguageMetadata(targetLanguage).nativeName;

  if (!text.trim()) {
    return { action: null, copyAction: null, panel: null, hasError: false, errorRevision };
  }

  const action = (
      <button
        type="button"
        className={`button field-translation-action${state.error ? ' has-error' : ''}`}
        onClick={() => void handleTranslate()}
        disabled={state.status !== null}
        title={
          currentResult
            ? t(state.visible ? 'wizard.preferences.translation.hide' : 'wizard.preferences.translation.show')
            : t('wizard.preferences.translation.translate')
        }
        aria-label={
          currentResult
            ? t(state.visible ? 'wizard.preferences.translation.hide' : 'wizard.preferences.translation.show')
            : t('wizard.preferences.translation.translate')
        }
      >
        {state.status ? (
          <LoaderCircle
            size={14}
            strokeWidth={2.25}
            aria-hidden="true"
            className="field-translation-spinner"
            style={{ display: 'block', width: 14, height: 14, flex: 'none', stroke: 'currentColor' }}
          />
        ) : (
          <Languages
            size={14}
            strokeWidth={2.25}
            aria-hidden="true"
            style={{ display: 'block', width: 14, height: 14, flex: 'none', stroke: 'currentColor' }}
          />
        )}
      </button>
  );

  const copyAction = (
    <button
      type="button"
      className="button field-translation-action field-translation-copy"
      onClick={() => void handleCopy()}
      title={t(copied ? 'common.actions.copied' : 'common.actions.copy')}
      aria-label={t(copied ? 'common.actions.copied' : 'common.actions.copy')}
    >
      {copied ? (
        <Check
          size={14}
          strokeWidth={2.25}
          aria-hidden="true"
          style={{ display: 'block', width: 14, height: 14, flex: 'none', stroke: 'currentColor' }}
        />
      ) : (
        <Copy
          size={14}
          strokeWidth={2.25}
          aria-hidden="true"
          style={{ display: 'block', width: 14, height: 14, flex: 'none', stroke: 'currentColor' }}
        />
      )}
    </button>
  );

  const panel = (
    <div className="field-translation">
      {state.status && (
        <p className="field-translation-status" role="status" aria-live="polite">
          {state.status.phase === 'detecting' && t('wizard.preferences.translation.detecting')}
          {state.status.phase === 'translating' && t('wizard.preferences.translation.translating')}
          {state.status.phase === 'downloading' && (
            <>
              {t('wizard.preferences.translation.downloading')}
              {state.status.progress !== null && ` ${Math.round(state.status.progress * 100)}%`}
            </>
          )}
        </p>
      )}

      {currentResult && state.visible && state.result && (
        <div className="field-translation-result" aria-live="polite">
          <p>{state.result.text}</p>
          <span>
            {state.result.alreadyInTargetLanguage
              ? t('wizard.preferences.translation.alreadyInLanguage', { language: targetName })
              : t('wizard.preferences.translation.languagePair', {
                  source: sourceName,
                  target: targetName,
                })}
          </span>
        </div>
      )}
    </div>
  );

  return { action, copyAction, panel, hasError: state.error !== null, errorRevision };
}
