import { describe, expect, it } from 'vitest';
import { isProjectileBlockedByObstacle, updateGameState } from '@/game/core/GameSimulation';
import { createGameState, createZombie } from '@/game/core/GameState';
import type { ProjectileEntity } from '@/game/core/GameState';

function createProjectile(
  overrides: Partial<ProjectileEntity> = {},
): ProjectileEntity {
  return {
    id: 100,
    x: 480,
    y: 125,
    directionX: 0,
    directionY: -1,
    radius: 4,
    damage: 100,
    speed: 560,
    remainingSeconds: 1,
    owner: 'player',
    kind: 'standard',
    ...overrides,
  };
}

function tick(state: ReturnType<typeof createGameState>, deltaSeconds = 0.1): void {
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
  updateGameState(
    state,
    { movementX: 0, movementY: 0, aimAngle: 0 },
    deltaSeconds,
  );
}

describe('arena interactions', () => {
  it('damages and breaks barricades, then removes them from projectile collision', () => {
    const state = createGameState();
    const barricade = state.arenaObstacles.find(
      ({ kind }) => kind === 'barricade',
    );
    expect(barricade).toBeDefined();
    if (!barricade) return;

    const shot = createProjectile({
      x: 640,
      y: 162,
      directionY: 0,
      directionX: 1,
      damage: 90,
      speed: 200,
    });
    state.projectiles = [shot];
    tick(state);
    expect(barricade.health).toBe(90);

    state.projectiles = [
      createProjectile({
        x: 640,
        y: 162,
        directionY: 0,
        directionX: 1,
        damage: 90,
        speed: 200,
      }),
    ];
    tick(state);
    expect(barricade.health).toBe(0);
    expect(isProjectileBlockedByObstacle(state, shot, 700, 162)).toBe(false);
  });

  it('explodes barrels, chains to nearby barrels, and damages enemies', () => {
    const state = createGameState();
    const brute = createZombie(50, 'brute', 515, 102);
    state.zombies = [brute];
    state.projectiles = [createProjectile()];

    tick(state);

    expect(state.barrels.every(({ health }) => health === 0)).toBe(true);
    expect(brute.health).toBeLessThan(brute.maxHealth);
    expect(state.impacts.some(({ kind, radius }) =>
      kind === 'bomb' &&
      radius === 112,
    )).toBe(true);
  });

  it('damages the player when a barrel blast catches them', () => {
    const state = createGameState();
    state.player.x = 480;
    state.player.y = 140;
    state.barrels[0]!.health = 1;
    state.projectiles = [createProjectile()];

    tick(state);

    expect(state.player.health).toBeLessThan(100);
  });

  it('expires timed hazards through their existing lifecycle', () => {
    const state = createGameState();
    state.hazards.push({
      id: 200,
      x: 40,
      y: 40,
      radius: 20,
      damage: 10,
      durationSeconds: 1,
      remainingSeconds: 0.05,
      kind: 'acid',
    });

    tick(state);

    expect(state.hazards).toHaveLength(0);
  });
});
