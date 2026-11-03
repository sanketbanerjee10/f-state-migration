import type {
  ArenaObstacleEntity,
  ArenaThemeId,
  ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';

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
    readonly theme: ArenaThemeId;
    readonly transition?: {
      readonly from: {
        readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
        readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
        readonly theme: ArenaThemeId;
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
