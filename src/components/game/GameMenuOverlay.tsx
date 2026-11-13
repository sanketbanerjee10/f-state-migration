import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  getGameMenuView,
  pushGameMenuNavigationState,
} from './GameMenuNavigation';

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
  const { t } = useTranslation();
  const [view, setView] = useState<GameMenuView>(() =>
    getGameMenuView(window.location.search, initialView),
  );
  const overlayRef = useRef<HTMLElement>(null);
  const isMainMenu = mode === 'main';

  const navigateToView = (nextView: GameMenuView) => {
    if (nextView === view) return;
    pushGameMenuNavigationState(nextView);
    setView(nextView);
  };

  useEffect(() => {
    const handlePopState = () => {
      setView(getGameMenuView(window.location.search, initialView));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialView]);

  useLayoutEffect(() => {
    if (overlayRef.current) overlayRef.current.scrollTop = 0;
  }, [view]);

  useEffect(() => {
    if (view !== 'leaderboard') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      navigateToView('home');
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
  const backLabel = t(isMainMenu ? 'game.menu.backToMenu' : 'game.menu.backToPauseMenu');

  return (
    <>
      {isMainMenu ? (
        <div className="game-modal-backdrop" aria-hidden="true" />
      ) : (
        <button
          className="game-modal-backdrop game-pause-backdrop"
          type="button"
          aria-label={t('game.menu.resumeGame')}
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
              onViewChange={navigateToView}
              onStart={onStart}
              onStartTutorial={onStartTutorial}
            />
          )}
        {!isMainMenu && (
          <GamePauseMenu
            active={view === 'home' || view === 'settings'}
            gameState={gameState}
            onViewChange={navigateToView}
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
            onBack={() => navigateToView('home')}
            backLabel={backLabel}
          />
        ) : view === 'enemy-guide' && !isMainMenu ? (
          <GameEnemyGuide
            onBack={() => navigateToView('home')}
            backLabel={backLabel}
          />
        ) : view === 'level-select' && !isMainMenu ? (
          <GameMainMenu
            view="level-select"
            onViewChange={navigateToView}
            onStart={onStart}
            onStartTutorial={onStartTutorial}
          />
        ) : null}
        {isMainMenu && view === 'level-select' && (
          <>
            <button
              className="game-level-select-backdrop"
              type="button"
              aria-label={t('game.menu.closeCampaign')}
              onClick={() => navigateToView('home')}
            />
            <section
              className="game-level-select-overlay"
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-menu-title"
            >
              <GameMainMenu
                view="level-select"
                onViewChange={navigateToView}
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
            aria-label={t('game.menu.closeLeaderboard')}
            onClick={() => navigateToView('home')}
          />
          <section
            className="game-leaderboard-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-leaderboard-title"
          >
            <GameLeaderboardPanel
              onBack={() => navigateToView('home')}
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
            aria-label={t('game.menu.closeGuides')}
            onClick={() => navigateToView('home')}
          />
          <section
            className="game-guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-enemy-guide-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') navigateToView('home');
            }}
          >
            <GameEnemyGuide
              onBack={() => navigateToView('home')}
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
            aria-label={t('game.menu.closeSettings')}
            onClick={() => navigateToView('home')}
          />
          <section
            className="game-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-settings-title"
            onKeyDown={(event) => {
              if (event.key === 'Escape') navigateToView('home');
            }}
          >
            <GameSettingsPanel
              settings={settings}
              error={settingsError}
              audioError={audioError}
              onChange={onSettingsChange}
              onBack={() => navigateToView('home')}
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
