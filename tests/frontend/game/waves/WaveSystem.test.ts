import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  awardStandardWavePoint,
} from '@/game/upgrades/ProgressionSystem';
import {
  circleOverlapsRectangle,
  getArenaObstacles,
} from '@/game/core/ArenaGeometry';
import {
  completeWaveIfCleared,
  getWaveEnemyBudget,
  getWaveSpawnAccounting,
  getWaveSpawnInterval,
  registerRequiredWaveBoss,
  resolveRequiredWaveBoss,
  startWave,
  advanceWaveProgression,
  WAVE_MILESTONE_RARE_POINT_REWARDS,
} from '@/game/core/GameProgression';
import {
  createGameState,
  createZombie,
} from '@/game/core/GameState';
import {
  DEV_ENEMY_GROUP_SIZE,
  DEV_WAVE_ENEMY_BUDGET,
  getEligibleEnemyTypes,
  getEnemyTypeForSpawn,
  getWaveTemplateId,
  isEliteEligibleSpawn,
  isRunnerSpawn,
  WAVE_ELITE_INTRODUCTION,
  WAVE_ENEMY_INTRODUCTIONS,
} from '@/game/waves/WaveComposition';
import {
  createValidSpawnPosition,
  isValidSpawnPosition,
  WAVE_SPAWN_CONFIG,
} from '@/game/waves/SpawnSystem';
import { getWaveDifficulty } from '@/game/waves/WaveDifficulty';

describe('wave composition and spawn progression', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reduces the zombie budget to 60% across waves 1-20', () => {
    for (let wave = 1; wave <= 20; wave += 1) {
      const expectedInterval = Math.max(0.5, 1 - (wave - 1) * 0.02);
      const originalBudget =
        Math.ceil((60 + (wave - 1) * 10) / expectedInterval) + 1;
      const expectedBudget = Math.round(originalBudget * 0.6);
      expect(getWaveSpawnInterval(wave)).toBe(expectedInterval);
      expect(getWaveEnemyBudget(wave)).toBe(expectedBudget);
    }

    expect(getWaveEnemyBudget(1)).toBe(37);
    expect(getWaveEnemyBudget(2)).toBe(44);
    expect(getWaveEnemyBudget(3)).toBe(51);
    expect(getWaveSpawnInterval(20)).toBeGreaterThanOrEqual(0.5);
    expect(getWaveSpawnInterval(40)).toBe(0.5);
    expect(() => getWaveEnemyBudget(0)).toThrow(RangeError);
  });

  it('limits wave-one runners to one late spawn and introduces roster types by milestone', () => {
    for (let spawnIndex = 0; spawnIndex < 30; spawnIndex += 1) {
      expect(isRunnerSpawn(1, spawnIndex)).toBe(false);
      expect(getEnemyTypeForSpawn({
        wave: 1,
        spawnIndex,
        enemyBudget: getWaveEnemyBudget(1),
      })).toBe('walker');
    }

    expect([30].map((spawnIndex) =>
      getEnemyTypeForSpawn({
        wave: 1,
        spawnIndex,
        enemyBudget: getWaveEnemyBudget(1),
      }),
    )).toEqual(['runner']);
    expect(isRunnerSpawn(1, 31)).toBe(false);

    for (const wave of [2, 7, 20]) {
      for (let spawnIndex = 0; spawnIndex < 20; spawnIndex += 1) {
        const type = getEnemyTypeForSpawn({
          wave,
          spawnIndex,
          enemyBudget: getWaveEnemyBudget(wave),
        });
        if (isRunnerSpawn(wave, spawnIndex)) {
          expect(type).toBe('runner');
        }
      }
    }

    expect(getEnemyTypeForSpawn({
      wave: 1,
      spawnIndex: 0,
      enemyBudget: 61,
    })).toBe('walker');
    expect(getEligibleEnemyTypes(3)).toEqual(['walker', 'runner']);
    expect(getEligibleEnemyTypes(4)).toContain('spitter');
    expect(getEligibleEnemyTypes(6)).toContain('swarm');
    expect(getEligibleEnemyTypes(8)).toContain('armoured');
    expect(getEligibleEnemyTypes(11)).toContain('brute');
    expect(getEligibleEnemyTypes(13)).toContain('screamer');
    expect(getEligibleEnemyTypes(15)).toContain('bloater');
    expect(getEligibleEnemyTypes(17)).toContain('splitter');
    expect(WAVE_ELITE_INTRODUCTION).toBe(18);
    expect(isEliteEligibleSpawn({
      wave: 17,
      spawnIndex: 60,
      enemyBudget: 61,
    })).toBe(false);
    expect(isEliteEligibleSpawn({
      wave: 18,
      spawnIndex: 41,
      enemyBudget: 61,
    })).toBe(false);
    expect(isEliteEligibleSpawn({
      wave: 18,
      spawnIndex: 42,
      enemyBudget: 61,
    })).toBe(true);
    expect(WAVE_ENEMY_INTRODUCTIONS.at(-1)).toEqual({
      type: 'splitter',
      wave: 17,
    });
  });

  it('selects deterministic templates and enemy types for a spawn context', () => {
    for (let wave = 1; wave <= 20; wave += 1) {
      expect(getWaveTemplateId(wave)).toBe(getWaveTemplateId(wave));
      for (const spawnIndex of [0, 1, 12, 35]) {
        const context = {
          wave,
          spawnIndex,
          enemyBudget: getWaveEnemyBudget(wave),
        };
        expect(getEnemyTypeForSpawn(context)).toBe(getEnemyTypeForSpawn(context));
      }
    }
    expect(getWaveTemplateId(10)).toBe('bossWave');
    expect(getWaveTemplateId(20)).toBe('bossWave');
    expect(getWaveTemplateId(4)).not.toBe('normal');
  });

  it('cycles enemy types in groups of four while respecting available dev-mode spawn positions', () => {
    const state = createGameState(undefined, undefined, 'dev');
    state.arenaObstacles = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
    expect(state.gameMode).toBe('dev');
    expect(state.wave.enemyBudget).toBe(DEV_WAVE_ENEMY_BUDGET);
    expect(getWaveEnemyBudget(1, 'dev')).toBe(DEV_WAVE_ENEMY_BUDGET);

    const spawnedTypes = Array.from(
      { length: WAVE_ENEMY_INTRODUCTIONS.length * DEV_ENEMY_GROUP_SIZE },
      (_, spawnIndex) => getEnemyTypeForSpawn({
        wave: 1,
        spawnIndex,
        enemyBudget: DEV_WAVE_ENEMY_BUDGET,
        devMode: true,
      }),
    );
    expect(spawnedTypes).toEqual(
      WAVE_ENEMY_INTRODUCTIONS.flatMap(({ type }) =>
        Array.from({ length: DEV_ENEMY_GROUP_SIZE }, () => type)
      ),
    );

    advanceWaveProgression(state, 0);
    expect(state.zombies).toHaveLength(2);
    expect(state.zombies.map(({ type }) => type)).toEqual([
      'walker',
      'walker',
    ]);
    advanceWaveProgression(state, 10);
    expect(state.wave.enemiesSpawned).toBe(2);
    expect(state.zombies).toHaveLength(2);

    state.zombies = [];
    startWave(state, 10);
    expect(state.wave.enemyBudget).toBe(DEV_WAVE_ENEMY_BUDGET);
    expect(state.wave.bossType).toBeUndefined();
    expect(state.wave.bossSpawned).toBe(true);
  });

  it('scales enemy difficulty deterministically without changing the existing progression curve', () => {
    let previousHealth = 1;
    for (let wave = 1; wave <= 20; wave += 1) {
      const difficulty = getWaveDifficulty(wave);
      expect(difficulty.healthMultiplier).toBeGreaterThanOrEqual(previousHealth);
      expect(difficulty.speedMultiplier).toBeLessThanOrEqual(1.28);
      previousHealth = difficulty.healthMultiplier;
    }
    expect(getWaveDifficulty(1)).toEqual({
      healthMultiplier: 1,
      speedMultiplier: 1,
      contactDamageBonus: 0,
    });
    expect(getWaveDifficulty(20).speedMultiplier).toBe(1.28);
    expect(() => getWaveDifficulty(-1)).toThrow(RangeError);
  });

  it('validates spawn positions, avoids the player and avoids repeating a location', () => {
    const state = createGameState();
    const first = createValidSpawnPosition(state, 'walker');
    expect(first).toBeDefined();
    expect(isValidSpawnPosition(state, first!, 15)).toBe(true);
    expect(Math.hypot(
      first!.x - state.player.x,
      first!.y - state.player.y,
    )).toBeGreaterThanOrEqual(
      WAVE_SPAWN_CONFIG.minimumPlayerDistance + 15,
    );
    expect(getArenaObstacles(state.arenaWidth, state.arenaHeight).some(
      (obstacle) => circleOverlapsRectangle(first!, 15, obstacle),
    )).toBe(false);

    state.wave.lastSpawnCandidateIndex = first!.candidateIndex;
    const second = createValidSpawnPosition(state, 'walker');
    expect(second).toBeDefined();
    expect(second!.candidateIndex).not.toBe(first!.candidateIndex);
  });

  it('defers invalid or capped spawns without consuming scheduled enemies', () => {
    const invalidArena = createGameState(100, 100);
    advanceWaveProgression(invalidArena, 0);
    expect(invalidArena.wave.enemiesSpawned).toBe(0);
    expect(getWaveSpawnAccounting(invalidArena)).toMatchObject({
      scheduled: 37,
      queued: 37,
      spawned: 0,
      living: 0,
    });

    const cappedState = createGameState();
    cappedState.zombies = Array.from(
      { length: WAVE_SPAWN_CONFIG.maximumActiveEnemies },
      (_, index) => createZombie(index + 1, 'walker', 240, 120),
    );
    advanceWaveProgression(cappedState, 0);
    expect(cappedState.wave.enemiesSpawned).toBe(0);
    expect(getWaveSpawnAccounting(cappedState).queued).toBe(37);

    cappedState.zombies.pop();
    advanceWaveProgression(cappedState, 0);
    expect(cappedState.wave.enemiesSpawned).toBe(1);
    expect(getWaveSpawnAccounting(cappedState)).toMatchObject({
      scheduled: 37,
      queued: 36,
      spawned: 1,
      living: WAVE_SPAWN_CONFIG.maximumActiveEnemies,
    });
  });

  it('does not complete a wave until scheduled spawns and required bosses resolve', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const state = createGameState();
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    registerRequiredWaveBoss(state);

    expect(completeWaveIfCleared(state)).toBe(false);
    expect(state.statistics.upgradePoints).toBe(0);
    expect(resolveRequiredWaveBoss(state)).toBe(true);
    expect(resolveRequiredWaveBoss(state)).toBe(false);
    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.statistics.upgradePoints).toBe(3);
    expect(awardStandardWavePoint(
      state.progression,
      'wave-clear:1',
    )).toBe(false);
    expect(state.progression.rare.available).toBe(0);
  });

  it('does not reward a wave after the player has been defeated', () => {
    const state = createGameState();
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    state.player.alive = false;

    expect(completeWaveIfCleared(state)).toBe(false);
    expect(state.statistics.upgradePoints).toBe(0);
    expect(state.statistics.standardCurrency?.earned).toBe(0);
  });

  it('awards configured milestone Rare Points separately and exactly once', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const state = createGameState();
    startWave(state, 20);
    state.wave.bossSpawned = true;
    state.wave.requiredBossesRemaining = 0;
    state.wave.enemiesSpawned = state.wave.enemyBudget;

    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.statistics.upgradePoints).toBe(3);
    expect(state.statistics.standardCurrency).toMatchObject({
      earned: 3,
      available: 3,
    });
    expect(state.statistics.rareCurrency).toMatchObject({
      earned: WAVE_MILESTONE_RARE_POINT_REWARDS[20],
      available: WAVE_MILESTONE_RARE_POINT_REWARDS[20],
    });
    expect(completeWaveIfCleared(state)).toBe(false);
    expect(state.statistics.upgradePoints).toBe(3);
    expect(state.statistics.rareCurrency?.earned).toBe(1);
  });

  it('has a 50% final-enemy Rare Point chance in survival waves', () => {
    const success = createGameState();
    success.wave.enemiesSpawned = success.wave.enemyBudget;
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.49);
    expect(completeWaveIfCleared(success)).toBe(true);
    expect(success.statistics.rareCurrency?.available).toBe(1);

    vi.restoreAllMocks();
    const miss = createGameState();
    miss.wave.enemiesSpawned = miss.wave.enemyBudget;
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.5);
    expect(completeWaveIfCleared(miss)).toBe(true);
    expect(miss.statistics.rareCurrency?.available).toBe(0);
  });
});
