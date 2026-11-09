import { Search, Sparkles } from 'lucide-react';
import { Link, useParams, useSearch } from 'wouter';
import { useTranslation } from 'react-i18next';
import { CelebrationModal } from '../../components/CelebrationModal';
import { PageHeader } from '../../components/PageHeader';
import { useApplicationDetails } from '../../lib/applicationDetailsCache';
import { getReferenceCode } from '../../components/application-tracker/trackerUtils';
import { NotFound } from '../NotFound';

function SubmittedApplicationLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <main className="form-shell wizard-shell">
      <PageHeader
        backHref="/"
        backLabel=""
        eyebrow={<><span style={{ color: '#657486' }}>{t('pages.about565.state')} /</span> {t('pages.confirmation.breadcrumb')}</>}
        actions={
          <Link
            href="/track"
            className="button button-secondary language-selector-companion"
            style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={13} /> {t('wizard.layout.trackExisting')}
          </Link>
        }
      />

      {children}

      <footer className="footer-note">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
          <span>{t('wizard.layout.applicationPortal')}</span>
          <span>·</span>
          <Link href="/about" style={{ color: '#94c4f2', textDecoration: 'none' }}>
            {t('common.navigation.about')}
          </Link>
          <span>·</span>
          <Link href="/game" style={{ color: '#94c4f2', textDecoration: 'none' }}>
            Mini game
          </Link>
        </div>
        <div style={{ textAlign: 'center' }}>{t('wizard.layout.credit')}</div>
      </footer>
    </main>
  );
}

export function SubmittedApplicationPage() {
  const { id = '' } = useParams<{ id?: string }>();
  const search = useSearch();
  const { t } = useTranslation();
  const applicationQuery = useApplicationDetails(id);

  if (applicationQuery.isLoading) {
    return (
      <SubmittedApplicationLayout>
        <div className="confirmation-loading" role="status" aria-live="polite">
          <div className="confirmation-loading__art" aria-hidden="true">
            <span className="confirmation-loading__orbit confirmation-loading__orbit--outer" />
            <span className="confirmation-loading__orbit confirmation-loading__orbit--inner" />
            <span className="confirmation-loading__satellite confirmation-loading__satellite--one" />
            <span className="confirmation-loading__satellite confirmation-loading__satellite--two" />
            <span className="confirmation-loading__core">
              <Sparkles size={25} />
            </span>
          </div>
          <h2>{t('pages.confirmation.loadingTitle')}</h2>
          <p>{t('pages.confirmation.loadingDescription')}</p>
        </div>
      </SubmittedApplicationLayout>
    );
  }

  const application = applicationQuery.data;
  if (
    applicationQuery.isError ||
    !application ||
    application.id.toLowerCase() !== id.toLowerCase()
  ) {
    return <NotFound />;
  }

  const isUpdate = new URLSearchParams(search).get('updated') === '1';

  return (
    <SubmittedApplicationLayout>
      <CelebrationModal
        isOpen
        onClose={() => undefined}
        applicationId={application.id}
        applicationReference={getReferenceCode(application.id)}
        isUpdate={isUpdate}
      />
    </SubmittedApplicationLayout>
  );
}
