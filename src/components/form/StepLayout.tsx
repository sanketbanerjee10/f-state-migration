import { ReactNode } from 'react';
import { Link } from 'wouter';
import { ArchiveX, Edit2, LoaderCircle, Search, X } from 'lucide-react';
import { StepProgress } from './StepProgress';
import { StepNavigation, type StepNavigationProps } from './StepNavigation';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { getTrackedApplications, TrackedApplicationMeta } from '../../lib/trackedApplications'
import { LanguageSelector } from '@/components/LanguageSelector';
import { useTranslation } from 'react-i18next';

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
  const { draft, isLoadingEdit, editApplicationDeleted, editApplicationError, cancelEdit } = useApplicationDraft();
  const { t } = useTranslation();

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
            {t('wizard.layout.signup')} <span style={{ color: '#657486' }}>/ STATE 565</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <LanguageSelector />
            <Link
              href="/track"
              className="button button-secondary"
              style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Search size={13} /> {t('wizard.layout.trackExisting')}
            </Link>
          </div>
        </div>

        <h1 className="form-title">
          {draft.editingApplicationId ? t('wizard.layout.editTitle') : t('wizard.layout.applyTitle')}
        </h1>
        <p className="intro">
          {draft.editingApplicationId
            ? t('wizard.layout.editDescription')
            : t('wizard.layout.applyDescription')}
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
                {t('wizard.layout.editingReference', { reference: draft.editingReference || draft.editingApplicationId })}
              </span>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="button button-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fca5a5' }}
            >
              <X size={12} /> {t('wizard.layout.exitEdit')}
            </button>
          </div>
        )}

        {isLoadingEdit && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: '#60a5fa', fontSize: '0.85rem' }}>
            <LoaderCircle size={14} className="spinner" /> {t('wizard.layout.loadingEdit')}
          </div>
        )}

        {editApplicationError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              marginTop: 12,
              padding: '14px 16px',
              border: `1px solid ${editApplicationDeleted ? 'rgba(245, 158, 11, 0.38)' : 'rgba(239, 68, 68, 0.38)'}`,
              borderRadius: 8,
              background: editApplicationDeleted ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            }}
          >
            {editApplicationDeleted && <ArchiveX size={22} style={{ flexShrink: 0, color: '#fbbf24', marginTop: 1 }} />}
            <div>
              <strong style={{ display: 'block', color: editApplicationDeleted ? '#fbbf24' : '#fca5a5', marginBottom: 4 }}>
                {editApplicationDeleted ? t('wizard.layout.deleted') : t('wizard.layout.couldNotLoad')}
              </strong>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.86rem', lineHeight: 1.55 }}>
                {editApplicationDeleted
                  ? t('wizard.layout.deletedDescription')
                  : editApplicationError}
              </p>
              {editApplicationDeleted && (
                <button type="button" className="button button-secondary" onClick={cancelEdit} style={{ marginTop: 10, fontSize: '0.8rem' }}>
                  {t('common.actions.startNew')}
                </button>
              )}
            </div>
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
        <div>
          {children}
        </div>

        {formError && (
          <p className="error-text" role="alert" style={{ marginTop: 12 }}>
            {formError}
          </p>
        )}

        {/* Bottom navigation */}
        {navigationProps && <StepNavigation {...navigationProps} />}

        <p className="hint wizard-privacy-note">
          {t('wizard.layout.privacy')}
        </p>
      </form>

      <footer className="footer-note">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <span>{t('wizard.layout.applicationPortal')}</span>
          <span>·</span>
          <Link href="/about" style={{ color: '#94c4f2', textDecoration: 'none' }}>
            {t('common.navigation.about')}
          </Link>
        </div>
        <div style={{ textAlign: 'center' }}>{t('wizard.layout.credit')}</div>
      </footer>
    </main>
  );
}
