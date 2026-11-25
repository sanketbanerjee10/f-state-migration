// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SiegeGame } from '../../../../src/components/game/SiegeGame';
import { GameMainMenu } from '../../../../src/components/game/GameMainMenu';
import type {
  SiegeRunResult,
  SiegeRuntimeState,
} from '../../../../src/game/siege/SiegeEngine';

const engineHarness = vi.hoisted(() => ({
  created: false,
  createdCount: 0,
  keyboardMovementEnabled: false,
  onState: null as ((state: SiegeRuntimeState) => void) | null,
  onComplete: null as ((result: SiegeRunResult) => void) | null,
}));

vi.mock('../../../../src/game/siege/SiegeEngine', () => ({
  SiegeEngine: class {
    constructor(options: {
      onState: (state: SiegeRuntimeState) => void;
      onComplete: (result: SiegeRunResult) => void;
    }) {
      engineHarness.created = true;
      engineHarness.createdCount += 1;
      engineHarness.onState = options.onState;
      engineHarness.onComplete = options.onComplete;
    }

    moveLane() {}
    setMovementInput() {}
    movePlayerByTouch() {}
    setKeyboardMovementEnabled(enabled: boolean) {
      engineHarness.keyboardMovementEnabled = enabled;
    }
    pause() {}
    resume() {}
    resize() {}
    dispose() {}
  },
}));

(globalThis as typeof globalThis & { React?: typeof React }).React = React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: 'en', language: 'en', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: () => undefined },
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeEach(() => {
  engineHarness.created = false;
  engineHarness.createdCount = 0;
  engineHarness.keyboardMovementEnabled = false;
  engineHarness.onState = null;
  engineHarness.onComplete = null;
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  });
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  window.history.replaceState({}, '', '/game');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  window.localStorage.clear();
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.unstubAllGlobals();
});

describe('Siege UI', () => {
  it('starts a scrolling-game session from the difficulty and level selectors', async () => {
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container?.querySelector('.game-siege-modal-header h1')?.textContent)
      .toBe('game.siege.title');
    expect(container?.querySelector('.game-siege-modal-header .game-pause-moon'))
      .not.toBeNull();
    expect(container?.textContent).not.toContain('game.siege.subtitle');
    const easyButton = container?.querySelector(
      '.game-siege-difficulty-card[data-difficulty="easy"]',
    ) as HTMLButtonElement;
    await act(async () => easyButton.click());
    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');
    expect(new URLSearchParams(window.location.search).get('siegeDifficulty')).toBe('easy');
    expect(container?.querySelectorAll('.game-siege-carousel-slide[data-level-index]'))
      .toHaveLength(20);
    expect(container?.querySelector('.game-siege-difficulty-name')).toBeNull();
    expect(container?.querySelector('.game-siege-level-actions')).toBeNull();
    expect(container?.querySelector('.game-siege-carousel-card[data-level-id="easy-02"]'))
      .toHaveProperty('disabled', true);
    const firstLevel = container?.querySelector(
      '.game-siege-carousel-card[data-level-id="easy-01"]',
    ) as HTMLButtonElement;
    await act(async () => firstLevel.click());

    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');
    expect(new URLSearchParams(window.location.search).has('siegeLevel')).toBe(false);
    expect(container?.querySelector('.game-canvas')).not.toBeNull();
    expect(container?.querySelector('.game-siege-touch-controls')).toBeNull();
    expect(engineHarness.created).toBe(true);
    expect(container?.querySelector('.game-hud-siege')).not.toBeNull();
    expect(container?.querySelector('.game-pause-button')).not.toBeNull();
    expect(engineHarness.keyboardMovementEnabled).toBe(true);
  });

  it('formats player and enemy troop counts consistently in the HUD', async () => {
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-carousel-card[data-level-id="easy-01"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      engineHarness.onState?.({
        phase: 'wall',
        troops: 1234567,
        playerX: 0,
        playerY: 0,
        sectionIndex: 0,
        rowIndex: 1,
        rowCount: 1,
        zombiesRemaining: 2345678,
        elapsedSeconds: 30,
      });
    });

    expect(container?.querySelector('.game-hud-score strong')?.textContent)
      .toBe('1,234,567');
    expect(container?.querySelector('.game-hud-bombs strong')?.textContent)
      .toBe('2,345,678');
  });

  it('returns to level selection for old URLs that requested an active level', async () => {
    window.history.replaceState(
      {},
      '',
      '/game?siege=playing&siegeDifficulty=easy&siegeLevel=easy-01',
    );
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    expect(container?.querySelector('.game-siege-screen')?.getAttribute('data-screen'))
      .toBe('levels');
    expect(container?.querySelector('.game-canvas')).toBeNull();
    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');
    expect(new URLSearchParams(window.location.search).has('siegeLevel')).toBe(false);
  });

  it('auto-selects touch and disables keyboard movement on narrow screens', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 });
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-carousel-card[data-level-id="easy-01"]',
      ) as HTMLButtonElement).click();
    });

    expect(container?.querySelector('.game-siege-touch-controls')).not.toBeNull();
    expect(engineHarness.keyboardMovementEnabled).toBe(false);
  });

  it('returns from a difficulty carousel to difficulty selection and updates the URL', async () => {
    const clearedLevels = (difficulty: string) => Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => [
        `${difficulty}-${String(index + 1).padStart(2, '0')}`,
        { stars: 1, bestFinalTroops: 30 },
      ]),
    );
    window.localStorage.setItem('siege.progress.v1', JSON.stringify({
      schemaVersion: 1,
      levels: {
        easy: clearedLevels('easy'),
        medium: clearedLevels('medium'),
      },
    }));

    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });

    expect(container?.querySelector('.game-siege-screen')?.getAttribute('data-screen'))
      .toBe('levels');
    await act(async () => {
      (container?.querySelector(
        '.game-siege-modal-header .game-level-back-button',
      ) as HTMLButtonElement).click();
    });

    expect(container?.querySelector('.game-siege-screen')?.getAttribute('data-screen'))
      .toBe('difficulty');
    expect(new URLSearchParams(window.location.search).get('siege')).toBe('difficulty');
    expect(new URLSearchParams(window.location.search).get('siegeDifficulty')).toBeNull();
    const difficultButton = container?.querySelector(
      '.game-siege-difficulty-card[data-difficulty="difficult"]',
    ) as HTMLButtonElement;
    expect(difficultButton.disabled).toBe(false);
    await act(async () => difficultButton.click());

    expect(container?.querySelector('.game-siege-screen')?.getAttribute('data-screen'))
      .toBe('levels');
    expect(new URLSearchParams(window.location.search).get('siegeDifficulty'))
      .toBe('difficult');
  });

  it('offers the next level after a win and starts it directly', async () => {
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-carousel-card[data-level-id="easy-01"]',
      ) as HTMLButtonElement).click();
    });

    expect(engineHarness.onState).not.toBeNull();
    expect(engineHarness.onComplete).not.toBeNull();
    await act(async () => {
      engineHarness.onState?.({
        phase: 'won',
        troops: 30,
        playerX: 0,
        playerY: 0,
        sectionIndex: 0,
        rowIndex: 1,
        rowCount: 1,
        zombiesRemaining: 0,
        elapsedSeconds: 30,
      });
      engineHarness.onComplete?.({ won: true, finalTroops: 30 });
    });

    expect(container?.querySelector('.game-siege-menu.game-siege-modal-compact'))
      .not.toBeNull();
    expect(container?.querySelector('.game-siege-modal-header h1')?.textContent)
      .toBe('game.siege.won');
    const resultActions = Array.from(
      container?.querySelectorAll('.game-siege-result-actions button') ?? [],
    );
    expect(resultActions).toHaveLength(3);
    expect(resultActions[0].classList.contains('game-siege-result-next')).toBe(true);
    expect(resultActions[1].textContent).toContain('game.siege.playAgain');
    expect(resultActions[2].textContent).toContain('game.siege.mainMenu');
    const nextLevelButton = Array.from(container?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes('game.results.nextLevel'));
    expect(nextLevelButton).toBeDefined();
    await act(async () => nextLevelButton?.click());

    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');
    expect(new URLSearchParams(window.location.search).has('siegeLevel')).toBe(false);
  });

  it('shows zero stars and the Main Menu and Play again actions after a loss', async () => {
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-carousel-card[data-level-id="easy-01"]',
      ) as HTMLButtonElement).click();
    });

    await act(async () => {
      engineHarness.onState?.({
        phase: 'lost',
        troops: 0,
        playerX: 0,
        playerY: 0,
        sectionIndex: 0,
        rowIndex: 1,
        rowCount: 1,
        zombiesRemaining: 3,
        elapsedSeconds: 30,
      });
      engineHarness.onComplete?.({ won: false, finalTroops: 0 });
    });

    const stars = container?.querySelector('.game-siege-result-stars');
    expect(stars?.getAttribute('aria-label')).toBe('game.siege.stars');
    expect(stars?.querySelector('[aria-hidden="true"]')?.textContent).toBe('☆☆☆');
    expect(stars?.querySelector('.game-siege-result-stars-count')?.textContent)
      .toBe('game.siege.stars');
    const resultActions = Array.from(
      container?.querySelectorAll('.game-siege-result-actions button') ?? [],
    );
    expect(resultActions).toHaveLength(2);
    expect(resultActions[0].textContent).toContain('game.siege.mainMenu');
    expect(resultActions[1].textContent).toContain('game.siege.playAgain');
  });

  it('uses the Survival quick actions for Siege pause and wires each action', async () => {
    const onMainMenu = vi.fn();
    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: onMainMenu }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-carousel-card[data-level-id="easy-01"]',
      ) as HTMLButtonElement).click();
    });

    await act(async () => {
      engineHarness.onState?.({
        phase: 'paused',
        troops: 30,
        playerX: 0,
        playerY: 0,
        sectionIndex: 0,
        rowIndex: 0,
        rowCount: 1,
        zombiesRemaining: 0,
        elapsedSeconds: 0,
      });
    });

    expect(container?.querySelector('.game-pause-quick-actions')).not.toBeNull();
    expect(container?.querySelector('.game-pause-section-kicker')).toBeNull();
    const actionButtons = Array.from(
      container?.querySelectorAll('.game-pause-action') ?? [],
    );
    expect(actionButtons.map((button) => button.textContent)).toEqual([
      '⚙game.pause.settings',
      '▤game.pause.fieldGuide',
      '↻game.pause.restartRun',
      '⌂game.pause.mainMenu',
    ]);

    await act(async () => actionButtons[0].click());
    expect(container?.querySelector('.game-settings-dialog')).not.toBeNull();
    await act(async () => {
      (container?.querySelector(
        '.game-settings-panel .game-level-back-button',
      ) as HTMLButtonElement).click();
    });

    const engineCountBeforeRestart = engineHarness.createdCount;
    const restartButton = Array.from(
      container?.querySelectorAll('.game-pause-action') ?? [],
    ).find((button) => button.textContent?.includes('game.pause.restartRun'));
    await act(async () => {
      restartButton?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(engineHarness.createdCount).toBe(engineCountBeforeRestart + 1);
    expect(onMainMenu).not.toHaveBeenCalled();

    await act(async () => {
      engineHarness.onState?.({
        phase: 'paused',
        troops: 30,
        playerX: 0,
        playerY: 0,
        sectionIndex: 0,
        rowIndex: 0,
        rowCount: 1,
        zombiesRemaining: 0,
        elapsedSeconds: 0,
      });
    });
    const mainMenuButton = Array.from(
      container?.querySelectorAll('.game-pause-action') ?? [],
    ).find((button) => button.textContent?.includes('game.pause.mainMenu'));
    await act(async () => mainMenuButton?.click());
    expect(onMainMenu).toHaveBeenCalledOnce();
  });

  it('centers the first uncleared level between a cleared predecessor and a locked successor', async () => {
    window.localStorage.setItem('siege.progress.v1', JSON.stringify({
      schemaVersion: 1,
      levels: {
        easy: { 'easy-01': { stars: 2, bestFinalTroops: 30 } },
      },
    }));

    await act(async () => {
      root?.render(createElement(SiegeGame, { onExit: vi.fn() }));
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      (container?.querySelector(
        '.game-siege-difficulty-card[data-difficulty="easy"]',
      ) as HTMLButtonElement).click();
    });

    expect(container?.querySelectorAll('.game-siege-carousel-slide[data-level-index]'))
      .toHaveLength(20);
    const previousLevel = container?.querySelector(
      '.game-siege-carousel-card[data-level-id="easy-01"]',
    );
    const currentLevel = container?.querySelector(
      '.game-siege-carousel-card[data-level-id="easy-02"]',
    );
    expect(previousLevel?.classList.contains('is-completed')).toBe(true);
    expect(currentLevel?.getAttribute('aria-current')).toBe('step');
    expect(currentLevel?.classList.contains('is-centered')).toBe(true);
    expect(container?.querySelector('.game-siege-carousel-card[data-level-id="easy-03"]'))
      .toHaveProperty('disabled', true);

    await act(async () => {
      previousLevel?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      previousLevel?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');

    await act(async () => {
      (currentLevel as HTMLButtonElement).click();
    });
    expect(new URLSearchParams(window.location.search).get('siege')).toBe('levels');
    expect(new URLSearchParams(window.location.search).has('siegeLevel')).toBe(false);
  });

  it('exposes Siege as a main-menu destination', () => {
    const onOpenSiege = vi.fn();
    act(() => {
      root?.render(createElement(GameMainMenu, {
        view: 'home',
        onViewChange: vi.fn(),
        onStart: vi.fn(),
        onStartTutorial: vi.fn(),
        onOpenSiege,
      }));
    });
    const siegeButton = Array.from(container?.querySelectorAll('button') ?? [])
      .find((button) => button.textContent?.includes('game.menu.siege'));
    act(() => siegeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpenSiege).toHaveBeenCalledOnce();
  });
});
