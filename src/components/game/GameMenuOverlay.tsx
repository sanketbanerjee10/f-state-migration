import { useLayoutEffect, useRef, useState } from 'react';
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

  const titleId =
    view === 'settings'
      ? 'game-settings-title'
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
          view === 'enemy-guide' ? 'game-enemy-guide-overlay' : '',
          view === 'level-select' ? 'game-level-select-overlay' : '',
          highlightPauseMenu ? 'game-pause-overlay-highlighted' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {!isMainMenu && (
          <GamePauseMenu
            active={view === 'home'}
            gameState={gameState}
            musicTrackName={musicTrackName}
            musicPlaying={musicPlaying}
            musicEnabled={musicEnabled}
            onToggleMusic={onToggleMusic}
            onViewChange={setView}
            onResume={onResume}
            onAdjustStat={onAdjustStat}
            onAdjustRareUpgrade={onAdjustRareUpgrade}
            onRestart={onRestart}
            onReturnToMenu={onReturnToMenu}
            tutorialMode={tutorialMode}
          />
        )}
        {view === 'settings' ? (
          <GameSettingsPanel
            settings={settings}
            error={settingsError}
            audioError={audioError}
            onChange={onSettingsChange}
            onBack={() => setView('home')}
            backLabel={backLabel}
          />
        ) : view === 'leaderboard' ? (
          <GameLeaderboardPanel onBack={() => setView('home')} />
        ) : view === 'enemy-guide' ? (
          <GameEnemyGuide
            onBack={() => setView('home')}
            backLabel={backLabel}
          />
        ) : view === 'level-select' ? (
          <GameMainMenu
            view="level-select"
            onViewChange={setView}
            onStart={onStart}
            onStartTutorial={onStartTutorial}
          />
        ) : isMainMenu ? (
          <GameMainMenu
            view="home"
            onViewChange={setView}
            onStart={onStart}
            onStartTutorial={onStartTutorial}
          />
        ) : null}
      </section>
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
