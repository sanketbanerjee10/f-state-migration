export type WaveModifierId =
  | 'doubleOrbs'
  | 'fastWave'
  | 'armouredInvasion'
  | 'eliteThreat'
  | 'contamination'
  | 'reducedVisibility'
  | 'overrun'
  | 'heavyResistance';

export interface WaveModifierDefinition {
  readonly name: string;
  readonly description: string;
  readonly minimumWave: number;
  readonly selectionWeight: number;
  readonly orbDropIntervalMultiplier?: number;
  readonly enemySpeedMultiplier?: number;
  readonly enemyWeightMultipliers?: Readonly<Record<string, number>>;
  readonly eliteChanceMultiplier?: number;
  readonly spawnIntervalMultiplier?: number;
  readonly minimumSpawnIntervalSeconds?: number;
  readonly visibilityRadiusMultiplier?: number;
  readonly hazardRadiusMultiplier?: number;
  readonly hazardDamageMultiplier?: number;
}

export const WAVE_MODIFIER_IDS: readonly WaveModifierId[] = [
  'doubleOrbs',
  'fastWave',
  'armouredInvasion',
  'eliteThreat',
  'contamination',
  'reducedVisibility',
  'overrun',
  'heavyResistance',
];

const WAVE_MODIFIER_DEFINITIONS: Readonly<
  Record<WaveModifierId, WaveModifierDefinition>
> = {
  doubleOrbs: {
    name: 'Double Orbs',
    description: 'Orbs drop twice as often.',
    minimumWave: 1,
    selectionWeight: 1,
    orbDropIntervalMultiplier: 0.5,
  },
  fastWave: {
    name: 'Fast Wave',
    description: 'Enemies move 20% faster.',
    minimumWave: 1,
    selectionWeight: 1,
    enemySpeedMultiplier: 1.2,
  },
  armouredInvasion: {
    name: 'Armoured Invasion',
    description: 'Armoured enemies are more common.',
    minimumWave: 8,
    selectionWeight: 1,
    enemyWeightMultipliers: { armoured: 3 },
  },
  eliteThreat: {
    name: 'Elite Threat',
    description: 'Elite enemies are more likely to appear.',
    minimumWave: 18,
    selectionWeight: 1,
    eliteChanceMultiplier: 2,
  },
  contamination: {
    name: 'Contamination',
    description: 'Bloaters and their hazards are more dangerous.',
    minimumWave: 15,
    selectionWeight: 1,
    enemyWeightMultipliers: { bloater: 3, splitter: 1.5 },
    hazardRadiusMultiplier: 1.2,
    hazardDamageMultiplier: 1.2,
  },
  reducedVisibility: {
    name: 'Reduced Visibility',
    description: 'Darkness limits how far you can see.',
    minimumWave: 1,
    selectionWeight: 1,
    visibilityRadiusMultiplier: 0.68,
  },
  overrun: {
    name: 'Overrun',
    description: 'Enemies arrive more quickly.',
    minimumWave: 1,
    selectionWeight: 1,
    spawnIntervalMultiplier: 0.75,
    minimumSpawnIntervalSeconds: 0.35,
  },
  heavyResistance: {
    name: 'Heavy Resistance',
    description: 'Brutes are more common.',
    minimumWave: 11,
    selectionWeight: 1,
    enemyWeightMultipliers: { brute: 3 },
  },
};

export const WAVE_MODIFIER_CONFIG = {
  appearanceChance: 0.6,
  definitions: WAVE_MODIFIER_DEFINITIONS,
} as const;

function getWaveRoll(wave: number, salt: number): number {
  let seed = Math.imul(wave ^ salt, 1_103_515_245) + 12_345;
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x45d9f3b);
  seed ^= seed >>> 16;
  return seed >>> 0;
}

export function getWaveModifierForWave(wave: number): WaveModifierId | null {
  if (!Number.isSafeInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive safe integer.');
  }

  const choices = WAVE_MODIFIER_IDS.filter((id) =>
    wave >= WAVE_MODIFIER_CONFIG.definitions[id].minimumWave,
  );
  const chanceRoll = getWaveRoll(wave, 0x5f3759df) % 10_000;
  if (
    choices.length === 0 ||
    chanceRoll >= WAVE_MODIFIER_CONFIG.appearanceChance * 10_000
  ) {
    return null;
  }

  const totalWeight = choices.reduce(
    (total, id) =>
      total + WAVE_MODIFIER_CONFIG.definitions[id].selectionWeight,
    0,
  );
  let selectionRoll = getWaveRoll(wave, 0x6a09e667) % totalWeight;
  for (const id of choices) {
    selectionRoll -= WAVE_MODIFIER_CONFIG.definitions[id].selectionWeight;
    if (selectionRoll < 0) return id;
  }

  return null;
}
