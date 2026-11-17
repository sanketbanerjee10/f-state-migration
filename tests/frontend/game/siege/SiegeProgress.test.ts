import { describe, expect, it } from 'vitest';
import {
  SIEGE_PROGRESS_STORAGE_KEY,
  countSiegeClears,
  createDefaultSiegeProgress,
  getSiegeStars,
  isSiegeDifficultyUnlocked,
  readSiegeProgress,
  recordSiegeLevelClear,
  saveSiegeProgress,
} from '../../../../src/game/siege/SiegeProgress';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('Siege progress', () => {
  it('unlocks difficulties after ten unique clears of the previous difficulty', () => {
    let progress = createDefaultSiegeProgress();
    expect(isSiegeDifficultyUnlocked(progress, 'easy')).toBe(true);
    expect(isSiegeDifficultyUnlocked(progress, 'medium')).toBe(false);

    for (let index = 1; index <= 10; index += 1) {
      progress = recordSiegeLevelClear(progress, 'easy', `easy-${index}`, 1, index);
    }
    expect(countSiegeClears(progress, 'easy')).toBe(10);
    expect(isSiegeDifficultyUnlocked(progress, 'medium')).toBe(true);
    expect(isSiegeDifficultyUnlocked(progress, 'difficult')).toBe(false);
  });

  it('does not count removed or renamed levels toward unlocks', () => {
    let progress = createDefaultSiegeProgress();
    for (let index = 1; index <= 10; index += 1) {
      progress = recordSiegeLevelClear(progress, 'easy', `old-${index}`, 1, index);
    }

    expect(isSiegeDifficultyUnlocked(
      progress,
      'medium',
      ['easy-01', 'easy-02', 'easy-03'],
    )).toBe(false);
  });

  it('retains the best stars and best troop count independently', () => {
    let progress = createDefaultSiegeProgress();
    progress = recordSiegeLevelClear(progress, 'easy', 'easy-01', 3, 12);
    progress = recordSiegeLevelClear(progress, 'easy', 'easy-01', 2, 20);
    expect(progress.levels.easy?.['easy-01']).toEqual({
      stars: 3,
      bestFinalTroops: 20,
    });
  });

  it('round-trips validated progress through the Siege storage key', () => {
    const storage = createStorage();
    const progress = recordSiegeLevelClear(
      createDefaultSiegeProgress(),
      'medium',
      'medium-01',
      2,
      15,
    );
    saveSiegeProgress(progress, storage);
    expect(storage.getItem(SIEGE_PROGRESS_STORAGE_KEY)).toContain('"schemaVersion":1');
    expect(readSiegeProgress(storage)).toEqual(progress);
  });

  it('assigns stars from the configured thresholds', () => {
    expect(getSiegeStars(9, { two: 10, three: 20 })).toBe(1);
    expect(getSiegeStars(10, { two: 10, three: 20 })).toBe(2);
    expect(getSiegeStars(20, { two: 10, three: 20 })).toBe(3);
  });
});
