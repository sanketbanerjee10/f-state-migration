// @vitest-environment jsdom

import * as React from 'react';
import { act, createElement, createRef, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameSettingsPanel } from '@/components/game/GameSettingsPanel';
import { GameTouchControls } from '@/components/game/GameTouchControls';
import { DualJoystickInput } from '@/game/core/DualJoystickInput';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from '@/game/core/GameSettings';
import type { GameStateSnapshot } from '@/game/core/GameState';
import { GameScoreSubmission } from '@/components/game/GameScoreSubmission';
import { GamePage } from '@/pages/game/GamePage';
import { toast } from 'sonner';

// Vitest's shared config omits the Vite React transform used by the app.
(globalThis as typeof globalThis & { React?: typeof React }).React = React;

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mocks = vi.hoisted(() => ({
  engines: [] as Array<Record<string, any>>,
  audios: [] as Array<Record<string, any>>,
  i18n: {
    resolvedLanguage: 'en',
    language: 'en',
    changeLanguage: vi.fn(),
  },
  translations: {
    'game.canvas.ariaLabel': 'Game canvas',
    'game.canvas.notSupported': 'Canvas rendering is not supported.',
    'game.notifications.fullscreenHoldEscape': 'Hold Esc to exit fullscreen.',
    'game.notifications.fullscreenPauseShortcut': 'Press {{key}} to pause the game in fullscreen mode.',
    'game.fullscreenButton.enter': 'Enter fullscreen',
    'game.fullscreenButton.exit': 'Exit fullscreen',
    'game.settings.controls': 'Controls',
    'game.settings.audio': 'Audio',
    'game.settings.touchControlsTitle': 'Touch Controls',
    'game.settings.controlLayout': 'Control layout',
    'game.settings.controlLayoutHint': 'Choose which hand controls movement.',
    'game.settings.rightHanded': 'Right-handed',
    'game.settings.leftHanded': 'Left-handed',
    'game.settings.joystickAppearance': 'Joystick appearance',
    'game.settings.joystickAppearanceHint': 'Customize both floating sticks.',
    'game.settings.baseOpacity': 'Base and glow opacity',
    'game.settings.thumbOpacity': 'Thumb opacity',
    'game.settings.joystickSize': 'Joystick size',
    'game.settings.small': 'Small',
    'game.settings.medium': 'Medium',
    'game.settings.large': 'Large',
    'game.settings.joystickPreview': 'Live preview of movement and aim sticks',
    'game.settings.joystickBehaviour': 'Joystick behaviour',
    'game.settings.joystickBehaviourHint': 'Choose how the movement stick appears.',
    'game.settings.fixed': 'Fixed',
    'game.settings.floating': 'Floating',
    'game.settings.joystickPosition': 'Position',
    'game.settings.edgePosition': 'Edge ({{side}})',
    'game.settings.middlePositionMiddle': 'Middle',
    'game.settings.innerPosition': 'Inner ({{side}})',
    'game.settings.pauseGame': 'Pause Game',
    'game.settings.leftDoubleOrRightClick': 'DOUBLE LEFT-CLICK OR RIGHT-CLICK',
    'game.settings.placeTurret': 'Place turret',
    'game.settings.pressKey': 'Press a key',
    'game.settings.pressKeyEllipsis': 'PRESS KEY…',
    'game.settings.actions.moveUp': 'Move up',
    'game.settings.actions.moveDown': 'Move down',
    'game.settings.actions.moveLeft': 'Move left',
    'game.settings.actions.moveRight': 'Move right',
    'game.settings.keyCannotAssign': 'This key cannot be assigned by your browser.',
    'game.touch.controls': 'Touch controls',
    'game.touch.movement': 'Movement',
    'game.touch.aim': 'Aim',
    'game.touch.useBomb': 'Use bomb',
    'game.tutorial.ariaLabel': 'Interactive game tutorial',
    'game.tutorial.confirmExit': 'Confirm tutorial exit',
    'game.tutorial.keepPlaying': 'Keep playing',
    'game.tutorial.exit': 'Exit tutorial',
    'game.tutorial.previous': 'Previous',
    'game.tutorial.continue': 'Continue',
    'game.tutorial.skipExercise': 'Skip exercise',
    'game.tutorial.steps.intro.title': 'Welcome to the arena',
    'game.tutorial.steps.player.title': 'Your survivor',
    'game.tutorial.steps.movement.title': 'Move around',
    'game.submission.title': 'Submit your run',
    'game.submission.name': 'Leaderboard name',
    'game.submission.enterName': 'Enter a name to submit your score.',
    'game.submission.submitting': 'Submitting…',
    'game.submission.retry': 'Retry submission',
    'game.submission.submitted': 'Score submitted',
    'game.submission.submit': 'Submit score',
    'game.submission.success': 'Score submitted successfully.',
    'game.submission.failed': 'Score submission failed. Check your connection and retry.',
  },
}));

vi.mock('@/game/core/GameEngine', () => {
  function makeSnapshot(gameMode = 'survival') {
    return {
      gameMode,
      score: 0,
      bombs: 1,
      arenaWidth: 800,
      arenaHeight: 600,
      player: { x: 100, y: 100, aimAngle: 0, shotsFired: 0 },
      wave: { phase: 'combat', waveNumber: 1 },
      statistics: {
        highestWaveCleared: 0,
        highestWaveReached: 1,
        zombiesKilled: 0,
        survivalSeconds: 0,
        orbsCollected: 0,
      },
      impacts: [],
      collectionEffects: [],
      activeEffects: [],
      zombies: [],
      items: [],
    };
  }

  return {
    GameEngine: class {
      state = makeSnapshot();
      initialize = vi.fn();
      start = vi.fn();
      pause = vi.fn();
      resume = vi.fn();
      destroy = vi.fn();
      resize = vi.fn();
      setKeyBindings = vi.fn();
      setMobileControls = vi.fn();
      updateTouchZones = vi.fn();
      requestBomb = vi.fn();
      getPerformanceSnapshotBuildMs = vi.fn(() => 0);
      recordPerformanceUiPoll = vi.fn();
      reset = vi.fn((gameMode: string) => {
        this.state = makeSnapshot(gameMode);
      });
      getGameState = vi.fn(() => this.state);
      constructor() {
        mocks.engines.push(this);
      }
    },
  };
});

vi.mock('@/game/audio/GameAudioController', () => ({
  GAME_MUSIC_TRACKS: [],
  getMusicTrackName: () => 'Test soundtrack',
  GameAudioController: class {
    dispose = vi.fn();
    setSettings = vi.fn();
    startMenuMusic = vi.fn();
    startGameplay = vi.fn();
    pauseGameplay = vi.fn();
    resumeGameplay = vi.fn();
    playCue = vi.fn();
    toggleCurrentMusic = vi.fn();
    constructor() {
      mocks.audios.push(this);
    }
  },
}));

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: (() => {
    const t = (key: string, options?: { key?: string }) => {
      const value = mocks.translations[key as keyof typeof mocks.translations] ?? key;
      return options?.key ? value.replace('{{key}}', options.key) : value;
    };
    return () => ({ i18n: mocks.i18n, t });
  })(),
}));

vi.mock('@/components/game/GameMenuOverlay', () => ({
  GameMenuOverlay: ({ mode, settings, onSettingsChange, onStart, onStartTutorial, onResume, onRestart, onReturnToMenu }: any) => (
    <section data-testid={`game-menu-${mode}`}>
      {mode === 'main' ? (
        <>
          <button type="button" onClick={() => onStart('survival')}>Start survival</button>
          <button type="button" onClick={onStartTutorial}>Start tutorial</button>
        </>
      ) : (
        <>
          <button type="button" onClick={onResume}>Resume run</button>
          <button type="button" onClick={onRestart}>Restart run</button>
          <button type="button" onClick={onReturnToMenu}>Return to main menu</button>
        </>
      )}
      {(['always', 'never', 'auto'] as const).map((touchControls) => (
        <button
          key={touchControls}
          type="button"
          onClick={() => onSettingsChange({ ...settings, touchControls })}
        >
          Touch {touchControls}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSettingsChange({ ...settings, alternatePauseKey: 'KeyQ' })}
      >
        Pause Q
      </button>
    </section>
  ),
}));

vi.mock('@/components/game/GameMusicPlayer', () => ({ GameMusicPlayer: () => null }));
vi.mock('@/components/game/GameHud', () => ({ GameHud: () => null }));
vi.mock('@/components/game/GamePhaseOverlays', () => ({ GamePhaseOverlays: () => null }));
vi.mock('@/components/game/GamePauseButton', () => ({
  GamePauseButton: ({ onPause }: { onPause: () => void }) => (
    <button type="button" onClick={onPause}>Pause run</button>
  ),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let queryClient: QueryClient | null = null;
let resizeObserverInstances: Array<{ observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = [];
let mediaQuery: MediaQueryList & { setMatches: (matches: boolean) => void };
let mediaChangeListeners: Array<(event: MediaQueryListEvent) => void>;
let fullscreenRequest: ReturnType<typeof vi.fn>;
let fullscreenExit: ReturnType<typeof vi.fn>;
let keyboardLock: ReturnType<typeof vi.fn>;
let keyboardUnlock: ReturnType<typeof vi.fn>;
let fullscreenPropertyDescriptors: Array<{
  target: object;
  property: string;
  descriptor: PropertyDescriptor | undefined;
}> = [];

const stateForScore = (gameMode: GameStateSnapshot['gameMode'] = 'standard') => ({
  gameMode,
  score: 1234,
  statistics: {
    highestWaveCleared: 5,
    highestWaveReached: 6,
    zombiesKilled: 42,
    survivalSeconds: 90.9,
  },
}) as GameStateSnapshot;

async function render(element: React.ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(element);
  });
  return container;
}

async function clickButton(label: string, scope: ParentNode = document) {
  const button = Array.from(scope.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.trim() === label ||
    candidate.textContent?.includes(label) ||
    candidate.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`Could not find button "${label}"`);
  await act(async () => button.click());
}

function findButton(label: string, scope: ParentNode = document) {
  const button = Array.from(scope.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.trim() === label ||
    candidate.textContent?.includes(label) ||
    candidate.getAttribute('aria-label') === label,
  );
  if (!button) throw new Error(`Could not find button "${label}"`);
  return button;
}

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submitForm(form: HTMLFormElement) {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
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
  throw new Error('Timed out waiting for game UI state');
}

function makeSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { ...DEFAULT_GAME_SETTINGS, ...overrides };
}

function renderSettings(onBack = vi.fn(), onChange = vi.fn()) {
  return render(
    <GameSettingsPanel
      settings={DEFAULT_GAME_SETTINGS}
      error={null}
      audioError={null}
      onChange={onChange}
      onBack={onBack}
      backLabel="Back to menu"
    />,
  ).then(() => ({ onBack, onChange }));
}

function renderScore(gameState: GameStateSnapshot) {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GameScoreSubmission gameState={gameState} />
    </QueryClientProvider>,
  );
}

async function mountGame() {
  await render(<GamePage />);
  return { engine: mocks.engines.at(-1)!, audio: mocks.audios.at(-1)! };
}

beforeEach(() => {
  window.history.replaceState(null, '', '/game');
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mocks.engines.length = 0;
  mocks.audios.length = 0;
  mocks.i18n.changeLanguage.mockClear();
  resizeObserverInstances = [];
  mediaChangeListeners = [];
  mediaQuery = {
    matches: false,
    media: '(pointer: coarse)',
    onchange: null,
    addListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => mediaChangeListeners.push(listener)),
    removeListener: vi.fn((listener: (event: MediaQueryListEvent) => void) => {
      mediaChangeListeners = mediaChangeListeners.filter((registered) => registered !== listener);
    }),
    addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') mediaChangeListeners.push(listener as (event: MediaQueryListEvent) => void);
    }),
    removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === 'function') {
        mediaChangeListeners = mediaChangeListeners.filter((registered) => registered !== listener);
      }
    }),
    dispatchEvent: vi.fn(() => true),
    setMatches(matches: boolean) {
      this.matches = matches;
      const event = { matches, media: this.media } as MediaQueryListEvent;
      mediaChangeListeners.forEach((listener) => listener(event));
    },
  } as unknown as MediaQueryList & { setMatches: (matches: boolean) => void };
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor() {
      resizeObserverInstances.push(this);
    }
  });
  fullscreenPropertyDescriptors = [
    { target: document, property: 'fullscreenEnabled', descriptor: Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled') },
    { target: document, property: 'fullscreenElement', descriptor: Object.getOwnPropertyDescriptor(document, 'fullscreenElement') },
    { target: document, property: 'exitFullscreen', descriptor: Object.getOwnPropertyDescriptor(document, 'exitFullscreen') },
    { target: HTMLElement.prototype, property: 'requestFullscreen', descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'requestFullscreen') },
    { target: navigator, property: 'keyboard', descriptor: Object.getOwnPropertyDescriptor(navigator, 'keyboard') },
  ];
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, writable: true, value: null });
  fullscreenRequest = vi.fn(function (this: HTMLElement) {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, writable: true, value: this });
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  fullscreenExit = vi.fn(() => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, writable: true, value: null });
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
  keyboardLock = vi.fn(() => Promise.resolve());
  keyboardUnlock = vi.fn();
  Object.defineProperty(navigator, 'keyboard', {
    configurable: true,
    value: { lock: keyboardLock, unlock: keyboardUnlock },
  });
  Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: fullscreenExit });
  Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: fullscreenRequest });
  vi.spyOn(window, 'setInterval').mockReturnValue(987 as unknown as number);
  vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);
  vi.mocked(toast.info).mockClear();
  vi.mocked(toast.error).mockClear();
  window.localStorage.clear();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = null;
  container?.remove();
  container = null;
  queryClient?.clear();
  queryClient = null;
  for (const { target, property, descriptor } of fullscreenPropertyDescriptors) {
    if (descriptor) Object.defineProperty(target, property, descriptor);
    else Reflect.deleteProperty(target, property);
  }
  fullscreenPropertyDescriptors = [];
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('game UI scenarios', () => {
  it('does not serialize the pause-menu click event into the URL when returning to the main menu', async () => {
    await mountGame();
    await clickButton('Start survival');
    await clickButton('Pause run');
    await clickButton('Return to main menu');

    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('home');
    expect(window.location.href).not.toContain('[object Object]');
    expect(container?.querySelector('[data-testid="game-menu-main"]')).not.toBeNull();
  });

  it('uses browser history to pause and resume an active run', async () => {
    await mountGame();
    await clickButton('Start survival');
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('playing');

    await clickButton('Pause run');
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('home');
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();

    await act(async () => {
      window.history.back();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('playing');
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).toBeNull();

    await act(async () => {
      window.history.forward();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(new URLSearchParams(window.location.search).get('gameMenu')).toBe('home');
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
  });

  it('only enters fullscreen after the user activates the fullscreen button', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();

    expect(fullscreenRequest).not.toHaveBeenCalled();

    await act(async () => {
      container?.querySelector('.game-canvas-frame')?.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true }),
      );
    });

    expect(fullscreenRequest).not.toHaveBeenCalled();

    await clickButton('Enter fullscreen');
    expect(fullscreenRequest).toHaveBeenCalledOnce();
    expect(document.fullscreenElement).toBe(container?.querySelector('.game-canvas-frame'));
  });

  it('uses Escape to toggle gameplay pause and resume', async () => {
    await mountGame();
    await clickButton('Start survival');

    await act(async () => {
      const event = new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
    expect(fullscreenExit).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));
    });

    expect(container?.querySelector('[data-testid="game-menu-pause"]')).toBeNull();
    expect(fullscreenExit).not.toHaveBeenCalled();
  });

  it('keeps Escape as pause and names the configured shortcut in fullscreen', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    await clickButton('Pause Q');
    await clickButton('Enter fullscreen');
    await clickButton('Start survival');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'Escape',
        bubbles: true,
      }));
    });

    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
    expect(toast.info).toHaveBeenCalledWith(
      'Press Q to pause the game in fullscreen mode.',
    );

    await clickButton('Resume run');
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyP',
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).toBeNull();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'KeyQ',
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
  });

  it('uses P as the default fullscreen pause reminder', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    await clickButton('Enter fullscreen');
    await clickButton('Start survival');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'Escape',
        bubbles: true,
      }));
    });

    expect(toast.info).toHaveBeenCalledWith(
      'Press P to pause the game in fullscreen mode.',
    );
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
  });

  it('locks Escape in fullscreen and prompts on a repeated hold without exiting immediately', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    await clickButton('Enter fullscreen');
    await clickButton('Start survival');

    expect(keyboardLock).toHaveBeenCalledWith(['Escape']);
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        repeat: true,
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        repeat: true,
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(toast.info).toHaveBeenCalledOnce();
    expect(toast.info).toHaveBeenCalledWith('Hold Esc to exit fullscreen.');
    expect(fullscreenExit).not.toHaveBeenCalled();
  });

  it('pauses if Escape makes the browser exit fullscreen before handling the key', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    await clickButton('Enter fullscreen');
    await clickButton('Start survival');

    await act(async () => fullscreenExit());

    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
    expect(mocks.engines.at(-1)?.pause).toHaveBeenCalled();
    expect(toast.info).toHaveBeenCalledWith(
      'Press P to pause the game in fullscreen mode.',
    );
  });

  it('prompts after two quick Escape taps even when the key is released between taps', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    await clickButton('Enter fullscreen');
    await clickButton('Start survival');

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'Escape',
        bubbles: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
      window.dispatchEvent(new KeyboardEvent('keyup', {
        code: 'Escape',
        bubbles: true,
      }));
    });

    expect(toast.info).toHaveBeenCalledTimes(3);
    expect(toast.info).toHaveBeenCalledWith('Hold Esc to exit fullscreen.');
    expect(toast.info).toHaveBeenCalledWith(
      'Press P to pause the game in fullscreen mode.',
    );
    expect(fullscreenExit).not.toHaveBeenCalled();
  });

  it('shows a fullscreen toggle to touch users in the menu, gameplay, and pause menu', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();

    let fullscreenButton = container?.querySelector<HTMLButtonElement>(
      '.game-fullscreen-button',
    );
    expect(fullscreenButton?.getAttribute('aria-label')).toBe('Enter fullscreen');

    await act(async () => fullscreenButton?.click());
    expect(fullscreenRequest).toHaveBeenCalledOnce();
    expect(
      container?.querySelector('.game-fullscreen-button')?.getAttribute('aria-label'),
    ).toBe('Exit fullscreen');

    await act(async () => {
      container?.querySelector('.game-fullscreen-button')?.click();
    });
    expect(fullscreenExit).toHaveBeenCalledOnce();
    expect(
      container?.querySelector('.game-fullscreen-button')?.getAttribute('aria-label'),
    ).toBe('Enter fullscreen');

    await clickButton('Start survival');
    fullscreenButton = container?.querySelector<HTMLButtonElement>(
      '.game-fullscreen-button',
    );
    expect(fullscreenButton?.getAttribute('data-near-pause')).toBe('true');

    await clickButton('Pause run');
    fullscreenButton = container?.querySelector<HTMLButtonElement>(
      '.game-fullscreen-button',
    );
    expect(fullscreenButton).not.toBeNull();
    expect(fullscreenButton?.getAttribute('data-near-pause')).toBe('false');
  });

  it('updates fullscreen button state when fullscreen changes outside the game', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await mountGame();
    const externalFullscreenElement = document.createElement('div');

    await act(async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        writable: true,
        value: externalFullscreenElement,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    const fullscreenButton = container?.querySelector<HTMLButtonElement>(
      '.game-fullscreen-button',
    );
    expect(fullscreenButton?.getAttribute('aria-label')).toBe('Exit fullscreen');

    await act(async () => fullscreenButton?.click());
    expect(fullscreenExit).toHaveBeenCalledOnce();
    expect(document.fullscreenElement).toBeNull();
  });

  it('shows the fullscreen toggle in the desktop pause menu but not during desktop gameplay', async () => {
    await mountGame();
    expect(container?.querySelector('.game-fullscreen-button')).toBeNull();

    await clickButton('Start survival');
    expect(container?.querySelector('.game-fullscreen-button')).toBeNull();

    await clickButton('Pause run');
    expect(container?.querySelector('.game-fullscreen-button')).not.toBeNull();
  });

  it('GAME-UI-01 mounts an initialized, paused game and cleans up listeners and polling', async () => {
    const addListener = vi.spyOn(window, 'addEventListener');
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { engine, audio } = await mountGame();

    expect(engine.initialize).toHaveBeenCalledOnce();
    expect(engine.start).toHaveBeenCalledOnce();
    expect(engine.pause).toHaveBeenCalledOnce();
    expect(audio.startMenuMusic).toHaveBeenCalledOnce();

    await act(async () => root?.unmount());
    root = null;

    expect(engine.destroy).toHaveBeenCalledOnce();
    expect(audio.dispose).toHaveBeenCalledOnce();
    expect(window.clearInterval).toHaveBeenCalledWith(987);
    expect(resizeObserverInstances[0].disconnect).toHaveBeenCalledOnce();
    expect(addListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(mediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('GAME-UI-02 starts a survival run and activates the canvas and gameplay audio', async () => {
    const { engine, audio } = await mountGame();
    await clickButton('Start survival');

    expect(engine.reset).toHaveBeenCalledWith('survival', null, 0, false, undefined, 0);
    expect(engine.resume).toHaveBeenCalledOnce();
    expect(audio.startGameplay).toHaveBeenCalledOnce();
    expect(container?.querySelector('[data-testid="game-menu-main"]')).toBeNull();
    expect(container?.querySelector('canvas')?.classList.contains('game-canvas-playing')).toBe(true);
    expect(document.activeElement).toBe(container?.querySelector('canvas'));
  });

  it('warns before leaving throughout a run, except on the menu or after campaign completion', async () => {
    const { engine } = await mountGame();
    const beforeUnload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(beforeUnload()).toBe(false);

    await clickButton('Start survival');
    expect(beforeUnload()).toBe(true);

    await clickButton('Pause run');
    expect(beforeUnload()).toBe(true);

    await clickButton('Resume run');
    expect(beforeUnload()).toBe(true);

    engine.state.wave.phase = 'gameOver';
    await clickButton('Pause run');
    expect(beforeUnload()).toBe(true);
  });

  it('GAME-UI-03 pauses and resumes simulation and audio, restoring canvas focus', async () => {
    const { engine, audio } = await mountGame();
    await clickButton('Start survival');
    await clickButton('Pause run');

    expect(engine.pause).toHaveBeenCalledTimes(2);
    expect(audio.pauseGameplay).toHaveBeenCalledOnce();
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();

    await clickButton('Resume run');
    expect(engine.resume).toHaveBeenCalledTimes(2);
    expect(audio.resumeGameplay).toHaveBeenCalledOnce();
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).toBeNull();
    expect(document.activeElement).toBe(container?.querySelector('canvas'));
  });

  it('GAME-UI-04 restarts the current run and clears transient run events', async () => {
    const { engine } = await mountGame();
    await clickButton('Start survival');
    engine.state.impacts = [{ id: 1, kind: 'hit' }];
    engine.state.collectionEffects = [{ id: 2 }];
    await clickButton('Pause run');
    await clickButton('Restart run');

    expect(engine.reset).toHaveBeenLastCalledWith('survival', null, 0, false, undefined, 0);
    expect(engine.getGameState().impacts).toEqual([]);
    expect(engine.getGameState().collectionEffects).toEqual([]);
    expect(container?.querySelector('[data-testid="game-menu-pause"]')).not.toBeNull();
  });

  it('GAME-UI-05 returns to a paused survival main menu and resets tutorial state', async () => {
    const { engine, audio } = await mountGame();
    await clickButton('Start tutorial');
    await clickButton('Continue');
    await clickButton('Continue');
    await clickButton('Skip exercise');
    await clickButton('Exit tutorial');
    await clickButton('Exit tutorial');

    expect(engine.reset).toHaveBeenLastCalledWith('survival');
    expect(engine.pause).toHaveBeenCalled();
    expect(audio.pauseGameplay).toHaveBeenCalled();
    expect(audio.startMenuMusic).toHaveBeenCalledTimes(2);
    expect(container?.querySelector('[data-testid="game-menu-main"]')).not.toBeNull();
    expect(container?.querySelector('[aria-label="Interactive game tutorial"]')).toBeNull();
  });

  it('GAME-UI-06 starts a fresh tutorial and navigates between paused and running steps', async () => {
    const { engine, audio } = await mountGame();
    await clickButton('Start tutorial');
    expect(engine.reset).toHaveBeenLastCalledWith('survival');
    expect(container?.textContent).toContain('Welcome to the arena');
    expect(engine.pause).toHaveBeenCalled();

    await clickButton('Continue');
    expect(container?.textContent).toContain('Your survivor');
    await clickButton('Continue');
    expect(container?.textContent).toContain('Move around');
    expect(engine.resume).toHaveBeenCalled();
    expect(audio.resumeGameplay).toHaveBeenCalled();
  });

  it('GAME-UI-07 confirms tutorial exit and restores only a previously running step on cancel', async () => {
    const { engine, audio } = await mountGame();
    await clickButton('Start tutorial');
    await clickButton('Continue');
    await clickButton('Continue');
    const resumesBeforeExit = engine.resume.mock.calls.length;
    const audioResumesBeforeExit = audio.resumeGameplay.mock.calls.length;

    await clickButton('Exit tutorial');
    expect(container?.querySelector('[aria-label="Confirm tutorial exit"]')).not.toBeNull();
    await clickButton('Keep playing');
    expect(engine.resume).toHaveBeenCalledTimes(resumesBeforeExit + 1);
    expect(audio.resumeGameplay).toHaveBeenCalledTimes(audioResumesBeforeExit + 1);
    expect(container?.textContent).toContain('Move around');

    await clickButton('Previous');
    const pausedStepResumeCount = engine.resume.mock.calls.length;
    await clickButton('Exit tutorial');
    await clickButton('Keep playing');
    expect(engine.resume).toHaveBeenCalledTimes(pausedStepResumeCount);
    expect(container?.textContent).toContain('Your survivor');
  });

  it('GAME-UI-08 exits the tutorial to the main menu without resuming simulation', async () => {
    const { engine } = await mountGame();
    await clickButton('Start tutorial');
    const resumesBeforeExit = engine.resume.mock.calls.length;
    await clickButton('Exit tutorial');
    await clickButton('Exit tutorial');

    expect(container?.querySelector('[aria-label="Interactive game tutorial"]')).toBeNull();
    expect(container?.querySelector('[data-testid="game-menu-main"]')).not.toBeNull();
    expect(engine.pause).toHaveBeenCalled();
    expect(engine.resume).toHaveBeenCalledTimes(resumesBeforeExit);
  });

  it('GAME-UI-09 changes settings sections, cancels key capture, and navigates Back', async () => {
    const { onBack, onChange } = await renderSettings();
    await clickButton('Controls');
    const moveUp = findButton('Move up: W');
    await act(async () => moveUp.click());
    expect(moveUp.getAttribute('aria-pressed')).toBe('true');

    await clickButton('Audio');
    await clickButton('Controls');
    expect(findButton('Move up: W').getAttribute('aria-pressed')).toBe('false');
    expect(onChange).not.toHaveBeenCalled();

    await clickButton('Back to menu');
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows touch settings and hides keyboard bindings on touch devices', async () => {
    await act(async () => mediaQuery.setMatches(true));
    await renderSettings();
    await clickButton('Controls');

    expect(container?.textContent).toContain('Touch Controls');
    expect(container?.querySelector('.settings-key-grid')).toBeNull();
  });

  it('shows Pause Game in the key grid and identifies turret placement as a double left click', async () => {
    await renderSettings();
    await clickButton('Controls');

    const keyGrid = container?.querySelector('.settings-key-grid');
    const controlLabels = Array.from(
      keyGrid?.querySelectorAll('.settings-key-row') ?? [],
    ).map((row) => row.getAttribute('aria-label'));
    expect(controlLabels.indexOf('Pause Game: P')).toBe(
      controlLabels.indexOf('Move right: D') + 1,
    );
    expect(keyGrid?.querySelector('.settings-pause-shortcut')).toBeNull();
    expect(keyGrid?.textContent).not.toContain('Escape always pauses');
    expect(
      keyGrid?.querySelector('[aria-label="Place turret: DOUBLE LEFT-CLICK OR RIGHT-CLICK"]'),
    ).not.toBeNull();
    expect(keyGrid?.querySelector('.settings-mouse-right-button')).not.toBeNull();
    expect(keyGrid?.querySelector('.settings-mouse-left-button')).not.toBeNull();
  });

  it('GAME-UI-10 captures a supported key binding and ends capture mode', async () => {
    const onChange = vi.fn();
    await renderSettings(vi.fn(), onChange);
    await clickButton('Controls');
    const moveUp = findButton('Move up: W');
    await act(async () => moveUp.click());
    await act(async () => {
      moveUp.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'i',
        code: 'KeyI',
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      keyBindings: expect.objectContaining({ moveUp: 'KeyI' }),
    }));
    expect(moveUp.getAttribute('aria-pressed')).toBe('false');
  });

  it('captures an alternate pause key without allowing Escape to be reassigned', async () => {
    const onChange = vi.fn();
    await renderSettings(vi.fn(), onChange);
    await clickButton('Controls');

    const pauseGameKey = findButton('Pause Game: P');
    await act(async () => pauseGameKey.click());
    await act(async () => {
      pauseGameKey.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'q',
        code: 'KeyQ',
        bubbles: true,
        cancelable: true,
      }));
    });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      alternatePauseKey: 'KeyQ',
    }));

    await act(async () => pauseGameKey.click());
    await act(async () => {
      pauseGameKey.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(pauseGameKey.getAttribute('aria-pressed')).toBe('false');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('GAME-UI-11 rejects an empty key code and lets Escape cancel capture unchanged', async () => {
    const onChange = vi.fn();
    await renderSettings(vi.fn(), onChange);
    await clickButton('Controls');
    const moveUp = findButton('Move up: W');
    await act(async () => moveUp.click());
    await act(async () => {
      moveUp.dispatchEvent(new KeyboardEvent('keydown', {
        code: '',
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(container?.querySelector('[role="status"]')?.textContent).toContain('This key cannot be assigned');
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      moveUp.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        code: 'Escape',
        bubbles: true,
        cancelable: true,
      }));
    });
    expect(moveUp.getAttribute('aria-pressed')).toBe('false');
    expect(container?.querySelector('[role="status"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows touch settings without desktop key bindings on touch devices', async () => {
    await act(async () => mediaQuery.setMatches(true));
    const onChange = vi.fn();
    await renderSettings(vi.fn(), onChange);
    await clickButton('Controls');

    expect(container?.textContent).toContain('Touch Controls');
    expect(container?.querySelector('[aria-label="Key bindings"]')).toBeNull();
    await clickButton('Left-handed');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        touchControlSettings: expect.objectContaining({ layout: 'left' }),
      }),
    );
  });

  it('updates both-stick appearance settings and renders their shared live preview', async () => {
    await act(async () => mediaQuery.setMatches(true));
    const onChange = vi.fn();
    await renderSettings(vi.fn(), onChange);
    await clickButton('Controls');

    const preview = container?.querySelector<HTMLElement>(
      '.game-joystick-preview-row',
    );
    expect(preview?.dataset.size).toBe('medium');
    expect(
      preview?.querySelectorAll('.game-joystick-preview'),
    ).toHaveLength(2);
    expect(preview?.getAttribute('aria-label')).toBe(
      'Live preview of movement and aim sticks',
    );

    const baseOpacity = container?.querySelector<HTMLInputElement>(
      'input[aria-label="Base and glow opacity"]',
    );
    expect(baseOpacity).not.toBeNull();
    await setInputValue(baseOpacity!, '20');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        touchControlSettings: expect.objectContaining({ baseOpacity: 20 }),
      }),
    );

    await clickButton('Large');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        touchControlSettings: expect.objectContaining({ joystickSize: 'large' }),
      }),
    );
  });

  it('GAME-UI-12 mounts touch controls for Always, hides them for Never, and follows Auto media changes', async () => {
    await mountGame();
    expect(container?.querySelector('[aria-label="Touch controls"]')).toBeNull();

    await clickButton('Touch always');
    expect(container?.querySelector('[aria-label="Touch controls"]')).not.toBeNull();
    await clickButton('Touch never');
    expect(container?.querySelector('[aria-label="Touch controls"]')).toBeNull();

    await clickButton('Touch auto');
    expect(container?.querySelector('[aria-label="Touch controls"]')).toBeNull();
    await act(async () => mediaQuery.setMatches(true));
    expect(container?.querySelector('[aria-label="Touch controls"]')).not.toBeNull();
    await act(async () => mediaQuery.setMatches(false));
    expect(container?.querySelector('[aria-label="Touch controls"]')).toBeNull();
  });

  it('GAME-UI-13 invokes the bomb action only when the touch bomb control is enabled', async () => {
    const onUseBomb = vi.fn();
    const movementRef = createRef<HTMLButtonElement>();
    const aimRef = createRef<HTMLButtonElement>();
    const firstBombRef = createRef<HTMLDivElement>();
    const secondBombRef = createRef<HTMLDivElement>();
    const firstRootRef = createRef<HTMLDivElement>();
    const secondRootRef = createRef<HTMLDivElement>();
    await render(
      <>
        <GameTouchControls
          active
          bombs={2}
          controlSettings={DEFAULT_GAME_SETTINGS.touchControlSettings}
          onZonesChange={vi.fn()}
          rootRef={firstRootRef}
          onUseBomb={onUseBomb}
          movementRef={movementRef}
          aimRef={aimRef}
          bombRef={firstBombRef}
        />
        <GameTouchControls
          active
          bombs={0}
          controlSettings={DEFAULT_GAME_SETTINGS.touchControlSettings}
          onZonesChange={vi.fn()}
          rootRef={secondRootRef}
          onUseBomb={onUseBomb}
          movementRef={createRef<HTMLButtonElement>()}
          aimRef={createRef<HTMLButtonElement>()}
          bombRef={secondBombRef}
        />
      </>,
    );
    const bombs = Array.from(container!.querySelectorAll('button[aria-label^="Use bomb"]'));
    expect(bombs[0].disabled).toBe(false);
    expect(bombs[1].disabled).toBe(true);
    await act(async () => (bombs[0] as HTMLButtonElement).click());
    await act(async () => (bombs[1] as HTMLButtonElement).click());
    expect(onUseBomb).toHaveBeenCalledOnce();
  });

  it('keeps the touch-controls subtree render count flat during pointer drags (proxy)', async () => {
    const movementRef = createRef<HTMLButtonElement>();
    const aimRef = createRef<HTMLButtonElement>();
    const bombRef = createRef<HTMLDivElement>();
    const rootRef = createRef<HTMLDivElement>();
    const profile = vi.fn();
    await render(
      <Profiler id="touch-controls-proxy" onRender={profile}>
        <GameTouchControls
          active
          bombs={1}
          controlSettings={DEFAULT_GAME_SETTINGS.touchControlSettings}
          onZonesChange={vi.fn()}
          rootRef={rootRef}
          onUseBomb={vi.fn()}
          movementRef={movementRef}
          aimRef={aimRef}
          bombRef={bombRef}
        />
      </Profiler>,
    );

    const movement = movementRef.current!;
    const aim = aimRef.current!;
    movement.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    aim.getBoundingClientRect = movement.getBoundingClientRect;
    const capture = new Set<number>();
    for (const element of [movement, aim]) {
      element.setPointerCapture = vi.fn((id: number) => capture.add(id));
      element.hasPointerCapture = vi.fn((id: number) => capture.has(id));
      element.releasePointerCapture = vi.fn((id: number) => capture.delete(id));
    }

    const input = new DualJoystickInput();
    input.attach(movement, aim, vi.fn(), vi.fn());
    const commitCountAfterMount = profile.mock.calls.length;
    const createPointerEvent = (type: string, clientX: number) => {
      const event = new Event(type, { cancelable: true }) as PointerEvent;
      Object.defineProperties(event, {
        pointerId: { value: 31 },
        pointerType: { value: 'touch' },
        clientX: { value: clientX },
        clientY: { value: 50 },
      });
      return event;
    };

    await act(async () => {
      movement.dispatchEvent(createPointerEvent('pointerdown', 50));
      movement.dispatchEvent(createPointerEvent('pointermove', 80));
      movement.dispatchEvent(createPointerEvent('pointermove', 90));
      movement.dispatchEvent(createPointerEvent('pointerup', 90));
    });

    expect(profile).toHaveBeenCalledTimes(commitCountAfterMount);
    input.detach();
  });

  it('GAME-UI-14 rejects blank and whitespace-only leaderboard names accessibly', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await renderScore(stateForScore());
    const form = container?.querySelector('form') as HTMLFormElement;

    await submitForm(form);
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('Enter a name');
    expect(fetchMock).not.toHaveBeenCalled();

    await setInputValue(container!.querySelector('input')!, '   ');
    await submitForm(form);
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('Enter a name');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('GAME-UI-15 submits a trimmed eligible score once and disables duplicate submission', async () => {
    let resolveResponse!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal('fetch', fetchMock);
    await renderScore(stateForScore());
    const input = container!.querySelector('input')!;
    const form = container!.querySelector('form')!;
    await setInputValue(input, '  Alex Player  ');
    await submitForm(form);

    await waitFor(() => fetchMock.mock.calls.length === 1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      playerName: 'Alex Player',
      score: 1234,
      waveCleared: 5,
      waveReached: 6,
      zombiesKilled: 42,
      survivalTime: 90,
    });
    expect(input.disabled).toBe(true);
    expect(findButton('Submitting…').disabled).toBe(true);

    await act(async () => resolveResponse(new Response(
      JSON.stringify({ message: 'ok', scoreReference: 'score-1' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )));
    await waitFor(() => container?.querySelector('[role="status"]') !== null);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(findButton('Score submitted').disabled).toBe(true);
  });

  it('GAME-UI-16 does not render score submission for an ineligible level run', async () => {
    await renderScore(stateForScore('level'));
    expect(container?.querySelector('form')).toBeNull();
    expect(container?.textContent).not.toContain('Submit your run');
  });

  it('GAME-UI-17 shows submission failure, allows retry, and confirms the retry success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: 'Leaderboard is unavailable' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      ))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ message: 'ok', scoreReference: 'score-2' }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);
    await renderScore(stateForScore());
    await setInputValue(container!.querySelector('input')!, 'Alex');
    const form = container!.querySelector('form')!;

    await submitForm(form);
    await waitFor(() => container?.querySelector('[role="alert"]') !== null);
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain('Leaderboard is unavailable');
    expect(findButton('Retry submission').disabled).toBe(false);

    await submitForm(form);
    await waitFor(() => container?.querySelector('[role="status"]') !== null);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(findButton('Score submitted').disabled).toBe(true);
  });
});
