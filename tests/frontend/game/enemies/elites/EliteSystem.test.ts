import { describe, expect, it, vi } from 'vitest';
import {
  createGameState,
  createZombie,
  calculateDeterministicScore,
} from '@/game/core/GameState';
import { GAME_SCORING_CONFIG } from '@/game/core/GameConfig';
import { updateGameState } from '@/game/core/GameSimulation';
import { drawZombie } from '@/game/rendering/ZombieRenderer';
import {
  advanceWaveProgression,
  getWaveEnemyBudget,
} from '@/game/core/GameProgression';
import {
  awardRareReward,
} from '@/game/upgrades/ProgressionSystem';
import {
  absorbEliteShieldDamage,
  ELITE_CONFIG,
  getEliteModifier,
  isDesignatedEliteRewardWave,
  makeElite,
  shouldDropRareGoldOrb,
  shouldSpawnElite,
  updateElite,
} from '@/game/enemies/elites/EliteSystem';
import { ORB_SYSTEM_CONFIG } from '@/game/orbs/OrbSystem';

function createStationaryProjectile(
  id: number,
  x: number,
  y: number,
  damage: number,
) {
  return {
    id,
    x,
    y,
    directionX: 0,
    directionY: 0,
    radius: 4,
    damage,
    speed: 560,
    remainingSeconds: 1,
  };
}

function prepareEliteHit(
  elite: ReturnType<typeof createZombie>,
  damage: number,
) {
  const state = createGameState();
  state.wave.spawnCooldownSeconds = 10_000;
  state.player.fireCooldownSeconds = 10_000;
  state.player.x = 480;
  state.player.y = 270;
  state.zombies = [elite];
  state.projectiles = [
    createStationaryProjectile(100, elite.x, elite.y, damage),
  ];
  return state;
}

function createCanvasContext(): CanvasRenderingContext2D {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('elite enemies', () => {
  it('only spawns elites from eligible later-wave indices and selects modifiers deterministically', () => {
    const early = { wave: 17, spawnIndex: 60, enemyBudget: 61 };
    const designated = { wave: 20, spawnIndex: 60, enemyBudget: 61 };
    expect(shouldSpawnElite(early)).toBe(false);
    expect(shouldSpawnElite(designated)).toBe(true);
    expect(shouldSpawnElite(designated)).toBe(shouldSpawnElite(designated));
    expect(getEliteModifier(designated)).toBe(getEliteModifier(designated));
    expect(isDesignatedEliteRewardWave(20)).toBe(true);
    expect(isDesignatedEliteRewardWave(19)).toBe(false);
  });

  it('integrates designated elite encounters with scheduled wave spawns', () => {
    const state = createGameState();
    state.wave.currentWave = 20;
    state.wave.enemyBudget = getWaveEnemyBudget(20);
    state.wave.enemiesSpawned = state.wave.enemyBudget - 1;
    advanceWaveProgression(state, 0);

    expect(state.wave.enemiesSpawned).toBe(state.wave.enemyBudget);
    expect(state.zombies).toHaveLength(1);
    expect(state.zombies[0].isElite).toBe(true);
    expect(state.zombies[0].eliteRarePointEligible).toBe(true);
  });

  it('applies each single elite modifier with configured stats and effects', () => {
    const contexts = Array.from({ length: 19 }, (_, offset) => ({
      wave: 18,
      spawnIndex: 42 + offset,
      enemyBudget: 61,
    }));
    const contextsByModifier = new Map(
      contexts.map((context) => [getEliteModifier(context), context]),
    );

    for (const modifier of ['fast', 'shielded', 'regenerating', 'explosive'] as const) {
      expect(contextsByModifier.has(modifier)).toBe(true);
      const context = contextsByModifier.get(modifier)!;
      const zombie = createZombie(1, 'walker', 100, 100, context.wave);
      makeElite(zombie, context);
      expect(zombie.isElite).toBe(true);
      expect(zombie.eliteModifier).toBe(modifier);
      if (modifier === 'fast') {
        expect(zombie.movementSpeedMultiplier).toBe(
          ELITE_CONFIG.fastMovementMultiplier,
        );
      }
      if (modifier === 'shielded') {
        expect(zombie.eliteShieldHealth).toBe(
          zombie.maxHealth * ELITE_CONFIG.shieldHealthFraction,
        );
      }
    }

    expect(() => makeElite(createZombie(2, 'walker', 100, 100), {
      wave: 17,
      spawnIndex: 50,
      enemyBudget: 61,
    })).toThrow(RangeError);
  });

  it('absorbs shield damage before health and regenerates shield/health within caps', () => {
    const shielded = createZombie(1, 'walker', 100, 100);
    shielded.isElite = true;
    shielded.eliteModifier = 'shielded';
    shielded.eliteShieldHealth = 5;
    shielded.eliteMaxShieldHealth = 10;

    expect(absorbEliteShieldDamage(shielded, 8)).toEqual({
      absorbed: 5,
      healthDamage: 3,
    });
    expect(shielded.eliteShieldHealth).toBe(0);
    expect(updateElite(shielded, 1)).toBe(false);
    expect(shielded.eliteShieldHealth).toBeGreaterThan(0);
    expect(shielded.eliteShieldHealth).toBeLessThanOrEqual(10);

    const regenerating = createZombie(2, 'walker', 100, 100);
    regenerating.isElite = true;
    regenerating.eliteModifier = 'regenerating';
    regenerating.health = 20;
    expect(updateElite(regenerating, 1)).toBe(false);
    expect(regenerating.health).toBeGreaterThan(20);
    regenerating.health = regenerating.maxHealth;
    updateElite(regenerating, 1);
    expect(regenerating.health).toBe(regenerating.maxHealth);
  });

  it('applies elite bonus score and issues configured designated Rare Point rewards once', () => {
    const elite = createZombie(40, 'walker', 100, 100, 20);
    makeElite(elite, {
      wave: 20,
      spawnIndex: getWaveEnemyBudget(20) - 1,
      enemyBudget: getWaveEnemyBudget(20),
    });
    elite.eliteModifier = 'fast';
    elite.movementSpeedMultiplier = ELITE_CONFIG.fastMovementMultiplier;
    elite.health = 1;
    const state = prepareEliteHit(elite, 2);

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);

    expect(state.zombies).toHaveLength(0);
    expect(state.statistics.eliteKills).toBe(1);
    expect(state.statistics.rareCurrency?.earned).toBe(ELITE_CONFIG.rarePointReward);
    expect(awardRareReward(
      state.progression,
      'elite-rare-point:40',
      ELITE_CONFIG.rarePointReward,
    )).toBe(false);
    expect(calculateDeterministicScore(state.statistics)).toBe(
      GAME_SCORING_CONFIG.eliteKillBonus +
        GAME_SCORING_CONFIG.walkerKillPoints,
    );
  });

  it('telegraphs explosive elites, detonates after the fuse and damages nearby enemies', () => {
    const elite = createZombie(50, 'walker', 100, 100);
    elite.isElite = true;
    elite.eliteModifier = 'explosive';
    elite.health = 1;
    const state = prepareEliteHit(elite, 2);
    const nearby = createZombie(51, 'walker', 130, 100);
    nearby.attackCooldownSeconds = 10_000;
    state.zombies.push(nearby);

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(state.zombies).toContain(elite);
    expect(elite.health).toBe(1);
    expect(elite.eliteExplosionSeconds).toBe(ELITE_CONFIG.explosionFuseSeconds);
    expect(state.impacts.some((impact) =>
      impact.kind === 'telegraph' &&
      impact.radius === ELITE_CONFIG.explosionRadius,
    )).toBe(true);

    const healthBeforeBlast = nearby.health;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      ELITE_CONFIG.explosionFuseSeconds / 2,
    );
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      ELITE_CONFIG.explosionFuseSeconds / 2,
    );
    expect(state.zombies).not.toContain(elite);
    expect(nearby.health).toBeLessThan(healthBeforeBlast);
    expect(state.impacts.some((impact) =>
      impact.kind === 'bomb' && impact.color === '#d6b77f',
    )).toBe(true);
  });

  it('lets explosive elites damage the player through the existing shield system', () => {
    const elite = createZombie(60, 'walker', 100, 100);
    elite.isElite = true;
    elite.eliteModifier = 'explosive';
    elite.health = 1;
    const state = prepareEliteHit(elite, 2);
    state.player.x = 180;
    state.player.y = 100;
    state.activeEffects = [{
      type: 'shield',
      durationSeconds: 12,
      remainingSeconds: 12,
      remainingShield: 10,
    }];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      ELITE_CONFIG.explosionFuseSeconds,
    );

    expect(state.player.health).toBe(100 - (ELITE_CONFIG.explosionDamage - 10));
    expect(state.activeEffects[0].remainingShield).toBe(0);
    expect(state.statistics.totalDamageReceived).toBe(ELITE_CONFIG.explosionDamage);
  });

  it('drops rare gold orbs at a configurable deterministic rate', () => {
    let drops = 0;
    const sampleSize = 2_000;
    for (let id = 0; id < sampleSize; id += 1) {
      if (shouldDropRareGoldOrb(id)) drops += 1;
    }
    const rate = drops / sampleSize;
    expect(rate).toBeGreaterThan(ELITE_CONFIG.rareGoldOrbDropChance - 0.04);
    expect(rate).toBeLessThan(ELITE_CONFIG.rareGoldOrbDropChance + 0.04);
    expect(() => shouldDropRareGoldOrb(-1)).toThrow(RangeError);
  });

  it('awards Rare Points from rare gold orb collection exactly once', () => {
    const state = createGameState();
    state.wave.spawnCooldownSeconds = 10_000;
    state.player.fireCooldownSeconds = 10_000;
    state.items = [{
      id: 700,
      type: 'rareGold',
      x: state.player.x,
      y: state.player.y,
      radius: 16,
      durationSeconds: 12,
      remainingSeconds: 12,
    }];

    updateGameState(state, { movementX: 0, movementY: 0, aimAngle: 0 }, 0);
    expect(state.statistics.rareCurrency?.earned).toBe(
      ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
    );
    expect(state.statistics.orbsCollected).toBe(1);
    expect(state.items).toHaveLength(0);
    expect(awardRareReward(
      state.progression,
      'rare-gold-orb:700',
      ORB_SYSTEM_CONFIG.rareGoldRarePointReward,
    )).toBe(false);
  });

  it('renders elite gold details and modifier indicators', () => {
    const context = createCanvasContext();
    drawZombie(context, {
      x: 120,
      y: 120,
      type: 'walker',
      isElite: true,
      eliteModifier: 'shielded',
      shieldFraction: 0.5,
      healthFraction: 0.8,
    }, 1);

    expect(context.arc).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalled();
  });
});
