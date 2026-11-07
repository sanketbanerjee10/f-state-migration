import { describe, expect, it } from 'vitest';
import {
  createMilitaryOutpostObjects,
  getArenaCollisionObstacles,
  getArenaLayoutPool,
  type MilitaryOutpostEntity,
} from '@/game/arena/ArenaSystem';
import {
  GAME_PROGRESSION_CONFIG,
  MILITARY_OBJECT_CONFIG,
} from '@/game/core/GameConfig';
import {
  createGameState,
  createZombie,
  type GameState,
} from '@/game/core/GameState';
import {
  isProjectileBlockedByObstacle,
  updateGameState,
  type GameInputState,
} from '@/game/core/GameSimulation';

const IDLE_INPUT: GameInputState = {
  movementX: 0,
  movementY: 0,
  aimAngle: 0,
};

function createMilitaryTestState(): GameState {
  const state = createGameState(1200, 720);
  state.arenaObstacles = [];
  state.barrels = [];
  state.wave.enemyBudget = 100;
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
  return state;
}

function findObject<K extends MilitaryOutpostEntity['kind']>(
  state: GameState,
  kind: K,
): Extract<MilitaryOutpostEntity, { kind: K }> {
  const object = state.militaryObjects.find((candidate) => candidate.kind === kind);
  if (!object) throw new Error(`Missing military object: ${kind}`);
  return object as Extract<MilitaryOutpostEntity, { kind: K }>;
}

function shootObject(
  state: GameState,
  object: MilitaryOutpostEntity,
  damage = 2_000,
): void {
  state.militaryObjects = [object];
  const x = state.arenaWidth * object.xFraction;
  const y = state.arenaHeight * object.yFraction;
  state.projectiles = [{
    id: state.nextEntityId++,
    x: x - object.width,
    y,
    directionX: 1,
    directionY: 0,
    radius: 2,
    damage,
    speed: 560,
    remainingSeconds: 1,
    owner: 'player',
    kind: 'standard',
  }];
  updateGameState(state, IDLE_INPUT, 0.1);
}

describe('Military Outpost gameplay', () => {
  it('creates varied military defenses and adds only solid objects to collision', () => {
    const objects = createMilitaryOutpostObjects('military', 'test-arena-1');
    expect(objects.filter((object) => object.kind === 'abandoned-turret')).toHaveLength(2);
    expect(objects.filter((object) => object.kind === 'razor-wire').length).toBeGreaterThanOrEqual(3);
    expect(new Set(objects.map((object) => object.id)).size).toBe(objects.length);
    expect(createMilitaryOutpostObjects('industrial')).toEqual([]);

    for (const layout of getArenaLayoutPool('military')) {
      const layoutObjects = createMilitaryOutpostObjects('military', layout.id, layout);
      for (const object of layoutObjects) {
        const x = 1200 * object.xFraction;
        const y = 720 * object.yFraction;
        for (const obstacle of layout.obstacles) {
          expect(
            Math.abs(x - 1200 * obstacle.xFraction) <
              (object.width + obstacle.width) / 2 &&
            Math.abs(y - 720 * obstacle.yFraction) <
              (object.height + obstacle.height) / 2,
          ).toBe(false);
        }
        for (const barrel of layout.barrels) {
          const dx = Math.max(
            0,
            Math.abs(x - 1200 * barrel.xFraction) - object.width / 2,
          );
          const dy = Math.max(
            0,
            Math.abs(y - 720 * barrel.yFraction) - object.height / 2,
          );
          expect(dx * dx + dy * dy).toBeGreaterThan(16 ** 2);
        }
      }
    }

    for (const object of createMilitaryOutpostObjects('military', 'mobile')) {
      expect(object.xFraction * 320 - object.width / 2).toBeGreaterThanOrEqual(0);
      expect(object.xFraction * 320 + object.width / 2).toBeLessThanOrEqual(320);
      expect(object.yFraction * 320 - object.height / 2).toBeGreaterThanOrEqual(0);
      expect(object.yFraction * 320 + object.height / 2).toBeLessThanOrEqual(320);
    }

    const state = createMilitaryTestState();
    const collisionObjects = getArenaCollisionObstacles([], [], state.militaryObjects);
    expect(collisionObjects).toHaveLength(6);

    const projectile = {
      id: 0,
      x: 0,
      y: 0,
      directionX: 1,
      directionY: 0,
      radius: 2,
      damage: 1,
      speed: 0,
      remainingSeconds: 1,
      owner: 'enemy' as const,
      kind: 'spitter' as const,
    };
    const sandbag = findObject(state, 'sandbag-barricade');
    const sandbagX = state.arenaWidth * sandbag.xFraction;
    const sandbagY = state.arenaHeight * sandbag.yFraction;
    projectile.x = sandbagX - 100;
    projectile.y = sandbagY;
    expect(isProjectileBlockedByObstacle(
      state,
      projectile,
      sandbagX + 100,
      sandbagY,
    )).toBe(true);

    const wire = findObject(state, 'razor-wire');
    const wireX = state.arenaWidth * wire.xFraction;
    const wireY = state.arenaHeight * wire.yFraction;
    projectile.x = wireX - 100;
    projectile.y = wireY;
    expect(isProjectileBlockedByObstacle(
      state,
      projectile,
      wireX + 100,
      wireY,
    )).toBe(false);
  });

  it('blocks spitter shots on military structures while razor wire remains passable and damaging', () => {
    const state = createMilitaryTestState();
    const sandbag = findObject(state, 'sandbag-barricade');
    state.militaryObjects = [sandbag];
    const x = state.arenaWidth * sandbag.xFraction;
    const y = state.arenaHeight * sandbag.yFraction;
    state.player.x = x + 150;
    state.player.y = y;
    const health = state.player.health;
    state.projectiles.push({
      id: state.nextEntityId++,
      x: x - 100,
      y,
      directionX: 1,
      directionY: 0,
      radius: 2,
      damage: 10,
      speed: 560,
      remainingSeconds: 1,
      owner: 'enemy',
      kind: 'spitter',
    });

    updateGameState(state, IDLE_INPUT, 0.2);
    expect(state.player.health).toBe(health);
    expect(state.projectiles).toHaveLength(0);

    const wireState = createMilitaryTestState();
    const wire = findObject(wireState, 'razor-wire');
    const wireX = wireState.arenaWidth * wire.xFraction;
    const wireY = wireState.arenaHeight * wire.yFraction;
    wireState.player.x = wireX;
    wireState.player.y = wireY;
    const wireHealth = wireState.player.health;

    updateGameState(wireState, { ...IDLE_INPUT, movementX: 1 }, 0.1);
    expect(wireState.player.x).toBeGreaterThan(wireX);
    expect(wireState.player.health).toBe(wireHealth - MILITARY_OBJECT_CONFIG.razorWire.damage);
  });

  it('keeps map razor wire active and damaging after 45 seconds', () => {
    const state = createMilitaryTestState();
    const wire = findObject(state, 'razor-wire');
    updateGameState(state, IDLE_INPUT, 46);
    expect(wire.active).toBe(true);

    const wireX = state.arenaWidth * wire.xFraction;
    const wireY = state.arenaHeight * wire.yFraction;
    state.player.x = wireX;
    state.player.y = wireY;
    const health = state.player.health;
    updateGameState(state, IDLE_INPUT, 0.1);
    expect(state.player.health).toBe(health - MILITARY_OBJECT_CONFIG.razorWire.damage);
  });

  it('uses the vertical wire footprint for player damage', () => {
    const state = createMilitaryTestState();
    const wire = findObject(state, 'razor-wire');
    wire.rotation = Math.PI / 2;
    state.militaryObjects = [wire];
    state.player.x = state.arenaWidth * wire.xFraction +
      wire.height / 2 + state.player.radius - 1;
    state.player.y = state.arenaHeight * wire.yFraction;
    const health = state.player.health;

    updateGameState(state, IDLE_INPUT, 0.1);

    expect(state.player.health).toBe(health - MILITARY_OBJECT_CONFIG.razorWire.damage);
  });

  it('slows movement through destroyed sandbags and active razor wire', () => {
    const slowedState = createMilitaryTestState();
    const sandbag = findObject(slowedState, 'sandbag-barricade');
    shootObject(slowedState, sandbag);
    expect(sandbag.destroyed).toBe(true);

    const clearState = createMilitaryTestState();
    const clearSandbag = findObject(clearState, 'sandbag-barricade');
    clearSandbag.destroyed = true;
    clearSandbag.spillRemainingSeconds = 0;

    const sandbagX = slowedState.arenaWidth * sandbag.xFraction;
    const sandbagY = slowedState.arenaHeight * sandbag.yFraction;
    const clearSandbagX = clearState.arenaWidth * clearSandbag.xFraction;
    const clearSandbagY = clearState.arenaHeight * clearSandbag.yFraction;
    slowedState.player.x = sandbagX;
    slowedState.player.y = sandbagY;
    clearState.player.x = clearSandbagX;
    clearState.player.y = clearSandbagY;
    updateGameState(slowedState, { ...IDLE_INPUT, movementX: 1 }, 0.1);
    updateGameState(clearState, { ...IDLE_INPUT, movementX: 1 }, 0.1);
    expect(slowedState.player.x - sandbagX).toBeCloseTo(
      (clearState.player.x - clearSandbagX) *
        MILITARY_OBJECT_CONFIG.sandbag.slowMultiplier,
      4,
    );

    const wireState = createMilitaryTestState();
    const inactiveWireState = createMilitaryTestState();
    const wire = findObject(wireState, 'razor-wire');
    const inactiveWire = findObject(inactiveWireState, 'razor-wire');
    inactiveWire.active = false;
    const wireX = wireState.arenaWidth * wire.xFraction;
    const wireY = wireState.arenaHeight * wire.yFraction;
    const inactiveWireX = inactiveWireState.arenaWidth * inactiveWire.xFraction;
    const inactiveWireY = inactiveWireState.arenaHeight * inactiveWire.yFraction;
    wireState.player.x = wireX;
    wireState.player.y = wireY;
    inactiveWireState.player.x = inactiveWireX;
    inactiveWireState.player.y = inactiveWireY;
    updateGameState(wireState, { ...IDLE_INPUT, movementX: 1 }, 0.1);
    updateGameState(inactiveWireState, { ...IDLE_INPUT, movementX: 1 }, 0.1);
    expect(wireState.player.x - wireX).toBeCloseTo(
      (inactiveWireState.player.x - inactiveWireX) *
        MILITARY_OBJECT_CONFIG.razorWire.slowMultiplier,
      4,
    );
  });

  it('grants ammo and direct-heal rewards exactly once when crates are destroyed', () => {
    const ammoState = createMilitaryTestState();
    const ammoCrate = findObject(ammoState, 'military-ammo-crate');
    shootObject(ammoState, ammoCrate);
    expect(ammoCrate.destroyed).toBe(true);
    expect(ammoCrate.rewardSpawned).toBe(true);
    expect(ammoState.items.filter((item) => item.type === 'rapidFire')).toHaveLength(1);
    shootObject(ammoState, ammoCrate);
    expect(ammoState.items.filter((item) => item.type === 'rapidFire')).toHaveLength(1);

    const supplyState = createMilitaryTestState();
    const supplyCrate = findObject(supplyState, 'military-supply-crate');
    supplyState.player.health -= GAME_PROGRESSION_CONFIG.healthOrbRestore + 5;
    shootObject(supplyState, supplyCrate);
    expect(supplyCrate.destroyed).toBe(true);
    expect(supplyState.player.health).toBe(supplyState.player.maxHealth - 5);
    expect(supplyCrate.rewardSpawned).toBe(true);

    supplyState.player.health -= 20;
    updateGameState(supplyState, IDLE_INPUT, 0.1);
    expect(supplyState.player.health).toBe(supplyState.player.maxHealth - 25);
  });

  it('lets fuel drums damage zombies but not the player and grants one damage orb', () => {
    const state = createMilitaryTestState();
    const drum = findObject(state, 'fuel-drum');
    const x = state.arenaWidth * drum.xFraction;
    const y = state.arenaHeight * drum.yFraction;
    state.player.x = x - 100;
    state.player.y = y;
    const playerHealth = state.player.health;
    const zombie = createZombie(10_001, 'walker', x + 80, y);
    zombie.movementSpeed = 0;
    state.zombies.push(zombie);

    shootObject(state, drum);
    expect(drum.phase).toBe('igniting');
    expect(state.items.filter((item) => item.type === 'damage')).toHaveLength(1);
    const zombieHealth = zombie.health;

    updateGameState(state, IDLE_INPUT, MILITARY_OBJECT_CONFIG.fuelDrum.ignitionDurationSeconds + 0.05);
    expect(drum.blastDamageApplied).toBe(true);
    expect(zombie.health).toBeLessThan(zombieHealth);
    expect(state.player.health).toBe(playerHealth);
  });

  it('automatically revives, fires, and clears zombie targets when a turret is destroyed', () => {
    const state = createMilitaryTestState();
    const turret = findObject(state, 'abandoned-turret');
    state.militaryObjects = [turret];
    const x = state.arenaWidth * turret.xFraction;
    const y = state.arenaHeight * turret.yFraction;
    state.player.x = x + 40;
    state.player.y = y;

    updateGameState(
      state,
      IDLE_INPUT,
      MILITARY_OBJECT_CONFIG.abandonedTurret.reviveDurationSeconds,
    );
    expect(turret.state).toBe('active');

    const zombie = createZombie(
      10_002,
      'walker',
      x + turret.width / 2 + 20,
      y,
    );
    zombie.x = x + turret.width / 2 + zombie.radius + 1;
    state.zombies.push(zombie);
    updateGameState(state, IDLE_INPUT, 0.2);
    expect(turret.state).toBe('firing');
    expect(
      state.projectiles.some((projectile) => projectile.owner === 'turret') ||
      zombie.health < zombie.maxHealth,
    ).toBe(true);

    zombie.targetMilitaryTurretId = turret.id;
    zombie.attackCooldownSeconds = 0;
    turret.health = 1;
    updateGameState(state, IDLE_INPUT, 0);
    expect(turret.state).toBe('destroyed');
    expect(zombie.targetMilitaryTurretId).toBeUndefined();
  });
});
