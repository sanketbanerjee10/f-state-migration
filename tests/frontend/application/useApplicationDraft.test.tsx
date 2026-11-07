// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApplicationDraftProvider,
  initialDraft,
  useApplicationDraft,
  type ApplicationDraft,
} from '@/hooks/useApplicationDraft';
import type { AdminApplication, ApplicationPlayer } from '@/lib/api-client/generated/api.schemas';
import type { GroupMember } from '@/types/application';

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let queryClient: QueryClient | null = null;
let currentContext: ReturnType<typeof useApplicationDraft> | null = null;

function ContextProbe() {
  currentContext = useApplicationDraft();
  return null;
}

function context() {
  if (!currentContext) {
    throw new Error('Application draft context has not mounted');
  }
  return currentContext;
}

async function mountProvider() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  await act(async () => {
    root?.render(
      createElement(
        QueryClientProvider,
        { client: queryClient! },
        createElement(ApplicationDraftProvider, null, createElement(ContextProbe)),
      ),
    );
  });
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flush();
  }
  throw new Error('Timed out waiting for application draft state');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makePlayer(overrides: Partial<ApplicationPlayer> = {}): ApplicationPlayer {
  return {
    id: 'player-applicant',
    applicationId: 'app-12345678-90ab-cdef-1234-567890abcdef',
    playerName: 'Player One',
    isApplicant: true,
    currentState: 565,
    highestPowerOnRecord: 999,
    structurePower: 1_000_000,
    techPower: 2_000_000,
    troopPower: 3_000_000,
    heroPower: 4_000_000,
    modVehiclePower: 5_000_000,
    f1ArenaPower: 11_000_000,
    f2ArenaPower: 12_000_000,
    f3ArenaPower: 13_000_000,
    kills: 42,
    currentAlliance: 'OLD',
    isScreenshotVerified: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApplication(players: ApplicationPlayer[] = [makePlayer()]): AdminApplication {
  return {
    id: 'app-12345678-90ab-cdef-1234-567890abcdef',
    gameName: 'Player One',
    currentState: 565,
    currentAlliance: 'OLD',
    f1ArenaPower: 11_000_000,
    f2ArenaPower: 12_000_000,
    f3ArenaPower: 13_000_000,
    kills: 42,
    preferredAlliances: [{ id: 7, tag: 'NEW', name: 'New Alliance' }],
    anyAlliance: false,
    migrationTier: 'Advanced',
    migrationType: 'Group',
    groupRepresentative: 'Player One',
    status: 'Pending',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-02T00:00:00.000Z',
    migrationReason: 'Seeking a new home',
    characterReference: null,
    additionalComments: 'Please contact me',
    players,
  };
}

function makeGroupMember(id: string, playerName: string): GroupMember {
  return {
    id,
    playerName,
    currentState: '565',
    highestPowerOnRecord: '100',
    structurePower: '10',
    techPower: '20',
    troopPower: '30',
    heroPower: '20',
    modVehiclePower: '20',
    kills: '5',
    currentAlliance: 'OLD',
    isScreenshotVerified: false,
  };
}

beforeEach(() => {
  vi.stubGlobal('React', React);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', vi.fn());
  window.history.replaceState({}, '', '/apply');
  sessionStorage.clear();
  localStorage.clear();
  currentContext = null;
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
  currentContext = null;
  vi.unstubAllGlobals();
});

describe('ApplicationDraftProvider lifecycle', () => {
  it('DRAFT-01 exposes the initial empty draft when no draft is saved', async () => {
    await mountProvider();

    expect(context().draft).toEqual(initialDraft);
    expect(context().screenshotFile).toBeNull();
    expect(context().groupScreenshotFile).toBeNull();
  });

  it('DRAFT-02 restores a saved draft and recalculates its aggregate power', async () => {
    const savedDraft: Partial<ApplicationDraft> = {
      playerName: 'Saved Player',
      structurePower: '1M',
      techPower: '2M',
      troopPower: '3M',
      heroPower: '4M',
      modVehiclePower: '5M',
      highestPowerOnRecord: '999M',
    };
    sessionStorage.setItem('state565_application_draft_v4', JSON.stringify(savedDraft));
    await mountProvider();

    expect(context().draft.playerName).toBe('Saved Player');
    expect(context().draft.highestPowerOnRecord).toBe('15,000,000');
  });

  it('DRAFT-03 falls back to the initial draft when saved JSON is malformed', async () => {
    sessionStorage.setItem('state565_application_draft_v4', '{malformed');
    await mountProvider();

    expect(context().draft).toEqual(initialDraft);
  });

  it('DRAFT-04 recalculates aggregate power when a breakdown field changes', async () => {
    await mountProvider();

    await act(async () => {
      context().setDraftField('structurePower', '1M');
      context().setDraftField('techPower', '2M');
      context().setDraftField('troopPower', '3M');
      context().setDraftField('heroPower', '4M');
      context().setDraftField('modVehiclePower', '5M');
    });

    expect(context().draft.highestPowerOnRecord).toBe('15,000,000');
    expect(context().draft.dirtyFields.structurePower).toBe(true);
    expect(context().draft.dirtyFields.highestPowerOnRecord).toBe(false);
  });

  it('DRAFT-05 applies partial OCR values and recalculates aggregate power', async () => {
    sessionStorage.setItem(
      'state565_application_draft_v4',
      JSON.stringify({
        ...initialDraft,
        playerName: 'Existing Name',
        structurePower: '1M',
        techPower: '2M',
        troopPower: '3M',
        heroPower: '4M',
        modVehiclePower: '5M',
        highestPowerOnRecord: '15,000,000',
      }),
    );
    await mountProvider();

    await act(async () => {
      context().applyOcrResults({ playerName: 'OCR Name', techPower: '12M' });
    });

    expect(context().draft.playerName).toBe('OCR Name');
    expect(context().draft.techPower).toBe('12M');
    expect(context().draft.structurePower).toBe('1M');
    expect(context().draft.highestPowerOnRecord).toBe('25,000,000');
  });

  it('DRAFT-06 sets and removes the applicant screenshot and OCR-derived values', async () => {
    await mountProvider();
    const file = new File(['image'], 'applicant.png', { type: 'image/png' });

    await act(async () => {
      context().setScreenshotFile(file);
      context().applyOcrResults({ playerName: 'OCR Name', structurePower: '1M' }, file);
    });

    expect(context().screenshotFile).toBe(file);
    expect(context().draft.hasScreenshot).toBe(true);
    expect(context().draft.screenshotFileName).toBe('applicant.png');

    await act(async () => context().removeScreenshot());

    expect(context().screenshotFile).toBeNull();
    expect(context().draft.hasScreenshot).toBe(false);
    expect(context().draft.screenshotFileName).toBe('');
    expect(context().draft.playerName).toBe('');
    expect(context().draft.structurePower).toBe('');
  });

  it('DRAFT-07 sets and removes the group screenshot', async () => {
    await mountProvider();
    const file = new File(['image'], 'group.png', { type: 'image/png' });

    await act(async () => context().setGroupScreenshotFile(file));

    expect(context().groupScreenshotFile).toBe(file);
    expect(context().draft.hasGroupScreenshot).toBe(true);
    expect(context().draft.groupScreenshotFileName).toBe('group.png');

    await act(async () => context().removeGroupScreenshot());

    expect(context().groupScreenshotFile).toBeNull();
    expect(context().draft.hasGroupScreenshot).toBe(false);
    expect(context().draft.groupScreenshotFileName).toBe('');
  });

  it('DRAFT-08 adds, edits, and removes only the requested group roster member', async () => {
    await mountProvider();
    const first = makeGroupMember('first', 'First Player');
    const second = makeGroupMember('second', 'Second Player');

    await act(async () => {
      context().addGroupMember(first);
      context().addGroupMember(second);
    });
    await act(async () => context().updateGroupMember('first', { playerName: 'Updated Player' }));

    expect(context().draft.groupMembers).toEqual([
      { ...first, playerName: 'Updated Player' },
      second,
    ]);

    await act(async () => context().removeGroupMember('first'));
    expect(context().draft.groupMembers).toEqual([second]);
  });

  it('DRAFT-09 maps an existing application and roster into the edit draft', async () => {
    const app = makeApplication([
      makePlayer(),
      makePlayer({
        id: 'player-group-1',
        playerName: 'Group Player',
        isApplicant: false,
        currentState: 566,
        highestPowerOnRecord: 25_000_000,
        structurePower: 5_000_000,
        techPower: 5_000_000,
        troopPower: 5_000_000,
        heroPower: 5_000_000,
        modVehiclePower: 5_000_000,
        f1ArenaPower: null,
        f2ArenaPower: null,
        f3ArenaPower: null,
        kills: 8,
        currentAlliance: 'GROUP',
        isScreenshotVerified: false,
      }),
    ]);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(app));
    window.history.replaceState({}, '', `/apply?edit=${app.id}`);
    await mountProvider();
    await waitFor(() => context().draft.editingApplicationId === app.id);

    expect(context().draft.playerName).toBe('Player One');
    expect(context().draft.currentState).toBe('565');
    expect(context().draft.preferredAlliances).toEqual(['7']);
    expect(context().draft.tier).toBe('Advanced');
    expect(context().draft.migrationType).toBe('Group');
    expect(context().draft.editingReference).toBe('565-APP123456789');
    expect(context().draft.highestPowerOnRecord).toBe('15,000,000');
    expect(context().draft.groupMembers).toMatchObject([
      {
        id: 'player-group-1',
        playerName: 'Group Player',
        currentState: '566',
        highestPowerOnRecord: '25000000',
        currentAlliance: 'GROUP',
      },
    ]);
  });

  it('DRAFT-10 clears edit data, selected files, and the edit query when editing is cancelled', async () => {
    const app = makeApplication();
    vi.mocked(fetch).mockResolvedValue(jsonResponse(app));
    window.history.replaceState({}, '', `/apply?edit=${app.id}&source=test`);
    await mountProvider();
    await waitFor(() => context().draft.editingApplicationId === app.id);

    await act(async () => {
      context().setDraftField('playerName', 'Changed Name');
      context().setScreenshotFile(new File(['image'], 'applicant.png'));
    });
    await act(async () => context().cancelEdit());

    expect(context().draft).toEqual(initialDraft);
    expect(context().screenshotFile).toBeNull();
    expect(window.location.pathname).toBe('/apply');
    expect(window.location.search).toBe('');
    expect(JSON.parse(sessionStorage.getItem('state565_application_draft_v4') || '{}')).toEqual(
      initialDraft,
    );
  });

  it('DRAFT-11 exposes deleted-record state when the edit lookup returns 404', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ message: 'Not found' }, 404));
    window.history.replaceState({}, '', '/apply?edit=deleted-app');
    await mountProvider();
    await waitFor(() => context().editApplicationDeleted);

    expect(context().editApplicationDeleted).toBe(true);
  });

  it('DRAFT-12 clears draft values and files while preserving migration type', async () => {
    await mountProvider();
    const applicantFile = new File(['image'], 'applicant.png');
    const groupFile = new File(['image'], 'group.png');

    await act(async () => {
      context().setDraftField('migrationType', 'Group');
      context().setDraftField('playerName', 'Player One');
      context().setScreenshotFile(applicantFile);
      context().setGroupScreenshotFile(groupFile);
    });
    await act(async () => context().clearDraft(true));

    expect(context().draft).toEqual({ ...initialDraft, migrationType: 'Group' });
    expect(context().screenshotFile).toBeNull();
    expect(context().groupScreenshotFile).toBeNull();
  });
});
