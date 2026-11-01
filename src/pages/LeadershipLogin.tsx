import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useLeadershipSession } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';

export function LeadershipLogin() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { session, loading, exchangeToken } = useLeadershipSession();
  const [tokenInput, setTokenInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const expired = new URLSearchParams(window.location.search).get('expired') === '1';

  useEffect(() => {
    if (session) setLocation('/leadership/dashboard');
  }, [session, setLocation]);

  if (loading) {
    return (
      <main className="auth-shell">
        <div className="skeleton auth-skeleton" aria-label={t('pages.leadership.checkingSession')} />
      </main>
    );
  }

  if (session) return null;

  const handleTokenSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!tokenInput.trim() || pending) return;

    setPending(true);
    setError('');

    const result = await exchangeToken(tokenInput.trim());
    setPending(false);

    if (result.success) {
      setLocation('/leadership/dashboard');
    } else {
      setError(result.error || t('pages.leadership.tokenVerifyError'));
    }
  };

  return (
    <main className="auth-shell" data-testid="leadership-login">
      <PageHeader
          className="auth-page-header"
          backLabel={t('pages.leadership.loginReturn')}
          backTestId="link-public-application"
          eyebrow={t('pages.leadership.loginEyebrow')}
          title={t('pages.leadership.reviewAccess')}
          description={t('pages.leadership.loginDescription')}
          descriptionClassName="auth-copy"
        />
      <section className="auth-card">
        <div className="auth-mark">
          <ShieldCheck size={22} />
        </div>
        {expired && (
          <div className="notice-error" role="status" data-testid="session-expired-message">
            {t('pages.leadership.loginExpired')}
          </div>
        )}
        <form onSubmit={handleTokenSubmit}>
          <label className="label" htmlFor="leadership-token">
            {t('pages.leadership.tokenLabel')}
          </label>
          <input
            className="control auth-control"
            id="leadership-token"
            type="text"
            autoComplete="off"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder={t('pages.leadership.tokenPlaceholder')}
            required
            data-testid="leadership-token-input"
          />
          {error && (
            <p className="error-text" role="alert" data-testid="login-error">
              {error}
            </p>
          )}
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={pending || !tokenInput.trim()}
            data-testid="login-submit"
          >
            {pending ? (
              <>
                <LoaderCircle size={15} className="spin" /> {t('pages.leadership.verifying')}
              </>
            ) : (
              <>
                <KeyRound size={15} /> {t('pages.leadership.authenticate')}
              </>
            )}
          </button>
        </form>
        <p className="privacy-note">
          {t('pages.leadership.loginPrivacy')}
        </p>
      </section>
    </main>
  );
}
