import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { Edit2, LoaderCircle, Search, X } from 'lucide-react';
import { StepProgress } from './StepProgress';
import { StepNavigation, type StepNavigationProps } from './StepNavigation';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';

export interface StepLayoutProps {
  children: ReactNode;
  navigationProps?: StepNavigationProps;
  onSubmit?: (e: React.FormEvent) => void;
  formError?: string;
}

export function StepLayout({
  children,
  navigationProps,
  onSubmit,
  formError,
}: StepLayoutProps) {
  const { draft, isLoadingEdit, cancelEdit } = useApplicationDraft();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    } else if (navigationProps?.onContinue) {
      navigationProps.onContinue();
    }
  };

  return (
    <main className="form-shell wizard-shell" data-testid="wizard-step-shell">
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <div className="eyebrow" style={{ margin: 0 }}>
            MIGRATION SIGNUP <span style={{ color: '#657486' }}>/ STATE 565</span>
          </div>

          <Link
            href="/track"
            className="button button-secondary"
            style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={13} /> Track Existing Applications
          </Link>
        </div>

        <h1 className="form-title">
          {draft.editingApplicationId ? 'Edit Migration Application' : 'Apply to Migrate to State 565'}
        </h1>
        <p className="intro">
          {draft.editingApplicationId
            ? 'Update your character details or combat stats and resubmit for leadership review.'
            : 'Welcome to State 565. Complete each step to submit your character details and combat stats to leadership.'}
        </p>

        {/* Edit mode active banner */}
        {draft.editingApplicationId && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(15, 23, 42, 0.6))',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: 6,
              padding: '10px 14px',
              marginTop: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Edit2 size={16} style={{ color: '#60a5fa' }} />
              <span style={{ fontSize: '0.86rem', color: '#cbd5e1' }}>
                Editing Reference: <strong style={{ color: '#93c5fd' }}>{draft.editingReference || draft.editingApplicationId}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="button button-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fca5a5' }}
            >
              <X size={12} /> Exit Edit Mode (Start New)
            </button>
          </div>
        )}

        {isLoadingEdit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#60a5fa', fontSize: '0.85rem' }}>
            <LoaderCircle size={14} className="spinner" /> Loading existing application data...
          </div>
        )}
      </header>

      <StepProgress />

      {/* Top navigation — quick access without scrolling */}
      {navigationProps && (
        <div className="wizard-top-nav">
          <StepNavigation {...navigationProps} compact />
        </div>
      )}

      <form className="form-content wizard-form-content" onSubmit={handleSubmit} noValidate>
        {children}

        {formError && (
          <p className="error-text" role="alert" style={{ marginTop: 12 }}>
            {formError}
          </p>
        )}

        {/* Bottom navigation */}
        {navigationProps && <StepNavigation {...navigationProps} />}

        <p className="hint wizard-privacy-note">
          Only the details you confirm are submitted. Screenshots and recognized stats remain private in your browser.
        </p>
      </form>

      <footer className="footer-note">
        STATE 565 · MIGRATION APPLICATION
        <span style={{ float: 'right' }}>Made With ❤️ By Sankeyyy</span>
      </footer>
    </main>
  );
}
