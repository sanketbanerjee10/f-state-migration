export type HornStyle = 'none' | 'short' | 'curved' | 'spiked';
export type EyeStyle = 'normal' | 'glowing' | 'angry';
export type MouthStyle = 'closed' | 'open' | 'fangs';
export type EnemyType =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'spitter'
  | 'swarm'
  | 'armoured'
  | 'screamer'
  | 'bloater'
  | 'splitter';

export const ENEMY_TYPES: readonly EnemyType[] = [
  'walker',
  'runner',
  'brute',
  'spitter',
  'swarm',
  'armoured',
  'screamer',
  'bloater',
  'splitter',
] as const;

export interface EnemyAppearance {
  bodyColor: string;
  outlineColor: string;
  limbColor: string;
  headScale: number;
  torsoScale: number;
  hornStyle: HornStyle;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  armorLevel: number;
  mutationLevel: number;
  clawStyle: string;
}

export const DEFAULT_ENEMY_APPEARANCE: EnemyAppearance = {
  bodyColor: '#a6b975',
  outlineColor: '#142328',
  limbColor: '#263b3b',
  headScale: 1,
  torsoScale: 1,
  hornStyle: 'short',
  eyeStyle: 'normal',
  mouthStyle: 'closed',
  armorLevel: 0,
  mutationLevel: 0,
  clawStyle: 'standard',
};

export const ENEMY_APPEARANCE_PRESETS: Record<EnemyType, EnemyAppearance> = {
  walker: createEnemyAppearance({
    bodyColor: '#a6b975',
    headScale: 1,
    torsoScale: 1,
    hornStyle: 'none',
    eyeStyle: 'normal',
    mouthStyle: 'fangs',
    mutationLevel: 0,
    clawStyle: 'standard',
  }),
  runner: createEnemyAppearance({
    bodyColor: '#d69a70',
    headScale: 1.06,
    torsoScale: 0.86,
    hornStyle: 'none',
    eyeStyle: 'angry',
    mouthStyle: 'fangs',
    mutationLevel: 1,
    clawStyle: 'hooked',
  }),
  brute: createEnemyAppearance({
    bodyColor: '#d68e84',
    headScale: 0.9,
    torsoScale: 1.35,
    hornStyle: 'short',
    eyeStyle: 'angry',
    mouthStyle: 'fangs',
    armorLevel: 1,
    mutationLevel: 2,
    clawStyle: 'heavy',
  }),
  spitter: createEnemyAppearance({
    bodyColor: '#a8a0c4',
    headScale: 1.22,
    torsoScale: 0.8,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    mutationLevel: 2,
    clawStyle: 'spiked',
  }),
  swarm: createEnemyAppearance({
    bodyColor: '#b0c684',
    headScale: 1.18,
    torsoScale: 0.72,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'fangs',
    mutationLevel: 1,
    clawStyle: 'tiny',
  }),
  armoured: createEnemyAppearance({
    bodyColor: '#9aaeae',
    headScale: 1.1,
    torsoScale: 1.28,
    hornStyle: 'curved',
    eyeStyle: 'angry',
    mouthStyle: 'closed',
    armorLevel: 2,
    mutationLevel: 3,
    clawStyle: 'plate',
  }),
  screamer: createEnemyAppearance({
    bodyColor: '#c2b5a5',
    headScale: 1.32,
    torsoScale: 0.78,
    hornStyle: 'curved',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    armorLevel: 0,
    mutationLevel: 2,
    clawStyle: 'razor',
  }),
  bloater: createEnemyAppearance({
    bodyColor: '#7d8c78',
    headScale: 0.8,
    torsoScale: 1.56,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    armorLevel: 0,
    mutationLevel: 3,
    clawStyle: 'thin',
  }),
  splitter: createEnemyAppearance({
    bodyColor: '#7a8379',
    headScale: 1.15,
    torsoScale: 1.1,
    hornStyle: 'spiked',
    eyeStyle: 'angry',
    mouthStyle: 'fangs',
    armorLevel: 1,
    mutationLevel: 4,
    clawStyle: 'split',
  }),
};

export function createEnemyAppearance(
  overrides: Partial<EnemyAppearance> = {},
): EnemyAppearance {
  return {
    ...DEFAULT_ENEMY_APPEARANCE,
    ...overrides,
  };
}

export function getEnemyAppearance(
  type: EnemyType | undefined,
  overrides: Partial<EnemyAppearance> = {},
): EnemyAppearance {
  if (!type) {
    return createEnemyAppearance(overrides);
  }

  const preset = ENEMY_APPEARANCE_PRESETS[type] ?? DEFAULT_ENEMY_APPEARANCE;
  return createEnemyAppearance({
    ...preset,
    ...overrides,
  });
}
