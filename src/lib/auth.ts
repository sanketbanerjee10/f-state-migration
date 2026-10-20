import { useEffect, useState } from 'react';
import { setAuthTokenGetter } from '@/lib/api-client';

let currentSessionToken: string | null = null;
setAuthTokenGetter(() => currentSessionToken);

export async function exchangeUuidToken(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/admin/auth/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token: token.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.authenticated) {
      currentSessionToken = data.sessionToken || null;
      return { success: true };
    }
    return { success: false, error: data.error || 'Invalid or revoked leadership access token.' };
  } catch {
    return { success: false, error: 'Failed to verify leadership token. Check your network connection.' };
  }
}

export async function checkLeadershipSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/auth/session', {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return Boolean(data.authenticated);
    }
    return false;
  } catch {
    return false;
  }
}

export async function logoutLeadership(): Promise<void> {
  currentSessionToken = null;
  try {
    await fetch('/api/admin/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Ignore network error on logout
  }
}

export interface LeadershipSession {
  authenticated: boolean;
  user: {
    email: string;
    role: string;
  };
}

export function useLeadershipSession() {
  const [session, setSession] = useState<LeadershipSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const setAuthenticated = (isValid: boolean) => {
    if (isValid) {
      setSession({
        authenticated: true,
        user: {
          email: 'Leadership Authorized',
          role: 'Admin',
        },
      });
    } else {
      setSession(null);
    }
  };

  useEffect(() => {
    let alive = true;

    // Check if URL has a fragment token (#<secret-token>)
    const hash = window.location.hash.slice(1).trim();
    if (hash) {
      // Immediately clean browser history so secret token is not exposed in URL
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      exchangeUuidToken(hash).then((result) => {
        if (!alive) return;
        setAuthenticated(result.success);
        setLoading(false);
      });
      return () => {
        alive = false;
      };
    }

    // Otherwise check existing cookie session
    checkLeadershipSession().then((isValid) => {
      if (!alive) return;
      setAuthenticated(isValid);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  const logout = async () => {
    await logoutLeadership();
    setSession(null);
  };

  return {
    session,
    loading,
    configured: true,
    logout,
    exchangeToken: async (token: string) => {
      const result = await exchangeUuidToken(token);
      if (result.success) {
        setAuthenticated(true);
      }
      return result;
    },
  };
}

