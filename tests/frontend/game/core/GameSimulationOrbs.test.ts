import { describe, expect, it } from 'vitest';
import {
  createGameState,
  createZombie,
} from '@/game/core/GameState';
import {
  placeSupportTurret,
  updateGameState,
} from '@/game/core/GameSimulation';
import { shouldDropRareGoldOrb } from '@/game/enemies/elites/EliteSystem';

function suppressWaveSpawns(state: ReturnType<typeof createGameState>): void {
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
}

function makeOrb(
  state: ReturnType<typeof createGameState>,
  id: number,
  type: 'health' | 'magnet' | 'turret' | 'cursed' | 'rareGold',
  x = state.player.x,
  y = state.player.y,
) {
  return {
    id,
    type,
    x,
    y,
    radius: 16,
    durationSeconds: 12,
    remainingSeconds: 12,
  };
}

describe('orb simulation', () => {
  it('stores turret pickups for placement, grants Rare Gold currency, and expires effects', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.items = [
      makeOrb(state, 20, 'magnet'),
      makeOrb(state, 21, 'turret'),
      makeOrb(state, 22, 'cursed'),
      makeOrb(state, 23, 'rareGold'),
    ];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.activeEffects.map((effect) => effect.type).sort()).toEqual([
      'cursed',
      'magnet',
    ]);
    expect(state.turrets).toBe(1);
    expect(state.supportTurrets).toHaveLength(0);
    expect(state.statistics.rareCurrency?.earned).toBe(1);
    expect(state.statistics.orbsCollected).toBe(4);
    expect(state.items).toHaveLength(0);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      10.1,
    );
    expect(state.activeEffects).toHaveLength(0);
    expect(state.turrets).toBe(1);
    expect(state.supportTurrets).toHaveLength(0);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      2,
    );
    expect(state.activeEffects).toHaveLength(0);
    expect(state.supportTurrets).toHaveLength(0);
  });

  it('places up to five turrets and preserves inventory when a spot is obstructed', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.militaryObjects = [];
    state.turrets = 5;

    expect(placeSupportTurret(state, state.player.x, state.player.y)).toBe(false);
    expect(state.turrets).toBe(5);

    const obstacle = state.arenaObstacles[0];
    const obstacleX = state.arenaWidth * obstacle.xFraction;
    const obstacleY = state.arenaHeight * obstacle.yFraction;
    expect(placeSupportTurret(state, obstacleX, obstacleY)).toBe(false);
    expect(state.turrets).toBe(5);

    const occupiedPosition = {
      x: 60,
      y: state.arenaHeight - 60,
    };
    state.zombies = [
      createZombie(90, 'walker', occupiedPosition.x, occupiedPosition.y),
    ];
    expect(placeSupportTurret(
      state,
      occupiedPosition.x,
      occupiedPosition.y,
    )).toBe(false);
    expect(state.turrets).toBe(5);
    state.zombies = [];

    for (let count = 0; count < 5; count += 1) {
      expect(placeSupportTurret(
        state,
        60 + count * 90,
        state.arenaHeight - 60,
      )).toBe(true);
    }
    expect(state.turrets).toBe(0);
    expect(state.supportTurrets).toHaveLength(5);
    state.turrets = 1;
    expect(placeSupportTurret(state, 60, 60)).toBe(false);
    expect(state.turrets).toBe(1);
  });

  it('caps turret pickup inventory at five and leaves overflow pickups available', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.turrets = 5;
    state.items = [makeOrb(state, 35, 'turret')];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.turrets).toBe(5);
    expect(state.items).toHaveLength(1);
    expect(state.statistics.orbsCollected).toBe(0);
  });

  it('attracts collectible orbs only within permanent magnetism range', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.progression.rareUpgradeLevels.orbMagnetism = 1;
    state.items = [
      makeOrb(state, 30, 'health', state.player.x, state.player.y + 100),
      makeOrb(state, 31, 'health', state.player.x, state.player.y + 130),
    ];
    const outOfRangeY = state.items[1].y;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.01,
    );

    expect(state.items[0].y).toBeLessThan(state.player.y + 100);
    expect(state.items[1].y).toBe(outOfRangeY);
    expect(state.statistics.orbsCollected).toBe(0);
  });

  it('fires visible turret projectiles at unobstructed targets without changing player aim', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.items = [makeOrb(state, 40, 'turret')];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.turrets).toBe(1);
    expect(placeSupportTurret(
      state,
      state.player.x + 32,
      state.player.y,
    )).toBe(true);
    const zombie = createZombie(41, 'walker', state.player.x + 90, state.player.y);
    state.zombies = [zombie];
    state.player.aimAngle = Math.PI / 2;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI / 2 },
      0,
    );

    expect(zombie.health).toBe(50);
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0]).toMatchObject({
      owner: 'turret',
      kind: 'turret',
      damage: 12,
    });
    expect(state.supportTurrets[0].aimAngle).toBeCloseTo(0);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: Math.PI / 2 },
      0.1,
    );

    expect(zombie.health).toBe(38);
    expect(state.projectiles).toHaveLength(0);
    expect(state.player.aimAngle).toBe(Math.PI / 2);
  });

  it('applies the cursed damage multiplier to newly fired projectiles', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.items = [makeOrb(state, 50, 'cursed')];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    state.player.fireCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.projectiles[0].damage).toBe(37.5);
  });

  it('increases enemy movement speed while the cursed effect is active', () => {
    const normalState = createGameState();
    const cursedState = createGameState();
    suppressWaveSpawns(normalState);
    suppressWaveSpawns(cursedState);
    normalState.arenaObstacles = [];
    cursedState.arenaObstacles = [];
    normalState.barrels = [];
    cursedState.barrels = [];
    normalState.militaryObjects = [];
    cursedState.militaryObjects = [];
    normalState.zombies = [createZombie(70, 'walker', 480, 100)];
    cursedState.zombies = [createZombie(70, 'walker', 480, 100)];
    cursedState.activeEffects = [{
      type: 'cursed',
      durationSeconds: 10,
      remainingSeconds: 10,
    }];

    updateGameState(
      normalState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    updateGameState(
      cursedState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );

    const normalDistance = Math.hypot(
      normalState.zombies[0].x - 480,
      normalState.zombies[0].y - 100,
    );
    const cursedDistance = Math.hypot(
      cursedState.zombies[0].x - 480,
      cursedState.zombies[0].y - 100,
    );
    expect(cursedDistance).toBeGreaterThan(normalDistance);
  });

  it('increases enemy movement speed during Fast Wave', () => {
    const normalState = createGameState();
    const fastWaveState = createGameState();
    suppressWaveSpawns(normalState);
    suppressWaveSpawns(fastWaveState);
    normalState.arenaObstacles = [];
    fastWaveState.arenaObstacles = [];
    normalState.barrels = [];
    fastWaveState.barrels = [];
    normalState.militaryObjects = [];
    fastWaveState.militaryObjects = [];
    normalState.zombies = [createZombie(71, 'walker', 480, 100)];
    fastWaveState.zombies = [createZombie(71, 'walker', 480, 100)];
    fastWaveState.wave.activeModifier = 'fastWave';

    updateGameState(
      normalState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );
    updateGameState(
      fastWaveState,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.1,
    );

    const normalDistance = Math.hypot(
      normalState.zombies[0].x - 480,
      normalState.zombies[0].y - 100,
    );
    const fastWaveDistance = Math.hypot(
      fastWaveState.zombies[0].x - 480,
      fastWaveState.zombies[0].y - 100,
    );
    expect(fastWaveDistance).toBeGreaterThan(normalDistance);
  });

  it('doubles standard orb drops without increasing currency rewards', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.arenaObstacles = [];
    state.barrels = [];
    state.militaryObjects = [];
    state.contaminatedObjects = [];
    state.wave.activeModifier = 'doubleOrbs';
    state.zombies = [
      createZombie(80, 'walker', 120, 120),
      createZombie(81, 'walker', 820, 420),
    ];
    for (const zombie of state.zombies) {
      zombie.health = 1;
      state.projectiles.push({
        id: zombie.id + 100,
        x: zombie.x,
        y: zombie.y,
        directionX: 0,
        directionY: 0,
        radius: 4,
        damage: 2,
        speed: 560,
        remainingSeconds: 1,
      });
    }

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.statistics.zombiesKilled).toBe(2);
    expect(state.items).toHaveLength(2);
    expect(state.progression.standard.earned).toBe(0);
    expect(state.progression.rare.earned).toBe(0);
  });

  it('increases bloater hazard size and damage during Contamination', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    state.wave.activeModifier = 'contamination';
    const bloater = createZombie(90, 'bloater', 120, 120);
    bloater.health = 1;
    state.zombies = [bloater];
    state.projectiles = [{
      id: 190,
      x: bloater.x,
      y: bloater.y,
      directionX: 0,
      directionY: 0,
      radius: 4,
      damage: 2,
      speed: 560,
      remainingSeconds: 1,
    }];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.hazards[0].radius).toBeCloseTo((bloater.radius + 18) * 1.2);
    expect(state.hazards[0].damage).toBeGreaterThan(
      Math.ceil(bloater.contactDamage * 0.5),
    );
  });

  it('drops elite Rare Gold Orbs with special rarity metadata', () => {
    const state = createGameState();
    suppressWaveSpawns(state);
    let eliteId = 0;
    while (!shouldDropRareGoldOrb(eliteId)) eliteId += 1;

    const elite = createZombie(eliteId, 'walker', 100, 100);
    elite.isElite = true;
    elite.eliteModifier = 'fast';
    elite.health = 1;
    state.zombies = [elite];
    state.projectiles = [{
      id: 60_000,
      x: elite.x,
      y: elite.y,
      directionX: 0,
      directionY: 0,
      radius: 4,
      damage: 2,
      speed: 560,
      remainingSeconds: 1,
    }];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.items).toHaveLength(1);
    expect(state.items[0]).toMatchObject({
      type: 'rareGold',
      rarity: 'special',
    });
  });
});
