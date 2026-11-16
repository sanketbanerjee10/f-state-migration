// @vitest-environment jsdom

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameLeaderboardEntry } from '@/lib/gameApi';
import type { GameStateSnapshot } from '@/game/core/GameState';
import { GamePhaseOverlays } from '@/components/game/GamePhaseOverlays';

// Vitest's shared config omits the Vite React transform used by the app.
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

const mocks = vi.hoisted(() => ({
  confetti: vi.fn(),
  recordScoreIfBest: vi.fn(),
  toastError: vi.fn(),
  bestScore: {
    status: 'ready',
    score: null as unknown,
    error: null,
  },
}));

vi.mock('canvas-confetti', () => ({ default: mocks.confetti }));
vi.mock('@/components/game/GamePlayerAuthProvider', () => ({
  useGamePlayerAuth: () => ({
    account: { status: 'authenticated', username: 'Aster' },
    bestScore: mocks.bestScore,
    recordScoreIfBest: mocks.recordScoreIfBest,
  }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'game.results.newHighScore': 'New high score!',
      'game.results.newHighScoreRecorded': 'New high score recorded!',
      'game.results.personalBest': 'Personal best',
      'game.notifications.scoreSubmissionFailed': 'Your new high score could not be saved. Please try again later.',
    }[key] ?? key),
  }),
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const recordedScore: GameLeaderboardEntry = {
  playerName: 'Aster',
  score: 250,
  waveCleared: 3,
  waveReached: 4,
  zombiesKilled: 25,
  survivalTime: 80,
  createdAt: '2026-11-16T00:00:00.000Z',
  avatar: {
    style: 'avataaars',
    seed: 'Aster',
    appearance: 'shortRound',
    color: '428bca',
    accessory: false,
    backgroundColor: '18243b',
  },
};

function makeGameOverState(score: number): GameStateSnapshot {
  return {
    gameMode: 'survival',
    campaignLevelId: null,
    score,
    statistics: {
      highestWaveCleared: 3,
      highestWaveReached: 4,
      zombiesKilled: 25,
      survivalSeconds: 80,
    },
    wave: {
      phase: 'gameOver',
      announcement: 'Run over',
      announcementSeconds: 0,
      bossType: null,
    },
  } as GameStateSnapshot;
}

async function renderGameOver(score: number) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <GamePhaseOverlays
        gameState={makeGameOverState(score)}
        onPlayAgain={vi.fn()}
        onNextLevel={vi.fn()}
        onLevelSelection={vi.fn()}
        onReturnToMenu={vi.fn()}
      />,
    );
    await Promise.resolve();
  });
  return container;
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  }
  throw new Error(
    `Timed out waiting for game-over score UI: ${container?.textContent}; score calls: ${mocks.recordScoreIfBest.mock.calls.length}; confetti calls: ${mocks.confetti.mock.calls.length}; result: ${JSON.stringify(mocks.recordScoreIfBest.mock.results[0]?.value)}`,
  );
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.confetti.mockReset();
  mocks.recordScoreIfBest.mockReset();
  mocks.toastError.mockReset();
  mocks.recordScoreIfBest.mockResolvedValue({
    submitted: true,
    isPersonalBest: true,
    bestScore: recordedScore,
  });
  mocks.bestScore.status = 'ready';
  mocks.bestScore.score = null;
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  vi.restoreAllMocks();
  root = null;
  container?.remove();
  container = null;
});

describe('Survival game-over score UI', () => {
  it('celebrates a new best immediately and confirms it after the API response', async () => {
    let finishSubmission: ((result: {
      submitted: boolean;
      isPersonalBest: boolean;
      bestScore: GameLeaderboardEntry | null;
    }) => void) | undefined;
    mocks.recordScoreIfBest.mockImplementation(() => new Promise((resolve) => {
      finishSubmission = resolve;
    }));
    const gameOver = await renderGameOver(250);

    expect(gameOver.textContent).toContain('New high score!');
    expect(gameOver.textContent).not.toContain('New high score recorded!');
    expect(mocks.confetti).toHaveBeenCalledTimes(2);
    expect(mocks.recordScoreIfBest).toHaveBeenCalledOnce();
    expect(mocks.recordScoreIfBest).toHaveBeenCalledWith({
      gameMode: 'survival',
      score: 250,
      waveCleared: 3,
      waveReached: 4,
      zombiesKilled: 25,
      survivalTime: 80,
    });
    expect(gameOver.textContent).not.toContain('Personal best');

    await act(async () => {
      finishSubmission?.({
        submitted: true,
        isPersonalBest: true,
        bestScore: recordedScore,
      });
    });
    await waitFor(() => gameOver.textContent?.includes('New high score recorded!') ?? false);
    expect(mocks.confetti).toHaveBeenCalledTimes(2);
  });

  it('shows the existing personal best without celebrating a lower run', async () => {
    mocks.bestScore.score = { ...recordedScore, score: 400 };
    mocks.recordScoreIfBest.mockResolvedValue({
      submitted: false,
      isPersonalBest: false,
      bestScore: { ...recordedScore, score: 400 },
    });
    const gameOver = await renderGameOver(250);

    await waitFor(() => gameOver.textContent?.includes('Personal best: 400') ?? false);

    expect(mocks.recordScoreIfBest).toHaveBeenCalledOnce();
    expect(mocks.confetti).not.toHaveBeenCalled();
    expect(gameOver.textContent).not.toContain('New high score recorded!');
  });

  it('keeps the optimistic new-record UI and shows a toast if the submission fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.recordScoreIfBest.mockRejectedValue(new Error('Unavailable.'));
    const gameOver = await renderGameOver(250);

    expect(gameOver.textContent).toContain('New high score!');
    await waitFor(() => mocks.toastError.mock.calls.length === 1);
    expect(mocks.toastError).toHaveBeenCalledWith(
      'Your new high score could not be saved. Please try again later.',
    );
    expect(mocks.confetti).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });
});
