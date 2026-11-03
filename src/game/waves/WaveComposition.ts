import type { ZombieType } from '../core/GameState';
import type { WaveModifierId } from '../modifiers/WaveModifiers';
import {
  BOSS_WAVE_MILESTONES,
  DEV_BOSS_GROUP_COUNT,
  DEV_BOSS_GROUP_SIZE,
  DEV_ENEMY_GROUP_SIZE,
  DEV_STANDARD_ENEMY_BUDGET,
  DEV_WAVE_ENEMY_BUDGET,
  WAVE_COMPOSITION_CONFIG,
  WAVE_ENEMY_INTRODUCTIONS,
  WAVE_ENEMY_WEIGHT_CONFIG,
  WAVE_MODIFIER_CONFIG,
  WAVE_TEMPLATES,
  WAVE_TEMPLATE_CYCLE,
} from '../core/GameConfig';

export {
  BOSS_WAVE_MILESTONES,
  DEV_BOSS_GROUP_COUNT,
  DEV_BOSS_GROUP_SIZE,
  DEV_ENEMY_GROUP_SIZE,
  DEV_STANDARD_ENEMY_BUDGET,
  DEV_WAVE_ENEMY_BUDGET,
  WAVE_ENEMY_INTRODUCTIONS,
  WAVE_TEMPLATES,
} from '../core/GameConfig';

export type WaveTemplateId = keyof typeof WAVE_TEMPLATES;

export interface WaveTemplate {
  readonly id: WaveTemplateId;
  readonly weights: Partial<Record<ZombieType, number>>;
}

export interface WaveSpawnContext {
  readonly wave: number;
  readonly spawnIndex: number;
  readonly enemyBudget: number;
  readonly activeModifier?: WaveModifierId | null;
  readonly devMode?: boolean;
}

const DEV_ENEMY_TYPE_ORDER = WAVE_ENEMY_INTRODUCTIONS.map(
  (introduction) => introduction.type,
);
export const WAVE_ELITE_INTRODUCTION =
  WAVE_COMPOSITION_CONFIG.eliteIntroductionWave;
const WAVE_ONE_RUNNER_FIRST_SPAWN_INDEX =
  WAVE_COMPOSITION_CONFIG.waveOneRunnerFirstSpawnIndex;
const WAVE_ONE_RUNNER_SPAWN_INTERVAL =
  WAVE_COMPOSITION_CONFIG.waveOneRunnerSpawnInterval;

export function getEligibleEnemyTypes(wave: number): ZombieType[] {
  if (!Number.isInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }

  return WAVE_ENEMY_INTRODUCTIONS
    .filter((introduction) => wave >= introduction.wave)
    .map((introduction) => introduction.type);
}

export function getWaveTemplateId(wave: number): WaveTemplateId {
  if (!Number.isInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  if (BOSS_WAVE_MILESTONES.includes(wave)) return 'bossWave';
  if (wave === 1) return 'normal';
  return WAVE_TEMPLATE_CYCLE[(wave - 2) % WAVE_TEMPLATE_CYCLE.length];
}

export function isRunnerSpawn(wave: number, spawnIndex: number): boolean {
  if (
    !Number.isInteger(wave) ||
    wave < 1 ||
    !Number.isInteger(spawnIndex) ||
    spawnIndex < 0
  ) {
    throw new RangeError('Wave and spawn index must be non-negative integers.');
  }

  if (wave === 1) {
    return spawnIndex >= WAVE_ONE_RUNNER_FIRST_SPAWN_INDEX &&
      (spawnIndex - WAVE_ONE_RUNNER_FIRST_SPAWN_INDEX) %
        WAVE_ONE_RUNNER_SPAWN_INTERVAL === 0;
  }

  return (spawnIndex + wave) % 3 === 0;
}

export function isEliteEligibleSpawn(context: WaveSpawnContext): boolean {
  const { wave, spawnIndex, enemyBudget } = context;
  if (
    !Number.isInteger(wave) ||
    wave < 1 ||
    !Number.isInteger(spawnIndex) ||
    spawnIndex < 0 ||
    !Number.isInteger(enemyBudget) ||
    enemyBudget < 1 ||
    spawnIndex >= enemyBudget
  ) {
    throw new RangeError('Spawn context must contain a valid wave budget and index.');
  }

  return wave >= WAVE_ELITE_INTRODUCTION &&
    spawnIndex >= Math.floor(
      enemyBudget * WAVE_ENEMY_WEIGHT_CONFIG.eliteSpawnBudgetFraction,
    );
}

function getDeterministicRoll(wave: number, spawnIndex: number): number {
  let seed = Math.imul(wave, 1_103_515_245) + Math.imul(spawnIndex + 1, 12_345);
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x45d9f3b);
  seed ^= seed >>> 16;
  return seed >>> 0;
}

export function getEnemyTypeForSpawn(context: WaveSpawnContext): ZombieType {
  const { wave, spawnIndex, enemyBudget } = context;
  if (
    !Number.isInteger(wave) ||
    wave < 1 ||
    !Number.isInteger(spawnIndex) ||
    spawnIndex < 0 ||
    !Number.isInteger(enemyBudget) ||
    enemyBudget < 1 ||
    spawnIndex >= enemyBudget
  ) {
    throw new RangeError('Spawn context must contain a valid wave budget and index.');
  }

  if (context.devMode) {
    return DEV_ENEMY_TYPE_ORDER[
      Math.floor(spawnIndex / DEV_ENEMY_GROUP_SIZE) % DEV_ENEMY_TYPE_ORDER.length
    ];
  }

  if (isRunnerSpawn(wave, spawnIndex)) return 'runner';
  if (wave === 1) return 'walker';

  const eligibleTypes = new Set(getEligibleEnemyTypes(wave));
  const template = WAVE_TEMPLATES[getWaveTemplateId(wave)];
  const modifierWeights = context.activeModifier
    ? WAVE_MODIFIER_CONFIG.definitions[context.activeModifier]
      .enemyWeightMultipliers
    : undefined;
  const isLateWaveSpawn = isEliteEligibleSpawn(context);
  const weightedTypes = WAVE_ENEMY_WEIGHT_CONFIG.spawnOrder
    .filter((type) => eligibleTypes.has(type))
    .map((type) => ({
      type,
      weight: WAVE_ENEMY_WEIGHT_CONFIG.baseWeights[type] *
        (template.weights[type] ?? 1) *
        (modifierWeights?.[type] ?? 1) *
        (isLateWaveSpawn && type !== 'walker'
          ? WAVE_ENEMY_WEIGHT_CONFIG.lateWaveEliteWeightMultiplier
          : 1),
    }))
    .filter((entry) => entry.weight > 0);
  const totalWeight = weightedTypes.reduce(
    (total, entry) => total + entry.weight,
    0,
  );
  let roll = getDeterministicRoll(wave, spawnIndex) % totalWeight;

  for (const entry of weightedTypes) {
    roll -= entry.weight;
    if (roll < 0) return entry.type;
  }

  return 'walker';
}
