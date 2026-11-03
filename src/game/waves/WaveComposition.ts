import type { ZombieType } from '../core/GameState';
import {
  WAVE_MODIFIER_CONFIG,
  type WaveModifierId,
} from '../modifiers/WaveModifiers';

export type WaveTemplateId =
  | 'normal'
  | 'runnerRush'
  | 'heavyAssault'
  | 'swarm'
  | 'rangedAssault'
  | 'armouredFormation'
  | 'supportHunt'
  | 'contamination'
  | 'eliteHunt'
  | 'bossWave';

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

export const WAVE_ENEMY_INTRODUCTIONS: readonly {
  readonly type: ZombieType;
  readonly wave: number;
}[] = [
  { type: 'walker', wave: 1 },
  { type: 'runner', wave: 2 },
  { type: 'spitter', wave: 4 },
  { type: 'swarm', wave: 6 },
  { type: 'armoured', wave: 8 },
  { type: 'brute', wave: 11 },
  { type: 'screamer', wave: 13 },
  { type: 'bloater', wave: 15 },
  { type: 'splitter', wave: 17 },
];

const DEV_ENEMY_TYPE_ORDER = WAVE_ENEMY_INTRODUCTIONS.map(
  (introduction) => introduction.type,
);
export const DEV_ENEMY_GROUP_SIZE = 4;
export const DEV_STANDARD_ENEMY_BUDGET =
  WAVE_ENEMY_INTRODUCTIONS.length * DEV_ENEMY_GROUP_SIZE;
export const DEV_BOSS_GROUP_SIZE = 2;
export const DEV_BOSS_GROUP_COUNT = 3;
export const DEV_WAVE_ENEMY_BUDGET =
  DEV_STANDARD_ENEMY_BUDGET +
  DEV_BOSS_GROUP_SIZE * DEV_BOSS_GROUP_COUNT;
export const WAVE_ELITE_INTRODUCTION = 18;
export const BOSS_WAVE_MILESTONES: readonly number[] = [10, 20];
const WAVE_ONE_RUNNER_FIRST_SPAWN_INDEX = 40;
const WAVE_ONE_RUNNER_SPAWN_INTERVAL = 10;

export const WAVE_TEMPLATES: Readonly<Record<WaveTemplateId, WaveTemplate>> = {
  normal: {
    id: 'normal',
    weights: {},
  },
  runnerRush: {
    id: 'runnerRush',
    weights: { runner: 4, walker: 0.7, swarm: 1.5 },
  },
  heavyAssault: {
    id: 'heavyAssault',
    weights: { brute: 4, armoured: 3, walker: 0.7 },
  },
  swarm: {
    id: 'swarm',
    weights: { swarm: 4, runner: 2, walker: 0.7 },
  },
  rangedAssault: {
    id: 'rangedAssault',
    weights: { spitter: 4, runner: 1.5, walker: 0.7 },
  },
  armouredFormation: {
    id: 'armouredFormation',
    weights: { armoured: 4, brute: 2, walker: 0.7 },
  },
  supportHunt: {
    id: 'supportHunt',
    weights: { screamer: 4, spitter: 1.5, walker: 0.7 },
  },
  contamination: {
    id: 'contamination',
    weights: { bloater: 3, splitter: 3, swarm: 1.5, walker: 0.7 },
  },
  eliteHunt: {
    id: 'eliteHunt',
    weights: { brute: 2, armoured: 2, screamer: 1.5 },
  },
  bossWave: {
    id: 'bossWave',
    weights: { brute: 2, spitter: 1.5, armoured: 1.5 },
  },
};

const REGULAR_TEMPLATE_CYCLE: readonly WaveTemplateId[] = [
  'runnerRush',
  'normal',
  'heavyAssault',
  'swarm',
  'rangedAssault',
  'armouredFormation',
  'supportHunt',
  'contamination',
  'eliteHunt',
];

const BASE_ENEMY_WEIGHTS: Readonly<Record<ZombieType, number>> = {
  walker: 8,
  runner: 2,
  brute: 2,
  spitter: 2,
  swarm: 3,
  armoured: 2,
  screamer: 1,
  bloater: 1,
  splitter: 2,
};

const SPAWN_TYPE_ORDER: readonly ZombieType[] = [
  'walker',
  'runner',
  'brute',
  'spitter',
  'swarm',
  'armoured',
  'screamer',
  'bloater',
  'splitter',
];

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
  return REGULAR_TEMPLATE_CYCLE[(wave - 2) % REGULAR_TEMPLATE_CYCLE.length];
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
    spawnIndex >= Math.floor(enemyBudget * 0.7);
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
  const weightedTypes = SPAWN_TYPE_ORDER
    .filter((type) => eligibleTypes.has(type))
    .map((type) => ({
      type,
      weight: BASE_ENEMY_WEIGHTS[type] *
        (template.weights[type] ?? 1) *
        (modifierWeights?.[type] ?? 1) *
        (isLateWaveSpawn && type !== 'walker' ? 1.2 : 1),
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
