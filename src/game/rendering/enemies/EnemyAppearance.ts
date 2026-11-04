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
  variant: EnemyType;
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
  variant: 'walker',
  bodyColor: '#a6b975',
  outlineColor: '#17272B',
  limbColor: '#304348',
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
    variant: 'walker',
    bodyColor: '#a4c3a0',
    outlineColor: '#17272B',
    limbColor: '#304348',
    headScale: 1,
    torsoScale: 1.06,
    hornStyle: 'none',
    eyeStyle: 'normal',
    mouthStyle: 'closed',
    mutationLevel: 0,
    clawStyle: 'standard',
  }),
  runner: createEnemyAppearance({
    variant: 'runner',
    bodyColor: '#d8a77d',
    outlineColor: '#17272B',
    limbColor: '#774d3b',
    headScale: 1.06,
    torsoScale: 0.9,
    hornStyle: 'none',
    eyeStyle: 'angry',
    mouthStyle: 'fangs',
    mutationLevel: 1,
    clawStyle: 'hooked',
  }),
  brute: createEnemyAppearance({
    variant: 'brute',
    bodyColor: '#d88e88',
    outlineColor: '#17272B',
    limbColor: '#6e4a48',
    headScale: 0.88,
    torsoScale: 1.35,
    hornStyle: 'short',
    eyeStyle: 'angry',
    mouthStyle: 'closed',
    armorLevel: 1,
    mutationLevel: 2,
    clawStyle: 'heavy',
  }),
  spitter: createEnemyAppearance({
    variant: 'spitter',
    bodyColor: '#a8a0c4',
    outlineColor: '#17272B',
    limbColor: '#4a5365',
    headScale: 1.16,
    torsoScale: 0.88,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    mutationLevel: 2,
    clawStyle: 'spiked',
  }),
  swarm: createEnemyAppearance({
    variant: 'swarm',
    bodyColor: '#b5c984',
    outlineColor: '#17272B',
    limbColor: '#52663a',
    headScale: 1.12,
    torsoScale: 0.78,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'fangs',
    mutationLevel: 1,
    clawStyle: 'tiny',
  }),
  armoured: createEnemyAppearance({
    variant: 'armoured',
    bodyColor: '#9eb0ad',
    outlineColor: '#17272B',
    limbColor: '#3d4d49',
    headScale: 1.08,
    torsoScale: 1.28,
    hornStyle: 'curved',
    eyeStyle: 'angry',
    mouthStyle: 'closed',
    armorLevel: 2,
    mutationLevel: 3,
    clawStyle: 'plate',
  }),
  screamer: createEnemyAppearance({
    variant: 'screamer',
    bodyColor: '#cdb7a0',
    outlineColor: '#17272B',
    limbColor: '#6d564a',
    headScale: 1.28,
    torsoScale: 0.86,
    hornStyle: 'curved',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    armorLevel: 0,
    mutationLevel: 2,
    clawStyle: 'razor',
  }),
  bloater: createEnemyAppearance({
    variant: 'bloater',
    bodyColor: '#7c9280',
    outlineColor: '#17272B',
    limbColor: '#415344',
    headScale: 0.8,
    torsoScale: 1.5,
    hornStyle: 'none',
    eyeStyle: 'glowing',
    mouthStyle: 'open',
    armorLevel: 0,
    mutationLevel: 3,
    clawStyle: 'thin',
  }),
  splitter: createEnemyAppearance({
    variant: 'splitter',
    bodyColor: '#7a8a84',
    outlineColor: '#17272B',
    limbColor: '#40504d',
    headScale: 1.12,
    torsoScale: 1.12,
    hornStyle: 'spiked',
    eyeStyle: 'angry',
    mouthStyle: 'closed',
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
