import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import Fade from 'embla-carousel-fade';
import {
  ChevronLeft,
  Map,
  Play,
  Shield,
  Trophy,
} from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { GameMode } from '@/game/core/GameState';
import { getBossForWave } from '@/game/bosses/BossSystem';
import {
  canStartLevel,
  LEVEL_DEFINITIONS,
  readLevelCampaignProgress,
} from '@/game/core/LevelCampaign';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';
import { GameMenuSecondaryNavigation } from './GameMenuSecondaryNavigation';
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
  readonly onOpenSiege?: () => void;
}

export function GameMainMenu({
  view,
  onViewChange,
  onStart,
  onOpenSiege,
}: GameMainMenuProps) {
  const [campaignProgress, setCampaignProgress] = useState(
    readLevelCampaignProgress,
  );
  const [selectedAreaIndex, setSelectedAreaIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const carouselPlugins = useMemo(() => [Fade()], []);
  const { t } = useTranslation();

  useEffect(() => {
    if (!carouselApi) return;

    const updateSelectedArea = () => {
      setSelectedAreaIndex(carouselApi.selectedScrollSnap());
    };

    updateSelectedArea();
    carouselApi.on('select', updateSelectedArea);
    carouselApi.on('reInit', updateSelectedArea);
    return () => {
      carouselApi.off('select', updateSelectedArea);
      carouselApi.off('reInit', updateSelectedArea);
    };
  }, [carouselApi]);

  const openLevelSelection = () => {
    setCampaignProgress(readLevelCampaignProgress());
    setSelectedAreaIndex(0);
    onViewChange('level-select');
  };

  if (view === 'level-select') {
    const selectedArea = LEVEL_AREAS[selectedAreaIndex] ?? LEVEL_AREAS[0];

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
              <h1 id="game-menu-title" className="game-menu-panel-title">
                {t('game.menu.campaign')}
              </h1>
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

        <div className="game-campaign-scene">
          <Carousel
            opts={{ align: 'start', loop: false }}
            plugins={carouselPlugins}
            setApi={setCarouselApi}
            className="game-campaign-carousel"
            role="region"
            aria-label={t('game.menu.campaignAreas')}
          >
            <CarouselPrevious
              className="game-campaign-arrow game-campaign-arrow-prev"
              aria-label={t('game.menu.previousArea')}
            />
            <CarouselContent className="game-campaign-carousel-content">
              {LEVEL_AREAS.map((area, areaIndex) => {
                const slideAreaName = t(`game.menu.areas.${area.translationKey}`);
                const areaLevels = LEVEL_DEFINITIONS.filter(
                  (level) => level.theme === area.name,
                );
                const completedInArea = areaLevels.filter((level) =>
                  campaignProgress.completedLevelIds.includes(level.id),
                ).length;

                return (
                  <CarouselItem
                    key={area.translationKey}
                    className="game-campaign-carousel-slide"
                    aria-hidden={areaIndex !== selectedAreaIndex}
                    inert={areaIndex !== selectedAreaIndex}
                  >
                    <div className="game-campaign-location" aria-live="polite">
                      <div className="game-campaign-location-meta">
                        <span>{t('game.menu.area', { number: String(areaIndex + 1).padStart(2, '0') })}</span>
                        <span className="game-campaign-meta-divider" />
                        <span>{t('game.menu.sector')}</span>
                      </div>
                      <h2>{slideAreaName}</h2>
                      <div className="game-campaign-location-footer">
                        <span className="game-campaign-status-dot" />
                        <span>{t('game.menu.stagesCleared', { count: completedInArea })}</span>
                      </div>
                    </div>

                    <section
                      className="game-mission-panel"
                      aria-label={t('game.menu.areaLevels', { area: slideAreaName })}
                    >
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
                                area: slideAreaName,
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
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselNext
              className="game-campaign-arrow game-campaign-arrow-next"
              aria-label={t('game.menu.nextArea')}
            />
          </Carousel>
        </div>

      </div>
    );
  }

  return (
    <div className="game-menu-layout">
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

        <div className="game-menu-options">
          <nav className="game-menu-actions game-home-actions" aria-label={t('game.menu.mainMenu')}>
            <button
              className="game-menu-primary"
              type="button"
              onClick={() => onStart('survival')}
              autoFocus
            >
              <Play className="game-menu-button-icon game-menu-button-icon-play" size={19} aria-hidden="true" />
              <span className="game-menu-button-copy">
                <strong>{t('game.menu.survival')}</strong>
                <small>{t('game.menu.survivalDescription')}</small>
              </span>
              <span className="game-menu-button-arrow">›</span>
            </button>

            <button
              className="game-menu-primary"
              type="button"
              onClick={openLevelSelection}
            >
              <Map className="game-menu-button-icon" size={19} aria-hidden="true" />
              <span className="game-menu-button-copy">
                <strong>{t('game.menu.campaign')}</strong>
                <small>{t('game.menu.campaignDescription')}</small>
              </span>
              <span className="game-menu-button-arrow">›</span>
            </button>

            {onOpenSiege && (
              <button
                className="game-menu-primary"
                type="button"
                onClick={onOpenSiege}
              >
                <Shield className="game-menu-button-icon" size={19} aria-hidden="true" />
                <span className="game-menu-button-copy">
                  <strong>{t('game.menu.siege')}</strong>
                  <small>{t('game.menu.siegeDescription')}</small>
                </span>
                <span className="game-menu-button-arrow">›</span>
              </button>
            )}
          </nav>
          <GameMenuSecondaryNavigation onViewChange={onViewChange} />
        </div>
      </div>

      <footer className="game-menu-footer">
        <span className="game-menu-community-dot">●</span>
        {t('game.menu.communityLead')} <strong>565</strong> {t('game.menu.communityTail')}
      </footer>
    </div>
  );
}
