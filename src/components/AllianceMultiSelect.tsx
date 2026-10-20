import type { Alliance } from '@workspace/api-client-react';

export function AllianceMultiSelect({ values, onChange, error, options, loading, loadError, onRetry }: {
  values: string[];
  onChange: (values: string[]) => void;
  error?: string;
  options: Alliance[];
  loading: boolean;
  loadError?: string;
  onRetry: () => void;
}) {
  const any = values.includes('any');
  const toggle = (id: string) => {
    if (id === 'any') { onChange(any ? [] : ['any']); return; }
    const next = values.filter(value => value !== 'any');
    onChange(next.includes(id) ? next.filter(value => value !== id) : [...next, id]);
  };
  return <>
    <div className="alliance-grid" role="group" aria-label="Preferred destination alliances" data-testid="alliance-options">
      <label className="alliance-choice">
        <input type="checkbox" checked={any} onChange={() => toggle('any')} data-testid="alliance-any" />
        <span><strong>Any alliance</strong><br /><span className="hint">No specific preference</span></span>
      </label>
      {options.map(option => <label className="alliance-choice" key={option.id}>
        <input type="checkbox" checked={values.includes(String(option.id))} onChange={() => toggle(String(option.id))} data-testid={`alliance-${option.id}`} />
        <span><strong>{option.tag}</strong> · {option.name}</span>
      </label>)}
    </div>
    {loading && <p className="hint" role="status" data-testid="alliances-loading">Loading active alliances…</p>}
    {!loading && !loadError && options.length === 0 && <p className="hint" data-testid="alliances-empty">No active migration destinations are available right now.</p>}
    {loadError && <div className="inline-error" role="alert" data-testid="alliances-error"><span>{loadError}</span><button className="button button-quiet" type="button" onClick={onRetry} data-testid="retry-alliance-load">Retry</button></div>}
    {error && <p className="error-text" role="alert">{error}</p>}
  </>;
}
