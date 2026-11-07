import type {
  ArenaObstacleEntity,
  ArenaThemeId,
  ExplosiveBarrelEntity,
  IndustrialGasCylinderEntity,
  OilFirePatchEntity,
} from '../arena/ArenaSystem';
import type { MilitaryVisualObject } from './MilitaryObjectRenderer';
import type { ContaminatedVisualObject } from './ContaminatedObjectRenderer';

export interface RenderFrame {
  readonly elapsedSeconds: number;
}

export interface RenderCommand {
  readonly draw: (
    context: CanvasRenderingContext2D,
    frame: RenderFrame,
  ) => void;
}

export interface RenderActor extends RenderCommand {
  readonly y: number;
}

export interface RenderLayers {
  readonly visibility?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
  };
  readonly arena?: {
    readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
    readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
    readonly gasCylinders?: readonly Readonly<IndustrialGasCylinderEntity>[];
    readonly oilFirePatches?: readonly Readonly<OilFirePatchEntity>[];
    readonly militaryObjects?: readonly MilitaryVisualObject[];
    readonly contaminatedObjects?: readonly ContaminatedVisualObject[];
    readonly theme: ArenaThemeId;
    readonly elapsedSeconds?: number;
    readonly transition?: {
      readonly from: {
        readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
        readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
        readonly gasCylinders?: readonly Readonly<IndustrialGasCylinderEntity>[];
        readonly oilFirePatches?: readonly Readonly<OilFirePatchEntity>[];
        readonly militaryObjects?: readonly MilitaryVisualObject[];
        readonly contaminatedObjects?: readonly ContaminatedVisualObject[];
        readonly theme: ArenaThemeId;
        readonly elapsedSeconds?: number;
      };
      readonly progress: number;
    };
  };
  readonly groundShadows: readonly RenderCommand[];
  readonly pickups: readonly RenderCommand[];
  readonly projectiles: readonly RenderCommand[];
  readonly actors: readonly RenderActor[];
  readonly foregroundEffects: readonly RenderCommand[];
  readonly feedback: readonly RenderCommand[];
  readonly debugOverlays: readonly RenderCommand[];
}

export const EMPTY_RENDER_LAYERS: RenderLayers = {
  groundShadows: [],
  pickups: [],
  projectiles: [],
  actors: [],
  foregroundEffects: [],
  feedback: [],
  debugOverlays: [],
};
