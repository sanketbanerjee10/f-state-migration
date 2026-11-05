import { GAME_VISUAL_CONFIG } from '../../rendering/VisualConfig';
import { drawIndustrialFloor } from '../environments/industrial';
import { drawArenaFloor, drawArenaFrame, getArenaTheme } from './ArenaFloorRenderer';
import { renderArenaObstacles } from './ArenaObjectRenderer';
import type { ArenaRenderState } from './ArenaRenderTypes';

function renderArenaLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
  includeObstacles = true,
): void {
  const { arena: dimensions } = GAME_VISUAL_CONFIG;
  const theme = getArenaTheme(arena?.theme);

  context.save();
  try {
    context.globalAlpha *= alpha;
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);

    if (theme.id === 'industrial') {
      drawIndustrialFloor(context, width, height);
    } else {
      drawArenaFloor(context, width, height, theme, dimensions.gridSpacing);
    }
    drawArenaFrame(context, width, height, theme);

    if (includeObstacles) {
      renderArenaObstacles(context, width, height, arena);
    }
  } finally {
    context.restore();
  }
}

export function renderArena(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
): void {
  if (!arena?.transition) {
    renderArenaLayer(context, width, height, arena);
    return;
  }

  const transition = arena.transition;
  const progress = Math.max(0, Math.min(1, transition.progress));
  renderArenaLayer(context, width, height, arena, 1, 1, false);
  if (progress < 0.5) {
    const phaseProgress = progress * 2;
    const zoomOut = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
    renderArenaObstacles(
      context,
      width,
      height,
      transition.from,
      1 - zoomOut,
      1 - zoomOut,
    );
    return;
  }

  const phaseProgress = (progress - 0.5) * 2;
  const zoomIn = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
  renderArenaObstacles(context, width, height, arena, zoomIn, zoomIn);
}
