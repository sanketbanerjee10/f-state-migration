import { useTranslation } from 'react-i18next';
import type {
  SiegeDifficulty,
  SiegeDifficultyData,
  SiegeLevel,
} from '@/game/siege/SiegeRules';
import type { SiegeProgress } from '@/game/siege/SiegeProgress';
import { SiegeDifficultySelection } from './SiegeDifficultySelection';
import { SiegeLevelCarousel } from './SiegeLevelCarousel';
import { SiegeModal } from './SiegeModal';

type SiegeSelectionScreen = 'difficulty' | 'levels';

interface SiegeSelectionModalProps {
  readonly screen: SiegeSelectionScreen;
  readonly difficulty: SiegeDifficulty;
  readonly difficultyData: Partial<Record<SiegeDifficulty, SiegeDifficultyData>> | null;
  readonly progress: SiegeProgress;
  readonly loadError: string | null;
  readonly saveError: string | null;
  readonly onBack: () => void;
  readonly onExit: () => void;
  readonly onRetry: () => void;
  readonly onDifficultySelect: (difficulty: SiegeDifficulty) => void;
  readonly onLevelSelect: (difficulty: SiegeDifficulty, level: SiegeLevel) => void;
}

export function SiegeSelectionModal({
  screen,
  difficulty,
  difficultyData,
  progress,
  loadError,
  saveError,
  onBack,
  onExit,
  onRetry,
  onDifficultySelect,
  onLevelSelect,
}: SiegeSelectionModalProps) {
  const { t } = useTranslation();

  return (
    <SiegeModal
      title={t('game.siege.title')}
      busy={!difficultyData && !loadError}
      onBack={onBack}
      backLabel={t(screen === 'levels' ? 'game.siege.back' : 'game.siege.mainMenu')}
    >
      {loadError ? (
        <>
          <p role="alert">{t('game.siege.loadError', { error: loadError })}</p>
          <div className="game-menu-actions">
            <button className="game-menu-primary" type="button" onClick={onRetry}>
              {t('game.siege.retry')}
            </button>
            <button className="game-menu-secondary" type="button" onClick={onExit}>
              {t('game.siege.mainMenu')}
            </button>
          </div>
        </>
      ) : !difficultyData ? (
        <p>{t('game.siege.loading')}</p>
      ) : screen === 'difficulty' ? (
        <SiegeDifficultySelection
          difficultyData={difficultyData}
          progress={progress}
          onSelect={onDifficultySelect}
        />
      ) : (
        <SiegeLevelCarousel
          difficulty={difficulty}
          data={difficultyData[difficulty]}
          progress={progress}
          onSelect={onLevelSelect}
        />
      )}
      {saveError && (
        <p className="game-siege-save-error" role="status">
          {t('game.siege.progressSaveError', { error: saveError })}
        </p>
      )}
    </SiegeModal>
  );
}
