import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Sliders, Users, Sofa, ShieldCheck, LogOut, X } from 'lucide-react';
import {
  getListAdminAlliancesQueryKey,
  getGetAdminTierThresholdsQueryKey,
  getGetTierThresholdsQueryKey,
} from '@workspace/api-client-react';
import { useLeadershipSession } from '../lib/auth';
import { AllianceManagementSection } from '../components/dashboard/AllianceManagementSection';
import { TierThresholdsSection } from '../components/dashboard/TierThresholdsSection';

export function LeadershipSettings() {
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
    void client.invalidateQueries({ queryKey: getListAdminAlliancesQueryKey() });
    void client.invalidateQueries({ queryKey: getGetAdminTierThresholdsQueryKey() });
    void client.invalidateQueries({ queryKey: getGetTierThresholdsQueryKey() });
  };

  return (
    <main className="admin-shell" data-testid="leadership-settings">
      {/* Top Header */}
      <header className="admin-header">
        <Link href="/" className="brand-mark">
          <span className="brand-icon">
            <ShieldCheck size={18} />
          </span>
          <span>
            <strong>STATE 565</strong>
            <small>SETTINGS & CONFIGURATION</small>
          </span>
        </Link>
        <div className="admin-header-actions">
          <Link
            href="/leadership/dashboard"
            className="button button-quiet"
            data-testid="nav-back-dashboard"
            title="Return to Applications Dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <ArrowLeft size={15} />
            <span>Applications Dashboard</span>
          </Link>
          {/* <span className="signed-in" data-testid="signed-in-email">
            {session?.user?.email || 'Leadership Authorized'}
          </span> */}
          <button
            className="button button-quiet"
            type="button"
            onClick={handleLogout}
            data-testid="logout"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {/* Session Expired Banner */}
      {sessionError && (
        <div className="session-banner" role="alert" data-testid="session-expired">
          <strong>Leadership session expired.</strong> Sign in again to continue.{' '}
          <button
            className="button button-quiet"
            onClick={() => setLocation('/leadership')}
            data-testid="session-login"
          >
            Sign in
          </button>
        </div>
      )}

      {/* Notice Banner */}
      {notice && (
        <div className="notice-banner" role="status" data-testid="settings-notice">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Heading & Controls */}
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">PORTAL SETTINGS</p>
          <h1>Alliance & Tier Configuration</h1>
          <p>Configure destination alliances and migration scoring brackets.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            className="button"
            type="button"
            onClick={handleRefresh}
            data-testid="refresh-settings"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

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
        aria-label="Settings navigation"
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
          <span>All Settings</span>
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
          <span>Destination Alliances</span>
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
          <span>Tier Scoring Thresholds</span>
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
