import type {
  ZombieEliteModifier,
  ZombieEntity,
} from '../../core/GameState';
import type { WaveSpawnContext } from '../../waves/WaveComposition';
import {
  isEliteEligibleSpawn,
  WAVE_ELITE_INTRODUCTION,
} from '../../waves/WaveComposition';
import {
  ELITE_CONFIG,
  ELITE_MODIFIERS,
  WAVE_MODIFIER_CONFIG,
} from '../../core/GameConfig';

export { ELITE_CONFIG } from '../../core/GameConfig';

export interface EliteSpawnContext extends WaveSpawnContext {}

function getSpawnRoll(context: EliteSpawnContext): number {
  let seed =
    Math.imul(context.wave, 1_103_515_245) +
    Math.imul(context.spawnIndex + 1, 12_345);
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x45d9f3b);
  seed ^= seed >>> 16;
  return seed >>> 0;
}

function isValidEliteContext(context: EliteSpawnContext): boolean {
  return Number.isInteger(context.wave) &&
    context.wave >= 1 &&
    Number.isInteger(context.spawnIndex) &&
    context.spawnIndex >= 0 &&
    Number.isInteger(context.enemyBudget) &&
    context.enemyBudget > 0 &&
    context.spawnIndex < context.enemyBudget;
}

export function isDesignatedEliteRewardWave(wave: number): boolean {
  return ELITE_CONFIG.rarePointRewardWaves.includes(wave);
}

export function shouldSpawnElite(context: EliteSpawnContext): boolean {
  if (!isValidEliteContext(context)) {
    throw new RangeError('Elite spawn context must contain a valid wave budget and index.');
  }
  if (!isEliteEligibleSpawn(context)) return false;
  if (
    isDesignatedEliteRewardWave(context.wave) &&
    context.spawnIndex === context.enemyBudget - 1
  ) {
    return true;
  }
  const chanceMultiplier = context.activeModifier
    ? WAVE_MODIFIER_CONFIG.definitions[context.activeModifier]
      .eliteChanceMultiplier ?? 1
    : 1;
  const spawnChance = Math.min(
    ELITE_CONFIG.maximumSpawnChance,
    ELITE_CONFIG.spawnChance * chanceMultiplier,
  );
  return getSpawnRoll(context) % 10_000 < spawnChance * 10_000;
}

export function getEliteModifier(context: EliteSpawnContext): Exclude<ZombieEliteModifier, 'none'> {
  if (!isValidEliteContext(context)) {
    throw new RangeError('Elite spawn context must contain a valid wave budget and index.');
  }
  return ELITE_MODIFIERS[getSpawnRoll(context) % ELITE_MODIFIERS.length];
}

export function makeElite(
  zombie: ZombieEntity,
  context: EliteSpawnContext,
): ZombieEntity {
  if (!isValidEliteContext(context) || context.wave < WAVE_ELITE_INTRODUCTION) {
    throw new RangeError('Elite enemies can only be created from a valid eligible wave.');
  }

  const modifier = getEliteModifier(context);
  zombie.isElite = true;
  zombie.eliteModifier = modifier;
  zombie.eliteRarePointEligible =
    context.spawnIndex === context.enemyBudget - 1 &&
    isDesignatedEliteRewardWave(context.wave);

  if (modifier === 'fast') {
    zombie.movementSpeedMultiplier = ELITE_CONFIG.fastMovementMultiplier;
  } else if (modifier === 'shielded') {
    zombie.eliteShieldHealth =
      zombie.maxHealth * ELITE_CONFIG.shieldHealthFraction;
    zombie.eliteMaxShieldHealth = zombie.eliteShieldHealth;
  }

  return zombie;
}

export function absorbEliteShieldDamage(
  zombie: ZombieEntity,
  incomingDamage: number,
): { readonly absorbed: number; readonly healthDamage: number } {
  if (
    zombie.eliteModifier !== 'shielded' ||
    (zombie.eliteShieldHealth ?? 0) <= 0 ||
    incomingDamage <= 0
  ) {
    return { absorbed: 0, healthDamage: incomingDamage };
  }

  const absorbed = Math.min(zombie.eliteShieldHealth ?? 0, incomingDamage);
  zombie.eliteShieldHealth = Math.max(
    0,
    (zombie.eliteShieldHealth ?? 0) - absorbed,
  );
  return {
    absorbed,
    healthDamage: incomingDamage - absorbed,
  };
}

export function updateElite(
  zombie: ZombieEntity,
  deltaSeconds: number,
): boolean {
  if (!zombie.isElite) return false;

  if (zombie.eliteExplosionSeconds !== undefined) {
    zombie.eliteExplosionSeconds = Math.max(
      0,
      zombie.eliteExplosionSeconds - deltaSeconds,
    );
    return zombie.eliteExplosionSeconds === 0;
  }

  if (zombie.eliteModifier === 'shielded') {
    const maxShield = zombie.eliteMaxShieldHealth ?? 0;
    zombie.eliteShieldHealth = Math.min(
      maxShield,
      (zombie.eliteShieldHealth ?? 0) +
        maxShield * ELITE_CONFIG.regenerationFractionPerSecond * deltaSeconds,
    );
  }
  if (zombie.eliteModifier === 'regenerating') {
    zombie.health = Math.min(
      zombie.maxHealth,
      zombie.health +
        zombie.maxHealth *
          ELITE_CONFIG.regenerationFractionPerSecond *
          deltaSeconds,
    );
  }
  return false;
}

export function shouldDropRareGoldOrb(enemyId: number): boolean {
  if (!Number.isInteger(enemyId) || enemyId < 0) {
    throw new RangeError('Elite entity ID must be a non-negative integer.');
  }
  let seed = Math.imul(enemyId + 1, 0x45d9f3b);
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x45d9f3b);
  seed ^= seed >>> 16;
  return (seed >>> 0) % 10_000 <
    ELITE_CONFIG.rareGoldOrbDropChance * 10_000;
}
