import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronLeft,
  CircleHelp,
  Code2,
  Map,
  Play,
  Settings,
  Trophy,
} from 'lucide-react';
import type { GameMode } from '@/game/core/GameState';
import { getBossForWave } from '@/game/bosses/BossSystem';
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
    translationKey: 'military',
    image: 'https://ik.imagekit.io/c1tiz3nte/military-map.png',
  },
  {
    name: 'Industrial Complex',
    translationKey: 'industrial',
    image: 'https://ik.imagekit.io/c1tiz3nte/industrial-map.png',
  },
  {
    name: 'Contaminated Zone',
    translationKey: 'contaminated',
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
  const { t } = useTranslation();

  const openLevelSelection = () => {
    setCampaignProgress(readLevelCampaignProgress());
    setSelectedAreaIndex(0);
    onViewChange('level-select');
  };

  if (view === 'level-select') {
    const selectedArea = LEVEL_AREAS[selectedAreaIndex]!;
    const areaName = t(`game.menu.areas.${selectedArea.translationKey}`);
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
              aria-label={t('game.menu.backToMenu')}
              onClick={() => onViewChange('home')}
            >
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <div>
              <p className="game-dialog-wordmark">
                <GameFranchiseWordmark />
              </p>
              <h1 id="game-menu-title">{t('game.menu.campaign')}</h1>
            </div>
          </div>
          <div className="game-level-stats" role="status">
            <div className="game-level-stat">
              <span className="game-level-stat-icon" aria-hidden="true">◆</span>
              <div>
                <strong>{campaignProgress.highestUnlockedLevel}/30</strong>
                <small>{t('game.menu.stagesReached')}</small>
              </div>
            </div>
            <div className="game-level-stat">
              <span className="game-level-stat-icon" aria-hidden="true">✦</span>
              <div>
                <strong>{campaignProgress.statPoints}</strong>
                <small>{t('game.menu.statPoints')}</small>
              </div>
            </div>
          </div>
        </header>

        <section
          className="game-campaign-scene"
          aria-label={t('game.menu.campaignAreas')}
          aria-roledescription={t('game.menu.carousel')}
        >
          <div className="game-campaign-location" aria-live="polite">
            <div className="game-campaign-location-meta">
              <span>{t('game.menu.area', { number: String(selectedAreaIndex + 1).padStart(2, '0') })}</span>
              <span className="game-campaign-meta-divider" />
              <span>{t('game.menu.sector')}</span>
            </div>
            <h2>{areaName}</h2>
            <div className="game-campaign-location-footer">
              <span className="game-campaign-status-dot" />
              <span>{t('game.menu.stagesCleared', { count: completedInArea })}</span>
            </div>
          </div>

          <button
            className="game-campaign-arrow game-campaign-arrow-prev"
            type="button"
            aria-label={t('game.menu.previousArea')}
            disabled={selectedAreaIndex === 0}
            onClick={() => setSelectedAreaIndex((index) => index - 1)}
          >
            ‹
          </button>
          <button
            className="game-campaign-arrow game-campaign-arrow-next"
            type="button"
            aria-label={t('game.menu.nextArea')}
            disabled={selectedAreaIndex === LEVEL_AREAS.length - 1}
            onClick={() => setSelectedAreaIndex((index) => index + 1)}
          >
            ›
          </button>

          <section
            className="game-mission-panel"
            aria-label={t('game.menu.areaLevels', { area: areaName })}
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
                const bossType = level.boss
                  ? getBossForWave(level.id)?.type
                  : undefined;
                const stageTitle = bossType
                  ? t(`game.bosses.${bossType}`)
                  : t(`game.menu.maps.${level.mapName}`);
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
                    aria-label={t('game.menu.levelAction', {
                      action: t(unlocked ? 'game.menu.start' : 'game.menu.locked'),
                      stage: stageTitle,
                      area: areaName,
                      boss: bossType
                        ? t('game.menu.bossSuffix', { name: stageTitle })
                        : '',
                    })}
                  >
                    <span className="game-level-card-top">
                      <span className="game-level-number">
                        {String(level.id).padStart(2, '0')}
                      </span>
                      <span className="game-level-state">
                        {completed
                          ? t('game.menu.cleared')
                          : level.boss
                            ? t('game.menu.boss')
                            : current
                              ? t('game.menu.current')
                              : unlocked
                                ? t('game.menu.ready')
                                : t('game.menu.lockedState')}
                      </span>
                    </span>
                    <span className="game-level-card-name">{stageTitle}</span>
                    <span className="game-level-card-bottom">
                      <span
                        className="game-level-difficulty"
                        aria-label={t('game.menu.difficulty', { difficulty })}
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
                          {t('game.menu.best')} {Math.floor(bestTime / 60)}:
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
        <p className="game-panel-eyebrow">{t('game.menu.presentedBy')}</p>

        <h1 id="game-menu-title">
          <GameFranchiseWordmark />
        </h1>

        <p className="game-menu-tagline">
          {t('game.menu.taglineLead')} <span>{t('game.menu.taglineEmphasis')}</span>
        </p>
      </header>

      <nav className="game-menu-actions game-home-actions" aria-label={t('game.menu.mainMenu')}>
        <button
          className="game-menu-primary"
          type="button"
          onClick={() => onStart('survival')}
          autoFocus
        >
          <Play className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.survival')}</span>
          <span className="game-menu-button-arrow">›</span>
        </button>

        <button
          className="game-menu-primary"
          type="button"
          onClick={openLevelSelection}
        >
          <Map className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.campaign')}</span>
          <span className="game-menu-button-arrow">›</span>
        </button>

        {import.meta.env.DEV && (
          <button
            className="game-menu-secondary"
            type="button"
            onClick={() => onStart('dev')}
          >
            <Code2 className="game-menu-button-icon" size={19} aria-hidden="true" />
            <span>{t('game.menu.devLevel')}</span>
          </button>
        )}

        <button
          className="game-menu-secondary"
          type="button"
          onClick={onStartTutorial}
        >
          <CircleHelp className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.howToPlay')}</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('enemy-guide')}
        >
          <BookOpen className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.fieldGuides')}</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('leaderboard')}
        >
          <Trophy className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.leaderboard')}</span>
        </button>

        <button
          className="game-menu-secondary"
          type="button"
          onClick={() => onViewChange('settings')}
        >
          <Settings className="game-menu-button-icon" size={19} aria-hidden="true" />
          <span>{t('game.menu.settings')}</span>
        </button>
      </nav>

      <footer className="game-menu-footer">
        <span className="game-menu-community-dot">●</span>
        {t('game.menu.communityLead')} <strong>565</strong> {t('game.menu.communityTail')}
      </footer>
    </div>
  );
}
