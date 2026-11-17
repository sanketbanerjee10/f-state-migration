import {
  SIEGE_DIFFICULTIES,
  type SiegeDifficulty,
} from './SiegeRules';

export const SIEGE_PROGRESS_STORAGE_KEY = 'siege.progress.v1';
export const SIEGE_UNLOCK_CLEAR_COUNT = 10;

export interface SiegeLevelRecord {
  readonly stars: number;
  readonly bestFinalTroops: number;
}

export interface SiegeProgress {
  readonly schemaVersion: 1;
  readonly levels: Readonly<Partial<Record<SiegeDifficulty, Readonly<Record<string, SiegeLevelRecord>>>>>;
}

export function createDefaultSiegeProgress(): SiegeProgress {
  return { schemaVersion: 1, levels: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeRecord(value: unknown): SiegeLevelRecord | null {
  if (!isRecord(value)) return null;
  const stars = value.stars;
  const bestFinalTroops = value.bestFinalTroops;
  if (
    typeof stars !== 'number' ||
    !Number.isSafeInteger(stars) ||
    stars < 1 ||
    stars > 3 ||
    typeof bestFinalTroops !== 'number' ||
    !Number.isSafeInteger(bestFinalTroops) ||
    bestFinalTroops < 0
  ) {
    return null;
  }
  return { stars, bestFinalTroops };
}

export function readSiegeProgress(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage,
): SiegeProgress {
  if (!storage) return createDefaultSiegeProgress();
  const raw = storage.getItem(SIEGE_PROGRESS_STORAGE_KEY);
  if (!raw) return createDefaultSiegeProgress();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('Unable to parse saved Siege progress.', error);
    return createDefaultSiegeProgress();
  }
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.levels)) {
    return createDefaultSiegeProgress();
  }

  const levels: Partial<Record<SiegeDifficulty, Record<string, SiegeLevelRecord>>> = {};
  for (const difficulty of SIEGE_DIFFICULTIES) {
    const rawLevels = parsed.levels[difficulty];
    if (!isRecord(rawLevels)) continue;
    const records: Record<string, SiegeLevelRecord> = {};
    for (const [levelId, value] of Object.entries(rawLevels)) {
      const record = sanitizeRecord(value);
      if (record) records[levelId] = record;
    }
    if (Object.keys(records).length > 0) levels[difficulty] = records;
  }
  return { schemaVersion: 1, levels };
}

export function saveSiegeProgress(
  progress: SiegeProgress,
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  if (!storage) return;
  storage.setItem(SIEGE_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

export function recordSiegeLevelClear(
  progress: SiegeProgress,
  difficulty: SiegeDifficulty,
  levelId: string,
  stars: number,
  finalTroops: number,
): SiegeProgress {
  if (!Number.isSafeInteger(stars) || stars < 1 || stars > 3) {
    throw new RangeError('Siege clear stars must be an integer from 1 to 3.');
  }
  if (!Number.isSafeInteger(finalTroops) || finalTroops < 0) {
    throw new RangeError('Siege final troops must be a non-negative safe integer.');
  }
  const current = progress.levels[difficulty]?.[levelId];
  return {
    schemaVersion: 1,
    levels: {
      ...progress.levels,
      [difficulty]: {
        ...progress.levels[difficulty],
        [levelId]: {
          stars: Math.max(current?.stars ?? 0, stars),
          bestFinalTroops: Math.max(current?.bestFinalTroops ?? 0, finalTroops),
        },
      },
    },
  };
}

export function countSiegeClears(
  progress: SiegeProgress,
  difficulty: SiegeDifficulty,
  knownLevelIds?: readonly string[],
): number {
  const records = progress.levels[difficulty] ?? {};
  const knownIds = knownLevelIds ? new Set(knownLevelIds) : null;
  return Object.entries(records).filter(
    ([levelId, record]) => record.stars >= 1 && (!knownIds || knownIds.has(levelId)),
  ).length;
}

export function isSiegeDifficultyUnlocked(
  progress: SiegeProgress,
  difficulty: SiegeDifficulty,
  knownPreviousLevelIds?: readonly string[],
): boolean {
  const difficultyIndex = SIEGE_DIFFICULTIES.indexOf(difficulty);
  if (difficultyIndex === 0) return true;
  const previousDifficulty = SIEGE_DIFFICULTIES[difficultyIndex - 1];
  return countSiegeClears(
    progress,
    previousDifficulty,
    knownPreviousLevelIds,
  ) >= SIEGE_UNLOCK_CLEAR_COUNT;
}

export function getSiegeStars(finalTroops: number, thresholds: { two: number; three: number }): number {
  if (finalTroops >= thresholds.three) return 3;
  if (finalTroops >= thresholds.two) return 2;
  return 1;
}
