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

  const knownLevelIds = (difficulty: SiegeDifficulty) =>
    difficultyData[difficulty]?.levels.map((level) => level.id);

  return (
    <>
      <div className="game-siege-difficulty-list">
        {SIEGE_DIFFICULTIES.map((difficulty, index) => {
          const previousDifficulty = SIEGE_DIFFICULTIES[index - 1];
          const unlocked = isSiegeDifficultyUnlocked(
            progress,
            difficulty,
            previousDifficulty ? knownLevelIds(previousDifficulty) : undefined,
          );
          const clearCount = previousDifficulty
            ? countSiegeClears(
                progress,
                previousDifficulty,
                knownLevelIds(previousDifficulty),
              )
            : 0;
          const levelCount = difficultyData[difficulty]?.levels.length ?? 0;

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
              <small>{unlocked
                ? `${countSiegeClears(progress, difficulty, knownLevelIds(difficulty))} / ${levelCount}`
                : t('game.siege.clearsRequired', { count: clearCount })}</small>
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
