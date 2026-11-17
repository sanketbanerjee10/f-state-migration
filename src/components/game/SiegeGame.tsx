import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SIEGE_DIFFICULTIES,
  SIEGE_GAME_MODE,
  loadSiegeDifficultyData,
  type SiegeDifficulty,
  type SiegeDifficultyData,
  type SiegeLevel,
} from '@/game/siege/SiegeRules';
import {
  getSiegeNavigationState,
  setSiegeNavigationState,
} from '@/game/siege/SiegeNavigation';
import {
  createDefaultSiegeProgress,
  getSiegeStars,
  isSiegeDifficultyUnlocked,
  readSiegeProgress,
  recordSiegeLevelClear,
  saveSiegeProgress,
  type SiegeProgress,
} from '@/game/siege/SiegeProgress';
import type { SiegeRunResult } from '@/game/siege/SiegeEngine';
import { SiegePlaySession } from './SiegePlaySession';
import { SiegeSelectionModal } from './SiegeSelectionModal';
import {
  getCurrentSiegeLevelIndex,
  type ActiveSiegeRun,
} from './siege/SiegeGameUtils';
import './styles/siege-game.css';

type SiegeScreen = 'difficulty' | 'levels' | 'playing';

interface SiegeGameProps {
  readonly onExit: () => void;
}

function getInitialDifficulty(): SiegeDifficulty {
  const navigation = getSiegeNavigationState(window.location.search);
  return navigation && navigation.screen !== 'difficulty'
    ? navigation.difficulty
    : 'easy';
}

export function SiegeGame({ onExit }: SiegeGameProps) {
  const { t } = useTranslation();
  const [difficultyData, setDifficultyData] = useState<
    Partial<Record<SiegeDifficulty, SiegeDifficultyData>> | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [progress, setProgress] = useState<SiegeProgress>(createDefaultSiegeProgress);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(getInitialDifficulty);
  const [screen, setScreen] = useState<SiegeScreen>(() =>
    getSiegeNavigationState(window.location.search)?.screen ?? 'difficulty',
  );
  const [activeRun, setActiveRun] = useState<ActiveSiegeRun | null>(null);
  const [runNonce, setRunNonce] = useState(0);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const loadContent = useCallback(async () => {
    setLoadError(null);
    setDifficultyData(null);
    try {
      const entries = await Promise.all(
        SIEGE_DIFFICULTIES.map(async (difficulty) => [
          difficulty,
          await loadSiegeDifficultyData(difficulty),
        ] as const),
      );
      const loadedData = Object.fromEntries(entries);
      setDifficultyData(loadedData);
      const savedProgress = readSiegeProgress();
      setProgress(savedProgress);
      progressRef.current = savedProgress;

      const navigation = getSiegeNavigationState(window.location.search);
      if (navigation?.screen === 'levels') {
        setSelectedDifficulty(navigation.difficulty);
        setScreen('levels');
      }
      const requestedLevelId = navigation?.screen === 'playing'
        ? navigation.levelId
        : import.meta.env.DEV
          ? new URLSearchParams(window.location.search).get('siegeLevel')
          : null;
      if (!requestedLevelId) return;

      const match = entries.flatMap(([difficulty, data]) =>
        data.levels.map((level) => ({ difficulty, data, level })),
      ).find(({ level }) => level.id === requestedLevelId);
      if (!match) throw new Error(`Unknown Siege level "${requestedLevelId}".`);
      if (
        navigation?.screen === 'playing' &&
        match.data.levels.indexOf(match.level) >
          getCurrentSiegeLevelIndex(match.data, savedProgress, match.difficulty)
      ) {
        setSiegeNavigationState({
          screen: 'levels',
          difficulty: match.difficulty,
        });
        setSelectedDifficulty(match.difficulty);
        setScreen('levels');
        return;
      }
      setSelectedDifficulty(match.difficulty);
      setActiveRun({ data: match.data, level: match.level });
      setRunNonce((current) => current + 1);
      setScreen('playing');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  useEffect(() => {
    const handlePopState = () => {
      const navigation = getSiegeNavigationState(window.location.search);
      if (!navigation) return;
      if (navigation.screen === 'difficulty') {
        setActiveRun(null);
        setScreen('difficulty');
        return;
      }
      setSelectedDifficulty(navigation.difficulty);
      if (navigation.screen === 'levels') {
        setActiveRun(null);
        setScreen('levels');
        return;
      }
      const data = difficultyData?.[navigation.difficulty];
      const level = data?.levels.find((candidate) => candidate.id === navigation.levelId);
      if (!data || !level) {
        setLoadError(`Unknown Siege level "${navigation.levelId}".`);
        return;
      }
      if (
        data.levels.indexOf(level) >
        getCurrentSiegeLevelIndex(data, progressRef.current, navigation.difficulty)
      ) {
        setSiegeNavigationState({
          screen: 'levels',
          difficulty: navigation.difficulty,
        });
        setActiveRun(null);
        setScreen('levels');
        return;
      }
      setLoadError(null);
      setActiveRun({ data, level });
      setRunNonce((current) => current + 1);
      setScreen('playing');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [difficultyData]);

  const showLevelSelection = (difficulty: SiegeDifficulty) => {
    setSiegeNavigationState({ screen: 'levels', difficulty });
    setSelectedDifficulty(difficulty);
    setActiveRun(null);
    setScreen('levels');
  };

  const returnToDifficultySelection = () => {
    setSiegeNavigationState({ screen: 'difficulty' });
    setActiveRun(null);
    setScreen('difficulty');
  };

  const startLevel = useCallback((difficulty: SiegeDifficulty, level: SiegeLevel) => {
    const data = difficultyData?.[difficulty];
    const levelIndex = data?.levels.indexOf(level) ?? -1;
    const previousDifficulty = SIEGE_DIFFICULTIES[
      SIEGE_DIFFICULTIES.indexOf(difficulty) - 1
    ];
    const knownPreviousLevelIds = previousDifficulty
      ? difficultyData?.[previousDifficulty]?.levels.map((candidate) => candidate.id)
      : undefined;
    if (
      !data ||
      levelIndex < 0 ||
      levelIndex > getCurrentSiegeLevelIndex(data, progressRef.current, difficulty) ||
      !isSiegeDifficultyUnlocked(
        progressRef.current,
        difficulty,
        knownPreviousLevelIds,
      )
    ) return;
    setSiegeNavigationState({
      screen: 'playing',
      difficulty,
      levelId: level.id,
    });
    setSelectedDifficulty(difficulty);
    setSaveError(null);
    setActiveRun({ data, level });
    setRunNonce((current) => current + 1);
    setScreen('playing');
  }, [difficultyData]);

  const recordRun = useCallback((run: ActiveSiegeRun, result: SiegeRunResult) => {
    if (!result.won) return;
    const stars = getSiegeStars(result.finalTroops, run.level.stars);
    const nextProgress = recordSiegeLevelClear(
      progressRef.current,
      run.data.difficulty,
      run.level.id,
      stars,
      result.finalTroops,
    );
    setProgress(nextProgress);
    progressRef.current = nextProgress;
    try {
      saveSiegeProgress(nextProgress);
      setSaveError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSaveError(message);
      console.error('Unable to save Siege campaign progress.', error);
    }
  }, []);

  const handleRunComplete = useCallback((run: ActiveSiegeRun, result: SiegeRunResult) => {
    recordRun(run, result);
  }, [recordRun]);
  const activeLevelIndex = activeRun
    ? activeRun.data.levels.findIndex((level) => level.id === activeRun.level.id)
    : -1;
  const nextLevel = activeRun && activeLevelIndex >= 0
    ? activeRun.data.levels[activeLevelIndex + 1]
    : undefined;
  const onNextLevel = activeRun && nextLevel
    ? () => startLevel(activeRun.data.difficulty, nextLevel)
    : undefined;

  return (
    <section
      className="game-screen game-siege-screen"
      data-game-mode={SIEGE_GAME_MODE}
      data-screen={screen}
      aria-label={t('game.siege.title')}
    >
      <div className="game-canvas-frame">
        {screen === 'playing' && activeRun ? (
          <SiegePlaySession
            key={runNonce}
            run={activeRun}
            saveError={saveError}
            onComplete={(result) => handleRunComplete(activeRun, result)}
            onExit={() => showLevelSelection(activeRun.data.difficulty)}
            onMainMenu={onExit}
            onPlayAgain={() => setRunNonce((current) => current + 1)}
            onChooseLevel={() => showLevelSelection(activeRun.data.difficulty)}
            onNextLevel={onNextLevel}
          />
        ) : (
          <SiegeSelectionModal
            screen={screen === 'levels' ? 'levels' : 'difficulty'}
            difficulty={selectedDifficulty}
            difficultyData={difficultyData}
            progress={progress}
            loadError={loadError}
            saveError={saveError}
            onBack={
              screen === 'levels'
                ? returnToDifficultySelection
                : onExit
            }
            onExit={onExit}
            onRetry={() => void loadContent()}
            onDifficultySelect={showLevelSelection}
            onLevelSelect={startLevel}
          />
        )}
      </div>
    </section>
  );
}
