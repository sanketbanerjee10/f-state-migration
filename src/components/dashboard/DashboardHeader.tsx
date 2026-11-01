import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { LogOut, RefreshCw, Settings, X } from 'lucide-react';
import { PageHeader } from '../PageHeader';

interface DashboardHeaderProps {
  userEmail?: string;
  sessionError?: boolean;
  notice?: string;
  onLogout: () => void;
  onRefresh: () => void;
  onDismissNotice: () => void;
  onLoginRedirect: () => void;
  activePage?: 'dashboard' | 'settings';
}

export function DashboardHeader({
  userEmail,
  sessionError,
  notice,
  onLogout,
  onRefresh,
  onDismissNotice,
  onLoginRedirect,
  activePage = 'dashboard',
}: DashboardHeaderProps) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader
        backLabel={t('common.navigation.backToApplication')}
        eyebrow={t('components.dashboard.workspace')}
        title={t('components.dashboard.title')}
        description={t('components.dashboard.subtitle')}
        actions={
          <>
            {activePage === 'settings' ? (
            <Link
              href="/leadership/dashboard"
              className="button button-quiet"
              data-testid="nav-dashboard"
              title={t('pages.leadership.returnDashboard')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>{t('common.navigation.applications')}</span>
            </Link>
            ) : (
              <Link
                href="/leadership/settings"
                className="button button-quiet"
                data-testid="nav-settings"
                title={t('components.dashboard.settingsTitle')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Settings size={15} />
              </Link>
            )}
            <button
              className="button button-quiet"
              type="button"
              onClick={onRefresh}
              data-testid="refresh-dashboard"
            >
              <RefreshCw size={14} /> {t('components.dashboard.refresh')}
            </button>
            <button
              className="button button-quiet"
              type="button"
              onClick={onLogout}
              data-testid="logout"
            >
              <LogOut size={15} /> {t('pages.leadership.signOut')}
            </button>
          </>
        }
      />

      {sessionError && (
        <div className="session-banner" role="alert" data-testid="session-expired">
          <strong>{t('pages.leadership.sessionExpired')}</strong> {t('pages.leadership.sessionSignInAgain')}{' '}
          <button
            className="button button-quiet"
            onClick={onLoginRedirect}
            data-testid="session-login"
          >
            {t('pages.leadership.signIn')}
          </button>
        </div>
      )}

      {notice && (
        <div className="notice-banner" role="status" data-testid="dashboard-notice">
          {notice}
          <button aria-label={t('components.dashboard.dismissNotice')} onClick={onDismissNotice}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
