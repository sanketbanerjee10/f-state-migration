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

vi.mock('@/components/game/GamePlayerProfileWidget', () => ({
  GamePlayerProfileWidget: ({
    onSignIn,
    onOpenProfile,
  }: {
    onSignIn: () => void;
    onOpenProfile: () => void;
  }) => (
    <div data-testid="profile-widget">
      <button type="button" onClick={onSignIn}>Widget sign in</button>
      <button type="button" onClick={onOpenProfile}>Widget profile</button>
    </div>
  ),
}));

vi.mock('@/components/game/GamePlayerAccountPanel', () => ({
  GamePlayerAccountPanel: ({
    onBack,
    initialTab,
  }: {
    onBack: () => void;
    initialTab?: 'sign-in' | 'sign-up';
  }) => (
    <div data-testid="account-view" data-initial-tab={initialTab ?? 'sign-in'}>
      <button type="button" onClick={onBack}>Back to menu</button>
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

  it('opens and closes the player account view from the game menu', () => {
    window.history.replaceState(null, '', '/game?gameMenu=account');
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

    expect(container?.querySelector('[data-testid="account-view"]')).not.toBeNull();
    const back = container?.querySelector('[data-testid="account-view"] button');
    act(() => back?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container?.querySelector('[data-testid="account-view"]')).toBeNull();
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('home');
  });

  it('opens the sign-in tab from the profile widget', () => {
    window.history.replaceState(null, '', '/game?gameMenu=home');
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

    const signIn = Array.from(container?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent === 'Widget sign in');
    act(() => signIn?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    expect(container?.querySelector('[data-testid="account-view"]')?.getAttribute('data-initial-tab'))
      .toBe('sign-in');
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('account');
  });
});
