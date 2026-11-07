import { describe, expect, it } from 'vitest';
import {
  getIndustrialGeneratorPhase,
  getIndustrialSteamDirection,
  getIndustrialSteamPhase,
  updateIndustrialMovingWalls,
} from '@/game/arena/IndustrialArenaSystem';
import { createArenaObstacleEntities } from '@/game/arena/ArenaSystem';
import { createGameState, createZombie } from '@/game/core/GameState';
import { updateGameState } from '@/game/core/GameSimulation';

describe('industrial arena mechanics', () => {
  it('cycles steam warnings/vents and generator charging/discharges', () => {
    expect(getIndustrialSteamPhase(0, 0).phase).toBe('idle');
    expect(getIndustrialSteamPhase(2.2, 0).phase).toBe('warning');
    expect(getIndustrialSteamPhase(3.2, 0).phase).toBe('venting');
    expect(getIndustrialSteamPhase(5, 0).phase).toBe('cooldown');

    expect(getIndustrialGeneratorPhase(0, 0).phase).toBe('charging');
    expect(getIndustrialGeneratorPhase(3.2, 0).phase).toBe('discharging');
    expect(getIndustrialGeneratorPhase(5, 0).phase).toBe('cooldown');
  });

  it('moves walls and pushes intersecting actors clear', () => {
    const obstacles = createArenaObstacleEntities([{
      xFraction: 0.5,
      yFraction: 0.5,
      width: 40,
      height: 30,
      kind: 'wall',
    }], 'industrial');
    const peakMovementTime = Math.PI / (2 * 0.9);

    updateIndustrialMovingWalls(obstacles, [], [], 400, 200, peakMovementTime);
    expect(obstacles[0]!.xFraction).toBeCloseTo(0.545);

    const blockedWall = createArenaObstacleEntities([{
      xFraction: 0.5,
      yFraction: 0.5,
      width: 40,
      height: 30,
      kind: 'wall',
    }], 'industrial');
    const actor = { x: 218, y: 100, radius: 8 };
    updateIndustrialMovingWalls(
      blockedWall,
      [],
      [actor],
      400,
      200,
      peakMovementTime,
    );
    expect(blockedWall[0]!.xFraction).toBeCloseTo(0.545);
    expect(actor.x).toBeGreaterThan(218);
  });

  it('supports looping and back-and-forth wall paths', () => {
    const [pingPongWall] = createArenaObstacleEntities([{
      xFraction: 0.25,
      yFraction: 0.5,
      width: 40,
      height: 30,
      kind: 'wall',
    }], 'industrial');
    const loopingWall = {
      ...pingPongWall!,
      xFraction: 0.75,
      industrialMotion: {
        ...pingPongWall!.industrialMotion!,
        originXFraction: 0.75,
        originYFraction: 0.5,
        phase: 0,
        pathMode: 'loop' as const,
      },
    };
    const walls = [pingPongWall!, loopingWall];

    updateIndustrialMovingWalls(walls, [], [], 400, 200, 0.5);
    expect(walls[0]!.xFraction).not.toBe(0.25);
    expect(walls[0]!.yFraction).toBe(0.5);
    expect(walls[1]!.xFraction).not.toBe(0.75);
    expect(walls[1]!.yFraction).not.toBe(0.5);

    updateIndustrialMovingWalls(walls, [], [], 400, 200, 2 * Math.PI / 0.9);
    expect(walls[0]!.xFraction).toBeCloseTo(0.25);
    expect(walls[0]!.yFraction).toBeCloseTo(0.5);
    expect(walls[1]!.xFraction).toBeCloseTo(0.75);
    expect(walls[1]!.yFraction).toBeCloseTo(0.5);
  });

  it('damages the player inside an active steam plume', () => {
    const state = createGameState(960, 540, 'level', 11);
    state.wave.spawnCooldownSeconds = 10_000;
    state.elapsedSeconds = 3;
    const pipeIndex = state.arenaObstacles.findIndex(({ kind }) => kind === 'barricade');
    const pipe = state.arenaObstacles[pipeIndex]!;
    const direction = getIndustrialSteamDirection(pipeIndex);
    state.player.x = state.arenaWidth * pipe.xFraction + direction.x * 80;
    state.player.y = state.arenaHeight * pipe.yFraction + direction.y * 80;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.player.health).toBe(86);
  });

  it('knocks both factions back along the active steam direction', () => {
    const state = createGameState(960, 540, 'level', 11);
    state.wave.spawnCooldownSeconds = 10_000;
    state.elapsedSeconds = 3;
    const pipeIndex = state.arenaObstacles.findIndex(({ kind }) => kind === 'barricade');
    const pipe = state.arenaObstacles[pipeIndex]!;
    const direction = getIndustrialSteamDirection(pipeIndex);
    const x = state.arenaWidth * pipe.xFraction + direction.x * 80;
    const y = state.arenaHeight * pipe.yFraction + direction.y * 80;
    state.player.x = x;
    state.player.y = y;
    const zombie = createZombie(503, 'walker', x + direction.x * 8, y + direction.y * 8);
    zombie.attackCooldownSeconds = 10_000;
    state.zombies = [zombie];
    const playerPosition = { x: state.player.x, y: state.player.y };
    const zombiePosition = { x: zombie.x, y: zombie.y };

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0.1);

    expect(
      (state.player.x - playerPosition.x) * direction.x +
        (state.player.y - playerPosition.y) * direction.y,
    ).toBeGreaterThan(0);
    expect(
      (zombie.x - zombiePosition.x) * direction.x +
        (zombie.y - zombiePosition.y) * direction.y,
    ).toBeGreaterThan(0);
  });

  it('damages the player during generator discharge but not charge-up', () => {
    const state = createGameState(960, 540, 'level', 11);
    state.wave.spawnCooldownSeconds = 10_000;
    const generator = state.arenaObstacles.find(({ kind }) => kind === 'cover')!;
    state.player.x = state.arenaWidth * generator.xFraction +
      generator.width / 2 + state.player.radius + 2;
    state.player.y = state.arenaHeight * generator.yFraction;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(state.player.health).toBe(100);

    state.elapsedSeconds = 3;
    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(state.player.health).toBe(82);
  });
});
