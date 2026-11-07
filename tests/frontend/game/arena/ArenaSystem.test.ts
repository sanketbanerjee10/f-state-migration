import { describe, expect, it } from 'vitest';
import {
  ARENA_INTERACTION_CONFIG,
  ARENA_THEME_CYCLE,
  createArenaObstacles,
  createExplosiveBarrels,
  getArenaLayoutPool,
  getArenaCollisionObstacles,
  getArenaTheme,
} from '@/game/arena/ArenaSystem';
import { createGameState } from '@/game/core/GameState';
import { circleOverlapsRectangle, getArenaObstacles } from '@/game/core/ArenaGeometry';
import { prepareArenaForWave, startWave } from '@/game/core/GameProgression';
import { createValidSpawnPosition, isValidSpawnPosition } from '@/game/waves/SpawnSystem';

describe('arena system', () => {
  it('cycles to a new visual theme every ten waves', () => {
    expect(getArenaTheme(1).id).toBe('military');
    expect(getArenaTheme(9).id).toBe('military');
    expect(getArenaTheme(10).id).toBe('industrial');
    expect(getArenaTheme(20).id).toBe('contaminated');
    expect(getArenaTheme(ARENA_THEME_CYCLE.length * 10).id).toBe('military');
    expect(() => getArenaTheme(0)).toThrow(RangeError);

    const state = createGameState();
    startWave(state, 10);
    expect(state.arenaTheme).toBe('industrial');
  });

  it('creates destructible barricades and a clustered barrel pair', () => {
    const obstacles = createArenaObstacles();
    const barricades = obstacles.filter(({ kind }) => kind === 'barricade');
    const barrels = createExplosiveBarrels();

    expect(barricades).toHaveLength(2);
    expect(barricades.every(({ health, maxHealth }) =>
      health === ARENA_INTERACTION_CONFIG.barricadeHealth &&
      maxHealth === ARENA_INTERACTION_CONFIG.barricadeHealth,
    )).toBe(true);
    expect(barrels).toHaveLength(2);
    expect(barrels.every(({ health }) =>
      health === ARENA_INTERACTION_CONFIG.barrelHealth,
    )).toBe(true);
    expect(
      Math.abs(barrels[0]!.xFraction - barrels[1]!.xFraction) * 960,
    ).toBeLessThan(ARENA_INTERACTION_CONFIG.barrelExplosionRadius);
    expect(getArenaCollisionObstacles(obstacles, barrels)).toHaveLength(
      obstacles.length + barrels.length,
    );
  });

  it('includes industrial crates in every industrial arena layout', () => {
    const industrialLayouts = getArenaLayoutPool('industrial');

    expect(industrialLayouts).toHaveLength(4);
    expect(industrialLayouts.every(({ obstacles }) =>
      obstacles.some(({ kind }) => kind === 'crate'),
    )).toBe(true);
  });

  it('keeps spawn candidates valid around arena objects and rejects blocked positions', () => {
    const state = createGameState();
    const spawn = createValidSpawnPosition(state, 'walker');
    expect(spawn).toBeDefined();
    if (!spawn) return;
    expect(isValidSpawnPosition(state, spawn, 14)).toBe(true);

    const barrel = state.barrels[0]!;
    expect(isValidSpawnPosition(state, {
      x: state.arenaWidth * barrel.xFraction,
      y: state.arenaHeight * barrel.yFraction,
    }, 14)).toBe(false);
  });

  it('keeps the player spawn clear of generated arena objects', () => {
    const expectSpawnClear = (
      state: ReturnType<typeof createGameState>,
      context: string,
    ): void => {
      const obstacles = getArenaObstacles(
        state.arenaWidth,
        state.arenaHeight,
        getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
      );
      expect(obstacles.some((obstacle) =>
        circleOverlapsRectangle(state.player, state.player.radius, obstacle),
      ), context).toBe(false);
    };

    for (let level = 1; level <= 30; level += 1) {
      expectSpawnClear(createGameState(960, 540, 'level', level), `level ${level}`);
    }

    const waveState = createGameState();
    let spawnRelocated = false;

    for (let wave = 1; wave <= 50; wave += 1) {
      waveState.player.x = waveState.arenaWidth / 2;
      waveState.player.y = waveState.arenaHeight / 2;
      prepareArenaForWave(waveState, wave);
      spawnRelocated ||= waveState.player.x !== waveState.arenaWidth / 2 ||
        waveState.player.y !== waveState.arenaHeight / 2;
      expectSpawnClear(waveState, `wave ${wave}`);
    }
    expect(spawnRelocated).toBe(true);
  });
});
