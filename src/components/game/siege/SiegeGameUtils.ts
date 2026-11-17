import type {
  SiegeDifficulty,
  SiegeDifficultyData,
  SiegeLevel,
} from '@/game/siege/SiegeRules';
import type { SiegeRuntimeState } from '@/game/siege/SiegeEngine';
import type { SiegeProgress } from '@/game/siege/SiegeProgress';

export interface ActiveSiegeRun {
  readonly data: SiegeDifficultyData;
  readonly level: SiegeLevel;
}

export function getStartingTroops(
  data: SiegeDifficultyData,
  level: SiegeLevel,
): number {
  return level.startTroops ?? data.rules.startTroops;
}

export function getInitialRuntimeState(run: ActiveSiegeRun): SiegeRuntimeState {
  return {
    phase: 'running',
    troops: getStartingTroops(run.data, run.level),
    playerX: 0,
    playerY: 0,
    sectionIndex: 0,
    rowIndex: 0,
    rowCount: run.level.sections[0]?.elements.length ?? 0,
    zombiesRemaining: 0,
    elapsedSeconds: 0,
  };
}

export function getCurrentSiegeLevelIndex(
  data: SiegeDifficultyData,
  progress: SiegeProgress,
  difficulty: SiegeDifficulty,
): number {
  const firstUncleared = data.levels.findIndex(
    (level) => !progress.levels[difficulty]?.[level.id],
  );
  return firstUncleared < 0 ? data.levels.length - 1 : firstUncleared;
}
