import { ARENA_OBSTACLES, type ArenaObstacle } from '../core/GameConfig';
import { getArenaObstacleBounds } from '../core/ArenaGeometry';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import {
  drawCircle,
  drawLine,
  drawRect,
} from './ShapeLibrary';
import {
  ARENA_THEME_CYCLE,
  type ArenaObstacleEntity,
  type ArenaThemeId,
  type ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';

interface ArenaRenderState {
  readonly obstacles: readonly Readonly<ArenaObstacleEntity>[];
  readonly barrels: readonly Readonly<ExplosiveBarrelEntity>[];
  readonly theme: ArenaThemeId;
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ArenaObstacle | ArenaObstacleEntity,
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

  if (
    'health' in obstacle &&
    obstacle.health === 0 &&
    obstacle.kind === 'barricade'
  ) {
    drawRect(context, x + 3, y + height * 0.55, width * 0.38, height * 0.3, {
      fill: colors.barricade.fill,
    });
    drawRect(context, x + width * 0.58, y + height * 0.2, width * 0.32, height * 0.3, {
      fill: colors.barricade.fill,
    });
    return;
  }

  if (obstacle.kind === 'cover' || obstacle.kind === 'wall') {
    drawRect(context, x, y, width, height, { fill: colors.barricade.fill });
    drawRect(context, x + 1, y + 1, width - 2, height - 2, {
      stroke: colors.barricade.edge,
      lineWidth: dimensions.barricadeEdgeWidth,
    });
    drawLine(
      context,
      { x: x + 4, y: y + height / 2 },
      { x: x + width - 4, y: y + height / 2 },
      colors.barricade.detail,
      dimensions.barricadeMarkWidth,
    );
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

  if (
    'health' in obstacle &&
    obstacle.health !== undefined &&
    obstacle.maxHealth !== undefined &&
    obstacle.health < obstacle.maxHealth
  ) {
    const damageFraction = 1 - obstacle.health / obstacle.maxHealth;
    for (let crack = 0; crack < Math.ceil(damageFraction * 3); crack += 1) {
      const startX = x + width * (0.25 + crack * 0.22);
      drawLine(
        context,
        { x: startX, y: y + 3 },
        { x: startX - 5, y: y + height - 3 },
        colors.barricade.detail,
        1,
      );
    }
  }
}

function drawBarrel(
  context: CanvasRenderingContext2D,
  barrel: Readonly<ExplosiveBarrelEntity>,
  arenaWidth: number,
  arenaHeight: number,
): void {
  const x = arenaWidth * barrel.xFraction;
  const y = arenaHeight * barrel.yFraction;
  const { arena: colors } = GAME_PALETTE;
  const fill = barrel.health > 0
    ? colors.barricade.fill
    : colors.obstacleShadow;
  drawCircle(context, x, y + 3, barrel.radius + 2, {
    fill: colors.obstacleShadow,
  });
  drawCircle(context, x, y, barrel.radius, {
    fill,
    stroke: barrel.health > 0
      ? GAME_PALETTE.orbs.bomb
      : colors.barricade.edge,
    lineWidth: 2,
  });
  drawLine(
    context,
    { x: x - barrel.radius * 0.7, y: y - 4 },
    { x: x + barrel.radius * 0.7, y: y - 4 },
    colors.barricade.detail,
    2,
  );
  drawLine(
    context,
    { x: x - barrel.radius * 0.7, y: y + 5 },
    { x: x + barrel.radius * 0.7, y: y + 5 },
    colors.barricade.detail,
    2,
  );
  if (barrel.health > 0 && barrel.health < barrel.maxHealth) {
    drawLine(
      context,
      { x: x - 2, y: y - barrel.radius * 0.55 },
      { x: x + 4, y: y - 1 },
      GAME_PALETTE.combat.projectileOutline,
      1.5,
    );
  }
}

export function renderArena(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
): void {
  const { arena: dimensions } = GAME_VISUAL_CONFIG;
  const baseColors = GAME_PALETTE.arena;
  const theme = ARENA_THEME_CYCLE.find(({ id }) => id === arena?.theme) ??
    ARENA_THEME_CYCLE[0]!;
  const colors = {
    ...baseColors,
    floor: theme.floor,
    grid: theme.grid,
    boundary: theme.boundary,
    innerBoundary: theme.innerBoundary,
    marking: theme.marking,
  };

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

    for (const obstacle of arena?.obstacles ?? ARENA_OBSTACLES) {
      drawObstacle(context, obstacle, width, height);
    }
    for (const barrel of arena?.barrels ?? []) {
      drawBarrel(context, barrel, width, height);
    }
    drawLine(
      context,
      { x: dimensions.outerBoundaryInset + 8, y: dimensions.outerBoundaryInset + 8 },
      { x: dimensions.outerBoundaryInset + 32, y: dimensions.outerBoundaryInset + 8 },
      theme.accent,
      2,
    );
  } finally {
    context.restore();
  }
}
