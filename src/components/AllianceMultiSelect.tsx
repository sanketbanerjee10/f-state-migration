import type { Alliance } from '@/lib/api-client';
import { useTranslation } from 'react-i18next';

export function AllianceMultiSelect({ values, onChange, error, options, loading, loadError, onRetry }: {
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  options: Alliance[];
  loading: boolean;
  loadError?: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const any = values.includes('any');
  const toggle = (id: string) => {
    if (id === 'any') { onChange(any ? [] : ['any']); return; }
    const next = values.filter(value => value !== 'any');
    onChange(next.includes(id) ? next.filter(value => value !== id) : [...next, id]);
  };
  return <>
    <div className="alliance-grid" role="group" aria-label={t('components.alliance.label')} data-testid="alliance-options">
      <label className="alliance-choice">
        <input type="checkbox" checked={any} onChange={() => toggle('any')} data-testid="alliance-any" />
        <span><strong>{t('components.alliance.any')}</strong></span>
      </label>
      {options.map(option => <label className="alliance-choice" key={option.id}>
        <input type="checkbox" checked={values.includes(String(option.id))} onChange={() => toggle(String(option.id))} data-testid={`alliance-${option.id}`} />
        <span><strong>{option.tag}</strong> · {option.name}</span>
      </label>)}
    </div>
    {loading && <p className="hint" role="status" data-testid="alliances-loading">{t('components.alliance.loading')}</p>}
    {!loading && !loadError && options.length === 0 && <p className="hint" data-testid="alliances-empty">{t('components.alliance.empty')}</p>}
    {loadError && <div className="inline-error" role="alert" data-testid="alliances-error"><span>{loadError}</span><button className="button button-quiet" type="button" onClick={onRetry} data-testid="retry-alliance-load">{t('common.actions.retry')}</button></div>}
    {error && <p className="error-text" role="alert">{error}</p>}
  </>;
}
