import type {
  ArenaObstacleEntity,
  ArenaThemeId,
  ExplosiveBarrelEntity,
  IndustrialGasCylinderEntity,
  OilFirePatchEntity,
} from '../../arena/ArenaSystem';
import type { MilitaryVisualObject } from '../../rendering/MilitaryObjectRenderer';
import type { ContaminatedVisualObject } from '../../rendering/ContaminatedObjectRenderer';

export interface ArenaRenderSnapshot {
  readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
  readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
  readonly gasCylinders?: readonly Readonly<IndustrialGasCylinderEntity>[];
  readonly oilFirePatches?: readonly Readonly<OilFirePatchEntity>[];
  readonly militaryObjects?: readonly MilitaryVisualObject[];
  readonly contaminatedObjects?: readonly ContaminatedVisualObject[];
  readonly theme: ArenaThemeId;
  readonly elapsedSeconds?: number;
}

export interface ArenaRenderState extends ArenaRenderSnapshot {
  readonly transition?: {
    readonly from: ArenaRenderSnapshot;
    readonly progress: number;
  };
}
