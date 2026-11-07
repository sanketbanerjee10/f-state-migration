import { describe, expect, it } from 'vitest';
import { createGameState, createZombie } from '@/game/core/GameState';
import { updateGameState } from '@/game/core/GameSimulation';

function suppressAutomaticActions(
  state: ReturnType<typeof createGameState>,
): void {
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
  state.arenaObstacles = [];
  state.barrels = [];
  state.militaryObjects = [];
  state.contaminatedObjects = [];
}

function makeProjectile(
  id: number,
  x: number,
  damage = 25,
  remainingPierces = 0,
) {
  return {
    id,
    x,
    y: 270,
    directionX: 1,
    directionY: 0,
    radius: 4,
    damage,
    speed: 560,
    remainingSeconds: 1,
    owner: 'player' as const,
    kind: 'standard' as const,
    remainingPierces,
    hitZombieIds: [],
  };
}

describe('Rare Upgrade combat effects', () => {
  it('initializes rare currency from a level-start grant', () => {
    const state = createGameState(
      undefined,
      undefined,
      'level',
      11,
      0,
      true,
      undefined,
      1,
    );

    expect(state.statistics.rareCurrency).toEqual({
      earned: 1,
      available: 1,
      spent: 0,
    });
  });

  it('applies critical chance and multiplier to player projectiles', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.criticalMastery = 8;
    state.nextEntityId = 4;
    state.player.fireCooldownSeconds = 0;

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.projectiles[0]).toMatchObject({
      kind: 'critical',
      damage: 50,
    });
  });

  it('limits Lifesteal to direct weapon damage and maximum health', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.lifesteal = 8;
    state.player.x = 100;
    state.player.y = 270;
    state.player.health = 50;
    const zombie = createZombie(9, 'walker', 220, 270);
    zombie.health = 100;
    zombie.maxHealth = 100;
    state.zombies = [zombie];
    state.projectiles = [makeProjectile(1, 100)];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );

    expect(zombie.health).toBe(75);
    expect(state.player.health).toBeCloseTo(51.25);

    state.player.health = 99.9;
    state.projectiles = [makeProjectile(2, 100)];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.2,
    );
    expect(state.player.health).toBe(100);
  });

  it('adds non-recursive splash damage for Explosive Rounds impacts', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.explosiveRounds = 8;
    state.player.x = 100;
    state.player.y = 270;
    const directHit = createZombie(9, 'walker', 200, 270);
    const splashTarget = createZombie(10, 'walker', 220, 270);
    directHit.health = 100;
    directHit.maxHealth = 100;
    splashTarget.health = 100;
    splashTarget.maxHealth = 100;
    state.zombies = [directHit, splashTarget];
    state.nextEntityId = 1;
    state.player.fireCooldownSeconds = 0;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.15,
    );

    expect(directHit.health).toBe(75);
    expect(splashTarget.health).toBe(87.5);
    expect(state.impacts.some((impact) => impact.kind === 'bomb')).toBe(true);
  });

  it('pierces additional enemies without hitting the same target twice', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.piercingRounds = 1;
    const first = createZombie(20, 'walker', 180, 270);
    const second = createZombie(21, 'walker', 260, 270);
    first.health = 100;
    first.maxHealth = 100;
    second.health = 100;
    second.maxHealth = 100;
    state.zombies = [first, second];
    state.projectiles = [makeProjectile(1, 100, 25, 1)];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.35,
    );
    expect(first.health).toBe(75);
    expect(second.health).toBe(75);
    expect(state.projectiles).toHaveLength(0);
  });

  it('activates Emergency Shield below its threshold and respects cooldown', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.emergencyShield = 1;
    state.player.health = 35;
    const zombie = createZombie(30, 'walker', state.player.x + 10, state.player.y);
    state.zombies = [zombie];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.player.health).toBe(25);
    expect(state.progression.emergencyShieldCooldownSeconds).toBe(0);
    expect(state.activeEffects.find((effect) => effect.type === 'shield')).toBeUndefined();

    zombie.attackCooldownSeconds = 0;
    state.player.damageCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.player.health).toBe(15);
    expect(state.progression.emergencyShieldCooldownSeconds).toBe(60);
    expect(state.activeEffects.find((effect) => effect.type === 'shield')).toMatchObject({
      remainingSeconds: 1,
      remainingShield: 60,
    });

    zombie.attackCooldownSeconds = 0;
    state.player.damageCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.health).toBe(15);
    expect(state.activeEffects.find((effect) => effect.type === 'shield')?.remainingShield).toBe(50);
  });

  it('uses Second Wind once per run and does not rescue a later fatal hit', () => {
    const state = createGameState();
    suppressAutomaticActions(state);
    state.progression.rareUpgradeLevels.secondWind = 1;
    state.player.health = 5;
    const zombie = createZombie(40, 'walker', state.player.x + 10, state.player.y);
    state.zombies = [zombie];

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );

    expect(state.player.alive).toBe(true);
    expect(state.player.health).toBe(10);
    expect(state.progression.secondWindUsed).toBe(true);

    state.player.health = 1;
    state.player.damageCooldownSeconds = 0;
    zombie.attackCooldownSeconds = 0;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.alive).toBe(false);
    expect(state.wave.phase).toBe('gameOver');
  });
});
