import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeWaveIfCleared,
  getWaveSpawnInterval,
  startWave,
} from '@/game/core/GameProgression';
import {
  createGameState,
  createGameStateSnapshot,
  createZombie,
} from '@/game/core/GameState';
import {
  createGameStateRenderLayers,
} from '@/game/rendering/GameStateRenderer';
import {
  getWaveModifierForWave,
  WAVE_MODIFIER_CONFIG,
  WAVE_MODIFIER_IDS,
} from '@/game/modifiers/WaveModifiers';
import {
  getEnemyTypeForSpawn,
} from '@/game/waves/WaveComposition';
import { WAVE_SPAWN_CONFIG } from '@/game/waves/SpawnSystem';
import { updateGameState } from '@/game/core/GameSimulation';
import { shouldSpawnElite } from '@/game/enemies/elites/EliteSystem';

describe('wave modifiers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('selects at most one eligible modifier deterministically per wave', () => {
    for (let wave = 1; wave <= 100; wave += 1) {
      const selected = getWaveModifierForWave(wave);
      expect(selected).toBe(getWaveModifierForWave(wave));
      expect(selected === null || WAVE_MODIFIER_IDS.includes(selected)).toBe(true);
      if (selected) {
        expect(wave).toBeGreaterThanOrEqual(
          WAVE_MODIFIER_CONFIG.definitions[selected].minimumWave,
        );
      }
    }

    expect(() => getWaveModifierForWave(0)).toThrow(RangeError);
    expect(() => getWaveModifierForWave(Number.MAX_SAFE_INTEGER + 1))
      .toThrow(RangeError);
  });

  it('sets the modifier once at wave start and exposes it in snapshots', () => {
    const state = createGameState();
    startWave(state, 22);

    expect(state.wave.activeModifier).toBe(getWaveModifierForWave(22));
    expect(createGameStateSnapshot(state).wave.activeModifier)
      .toBe(state.wave.activeModifier);
    if (state.wave.activeModifier) {
      expect(WAVE_MODIFIER_IDS).toContain(state.wave.activeModifier);
    }
  });

  it('increases armoured and brute composition through owning wave weights', () => {
    const countType = (
      wave: number,
      modifier: 'armouredInvasion' | 'heavyResistance',
      type: 'armoured' | 'brute',
    ) => Array.from({ length: 1_000 }, (_, spawnIndex) =>
      getEnemyTypeForSpawn({
        wave,
        spawnIndex,
        enemyBudget: 1_000,
        activeModifier: modifier,
      }),
    ).filter((enemyType) => enemyType === type).length;

    const countWithoutModifier = (
      wave: number,
      type: 'armoured' | 'brute',
    ) => Array.from({ length: 1_000 }, (_, spawnIndex) =>
      getEnemyTypeForSpawn({
        wave,
        spawnIndex,
        enemyBudget: 1_000,
      }),
    ).filter((enemyType) => enemyType === type).length;

    expect(countType(20, 'armouredInvasion', 'armoured'))
      .toBeGreaterThan(countWithoutModifier(20, 'armoured'));
    expect(countType(20, 'heavyResistance', 'brute'))
      .toBeGreaterThan(countWithoutModifier(20, 'brute'));
  });

  it('raises elite chance without exceeding the configured maximum', () => {
    const spawnCount = (activeModifier?: 'eliteThreat') => {
      let total = 0;
      for (let spawnIndex = 7_000; spawnIndex < 10_000; spawnIndex += 1) {
        if (shouldSpawnElite({
          wave: 18,
          spawnIndex,
          enemyBudget: 10_000,
          activeModifier,
        })) {
          total += 1;
        }
      }
      return total;
    };

    expect(spawnCount('eliteThreat')).toBeGreaterThan(spawnCount() * 1.5);
  });

  it('keeps Overrun bounded by its configured spawn interval floor', () => {
    expect(getWaveSpawnInterval(1)).toBe(1);
    expect(getWaveSpawnInterval(1, 'overrun')).toBe(0.75);
    expect(getWaveSpawnInterval(40, 'overrun')).toBe(0.375);
  });

  it('applies reduced visibility only to its active wave', () => {
    const state = createGameState(960, 540);
    expect(createGameStateRenderLayers(state).visibility).toBeUndefined();

    state.wave.activeModifier = 'reducedVisibility';
    expect(createGameStateRenderLayers(state).visibility).toMatchObject({
      x: state.player.x,
      y: state.player.y,
      radius: 540 * 0.68,
    });
  });

  it('keeps modifier rewards out of currency accounting', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const state = createGameState();
    state.wave.activeModifier = 'doubleOrbs';
    state.wave.enemyBudget = 1;
    state.wave.enemiesSpawned = 1;

    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.progression.standard).toMatchObject({
      earned: 3,
      available: 3,
      spent: 0,
    });
    expect(state.progression.rare).toMatchObject({
      earned: 0,
      available: 0,
      spent: 0,
    });
    expect(completeWaveIfCleared(state)).toBe(false);
  });

  it('keeps the active-enemy workload bounded during a high-pressure wave', () => {
    const state = createGameState();
    state.militaryObjects = [];
    state.wave.activeModifier = 'overrun';
    state.wave.enemyBudget = 100;
    state.wave.enemiesSpawned = 36;
    state.zombies = Array.from({ length: 36 }, (_, index) =>
      createZombie(
        index + 1,
        'walker',
        80 + (index % 6) * 20,
        80 + Math.floor(index / 6) * 20,
      ),
    );
    state.player.fireCooldownSeconds = 10_000;

    for (let frame = 0; frame < 60; frame += 1) {
      updateGameState(
        state,
        { movementX: 0, movementY: 0, aimAngle: 0 },
        0.05,
      );
    }

    expect(state.zombies.length)
      .toBeLessThanOrEqual(WAVE_SPAWN_CONFIG.maximumActiveEnemies);
  });
});
