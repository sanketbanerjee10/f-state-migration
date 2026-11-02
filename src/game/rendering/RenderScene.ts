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
