import { describe, expect, it } from 'vitest';
import { getArenaCollisionObstacles } from '@/game/arena/ArenaSystem';
import { createGameState, createZombie } from '@/game/core/GameState';
import {
  isProjectileBlockedByObstacle,
  updateGameState,
} from '@/game/core/GameSimulation';

const idleInput = { movementX: 0, movementY: 0, aimAngle: 0 };

function stopAutomaticCombat(state: ReturnType<typeof createGameState>): void {
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
}

describe('industrial acceptance criteria', () => {
  it('creates one oil fire puddle per destroyed barrel and damages both factions while they burn', () => {
    const state = createGameState(960, 540, 'level', 11);
    stopAutomaticCombat(state);
    const barrel = state.barrels[0]!;
    barrel.health = 1;
    const x = state.arenaWidth * barrel.xFraction;
    const y = state.arenaHeight * barrel.yFraction;
    const zombie = createZombie(501, 'walker', x + 24, y);
    zombie.health = 500;
    zombie.attackCooldownSeconds = 10_000;
    state.player.x = x;
    state.player.y = y;
    state.zombies = [zombie];
    state.projectiles.push({
      id: 700,
      x,
      y,
      directionX: 1,
      directionY: 0,
      radius: 3,
      damage: 100,
      speed: 0,
      remainingSeconds: 1,
      owner: 'player',
    });

    updateGameState(state, idleInput, 0);

    expect(barrel.health).toBe(0);
    expect(state.player.health).toBeLessThan(state.player.maxHealth);
    expect(zombie.health).toBeLessThan(500);
    expect(state.oilFirePatches).toHaveLength(1);
    expect(state.oilFirePatches[0]?.barrelId).toBe(barrel.id);

    const playerHealthAfterExplosion = state.player.health;
    const zombieHealthAfterExplosion = zombie.health;
    updateGameState(state, idleInput, 0.7);
    expect(state.player.health).toBeLessThan(playerHealthAfterExplosion);
    expect(zombie.health).toBeLessThan(zombieHealthAfterExplosion);

    state.player.x = x - 300;
    zombie.x = x + 150;
    const zombieHealthAfterLeaving = zombie.health;
    updateGameState(state, idleInput, 0.5);
    expect(zombie.health).toBeLessThan(zombieHealthAfterLeaving);
    expect(zombie.industrialBurnRemainingSeconds).toBeGreaterThan(0);

    updateGameState(state, idleInput, 2.5);
    expect(zombie.industrialBurnRemainingSeconds).toBe(0);

    state.projectiles.push({
      id: 701,
      x,
      y,
      directionX: 1,
      directionY: 0,
      radius: 3,
      damage: 100,
      speed: 0,
      remainingSeconds: 1,
      owner: 'player',
    });
    updateGameState(state, idleInput, 0);
    expect(state.oilFirePatches).toHaveLength(1);
  });

  it('launches gas cylinders on a fixed trajectory, damages both sides, then terminates and resets', () => {
    const state = createGameState(960, 540, 'level', 11);
    stopAutomaticCombat(state);
    const cylinder = state.gasCylinders[0]!;
    cylinder.cooldownSeconds = 0;
    state.player.x = cylinder.originX + 170;
    state.player.y = cylinder.originY;
    const zombie = createZombie(
      502,
      'walker',
      cylinder.originX + 80,
      cylinder.originY,
    );
    zombie.attackCooldownSeconds = 10_000;
    state.zombies = [zombie];

    const playerHealth = state.player.health;
    const zombieHealth = zombie.health;
    updateGameState(state, idleInput, 0.7);
    expect(cylinder.phase).toBe('flying');
    expect(state.player.health).toBeLessThan(playerHealth);
    expect(zombie.health).toBeLessThan(zombieHealth);

    const fixedDirection = { x: cylinder.directionX, y: cylinder.directionY };
    const previousPosition = { x: cylinder.x, y: cylinder.y };
    state.player.x = 100;
    state.player.y = 450;
    updateGameState(state, idleInput, 0.1);
    expect(cylinder.directionX).toBe(fixedDirection.x);
    expect(cylinder.directionY).toBe(fixedDirection.y);
    expect(cylinder.x).not.toBe(previousPosition.x);
    expect(cylinder.y).toBe(previousPosition.y);

    cylinder.remainingSeconds = 0.01;
    state.player.x = cylinder.x + 12;
    state.player.y = cylinder.y;
    zombie.x = cylinder.x + 20;
    zombie.y = cylinder.y;
    const healthBeforeBlast = state.player.health;
    const zombieHealthBeforeBlast = zombie.health;
    updateGameState(state, idleInput, 0.1);
    expect(cylinder.phase).toBe('detonating');
    expect(state.player.health).toBeLessThan(healthBeforeBlast);
    expect(zombie.health).toBeLessThan(zombieHealthBeforeBlast);

    updateGameState(state, idleInput, 0.4);
    expect(cylinder.phase).toBe('idle');
    expect(cylinder.x).toBe(cylinder.originX);
    expect(cylinder.y).toBe(cylinder.originY);
  });

  it('destroys industrial crates, clears their collision, and guarantees one orb above the pickup cap', () => {
    const state = createGameState(960, 540, 'level', 11);
    stopAutomaticCombat(state);
    const crate = state.arenaObstacles.find(({ kind }) => kind === 'crate')!;
    const x = state.arenaWidth * crate.xFraction;
    const y = state.arenaHeight * crate.yFraction;
    const projectile = {
      id: 703,
      x: x - 40,
      y,
      directionX: 1,
      directionY: 0,
      radius: 2,
      damage: 200,
      speed: 0,
      remainingSeconds: 1,
      owner: 'player' as const,
    };
    expect(isProjectileBlockedByObstacle(state, projectile, x + 40, y)).toBe(true);

    state.items = Array.from({ length: 3 }, (_, index) => ({
      id: 800 + index,
      type: 'health' as const,
      x: 50 + index * 30,
      y: 50,
      radius: 12,
      durationSeconds: 12,
      remainingSeconds: 12,
    }));
    state.projectiles.push({
      ...projectile,
      id: 704,
      x,
      speed: 0,
    });
    updateGameState(state, idleInput, 0);

    expect(crate.health).toBe(0);
    expect(isProjectileBlockedByObstacle(state, projectile, x + 40, y)).toBe(false);
    expect(state.items).toHaveLength(4);
    expect(['health', 'shield']).toContain(state.items[3]?.type);

    state.projectiles.push({
      ...projectile,
      id: 705,
      x,
      speed: 0,
    });
    updateGameState(state, idleInput, 0);
    expect(state.items).toHaveLength(4);
  });

  it('removes destroyed crates from collision and pathfinding obstacle sets', () => {
    const state = createGameState(960, 540, 'level', 11);
    const crate = state.arenaObstacles.find(({ kind }) => kind === 'crate')!;
    crate.health = 0;
    expect(
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels)
        .some((obstacle) => obstacle === crate),
    ).toBe(false);
  });
});
