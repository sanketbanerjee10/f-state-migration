import { useTranslation } from 'react-i18next';
import {
  SIEGE_DIFFICULTIES,
  type SiegeDifficulty,
  type SiegeDifficultyData,
} from '@/game/siege/SiegeRules';
import {
  countSiegeClears,
  isSiegeDifficultyUnlocked,
  type SiegeProgress,
} from '@/game/siege/SiegeProgress';

interface SiegeDifficultySelectionProps {
  readonly difficultyData: Partial<Record<SiegeDifficulty, SiegeDifficultyData>>;
  readonly progress: SiegeProgress;
  readonly onSelect: (difficulty: SiegeDifficulty) => void;
}

export function SiegeDifficultySelection({
  difficultyData,
  progress,
  onSelect,
}: SiegeDifficultySelectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="game-siege-difficulty-list">
        {SIEGE_DIFFICULTIES.map((difficulty, index) => {
          const unlocked = isSiegeDifficultyUnlocked(progress, difficulty);
          const levelCount = difficultyData[difficulty]?.levels.length ?? 0;
          const clearCount = countSiegeClears(
            progress,
            difficulty,
            difficultyData[difficulty]?.levels.map((level) => level.id),
          );

          return (
            <button
              className={`game-menu-secondary game-siege-difficulty-card game-siege-difficulty-${difficulty}`}
              type="button"
              key={difficulty}
              disabled={!unlocked}
              data-difficulty={difficulty}
              onClick={() => onSelect(difficulty)}
            >
              <span className="game-siege-difficulty-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{t(`game.siege.difficulty.${difficulty}`)}</strong>
              <small>{`${clearCount} / ${levelCount}`}</small>
              <span className="game-siege-difficulty-status">
                {unlocked ? t('game.siege.unlocked') : t('game.siege.locked')}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
