import type { ZombieType } from './GameState';
import type {
  RareUpgradeDefinition,
  RareUpgradeId,
  StandardAttributeDefinition,
  StandardAttributeId,
} from '../upgrades/ProgressionSystem';

// Runtime, player, and input tuning.
export const GAME_VIEWPORT = {
  width: 960,
  height: 540,
} as const;

export const GAME_RUNTIME_CONFIG = {
  maximumDevicePixelRatio: 2,
  maximumFrameDeltaSeconds: 0.05,
} as const;

export const GAME_RESPONSIVE_ZOOM_CONFIG = {
  portraitAspectRatio: 0.8,
  landscapeAspectRatio: 1.3,
  portraitZoom: 1.35,
  landscapeZoom: 0.82,
} as const;

export const GAME_TOUCH_CONTROLS_MEDIA_QUERY =
  '(max-width: 760px), (pointer: coarse)';

export const PLAYER_CONFIG = {
  movementSpeed: 165,
  startingHealth: 100,
  startingDamage: 25,
  startingShotsPerSecond: 2,
} as const;

export const GAME_INPUT_CONFIG = {
  joystickDeadZone: 0.12,
} as const;

export const WAVE_ONE_ENEMY_BUDGET = 37;

// Arena layout and interaction tuning.
export interface ArenaObstacle {
  readonly xFraction: number;
  readonly yFraction: number;
  readonly width: number;
  readonly height: number;
  readonly kind: 'crate' | 'barricade' | 'wall' | 'cover' | 'barrel';
}

export const ARENA_OBSTACLES: readonly ArenaObstacle[] = [
  { xFraction: 0.24, yFraction: 0.34, width: 58, height: 48, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.67, width: 66, height: 54, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.3, width: 92, height: 24, kind: 'barricade' },
  { xFraction: 0.3, yFraction: 0.72, width: 82, height: 24, kind: 'barricade' },
  { xFraction: 0.42, yFraction: 0.55, width: 46, height: 20, kind: 'wall' },
  { xFraction: 0.58, yFraction: 0.45, width: 46, height: 20, kind: 'cover' },
];

export const ARENA_INTERACTION_CONFIG = {
  barricadeHealth: 180,
  barrelHealth: 80,
  barrelRadius: 16,
  barrelExplosionRadius: 112,
  barrelExplosionDamage: 72,
  barrelExplosionDamagesPlayer: true,
  barrelExplosionDamagesEnemies: true,
  industrialCrateHealth: 120,
} as const;

export const CONTAMINATED_OBJECT_CONFIG = {
  toxicBarrel: {
    health: 100,
    width: 30,
    height: 42,
    burstRadius: 92,
    burstDamage: 34,
    puddleRadiusX: 38,
    puddleRadiusY: 24,
    puddleDurationSeconds: 24,
    puddleDamage: 8,
    puddleDamageIntervalSeconds: 1.2,
    zombieSlowMultiplier: 0.62,
  },
  chemicalTank: {
    health: 180,
    width: 54,
    height: 72,
    cloudRadiusX: 62,
    cloudRadiusY: 48,
    cloudSpeed: 26,
    cloudDurationSeconds: 18,
    cloudDamage: 10,
    cloudDamageIntervalSeconds: 1,
  },
  mutagenContainer: {
    health: 140,
    width: 50,
    height: 66,
    spawnCount: 3,
    spawnDamageMultiplier: 1.2,
    spawnSpeedMultiplier: 1.15,
    temporaryBuffDurationSeconds: 10,
    temporaryBuffDamageMultiplier: 1.15,
    temporaryBuffSpeedMultiplier: 1.2,
    spillRadius: 124,
    spillRadiusX: 54,
    spillRadiusY: 36,
    spillDurationSeconds: 45,
    attractionRadius: 260,
  },
  leakingPipe: {
    width: 58,
    height: 18,
    warningDurationSeconds: 2.5,
    sprayDurationSeconds: 2.2,
    cooldownDurationSeconds: 8,
    sprayLength: 120,
    sprayWidth: 42,
    damage: 8,
    damageIntervalSeconds: 0.8,
  },
  contaminatedPuddle: {
    radiusX: 34,
    radiusY: 22,
    durationSeconds: 28,
    playerDamage: 6,
    playerDamageIntervalSeconds: 1.2,
    zombieSlowMultiplier: 0.62,
  },
  biohazardWasteBin: {
    health: 120,
    width: 52,
    height: 48,
    splashRadius: 84,
    splashDamage: 28,
    puddleRadiusX: 42,
    puddleRadiusY: 28,
    puddleDurationSeconds: 28,
    puddleDamage: 6,
    puddleDamageIntervalSeconds: 1.2,
    zombieSlowMultiplier: 0.62,
  },
  brokenVentilationFan: {
    width: 58,
    height: 50,
    idleDurationSeconds: 8,
    warningDurationSeconds: 2,
    activeDurationSeconds: 1.4,
    cooldownDurationSeconds: 4,
    influenceRadius: 196,
    pushDistance: 24,
    cloudInfluence: 0.55,
  },
  gasCloud: {
    damageCooldownSeconds: 1,
    windInfluence: 0.55,
    maximumCount: 3,
  },
  maximumMutagenSpawnsPerRupture: 3,
} as const;

export const MILITARY_OBJECT_CONFIG = {
  sandbag: {
    health: 180,
    width: 104,
    height: 34,
    sandWidth: 154,
    sandHeight: 86,
    slowMultiplier: 0.5,
    spillDurationSeconds: 30,
  },
  ammoCrate: {
    health: 120,
    width: 48,
    height: 44,
    explosionRadius: 72,
    explosionDamage: 34,
    explosionDurationSeconds: 0.36,
    rewardOffsetX: 20,
    blastDamagesPlayer: true,
    blastDamagesEnemies: true,
  },
  fuelDrum: {
    health: 80,
    width: 34,
    height: 46,
    blastRadius: 132,
    blastDamage: 60,
    ignitionDurationSeconds: 0.16,
    blastDurationSeconds: 0.72,
    aftermathDurationSeconds: 2.4,
    rewardOffsetX: 24,
  },
  razorWire: {
    width: 112,
    height: 34,
    damage: 9,
    damageIntervalSeconds: 0.85,
    slowMultiplier: 0.6,
    zombieChargeDistance: 160,
  },
  abandonedTurret: {
    width: 48,
    height: 42,
    health: 220,
    reviveRange: 54,
    reviveDurationSeconds: 4,
    rebuildDurationSeconds: 6,
    wireOffset: 14,
    wireDamage: 9,
    wireDamageIntervalSeconds: 0.85,
    zombieTargetChance: 0.4,
  },
  supplyCrate: {
    health: 150,
    width: 56,
    height: 48,
    destructionDurationSeconds: 0.4,
  },
} as const;

export const INDUSTRIAL_OBJECT_CONFIG = {
  oilFire: {
    radius: 54,
    durationSeconds: 6,
    damagePerTick: 8,
    tickIntervalSeconds: 0.7,
    lingeringBurnSeconds: 2.4,
  },
  gasCylinder: {
    radius: 13,
    width: 26,
    height: 38,
    triggerRange: 340,
    launchCooldownSeconds: 5.5,
    travelSpeed: 260,
    travelDurationSeconds: 2.2,
    detonationDurationSeconds: 0.32,
    explosionRadius: 74,
    damage: 46,
  },
  generator: {
    cycleSeconds: 7.5,
    dischargeStartSeconds: 3.1,
    cooldownStartSeconds: 4.3,
    dangerRadiusMultiplier: 1.8,
    damagePerPulse: 18,
    zombieDamagePerPulse: 16,
    pulseCooldownSeconds: 0.85,
  },
  movingWall: {
    amplitude: 18,
    angularSpeed: 0.9,
    pushPadding: 2,
  },
  steamPipe: {
    cycleSeconds: 8,
    warningStartSeconds: 2,
    ventStartSeconds: 2.8,
    cooldownStartSeconds: 4.6,
    playerDamage: 14,
    zombieDamage: 12,
    knockbackSpeed: 120,
    zombiePulseCooldownSeconds: 0.85,
  },
} as const;

export const GAME_SCORING_CONFIG = {
  walkerKillPoints: 100,
  runnerKillPoints: 150,
  eliteKillBonus: 500,
  bossKillBonus: 10_000,
  waveClearPoints: 250,
} as const;

export const STANDARD_POINTS_PER_CLEAR = 3;

// Combat and enemy ability tuning.
export const GAME_COMBAT_CONFIG = {
  projectileDamage: PLAYER_CONFIG.startingDamage,
  projectileSpeed: 560,
  projectileLifetimeSeconds: 1.5,
  playerProjectileRangeMultiplier: 0.7,
  shotsPerSecond: PLAYER_CONFIG.startingShotsPerSecond,
  playerHitCooldownSeconds: 0.65,
  zombieAttackCooldownSeconds: 0.8,
  impactDurationSeconds: 0.24,
  damageNumberDurationSeconds: 0.65,
  collectionEffectDurationSeconds: 0.36,
  muzzleFlashDurationSeconds: 0.075,
} as const;

export const PLAYER_PROJECTILE_RANGE =
  GAME_COMBAT_CONFIG.projectileSpeed *
  GAME_COMBAT_CONFIG.projectileLifetimeSeconds *
  GAME_COMBAT_CONFIG.playerProjectileRangeMultiplier;

export const ENEMY_ABILITY_CONFIG = {
  spitter: {
    attackCooldownSeconds: 5,
    attackRange: 360,
    preferredDistance: 220,
    minimumHoldDistance: 180,
    maximumHoldDistance: 260,
    poisonDurationSeconds: 5,
    poisonTickSeconds: 1,
    poisonDamageFraction: 0.2,
  },
  runnerDash: {
    chargeDurationSeconds: 6,
    dashDurationSeconds: 2,
    speedMultiplier: 2,
  },
  swarmDodge: {
    lookaheadSeconds: 0.6,
    dodgeDurationSeconds: 0.35,
    dodgeSpeedMultiplier: 2,
    dodgeClearance: 20,
    dodgeDistance: 100,
    recoveryDurationSeconds: 2,
    recoveryStartingSpeedMultiplier: 0.5,
    cooldownSeconds: 3,
  },
} as const;

export const GAME_PROGRESSION_CONFIG = {
  baseEnemyBudget: WAVE_ONE_ENEMY_BUDGET,
  enemyBudgetMultiplier: 0.6,
  baseSpawnDurationSeconds: 60,
  additionalSpawnDurationPerWaveSeconds: 10,
  baseSpawnIntervalSeconds: 1,
  spawnIntervalDecreasePerWaveSeconds: 0.02,
  minimumSpawnIntervalSeconds: 0.5,
  arenaTransitionSeconds: 1,
  waveCountdownSeconds: 3,
  intermissionShieldSeconds: 5,
  playerSpawnProtectionSeconds: 1.5,
  itemLifetimeSeconds: 12,
  maximumActiveItems: 3,
  maximumBombInventory: 5,
  maximumTurretInventory: 5,
  killsPerOrbDrop: 2,
  orbPickupRadius: 28,
  healthOrbRestore: 25,
  damageEffectSeconds: 10,
  rapidFireEffectSeconds: 8,
  shieldEffectSeconds: 12,
  shieldAmount: 60,
  bombRadius: 175,
  bombDamage: 100,
  damageMultiplier: 2,
  rapidFireMultiplier: 2,
} as const;

export const ARENA_TRANSITION_SECONDS =
  GAME_PROGRESSION_CONFIG.arenaTransitionSeconds;

export const WAVE_MILESTONE_RARE_POINT_REWARDS: Readonly<Record<number, number>> = {
  20: 1,
  30: 1,
  40: 1,
};

export const ORB_DROP_SEQUENCE = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
  'magnet',
  'turret',
  'cursed',
] as const;

export const WAVE_SPAWN_CONFIG = {
  maximumActiveEnemies: 36,
  minimumPlayerDistance: 120,
  enemySpacing: 8,
} as const;

export const SPAWN_FRACTIONS: readonly number[] = [
  0.1,
  0.24,
  0.38,
  0.5,
  0.62,
  0.76,
  0.9,
];

export const WAVE_DIFFICULTY_CONFIG = {
  baseEnemySpeedMultiplier: 0.5,
  healthIncreasePerTwoWaves: 0.1,
  speedIncreasePerWave: 0.035,
  maximumSpeedIncreaseWaves: 8,
  contactDamageIncreasePerWave: 1,
  maximumContactDamage: 30,
} as const;

// Wave composition, scheduling, and modifiers.
export const WAVE_ENEMY_INTRODUCTIONS = [
  { type: 'walker', wave: 1 },
  { type: 'runner', wave: 2 },
  { type: 'spitter', wave: 4 },
  { type: 'swarm', wave: 6 },
  { type: 'armoured', wave: 8 },
  { type: 'brute', wave: 11 },
  { type: 'screamer', wave: 13 },
  { type: 'bloater', wave: 15 },
  { type: 'splitter', wave: 17 },
] as const;

export const WAVE_COMPOSITION_CONFIG = {
  developmentEnemyGroupSize: 2,
  developmentBossGroupSize: 1,
  developmentBossGroupCount: 3,
  eliteIntroductionWave: 18,
  bossWaveMilestones: [10, 20],
  waveOneRunnerFirstSpawnIndex: 30,
  waveOneRunnerSpawnInterval: 10,
} as const;

export const BOSS_WAVE_MILESTONES: readonly number[] =
  WAVE_COMPOSITION_CONFIG.bossWaveMilestones;

export const DEV_ENEMY_GROUP_SIZE =
  WAVE_COMPOSITION_CONFIG.developmentEnemyGroupSize;
export const DEV_STANDARD_ENEMY_BUDGET =
  WAVE_ENEMY_INTRODUCTIONS.length * DEV_ENEMY_GROUP_SIZE;
export const DEV_BOSS_GROUP_SIZE =
  WAVE_COMPOSITION_CONFIG.developmentBossGroupSize;
export const DEV_BOSS_GROUP_COUNT =
  WAVE_COMPOSITION_CONFIG.developmentBossGroupCount;
export const DEV_WAVE_ENEMY_BUDGET =
  DEV_STANDARD_ENEMY_BUDGET + DEV_BOSS_GROUP_SIZE * DEV_BOSS_GROUP_COUNT;

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

export interface WaveTemplateConfig {
  readonly id: WaveTemplateId;
  readonly weights: Partial<Record<ZombieType, number>>;
}

export const WAVE_TEMPLATES: Readonly<Record<WaveTemplateId, WaveTemplateConfig>> = {
  normal: { id: 'normal', weights: {} },
  runnerRush: { id: 'runnerRush', weights: { runner: 4, walker: 0.7, swarm: 1.5 } },
  heavyAssault: { id: 'heavyAssault', weights: { brute: 4, armoured: 3, walker: 0.7 } },
  swarm: { id: 'swarm', weights: { swarm: 4, runner: 2, walker: 0.7 } },
  rangedAssault: { id: 'rangedAssault', weights: { spitter: 4, runner: 1.5, walker: 0.7 } },
  armouredFormation: { id: 'armouredFormation', weights: { armoured: 4, brute: 2, walker: 0.7 } },
  supportHunt: { id: 'supportHunt', weights: { screamer: 4, spitter: 1.5, walker: 0.7 } },
  contamination: { id: 'contamination', weights: { bloater: 3, splitter: 3, swarm: 1.5, walker: 0.7 } },
  eliteHunt: { id: 'eliteHunt', weights: { brute: 2, armoured: 2, screamer: 1.5 } },
  bossWave: { id: 'bossWave', weights: { brute: 2, spitter: 1.5, armoured: 1.5 } },
} as const;

export const WAVE_ENEMY_WEIGHT_CONFIG: {
  readonly baseWeights: Readonly<Record<ZombieType, number>>;
  readonly spawnOrder: readonly ZombieType[];
  readonly lateWaveEliteWeightMultiplier: number;
  readonly eliteSpawnBudgetFraction: number;
} = {
  baseWeights: {
    walker: 8,
    runner: 2,
    brute: 2,
    spitter: 2,
    swarm: 3,
    armoured: 2,
    screamer: 1,
    bloater: 1,
    splitter: 2,
  },
  spawnOrder: [
    'walker',
    'runner',
    'brute',
    'spitter',
    'swarm',
    'armoured',
    'screamer',
    'bloater',
    'splitter',
  ],
  lateWaveEliteWeightMultiplier: 1.2,
  eliteSpawnBudgetFraction: 0.7,
} as const;

export const WAVE_TEMPLATE_CYCLE = [
  'runnerRush',
  'normal',
  'heavyAssault',
  'swarm',
  'rangedAssault',
  'armouredFormation',
  'supportHunt',
  'contamination',
  'eliteHunt',
] as const;

export const WAVE_MODIFIER_IDS = [
  'doubleOrbs',
  'fastWave',
  'armouredInvasion',
  'eliteThreat',
  'contamination',
  'reducedVisibility',
  'overrun',
  'heavyResistance',
] as const;

export type WaveModifierId = (typeof WAVE_MODIFIER_IDS)[number];

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

export const WAVE_MODIFIER_CONFIG: {
  readonly appearanceChance: number;
  readonly definitions: Readonly<Record<WaveModifierId, WaveModifierDefinition>>;
} = {
  appearanceChance: 0.6,
  definitions: {
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
  },
} as const;

export const SCREAMER_CONFIG = {
  summonIntervalSeconds: 6,
  summonGroupSize: 1,
  maximumActiveSummons: 3,
  retryIntervalSeconds: 1,
} as const;

// Elite and boss encounter tuning.
export const ELITE_CONFIG = {
  spawnChance: 0.1,
  maximumSpawnChance: 0.35,
  fastMovementMultiplier: 1.45,
  shieldHealthFraction: 0.65,
  regenerationFractionPerSecond: 0.035,
  explosionFuseSeconds: 0.7,
  explosionRadius: 92,
  explosionDamage: 34,
  explosionDamagesPlayer: true,
  explosionDamagesEnemies: true,
  rareGoldOrbDropChance: 0.35,
  rarePointReward: 1,
  rarePointRewardWaves: Object.keys(WAVE_MILESTONE_RARE_POINT_REWARDS).map(Number),
} as const;

export const ELITE_MODIFIERS = [
  'fast',
  'shielded',
  'regenerating',
  'explosive',
] as const;

export const BOSS_CONFIG = {
  introductionSeconds: 2.5,
  introductionTitleSeconds: 3,
  radius: 32,
  healthMultiplier: 18,
  damageMultiplier: 2.8,
  speedMultiplier: 0.72,
  rarePointReward: 2,
  rarePointDoubleChance: 0.5,
  upgradeOpportunityReward: 0,
  maximumActiveSummons: 3,
  maximumSummonsPerEncounter: 9,
  summonIntervalSeconds: 6,
  summonGroupSize: 2,
  hordeShieldDamageMultiplier: 0,
  chargerWindupSeconds: 0.9,
  chargerDashSeconds: 0.5,
  chargerDashSpeedMultiplier: 4.2,
  chargerStunSeconds: 1.25,
  chargerRecoverySeconds: 0.7,
  acidQueenAttackIntervalSeconds: 3,
  acidQueenProjectileDamage: 18,
  acidQueenProjectileSpeed: 260,
  acidQueenPoolDamage: 16,
  acidQueenPoolRadius: 58,
  acidQueenPoolDurationSeconds: 4,
  acidQueenPoolTelegraphSeconds: 0.8,
} as const;

export const BOSS_TYPES = ['charger', 'acidQueen', 'hordeCaller'] as const;
export const BOSS_NAMES = {
  charger: 'The Charger',
  acidQueen: 'Acid Queen',
  hordeCaller: 'Horde Caller',
} as const;

// Upgrade, reward, orb, and enemy base-stat data.
export const RARE_UPGRADE_EFFECT_CONFIG = {
  lifestealPercentByLevel: [0, 0.01, 0.02, 0.03, 0.04, 0.05],
  criticalChanceByLevel: [0, 0.03, 0.06, 0.09, 0.12, 0.15],
  criticalDamageMultiplier: 2,
  explosiveChanceByLevel: [0, 0.03, 0.06, 0.09, 0.12, 0.15],
  explosiveRadius: 48,
  explosiveDamageMultiplier: 0.5,
  orbMagnetismRadiusByLevel: [0, 60, 90, 120, 150, 180],
  emergencyShieldThreshold: 0.25,
  emergencyShieldCooldownSeconds: 60,
  emergencyShieldDurationByLevel: [0, 1, 1.5, 2, 2.5, 3],
  emergencyShieldCapacity: 60,
  secondWindHealthPercentByLevel: [0, 0.1, 0.15, 0.2],
} as const;

export const STANDARD_ATTRIBUTE_DEFINITIONS: Record<
  StandardAttributeId,
  StandardAttributeDefinition
> = {
  damage: {
    id: 'damage',
    label: 'Damage',
    description: 'Increase weapon damage by 10% per level.',
    defaultCost: 1,
    effectText: '+10% base damage',
    perLevelValue: (baseValue) => baseValue * 0.1,
  },
  fireRate: {
    id: 'fireRate',
    label: 'Fire rate',
    description: 'Fire faster by 8% per level.',
    defaultCost: 1,
    effectText: '+8% base fire rate',
    perLevelValue: (baseValue) => baseValue * 0.08,
  },
  maxHealth: {
    id: 'maxHealth',
    label: 'Max health',
    description: 'Gain 10 max health per level.',
    defaultCost: 1,
    effectText: '+10 max health',
    perLevelValue: () => 10,
  },
  movementSpeed: {
    id: 'movementSpeed',
    label: 'Movement speed',
    description: 'Move 3% faster per level.',
    defaultCost: 1,
    effectText: '+3% base movement speed',
    perLevelValue: (baseValue) => baseValue * 0.03,
  },
};

export const RARE_UPGRADE_DEFINITIONS: Record<
  RareUpgradeId,
  RareUpgradeDefinition
> = {
  lifesteal: {
    id: 'lifesteal',
    name: 'Lifesteal',
    rarity: 'rare',
    description: 'Heal a portion of weapon damage dealt.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Heals for 1% of eligible damage per level',
    effectTextByLevel: [
      'Heal 1% of eligible damage',
      'Heal 2% of eligible damage',
      'Heal 3% of eligible damage',
      'Heal 4% of eligible damage',
      'Heal 5% of eligible damage',
    ],
    effectType: 'healing',
  },
  criticalMastery: {
    id: 'criticalMastery',
    name: 'Critical Mastery',
    rarity: 'rare',
    description: 'Increase the chance for weapon hits to deal critical damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: '+3% critical chance per level',
    effectTextByLevel: [
      '+3% critical chance',
      '+6% critical chance',
      '+9% critical chance',
      '+12% critical chance',
      '+15% critical chance',
    ],
    effectType: 'critical',
  },
  explosiveRounds: {
    id: 'explosiveRounds',
    name: 'Explosive Rounds',
    rarity: 'rare',
    description: 'Rounds explode on impact for splash damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: '+3% impact explosion chance per level',
    effectTextByLevel: [
      '3% chance to explode on impact',
      '6% chance to explode on impact',
      '9% chance to explode on impact',
      '12% chance to explode on impact',
      '15% chance to explode on impact',
    ],
    effectType: 'projectile',
  },
  emergencyShield: {
    id: 'emergencyShield',
    name: 'Emergency Shield',
    rarity: 'epic',
    description: 'Creates a protective shield after taking damage.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Emergency shield duration increases per level',
    effectTextByLevel: [
      '1s emergency shield',
      '1.5s emergency shield',
      '2s emergency shield',
      '2.5s emergency shield',
      '3s emergency shield',
    ],
    effectType: 'shield',
  },
  orbMagnetism: {
    id: 'orbMagnetism',
    name: 'Orb Magnetism',
    rarity: 'rare',
    description: 'Pull nearby orbs toward the player.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked from the start of the run.',
    refundable: true,
    effectText: 'Larger pull radius and magnet strength',
    effectTextByLevel: [
      '60px attraction radius',
      '90px attraction radius',
      '120px attraction radius',
      '150px attraction radius',
      '180px attraction radius',
    ],
    effectType: 'orb',
  },
  piercingRounds: {
    id: 'piercingRounds',
    name: 'Piercing Rounds',
    rarity: 'epic',
    description: 'Shots continue through targets and hit additional enemies.',
    defaultCost: 1,
    maxLevel: 5,
    unlockText: 'Unlocked after completing wave 5.',
    refundable: true,
    effectText: 'Each level adds one additional target',
    effectTextByLevel: [
      'Pierce 1 additional enemy',
      'Pierce 2 additional enemies',
      'Pierce 3 additional enemies',
      'Pierce 4 additional enemies',
      'Pierce 5 additional enemies',
    ],
    effectType: 'projectile',
  },
  secondWind: {
    id: 'secondWind',
    name: 'Second Wind',
    rarity: 'epic',
    description: 'Restore health once per run when below a critical threshold.',
    defaultCost: 2,
    maxLevel: 3,
    unlockText: 'Unlocked at wave 10 or from a boss reward.',
    refundable: true,
    effectText: 'Restore 10%, 15%, or 20% max HP once per run',
    effectTextByLevel: [
      'Restore 10% max health once per run',
      'Restore 15% max health once per run',
      'Restore 20% max health once per run',
    ],
    effectType: 'utility',
  },
};

export const INITIAL_RARE_UPGRADE_ROSTER: readonly RareUpgradeId[] = [
  'lifesteal',
  'criticalMastery',
  'explosiveRounds',
  'emergencyShield',
  'orbMagnetism',
  'piercingRounds',
  'secondWind',
];

export const DEFAULT_NORMAL_ATTRIBUTE_ORDER: readonly StandardAttributeId[] = [
  'damage',
  'fireRate',
  'maxHealth',
  'movementSpeed',
];

export const DEFAULT_RARE_UPGRADE_ORDER: readonly RareUpgradeId[] = [
  ...INITIAL_RARE_UPGRADE_ROSTER,
];

export const NORMAL_ATTRIBUTE_ORDER = DEFAULT_NORMAL_ATTRIBUTE_ORDER;
export const RARE_UPGRADE_ORDER = DEFAULT_RARE_UPGRADE_ORDER;

export const ORB_RARITY_WEIGHTS = {
  common: 65,
  uncommon: 25,
  rare: 8,
  special: 2,
} as const;

export const ORB_SYSTEM_CONFIG = {
  magnetDurationSeconds: 10,
  magnetAttractionRadius: 120,
  magnetAttractionSpeed: 115,
  turretDurationSeconds: 12,
  turretDamage: 12,
  turretRange: 260,
  turretShotsPerSecond: 2,
  cursedDurationSeconds: 10,
  cursedDamageMultiplier: 1.5,
  cursedEnemySpeedMultiplier: 1.2,
  rareGoldRarePointReward: 1,
  defaultOrbRarity: 'common',
} as const;

export const ZOMBIE_BASE_STATS = {
  walker: { health: 50, movementSpeed: 52, contactDamage: 10 },
  runner: { health: 30, movementSpeed: 85, contactDamage: 7 },
  brute: { health: 100, movementSpeed: 36, contactDamage: 50 },
  spitter: { health: 60, movementSpeed: 46, contactDamage: 12 },
  swarm: { health: 20, movementSpeed: 104, contactDamage: 6 },
  armoured: { health: 82, movementSpeed: 41, contactDamage: 13 },
  screamer: { health: 56, movementSpeed: 50, contactDamage: 9 },
  bloater: { health: 86, movementSpeed: 34, contactDamage: 15 },
  splitter: { health: 46, movementSpeed: 42, contactDamage: 9 },
} as const;
