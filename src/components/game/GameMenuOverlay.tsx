import { useState } from 'react';
import type { GameSettings } from '@/game/core/GameSettings';
import { GameSettingsPanel } from './GameSettingsPanel';

type MenuView = 'home' | 'instructions' | 'settings';
export type GameMenuMode = 'main' | 'pause';

interface GameMenuOverlayProps {
  readonly mode: GameMenuMode;
  readonly settings: GameSettings;
  readonly settingsError: string | null;
  readonly onSettingsChange: (settings: GameSettings) => void;
  readonly onStart: () => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
}

export function GameMenuOverlay({
  mode,
  settings,
  settingsError,
  onSettingsChange,
  onStart,
  onResume,
  onRestart,
  onReturnToMenu,
}: GameMenuOverlayProps) {
  const [view, setView] = useState<MenuView>('home');
  const isMainMenu = mode === 'main';
  const titleId = view === 'settings'
    ? 'game-settings-title'
    : isMainMenu
      ? view === 'home'
        ? 'game-menu-title'
        : 'game-instructions-title'
      : 'game-paused-title';

  return (
    <>
      <div className="game-modal-backdrop" aria-hidden="true" />
      <section
        className="game-menu-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {view === 'settings' ? (
          <GameSettingsPanel
            settings={settings}
            error={settingsError}
            onChange={onSettingsChange}
            onBack={() => setView('home')}
            backLabel={isMainMenu ? 'Back to menu' : 'Back to pause menu'}
          />
        ) : isMainMenu ? (
          view === 'home' ? (
            <>
              <p className="game-panel-eyebrow">State 565 presents</p>
              <h1 id="game-menu-title">Zombie Survival</h1>
              <p>Survive each wave, collect supplies, and build your run.</p>
              <div className="game-menu-actions game-home-actions">
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={onStart}
                  autoFocus
                >
                  Start run
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('instructions')}
                >
                  How to play
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('settings')}
                >
                  Settings
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="game-panel-eyebrow">Field guide</p>
              <h1 id="game-instructions-title">How to play</h1>
              <ul className="game-instructions">
                <li>
                  <strong>Move:</strong> WASD or arrow keys; use the left
                  joystick on touchscreens.
                </li>
                <li>
                  <strong>Aim:</strong> Mouse or right joystick. Your weapon
                  fires in the selected direction.
                </li>
                <li>
                  <strong>Survive:</strong> Avoid zombies and arena obstacles,
                  collect orbs, and choose upgrades between waves.
                </li>
                <li>
                  <strong>Pause:</strong> Use the Pause button or press Escape.
                </li>
              </ul>
              <div className="game-menu-actions">
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={onStart}
                  autoFocus
                >
                  Start run
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('home')}
                >
                  Back
                </button>
              </div>
            </>
          )
        ) : (
          <>
            <p className="game-panel-eyebrow">Take a breather</p>
            <h1 id="game-paused-title">Game paused</h1>
            <p>The arena is waiting. Resume when you’re ready.</p>
            <div className="game-menu-actions">
              <button
                className="game-menu-primary"
                type="button"
                onClick={onResume}
                autoFocus
              >
                Resume
              </button>
              <button
                className="game-menu-secondary"
                type="button"
                onClick={() => setView('settings')}
              >
                Settings
              </button>
              <button
                className="game-menu-secondary"
                type="button"
                onClick={onRestart}
              >
                Restart run
              </button>
              <button
                className="game-menu-secondary"
                type="button"
                onClick={onReturnToMenu}
              >
                Main menu
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
