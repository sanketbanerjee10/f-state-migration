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

export type ZombieType = 'walker' | 'runner';
export type GameItemType = 'health' | 'damage' | 'rapidFire' | 'shield' | 'bomb';
export type GamePhase = 'combat' | 'upgrade' | 'intermission' | 'gameOver';
export type RunUpgradeAttribute =
  | 'damage'
  | 'shotsPerSecond'
  | 'maxHealth'
  | 'movementSpeed';

export interface ActiveTemporaryEffect {
  readonly type: 'damage' | 'rapidFire' | 'shield';
  readonly durationSeconds: number;
  remainingSeconds: number;
  remainingShield?: number;
}

export interface RunStatistics {
  highestWaveReached: number;
  highestWaveCleared: number;
  zombiesKilled: number;
  walkerKills: number;
  runnerKills: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  survivalSeconds: number;
  highestDamage: number;
  highestShotsPerSecond: number;
  orbsCollected: number;
  upgradesSelected: number;
}

export interface WaveProgressionState {
  currentWave: number;
  phase: GamePhase;
  enemyBudget: number;
  enemiesSpawned: number;
  spawnCooldownSeconds: number;
  intermissionSeconds: number;
  announcement: string;
  announcementSeconds: number;
}

export interface UpgradeOffer {
  readonly attribute: RunUpgradeAttribute;
  readonly label: string;
  readonly description: string;
  readonly currentValue: number;
  readonly newValue: number;
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
  muzzleFlashSeconds: number;
  shieldStrength: number;
  alive: boolean;
}

export interface ZombieEntity {
  readonly id: number;
  readonly type: ZombieType;
  x: number;
  y: number;
  readonly radius: number;
  health: number;
  readonly maxHealth: number;
  readonly movementSpeed: number;
  readonly contactDamage: number;
  facingAngle: number;
  hitFlashSeconds: number;
  attackCooldownSeconds: number;
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
}

export interface ImpactEffectEntity {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly durationSeconds: number;
  readonly kind: 'hit' | 'death' | 'bomb' | 'orbExpiry' | 'spawn' | 'playerDamage';
  readonly color?: string;
  readonly radius?: number;
  remainingSeconds: number;
  readonly critical: boolean;
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
  x: number;
  y: number;
  readonly radius: number;
  readonly durationSeconds: number;
  remainingSeconds: number;
}

export interface GameState {
  arenaWidth: number;
  arenaHeight: number;
  elapsedSeconds: number;
  player: PlayerEntity;
  zombies: ZombieEntity[];
  projectiles: ProjectileEntity[];
  items: ItemOrbEntity[];
  impacts: ImpactEffectEntity[];
  damageNumbers: DamageNumberEntity[];
  collectionEffects: CollectionEffectEntity[];
  activeEffects: ActiveTemporaryEffect[];
  wave: WaveProgressionState;
  statistics: RunStatistics;
  nextEntityId: number;
  zombiesKilled: number;
}

export interface GameStateSnapshot {
  readonly arenaWidth: number;
  readonly arenaHeight: number;
  readonly elapsedSeconds: number;
  readonly player: Readonly<PlayerEntity>;
  readonly zombies: readonly Readonly<ZombieEntity>[];
  readonly projectiles: readonly Readonly<ProjectileEntity>[];
  readonly items: readonly Readonly<ItemOrbEntity>[];
  readonly impacts: readonly Readonly<ImpactEffectEntity>[];
  readonly damageNumbers: readonly Readonly<DamageNumberEntity>[];
  readonly collectionEffects: readonly Readonly<CollectionEffectEntity>[];
  readonly activeEffects: readonly Readonly<ActiveTemporaryEffect>[];
  readonly wave: Readonly<WaveProgressionState>;
  readonly statistics: Readonly<RunStatistics>;
  readonly score: number;
  readonly availableUpgrades: readonly UpgradeOffer[];
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
  const healthMultiplier = 1 + Math.floor((waveNumber - 1) / 2) * 0.1;
  const speedMultiplier = 1 + Math.min(waveNumber - 1, 8) * 0.035;
  return {
    id,
    type,
    x,
    y,
    radius: stats.radius,
    health: Math.round(stats.health * healthMultiplier),
    maxHealth: Math.round(stats.health * healthMultiplier),
    movementSpeed: stats.movementSpeed * speedMultiplier,
    contactDamage: Math.min(30, stats.contactDamage + waveNumber - 1),
    facingAngle: 0,
    hitFlashSeconds: 0,
    attackCooldownSeconds: 0,
  };
}

export function createGameState(
  width: number = GAME_VIEWPORT.width,
  height: number = GAME_VIEWPORT.height,
): GameState {
  assertArenaSize(width, height);
  const playerRadius = GAME_VISUAL_CONFIG.entity.playerRadius;
  const player: PlayerEntity = {
    x: width / 2,
    y: height / 2,
    radius: playerRadius,
    health: 100,
    maxHealth: 100,
    aimAngle: -0.22,
    movementFactor: 0,
    damage: PLAYER_STARTING_DAMAGE,
    shotsPerSecond: PLAYER_STARTING_SHOTS_PER_SECOND,
    movementSpeed: PLAYER_MOVEMENT_SPEED,
    hitFlashSeconds: 0,
    damageCooldownSeconds: 0,
    fireCooldownSeconds: 0,
    muzzleFlashSeconds: 0,
    shieldStrength: 0,
    alive: true,
  };
  const initialWave = 1;
  return {
    arenaWidth: width,
    arenaHeight: height,
    elapsedSeconds: 0,
    player,
    zombies: [],
    projectiles: [],
    items: [],
    impacts: [],
    damageNumbers: [],
    collectionEffects: [],
    activeEffects: [],
    wave: {
      currentWave: initialWave,
      phase: 'combat',
      enemyBudget: WAVE_ONE_ENEMY_BUDGET,
      enemiesSpawned: 0,
      spawnCooldownSeconds: 0,
      intermissionSeconds: 0,
      announcement: 'Wave 1',
      announcementSeconds: 3,
    },
    statistics: {
      highestWaveReached: initialWave,
      highestWaveCleared: 0,
      zombiesKilled: 0,
      walkerKills: 0,
      runnerKills: 0,
      totalDamageDealt: 0,
      totalDamageReceived: 0,
      survivalSeconds: 0,
      highestDamage: player.damage,
      highestShotsPerSecond: player.shotsPerSecond,
      orbsCollected: 0,
      upgradesSelected: 0,
    },
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
    );
    entity.x = resized.x;
    entity.y = resized.y;
  }
}

export function createGameStateSnapshot(state: GameState): GameStateSnapshot {
  return {
    arenaWidth: state.arenaWidth,
    arenaHeight: state.arenaHeight,
    elapsedSeconds: state.elapsedSeconds,
    player: { ...state.player },
    zombies: state.zombies.map((zombie) => ({ ...zombie })),
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    items: state.items.map((item) => ({ ...item })),
    impacts: state.impacts.map((impact) => ({ ...impact })),
    damageNumbers: state.damageNumbers.map((damage) => ({ ...damage })),
    collectionEffects: state.collectionEffects.map((effect) => ({ ...effect })),
    activeEffects: state.activeEffects.map((effect) => ({ ...effect })),
    wave: { ...state.wave },
    statistics: { ...state.statistics },
    score: calculateDeterministicScore(state.statistics),
    availableUpgrades: getUpgradeOffers(state.player, state.wave.phase),
    zombiesKilled: state.zombiesKilled,
  };
}

export function calculateDeterministicScore(
  statistics: Readonly<RunStatistics>,
): number {
  const killPoints =
    statistics.walkerKills * GAME_SCORING_CONFIG.walkerKillPoints +
    statistics.runnerKills * GAME_SCORING_CONFIG.runnerKillPoints;
  const clearedWavePoints =
    (statistics.highestWaveCleared * (statistics.highestWaveCleared + 1) / 2) *
    GAME_SCORING_CONFIG.waveClearPoints;
  return killPoints + clearedWavePoints;
}

export function getUpgradeOffers(
  player: Readonly<PlayerEntity>,
  phase: GamePhase,
): UpgradeOffer[] {
  if (phase !== 'upgrade') return [];
  const candidates: UpgradeOffer[] = [
    {
      attribute: 'damage',
      label: 'Weapon damage',
      description: 'Deal more damage with every projectile.',
      currentValue: player.damage,
      newValue: Math.min(100, player.damage + 10),
      unit: 'damage/shot',
    },
    {
      attribute: 'shotsPerSecond',
      label: 'Rapid fire',
      description: 'Fire more often while keeping manual aim.',
      currentValue: player.shotsPerSecond,
      newValue: Math.min(10, player.shotsPerSecond + 0.5),
      unit: 'shots/second',
    },
    {
      attribute: 'maxHealth',
      label: 'Maximum health',
      description: 'Increase maximum health and recover some health.',
      currentValue: player.maxHealth,
      newValue: Math.min(200, player.maxHealth + 20),
      unit: 'health',
    },
    {
      attribute: 'movementSpeed',
      label: 'Movement speed',
      description: 'Move faster to dodge and reposition.',
      currentValue: player.movementSpeed,
      newValue: Math.min(360, player.movementSpeed + 20),
      unit: 'units/second',
    },
  ];
  return candidates.filter((offer) => offer.newValue > offer.currentValue);
}
