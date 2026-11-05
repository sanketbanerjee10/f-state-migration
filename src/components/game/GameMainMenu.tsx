import { useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { GameMode } from '@/game/core/GameState';
import {
  canStartLevel,
  LEVEL_DEFINITIONS,
  readLevelCampaignProgress,
} from '@/game/core/LevelCampaign';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';
import type { GameMenuView } from './GameMenuTypes';

const LEVEL_AREAS = [
  {
    name: 'Military Outpost',
    image: 'https://ik.imagekit.io/c1tiz3nte/military-map.png',
  },
  {
    name: 'Industrial Complex',
    image: 'https://ik.imagekit.io/c1tiz3nte/industrial-map.png',
  },
  {
    name: 'Contaminated Zone',
    image: 'https://ik.imagekit.io/c1tiz3nte/contaminated-zone-map.png',
  },
] as const;

interface GameMainMenuProps {
  readonly view: 'home' | 'level-select';
  readonly onViewChange: (view: GameMenuView) => void;
  readonly onStart: (gameMode: GameMode, levelId?: number) => void;
  readonly onStartTutorial: () => void;
}

export function GameMainMenu({
  view,
  onViewChange,
  onStart,
  onStartTutorial,
}: GameMainMenuProps) {
  const [campaignProgress, setCampaignProgress] = useState(
    readLevelCampaignProgress,
  );
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);

  const openLevelSelection = () => {
    setCampaignProgress(readLevelCampaignProgress());
    setSelectedAreaIndex(0);
    onViewChange('level-select');
  };

  if (view === 'level-select') {
    const selectedArea = LEVEL_AREAS[selectedAreaIndex]!;
    const areaLevels = LEVEL_DEFINITIONS.filter(
      (level) => level.theme === selectedArea.name,
    );
    const completedInArea = areaLevels.filter((level) =>
      campaignProgress.completedLevelIds.includes(level.id),
    ).length;

    return (
      <div
        className="game-level-picker"
        style={{
          '--campaign-map': `url("${selectedArea.image}")`,
        } as CSSProperties}
      >
        <div
          key={selectedAreaIndex}
          className="game-level-backdrop"
          aria-hidden="true"
        />
        <div className="game-level-vignette" aria-hidden="true" />

        <header className="game-level-topbar">
          <div className="game-level-brand">
            <button
              className="game-level-back-button"
              type="button"
              aria-label="Back to menu"
              onClick={() => onViewChange('home')}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div>
              <p className="game-dialog-wordmark">
                <GameFranchiseWordmark />
              </p>
              <h1 id="game-menu-title">Campaign</h1>
            </div>
          </div>
          <div className="game-level-stats" role="status">
            <div className="game-level-stat">
              <span className="game-level-stat-icon" aria-hidden="true">◆</span>
              <div>
                <strong>{campaignProgress.highestUnlockedLevel}/30</strong>
                <small>STAGES REACHED</small>
              </div>
            </div>
            <div className="game-level-stat">
              <span className="game-level-stat-icon" aria-hidden="true">✦</span>
              <div>
                <strong>{campaignProgress.statPoints}</strong>
                <small>STAT POINTS</small>
              </div>
            </div>
          </div>
        </header>

        <section
          className="game-campaign-scene"
          aria-label="Campaign areas"
          aria-roledescription="carousel"
        >
          <div className="game-campaign-location" aria-live="polite">
            <div className="game-campaign-location-meta">
              <span>AREA {String(selectedAreaIndex + 1).padStart(2, '0')}</span>
              <span className="game-campaign-meta-divider" />
              <span>CAMPAIGN SECTOR</span>
            </div>
            <h2>{selectedArea.name}</h2>
            <div className="game-campaign-location-footer">
              <span className="game-campaign-status-dot" />
              <span>{completedInArea} OF 10 STAGES CLEARED</span>
            </div>
          </div>

          <button
            className="game-campaign-arrow game-campaign-arrow-prev"
            type="button"
            aria-label="Previous area"
            disabled={selectedAreaIndex === 0}
            onClick={() => setSelectedAreaIndex((index) => index - 1)}
          >
            ‹
          </button>
          <button
            className="game-campaign-arrow game-campaign-arrow-next"
            type="button"
            aria-label="Next area"
            disabled={selectedAreaIndex === LEVEL_AREAS.length - 1}
            onClick={() => setSelectedAreaIndex((index) => index + 1)}
          >
            ›
          </button>

          <section
            className="game-mission-panel"
            aria-label={`${selectedArea.name} levels`}
          >
            {/* <div className="game-mission-panel-heading">
              <div>
                <span className="game-mission-kicker">MISSION SELECT</span>
                <h3>Choose your stage</h3>
              </div>
              <span className="game-mission-count">
                {String(completedInArea).padStart(2, '0')} / 10 CLEARED
              </span>
            </div> */}

            <div className="game-level-grid">
              {areaLevels.map((level) => {
                const unlocked = canStartLevel(campaignProgress, level.id);
                const completed = campaignProgress.completedLevelIds.includes(level.id);
                const current = campaignProgress.highestUnlockedLevel === level.id;
                const bestTime = campaignProgress.bestTimes[level.id];
                const stageTitle = level.boss
                  ? level.boss
                  : level.mapName;
                const difficulty = Math.max(
                  0,
                  Math.min(5, Math.round(level.difficulty)),
                );

                return (
                  <button
                    key={level.id}
                    className={[
                      'game-level-card',
                      !unlocked ? 'is-locked' : '',
                      completed ? 'is-completed' : '',
                      current ? 'is-current' : '',
                      level.boss ? 'is-boss' : '',
                    ].filter(Boolean).join(' ')}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) onStart('level', level.id);
                    }}
                    aria-label={`${unlocked ? 'Start' : 'Locked'} ${stageTitle}, ${selectedArea.name}${level.boss ? `, boss ${level.boss}` : ''}`}
                  >
                    <span className="game-level-card-top">
                      <span className="game-level-number">
                        {String(level.id).padStart(2, '0')}
                      </span>
                      <span className="game-level-state">
                        {completed
                          ? '✓ CLEARED'
                          : level.boss
                            ? 'BOSS'
                            : current
                              ? 'CURRENT'
                              : unlocked
                                ? 'READY'
                                : 'LOCKED'}
                      </span>
                    </span>
                    <span className="game-level-card-name">{stageTitle}</span>
                    <span className="game-level-card-bottom">
                      <span
                        className="game-level-difficulty"
                        aria-label={`Difficulty ${difficulty} out of 5`}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <span
                            key={index}
                            className={index < difficulty ? 'is-filled' : ''}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                      {bestTime !== undefined && (
                        <span className="game-level-best-time">
                          BEST {Math.floor(bestTime / 60)}:
                          {String(Math.floor(bestTime % 60)).padStart(2, '0')}
                        </span>
                      )}
                      {!unlocked && (
                        <span className="game-level-lock" aria-hidden="true">▣</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </section>

      </div>
    );
  }

  return (
    <div className="game-menu-content">
      <header className="game-menu-brand">
        <p className="game-panel-eyebrow">SANKEYYY PRESENTS</p>

        <h1 id="game-menu-title">
          <GameFranchiseWordmark />
        </h1>

        <p className="game-menu-tagline">
          CALM OUTSIDE. <span>CHAOS INSIDE.</span>
        </p>
      </header>

      <nav className="game-menu-actions game-home-actions" aria-label="Main menu">
        <button
          className="game-menu-primary"
          type="button"
          onClick={() => onStart('survival')}
          autoFocus
        >
          <span className="game-menu-button-icon">▶</span>
          <span>Survival Mode</span>
          <span className="game-menu-button-arrow">›</span>
        </button>

        <button
          className="game-menu-primary"
          type="button"
          onClick={openLevelSelection}
        >
          <span className="game-menu-button-icon">▦</span>
          <span>Campaign Mode</span>
          <span className="game-menu-button-arrow">›</span>
        </button>

        {import.meta.env.DEV && (
          <button
            className="game-menu-secondary"
            type="button"
            onClick={() => onStart('dev')}
          >
            <span className="game-menu-button-icon">⚙</span>
            <span>Start Dev Level</span>
          </button>
        )}

        <button
          className="game-menu-secondary"
          type="button"
          onClick={onStartTutorial}
        >
          <span className="game-menu-button-icon">?</span>
          <span>How to Play</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('enemy-guide')}
        >
          <span className="game-menu-button-icon">♧</span>
          <span>Field Guides</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('leaderboard')}
        >
          <span className="game-menu-button-icon">🏆</span>
          <span>Leaderboard</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('settings')}
        >
          <span className="game-menu-button-icon">⚙</span>
          <span>Settings</span>
        </button>
      </nav>

      <footer className="game-menu-footer">
        <span className="game-menu-community-dot">●</span>
        A <strong>565</strong> COMMUNITY CREATION
      </footer>
    </div>
  );
}
