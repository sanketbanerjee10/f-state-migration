import { createArenaLayoutForLevel } from '../arena/ArenaSystem';
import { getBossForWave } from '../bosses/BossSystem';
import { STANDARD_POINTS_PER_CLEAR } from './GameConfig';
import { getEligibleEnemyTypes } from '../waves/WaveComposition';
import {
  getNormalAttributeCost,
  STANDARD_ATTRIBUTE_DEFINITIONS,
  type StandardAttributeId,
} from '../upgrades/ProgressionSystem';
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
  readonly rarePoints: number;
  readonly standardAttributeLevels: Record<StandardAttributeId, number>;
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
    rarePoints: 0,
    standardAttributeLevels: {
      damage: 0,
      fireRate: 0,
      maxHealth: 0,
      movementSpeed: 0,
    },
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

function readAttributeLevels(
  value: unknown,
  maximumSpentPoints: number,
): Record<StandardAttributeId, number> {
  const levels = {
    damage: 0,
    fireRate: 0,
    maxHealth: 0,
    movementSpeed: 0,
  };
  if (!isRecord(value)) return levels;

  let spentPoints = 0;
  for (const attribute of Object.keys(levels) as StandardAttributeId[]) {
    const level = value[attribute];
    const maxLevel = STANDARD_ATTRIBUTE_DEFINITIONS[attribute].maxLevel ??
      Number.MAX_SAFE_INTEGER;
    if (typeof level === 'number' && Number.isSafeInteger(level) && level >= 0) {
      const requestedLevel = Math.min(level, maxLevel);
      while (levels[attribute] < requestedLevel) {
        const cost = getNormalAttributeCost(attribute, levels[attribute]);
        if (spentPoints + cost > maximumSpentPoints) break;
        spentPoints += cost;
        levels[attribute] += 1;
      }
    }
  }
  return levels;
}

function getSpentAttributePoints(
  levels: Record<StandardAttributeId, number>,
): number {
  return (Object.keys(levels) as StandardAttributeId[]).reduce(
    (spent, attribute) => {
      for (let level = 0; level < levels[attribute]; level += 1) {
        spent += getNormalAttributeCost(attribute, level);
      }
      return spent;
    },
    0,
  );
}

function getHighestUnlockedLevel(completedLevelIds: readonly number[]): number {
  const completed = new Set(completedLevelIds);
  let highestUnlockedLevel = 1;
  while (
    highestUnlockedLevel < LEVEL_CAMPAIGN_SIZE &&
    completed.has(highestUnlockedLevel)
  ) {
    highestUnlockedLevel += 1;
  }
  return highestUnlockedLevel;
}

export function readLevelCampaignProgress(
  storage: Storage | undefined = globalThis.localStorage,
): LevelCampaignProgress {
  if (!storage) return createDefaultLevelCampaignProgress();

  const raw = storage.getItem(LEVEL_CAMPAIGN_STORAGE_KEY);
  let parsed: unknown;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
  }

  const parsedRecord = isRecord(parsed) ? parsed : undefined;
  const completedValues: readonly unknown[] = isRecord(parsed) &&
      Array.isArray(parsed.completedLevelIds)
    ? parsed.completedLevelIds
    : [];
  const hasCompletedLevelData = parsedRecord !== undefined &&
      Array.isArray(parsedRecord.completedLevelIds);
  const completedCandidates = new Set(completedValues.filter(
    (id): id is number =>
      typeof id === 'number' &&
      Number.isInteger(id) &&
      id >= 1 &&
      id <= LEVEL_CAMPAIGN_SIZE,
  ));
  const completedLevelIds: number[] = [];
  for (let levelId = 1; completedCandidates.has(levelId); levelId += 1) {
    completedLevelIds.push(levelId);
  }

  const rawStatPoints = parsedRecord?.statPoints;
  const hasValidStatPoints = typeof rawStatPoints === 'number' &&
      Number.isSafeInteger(rawStatPoints) &&
      rawStatPoints >= 0;
  const parsedStatPoints = hasValidStatPoints ? rawStatPoints : 0;
  const rawRarePoints = parsedRecord?.rarePoints;
  const hasValidRarePoints = typeof rawRarePoints === 'number' &&
    Number.isSafeInteger(rawRarePoints) &&
    rawRarePoints >= 0;
  const migratedRarePoints = hasValidRarePoints
    ? rawRarePoints
    : completedLevelIds.reduce(
      (total) => total + (Math.random() < 0.5 ? 1 : 0),
      0,
    );
  const maximumEarnedStatPoints =
    completedLevelIds.length * STANDARD_POINTS_PER_CLEAR;
  const standardAttributeLevels = readAttributeLevels(
    parsedRecord?.standardAttributeLevels,
    maximumEarnedStatPoints,
  );
  const maximumAvailableStatPoints = Math.max(
    0,
    maximumEarnedStatPoints - getSpentAttributePoints(standardAttributeLevels),
  );
  const hasAllocatedAttributes = Object.values(standardAttributeLevels).some(
    (level) => level > 0,
  );
  const recoveredStatPoints = !hasValidStatPoints ||
      (parsedStatPoints === 0 && !hasAllocatedAttributes)
    ? maximumAvailableStatPoints
    : Math.min(parsedStatPoints, maximumAvailableStatPoints);
  const progress = !hasCompletedLevelData
    ? createDefaultLevelCampaignProgress()
    : {
        schemaVersion: 1,
        highestUnlockedLevel: getHighestUnlockedLevel(completedLevelIds),
        completedLevelIds,
        bestTimes: readBestValues(parsedRecord.bestTimes),
        bestScores: readBestValues(parsedRecord.bestScores),
        standardAttributeLevels,
        statPoints: recoveredStatPoints,
        rarePoints: migratedRarePoints,
      };

  if (raw !== JSON.stringify(progress)) {
    saveLevelCampaignProgress(progress, storage);
  }
  return progress;
}

export function saveLevelCampaignProgress(
  progress: LevelCampaignProgress,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  if (!storage) return;

  const candidates = new Set(progress.completedLevelIds.filter(
    (id) => Number.isInteger(id) && id >= 1 && id <= LEVEL_CAMPAIGN_SIZE,
  ));
  const completedLevelIds: number[] = [];
  for (let levelId = 1; candidates.has(levelId); levelId += 1) {
    completedLevelIds.push(levelId);
  }
  const validStatPoints = Number.isSafeInteger(progress.statPoints) &&
      progress.statPoints >= 0;
  const maximumEarnedStatPoints =
    completedLevelIds.length * STANDARD_POINTS_PER_CLEAR;
  const standardAttributeLevels = readAttributeLevels(
    progress.standardAttributeLevels,
    maximumEarnedStatPoints,
  );
  const maximumAvailableStatPoints = Math.max(
    0,
    maximumEarnedStatPoints - getSpentAttributePoints(standardAttributeLevels),
  );
  const normalizedProgress = {
    ...progress,
    highestUnlockedLevel: getHighestUnlockedLevel(completedLevelIds),
    completedLevelIds,
    standardAttributeLevels,
    statPoints: validStatPoints
      ? Math.min(progress.statPoints, maximumAvailableStatPoints)
      : maximumAvailableStatPoints,
    rarePoints: Number.isSafeInteger(progress.rarePoints) &&
        progress.rarePoints >= 0
      ? progress.rarePoints
      : 0,
  };
  storage.setItem(
    LEVEL_CAMPAIGN_STORAGE_KEY,
    JSON.stringify(normalizedProgress),
  );
}

export function completeLevelProgress(
  progress: LevelCampaignProgress,
  levelId: number,
  score: number,
  elapsedSeconds: number,
  statPoints = progress.statPoints,
  standardAttributeLevels = progress.standardAttributeLevels,
  rarePoints = progress.rarePoints,
): LevelCampaignProgress {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > LEVEL_CAMPAIGN_SIZE) {
    throw new RangeError(`Level ID must be an integer between 1 and ${LEVEL_CAMPAIGN_SIZE}.`);
  }
  if (!Number.isSafeInteger(statPoints) || statPoints < 0) {
    throw new RangeError('Campaign Stat Points must be a non-negative safe integer.');
  }
  if (!Number.isSafeInteger(rarePoints) || rarePoints < 0) {
    throw new RangeError('Campaign Rare Points must be a non-negative safe integer.');
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

  const maximumEarnedStatPoints =
    completed.size * STANDARD_POINTS_PER_CLEAR;
  const normalizedAttributeLevels = readAttributeLevels(
    standardAttributeLevels,
    maximumEarnedStatPoints,
  );
  const maximumAvailableStatPoints = Math.max(
    0,
    maximumEarnedStatPoints - getSpentAttributePoints(normalizedAttributeLevels),
  );
  const statPointBalance = Number.isSafeInteger(statPoints) && statPoints >= 0
    ? Math.min(statPoints, maximumAvailableStatPoints)
    : maximumAvailableStatPoints;

  return {
    ...progress,
    highestUnlockedLevel: getHighestUnlockedLevel(
      [...completed].sort((left, right) => left - right),
    ),
    completedLevelIds: [...completed].sort((left, right) => left - right),
    bestTimes,
    bestScores,
    standardAttributeLevels: normalizedAttributeLevels,
    statPoints: statPointBalance,
    rarePoints,
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
