import { Link } from 'wouter';
import { LogOut, RefreshCw, Settings, ShieldCheck, X } from 'lucide-react';

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
  return (
    <>
      <header className="admin-header">
        <Link href="/" className="brand-mark">
          <span className="brand-icon">
            <ShieldCheck size={18} />
          </span>
          <span>
            <strong>STATE 565</strong>
            <small>MIGRATION REVIEW</small>
          </span>
        </Link>
        <div className="admin-header-actions">
          {activePage === 'settings' ? (
            <Link
              href="/leadership/dashboard"
              className="button button-quiet"
              data-testid="nav-dashboard"
              title="Back to Applications Dashboard"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Applications</span>
            </Link>
          ) : (
            <Link
              href="/leadership/settings"
              className="button button-quiet"
              data-testid="nav-settings"
              title="Portal Settings (Alliances & Tier Thresholds)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Settings size={15} />
            </Link>
          )}
          {/* <span className="signed-in" data-testid="signed-in-email">
            {userEmail || 'Leadership Authorized'}
          </span> */}
          <button
            className="button button-quiet"
            type="button"
            onClick={onLogout}
            data-testid="logout"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {sessionError && (
        <div className="session-banner" role="alert" data-testid="session-expired">
          <strong>Leadership session expired.</strong> Sign in again to continue.{' '}
          <button
            className="button button-quiet"
            onClick={onLoginRedirect}
            data-testid="session-login"
          >
            Sign in
          </button>
        </div>
      )}

      {notice && (
        <div className="notice-banner" role="status" data-testid="dashboard-notice">
          {notice}
          <button aria-label="Dismiss notice" onClick={onDismissNotice}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">LEADERSHIP WORKSPACE</p>
          <h1>Migration applications</h1>
          <p>Review requests and manage State 565 destinations.</p>
        </div>
        <button
          className="button"
          type="button"
          onClick={onRefresh}
          data-testid="refresh-dashboard"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
    </>
  );
}
