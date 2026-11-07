// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getGetAdminApplicationQueryKey,
  getGetAdminOverviewQueryKey,
  getGetAdminTierThresholdsQueryKey,
  getListAdminAlliancesQueryKey,
  getListAdminApplicationsQueryKey,
} from '@/lib/api-client';
import { LeadershipDashboard } from '@/pages/LeadershipDashboard';
import { useLeadershipSession } from '@/lib/auth';

const mockRouter = vi.hoisted(() => ({
  location: '/leadership/dashboard',
  navigations: [] as string[],
}));

vi.mock('wouter', () => ({
  useLocation: () =>
    [
      mockRouter.location,
      (location: string) => {
        mockRouter.location = location;
        mockRouter.navigations.push(location);
      },
    ] as const,
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'en', resolvedLanguage: 'en', changeLanguage: vi.fn() },
    }),
  };
});

vi.mock('@/components/dashboard/DashboardOverview', () => ({
  DashboardOverview: ({ enabled }: { enabled?: boolean }) =>
    createElement('section', {
      'data-testid': 'dashboard-overview',
      'data-enabled': String(enabled),
    }),
}));

vi.mock('@/components/dashboard/ApplicationsSection', () => ({
  ApplicationsSection: ({
    enabled,
    onSelectApplication,
    onError,
  }: {
    enabled?: boolean;
    onSelectApplication: (id: string) => void;
    onError: () => void;
  }) =>
    createElement(
      'section',
      { 'data-testid': 'applications-section', 'data-enabled': String(enabled) },
      createElement(
        'button',
        { 'data-testid': 'select-application', onClick: () => onSelectApplication('app-42') },
        'Select application',
      ),
      createElement(
        'button',
        { 'data-testid': 'expire-session', onClick: onError },
        'Expire session',
      ),
    ),
}));

vi.mock('@/components/dashboard/ApplicationDetailDrawer', () => ({
  ApplicationDetailDrawer: ({
    applicationId,
    onClose,
  }: {
    applicationId: string;
    onClose: () => void;
  }) =>
    createElement(
      'aside',
      { 'data-testid': 'application-drawer', 'data-application-id': applicationId },
      createElement('button', { 'data-testid': 'close-drawer', onClick: onClose }, 'Close'),
    ),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let queryClient: QueryClient | null = null;

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function mount(element: React.ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root?.render(
      createElement(QueryClientProvider, { client: queryClient! }, element),
    );
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function click(testId: string) {
  const button = container?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  if (!button) throw new Error(`Missing button: ${testId}`);
  await act(async () => button.click());
}

function SessionProbe({ onSession }: { onSession: (value: ReturnType<typeof useLeadershipSession>) => void }) {
  const session = useLeadershipSession();
  onSession(session);
  return null;
}

beforeEach(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn());
  window.history.replaceState({}, '', '/leadership/dashboard');
  mockRouter.location = '/leadership/dashboard';
  mockRouter.navigations.length = 0;
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  queryClient?.clear();
  container?.remove();
  root = null;
  container = null;
  queryClient = null;
  vi.unstubAllGlobals();
});

describe('Leadership dashboard and session flows', () => {
  it('LEAD-01 shows a session-checking placeholder while session status is loading', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    await mount(createElement(LeadershipDashboard));

    expect(container?.querySelector('[aria-label="pages.leadership.checkingSession"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="leadership-dashboard"]')).toBeNull();

    pending.resolve(response({ authenticated: false }));
    await settle();
  });

  it('LEAD-02 redirects unauthenticated visitors without rendering protected content', async () => {
    const pending = deferred<Response>();
    vi.mocked(fetch).mockReturnValue(pending.promise);

    await mount(createElement(LeadershipDashboard));
    pending.resolve(response({ authenticated: false }));
    await settle();

    expect(mockRouter.navigations).toContain('/leadership');
    expect(container?.querySelector('[data-testid="leadership-dashboard"]')).toBeNull();
  });

  it('LEAD-03 enables the overview and applications for an authenticated session', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ authenticated: true }));

    await mount(createElement(LeadershipDashboard));
    await settle();

    expect(container?.querySelector('[data-testid="leadership-dashboard"]')).not.toBeNull();
    expect(container?.querySelector('[data-testid="dashboard-overview"]')?.getAttribute('data-enabled')).toBe('true');
    expect(container?.querySelector('[data-testid="applications-section"]')?.getAttribute('data-enabled')).toBe('true');
  });

  it('LEAD-04 invalidates dashboard queries and the selected application on refresh', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ authenticated: true }));
    await mount(createElement(LeadershipDashboard));
    await settle();

    const invalidate = vi.spyOn(queryClient!, 'invalidateQueries');
    await click('select-application');
    await click('refresh-dashboard');

    const invalidatedKeys = invalidate.mock.calls.map(([filters]) => filters.queryKey);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        getGetAdminOverviewQueryKey(),
        getListAdminApplicationsQueryKey(),
        getListAdminAlliancesQueryKey(),
        getGetAdminTierThresholdsQueryKey(),
        getGetAdminApplicationQueryKey('app-42'),
      ]),
    );
  });

  it('LEAD-05 opens the selected application drawer and closes it on request', async () => {
    vi.mocked(fetch).mockResolvedValue(response({ authenticated: true }));
    await mount(createElement(LeadershipDashboard));
    await settle();

    await click('select-application');
    expect(container?.querySelector('[data-testid="application-drawer"]')?.getAttribute('data-application-id')).toBe('app-42');

    await click('close-drawer');
    expect(container?.querySelector('[data-testid="application-drawer"]')).toBeNull();
  });

  it('LEAD-06 logs out and navigates to the expired-session login route on a session error', async () => {
    vi.mocked(fetch).mockImplementation(async (input, init) => {
      if (String(input).includes('/auth/session')) return response({ authenticated: true });
      if (String(input).includes('/auth/logout')) return response({});
      throw new Error(`Unexpected request: ${String(input)} ${init?.method ?? 'GET'}`);
    });

    await mount(createElement(LeadershipDashboard));
    await settle();
    await click('expire-session');
    await settle();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/admin/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(mockRouter.navigations).toContain('/leadership?expired=1');
  });

  it('LEAD-07 clears the auth session and returns to the leadership login route on logout', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes('/auth/session')) return response({ authenticated: true });
      if (String(input).includes('/auth/logout')) return response({});
      throw new Error(`Unexpected request: ${String(input)}`);
    });

    await mount(createElement(LeadershipDashboard));
    await settle();
    await click('logout');
    await settle();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/admin/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(mockRouter.navigations).toContain('/leadership');
    expect(container?.querySelector('[data-testid="leadership-dashboard"]')).toBeNull();
  });

  it('LEAD-08 removes a fragment token before exchanging it and authenticates on success', async () => {
    const exchange = deferred<Response>();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockReturnValue(exchange.promise);
    window.history.replaceState({}, '', '/leadership/#secret-token');
    let session: ReturnType<typeof useLeadershipSession> | null = null;

    await mount(createElement(SessionProbe, { onSession: (value) => (session = value) }));

    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/leadership/');
    expect(session?.loading).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/auth/exchange',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ token: 'secret-token' }),
      }),
    );

    exchange.resolve(response({ authenticated: true, sessionToken: 'session-token' }));
    await settle();

    expect(session?.loading).toBe(false);
    expect(session?.session?.authenticated).toBe(true);
    expect(session?.session?.user?.email).toBe('Leadership Authorized');
  });
});
