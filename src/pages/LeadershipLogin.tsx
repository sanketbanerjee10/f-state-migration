import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useLeadershipSession } from '../lib/auth';

export function LeadershipLogin() {
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
        <div className="skeleton auth-skeleton" aria-label="Checking leadership session" />
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
      setError(result.error || 'Access token could not be verified. Check your link or key and try again.');
    }
  };

  return (
    <main className="auth-shell" data-testid="leadership-login">
      <Link href="/" className="back-link" data-testid="link-public-application">
        <ArrowLeft size={15} /> Return to application
      </Link>
      <section className="auth-card">
        <div className="auth-mark">
          <ShieldCheck size={22} />
        </div>
        <p className="eyebrow">STATE 565 / LEADERSHIP</p>
        <h1>Review access</h1>
        <p className="auth-copy">
          Access the leadership review dashboard using your private access link or secret UUID credential. No signup or account creation required.
        </p>
        {expired && (
          <div className="notice-error" role="status" data-testid="session-expired-message">
            Your leadership session ended. Use your private link or enter your access token again to continue reviewing applications.
          </div>
        )}
        <form onSubmit={handleTokenSubmit}>
          <label className="label" htmlFor="leadership-token">
            Leadership access token or UUID
          </label>
          <input
            className="control auth-control"
            id="leadership-token"
            type="text"
            autoComplete="off"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Paste your secret UUID or token"
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
                <LoaderCircle size={15} className="spin" /> Verifying…
              </>
            ) : (
              <>
                <KeyRound size={15} /> Authenticate
              </>
            )}
          </button>
        </form>
        <p className="privacy-note">
          Leadership access only. Sessions expire automatically and can be revoked by state administration.
        </p>
      </section>
    </main>
  );
}
