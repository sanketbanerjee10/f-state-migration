import { renderArena } from '../arenas';
import type { GamePerformanceTimings } from '../core/GamePerformanceDiagnostics';
import {
  EMPTY_RENDER_LAYERS,
  type RenderActor,
  type RenderCommand,
  type RenderLayers,
} from './RenderScene';

function renderCommand(
  context: CanvasRenderingContext2D,
  command: RenderCommand,
  frame: { readonly elapsedSeconds: number },
): void {
  context.save();
  try {
    command.draw(context, frame);
  } finally {
    context.restore();
  }
}

function renderCommands(
  context: CanvasRenderingContext2D,
  commands: readonly RenderCommand[],
  frame: { readonly elapsedSeconds: number },
): void {
  for (const command of commands) {
    renderCommand(context, command, frame);
  }
}

function compareActorsByY(left: RenderActor, right: RenderActor): number {
  return left.y - right.y;
}

export function renderGameScene(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSeconds: number,
  layers: RenderLayers = EMPTY_RENDER_LAYERS,
  performanceTimings?: GamePerformanceTimings,
): void {
  const frame = { elapsedSeconds };
  const arenaStartedAt = performanceTimings ? performance.now() : 0;
  renderArena(context, width, height, layers.arena, performanceTimings);
  if (performanceTimings) {
    performanceTimings.arenaRenderMs += performance.now() - arenaStartedAt;
  }
  renderCommands(context, layers.groundShadows, frame);
  renderCommands(context, layers.pickups, frame);
  renderCommands(context, layers.projectiles, frame);
  const sortStartedAt = performanceTimings ? performance.now() : 0;
  const sortedActors = [...layers.actors].sort(compareActorsByY);
  if (performanceTimings) {
    performanceTimings.actorSortMs += performance.now() - sortStartedAt;
  }
  renderCommands(context, sortedActors, frame);
  renderCommands(context, layers.foregroundEffects, frame);
  renderCommands(context, layers.feedback, frame);
  renderCommands(context, layers.debugOverlays, frame);
  if (layers.visibility) {
    const { x, y, radius } = layers.visibility;
    const visibility = context.createRadialGradient(
      x,
      y,
      radius * 0.72,
      x,
      y,
      radius,
    );
    visibility.addColorStop(0, 'rgba(7, 12, 10, 0)');
    visibility.addColorStop(1, 'rgba(7, 12, 10, 0.9)');
    context.fillStyle = visibility;
    context.fillRect(0, 0, width, height);
  }
}
