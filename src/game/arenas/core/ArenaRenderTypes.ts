import type {
  ArenaObstacleEntity,
  ArenaThemeId,
  ExplosiveBarrelEntity,
} from '../../arena/ArenaSystem';

export interface ArenaRenderSnapshot {
  readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
  readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
  readonly theme: ArenaThemeId;
}

export interface ArenaRenderState extends ArenaRenderSnapshot {
  readonly transition?: {
    readonly from: ArenaRenderSnapshot;
    readonly progress: number;
  };
}
