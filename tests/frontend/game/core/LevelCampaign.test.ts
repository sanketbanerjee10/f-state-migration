import { describe, expect, it, vi } from 'vitest';
import {
  canStartLevel,
  completeLevelProgress,
  createDefaultLevelCampaignProgress,
  LEVEL_DEFINITIONS,
  LEVEL_CAMPAIGN_STORAGE_KEY,
  readLevelCampaignProgress,
  saveLevelCampaignProgress,
} from '@/game/core/LevelCampaign';

describe('level campaign', () => {
  it('defines thirty unique maps with boss stages at levels 10, 20, and 30', () => {
    expect(LEVEL_DEFINITIONS).toHaveLength(30);
    expect(new Set(LEVEL_DEFINITIONS.map((level) => level.mapName)).size).toBe(30);
    expect(
      LEVEL_DEFINITIONS.filter((level) => level.boss).map((level) => level.id),
    ).toEqual([10, 20, 30]);
  });

  it('makes every existing enemy type available by the final campaign level', () => {
    expect(LEVEL_DEFINITIONS[29]?.enemyTypes).toEqual([
      'walker',
      'runner',
      'spitter',
      'swarm',
      'armoured',
      'brute',
      'screamer',
      'bloater',
      'splitter',
    ]);
  });

  it('unlocks levels sequentially without relocking completed progress', () => {
    const firstClear = completeLevelProgress(
      createDefaultLevelCampaignProgress(),
      1,
      1200,
      45,
    );
    expect(canStartLevel(firstClear, 1)).toBe(true);
    expect(canStartLevel(firstClear, 2)).toBe(true);
    expect(canStartLevel(firstClear, 3)).toBe(false);

    const replayClear = completeLevelProgress(firstClear, 1, 900, 60);
    expect(replayClear.highestUnlockedLevel).toBe(2);
    expect(replayClear.bestScores[1]).toBe(1200);
    expect(replayClear.bestTimes[1]).toBe(45);
  });

  it('persists campaign stat points and restores them for later levels', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;
    const completed = completeLevelProgress(
      createDefaultLevelCampaignProgress(),
      1,
      1200,
      45,
      3,
    );

    saveLevelCampaignProgress(completed, storage);

    expect(readLevelCampaignProgress(storage).statPoints).toBe(3);
    expect(completeLevelProgress(
      readLevelCampaignProgress(storage),
      2,
      1500,
      40,
      5,
    ).statPoints).toBe(5);
  });

  it('migrates missing rare-point balances using the per-level 50% reward chance', () => {
    const values = new Map<string, string>([[
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        completedLevelIds: Array.from({ length: 10 }, (_, index) => index + 1),
        statPoints: 30,
      }),
    ]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.1);

    try {
      const migrated = readLevelCampaignProgress(storage);
      expect(migrated.rarePoints).toBe(10);

      const completedNextLevel = completeLevelProgress(
        migrated,
        11,
        1500,
        40,
        33,
        migrated.standardAttributeLevels,
        migrated.rarePoints + 1,
      );
      saveLevelCampaignProgress(completedNextLevel, storage);

      expect(readLevelCampaignProgress(storage).rarePoints).toBe(11);
    } finally {
      random.mockRestore();
    }
  });

  it('persists allocated campaign stats and accounts for their point costs', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;
    const progress = completeLevelProgress(
      {
        ...createDefaultLevelCampaignProgress(),
        completedLevelIds: [1, 2],
      },
      3,
      1200,
      45,
      4,
      {
        damage: 1,
        fireRate: 1,
        maxHealth: 0,
        movementSpeed: 0,
      },
    );

    saveLevelCampaignProgress(progress, storage);

    expect(readLevelCampaignProgress(storage)).toMatchObject({
      statPoints: 4,
      standardAttributeLevels: {
        damage: 1,
        fireRate: 1,
        maxHealth: 0,
        movementSpeed: 0,
      },
    });
  });

  it('resets missing level data and caps points to the cleared level balance', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;

    values.set(
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({ statPoints: 12, highestUnlockedLevel: 30 }),
    );
    const missingLevels = readLevelCampaignProgress(storage);
    expect(missingLevels.statPoints).toBe(0);
    expect(missingLevels.highestUnlockedLevel).toBe(1);
    expect(missingLevels.completedLevelIds).toEqual([]);
    expect(JSON.parse(values.get(LEVEL_CAMPAIGN_STORAGE_KEY) ?? '{}'))
      .toMatchObject({
        statPoints: 0,
        highestUnlockedLevel: 1,
        completedLevelIds: [],
      });

    values.set(
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        statPoints: 7,
        highestUnlockedLevel: 30,
        completedLevelIds: [1, 2],
      }),
    );
    const excessivePoints = readLevelCampaignProgress(storage);
    expect(excessivePoints.statPoints).toBe(6);
    expect(excessivePoints.highestUnlockedLevel).toBe(3);
    expect(excessivePoints.completedLevelIds).toEqual([1, 2]);
    expect(canStartLevel(excessivePoints, 3)).toBe(true);
    expect(JSON.parse(values.get(LEVEL_CAMPAIGN_STORAGE_KEY) ?? '{}'))
      .toMatchObject({
        statPoints: 6,
        highestUnlockedLevel: 3,
        completedLevelIds: [1, 2],
      });

    values.set(
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        statPoints: 6,
        highestUnlockedLevel: 3,
        completedLevelIds: [1, 2],
      }),
    );
    expect(readLevelCampaignProgress(storage).statPoints).toBe(6);
  });

  it('restores earned stat points when a cleared campaign has a zero or missing balance', () => {
    const values = new Map<string, string>([[
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        completedLevelIds: Array.from({ length: 10 }, (_, index) => index + 1),
        statPoints: 0,
      }),
    ]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;

    expect(readLevelCampaignProgress(storage)).toMatchObject({
      highestUnlockedLevel: 11,
      statPoints: 30,
    });

    values.set(
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        completedLevelIds: Array.from({ length: 10 }, (_, index) => index + 1),
      }),
    );
    expect(readLevelCampaignProgress(storage).statPoints).toBe(30);
  });

  it('updates campaign data in storage when the reader repairs tampered unlocks', () => {
    const values = new Map<string, string>([[
      LEVEL_CAMPAIGN_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        highestUnlockedLevel: 30,
        completedLevelIds: [1, 3, 5],
        bestTimes: {},
        bestScores: {},
        statPoints: 3,
      }),
    ]]);
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    } satisfies Storage;

    const progress = readLevelCampaignProgress(storage);

    expect(progress.completedLevelIds).toEqual([1]);
    expect(progress.highestUnlockedLevel).toBe(2);
    expect(progress.statPoints).toBe(3);
    expect(canStartLevel(progress, 2)).toBe(true);
    expect(canStartLevel(progress, 3)).toBe(false);
    expect(JSON.parse(values.get(LEVEL_CAMPAIGN_STORAGE_KEY) ?? '{}'))
      .toMatchObject({
        highestUnlockedLevel: 2,
        completedLevelIds: [1],
        statPoints: 3,
      });
  });

  it('caps campaign points to the total earned from completed levels', () => {
    const progress = completeLevelProgress(
      {
        ...createDefaultLevelCampaignProgress(),
        highestUnlockedLevel: 3,
        completedLevelIds: [1, 2],
        bestTimes: { 1: 30, 2: 40 },
        bestScores: { 1: 100, 2: 200 },
        statPoints: 0,
      },
      3,
      300,
      25,
      10,
    );

    expect(progress).toMatchObject({
      highestUnlockedLevel: 4,
      completedLevelIds: [1, 2, 3],
      statPoints: 9,
    });
  });
});
