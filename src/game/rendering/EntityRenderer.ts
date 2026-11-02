import type { RenderCommand } from './RenderScene';
import { GAME_PALETTE } from './GamePalette';
import { drawCircle } from './ShapeLibrary';

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export function clampVisualValue(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function drawGroundShadow(
  context: CanvasRenderingContext2D,
  point: WorldPoint,
  radius: number,
): void {
  drawCircle(context, point.x + 2, point.y + radius * 0.62, radius * 1.15, {
    fill: GAME_PALETTE.arena.entityShadow,
  });
}

export function createGroundShadowCommand(
  point: WorldPoint,
  radius: number,
): RenderCommand {
  return {
    draw: (context) => drawGroundShadow(context, point, radius),
  };
}
