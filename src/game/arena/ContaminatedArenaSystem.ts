import { CONTAMINATED_OBJECT_CONFIG } from '../core/GameConfig';
import type { ArenaObstacle } from '../core/GameConfig';
import type { ArenaLayoutDefinition } from './ArenaSystem';

export interface ContaminatedEntityBase {
  readonly id: string;
  readonly kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  readonly rotation: number;
}

export interface ContaminatedDamageState {
  health: number;
  readonly maxHealth: number;
  destroyed: boolean;
}

export interface ContaminatedPuddleEntity extends ContaminatedEntityBase {
  readonly kind: 'contaminated-puddle';
  radiusX: number;
  radiusY: number;
  intensity: number;
  ageSeconds: number;
  remainingSeconds: number;
  readonly durationSeconds: number;
  readonly damage: number;
  readonly damageIntervalSeconds: number;
  readonly slowMultiplier: number;
  readonly visualSeed: number;
  readonly damageCooldowns: Record<string, number>;
}

export interface ToxicBarrelEntity extends ContaminatedEntityBase, ContaminatedDamageState {
  readonly kind: 'toxic-barrel';
  ruptureRemainingSeconds: number;
  readonly ruptureDurationSeconds: number;
  puddleId?: string;
}

export interface ToxicCloudEntity {
  x: number;
  y: number;
  directionX: number;
  directionY: number;
  baseDirectionX: number;
  baseDirectionY: number;
  windInfluenceX: number;
  windInfluenceY: number;
  radiusX: number;
  radiusY: number;
  readonly damage: number;
  readonly damageIntervalSeconds: number;
  ageSeconds: number;
  remainingSeconds: number;
  readonly durationSeconds: number;
  density: number;
  readonly damageCooldowns: Record<string, number>;
}

export interface ChemicalTankEntity extends ContaminatedEntityBase, ContaminatedDamageState {
  readonly kind: 'chemical-tank';
  pressure: number;
  ruptureRemainingSeconds: number;
  readonly ruptureDurationSeconds: number;
  cloud?: ToxicCloudEntity;
}

export interface MutagenSpillEntity {
  ageSeconds: number;
  remainingSeconds: number;
  readonly durationSeconds: number;
  radius: number;
  radiusX: number;
  radiusY: number;
}

export interface MutagenContainerEntity extends ContaminatedEntityBase, ContaminatedDamageState {
  readonly kind: 'mutagen-container';
  contentsIntensity: number;
  ruptureRemainingSeconds: number;
  readonly ruptureDurationSeconds: number;
  spawnBurstRemainingSeconds: number;
  readonly spawnBurstDurationSeconds: number;
  spill?: MutagenSpillEntity;
  readonly damageCooldowns: Record<string, number>;
}

export type ContaminatedCyclePhase = 'idle' | 'warning' | 'active' | 'cooldown';

export interface LeakingPipeEntity extends ContaminatedEntityBase {
  readonly kind: 'leaking-pipe';
  phase: 'idle' | 'warning' | 'spraying' | 'cooldown';
  phaseRemainingSeconds: number;
  phaseProgress: number;
  readonly directionX: number;
  readonly directionY: number;
  readonly leakX: number;
  readonly leakY: number;
  readonly damageCooldowns: Record<string, number>;
}

export interface BiohazardWasteBinEntity extends ContaminatedEntityBase, ContaminatedDamageState {
  readonly kind: 'biohazard-waste-bin';
  ruptureRemainingSeconds: number;
  readonly ruptureDurationSeconds: number;
  puddleId?: string;
}

export interface BrokenVentilationFanEntity extends ContaminatedEntityBase {
  readonly kind: 'broken-ventilation-fan';
  phase: ContaminatedCyclePhase;
  phaseRemainingSeconds: number;
  phaseProgress: number;
  directionAngle: number;
  burstIndex: number;
  readonly visualSeed: number;
  pushedActorIds: number[];
}

export type ContaminatedArenaEntity =
  | ToxicBarrelEntity
  | ChemicalTankEntity
  | MutagenContainerEntity
  | LeakingPipeEntity
  | ContaminatedPuddleEntity
  | BiohazardWasteBinEntity
  | BrokenVentilationFanEntity;

const OBJECT_PLACEMENTS = [
  { x: 0.1, y: 0.12 },
  { x: 0.9, y: 0.12 },
  { x: 0.1, y: 0.88 },
  { x: 0.9, y: 0.88 },
  { x: 0.5, y: 0.1 },
  { x: 0.5, y: 0.9 },
  { x: 0.1, y: 0.5 },
  { x: 0.9, y: 0.5 },
  { x: 0.25, y: 0.1 },
  { x: 0.75, y: 0.1 },
  { x: 0.25, y: 0.9 },
  { x: 0.75, y: 0.9 },
] as const;

interface PlacedContaminatedBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function overlapsObstacle(
  x: number,
  y: number,
  width: number,
  height: number,
  obstacle: ArenaObstacle,
  arenaWidth: number,
  arenaHeight: number,
): boolean {
  const obstacleWidth = obstacle.width;
  const obstacleHeight = obstacle.height;
  return Math.abs(x - arenaWidth * obstacle.xFraction) <
      (width + obstacleWidth) / 2 + 8 &&
    Math.abs(y - arenaHeight * obstacle.yFraction) <
      (height + obstacleHeight) / 2 + 8;
}

function getPlacement(
  placementIndex: number,
  width: number,
  height: number,
  objectWidth: number,
  objectHeight: number,
  layout: ArenaLayoutDefinition,
  occupied: readonly PlacedContaminatedBounds[],
): { readonly x: number; readonly y: number } {
  const preferred = OBJECT_PLACEMENTS[placementIndex]!;
  const ordered = [
    preferred,
    ...OBJECT_PLACEMENTS.filter((placement) => placement !== preferred),
  ];
  for (const placement of ordered) {
    const x = Math.max(
      objectWidth / 2 + 4,
      Math.min(width - objectWidth / 2 - 4, width * placement.x),
    );
    const y = Math.max(
      objectHeight / 2 + 4,
      Math.min(height - objectHeight / 2 - 4, height * placement.y),
    );
    const blockedByObstacle = layout.obstacles.some((obstacle) =>
      overlapsObstacle(x, y, objectWidth, objectHeight,
        obstacle, width, height),
    );
    const blockedByBarrel = layout.barrels.some((barrel) =>
      Math.hypot(
        x - width * barrel.xFraction,
        y - height * barrel.yFraction,
      ) < Math.max(objectWidth, objectHeight) / 2 + 24,
    );
    const blockedByObject = occupied.some((other) =>
      Math.abs(x - other.x) < (objectWidth + other.width) / 2 + 12 &&
      Math.abs(y - other.y) < (objectHeight + other.height) / 2 + 12,
    );
    if (!blockedByObstacle && !blockedByBarrel && !blockedByObject) {
      return { x, y };
    }
  }
  throw new RangeError(`Unable to place contaminated object in layout "${layout.id}".`);
}

function base(
  layout: ArenaLayoutDefinition,
  kind: ContaminatedArenaEntity['kind'],
  index: number,
  placementIndex: number,
  width: number,
  height: number,
  objectWidth: number,
  objectHeight: number,
  occupied: PlacedContaminatedBounds[],
  rotation = 0,
): ContaminatedEntityBase {
  const position = getPlacement(
    placementIndex, width, height, objectWidth, objectHeight, layout, occupied,
  );
  occupied.push({
    ...position,
    width: objectWidth,
    height: objectHeight,
  });
  return {
    id: `${layout.id}-${kind}-${index}`,
    kind,
    x: position.x,
    y: position.y,
    width: objectWidth,
    height: objectHeight,
    rotation,
  };
}

function makePuddle(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  durationSeconds: number,
  damage: number,
  damageIntervalSeconds: number,
  slowMultiplier: number,
  seed: number,
): ContaminatedPuddleEntity {
  return {
    id,
    kind: 'contaminated-puddle',
    x,
    y,
    width: width * 2,
    height: height * 2,
    radiusX: width,
    radiusY: height,
    rotation: 0,
    intensity: 1,
    ageSeconds: 0,
    remainingSeconds: durationSeconds,
    durationSeconds,
    damage,
    damageIntervalSeconds,
    slowMultiplier,
    visualSeed: seed,
    damageCooldowns: {},
  };
}

export function createContaminatedArenaObjects(
  layout: ArenaLayoutDefinition,
  width: number,
  height: number,
): ContaminatedArenaEntity[] {
  if (layout.theme !== 'contaminated' || width <= 0 || height <= 0) return [];
  const toxicBarrelConfig = CONTAMINATED_OBJECT_CONFIG.toxicBarrel;
  const chemicalTankConfig = CONTAMINATED_OBJECT_CONFIG.chemicalTank;
  const mutagenConfig = CONTAMINATED_OBJECT_CONFIG.mutagenContainer;
  const pipeConfig = CONTAMINATED_OBJECT_CONFIG.leakingPipe;
  const puddleConfig = CONTAMINATED_OBJECT_CONFIG.contaminatedPuddle;
  const wasteBinConfig = CONTAMINATED_OBJECT_CONFIG.biohazardWasteBin;
  const fanConfig = CONTAMINATED_OBJECT_CONFIG.brokenVentilationFan;
  const occupied: PlacedContaminatedBounds[] = [];

  const barrel = base(
    layout, 'toxic-barrel', 1, 0, width, height,
    toxicBarrelConfig.width, toxicBarrelConfig.height, occupied,
  );
  const tank = base(
    layout, 'chemical-tank', 1, 1, width, height,
    chemicalTankConfig.width, chemicalTankConfig.height, occupied,
  );
  const mutagen = base(
    layout, 'mutagen-container', 1, 2, width, height,
    mutagenConfig.width, mutagenConfig.height, occupied,
  );
  const wasteBin = base(
    layout, 'biohazard-waste-bin', 1, 3, width, height,
    wasteBinConfig.width, wasteBinConfig.height, occupied,
  );
  const pipe = base(
    layout, 'leaking-pipe', 1, 4, width, height,
    pipeConfig.width, pipeConfig.height, occupied, Math.PI / 2,
  );
  const fan = base(
    layout, 'broken-ventilation-fan', 1, 5, width, height,
    fanConfig.width, fanConfig.height, occupied, -Math.PI / 2,
  );
  const puddlePosition = getPlacement(
    6, width, height, puddleConfig.radiusX * 2, puddleConfig.radiusY * 2,
    layout, occupied,
  );
  occupied.push({
    ...puddlePosition,
    width: puddleConfig.radiusX * 2,
    height: puddleConfig.radiusY * 2,
  });

  return [
    {
      ...barrel,
      kind: 'toxic-barrel',
      health: toxicBarrelConfig.health,
      maxHealth: toxicBarrelConfig.health,
      destroyed: false,
      ruptureRemainingSeconds: 0,
      ruptureDurationSeconds: 0.6,
    },
    {
      ...tank,
      kind: 'chemical-tank',
      health: chemicalTankConfig.health,
      maxHealth: chemicalTankConfig.health,
      destroyed: false,
      pressure: 0.22,
      ruptureRemainingSeconds: 0,
      ruptureDurationSeconds: 0.9,
    },
    {
      ...mutagen,
      kind: 'mutagen-container',
      health: mutagenConfig.health,
      maxHealth: mutagenConfig.health,
      destroyed: false,
      contentsIntensity: 0.55,
      ruptureRemainingSeconds: 0,
      ruptureDurationSeconds: 0.9,
      spawnBurstRemainingSeconds: 0,
      spawnBurstDurationSeconds: 0.9,
      damageCooldowns: {},
    },
    {
      ...pipe,
      kind: 'leaking-pipe',
      phase: 'idle',
      phaseRemainingSeconds: 2,
      phaseProgress: 0,
      directionX: 0,
      directionY: 1,
      leakX: pipe.width * 0.08,
      leakY: 0,
      damageCooldowns: {},
    },
    makePuddle(
      `${layout.id}-contaminated-puddle-1`,
      puddlePosition.x,
      puddlePosition.y,
      puddleConfig.radiusX,
      puddleConfig.radiusY,
      puddleConfig.durationSeconds,
      puddleConfig.playerDamage,
      puddleConfig.playerDamageIntervalSeconds,
      puddleConfig.zombieSlowMultiplier,
      101,
    ),
    {
      ...wasteBin,
      kind: 'biohazard-waste-bin',
      health: wasteBinConfig.health,
      maxHealth: wasteBinConfig.health,
      destroyed: false,
      ruptureRemainingSeconds: 0,
      ruptureDurationSeconds: 0.75,
    },
    {
      ...fan,
      kind: 'broken-ventilation-fan',
      phase: 'idle',
      phaseRemainingSeconds: fanConfig.idleDurationSeconds,
      phaseProgress: 0,
      directionAngle: -Math.PI / 2,
      burstIndex: 0,
      visualSeed: 211,
      pushedActorIds: [],
    },
  ];
}

export function createContaminatedPuddle(
  id: string,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  durationSeconds: number,
  damage: number,
  damageIntervalSeconds: number,
  slowMultiplier: number,
  visualSeed: number,
): ContaminatedPuddleEntity {
  return makePuddle(
    id, x, y, radiusX, radiusY, durationSeconds, damage,
    damageIntervalSeconds, slowMultiplier, visualSeed,
  );
}

export function getContaminatedEntityCenter(
  entity: ContaminatedArenaEntity,
): { readonly x: number; readonly y: number } {
  return { x: entity.x, y: entity.y };
}

export function getContaminatedEntityRadius(
  entity: ContaminatedArenaEntity,
): number {
  return Math.max(entity.width, entity.height) * 0.5;
}

export function getContaminatedDamageKey(actorId: number | 'player'): string {
  return actorId === 'player' ? 'player' : `zombie-${actorId}`;
}

export function createToxicCloud(
  id: string,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
): ToxicCloudEntity {
  const config = CONTAMINATED_OBJECT_CONFIG.chemicalTank;
  const directionLength = Math.hypot(directionX, directionY) || 1;
  return {
    x,
    y,
    directionX: directionX / directionLength,
    directionY: directionY / directionLength,
    baseDirectionX: directionX / directionLength,
    baseDirectionY: directionY / directionLength,
    windInfluenceX: 0,
    windInfluenceY: 0,
    radiusX: config.cloudRadiusX,
    radiusY: config.cloudRadiusY,
    damage: config.cloudDamage,
    damageIntervalSeconds: config.cloudDamageIntervalSeconds,
    ageSeconds: 0,
    remainingSeconds: config.cloudDurationSeconds,
    durationSeconds: config.cloudDurationSeconds,
    density: 1,
    damageCooldowns: { [`source-${id}`]: 0 },
  };
}

export function cloneContaminatedArenaEntity(
  entity: ContaminatedArenaEntity,
): ContaminatedArenaEntity {
  switch (entity.kind) {
    case 'chemical-tank':
      return {
        ...entity,
        ...(entity.cloud
          ? {
              cloud: {
                ...entity.cloud,
                damageCooldowns: { ...entity.cloud.damageCooldowns },
              },
            }
          : {}),
      };
    case 'mutagen-container':
      return {
        ...entity,
        ...(entity.spill ? { spill: { ...entity.spill } } : {}),
        damageCooldowns: { ...entity.damageCooldowns },
      };
    case 'contaminated-puddle':
    case 'leaking-pipe':
      return {
        ...entity,
        damageCooldowns: { ...entity.damageCooldowns },
      };
    case 'broken-ventilation-fan':
      return { ...entity, pushedActorIds: [...entity.pushedActorIds] };
    case 'toxic-barrel':
    case 'biohazard-waste-bin':
      return { ...entity };
  }
}
