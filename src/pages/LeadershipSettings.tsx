import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Sliders, Users, Sofa, LogOut, X } from 'lucide-react';
import {
  getListAdminAlliancesQueryKey,
  getGetAdminTierThresholdsQueryKey,
  getGetTierThresholdsQueryKey,
} from '@/lib/api-client';
import { useLeadershipSession } from '../lib/auth';
import { AllianceManagementSection } from '../components/dashboard/AllianceManagementSection';
import { TierThresholdsSection } from '../components/dashboard/TierThresholdsSection';
import { PageHeader } from '../components/PageHeader';

export function LeadershipSettings() {
  const { t } = useTranslation();
  const { session, loading, logout: authLogout } = useLeadershipSession();
  const [, setLocation] = useLocation();
  const client = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'alliances' | 'thresholds'>('all');
  const [notice, setNotice] = useState('');
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      setLocation('/leadership');
    }
  }, [loading, session, setLocation]);

  if (loading) {
    return (
      <main className="admin-shell">
        <div
          className="skeleton dashboard-skeleton"
          aria-label={t('pages.leadership.checkingSession')}
        />
      </main>
    );
  }

  if (!session) return null;

  const handleSessionError = (error: unknown) => {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('status' in error) ||
      (error.status !== 401 && error.status !== 403)
    ) {
      return;
    }
    setSessionError(true);
    void authLogout();
    setLocation('/leadership?expired=1');
  };

  const handleLogout = async () => {
    await authLogout();
    setLocation('/leadership');
  };

  const handleRefresh = () => {
    void client.invalidateQueries({ queryKey: getListAdminAlliancesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetAdminTierThresholdsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetTierThresholdsQueryKey() });
  };

  return (
    <main className="admin-shell" data-testid="leadership-settings">
      <PageHeader
        backHref="/leadership/dashboard"
        backLabel={t('common.navigation.applicationsDashboard')}
        backTestId="nav-back-dashboard"
        eyebrow={t('pages.leadership.portalSettings')}
        title={t('pages.leadership.settingsAndConfig')}
        description={t('pages.leadership.settingsDescription')}
        actions={
          <>
            <button
              className="button button-quiet"
              type="button"
              onClick={handleRefresh}
              data-testid="refresh-settings"
            >
              <RefreshCw size={14} /> {t('components.dashboard.refresh')}
            </button>
            <button
              className="button button-quiet"
              type="button"
              onClick={handleLogout}
              data-testid="logout"
            >
              <LogOut size={15} /> {t('pages.leadership.signOut')}
            </button>
          </>
        }
      />

      {/* Session Expired Banner */}
      {sessionError && (
        <div className="session-banner" role="alert" data-testid="session-expired">
          <strong>{t('pages.leadership.sessionExpired')}</strong> {t('pages.leadership.sessionSignInAgain')}{' '}
          <button
            className="button button-quiet"
            onClick={() => setLocation('/leadership')}
            data-testid="session-login"
          >
            {t('pages.leadership.signIn')}
          </button>
        </div>
      )}

      {/* Notice Banner */}
      {notice && (
        <div className="notice-banner" role="status" data-testid="settings-notice">
          {notice}
          <button aria-label={t('components.dashboard.dismissNotice')} onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: 12,
        }}
        role="tablist"
        aria-label={t('pages.leadership.settingsNavLabel')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`button ${activeTab === 'all' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setActiveTab('all')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          data-testid="tab-all-settings"
        >
          <Sliders size={14} />
          <span>{t('pages.leadership.allSettings')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'alliances'}
          className={`button ${activeTab === 'alliances' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setActiveTab('alliances')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          data-testid="tab-alliances"
        >
          <Users size={14} />
          <span>{t('pages.leadership.destinations')}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'thresholds'}
          className={`button ${activeTab === 'thresholds' ? 'button-primary' : 'button-secondary'}`}
          onClick={() => setActiveTab('thresholds')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          data-testid="tab-thresholds"
        >
          <Sofa size={14} />
          <span>{t('pages.leadership.tierThresholds')}</span>
        </button>
      </div>

      {/* Sections */}
      {(activeTab === 'all' || activeTab === 'alliances') && (
        <AllianceManagementSection
          enabled={!!session}
          onNotice={(msg) => setNotice(msg)}
          onError={handleSessionError}
        />
      )}

      {(activeTab === 'all' || activeTab === 'thresholds') && (
        <TierThresholdsSection
          enabled={!!session}
          onNotice={(msg) => setNotice(msg)}
          onError={handleSessionError}
        />
      )}
    </main>
  );
}
