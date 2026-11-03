import { createArenaLayoutForLevel } from '../arena/ArenaSystem';
import { getBossForWave } from '../bosses/BossSystem';
import { STANDARD_POINTS_PER_CLEAR } from './GameConfig';
import { getEligibleEnemyTypes } from '../waves/WaveComposition';
import type { ZombieType } from './GameState';

export interface LevelDefinition {
  readonly id: number;
  readonly name: string;
  readonly theme: string;
  readonly arenaTheme: string;
  readonly mapName: string;
  readonly rounds: number;
  readonly boss?: string;
  readonly enemyTypes: readonly ZombieType[];
  readonly description: string;
  readonly difficulty: number;
}

export interface LevelCampaignProgress {
  readonly schemaVersion: number;
  readonly highestUnlockedLevel: number;
  readonly completedLevelIds: number[];
  readonly bestTimes: Record<number, number>;
  readonly bestScores: Record<number, number>;
  readonly statPoints: number;
}

export const LEVEL_CAMPAIGN_STORAGE_KEY = 'state565-level-campaign-v1';
export const LEVEL_CAMPAIGN_SIZE = 30;

const THEME_NAMES = [
  'Military Outpost',
  'Industrial Complex',
  'Contaminated Zone',
] as const;

const ENEMY_NAMES: Readonly<Record<ZombieType, string>> = {
  walker: 'Walker',
  runner: 'Runner',
  brute: 'Brute',
  spitter: 'Spitter',
  swarm: 'Swarm',
  armoured: 'Armoured',
  screamer: 'Screamer',
  bloater: 'Bloater',
  splitter: 'Splitter',
};

export const LEVEL_DEFINITIONS: ReadonlyArray<LevelDefinition> = Array.from(
  { length: LEVEL_CAMPAIGN_SIZE },
  (_, index) => {
    const id = index + 1;
    const theme = THEME_NAMES[Math.floor(index / 10)]!;
    const arena = createArenaLayoutForLevel(id);
    const boss = getBossForWave(id);
    const enemyTypes = getEligibleEnemyTypes(id);

    if (!enemyTypes.includes('runner')) enemyTypes.unshift('runner');

    return {
      id,
      name: boss ? `Boss Stage ${id}` : `Stage ${id}`,
      theme,
      arenaTheme: arena.theme,
      mapName: `Map ${String(id).padStart(2, '0')} · ${arena.name}`,
      rounds: 1,
      ...(boss ? { boss: boss.name } : {}),
      enemyTypes,
      description: boss
        ? `Defeat ${boss.name} in the ${arena.name} arena.`
        : `Fight through ${enemyTypes.map((type) => ENEMY_NAMES[type]).join(', ')} in the ${arena.name} arena.`,
      difficulty: Number((1 + (id - 1) * 0.1).toFixed(1)),
    };
  },
);

export function getEnemyDisplayNames(level: LevelDefinition): readonly string[] {
  return level.enemyTypes.map((type) => ENEMY_NAMES[type]);
}

export function createDefaultLevelCampaignProgress(): LevelCampaignProgress {
  return {
    schemaVersion: 1,
    highestUnlockedLevel: 1,
    completedLevelIds: [],
    bestTimes: {},
    bestScores: {},
    statPoints: 0,
  };
}

export function getLevelDefinition(levelId: number): LevelDefinition | undefined {
  return LEVEL_DEFINITIONS.find((level) => level.id === levelId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBestValues(value: unknown): Record<number, number> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, candidate]) => {
      const id = Number(key);
      return Number.isInteger(id) &&
          id >= 1 &&
          id <= LEVEL_CAMPAIGN_SIZE &&
          typeof candidate === 'number' &&
          Number.isFinite(candidate) &&
          candidate >= 0
        ? [[id, candidate]]
        : [];
    }),
  );
}

export function readLevelCampaignProgress(
  storage: Storage | undefined = globalThis.localStorage,
): LevelCampaignProgress {
  if (!storage) return createDefaultLevelCampaignProgress();

  try {
    const raw = storage.getItem(LEVEL_CAMPAIGN_STORAGE_KEY);
    if (!raw) return createDefaultLevelCampaignProgress();

    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      !Array.isArray(parsed.completedLevelIds)
    ) {
      return createDefaultLevelCampaignProgress();
    }

    const completedLevelIds = [...new Set(parsed.completedLevelIds.filter(
      (id): id is number =>
        typeof id === 'number' &&
        Number.isInteger(id) &&
        id >= 1 &&
        id <= LEVEL_CAMPAIGN_SIZE,
    ))];
    const rawHighestUnlocked = parsed.highestUnlockedLevel;
    const highestUnlockedLevel = typeof rawHighestUnlocked === 'number' &&
        Number.isInteger(rawHighestUnlocked)
      ? rawHighestUnlocked
      : 1;
    const rawStatPoints = parsed.statPoints;
    const parsedStatPoints = typeof rawStatPoints === 'number' &&
        Number.isSafeInteger(rawStatPoints) &&
        rawStatPoints >= 0
      ? rawStatPoints
      : 0;
    const maximumEarnedStatPoints =
      completedLevelIds.length * STANDARD_POINTS_PER_CLEAR;
    const statPoints = parsedStatPoints <= maximumEarnedStatPoints
      ? parsedStatPoints
      : 0;

    return {
      schemaVersion: 1,
      highestUnlockedLevel: Math.max(
        1,
        Math.min(highestUnlockedLevel, LEVEL_CAMPAIGN_SIZE),
      ),
      completedLevelIds,
      bestTimes: readBestValues(parsed.bestTimes),
      bestScores: readBestValues(parsed.bestScores),
      statPoints,
    };
  } catch {
    return createDefaultLevelCampaignProgress();
  }
}

export function saveLevelCampaignProgress(
  progress: LevelCampaignProgress,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  if (!storage) return;

  const completedLevelIds = [...new Set(progress.completedLevelIds.filter(
    (id) => Number.isInteger(id) && id >= 1 && id <= LEVEL_CAMPAIGN_SIZE,
  ))];
  const statPoints = Number.isSafeInteger(progress.statPoints) &&
      progress.statPoints >= 0 &&
      progress.statPoints <=
        completedLevelIds.length * STANDARD_POINTS_PER_CLEAR
    ? progress.statPoints
    : 0;
  storage.setItem(
    LEVEL_CAMPAIGN_STORAGE_KEY,
    JSON.stringify({
      ...progress,
      schemaVersion: 1,
      highestUnlockedLevel: Math.max(
        1,
        Math.min(progress.highestUnlockedLevel, LEVEL_CAMPAIGN_SIZE),
      ),
      completedLevelIds,
      statPoints,
    }),
  );
}

export function completeLevelProgress(
  progress: LevelCampaignProgress,
  levelId: number,
  score: number,
  elapsedSeconds: number,
  statPoints = progress.statPoints,
): LevelCampaignProgress {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVEL_CAMPAIGN_SIZE) {
    throw new RangeError(`Level ID must be an integer between 1 and ${LEVEL_CAMPAIGN_SIZE}.`);
  }
  if (!Number.isSafeInteger(statPoints) || statPoints < 0) {
    throw new RangeError('Campaign Stat Points must be a non-negative safe integer.');
  }

  const completed = new Set(progress.completedLevelIds);
  completed.add(levelId);
  const bestTimes = { ...progress.bestTimes };
  const bestScores = { ...progress.bestScores };
  const previousBestTime = bestTimes[levelId];
  const previousBestScore = bestScores[levelId];

  if (previousBestTime === undefined || elapsedSeconds < previousBestTime) {
    bestTimes[levelId] = elapsedSeconds;
  }
  if (previousBestScore === undefined || score > previousBestScore) {
    bestScores[levelId] = score;
  }

  const statPointBalance = Number.isSafeInteger(statPoints) && statPoints >= 0
    ? statPoints
    : 0;
  const maximumEarnedStatPoints =
    completed.size * STANDARD_POINTS_PER_CLEAR;

  return {
    ...progress,
    highestUnlockedLevel: Math.min(
      LEVEL_CAMPAIGN_SIZE,
      Math.max(progress.highestUnlockedLevel, levelId + 1),
    ),
    completedLevelIds: [...completed].sort((left, right) => left - right),
    bestTimes,
    bestScores,
    statPoints: statPointBalance <= maximumEarnedStatPoints
      ? statPointBalance
      : 0,
  };
}

export function canStartLevel(
  progress: LevelCampaignProgress,
  levelId: number,
): boolean {
  return Number.isInteger(levelId) &&
    levelId >= 1 &&
    levelId <= progress.highestUnlockedLevel &&
    levelId <= LEVEL_CAMPAIGN_SIZE;
}
