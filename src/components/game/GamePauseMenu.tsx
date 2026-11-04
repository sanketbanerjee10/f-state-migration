import { useState, type KeyboardEvent } from 'react';
import type {
  GameStateSnapshot,
  RunStatAttribute,
} from '@/game/core/GameState';
import {
  getRareUpgradeCost,
  getRareUpgradeNextEffectText,
  isRareUpgradeUnlocked,
  RARE_UPGRADE_DEFINITIONS,
  RARE_UPGRADE_ORDER,
  type RareUpgradeId,
} from '@/game/upgrades';
import { GameActiveEffects } from './GameActiveEffects';
import { GameMusicPlayer } from './GameMusicPlayer';
import type { GameMenuView } from './GameMenuTypes';

interface GamePauseMenuProps {
  readonly active: boolean;
  readonly gameState: GameStateSnapshot | null;
  readonly musicTrackName: string;
  readonly musicPlaying: boolean;
  readonly musicEnabled: boolean;
  readonly onToggleMusic: () => void;
  readonly onViewChange: (view: GameMenuView) => void;
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
  readonly tutorialMode: boolean;
}

type PauseTab = 'stats' | 'rare';

export function GamePauseMenu({
  active,
  gameState,
  musicTrackName,
  musicPlaying,
  musicEnabled,
  onToggleMusic,
  onViewChange,
  onResume,
  onAdjustStat,
  onAdjustRareUpgrade,
  onRestart,
  onReturnToMenu,
  tutorialMode,
}: GamePauseMenuProps) {
  const [pauseTab, setPauseTab] = useState<PauseTab>('stats');
  const devMode = gameState?.gameMode === 'dev';

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: PauseTab,
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    event.preventDefault();
    const nextTab = currentTab === 'stats' ? 'rare' : 'stats';
    setPauseTab(nextTab);
    document.getElementById(`game-pause-${nextTab}-tab`)?.focus();
  };

  if (!active) return null;

  return (
    <>
      <p className="game-panel-eyebrow">Take a breather</p>
      <h1 id="game-paused-title">Game paused</h1>
      {gameState && (
        <>
          <section
            className="game-pause-summary"
            aria-label="Current run statistics"
          >
            <div className="game-pause-stat game-pause-stat-primary">
              <span>WAVE</span>
              <strong>{String(gameState.wave.currentWave).padStart(2, '0')}</strong>
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
          <div className="game-pause-tabs" role="tablist" aria-label="Pause menu details">
            <button
              id="game-pause-stats-tab"
              className="game-pause-tab"
              type="button"
              role="tab"
              aria-selected={pauseTab === 'stats'}
              aria-controls="game-pause-stats-panel"
              tabIndex={pauseTab === 'stats' ? 0 : -1}
              onClick={() => setPauseTab('stats')}
              onKeyDown={(event) => handleTabKeyDown(event, 'stats')}
            >
              <span>Run Stats</span>
              <span
                className="game-pause-tab-points"
                aria-label={devMode ? 'Unlimited stat points in dev mode' : `${gameState.progression.standard.available} unused stat points`}
              >
                {devMode ? '∞' : gameState.progression.standard.available}
              </span>
            </button>
            <button
              id="game-pause-rare-tab"
              className="game-pause-tab"
              type="button"
              role="tab"
              aria-selected={pauseTab === 'rare'}
              aria-controls="game-pause-rare-panel"
              tabIndex={pauseTab === 'rare' ? 0 : -1}
              onClick={() => setPauseTab('rare')}
              onKeyDown={(event) => handleTabKeyDown(event, 'rare')}
            >
              <span>Rare Abilities</span>
              <span
                className="game-pause-tab-points game-pause-tab-points-rare"
                aria-label={devMode ? 'Unlimited rare ability points in dev mode' : `${gameState.progression.rare.available} unused rare ability points`}
              >
                {devMode ? '∞' : gameState.progression.rare.available}
              </span>
            </button>
          </div>
          <div
            id={`game-pause-${pauseTab}-panel`}
            className="game-pause-tab-panel"
            key={pauseTab}
            role="tabpanel"
            aria-labelledby={`game-pause-${pauseTab}-tab`}
            tabIndex={0}
          >
            {pauseTab === 'stats' ? (
              <section className="game-pause-upgrades" aria-label="Spend stat points">
                <div className="game-pause-upgrades-heading">
                  <h2>Run stats</h2>
                  <span aria-live="polite">
                    {devMode
                      ? 'Unlimited upgrades · Dev mode'
                      : `${gameState.progression.standard.available} Stat ${gameState.progression.standard.available === 1 ? 'Point' : 'Points'} Available`}
                  </span>
                </div>
                <div className="game-pause-upgrade-list">
                  {gameState.statOptions.map((option) => {
                    const allocated = gameState.statAllocations[option.attribute];
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
                            {option.description} Next: {option.nextLevelEffect}
                            {devMode ? ' · Free in Dev mode' : ` · ${option.cost} SP`}
                          </span>
                        </div>
                        <button
                          className="game-pause-upgrade-control"
                          type="button"
                          aria-label={`Decrease ${option.label}`}
                          disabled={allocated === 0}
                          onClick={() => onAdjustStat(option.attribute, -1)}
                        >
                          -
                        </button>
                        <button
                          className="game-pause-upgrade-control"
                          type="button"
                          aria-label={`Increase ${option.label}`}
                          disabled={!option.canIncrease || (!devMode && gameState.upgradePoints < option.cost)}
                          onClick={() => onAdjustStat(option.attribute, 1)}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="game-pause-upgrades game-pause-rare-upgrades" aria-label="Rare upgrades">
                <div className="game-pause-upgrades-heading">
                  <h2>Rare abilities</h2>
                  <span aria-live="polite">
                    {devMode
                      ? 'Unlimited upgrades · Dev mode'
                      : `${gameState.progression.rare.available} Rare ${gameState.progression.rare.available === 1 ? 'Point' : 'Points'} Available`}
                  </span>
                </div>
                <div className="game-pause-upgrade-list">
                  {RARE_UPGRADE_ORDER.map((upgradeId: RareUpgradeId) => {
                    const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
                    const level = gameState.progression.rareUpgradeLevels[upgradeId];
                    const unlocked = devMode || isRareUpgradeUnlocked(gameState.progression, upgradeId);
                    const atMaxLevel = !devMode && level >= definition.maxLevel;
                    const canIncreaseInDev = Number.isSafeInteger(level) && level < Number.MAX_SAFE_INTEGER;
                    const cost = atMaxLevel ? null : getRareUpgradeCost(upgradeId, level);
                    const canPurchase =
                      devMode
                        ? canIncreaseInDev
                        : unlocked &&
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
                          <span className="game-pause-upgrade-description">{definition.description}</span>
                          <span>
                            Level {level}/{devMode ? '∞' : definition.maxLevel}
                            {devMode
                              ? ' · Unlimited in Dev mode'
                              : atMaxLevel
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
                          disabled={level === 0 || !definition.refundable}
                          onClick={() => onAdjustRareUpgrade(upgradeId, -1)}
                        >
                          −
                        </button>
                        <button
                          className="game-pause-upgrade-control"
                          type="button"
                          aria-label={`Purchase ${definition.name}`}
                          disabled={!canPurchase}
                          onClick={() => onAdjustRareUpgrade(upgradeId, 1)}
                        >
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
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
          onClick={() => onViewChange('settings')}
        >
          Settings
        </button>
        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('enemy-guide')}
        >
          Guides
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
  );
}
