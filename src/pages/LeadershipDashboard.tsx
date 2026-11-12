import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useLeadershipSession } from '../lib/auth';
import { PageLoader } from '../components/PageLoader';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DashboardOverview } from '../components/dashboard/DashboardOverview';
import { ApplicationsSection } from '../components/dashboard/ApplicationsSection';
import { ApplicationDetailDrawer } from '../components/dashboard/ApplicationDetailDrawer';

function getApplicationId(location: string) {
  const routeUrl = new URL(location, window.location.origin);
  const routeApplicationId = routeUrl.searchParams.get('applicationId');
  if (routeApplicationId) return routeApplicationId;

  if (routeUrl.pathname === window.location.pathname) {
    return new URLSearchParams(window.location.search).get('applicationId') ?? '';
  }

  return '';
}

export function LeadershipDashboard() {
  const { session, loading, logout: authLogout } = useLeadershipSession();
  const [location, setLocation] = useLocation();

  const [selectedId, setSelectedId] = useState(() => getApplicationId(location));
  const [notice, setNotice] = useState('');
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    const syncApplicationId = () => setSelectedId(getApplicationId(location));
    syncApplicationId();
    window.addEventListener('popstate', syncApplicationId);
    return () => window.removeEventListener('popstate', syncApplicationId);
  }, [location]);

  useEffect(() => {
    if (!loading && !session) {
      setLocation('/leadership');
    }
  }, [loading, session, setLocation]);

  if (loading) return <PageLoader />;

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

  const updateApplicationId = (applicationId: string) => {
    const url = new URL(location, window.location.origin);
    if (url.pathname === window.location.pathname && !url.search) {
      url.search = window.location.search;
    }
    if (applicationId) {
      url.searchParams.set('applicationId', applicationId);
    } else {
      url.searchParams.delete('applicationId');
    }
    setLocation(`${url.pathname}${url.search}${url.hash}`);
    setSelectedId(applicationId);
  };

  return (
    <main className="admin-shell" data-testid="leadership-dashboard">
      <DashboardHeader
        userEmail={session?.user?.email}
        sessionError={sessionError}
        notice={notice}
        onLogout={handleLogout}
        onDismissNotice={() => setNotice('')}
        onLoginRedirect={() => setLocation('/leadership')}
      />

      <DashboardOverview enabled={!!session} />

      <ApplicationsSection
        enabled={!!session}
        selectedId={selectedId}
        onSelectApplication={(id) => updateApplicationId(id)}
        onError={handleSessionError}
      />

      {selectedId && (
        <ApplicationDetailDrawer
          applicationId={selectedId}
          onClose={() => updateApplicationId('')}
          onNotice={(msg) => setNotice(msg)}
          onSessionError={handleSessionError}
        />
      )}
    </main>
  );
}
