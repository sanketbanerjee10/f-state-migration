import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import type { SiegeProgress } from '@/game/siege/SiegeProgress';
import type {
  SiegeDifficulty,
  SiegeDifficultyData,
  SiegeLevel,
} from '@/game/siege/SiegeRules';
import { getCurrentSiegeLevelIndex } from './siege/SiegeGameUtils';

interface SiegeLevelCarouselProps {
  readonly difficulty: SiegeDifficulty;
  readonly data: SiegeDifficultyData | undefined;
  readonly progress: SiegeProgress;
  readonly onSelect: (difficulty: SiegeDifficulty, level: SiegeLevel) => void;
}

export function SiegeLevelCarousel({
  difficulty,
  data,
  progress,
  onSelect,
}: SiegeLevelCarouselProps) {
  const { t } = useTranslation();
  const currentLevelIndex = data
    ? getCurrentSiegeLevelIndex(data, progress, difficulty)
    : 0;
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(currentLevelIndex);
  const pointerDownCenteredRef = useRef<boolean | null>(null);

  useEffect(() => {
    setSelectedIndex(currentLevelIndex);
    api?.scrollTo(currentLevelIndex + 1, true);
  }, [api, currentLevelIndex, difficulty]);

  useEffect(() => {
    if (!api) return;
    const updateSelectedIndex = () => {
      setSelectedIndex(
        api.scrollSnapList().length <= 1
          ? currentLevelIndex
          : api.selectedScrollSnap() - 1,
      );
    };
    updateSelectedIndex();
    api.on('select', updateSelectedIndex);
    api.on('reInit', updateSelectedIndex);
    return () => {
      api.off('select', updateSelectedIndex);
      api.off('reInit', updateSelectedIndex);
    };
  }, [api, currentLevelIndex]);

  if (!data || data.levels.length === 0) {
    return <p role="alert">{t('game.siege.loadError', { error: difficulty })}</p>;
  }

  const selectedLevelIndex = Math.max(
    -1,
    Math.min(selectedIndex, data.levels.length - 1),
  );

  return (
    <div className="game-siege-level-selection">
      <Carousel
        opts={{
          align: 'center',
          containScroll: 'keepSnaps',
          dragFree: true,
          startIndex: currentLevelIndex + 1,
        }}
        setApi={setApi}
        className="game-siege-carousel"
        role="region"
        aria-label={t('game.siege.levels')}
      >
        <CarouselPrevious
          className="game-campaign-arrow game-siege-carousel-arrow static"
          aria-label={t('game.leaderboard.previous')}
          disabled={selectedLevelIndex <= 0}
        />
        <CarouselContent className="game-siege-carousel-content">
          <CarouselItem
            className="game-siege-carousel-slide basis-1/3"
            aria-hidden="true"
          />
          {data.levels.map((level, levelIndex) => {
            const record = progress.levels[difficulty]?.[level.id];
            const unlocked = levelIndex <= currentLevelIndex;
            const status = record
              ? t('game.menu.cleared')
              : levelIndex === currentLevelIndex
                ? t('game.menu.current')
                : unlocked
                  ? t('game.menu.ready')
                  : t('game.menu.lockedState');

            return (
              <CarouselItem
                className="game-siege-carousel-slide basis-1/3"
                key={level.id}
                data-level-index={levelIndex}
              >
                <button
                  className={[
                    'game-level-card',
                    'game-siege-carousel-card',
                    levelIndex === currentLevelIndex ? 'is-current' : '',
                    levelIndex === selectedIndex ? 'is-centered' : '',
                    record ? 'is-completed' : '',
                    !unlocked ? 'is-locked' : '',
                  ].filter(Boolean).join(' ')}
                  type="button"
                  disabled={!unlocked}
                  aria-current={levelIndex === currentLevelIndex ? 'step' : undefined}
                  aria-label={`${t('game.siege.level', { number: levelIndex + 1 })}, ${status}`}
                  data-level-id={level.id}
                  onPointerDown={() => {
                    pointerDownCenteredRef.current = levelIndex === selectedLevelIndex;
                  }}
                  onPointerCancel={() => {
                    pointerDownCenteredRef.current = null;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      pointerDownCenteredRef.current = levelIndex === selectedLevelIndex;
                    }
                  }}
                  onClick={() => {
                    const wasCentered = pointerDownCenteredRef.current ??
                      levelIndex === selectedLevelIndex;
                    pointerDownCenteredRef.current = null;
                    if (levelIndex === currentLevelIndex || wasCentered) {
                      onSelect(difficulty, level);
                    } else {
                      api?.scrollTo(levelIndex + 1);
                    }
                  }}
                >
                  <span className="game-level-card-top">
                    <span className="game-level-number">
                      {String(levelIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="game-level-state">{status}</span>
                  </span>
                  <span className="game-level-card-name">{level.name}</span>
                  <span className="game-level-card-bottom game-siege-carousel-card-bottom">
                    {record
                      ? <span className="game-siege-carousel-stars">{'★'.repeat(record.stars)}</span>
                      : <span>{t('game.siege.levelNotCleared')}</span>}
                    {!unlocked && <span aria-hidden="true">▣</span>}
                  </span>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselNext
          className="game-campaign-arrow game-siege-carousel-arrow static"
          aria-label={t('game.leaderboard.next')}
        />
      </Carousel>
    </div>
  );
}
