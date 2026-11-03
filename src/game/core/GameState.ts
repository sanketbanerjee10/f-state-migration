import {
  GAME_VIEWPORT,
  GAME_SCORING_CONFIG,
  PLAYER_MOVEMENT_SPEED,
  PLAYER_STARTING_DAMAGE,
  PLAYER_STARTING_SHOTS_PER_SECOND,
  WAVE_ONE_ENEMY_BUDGET,
} from './GameConfig';
import { moveCircleInArena } from './ArenaGeometry';
import { GAME_VISUAL_CONFIG } from '../rendering/VisualConfig';
import {
  createArenaObstacles,
  createExplosiveBarrels,
  getArenaCollisionObstacles,
  type ArenaObstacleEntity,
  type ArenaThemeId,
  type ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';
import {
  getWaveDifficulty,
  WAVE_DIFFICULTY_CONFIG,
} from '../waves/WaveDifficulty';
import type { BossType } from '../bosses/BossSystem';
import type {
  CurrencyAccounting,
  RareUpgradeId,
  RunProgressionState,
  StandardAttributeId,
} from '../upgrades/ProgressionSystem';
import {
  createRunProgressionState,
  getNormalAttributeCost,
  getNormalAttributeValue,
  STANDARD_ATTRIBUTE_DEFINITIONS,
} from '../upgrades/ProgressionSystem';
import {
  getWaveModifierForWave,
  type WaveModifierId,
} from '../modifiers/WaveModifiers';
import { DEV_WAVE_ENEMY_BUDGET } from '../waves/WaveComposition';

export type GameMode = 'standard' | 'dev';
export type ZombieType =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'spitter'
  | 'swarm'
  | 'armoured'
  | 'screamer'
  | 'bloater'
  | 'splitter';

export type ZombieEliteModifier =
  | 'fast'
  | 'shielded'
  | 'regenerating'
  | 'explosive'
  | 'none';

export type ProjectileOwner = 'player' | 'enemy' | 'turret';
export type OrbRarity = 'common' | 'uncommon' | 'rare' | 'special';
export type GameItemType =
  | 'health'
  | 'damage'
  | 'rapidFire'
  | 'shield'
  | 'bomb'
  | 'magnet'
  | 'turret'
  | 'cursed'
  | 'rareGold';
export type GamePhase = 'combat' | 'upgrade' | 'gameOver';
export type RunStatAttribute =
  | 'damage'
  | 'shotsPerSecond'
  | 'maxHealth'
  | 'movementSpeed';

export const PLAYER_STARTING_MAX_HEALTH = 100;

export interface ActiveTemporaryEffect {
  readonly type:
    | 'damage'
    | 'rapidFire'
    | 'shield'
    | 'magnet'
    | 'cursed';
  readonly durationSeconds: number;
  remainingSeconds: number;
  remainingShield?: number;
}

export interface SupportTurretEntity {
  readonly id: number;
  x: number;
  y: number;
  aimAngle?: number;
  readonly durationSeconds: number;
  remainingSeconds: number;
  attackCooldownSeconds: number;
}

export interface RunStatistics {
  highestWaveReached: number;
  highestWaveCleared: number;
  zombiesKilled: number;
  walkerKills: number;
  runnerKills: number;
  bruteKills: number;
  spitterKills: number;
  swarmKills: number;
  armouredKills: number;
  screamerKills: number;
  bloaterKills: number;
  splitterKills: number;
  eliteKills?: number;
  bossKills?: number;
  bossUpgradeOpportunities?: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  survivalSeconds: number;
  highestDamage: number;
  highestShotsPerSecond: number;
  orbsCollected: number;
  upgradesSelected: number;
  upgradePoints: number;
  standardCurrency?: CurrencyAccounting;
  rareCurrency?: CurrencyAccounting;
  standardAttributeLevels?: Record<StandardAttributeId, number>;
  standardAttributeCosts?: Record<StandardAttributeId, number[]>;
  rareUpgradeLevels?: Record<RareUpgradeId, number>;
  rareUpgradeCosts?: Record<RareUpgradeId, number[]>;
  rareUpgradeUnlocked?: Record<RareUpgradeId, boolean>;
  statAllocations: Record<RunStatAttribute, number>;
}

export interface WaveProgressionState {
  currentWave: number;
  activeModifier: WaveModifierId | null;
  phase: GamePhase;
  enemyBudget: number;
  enemiesSpawned: number;
  spawnCooldownSeconds: number;
  requiredBossesRemaining: number;
  lastSpawnCandidateIndex: number;
  bossType?: BossType;
  bossName?: string;
  bossEncounterId?: string;
  bossIntroSeconds: number;
  bossIntroDurationSeconds: number;
  bossSpawned: boolean;
  bossSummonsSpawned: number;
  bossSummonCooldownSeconds: number;
  bossUpgradeOpportunity: boolean;
  announcement: string;
  announcementSeconds: number;
}

export interface RunStatOption {
  readonly attribute: RunStatAttribute;
  readonly label: string;
  readonly description: string;
  readonly currentValue: number;
  readonly newValue: number;
  readonly nextLevelEffect: string;
  readonly cost: number;
  readonly canIncrease: boolean;
  readonly unit: string;
}

export interface PlayerEntity {
  x: number;
  y: number;
  readonly radius: number;
  health: number;
  maxHealth: number;
  aimAngle: number;
  movementFactor: number;
  damage: number;
  shotsPerSecond: number;
  movementSpeed: number;
  hitFlashSeconds: number;
  damageCooldownSeconds: number;
  fireCooldownSeconds: number;
  shotsFired: number;
  muzzleFlashSeconds: number;
  shieldStrength: number;
  spitterPoisonRemainingSeconds: number;
  spitterPoisonTickSeconds: number;
  spitterPoisonDamage: number;
  alive: boolean;
}

export interface ZombieEntity {
  readonly id: number;
  readonly type: ZombieType;
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
  readonly movementSpeed: number;
  readonly contactDamage: number;
  facingAngle: number;
  hitFlashSeconds: number;
  attackCooldownSeconds: number;
  runnerDashCycleSeconds?: number;
  swarmDodgeRemainingSeconds?: number;
  swarmDodgeDirectionX?: number;
  swarmDodgeDirectionY?: number;
  swarmDodgeCooldownSeconds?: number;
  swarmLastDodgedProjectileId?: number;
  swarmRecoveryRemainingSeconds?: number;
  specialCooldownSeconds?: number;
  attackWindupSeconds?: number;
  movementSpeedMultiplier?: number;
  contactDamageMultiplier?: number;
  buffedUntil?: number;
  eliteModifier?: ZombieEliteModifier;
  spawnDepth?: number;
  isElite?: boolean;
  eliteShieldHealth?: number;
  eliteMaxShieldHealth?: number;
  eliteExplosionSeconds?: number;
  eliteExplosionDurationSeconds?: number;
  eliteRarePointEligible?: boolean;
  isBoss?: boolean;
  bossType?: BossType;
  bossAttackCooldownSeconds?: number;
  bossAttackPatternIndex?: number;
  bossPhase?: 'pursuit' | 'windup' | 'charge' | 'stunned' | 'recovery';
  bossPhaseSeconds?: number;
  bossChargeAngle?: number;
  bossShielded?: boolean;
  bossSummonedBy?: number;
  screamerSummonedBy?: number;
  bossSummonsSpawned?: number;
  bossSummonCooldownSeconds?: number;
  bossAcidPoolTargetX?: number;
  bossAcidPoolTargetY?: number;
  bossAcidPoolWindupSeconds?: number;
  bossRewardIssued?: boolean;
}

export interface ProjectileEntity {
  readonly id: number;
  x: number;
  y: number;
  readonly directionX: number;
  readonly directionY: number;
  readonly radius: number;
  readonly damage: number;
  readonly speed: number;
  remainingSeconds: number;
  owner?: ProjectileOwner;
  kind?: 'standard' | 'heavy' | 'critical' | 'spitter' | 'acid' | 'turret';
  remainingPierces?: number;
  hitZombieIds?: number[];
  explosiveChance?: number;
}

export interface HazardEntity {
  readonly id: number;
  x: number;
  y: number;
  readonly radius: number;
  readonly damage: number;
  readonly durationSeconds: number;
  remainingSeconds: number;
  readonly kind: 'acid' | 'pulse' | 'bloater';
}

export interface ImpactEffectEntity {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly durationSeconds: number;
  readonly kind: 'hit' | 'death' | 'bomb' | 'orbExpiry' | 'spawn' | 'playerDamage' | 'telegraph' | 'acid';
  readonly color?: string;
  readonly radius?: number;
  remainingSeconds: number;
  readonly critical: boolean;
  readonly shieldAbsorbed: boolean;
}

export interface DamageNumberEntity {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly amount: number;
  readonly durationSeconds: number;
  remainingSeconds: number;
}

export interface CollectionEffectEntity {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly durationSeconds: number;
  remainingSeconds: number;
}

export interface ItemOrbEntity {
  readonly id: number;
  readonly type: GameItemType;
  readonly rarity?: OrbRarity;
  x: number;
  y: number;
  readonly radius: number;
  readonly durationSeconds: number;
  remainingSeconds: number;
}

export interface GameState {
  gameMode: GameMode;
  arenaWidth: number;
  arenaHeight: number;
  elapsedSeconds: number;
  player: PlayerEntity;
  zombies: ZombieEntity[];
  projectiles: ProjectileEntity[];
  items: ItemOrbEntity[];
  hazards: HazardEntity[];
  arenaObstacles: ArenaObstacleEntity[];
  barrels: ExplosiveBarrelEntity[];
  arenaTheme: ArenaThemeId;
  impacts: ImpactEffectEntity[];
  damageNumbers: DamageNumberEntity[];
  collectionEffects: CollectionEffectEntity[];
  activeEffects: ActiveTemporaryEffect[];
  supportTurrets: SupportTurretEntity[];
  bombs: number;
  turrets: number;
  wave: WaveProgressionState;
  statistics: RunStatistics;
  progression: RunProgressionState;
  nextEntityId: number;
  zombiesKilled: number;
}

export interface GameStateSnapshot {
  readonly gameMode: GameMode;
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  readonly elapsedSeconds: number;
  readonly player: Readonly<PlayerEntity>;
  readonly zombies: readonly Readonly<ZombieEntity>[];
  readonly projectiles: readonly Readonly<ProjectileEntity>[];
  readonly items: readonly Readonly<ItemOrbEntity>[];
  readonly hazards: readonly Readonly<HazardEntity>[];
  readonly arenaObstacles: readonly Readonly<ArenaObstacleEntity>[];
  readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
  readonly arenaTheme: ArenaThemeId;
  readonly impacts: readonly Readonly<ImpactEffectEntity>[];
  readonly damageNumbers: readonly Readonly<DamageNumberEntity>[];
  readonly collectionEffects: readonly Readonly<CollectionEffectEntity>[];
  readonly activeEffects: readonly Readonly<ActiveTemporaryEffect>[];
  readonly supportTurrets: readonly Readonly<SupportTurretEntity>[];
  readonly bombs: number;
  readonly turrets: number;
  readonly wave: Readonly<WaveProgressionState>;
  readonly statistics: Readonly<RunStatistics>;
  readonly progression: RunProgressionState;
  readonly score: number;
  readonly upgradePoints: number;
  readonly statAllocations: Readonly<Record<RunStatAttribute, number>>;
  readonly statOptions: readonly RunStatOption[];
  readonly zombiesKilled: number;
}

const ZOMBIE_STATS: Record<ZombieType, {
  readonly health: number;
  readonly movementSpeed: number;
  readonly contactDamage: number;
  readonly radius: number;
}> = {
  walker: {
    health: 50,
    movementSpeed: 52,
    contactDamage: 10,
    radius: GAME_VISUAL_CONFIG.entity.walkerRadius,
  },
  runner: {
    health: 30,
    movementSpeed: 92,
    contactDamage: 7,
    radius: GAME_VISUAL_CONFIG.entity.runnerRadius,
  },
  brute: {
    health: 100,
    movementSpeed: 36,
    contactDamage: 50,
    radius: GAME_VISUAL_CONFIG.entity.bruteRadius,
  },
  spitter: {
    health: 60,
    movementSpeed: 46,
    contactDamage: 12,
    radius: GAME_VISUAL_CONFIG.entity.spitterRadius,
  },
  swarm: {
    health: 20,
    movementSpeed: 104,
    contactDamage: 6,
    radius: GAME_VISUAL_CONFIG.entity.swarmRadius,
  },
  armoured: {
    health: 82,
    movementSpeed: 41,
    contactDamage: 13,
    radius: GAME_VISUAL_CONFIG.entity.armouredRadius,
  },
  screamer: {
    health: 56,
    movementSpeed: 50,
    contactDamage: 9,
    radius: GAME_VISUAL_CONFIG.entity.screamerRadius,
  },
  bloater: {
    health: 86,
    movementSpeed: 34,
    contactDamage: 15,
    radius: GAME_VISUAL_CONFIG.entity.bloaterRadius,
  },
  splitter: {
    health: 46,
    movementSpeed: 42,
    contactDamage: 9,
    radius: GAME_VISUAL_CONFIG.entity.splitterRadius,
  },
};

function assertArenaSize(width: number, height: number): void {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError('Arena dimensions must be positive finite numbers.');
  }
}

export function createZombie(
  id: number,
  type: ZombieType,
  x: number,
  y: number,
  waveNumber = 1,
): ZombieEntity {
  const stats = ZOMBIE_STATS[type];
  const difficulty = getWaveDifficulty(waveNumber);
  const healthMultiplier = difficulty.healthMultiplier;
  return {
    id,
    type,
    x,
    y,
    radius: stats.radius,
    health: Math.round(stats.health * healthMultiplier),
    maxHealth: Math.round(stats.health * healthMultiplier),
    movementSpeed: stats.movementSpeed * difficulty.speedMultiplier,
    contactDamage: type === 'brute'
      ? stats.contactDamage
      : Math.min(
          WAVE_DIFFICULTY_CONFIG.maximumContactDamage,
          stats.contactDamage + difficulty.contactDamageBonus,
        ),
    facingAngle: 0,
    hitFlashSeconds: 0,
    attackCooldownSeconds: 0,
    ...(type === 'runner' ? { runnerDashCycleSeconds: 0 } : {}),
    ...(type === 'swarm'
      ? {
          swarmDodgeRemainingSeconds: 0,
          swarmDodgeDirectionX: 0,
          swarmDodgeDirectionY: 0,
          swarmDodgeCooldownSeconds: 0,
          swarmRecoveryRemainingSeconds: 0,
        }
      : {}),
    specialCooldownSeconds: 0,
    attackWindupSeconds: 0,
    movementSpeedMultiplier: 1,
    contactDamageMultiplier: 1,
    eliteModifier: 'none',
    spawnDepth: 0,
    isElite: false,
  };
}

export function createGameState(
  width: number = GAME_VIEWPORT.width,
  height: number = GAME_VIEWPORT.height,
  gameMode: GameMode = 'standard',
): GameState {
  assertArenaSize(width, height);
  const playerRadius = GAME_VISUAL_CONFIG.entity.playerRadius;
  const player: PlayerEntity = {
    x: width / 2,
    y: height / 2,
    radius: playerRadius,
    health: PLAYER_STARTING_MAX_HEALTH,
    maxHealth: PLAYER_STARTING_MAX_HEALTH,
    aimAngle: -0.22,
    movementFactor: 0,
    damage: PLAYER_STARTING_DAMAGE,
    shotsPerSecond: PLAYER_STARTING_SHOTS_PER_SECOND,
    movementSpeed: PLAYER_MOVEMENT_SPEED,
    hitFlashSeconds: 0,
    damageCooldownSeconds: 0,
    fireCooldownSeconds: 0,
    shotsFired: 0,
    muzzleFlashSeconds: 0,
    shieldStrength: 0,
    spitterPoisonRemainingSeconds: 0,
    spitterPoisonTickSeconds: 0,
    spitterPoisonDamage: 0,
    alive: true,
  };
  const initialWave = 1;
  const progression = createRunProgressionState();
  return {
    gameMode,
    arenaWidth: width,
    arenaHeight: height,
    elapsedSeconds: 0,
    player,
    zombies: [],
    projectiles: [],
    items: [],
    hazards: [],
    arenaObstacles: createArenaObstacles(),
    barrels: createExplosiveBarrels(),
    arenaTheme: 'military',
    impacts: [],
    damageNumbers: [],
    collectionEffects: [],
    activeEffects: [],
    supportTurrets: [],
    bombs: 0,
    turrets: 0,
    wave: {
      currentWave: initialWave,
      activeModifier: getWaveModifierForWave(initialWave),
      phase: 'combat',
      enemyBudget: gameMode === 'dev'
        ? DEV_WAVE_ENEMY_BUDGET
        : WAVE_ONE_ENEMY_BUDGET,
      enemiesSpawned: 0,
      spawnCooldownSeconds: 0,
      requiredBossesRemaining: 0,
      lastSpawnCandidateIndex: -1,
      bossIntroSeconds: 0,
      bossIntroDurationSeconds: 0,
      bossSpawned: true,
      bossSummonsSpawned: 0,
      bossSummonCooldownSeconds: 0,
      bossUpgradeOpportunity: false,
      announcement: 'Wave 1',
      announcementSeconds: 3,
    },
    statistics: {
      highestWaveReached: initialWave,
      highestWaveCleared: 0,
      zombiesKilled: 0,
      walkerKills: 0,
      runnerKills: 0,
      bruteKills: 0,
      spitterKills: 0,
      swarmKills: 0,
      armouredKills: 0,
      screamerKills: 0,
      bloaterKills: 0,
      splitterKills: 0,
      eliteKills: 0,
      bossKills: 0,
      bossUpgradeOpportunities: 0,
      totalDamageDealt: 0,
      totalDamageReceived: 0,
      survivalSeconds: 0,
      highestDamage: player.damage,
      highestShotsPerSecond: player.shotsPerSecond,
      orbsCollected: 0,
      upgradesSelected: 0,
      upgradePoints: 0,
      standardCurrency: { ...progression.standard },
      rareCurrency: { ...progression.rare },
      standardAttributeLevels: { ...progression.standardAttributeLevels },
      standardAttributeCosts: { ...progression.standardAttributeCosts },
      rareUpgradeLevels: { ...progression.rareUpgradeLevels },
      rareUpgradeCosts: { ...progression.rareUpgradeCosts },
      rareUpgradeUnlocked: { ...progression.rareUpgradeUnlocked },
      statAllocations: {
        damage: 0,
        shotsPerSecond: 0,
        maxHealth: 0,
        movementSpeed: 0,
      },
    },
    progression,
    nextEntityId: 1,
    zombiesKilled: 0,
  };
}

export function resizeGameState(
  state: GameState,
  width: number,
  height: number,
): void {
  assertArenaSize(width, height);
  const scaleX = width / state.arenaWidth;
  const scaleY = height / state.arenaHeight;
  const arenaObstacles = getArenaCollisionObstacles(
    state.arenaObstacles,
    state.barrels,
  );
  state.arenaWidth = width;
  state.arenaHeight = height;

  for (const entity of [
    state.player,
    ...state.zombies,
    ...state.items,
  ]) {
    const resized = moveCircleInArena(
      { x: entity.x * scaleX, y: entity.y * scaleY },
      entity.radius,
      0,
      0,
      width,
      height,
      arenaObstacles,
    );
    entity.x = resized.x;
    entity.y = resized.y;
  }
  for (const turret of state.supportTurrets) {
    const resized = moveCircleInArena(
      { x: turret.x * scaleX, y: turret.y * scaleY },
      GAME_VISUAL_CONFIG.entity.supportTurretRadius,
      0,
      0,
      width,
      height,
      arenaObstacles,
    );
    turret.x = resized.x;
    turret.y = resized.y;
  }
}

export function createGameStateSnapshot(state: GameState): GameStateSnapshot {
  return {
    gameMode: state.gameMode,
    arenaWidth: state.arenaWidth,
    arenaHeight: state.arenaHeight,
    elapsedSeconds: state.elapsedSeconds,
    player: { ...state.player },
    zombies: state.zombies.map((zombie) => ({ ...zombie })),
    projectiles: state.projectiles.map((projectile) => ({
      ...projectile,
      ...(projectile.hitZombieIds
        ? { hitZombieIds: [...projectile.hitZombieIds] }
        : {}),
    })),
    items: state.items.map((item) => ({ ...item })),
    hazards: state.hazards.map((hazard) => ({ ...hazard })),
    arenaObstacles: state.arenaObstacles.map((obstacle) => ({ ...obstacle })),
    barrels: state.barrels.map((barrel) => ({ ...barrel })),
    arenaTheme: state.arenaTheme,
    impacts: state.impacts.map((impact) => ({ ...impact })),
    damageNumbers: state.damageNumbers.map((damage) => ({ ...damage })),
    collectionEffects: state.collectionEffects.map((effect) => ({ ...effect })),
    activeEffects: state.activeEffects.map((effect) => ({ ...effect })),
    supportTurrets: state.supportTurrets.map((turret) => ({ ...turret })),
    bombs: state.bombs,
    turrets: state.turrets,
    wave: { ...state.wave },
    statistics: { ...state.statistics },
    progression: {
      ...state.progression,
      standard: { ...state.progression.standard },
      rare: { ...state.progression.rare },
      standardAttributeLevels: { ...state.progression.standardAttributeLevels },
      standardAttributeCosts: Object.fromEntries(
        Object.entries(state.progression.standardAttributeCosts).map(
          ([attribute, costs]) => [attribute, [...costs]],
        ),
      ) as RunProgressionState['standardAttributeCosts'],
      rareUpgradeLevels: { ...state.progression.rareUpgradeLevels },
      rareUpgradeCosts: Object.fromEntries(
        Object.entries(state.progression.rareUpgradeCosts).map(
          ([upgrade, costs]) => [upgrade, [...costs]],
        ),
      ) as RunProgressionState['rareUpgradeCosts'],
      rareUpgradeUnlocked: { ...state.progression.rareUpgradeUnlocked },
      rewardEventKeys: new Set(state.progression.rewardEventKeys),
    },
    score: calculateDeterministicScore(state.statistics),
    upgradePoints: state.statistics.upgradePoints,
    statAllocations: { ...state.statistics.statAllocations },
    statOptions: getRunStatOptions(
      state.player,
      state.progression.standardAttributeLevels,
    ),
    zombiesKilled: state.zombiesKilled,
  };
}

export function calculateDeterministicScore(
  statistics: Readonly<RunStatistics>,
): number {
  const killPoints =
    statistics.walkerKills * GAME_SCORING_CONFIG.walkerKillPoints +
    statistics.runnerKills * GAME_SCORING_CONFIG.runnerKillPoints +
    (statistics.eliteKills ?? 0) * GAME_SCORING_CONFIG.eliteKillBonus +
    (statistics.bossKills ?? 0) * GAME_SCORING_CONFIG.bossKillBonus;
  const clearedWavePoints =
    (statistics.highestWaveCleared * (statistics.highestWaveCleared + 1) / 2) *
    GAME_SCORING_CONFIG.waveClearPoints;
  return killPoints + clearedWavePoints;
}

export function getRunStatOptions(
  player: Readonly<PlayerEntity>,
  levels: Partial<Record<StandardAttributeId, number>> = {},
): RunStatOption[] {
  const nextLevel = (level: number | undefined) =>
    (level ?? 0) < Number.MAX_SAFE_INTEGER ? (level ?? 0) + 1 : level ?? 0;
  const canIncrease = (level: number | undefined) =>
    Number.isSafeInteger(level ?? 0) &&
    (level ?? 0) >= 0 &&
    (level ?? 0) < Number.MAX_SAFE_INTEGER;
  return [
    {
      attribute: 'damage',
      label: 'Weapon damage',
      description: 'Deal more damage with every projectile.',
      currentValue: player.damage,
      newValue: getNormalAttributeValue(
        'damage',
        PLAYER_STARTING_DAMAGE,
        nextLevel(levels.damage),
      ),
      nextLevelEffect: canIncrease(levels.damage)
        ? STANDARD_ATTRIBUTE_DEFINITIONS.damage.effectText
        : 'Numeric level limit reached',
      cost: getNormalAttributeCost('damage', levels.damage ?? 0),
      canIncrease: canIncrease(levels.damage),
      unit: 'damage/shot',
    },
    {
      attribute: 'shotsPerSecond',
      label: 'Rapid fire',
      description: 'Fire more often while keeping manual aim.',
      currentValue: player.shotsPerSecond,
      newValue: getNormalAttributeValue(
        'fireRate',
        PLAYER_STARTING_SHOTS_PER_SECOND,
        nextLevel(levels.fireRate),
      ),
      nextLevelEffect: canIncrease(levels.fireRate)
        ? STANDARD_ATTRIBUTE_DEFINITIONS.fireRate.effectText
        : 'Numeric level limit reached',
      cost: getNormalAttributeCost('fireRate', levels.fireRate ?? 0),
      canIncrease: canIncrease(levels.fireRate),
      unit: 'shots/second',
    },
    {
      attribute: 'maxHealth',
      label: 'Maximum health',
      description: 'Increase your maximum health.',
      currentValue: player.maxHealth,
      newValue: getNormalAttributeValue(
        'maxHealth',
        PLAYER_STARTING_MAX_HEALTH,
        nextLevel(levels.maxHealth),
      ),
      nextLevelEffect: canIncrease(levels.maxHealth)
        ? STANDARD_ATTRIBUTE_DEFINITIONS.maxHealth.effectText
        : 'Numeric level limit reached',
      cost: getNormalAttributeCost('maxHealth', levels.maxHealth ?? 0),
      canIncrease: canIncrease(levels.maxHealth),
      unit: 'health',
    },
    {
      attribute: 'movementSpeed',
      label: 'Movement speed',
      description: 'Move faster to dodge and reposition.',
      currentValue: player.movementSpeed,
      newValue: getNormalAttributeValue(
        'movementSpeed',
        PLAYER_MOVEMENT_SPEED,
        nextLevel(levels.movementSpeed),
      ),
      nextLevelEffect: canIncrease(levels.movementSpeed)
        ? STANDARD_ATTRIBUTE_DEFINITIONS.movementSpeed.effectText
        : 'Numeric level limit reached',
      cost: getNormalAttributeCost('movementSpeed', levels.movementSpeed ?? 0),
      canIncrease: canIncrease(levels.movementSpeed),
      unit: 'units/second',
    },
  ];
}
