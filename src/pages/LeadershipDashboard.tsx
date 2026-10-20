import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetAdminOverviewQueryKey,
  getListAdminApplicationsQueryKey,
  getListAdminAlliancesQueryKey,
  getGetAdminTierThresholdsQueryKey,
  getGetAdminApplicationQueryKey,
} from '@workspace/api-client-react';
import { useLeadershipSession } from '../lib/auth';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { ApplicationsSection } from '../components/dashboard/ApplicationsSection';
import { ApplicationDetailDrawer } from '../components/dashboard/ApplicationDetailDrawer';

export function LeadershipDashboard() {
  const { session, loading, logout: authLogout } = useLeadershipSession();
  const [, setLocation] = useLocation();
  const client = useQueryClient();

  const [selectedId, setSelectedId] = useState('');
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
          aria-label="Checking leadership session"
        />
      </main>
    );
  }

  if (!session) return null;

  const handleSessionError = () => {
    setSessionError(true);
    void authLogout();
    setLocation('/leadership?expired=1');
  };

  const handleLogout = async () => {
    await authLogout();
    setLocation('/leadership');
  };

  const handleRefresh = () => {
    void client.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
    void client.invalidateQueries({ queryKey: getListAdminApplicationsQueryKey() });
    void client.invalidateQueries({ queryKey: getListAdminAlliancesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetAdminTierThresholdsQueryKey() });
    if (selectedId) {
      void client.invalidateQueries({
        queryKey: getGetAdminApplicationQueryKey(selectedId),
      });
    }
  };

  return (
    <main className="admin-shell" data-testid="leadership-dashboard">
      <DashboardHeader
        userEmail={session?.user?.email}
        sessionError={sessionError}
        notice={notice}
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        onDismissNotice={() => setNotice('')}
        onLoginRedirect={() => setLocation('/leadership')}
      />

      <DashboardOverview enabled={!!session} />

      <ApplicationsSection
        enabled={!!session}
        selectedId={selectedId}
        onSelectApplication={(id) => setSelectedId(id)}
        onError={handleSessionError}
      />

      {selectedId && (
        <ApplicationDetailDrawer
          applicationId={selectedId}
          onClose={() => setSelectedId('')}
          onNotice={(msg) => setNotice(msg)}
          onSessionError={handleSessionError}
        />
      )}
    </main>
  );
}
