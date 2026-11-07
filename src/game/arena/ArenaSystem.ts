import {
  ARENA_TRANSITION_SECONDS,
  ARENA_INTERACTION_CONFIG,
  INDUSTRIAL_OBJECT_CONFIG,
  MILITARY_OBJECT_CONFIG,
  ARENA_OBSTACLES,
  type ArenaObstacle,
} from '../core/GameConfig';

export {
  ARENA_INTERACTION_CONFIG,
  ARENA_TRANSITION_SECONDS,
} from '../core/GameConfig';

export interface ArenaObstacleEntity extends ArenaObstacle {
  health?: number;
  readonly maxHealth?: number;
  readonly industrialMotion?: {
    readonly originXFraction: number;
    readonly originYFraction: number;
    readonly angle: number;
    readonly amplitude: number;
    readonly phase: number;
    readonly pathMode: 'loop' | 'pingPong';
  };
}

export interface ExplosiveBarrelEntity {
  readonly id: string;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly radius: number;
  health: number;
  readonly maxHealth: number;
}

export interface IndustrialGasCylinderEntity {
  readonly id: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  radius: number;
  phase: 'idle' | 'flying' | 'detonating';
  directionX: number;
  directionY: number;
  remainingSeconds: number;
  cooldownSeconds: number;
  readonly hitActorIds: number[];
}

export interface OilFirePatchEntity {
  readonly id: number;
  readonly barrelId: string;
  x: number;
  y: number;
  radius: number;
  remainingSeconds: number;
}

interface MilitaryOutpostObjectBase {
  readonly id: string;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export interface MilitarySandbagEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'sandbag-barricade';
  health: number;
  readonly maxHealth: number;
  destroyed: boolean;
  spillRemainingSeconds: number;
}

export interface MilitaryAmmoCrateEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'military-ammo-crate';
  health: number;
  readonly maxHealth: number;
  destroyed: boolean;
  explosionRemainingSeconds: number;
  rewardSpawned: boolean;
  rewardItemId?: number;
}

export interface MilitaryFuelDrumEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'fuel-drum';
  health: number;
  readonly maxHealth: number;
  destroyed: boolean;
  phase: 'idle' | 'igniting' | 'blast' | 'aftermath' | 'finished';
  phaseRemainingSeconds: number;
  blastDamageApplied: boolean;
  rewardSpawned: boolean;
  rewardItemId?: number;
}

export interface MilitaryRazorWireEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'razor-wire';
  active: boolean;
}

export interface MilitaryTurretEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'abandoned-turret';
  health: number;
  readonly maxHealth: number;
  state: 'broken' | 'revive-ready' | 'reviving' | 'active' | 'firing' | 'damaged' | 'destroyed';
  reviveProgress: number;
  attackCooldownSeconds: number;
  facingAngle: number;
  muzzleFlashSeconds: number;
}

export interface MilitarySupplyCrateEntity extends MilitaryOutpostObjectBase {
  readonly kind: 'military-supply-crate';
  health: number;
  readonly maxHealth: number;
  destroyed: boolean;
  destructionRemainingSeconds: number;
  rewardSpawned: boolean;
}

export type MilitaryOutpostEntity =
  | MilitarySandbagEntity
  | MilitaryAmmoCrateEntity
  | MilitaryFuelDrumEntity
  | MilitaryRazorWireEntity
  | MilitaryTurretEntity
  | MilitarySupplyCrateEntity;

export type ArenaThemeId =
  | 'military'
  | 'industrial'
  | 'contaminated'
  | 'urban'
  | 'bunker';

export interface ArenaTheme {
  readonly id: ArenaThemeId;
  readonly name: string;
  readonly floor: string;
  readonly grid: string;
  readonly boundary: string;
  readonly innerBoundary: string;
  readonly marking: string;
  readonly accent: string;
  readonly detail: string;
  readonly highlight: string;
  readonly shadow: string;
}

export interface ArenaLayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: ArenaThemeId;
  readonly obstacles: ArenaObstacle[];
  readonly barrels: ReadonlyArray<Pick<ExplosiveBarrelEntity, 'id' | 'xFraction' | 'yFraction'>>;
  readonly gasCylinders?: ReadonlyArray<{ readonly xFraction: number; readonly yFraction: number }>;
}

export const ARENA_THEME_CYCLE: readonly ArenaTheme[] = [
  {
    id: 'military',
    name: 'Military Outpost',
    floor: '#202F36',
    grid: 'rgba(139, 190, 177, 0.075)',
    boundary: '#79A99A',
    innerBoundary: 'rgba(10, 23, 29, 0.68)',
    marking: 'rgba(239, 195, 119, 0.12)',
    accent: 'rgba(113, 190, 165, 0.13)',
    detail: '#A8C7A7',
    highlight: '#D9D6A5',
    shadow: 'rgba(5, 13, 20, 0.48)',
  },
  {
    id: 'industrial',
    name: 'Industrial Complex',
    floor: '#30262A',
    grid: 'rgba(205, 145, 112, 0.075)',
    boundary: '#B77B62',
    innerBoundary: 'rgba(19, 15, 22, 0.72)',
    marking: 'rgba(255, 174, 92, 0.15)',
    accent: 'rgba(225, 125, 83, 0.14)',
    detail: '#C59A7B',
    highlight: '#E6B78C',
    shadow: 'rgba(12, 8, 15, 0.52)',
  },
  {
    id: 'contaminated',
    name: 'Contaminated Zone',
    floor: '#202F32',
    grid: 'rgba(151, 213, 153, 0.07)',
    boundary: '#79B69A',
    innerBoundary: 'rgba(8, 22, 22, 0.72)',
    marking: 'rgba(194, 226, 119, 0.12)',
    accent: 'rgba(132, 210, 139, 0.13)',
    detail: '#A5D0A1',
    highlight: '#D8E9A2',
    shadow: 'rgba(5, 15, 18, 0.52)',
  },
  {
    id: 'urban',
    name: 'Urban Ruins',
    floor: '#302B35',
    grid: 'rgba(190, 157, 183, 0.075)',
    boundary: '#A98B9D',
    innerBoundary: 'rgba(19, 15, 25, 0.72)',
    marking: 'rgba(232, 151, 132, 0.12)',
    accent: 'rgba(209, 139, 151, 0.12)',
    detail: '#C4A5A6',
    highlight: '#E1C1AC',
    shadow: 'rgba(12, 8, 17, 0.52)',
  },
  {
    id: 'bunker',
    name: 'Underground Bunker',
    floor: '#202B3B',
    grid: 'rgba(130, 184, 218, 0.075)',
    boundary: '#78A9C6',
    innerBoundary: 'rgba(7, 15, 28, 0.76)',
    marking: 'rgba(117, 210, 218, 0.13)',
    accent: 'rgba(104, 174, 210, 0.14)',
    detail: '#A4C6D4',
    highlight: '#D1E7E7',
    shadow: 'rgba(4, 10, 21, 0.55)',
  },
];

const THEME_LAYOUTS: Readonly<Record<ArenaThemeId, readonly ArenaLayoutDefinition[]>> = {
  military: [
    { id: 'military-open-centre', name: 'Open Centre', theme: 'military', obstacles: [
      { xFraction: 0.18, yFraction: 0.25, width: 62, height: 74, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.2, width: 74, height: 62, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.77, width: 68, height: 60, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.8, width: 70, height: 64, kind: 'crate' },
      { xFraction: 0.73, yFraction: 0.3, width: 92, height: 24, kind: 'barricade' },
      { xFraction: 0.3, yFraction: 0.72, width: 82, height: 24, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 36, height: 22, kind: 'cover' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.5, yFraction: 0.2 }, { id: 'military-barrel-2', xFraction: 0.58, yFraction: 0.2 }] },
    { id: 'military-corridor-network', name: 'Corridor Network', theme: 'military', obstacles: [
      { xFraction: 0.27, yFraction: 0.28, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.72, yFraction: 0.28, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.27, yFraction: 0.72, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.72, yFraction: 0.72, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.45, yFraction: 0.5, width: 50, height: 44, kind: 'crate' },
      { xFraction: 0.55, yFraction: 0.5, width: 50, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.28, width: 90, height: 26, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.72, width: 90, height: 26, kind: 'wall' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.36, yFraction: 0.5 }, { id: 'military-barrel-2', xFraction: 0.64, yFraction: 0.5 }] },
    { id: 'military-scattered-cover', name: 'Scattered Cover', theme: 'military', obstacles: [
      { xFraction: 0.18, yFraction: 0.35, width: 52, height: 34, kind: 'cover' },
      { xFraction: 0.36, yFraction: 0.18, width: 42, height: 28, kind: 'crate' },
      { xFraction: 0.68, yFraction: 0.26, width: 56, height: 42, kind: 'cover' },
      { xFraction: 0.8, yFraction: 0.64, width: 54, height: 38, kind: 'crate' },
      { xFraction: 0.26, yFraction: 0.75, width: 58, height: 34, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.48, width: 90, height: 16, kind: 'barricade' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.44, yFraction: 0.18 }, { id: 'military-barrel-2', xFraction: 0.58, yFraction: 0.84 }] },
    { id: 'military-central-structure', name: 'Central Structure', theme: 'military', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 150, height: 110, kind: 'wall' },
      { xFraction: 0.25, yFraction: 0.24, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.24, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.76, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.76, width: 76, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'military-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
  ],
  industrial: [
    { id: 'industrial-open-centre', name: 'Open Centre', theme: 'industrial', obstacles: [
      { xFraction: 0.16, yFraction: 0.23, width: 88, height: 62, kind: 'wall' },
      { xFraction: 0.84, yFraction: 0.23, width: 80, height: 52, kind: 'wall' },
      { xFraction: 0.16, yFraction: 0.78, width: 82, height: 56, kind: 'wall' },
      { xFraction: 0.84, yFraction: 0.78, width: 90, height: 58, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.22, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.78, width: 104, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 44, height: 28, kind: 'cover' },
      { xFraction: 0.33, yFraction: 0.36, width: 44, height: 38, kind: 'crate' },
      { xFraction: 0.67, yFraction: 0.64, width: 44, height: 38, kind: 'crate' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.34, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.66, yFraction: 0.5 }], gasCylinders: [{ xFraction: 0.5, yFraction: 0.36 }] },
    { id: 'industrial-cluster-split', name: 'Industrial Cluster', theme: 'industrial', obstacles: [
      { xFraction: 0.3, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.3, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 52, height: 52, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.18, width: 110, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 110, height: 20, kind: 'barricade' },
      { xFraction: 0.2, yFraction: 0.5, width: 44, height: 40, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.5, width: 44, height: 40, kind: 'crate' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.5, yFraction: 0.32 }, { id: 'ind-barrel-2', xFraction: 0.5, yFraction: 0.68 }], gasCylinders: [{ xFraction: 0.22, yFraction: 0.5 }, { xFraction: 0.78, yFraction: 0.5 }] },
    { id: 'industrial-corridor', name: 'Corridor Grid', theme: 'industrial', obstacles: [
      { xFraction: 0.24, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.24, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.26, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.74, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 42, height: 34, kind: 'cover' },
      { xFraction: 0.3, yFraction: 0.5, width: 44, height: 38, kind: 'crate' },
      { xFraction: 0.7, yFraction: 0.5, width: 44, height: 38, kind: 'crate' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.62, yFraction: 0.5 }], gasCylinders: [{ xFraction: 0.34, yFraction: 0.35 }, { xFraction: 0.66, yFraction: 0.65 }] },
    { id: 'industrial-rust-scrap', name: 'Rust Scrap', theme: 'industrial', obstacles: [
      { xFraction: 0.2, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.5, width: 120, height: 30, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.33, width: 66, height: 26, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.67, width: 66, height: 26, kind: 'cover' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.42, yFraction: 0.42 }, { id: 'ind-barrel-2', xFraction: 0.58, yFraction: 0.58 }], gasCylinders: [{ xFraction: 0.34, yFraction: 0.2 }, { xFraction: 0.66, yFraction: 0.8 }] },
  ],
  contaminated: [
    { id: 'contaminated-open-lab', name: 'Open Lab', theme: 'contaminated', obstacles: [
      { xFraction: 0.25, yFraction: 0.26, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.26, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.25, yFraction: 0.74, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.74, width: 52, height: 50, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.3, width: 100, height: 14, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.7, width: 100, height: 14, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 34, height: 30, kind: 'cover' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.36, yFraction: 0.5 }, { id: 'cont-barrel-2', xFraction: 0.64, yFraction: 0.5 }] },
    { id: 'contaminated-split-lab', name: 'Split Laboratory', theme: 'contaminated', obstacles: [
      { xFraction: 0.34, yFraction: 0.32, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.66, yFraction: 0.68, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.65, yFraction: 0.32, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.35, yFraction: 0.68, width: 72, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 22, height: 150, kind: 'wall' },
      { xFraction: 0.28, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.72, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.5, yFraction: 0.18 }, { id: 'cont-barrel-2', xFraction: 0.5, yFraction: 0.82 }] },
    { id: 'contaminated-scattered-tanks', name: 'Scattered Tanks', theme: 'contaminated', obstacles: [
      { xFraction: 0.2, yFraction: 0.2, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.82, yFraction: 0.2, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.2, yFraction: 0.8, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.82, yFraction: 0.8, width: 54, height: 46, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.25, width: 84, height: 16, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 84, height: 16, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 58, height: 58, kind: 'crate' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.44, yFraction: 0.5 }, { id: 'cont-barrel-2', xFraction: 0.56, yFraction: 0.5 }] },
    { id: 'contaminated-central-structure', name: 'Central Containment', theme: 'contaminated', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 126, height: 104, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.5, width: 42, height: 42, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.18, width: 68, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 68, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.34, width: 20, height: 90, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.66, width: 20, height: 90, kind: 'cover' },
    ], barrels: [{ id: 'cont-barrel-1', xFraction: 0.38, yFraction: 0.34 }, { id: 'cont-barrel-2', xFraction: 0.62, yFraction: 0.66 }] },
  ],
  urban: [
    { id: 'urban-open-road', name: 'Open Road', theme: 'urban', obstacles: [
      { xFraction: 0.18, yFraction: 0.3, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.3, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.18, yFraction: 0.7, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.7, width: 64, height: 54, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.25, width: 108, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 108, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 52, height: 18, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.5 }] },
    { id: 'urban-rubble-lane', name: 'Rubble Lane', theme: 'urban', obstacles: [
      { xFraction: 0.25, yFraction: 0.25, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.25, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.75, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.75, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.35, yFraction: 0.5, width: 60, height: 52, kind: 'crate' },
      { xFraction: 0.65, yFraction: 0.5, width: 60, height: 52, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.5, width: 22, height: 120, kind: 'wall' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.44, yFraction: 0.5 }, { id: 'urban-barrel-2', xFraction: 0.56, yFraction: 0.5 }] },
    { id: 'urban-ruined-block', name: 'Ruined Block', theme: 'urban', obstacles: [
      { xFraction: 0.2, yFraction: 0.2, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.2, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.8, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.8, width: 82, height: 70, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 70, height: 26, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.35, width: 40, height: 28, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.65, width: 40, height: 28, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.18 }, { id: 'urban-barrel-2', xFraction: 0.5, yFraction: 0.82 }] },
    { id: 'urban-roadblock-loop', name: 'Roadblock Loop', theme: 'urban', obstacles: [
      { xFraction: 0.25, yFraction: 0.5, width: 54, height: 62, kind: 'crate' },
      { xFraction: 0.75, yFraction: 0.5, width: 54, height: 62, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.23, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.77, width: 110, height: 18, kind: 'barricade' },
      { xFraction: 0.42, yFraction: 0.5, width: 20, height: 100, kind: 'wall' },
      { xFraction: 0.58, yFraction: 0.5, width: 20, height: 100, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 36, height: 28, kind: 'cover' },
    ], barrels: [{ id: 'urban-barrel-1', xFraction: 0.5, yFraction: 0.34 }, { id: 'urban-barrel-2', xFraction: 0.5, yFraction: 0.66 }] },
  ],
  bunker: [
    { id: 'bunker-open-bay', name: 'Open Bay', theme: 'bunker', obstacles: [
      { xFraction: 0.2, yFraction: 0.28, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.28, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.2, yFraction: 0.72, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.8, yFraction: 0.72, width: 76, height: 54, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.2, width: 120, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.8, width: 120, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 46, height: 34, kind: 'cover' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'bunker-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'bunker-split-hall', name: 'Split Hall', theme: 'bunker', obstacles: [
      { xFraction: 0.34, yFraction: 0.34, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.66, yFraction: 0.66, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.66, yFraction: 0.34, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.34, yFraction: 0.66, width: 52, height: 94, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 110, height: 30, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.18, width: 90, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 90, height: 18, kind: 'barricade' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.5, yFraction: 0.22 }, { id: 'bunker-barrel-2', xFraction: 0.5, yFraction: 0.78 }] },
    { id: 'bunker-core-structure', name: 'Core Structure', theme: 'bunker', obstacles: [
      { xFraction: 0.5, yFraction: 0.5, width: 176, height: 132, kind: 'wall' },
      { xFraction: 0.25, yFraction: 0.32, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.32, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.25, yFraction: 0.68, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.75, yFraction: 0.68, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.2, width: 48, height: 40, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.8, width: 48, height: 40, kind: 'crate' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'bunker-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'bunker-perimeter-defence', name: 'Perimeter Defence', theme: 'bunker', obstacles: [
      { xFraction: 0.16, yFraction: 0.2, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.84, yFraction: 0.2, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.16, yFraction: 0.8, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.84, yFraction: 0.8, width: 54, height: 40, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.25, width: 120, height: 17, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.75, width: 120, height: 17, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 80, height: 16, kind: 'wall' },
    ], barrels: [{ id: 'bunker-barrel-1', xFraction: 0.5, yFraction: 0.38 }, { id: 'bunker-barrel-2', xFraction: 0.5, yFraction: 0.62 }] },
  ],
} as const;

export function getArenaTheme(waveNumber: number): ArenaTheme {
  if (!Number.isInteger(waveNumber) || waveNumber < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  const themeIndex = Math.floor(waveNumber / 10) % ARENA_THEME_CYCLE.length;
  return ARENA_THEME_CYCLE[themeIndex]!;
}

export function getArenaLayoutPool(themeId: ArenaThemeId): readonly ArenaLayoutDefinition[] {
  return THEME_LAYOUTS[themeId] ?? THEME_LAYOUTS.military;
}

export function createArenaLayoutForWave(
  waveNumber: number,
  previousLayoutId?: string,
): ArenaLayoutDefinition {
  const theme = getArenaTheme(waveNumber);
  const pool = getArenaLayoutPool(theme.id);
  const baseIndex = ((waveNumber - 1) * 3) % pool.length;
  const orderedCandidates = Array.from({ length: pool.length }, (_, offset) => {
    const index = (baseIndex + offset) % pool.length;
    return pool[index]!;
  });
  const preferred = orderedCandidates.find((layout) => layout.id !== previousLayoutId);
  return preferred ?? pool[0]!;
}

export function createArenaLayoutForLevel(levelId: number): ArenaLayoutDefinition {
  if (!Number.isInteger(levelId) || levelId < 1 || levelId > 30) {
    throw new RangeError('Level ID must be an integer between 1 and 30.');
  }

  const theme = ARENA_THEME_CYCLE[Math.floor((levelId - 1) / 10)]!;
  const layouts = getArenaLayoutPool(theme.id);
  const levelWithinTheme = (levelId - 1) % 10;
  const baseLayout = layouts[levelWithinTheme % layouts.length]!;
  const transform = Math.floor(levelWithinTheme / layouts.length);
  const rotate = transform > 0;
  const mirror = transform > 1;
  const mapPoint = (xFraction: number, yFraction: number) => {
    const x = mirror ? 1 - xFraction : xFraction;
    return rotate
      ? { xFraction: yFraction, yFraction: 1 - x }
      : { xFraction: x, yFraction };
  };

  return {
    ...baseLayout,
    id: `level-${levelId}-${baseLayout.id}`,
    name: `${baseLayout.name}${transform === 0 ? '' : ` ${rotate ? 'Rotated' : ''}${mirror ? ' Mirrored' : ''}`}`,
    obstacles: baseLayout.obstacles.map((obstacle) => ({
      ...obstacle,
      ...mapPoint(obstacle.xFraction, obstacle.yFraction),
      ...(rotate ? { width: obstacle.height, height: obstacle.width } : {}),
    })),
    barrels: baseLayout.barrels.map((barrel) => ({
      ...barrel,
      ...mapPoint(barrel.xFraction, barrel.yFraction),
    })),
    gasCylinders: (baseLayout.gasCylinders ?? []).map((cylinder) => ({
      ...cylinder,
      ...mapPoint(cylinder.xFraction, cylinder.yFraction),
    })),
  };
}

export function createArenaObstacles(
  waveNumber = 1,
  previousLayoutId?: string,
): ArenaObstacleEntity[] {
  const layout = createArenaLayoutForWave(waveNumber, previousLayoutId);
  return createArenaObstacleEntities(layout.obstacles, layout.theme);
}

export function createArenaObstacleEntities(
  obstacles: readonly ArenaObstacle[],
  theme: ArenaThemeId,
): ArenaObstacleEntity[] {
  return obstacles.map((obstacle, index) => {
    if (theme === 'industrial' && obstacle.kind === 'wall') {
      return {
        ...obstacle,
        industrialMotion: {
          originXFraction: obstacle.xFraction,
          originYFraction: obstacle.yFraction,
          angle: index % 2 === 0 ? 0 : Math.PI / 2,
          amplitude: INDUSTRIAL_OBJECT_CONFIG.movingWall.amplitude,
          phase: index * 1.73,
          pathMode: index % 2 === 0 ? 'pingPong' : 'loop',
        },
      };
    }

    if (theme === 'industrial' && obstacle.kind === 'crate') {
      return {
        ...obstacle,
        health: ARENA_INTERACTION_CONFIG.industrialCrateHealth,
        maxHealth: ARENA_INTERACTION_CONFIG.industrialCrateHealth,
      };
    }

    if (obstacle.kind === 'barricade' && theme !== 'industrial') {
      return {
        ...obstacle,
        health: ARENA_INTERACTION_CONFIG.barricadeHealth,
        maxHealth: ARENA_INTERACTION_CONFIG.barricadeHealth,
      };
    }

    return { ...obstacle };
  });
}

export function createIndustrialGasCylinders(
  layout: ArenaLayoutDefinition,
  width: number,
  height: number,
): IndustrialGasCylinderEntity[] {
  if (layout.theme !== 'industrial') return [];
  return (layout.gasCylinders ?? []).map((position, index) => {
    const x = width * position.xFraction;
    const y = height * position.yFraction;
    return {
      id: index + 1,
      originX: x,
      originY: y,
      x,
      y,
      radius: INDUSTRIAL_OBJECT_CONFIG.gasCylinder.radius,
      phase: 'idle',
      directionX: 0,
      directionY: 0,
      remainingSeconds: 0,
      cooldownSeconds: 0.8 + index * 1.1,
      hitActorIds: [],
    };
  });
}

export function createExplosiveBarrels(
  waveNumber = 1,
  previousLayoutId?: string,
): ExplosiveBarrelEntity[] {
  const layout = createArenaLayoutForWave(waveNumber, previousLayoutId);
  return layout.barrels.map((barrel, index) => ({
    ...barrel,
    radius: ARENA_INTERACTION_CONFIG.barrelRadius,
    health: ARENA_INTERACTION_CONFIG.barrelHealth,
    maxHealth: ARENA_INTERACTION_CONFIG.barrelHealth,
    id: `${barrel.id}-${index}`,
  }));
}

export function getArenaCollisionObstacles(
  obstacles: readonly ArenaObstacleEntity[],
  barrels: readonly ExplosiveBarrelEntity[],
  militaryObjects: readonly MilitaryOutpostEntity[] = [],
): ArenaObstacle[] {
  return [
    ...obstacles.filter((obstacle) =>
      obstacle.health === undefined || obstacle.health > 0,
    ),
    ...barrels
      .filter((barrel) => barrel.health > 0)
      .map((barrel): ArenaObstacle => ({
        xFraction: barrel.xFraction,
        yFraction: barrel.yFraction,
        width: barrel.radius * 2,
        height: barrel.radius * 2,
        kind: 'barrel',
      })),
    ...militaryObjects
      .filter((object) => object.kind !== 'razor-wire' && (
        object.kind === 'abandoned-turret'
          ? object.state !== 'destroyed'
          : !object.destroyed
      ))
      .map((object): ArenaObstacle => ({
        xFraction: object.xFraction,
        yFraction: object.yFraction,
        width: object.width,
        height: object.height,
        kind: object.kind === 'sandbag-barricade' ? 'barricade' : 'crate',
      })),
  ];
}

export function createMilitaryOutpostObjects(
  theme: ArenaThemeId,
  arenaInstanceId = 'military',
  layout?: ArenaLayoutDefinition,
): MilitaryOutpostEntity[] {
  if (theme !== 'military') return [];
  const referenceWidth = 960;
  const referenceHeight = 540;
  const random = createArenaRandom(`${arenaInstanceId}-${Math.random()}`);
  const occupied: ArenaObstacle[] = [];
  const candidatePoints = Array.from({ length: 43 }, (_, index) =>
    0.08 + index * 0.02,
  )
    .flatMap((xFraction) =>
      Array.from({ length: 33 }, (_, index) => 0.1 + index * 0.025)
        .map((yFraction) => ({ xFraction, yFraction })),
    );
  const choosePosition = (width: number, height: number) => {
    const candidates = [...candidatePoints];
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [candidates[index], candidates[swapIndex]] =
        [candidates[swapIndex]!, candidates[index]!];
    }

    const isAvailable = (
      { xFraction, yFraction }: { readonly xFraction: number; readonly yFraction: number },
      checkLayout: boolean,
    ): boolean => {
      if (Math.abs(xFraction - 0.5) < 0.2 && Math.abs(yFraction - 0.5) < 0.2) {
        return false;
      }
      if (xFraction * 320 < width / 2 ||
          xFraction * 320 > 320 - width / 2 ||
          yFraction * 320 < height / 2 ||
          yFraction * 320 > 320 - height / 2) {
        return false;
      }
      const overlaps = (other: ArenaObstacle): boolean =>
        Math.abs(xFraction - other.xFraction) * referenceWidth <
          (width + other.width) / 2 &&
        Math.abs(yFraction - other.yFraction) * referenceHeight <
          (height + other.height) / 2;
      if (checkLayout && layout?.obstacles.some(overlaps)) return false;
      if (layout?.barrels.some((barrel) => overlaps({
        ...barrel,
        width: MILITARY_OBJECT_CONFIG.razorWire.width / 2,
        height: MILITARY_OBJECT_CONFIG.razorWire.width / 2,
        kind: 'barrel',
      }))) return false;
      return !occupied.some(overlaps);
    };
    const position = candidates.find((candidate) => isAvailable(candidate, true));

    if (!position) {
      throw new Error(`Unable to place military outpost object in arena "${arenaInstanceId}".`);
    }
    return position;
  };
  const addPlacement = (
    placements: MilitaryPlacement[],
    kind: MilitaryPlacement['kind'],
    width: number,
    height: number,
  ) => {
    const position = choosePosition(width, height);
    const placement = { ...position, kind, width, height, rotation: 0 };
    placements.push(placement);
    const turretWireClearance = kind === 'abandoned-turret'
      ? MILITARY_OBJECT_CONFIG.abandonedTurret.wireOffset * 2
      : 0;
    occupied.push({
      ...placement,
      width: width + turretWireClearance,
      height: height + turretWireClearance,
      kind: 'wall',
    });
    return position;
  };
  const placements: MilitaryPlacement[] = [];
  addPlacement(placements, 'sandbag-barricade',
    MILITARY_OBJECT_CONFIG.sandbag.width, MILITARY_OBJECT_CONFIG.sandbag.height);
  addPlacement(placements, 'military-ammo-crate',
    MILITARY_OBJECT_CONFIG.ammoCrate.width, MILITARY_OBJECT_CONFIG.ammoCrate.height);
  addPlacement(placements, 'fuel-drum',
    MILITARY_OBJECT_CONFIG.fuelDrum.width, MILITARY_OBJECT_CONFIG.fuelDrum.height);
  addPlacement(placements, 'military-supply-crate',
    MILITARY_OBJECT_CONFIG.supplyCrate.width, MILITARY_OBJECT_CONFIG.supplyCrate.height);

  for (let index = 0; index < 2; index += 1) {
    addPlacement(placements, 'abandoned-turret',
      MILITARY_OBJECT_CONFIG.abandonedTurret.width,
      MILITARY_OBJECT_CONFIG.abandonedTurret.height);
  }

  const verticalGroups = Array.from({ length: 3 }, () => random() < 0.5);
  if (verticalGroups.every(Boolean)) verticalGroups[0] = false;
  if (verticalGroups.every((vertical) => !vertical)) verticalGroups[0] = true;

  for (let groupIndex = 0; groupIndex < 3; groupIndex += 1) {
    const vertical = verticalGroups[groupIndex]!;
    const rowCount = random() < 0.5 ? 2 : 1;
    const rowWidths = Array.from({ length: rowCount }, () =>
      Math.round(MILITARY_OBJECT_CONFIG.razorWire.width * (0.7 + random() * 0.65)),
    );
    const rowThickness = MILITARY_OBJECT_CONFIG.razorWire.height;
    const groupWidth = Math.max(...rowWidths);
    const groupHeight = rowCount * rowThickness + Math.max(0, rowCount - 1) * 4;
    const position = choosePosition(groupWidth, groupHeight);
    rowWidths.forEach((width, rowIndex) => {
      const rowOffset = (rowIndex - (rowCount - 1) / 2) *
        (rowThickness + 4);
      const xFraction = position.xFraction +
        (vertical ? rowOffset / referenceWidth : 0);
      const yFraction = position.yFraction +
        (vertical ? 0 : rowOffset / referenceHeight);
      const placement = {
        kind: 'razor-wire' as const,
        xFraction,
        yFraction,
        width,
        height: rowThickness,
        rotation: vertical ? Math.PI / 2 : 0,
      };
      placements.push(placement);
      occupied.push({
        ...placement,
        width: vertical ? rowThickness : width,
        height: vertical ? width : rowThickness,
        kind: 'wall',
      });
    });
  }

  return placements.map((placement, index): MilitaryOutpostEntity => {
    const base = {
      id: `${arenaInstanceId}-${placement.kind}-${index + 1}`,
      xFraction: placement.xFraction,
      yFraction: placement.yFraction,
      width: placement.width,
      height: placement.height,
      rotation: placement.rotation,
    };
    switch (placement.kind) {
      case 'sandbag-barricade':
        return {
          ...base,
          kind: placement.kind,
          health: MILITARY_OBJECT_CONFIG.sandbag.health,
          maxHealth: MILITARY_OBJECT_CONFIG.sandbag.health,
          destroyed: false,
          spillRemainingSeconds: 0,
        };
      case 'military-ammo-crate':
        return {
          ...base,
          kind: placement.kind,
          health: MILITARY_OBJECT_CONFIG.ammoCrate.health,
          maxHealth: MILITARY_OBJECT_CONFIG.ammoCrate.health,
          destroyed: false,
          explosionRemainingSeconds: 0,
          rewardSpawned: false,
        };
      case 'fuel-drum':
        return {
          ...base,
          kind: placement.kind,
          health: MILITARY_OBJECT_CONFIG.fuelDrum.health,
          maxHealth: MILITARY_OBJECT_CONFIG.fuelDrum.health,
          destroyed: false,
          phase: 'idle',
          phaseRemainingSeconds: 0,
          blastDamageApplied: false,
          rewardSpawned: false,
        };
      case 'razor-wire':
        return {
          ...base,
          kind: placement.kind,
          active: true,
        };
      case 'abandoned-turret':
        return {
          ...base,
          kind: placement.kind,
          health: MILITARY_OBJECT_CONFIG.abandonedTurret.health,
          maxHealth: MILITARY_OBJECT_CONFIG.abandonedTurret.health,
          state: 'broken',
          reviveProgress: 0,
          attackCooldownSeconds: 0,
          facingAngle: 0,
          muzzleFlashSeconds: 0,
        };
      case 'military-supply-crate':
        return {
          ...base,
          kind: placement.kind,
          health: MILITARY_OBJECT_CONFIG.supplyCrate.health,
          maxHealth: MILITARY_OBJECT_CONFIG.supplyCrate.health,
          destroyed: false,
          destructionRemainingSeconds: 0,
          rewardSpawned: false,
        };
    }
  });
}

interface MilitaryPlacement {
  readonly kind: MilitaryOutpostEntity['kind'];
  readonly xFraction: number;
  readonly yFraction: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

function createArenaRandom(seed: string): () => number {
  let state = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16_777_619);
  }

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
