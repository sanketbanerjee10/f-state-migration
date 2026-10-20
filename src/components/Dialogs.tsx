import { useEffect, useRef } from 'react';
import { Check, ShieldCheck } from 'lucide-react';

export function Modal({ title, children, onClose, actions, className }: {
  title: string; children: React.ReactNode; onClose: () => void; actions: React.ReactNode; className?: string;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  return <div className="dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={`dialog ${className || ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {children}
      <div className="dialog-actions">
        {actions}
      </div>
    </section>
  </div>;
}

export function SuccessState({ onReturn, reference }: { onReturn: () => void; reference: string }) {
  return <div className="success-panel" role="status" data-testid="success-state">
    <div className="success-mark"><Check size={22} /></div>
    <h2>Application received</h2>
    <p>Your application was committed for leadership review. Keep this reference for your records.</p>
    <div className="success-warning"><ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} />Application reference: <strong data-testid="application-reference">{reference}</strong></div>
    <button type="button" className="button button-primary" onClick={onReturn} data-testid="return-to-form">Return to form</button>
  </div>;
}
