import { useLayoutEffect, useRef, useState } from 'react';
import { Music2, Pause, Play } from 'lucide-react';
import type { GameSettings } from '@/game/core/GameSettings';
import type {
  GameStateSnapshot,
  GameMode,
  RunStatAttribute,
} from '@/game/core/GameState';
import {
  canStartLevel,
  getEnemyDisplayNames,
  LEVEL_DEFINITIONS,
  readLevelCampaignProgress,
} from '@/game/core/LevelCampaign';
import {
  getRareUpgradeCost,
  getRareUpgradeNextEffectText,
  isRareUpgradeUnlocked,
  RARE_UPGRADE_DEFINITIONS,
  RARE_UPGRADE_ORDER,
  type RareUpgradeId,
} from '@/game/upgrades';
import { GameSettingsPanel } from './GameSettingsPanel';
import { GameActiveEffects } from './GameActiveEffects';
import { GameEnemyGuide } from './GameEnemyGuide';
import { GameOrbGuide } from './GameOrbGuide';
import { GameLeaderboardPanel } from './GameLeaderboardPanel';

type MenuView = 'home' | 'settings' | 'leaderboard' | 'enemy-guide' | 'orb-guide' | 'level-select';
export type GameMenuMode = 'main' | 'pause';

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

interface GameMusicPlayerProps {
  readonly trackName: string;
  readonly isPlaying: boolean;
  readonly musicEnabled: boolean;
  readonly onToggle: () => void;
  readonly floating?: boolean;
}

export function GameMusicPlayer({
  trackName,
  isPlaying,
  musicEnabled,
  onToggle,
  floating = false,
}: GameMusicPlayerProps) {
  return (
    <div
      className={[
        'game-music-player-controls',
        floating ? 'game-music-player-controls-floating' : '',
      ].filter(Boolean).join(' ')}
    >
      <button
        className="game-music-player"
        type="button"
        aria-label={`${isPlaying ? 'Pause' : 'Play'} music`}
        aria-pressed={isPlaying}
        disabled={!musicEnabled}
        onClick={onToggle}
      >
        <Music2 className="game-music-player-icon" aria-hidden="true" />
        <span className="game-music-player-title">{trackName}</span>
        <span
          className={`game-music-bars${isPlaying ? ' is-playing' : ''}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
        </span>
        {isPlaying
          ? <Pause className="game-music-player-toggle" aria-hidden="true" />
          : <Play className="game-music-player-toggle" aria-hidden="true" />}
      </button>
    </div>
  );
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
  const [view, setView] = useState<MenuView>(initialView);
  const [campaignProgress, setCampaignProgress] = useState(
    readLevelCampaignProgress,
  );
  const overlayRef = useRef<HTMLElement>(null);
  const isMainMenu = mode === 'main';
  const levelCards = LEVEL_DEFINITIONS;
  useLayoutEffect(() => {
    if (overlayRef.current) overlayRef.current.scrollTop = 0;
  }, [view]);
  const titleId = view === 'settings'
    ? 'game-settings-title'
    : view === 'leaderboard'
      ? 'game-leaderboard-title'
      : view === 'enemy-guide'
        ? 'game-enemy-guide-title'
        : view === 'orb-guide'
          ? 'game-orb-guide-title'
    : isMainMenu
      ? 'game-menu-title'
      : 'game-paused-title';

  const renderLevelSelection = () => (
    <>
      <p className="game-panel-eyebrow">Campaign</p>
      <h1 id="game-menu-title">Level Mode</h1>
      <p>Level Mode is a campaign experience. Scores here don’t count toward the Survival leaderboard.</p>
      <p className="game-level-progress" role="status">
        Highest unlocked: Stage {campaignProgress.highestUnlockedLevel} of {LEVEL_DEFINITIONS.length}
      </p>
      <p className="game-level-progress" role="status">
        Available Stat Points: {campaignProgress.statPoints}
      </p>
      <div className="game-level-grid">
        {levelCards.map((level) => {
          const unlocked = canStartLevel(campaignProgress, level.id);
          const completed = campaignProgress.completedLevelIds.includes(level.id);
          return (
            <button
              key={level.id}
              className={[
                'game-level-card',
                !unlocked ? 'is-locked' : '',
                completed ? 'is-completed' : '',
                campaignProgress.highestUnlockedLevel === level.id ? 'is-current' : '',
                level.boss ? 'is-boss' : '',
              ].filter(Boolean).join(' ')}
              type="button"
              disabled={!unlocked}
              onClick={() => {
                if (!unlocked) return;
                onStart('level', level.id);
              }}
              aria-label={`${unlocked ? 'Start' : 'Locked'} ${level.name}, ${level.theme}, map ${level.mapName}${level.boss ? `, boss ${level.boss}` : ''}`}
            >
              <span className="game-level-card-heading">
                <strong>{String(level.id).padStart(2, '0')}</strong>
                <span>{level.boss ? 'BOSS STAGE' : completed ? 'CLEARED' : unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
              </span>
              <span className="game-level-card-name">{level.name}</span>
              <span className="game-level-card-map">{level.theme} · {level.mapName}</span>
              <span className="game-level-card-enemies">
                {level.boss ? level.boss : `Enemies: ${getEnemyDisplayNames(level).join(', ')}`}
              </span>
              {campaignProgress.bestTimes[level.id] !== undefined && (
                <span className="game-level-card-record">
                  Best {Math.floor(campaignProgress.bestTimes[level.id] / 60)}:
                  {String(Math.floor(campaignProgress.bestTimes[level.id] % 60)).padStart(2, '0')}
                  {' · '}Score {(campaignProgress.bestScores[level.id] ?? 0).toLocaleString()}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="game-menu-actions game-level-selection-actions">
        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => setView('home')}
        >
          Back to menu
        </button>
      </div>
    </>
  );

  const openLevelSelection = () => {
    setCampaignProgress(readLevelCampaignProgress());
    setView('level-select');
  };

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
          view === 'orb-guide' ? 'game-orb-guide-overlay' : '',
          view === 'level-select' ? 'game-level-select-overlay' : '',
          highlightPauseMenu ? 'game-pause-overlay-highlighted' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {view === 'settings' ? (
          <GameSettingsPanel
            settings={settings}
            error={settingsError}
            audioError={audioError}
            onChange={onSettingsChange}
            onBack={() => setView('home')}
            backLabel={isMainMenu ? 'Back to menu' : 'Back to pause menu'}
          />
        ) : view === 'leaderboard' ? (
          <GameLeaderboardPanel onBack={() => setView('home')} />
        ) : view === 'enemy-guide' ? (
          <GameEnemyGuide
            onBack={() => setView('home')}
            backLabel={isMainMenu ? 'Back to menu' : 'Back to pause menu'}
          />
        ) : view === 'orb-guide' ? (
          <GameOrbGuide
            onBack={() => setView('home')}
            backLabel={isMainMenu ? 'Back to menu' : 'Back to pause menu'}
          />
        ) : view === 'level-select' ? (
          renderLevelSelection()
        ) : isMainMenu ? (
            <>
              <p className="game-panel-eyebrow">State 565 presents</p>
              <h1 id="game-menu-title">565 ZOMBIE SURVIVAL</h1>
              <p>Drift through the night. Survive the waves.</p>
              <div className="game-menu-actions game-home-actions">
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={() => onStart('survival')}
                  autoFocus
                >
                  Survival Mode
                </button>
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={openLevelSelection}
                >
                  Level Mode
                </button>
                {import.meta.env.DEV && (
                  <button
                    className="game-menu-secondary"
                    type="button"
                    onClick={() => onStart('dev')}
                  >
                    Start dev level
                  </button>
                )}
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={onStartTutorial}
                >
                  How to play
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('enemy-guide')}
                >
                  Enemy guide
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('orb-guide')}
                >
                  Orb guide
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={() => setView('leaderboard')}
                >
                  Leaderboard
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
            <p className="game-panel-eyebrow">Take a breather</p>
            <h1 id="game-paused-title">Game paused</h1>
            <p>The arena is waiting. Resume when you’re ready.</p>
            {gameState && (
              <>
                <section
                  className="game-pause-summary"
                  aria-label="Current run statistics"
                >
                  <div className="game-pause-stat game-pause-stat-primary">
                    <span>WAVE</span>
                    <strong>
                      {String(gameState.wave.currentWave).padStart(2, '0')}
                    </strong>
                  </div>
                  <div className="game-pause-stat game-pause-stat-primary">
                    <span>SCORE</span>
                    <strong>{gameState.score.toLocaleString()}</strong>
                  </div>
                  <div className="game-pause-stat game-pause-stat-vitals">
                    <span>VITALS</span>
                    <strong>
                      {Math.ceil(gameState.player.health)} / {gameState.player.maxHealth}
                    </strong>
                    <span className="game-pause-health-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, (gameState.player.health / gameState.player.maxHealth) * 100))}%`,
                        }}
                      />
                    </span>
                  </div>
                  <div className="game-pause-stat">
                    <span>ELIMINATED</span>
                    <strong>{gameState.statistics.zombiesKilled}</strong>
                  </div>
                  <div className="game-pause-stat">
                    <span>HOSTILES</span>
                    <strong>{gameState.zombies.length}</strong>
                  </div>
                  <div className="game-pause-stat">
                    <span>SURVIVAL TIME</span>
                    <strong>
                      {Math.floor(gameState.statistics.survivalSeconds / 60)}:
                      {String(Math.floor(gameState.statistics.survivalSeconds % 60)).padStart(2, '0')}
                    </strong>
                  </div>
                  <div className="game-pause-stat game-pause-stat-supporting">
                    <span>ORBS COLLECTED</span>
                    <strong>{gameState.statistics.orbsCollected}</strong>
                  </div>
                </section>
                <section
                  className="game-pause-upgrades"
                  aria-label="Spend stat points"
                >
                  <div className="game-pause-upgrades-heading">
                    <h2>Run stats</h2>
                    <span aria-live="polite">
                      Standard: {gameState.progression.standard.available} · Rare: {gameState.progression.rare.available}
                    </span>
                  </div>
                  <div className="game-pause-upgrade-list">
                    {gameState.statOptions.map((option) => {
                      const allocated =
                        gameState.statAllocations[option.attribute];
                      return (
                        <div
                          className="game-pause-upgrade-row game-pause-stat-upgrade-row"
                          key={option.attribute}
                        >
                          <div>
                            <strong>{option.label}</strong>
                            <span>
                              {option.currentValue.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}{' '}
                              {option.unit}
                              {allocated > 0 && ` · ${allocated} allocated`}
                            </span>
                            <span className="game-pause-upgrade-description">
                              {option.description} Next: {option.nextLevelEffect} · {option.cost} SP
                            </span>
                          </div>
                          <button
                            className="game-pause-upgrade-control"
                            type="button"
                            aria-label={`Decrease ${option.label}`}
                            disabled={allocated === 0}
                            onClick={() =>
                              onAdjustStat(option.attribute, -1)
                            }
                          >
                            -
                          </button>
                          <button
                            className="game-pause-upgrade-control"
                            type="button"
                            aria-label={`Increase ${option.label}`}
                            disabled={
                              !option.canIncrease ||
                              gameState.upgradePoints < option.cost
                            }
                            onClick={() =>
                              onAdjustStat(option.attribute, 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <section
                  className="game-pause-upgrades game-pause-rare-upgrades"
                  aria-label="Rare upgrades"
                >
                  <div className="game-pause-upgrades-heading">
                    <h2>Rare abilities</h2>
                    <span aria-live="polite">
                      {gameState.progression.rare.available} Rare{' '}
                      {gameState.progression.rare.available === 1 ? 'Point' : 'Points'}
                    </span>
                  </div>
                  <div className="game-pause-upgrade-list">
                    {RARE_UPGRADE_ORDER.map((upgradeId: RareUpgradeId) => {
                      const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
                      const level =
                        gameState.progression.rareUpgradeLevels[upgradeId];
                      const unlocked = isRareUpgradeUnlocked(
                        gameState.progression,
                        upgradeId,
                      );
                      const atMaxLevel = level >= definition.maxLevel;
                      const cost = atMaxLevel
                        ? null
                        : getRareUpgradeCost(upgradeId, level);
                      const canPurchase =
                        unlocked &&
                        !atMaxLevel &&
                        cost !== null &&
                        gameState.progression.rare.available >= cost;
                      return (
                        <div
                          className="game-pause-upgrade-row game-pause-rare-upgrade-row"
                          key={upgradeId}
                        >
                          <div className="game-pause-rare-upgrade-details">
                            <strong>
                              {definition.name}
                              <span className={`game-pause-upgrade-rarity game-pause-upgrade-rarity-${definition.rarity}`}>
                                {definition.rarity}
                              </span>
                            </strong>
                            <span className="game-pause-upgrade-description">
                              {definition.description}
                            </span>
                            <span>
                              Level {level}/{definition.maxLevel}
                              {atMaxLevel
                                ? ' · Max level'
                                : ` · Next: ${getRareUpgradeNextEffectText(upgradeId, level)} · ${cost} RP`}
                            </span>
                            {!unlocked && (
                              <span className="game-pause-upgrade-lock">
                                Locked: {definition.unlockText}
                              </span>
                            )}
                          </div>
                          <button
                            className="game-pause-upgrade-control"
                            type="button"
                            aria-label={`Refund ${definition.name}`}
                            disabled={
                              level === 0 || !definition.refundable
                            }
                            onClick={() =>
                              onAdjustRareUpgrade(upgradeId, -1)
                            }
                          >
                            −
                          </button>
                          <button
                            className="game-pause-upgrade-control"
                            type="button"
                            aria-label={`Purchase ${definition.name}`}
                            disabled={!canPurchase}
                            onClick={() =>
                              onAdjustRareUpgrade(upgradeId, 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
                {gameState.activeEffects.length > 0 && (
                  <section
                    className="game-pause-effects"
                    aria-label="Active effects"
                  >
                    <h2>Active effects</h2>
                    <GameActiveEffects effects={gameState.activeEffects} />
                  </section>
                )}
              </>
            )}
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
                onClick={() => setView('enemy-guide')}
              >
                Enemy guide
              </button>
              <button
                className="game-menu-secondary"
                type="button"
                onClick={() => setView('orb-guide')}
              >
                Orb guide
              </button>
              {!tutorialMode && (
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={onRestart}
                >
                  Restart run
                </button>
              )}
              <button
                className="game-menu-secondary"
                type="button"
                onClick={onReturnToMenu}
              >
                {tutorialMode ? 'Exit tutorial' : 'Main menu'}
              </button>
            </div>
            <GameMusicPlayer
              trackName={musicTrackName}
              isPlaying={musicPlaying}
              musicEnabled={musicEnabled}
              onToggle={onToggleMusic}
            />
          </>
        )}
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
