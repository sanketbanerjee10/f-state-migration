import { useState } from 'react';
import type { GameMode } from '@/game/core/GameState';
import {
  canStartLevel,
  getEnemyDisplayNames,
  LEVEL_DEFINITIONS,
  readLevelCampaignProgress,
} from '@/game/core/LevelCampaign';
import type { GameMenuView } from './GameMenuTypes';

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

  const openLevelSelection = () => {
    setCampaignProgress(readLevelCampaignProgress());
    onViewChange('level-select');
  };

  if (view === 'level-select') {
    return (
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
          {LEVEL_DEFINITIONS.map((level) => {
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
                  if (unlocked) onStart('level', level.id);
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
            onClick={() => onViewChange('home')}
          >
            Back to menu
          </button>
        </div>
      </>
    );
  }

  return (
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
          onClick={() => onViewChange('enemy-guide')}
        >
          Guides
        </button>
        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('settings')}
        >
          Settings
        </button>
      </div>
    </>
  );
}
