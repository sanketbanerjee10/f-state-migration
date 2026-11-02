import { ARENA_OBSTACLES, type ArenaObstacle } from '../core/GameConfig';
import { getArenaObstacleBounds } from '../core/ArenaGeometry';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import {
  drawLine,
  drawRect,
} from './ShapeLibrary';

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ArenaObstacle,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const { obstacle: dimensions } = GAME_VISUAL_CONFIG;
  const { arena: colors } = GAME_PALETTE;
  const { x, y, width, height } = getArenaObstacleBounds(
    obstacle,
    arenaWidth,
    arenaHeight,
  );

  drawRect(
    context,
    x + dimensions.shadowOffsetX,
    y + dimensions.shadowOffsetY,
    width,
    height,
    { fill: colors.obstacleShadow },
  );

  if (obstacle.kind === 'crate') {
    drawRect(context, x, y, width, height, { fill: colors.crate.fill });
    drawRect(context, x + 1, y + 1, width - 2, height - 2, {
      stroke: colors.crate.edge,
      lineWidth: dimensions.crateEdgeWidth,
    });

    const inset = dimensions.crateInset;
    drawRect(context, x + inset, y + inset, width - inset * 2, height - inset * 2, {
      stroke: colors.crate.inset,
      lineWidth: dimensions.crateInsetWidth,
    });

    const diagonalInset = dimensions.crateDiagonalInset;
    drawLine(
      context,
      { x: x + diagonalInset, y: y + diagonalInset },
      { x: x + width - diagonalInset, y: y + height - diagonalInset },
      colors.crate.inset,
      dimensions.crateInsetWidth,
    );
    drawLine(
      context,
      { x: x + width - diagonalInset, y: y + diagonalInset },
      { x: x + diagonalInset, y: y + height - diagonalInset },
      colors.crate.inset,
      dimensions.crateInsetWidth,
    );

    const boltInset = dimensions.crateBoltInset;
    const boltSize = dimensions.crateBoltSize;
    for (const [boltX, boltY] of [
      [x + boltInset, y + boltInset],
      [x + width - boltInset, y + boltInset],
      [x + boltInset, y + height - boltInset],
      [x + width - boltInset, y + height - boltInset],
    ]) {
      drawRect(context, boltX - 1, boltY - 1, boltSize, boltSize, {
        fill: colors.crate.detail,
      });
    }
    return;
  }

  drawRect(context, x, y, width, height, { fill: colors.barricade.fill });
  drawRect(context, x + 1, y + 1, width - 2, height - 2, {
    stroke: colors.barricade.edge,
    lineWidth: dimensions.barricadeEdgeWidth,
  });

  for (
    let markX = x + dimensions.barricadeMarkStart;
    markX < x + width - dimensions.barricadeMarkEndInset;
    markX += dimensions.barricadeMarkSpacing
  ) {
    drawLine(
      context,
      { x: markX, y: y + dimensions.barricadeMarkVerticalInset },
      { x: markX, y: y + height - dimensions.barricadeMarkVerticalInset },
      colors.barricade.detail,
      dimensions.barricadeMarkWidth,
    );
  }
}

export function renderArena(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const { arena: dimensions } = GAME_VISUAL_CONFIG;
  const { arena: colors } = GAME_PALETTE;

  context.save();
  try {
    drawRect(context, 0, 0, width, height, { fill: colors.floor });

    context.save();
    try {
      context.strokeStyle = colors.grid;
      context.lineWidth = 1;
      context.beginPath();
      for (let x = 0; x <= width; x += dimensions.gridSpacing) {
        context.moveTo(x, 0);
        context.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += dimensions.gridSpacing) {
        context.moveTo(0, y);
        context.lineTo(width, y);
      }
      context.stroke();
    } finally {
      context.restore();
    }

    const outerInset = dimensions.outerBoundaryInset;
    drawRect(
      context,
      outerInset,
      outerInset,
      Math.max(0, width - outerInset * 2),
      Math.max(0, height - outerInset * 2),
      { stroke: colors.boundary, lineWidth: dimensions.outerBoundaryWidth },
    );

    const innerInset = dimensions.innerBoundaryInset;
    drawRect(
      context,
      innerInset,
      innerInset,
      Math.max(0, width - innerInset * 2),
      Math.max(0, height - innerInset * 2),
      { stroke: colors.innerBoundary, lineWidth: dimensions.innerBoundaryWidth },
    );

    const centerX = width / 2;
    const centerY = height / 2;
    const halfLength = dimensions.centerMarkingHalfLength;
    drawLine(
      context,
      { x: centerX - halfLength, y: centerY },
      { x: centerX + halfLength, y: centerY },
      colors.marking,
      dimensions.centerMarkingWidth,
    );
    drawLine(
      context,
      { x: centerX, y: centerY - halfLength },
      { x: centerX, y: centerY + halfLength },
      colors.marking,
      dimensions.centerMarkingWidth,
    );

    for (const obstacle of ARENA_OBSTACLES) {
      drawObstacle(context, obstacle, width, height);
    }
  } finally {
    context.restore();
  }
}
