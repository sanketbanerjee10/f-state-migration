import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameSettings } from '@/game/core/GameSettings';
import type {
  GameStateSnapshot,
  GameMode,
  RunStatAttribute,
} from '@/game/core/GameState';
import type { RareUpgradeId } from '@/game/upgrades';
import { GameEnemyGuide } from './GameEnemyGuide';
import { GameLeaderboardPanel } from './GameLeaderboardPanel';
import { GameMainMenu } from './GameMainMenu';
import { GameMusicPlayer } from './GameMusicPlayer';
import { GamePauseMenu } from './GamePauseMenu';
import { GameSettingsPanel } from './GameSettingsPanel';
import type { GameMenuMode, GameMenuView } from './GameMenuTypes';

export type { GameMenuMode } from './GameMenuTypes';

interface GameMenuOverlayProps {
  readonly mode: GameMenuMode;
  readonly settings: GameSettings;
  readonly settingsError: string | null;
  readonly audioError: string | null;
  readonly musicTrackName: string;
  readonly musicPlaying: boolean;
  readonly musicEnabled: boolean;
  readonly onToggleMusic: () => void;
  readonly gameState: GameStateSnapshot | null;
  readonly onSettingsChange: (settings: GameSettings) => void;
  readonly onStart: (gameMode: GameMode, levelId?: number) => void;
  readonly onStartTutorial: () => void;
  readonly onResume: () => void;
  readonly onAdjustStat: (
    attribute: RunStatAttribute,
    adjustment: -1 | 1,
  ) => void;
  readonly onAdjustRareUpgrade: (
    upgradeId: RareUpgradeId,
    adjustment: -1 | 1,
  ) => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
  readonly initialView?: 'home' | 'level-select';
  readonly highlightPauseMenu?: boolean;
  readonly tutorialMode?: boolean;
}

export function GameMenuOverlay({
  mode,
  settings,
  settingsError,
  audioError,
  musicTrackName,
  musicPlaying,
  musicEnabled,
  onToggleMusic,
  gameState,
  onSettingsChange,
  onStart,
  onStartTutorial,
  onResume,
  onAdjustStat,
  onAdjustRareUpgrade,
  onRestart,
  onReturnToMenu,
  initialView = 'home',
  highlightPauseMenu = false,
  tutorialMode = false,
}: GameMenuOverlayProps) {
  const [view, setView] = useState<GameMenuView>(initialView);
  const overlayRef = useRef<HTMLElement>(null);
  const isMainMenu = mode === 'main';

  useLayoutEffect(() => {
    if (overlayRef.current) overlayRef.current.scrollTop = 0;
  }, [view]);

  useEffect(() => {
    if (view !== 'leaderboard') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setView('home');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view]);

  const titleId = isMainMenu
    ? 'game-menu-title'
    : view === 'settings'
      ? 'game-paused-title'
      : view === 'leaderboard'
        ? 'game-leaderboard-title'
        : view === 'enemy-guide'
          ? 'game-enemy-guide-title'
          : view === 'level-select' || isMainMenu
            ? 'game-menu-title'
            : 'game-paused-title';
  const backLabel = isMainMenu ? 'Back to menu' : 'Back to pause menu';

  return (
    <>
      {isMainMenu ? (
        <div className="game-modal-backdrop" aria-hidden="true" />
      ) : (
        <button
          className="game-modal-backdrop game-pause-backdrop"
          type="button"
          aria-label="Resume game"
          onClick={onResume}
        />
      )}
      <section
        ref={overlayRef}
        className={[
          'game-menu-overlay',
          isMainMenu ? 'game-main-menu-overlay' : 'game-pause-overlay',
          view === 'enemy-guide' && !isMainMenu ? 'game-guide-dialog' : '',
          view === 'leaderboard' && !isMainMenu ? 'game-leaderboard-menu' : '',
          highlightPauseMenu ? 'game-pause-overlay-highlighted' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal={view !== 'settings' && !(isMainMenu && view === 'leaderboard')}
        aria-hidden={isMainMenu && (view === 'enemy-guide' || view === 'leaderboard')}
        aria-labelledby={titleId}
      >
        {isMainMenu &&
          (view === 'home' ||
            view === 'level-select' ||
            view === 'settings' ||
            view === 'enemy-guide' ||
            view === 'leaderboard') && (
            <GameMainMenu
              view="home"
              onViewChange={setView}
              onStart={onStart}
              onStartTutorial={onStartTutorial}
            />
          )}
        {!isMainMenu && (
          <GamePauseMenu
            active={view === 'home' || view === 'settings'}
            gameState={gameState}
            onViewChange={setView}
            onResume={onResume}
            onAdjustStat={onAdjustStat}
            onAdjustRareUpgrade={onAdjustRareUpgrade}
            onRestart={onRestart}
            onReturnToMenu={onReturnToMenu}
            tutorialMode={tutorialMode}
          />
        )}
        {view === 'leaderboard' && !isMainMenu ? (
          <GameLeaderboardPanel
            onBack={() => setView('home')}
            backLabel={backLabel}
          />
        ) : view === 'enemy-guide' && !isMainMenu ? (
          <GameEnemyGuide
            onBack={() => setView('home')}
            backLabel={backLabel}
          />
        ) : view === 'level-select' && !isMainMenu ? (
          <GameMainMenu
            view="level-select"
            onViewChange={setView}
            onStart={onStart}
            onStartTutorial={onStartTutorial}
          />
        ) : null}
        {isMainMenu && view === 'level-select' && (
          <>
            <button
              className="game-level-select-backdrop"
              type="button"
              aria-label="Close campaign selection"
              onClick={() => setView('home')}
            />
            <section
              className="game-level-select-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-menu-title"
            >
              <GameMainMenu
                view="level-select"
                onViewChange={setView}
                onStart={onStart}
                onStartTutorial={onStartTutorial}
              />
            </section>
          </>
        )}
      </section>
      {isMainMenu && view === 'leaderboard' && (
        <>
          <button
            className="game-leaderboard-backdrop"
            type="button"
            aria-label="Close leaderboard"
            onClick={() => setView('home')}
          />
          <section
            className="game-leaderboard-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-leaderboard-title"
          >
            <GameLeaderboardPanel
              onBack={() => setView('home')}
              backLabel={backLabel}
            />
          </section>
        </>
      )}
      {isMainMenu && view === 'enemy-guide' && (
        <>
          <button
            className="game-guide-backdrop"
            type="button"
            aria-label="Close guides"
            onClick={() => setView('home')}
          />
          <section
            className="game-guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-enemy-guide-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setView('home');
            }}
          >
            <GameEnemyGuide
              onBack={() => setView('home')}
              backLabel={backLabel}
            />
          </section>
        </>
      )}
      {view === 'settings' && (
        <>
          <button
            className="game-settings-backdrop"
            type="button"
            aria-label="Close settings"
            onClick={() => setView('home')}
          />
          <section
            className="game-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-settings-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setView('home');
            }}
          >
            <GameSettingsPanel
              settings={settings}
              error={settingsError}
              audioError={audioError}
              onChange={onSettingsChange}
              onBack={() => setView('home')}
              backLabel={backLabel}
            />
          </section>
        </>
      )}
      {isMainMenu && (
        <GameMusicPlayer
          trackName={musicTrackName}
          isPlaying={musicPlaying}
          musicEnabled={musicEnabled}
          onToggle={onToggleMusic}
          floating
        />
      )}
    </>
  );
}
