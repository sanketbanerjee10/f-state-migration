// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_SETTINGS } from '@/game/core/GameSettings';
import { GameMenuOverlay } from '@/components/game/GameMenuOverlay';

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/game/GameMainMenu', () => ({
  GameMainMenu: ({ onViewChange }: { onViewChange: (view: string) => void }) => (
    <div data-testid="main-menu">
      <button type="button" onClick={() => onViewChange('settings')}>Settings</button>
    </div>
  ),
}));

vi.mock('@/components/game/GameSettingsPanel', () => ({
  GameSettingsPanel: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="settings-view">
      <button type="button" onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock('@/components/game/GamePauseMenu', () => ({ GamePauseMenu: () => null }));
vi.mock('@/components/game/GameLeaderboardPanel', () => ({ GameLeaderboardPanel: () => null }));
vi.mock('@/components/game/GameEnemyGuide', () => ({ GameEnemyGuide: () => null }));
vi.mock('@/components/game/GameMusicPlayer', () => ({ GameMusicPlayer: () => null }));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  window.history.replaceState(null, '', '/game?gameMenu=settings');
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  window.history.replaceState(null, '', '/');
});

describe('game menu overlay URL navigation', () => {
  it('initializes from the URL and follows browser history changes', () => {
    act(() => {
      root?.render(createElement(GameMenuOverlay, {
        mode: 'main',
        settings: DEFAULT_GAME_SETTINGS,
        settingsError: null,
        audioError: null,
        musicTrackName: 'Test soundtrack',
        musicPlaying: false,
        musicEnabled: true,
        onToggleMusic: vi.fn(),
        gameState: null,
        onSettingsChange: vi.fn(),
        onStart: vi.fn(),
        onStartTutorial: vi.fn(),
        onResume: vi.fn(),
        onAdjustStat: vi.fn(),
        onAdjustRareUpgrade: vi.fn(),
        onRestart: vi.fn(),
        onReturnToMenu: vi.fn(),
      }));
    });

    expect(container?.querySelector('[data-testid="settings-view"]')).not.toBeNull();

    act(() => {
      window.history.pushState(null, '', '/game?gameMenu=home');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(container?.querySelector('[data-testid="settings-view"]')).toBeNull();
    expect(container?.querySelector('[data-testid="main-menu"]')).not.toBeNull();
  });
});
