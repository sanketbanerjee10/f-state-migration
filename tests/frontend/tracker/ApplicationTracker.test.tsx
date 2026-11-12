// @vitest-environment jsdom

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApplicationTracker } from '@/pages/ApplicationTracker';
import type { AdminApplication } from '@/lib/api-client';
import {
  getTrackedApplications,
  saveTrackedApplication,
  type TrackedApplicationMeta,
} from '@/lib/trackedApplications';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number }) =>
      values?.count === undefined ? key : `${key}:${values.count}`,
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));
vi.mock('@/components/PageHeader', () => ({ PageHeader: () => null }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let queryClient: QueryClient | null = null;

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  React,
});

const trackedOne: TrackedApplicationMeta = {
  id: 'saved-application-one',
  reference: '565-SAVEDONE01',
  gameName: 'Saved Player One',
  migrationType: 'Individual',
  status: 'Pending',
  submittedAt: '2025-01-01T00:00:00.000Z',
  lastUpdated: '2025-01-02T00:00:00.000Z',
};

const trackedTwo: TrackedApplicationMeta = {
  ...trackedOne,
  id: 'saved-application-two',
  reference: '565-SAVEDTWO02',
  gameName: 'Saved Player Two',
};

function makeApplication(id: string, gameName = 'Fetched Player'): AdminApplication {
  return {
    id,
    gameName,
    currentState: 565,
    currentAlliance: 'OLD',
    preferredAlliances: [],
    anyAlliance: false,
    migrationType: 'Individual',
    groupRepresentative: null,
    status: 'Pending',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    migrationReason: 'Test application',
    additionalComments: null,
    players: [],
  };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function mountTracker(path = '/track') {
  window.history.replaceState({}, '', path);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root?.render(
      <QueryClientProvider client={queryClient}>
        <Router>
          <Route path="/track/:id" component={ApplicationTracker} />
          <Route path="/track" component={ApplicationTracker} />
        </Router>
      </QueryClientProvider>,
    );
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 10));
  });
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  throw new Error('Timed out waiting for tracker UI');
}

function buttonByLabel(label: string, within: ParentNode = document): HTMLButtonElement {
  const button = Array.from(within.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find button containing "${label}"`);
  }
  return button;
}

async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

async function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function openTrackModal() {
  await click(buttonByLabel('components.tracker.title'));
  if (!container?.querySelector('[role="dialog"]')) {
    throw new Error('Track dialog did not open');
  }
}

function modal() {
  const dialog = container?.querySelector('[role="dialog"]');
  if (!dialog) throw new Error('Track dialog is not open');
  return dialog;
}

function savedRows() {
  return Array.from(
    container?.querySelectorAll('.application-tracker-list > div > div:last-child > div') ?? [],
  );
}

function responseForApplication(app: AdminApplication) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith('/api/applications/')) return jsonResponse(app);
    return jsonResponse([]);
  }));
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse([])));
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  container?.remove();
  root = null;
  container = null;
  queryClient?.clear();
  queryClient = null;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('ApplicationTracker user flows', () => {
  it('TRACK-01: shows the empty state and an action to track an application', async () => {
    await mountTracker();

    expect(container?.textContent).toContain('components.tracker.select');
    expect(container?.textContent).toContain('components.tracker.emptyDescription');
    await click(buttonByLabel('components.tracker.title', container!));
    expect(container?.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('TRACK-02: lists saved applications without selecting one on /track', async () => {
    saveTrackedApplication(trackedOne);
    saveTrackedApplication(trackedTwo);

    await mountTracker();
    await waitFor(() => savedRows().length === 2);

    expect(container?.textContent).toContain('Saved Player One');
    expect(container?.textContent).toContain('Saved Player Two');
    expect(container?.querySelector('aside[role="dialog"]')).toBeNull();
    expect(window.location.pathname).toBe('/track');
  });

  it('TRACK-03: looks up an existing ID, saves it, selects it, and opens its details', async () => {
    const app = makeApplication('existing-application-123', 'Found Player');
    responseForApplication(app);
    await mountTracker();
    await openTrackModal();

    await setInputValue(modal().querySelector('input')!, app.id);
    await click(modal().querySelector('button[type="submit"]')!);
    await waitFor(() =>
      container?.querySelector('aside[role="dialog"]')?.textContent?.includes('Found Player') ?? false,
    );

    expect(window.location.pathname).toBe(`/track/${app.id}`);
    expect(getTrackedApplications().map(({ id }) => id)).toContain(app.id);
    expect(savedRows().some((row) => row.textContent?.includes('Found Player'))).toBe(true);
    expect(container?.querySelector('aside[role="dialog"]')?.textContent).toContain('Found Player');
    expect(container?.querySelector('.dialog[role="dialog"]')).toBeNull();
  });

  it('TRACK-04: rejects an empty ID without issuing a lookup', async () => {
    await mountTracker();
    await openTrackModal();
    const fetchMock = vi.mocked(fetch);

    await click(modal().querySelector('button[type="submit"]')!);

    expect(modal().querySelector('[role="alert"]')?.textContent).toContain('components.tracker.enterId');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getTrackedApplications()).toEqual([]);
  });

  it('TRACK-05: reports deleted and unknown IDs without saving them, and keeps the modal usable', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('deleted-application')) return jsonResponse({}, 404);
      if (url.endsWith('unknown-application')) return jsonResponse({}, 500);
      if (url.endsWith('valid-application')) {
        return jsonResponse(makeApplication('valid-application', 'Valid Player'));
      }
      return jsonResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);
    await mountTracker();
    await openTrackModal();
    const input = modal().querySelector('input') as HTMLInputElement;

    await setInputValue(input, 'deleted-application');
    await click(modal().querySelector('button[type="submit"]')!);
    await waitFor(() => Boolean(modal().querySelector('[role="alert"]')));
    expect(modal().textContent).toContain('components.tracker.deleted');
    expect(getTrackedApplications()).toEqual([]);

    await setInputValue(input, 'unknown-application');
    await click(modal().querySelector('button[type="submit"]')!);
    await waitFor(() =>
      fetchMock.mock.calls.some(([url]) => String(url).endsWith('unknown-application')),
    );
    await waitFor(() => modal().textContent?.includes('Could not load application details') ?? false);
    expect(getTrackedApplications()).toEqual([]);

    await setInputValue(input, 'valid-application');
    await click(modal().querySelector('button[type="submit"]')!);
    await waitFor(() => getTrackedApplications().some(({ id }) => id === 'valid-application'));
    expect(window.location.pathname).toBe('/track/valid-application');
  });

  it('TRACK-06: selecting a saved entry updates the route and closing returns to /track', async () => {
    const app = makeApplication(trackedTwo.id, trackedTwo.gameName);
    responseForApplication(app);
    saveTrackedApplication(trackedOne);
    saveTrackedApplication(trackedTwo);
    await mountTracker();

    await click(savedRows().find((row) => row.textContent?.includes(trackedTwo.gameName))!);
    await waitFor(() =>
      container?.querySelector('aside[role="dialog"]')?.textContent?.includes(trackedTwo.gameName) ?? false,
    );
    expect(window.location.pathname).toBe(`/track/${trackedTwo.id}`);
    expect(container?.querySelector('aside[role="dialog"]')?.textContent).toContain(trackedTwo.gameName);

    const closeButton = container?.querySelector<HTMLButtonElement>(
      'button[aria-label="components.tracker.closeDetails"]',
    );
    expect(closeButton).not.toBeNull();
    await click(closeButton!);
    await waitFor(() => window.location.pathname === '/track');
    expect(container?.querySelector('aside[role="dialog"]')).toBeNull();
  });

  it('TRACK-07: removing the selected entry clears local tracking and closes the pane', async () => {
    const app = makeApplication(trackedOne.id, trackedOne.gameName);
    responseForApplication(app);
    saveTrackedApplication(trackedOne);
    await mountTracker();
    await click(savedRows()[0]);
    await waitFor(() => Boolean(container?.querySelector('aside[role="dialog"]')));

    const removeButton = container?.querySelector<HTMLButtonElement>(
      '.application-tracker-list button[title="common.labels.removeSaved"]',
    );
    expect(removeButton).not.toBeNull();
    await click(removeButton!);
    await waitFor(() => getTrackedApplications().length === 0);

    expect(window.location.pathname).toBe('/track');
    expect(container?.querySelector('aside[role="dialog"]')).toBeNull();
    expect(savedRows()).toHaveLength(0);
  });

  it('TRACK-08: a deep link opens in a loading state and then displays the fetched application', async () => {
    const app = makeApplication('deep-link-application', 'Deep Link Player');
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    })));
    await mountTracker(`/track/${app.id}`);

    expect(container?.querySelector('aside[role="dialog"]')?.textContent).toContain(
      'components.tracker.retrieving',
    );
    expect(window.location.pathname).toBe(`/track/${app.id}`);

    await act(async () => resolveFetch(jsonResponse(app)));
    await waitFor(() => container?.querySelector('aside[role="dialog"]')?.textContent?.includes(
      'Deep Link Player',
    ) ?? false);
    expect(getTrackedApplications().map(({ id }) => id)).toContain(app.id);
  });

  it.each([
    ['deleted-application', 404, 'components.tracker.noLongerExists'],
    ['failed-application', 500, 'Could not load application details'],
  ])('TRACK-08: a deep link presents the appropriate failure state for %s', async (id, status, message) => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, status)));
    await mountTracker(`/track/${id}`);

    await waitFor(() => container?.querySelector('aside[role="dialog"]')?.textContent?.includes(
      String(message),
    ) ?? false);

    expect(container?.querySelector('aside[role="dialog"]')?.textContent).toContain(message);
    expect(window.location.pathname).toBe(`/track/${id}`);
    expect(getTrackedApplications()).toEqual([]);
  });
});
