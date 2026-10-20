import type { ReactNode } from 'react';

export function Field({ id, label, required, error, hint, detected, children }: {
  id: string; label: string; required?: boolean; error?: string; hint?: string; detected?: boolean; children: ReactNode;
}) {
  const labelContent = <>{label}{required && <span className="required" aria-hidden="true">*</span>}
    {detected && <span className="detected-note">Detected · please verify</span>}</>;
  return <div className="field">
    {id === 'screenshot-dropzone' || id === 'alliance-options'
      ? <div className="label">{labelContent}</div>
      : <label className="label" htmlFor={id}>{labelContent}</label>}
    {children}
    {hint && <p className="hint">{hint}</p>}
    {error && <p className="error-text" id={`${id}-error`} role="alert">{error}</p>}
  </div>;
}

export function FormSection({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <section className="section" aria-labelledby={`section-${number}`}>
    <h2 className="section-heading" id={`section-${number}`}><span className="section-number">{number}</span>{title}</h2>
    {children}
  </section>;
}
