import {
  ARENA_TRANSITION_SECONDS,
  ARENA_INTERACTION_CONFIG,
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
}

export interface ExplosiveBarrelEntity {
  readonly id: string;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly radius: number;
  health: number;
  readonly maxHealth: number;
}

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
  readonly shadow: string;
}

export interface ArenaLayoutDefinition {
  readonly id: string;
  readonly name: string;
  readonly theme: ArenaThemeId;
  readonly obstacles: ArenaObstacle[];
  readonly barrels: ReadonlyArray<Pick<ExplosiveBarrelEntity, 'id' | 'xFraction' | 'yFraction'>>;
}

export const ARENA_THEME_CYCLE: readonly ArenaTheme[] = [
  {
    id: 'military',
    name: 'Military Outpost',
    floor: '#182520',
    grid: 'rgba(190, 190, 160, 0.035)',
    boundary: '#6E806F',
    innerBoundary: 'rgba(7, 14, 11, 0.62)',
    marking: 'rgba(204, 184, 145, 0.09)',
    accent: '#9AA789',
    detail: '#D0C19A',
    shadow: 'rgba(3, 8, 7, 0.42)',
  },
  {
    id: 'industrial',
    name: 'Industrial Complex',
    floor: '#211F1A',
    grid: 'rgba(190, 169, 132, 0.035)',
    boundary: '#766A54',
    innerBoundary: 'rgba(11, 10, 8, 0.66)',
    marking: 'rgba(198, 169, 126, 0.085)',
    accent: '#A79575',
    detail: '#C9B58B',
    shadow: 'rgba(8, 7, 5, 0.46)',
  },
  {
    id: 'contaminated',
    name: 'Contaminated Zone',
    floor: '#1C251F',
    grid: 'rgba(160, 181, 130, 0.035)',
    boundary: '#63775B',
    innerBoundary: 'rgba(7, 14, 9, 0.66)',
    marking: 'rgba(167, 190, 134, 0.08)',
    accent: '#91A879',
    detail: '#BBC99A',
    shadow: 'rgba(5, 12, 7, 0.46)',
  },
  {
    id: 'urban',
    name: 'Urban Ruins',
    floor: '#25221F',
    grid: 'rgba(190, 164, 148, 0.035)',
    boundary: '#76645D',
    innerBoundary: 'rgba(14, 10, 9, 0.66)',
    marking: 'rgba(202, 169, 151, 0.08)',
    accent: '#A98A7B',
    detail: '#CDB4A1',
    shadow: 'rgba(13, 9, 8, 0.46)',
  },
  {
    id: 'bunker',
    name: 'Underground Bunker',
    floor: '#1C2326',
    grid: 'rgba(151, 174, 181, 0.035)',
    boundary: '#61727A',
    innerBoundary: 'rgba(7, 11, 14, 0.68)',
    marking: 'rgba(166, 185, 188, 0.08)',
    accent: '#8FA4A7',
    detail: '#BCC9C2',
    shadow: 'rgba(6, 10, 12, 0.48)',
  },
];

const THEME_LAYOUTS: Readonly<Record<ArenaThemeId, readonly ArenaLayoutDefinition[]>> = {
  military: [
    { id: 'military-open-centre', name: 'Open Centre', theme: 'military', obstacles: [
      { xFraction: 0.18, yFraction: 0.25, width: 62, height: 74, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.2, width: 74, height: 62, kind: 'crate' },
      { xFraction: 0.82, yFraction: 0.77, width: 68, height: 60, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.8, width: 70, height: 64, kind: 'crate' },
      { xFraction: 0.48, yFraction: 0.21, width: 108, height: 20, kind: 'barricade' },
      { xFraction: 0.52, yFraction: 0.79, width: 112, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.5, width: 36, height: 22, kind: 'cover' },
    ], barrels: [{ id: 'military-barrel-1', xFraction: 0.64, yFraction: 0.43 }, { id: 'military-barrel-2', xFraction: 0.36, yFraction: 0.57 }] },
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
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.34, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.66, yFraction: 0.5 }] },
    { id: 'industrial-cluster-split', name: 'Industrial Cluster', theme: 'industrial', obstacles: [
      { xFraction: 0.3, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.3, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.3, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.7, yFraction: 0.7, width: 84, height: 70, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 52, height: 52, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.18, width: 110, height: 20, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.82, width: 110, height: 20, kind: 'barricade' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.5, yFraction: 0.32 }, { id: 'ind-barrel-2', xFraction: 0.5, yFraction: 0.68 }] },
    { id: 'industrial-corridor', name: 'Corridor Grid', theme: 'industrial', obstacles: [
      { xFraction: 0.24, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.25, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.24, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.76, yFraction: 0.75, width: 66, height: 18, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.26, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.74, width: 90, height: 22, kind: 'wall' },
      { xFraction: 0.5, yFraction: 0.5, width: 60, height: 62, kind: 'crate' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.38, yFraction: 0.5 }, { id: 'ind-barrel-2', xFraction: 0.62, yFraction: 0.5 }] },
    { id: 'industrial-rust-scrap', name: 'Rust Scrap', theme: 'industrial', obstacles: [
      { xFraction: 0.2, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.18, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.2, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.8, yFraction: 0.82, width: 54, height: 44, kind: 'crate' },
      { xFraction: 0.5, yFraction: 0.5, width: 120, height: 30, kind: 'barricade' },
      { xFraction: 0.5, yFraction: 0.33, width: 66, height: 26, kind: 'cover' },
      { xFraction: 0.5, yFraction: 0.67, width: 66, height: 26, kind: 'cover' },
    ], barrels: [{ id: 'ind-barrel-1', xFraction: 0.42, yFraction: 0.42 }, { id: 'ind-barrel-2', xFraction: 0.58, yFraction: 0.58 }] },
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
  const themeIndex = Math.floor((waveNumber - 1) / 10) % ARENA_THEME_CYCLE.length;
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
  };
}

export function createArenaObstacles(
  waveNumber = 1,
  previousLayoutId?: string,
): ArenaObstacleEntity[] {
  const layout = createArenaLayoutForWave(waveNumber, previousLayoutId);
  return layout.obstacles.map((obstacle) =>
    obstacle.kind === 'barricade'
      ? {
          ...obstacle,
          health: ARENA_INTERACTION_CONFIG.barricadeHealth,
          maxHealth: ARENA_INTERACTION_CONFIG.barricadeHealth,
        }
      : { ...obstacle },
  );
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
  ];
}
