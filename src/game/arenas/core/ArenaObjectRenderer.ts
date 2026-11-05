import {
  ARENA_OBSTACLES,
  type ArenaObstacle,
} from '../../core/GameConfig';
import { getArenaObstacleBounds } from '../../core/ArenaGeometry';
import { GAME_PALETTE } from '../../rendering/GamePalette';
import { GAME_VISUAL_CONFIG } from '../../rendering/VisualConfig';
import { drawCircle, drawLine } from '../../rendering/ShapeLibrary';
import {
  type ArenaTheme,
  type ArenaThemeId,
  type ArenaObstacleEntity,
  type ExplosiveBarrelEntity,
} from '../../arena/ArenaSystem';
import {
  fillEllipse,
  fillRoundedRect,
  getArenaTheme,
  roundedRectPath,
  strokeRoundedRect,
  withAlpha,
} from './ArenaFloorRenderer';
import type { ArenaRenderState } from './ArenaRenderTypes';

function getArenaObjectPalette(themeId: ArenaThemeId) {
  const palette = GAME_PALETTE.arenaThemes[themeId] ?? GAME_PALETTE.arenaThemes.military;
  return {
    crate: {
      fill: palette.crate.fill,
      edge: palette.crate.edge,
      inset: palette.crate.detail,
      detail: palette.crate.highlight,
    },
    barricade: {
      fill: palette.barricade.fill,
      edge: palette.barricade.edge,
      detail: palette.barricade.detail,
      highlight: palette.barricade.highlight,
    },
    wall: {
      fill: palette.wall.fill,
      edge: palette.wall.edge,
      detail: palette.wall.detail,
      highlight: palette.wall.highlight,
    },
    cover: {
      fill: palette.cover.fill,
      edge: palette.cover.edge,
      detail: palette.cover.detail,
      highlight: palette.cover.highlight,
    },
    barrel: {
      fill: palette.barrel.fill,
      edge: palette.barrel.edge,
      detail: palette.barrel.detail,
      highlight: palette.barrel.highlight,
    },
  };
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ArenaObstacle | ArenaObstacleEntity,
  arenaWidth: number,
  arenaHeight: number,
  theme: ArenaTheme,
): void {
  const dimensions = GAME_VISUAL_CONFIG.obstacle;
  const colors = getArenaObjectPalette(theme.id);
  const { x, y, width, height } = getArenaObstacleBounds(
    obstacle,
    arenaWidth,
    arenaHeight,
  );

  const shadowX = x + dimensions.shadowOffsetX;
  const shadowY = y + dimensions.shadowOffsetY;

  if (obstacle.kind === 'crate') {
    fillRoundedRect(context, shadowX, shadowY, width, height, 5, theme.shadow);

    const wood = context.createLinearGradient(x, y, x + width, y + height);
    wood.addColorStop(0, colors.crate.edge);
    wood.addColorStop(0.12, colors.crate.fill);
    wood.addColorStop(1, colors.crate.inset);
    fillRoundedRect(context, x, y, width, height, 5, wood);
    strokeRoundedRect(context, x + 0.5, y + 0.5, width - 1, height - 1, 5, colors.crate.edge, dimensions.crateEdgeWidth);

    const inset = Math.min(5, width * 0.12, height * 0.12);
    fillRoundedRect(
      context,
      x + inset,
      y + inset,
      width - inset * 2,
      height - inset * 2,
      3,
      colors.crate.fill,
    );

    const plankCount = height >= 46 ? 3 : 2;
    for (let plank = 1; plank < plankCount; plank += 1) {
      const plankY = y + (height * plank) / plankCount;
      drawLine(
        context,
        { x: x + inset + 2, y: plankY },
        { x: x + width - inset - 2, y: plankY },
        colors.crate.inset,
        1.25,
      );
      drawLine(
        context,
        { x: x + inset + 5, y: plankY + 2 },
        { x: x + width * 0.62, y: plankY + 2 },
        withAlpha(colors.crate.detail, 0.18),
        1,
      );
    }

    const bracket = Math.max(4, Math.min(8, width * 0.13));
    const bracketInset = 3;
    for (const [cornerX, cornerY, directionX, directionY] of [
      [x + bracketInset, y + bracketInset, 1, 1],
      [x + width - bracketInset, y + bracketInset, -1, 1],
      [x + bracketInset, y + height - bracketInset, 1, -1],
      [x + width - bracketInset, y + height - bracketInset, -1, -1],
    ] as const) {
      drawLine(
        context,
        { x: cornerX, y: cornerY },
        { x: cornerX + directionX * bracket, y: cornerY },
        theme.detail,
        1.5,
      );
      drawLine(
        context,
        { x: cornerX, y: cornerY },
        { x: cornerX, y: cornerY + directionY * bracket },
        theme.detail,
        1.5,
      );
      drawCircle(context, cornerX, cornerY, 1.2, { fill: colors.crate.detail });
    }

    drawLine(context, { x: x + 7, y: y + 1 }, { x: x + width - 7, y: y + 1 }, withAlpha(colors.crate.detail, 0.28), 1);
    drawLine(context, { x: x + 2, y: y + height - 2 }, { x: x + width - 2, y: y + height - 2 }, withAlpha(colors.crate.inset, 0.48), 1.5);
    return;
  }

  if (
    obstacle.kind === 'barricade' &&
    'health' in obstacle &&
    obstacle.health === 0
  ) {
    context.save();
    try {
      context.translate(x + width * 0.28, y + height * 0.68);
      context.rotate(-0.12);
      fillRoundedRect(context, -width * 0.2, -height * 0.14, width * 0.4, height * 0.32, 3, theme.shadow);
      fillRoundedRect(context, -width * 0.2, -height * 0.2, width * 0.4, height * 0.28, 3, colors.barricade.fill);
    } finally {
      context.restore();
    }

    context.save();
    try {
      context.translate(x + width * 0.74, y + height * 0.34);
      context.rotate(0.1);
      fillRoundedRect(context, -width * 0.16, -height * 0.12, width * 0.32, height * 0.28, 3, theme.shadow);
      fillRoundedRect(context, -width * 0.16, -height * 0.18, width * 0.32, height * 0.25, 3, colors.barricade.fill);
    } finally {
      context.restore();
    }
    return;
  }

  if (obstacle.kind === 'wall') {
    fillRoundedRect(context, shadowX, shadowY, width, height, 4, theme.shadow);

    const concrete = context.createLinearGradient(x, y, x + width, y + height);
    concrete.addColorStop(0, colors.wall.edge);
    concrete.addColorStop(0.12, colors.wall.fill);
    concrete.addColorStop(1, colors.wall.detail);
    fillRoundedRect(context, x, y, width, height, 4, concrete);
    strokeRoundedRect(context, x + 0.5, y + 0.5, width - 1, height - 1, 4, colors.wall.edge, 1.35);

    const horizontal = width >= height;
    const rows = horizontal
      ? Math.max(2, Math.min(3, Math.floor(height / 18)))
      : Math.max(2, Math.min(6, Math.floor(height / 26)));
    const columns = horizontal
      ? Math.max(2, Math.min(6, Math.floor(width / 30)))
      : Math.max(1, Math.min(2, Math.floor(width / 18)));

    context.save();
    try {
      roundedRectPath(context, x + 2, y + 2, width - 4, height - 4, 3);
      context.clip();
      context.strokeStyle = colors.wall.detail;
      context.lineWidth = 1;

      for (let row = 1; row < rows; row += 1) {
        const seamY = y + (height * row) / rows;
        context.beginPath();
        context.moveTo(x + 2, seamY);
        context.lineTo(x + width - 2, seamY);
        context.stroke();
      }

      for (let row = 0; row < rows; row += 1) {
        const offset = row % 2 === 0 ? 0.5 : 0;
        for (let column = 1; column < columns; column += 1) {
          const seamX = x + width * ((column + offset) / columns);
          const topY = y + (height * row) / rows + 2;
          const bottomY = y + (height * (row + 1)) / rows - 2;
          context.beginPath();
          context.moveTo(seamX, topY);
          context.lineTo(seamX, bottomY);
          context.stroke();
        }
      }
    } finally {
      context.restore();
    }

    drawLine(context, { x: x + 5, y: y + 1 }, { x: x + width - 5, y: y + 1 }, 'rgba(238, 226, 196, 0.25)', 1);
    drawLine(context, { x: x + 4, y: y + height - 2 }, { x: x + width - 4, y: y + height - 2 }, 'rgba(9, 14, 12, 0.3)', 1.5);
    return;
  }

  if (obstacle.kind === 'cover') {
    fillRoundedRect(context, shadowX, shadowY + 1, width, height, Math.min(10, height / 2), theme.shadow);

    const isTall = height > width * 1.25;
    const columns = isTall ? 2 : 3;
    const rows = isTall ? 3 : 2;
    const bagWidth = (width * 0.82) / columns;
    const bagHeight = (height * 0.72) / rows;
    const startX = x + width * 0.09 + bagWidth / 2;
    const startY = y + height * 0.14 + bagHeight / 2;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const stagger = row % 2 === 0 ? 0 : bagWidth * 0.12;
        const centerX = startX + column * bagWidth + stagger;
        const centerY = startY + row * bagHeight;
        if (centerX > x + width - bagWidth * 0.28) continue;

        const bagGradient = context.createLinearGradient(
          centerX,
          centerY - bagHeight / 2,
          centerX,
          centerY + bagHeight / 2,
        );
        bagGradient.addColorStop(0, colors.cover.edge);
        bagGradient.addColorStop(0.42, colors.cover.fill);
        bagGradient.addColorStop(1, colors.cover.detail);
        fillEllipse(context, centerX, centerY + 1.5, bagWidth * 0.55, bagHeight * 0.48, theme.shadow);
        fillEllipse(context, centerX, centerY, bagWidth * 0.55, bagHeight * 0.48, bagGradient, colors.cover.edge);

        drawLine(
          context,
          { x: centerX - bagWidth * 0.22, y: centerY + 1 },
          { x: centerX + bagWidth * 0.22, y: centerY + 1 },
          withAlpha(colors.cover.detail, 0.42),
          1,
        );
        drawLine(
          context,
          { x: centerX - bagWidth * 0.2, y: centerY - bagHeight * 0.2 },
          { x: centerX + bagWidth * 0.2, y: centerY - bagHeight * 0.2 },
          withAlpha(colors.cover.highlight, 0.18),
          1,
        );
      }
    }
    return;
  }

  fillRoundedRect(context, shadowX, shadowY, width, height, Math.min(5, height * 0.35), theme.shadow);

  const barrierGradient = context.createLinearGradient(x, y, x, y + height);
  barrierGradient.addColorStop(0, colors.barricade.edge);
  barrierGradient.addColorStop(0.25, colors.barricade.fill);
  barrierGradient.addColorStop(1, colors.barricade.detail);
  fillRoundedRect(context, x, y, width, height, Math.min(5, height * 0.35), barrierGradient);
  strokeRoundedRect(context, x + 0.5, y + 0.5, width - 1, height - 1, Math.min(5, height * 0.35), colors.barricade.edge, dimensions.barricadeEdgeWidth);

  fillRoundedRect(context, x + 4, y + 2, Math.max(0, width - 8), Math.max(1, height * 0.2), 2, withAlpha(colors.barricade.highlight, 0.18));
  drawLine(context, { x: x + 4, y: y + height - 2 }, { x: x + width - 4, y: y + height - 2 }, withAlpha(colors.barricade.detail, 0.7), 1.25);

  const reflectorCount = width >= 90 ? 3 : 2;
  for (let index = 0; index < reflectorCount; index += 1) {
    const reflectorX = x + width * ((index + 1) / (reflectorCount + 1));
    const reflectorWidth = Math.min(5, width * 0.055);
    const reflectorHeight = Math.max(2, Math.min(5, height * 0.3));
    fillRoundedRect(
      context,
      reflectorX - reflectorWidth / 2,
      y + (height - reflectorHeight) / 2,
      reflectorWidth,
      reflectorHeight,
      1.5,
      'rgba(207, 177, 119, 0.72)',
    );
  }

  if (
    'health' in obstacle &&
    obstacle.health !== undefined &&
    obstacle.maxHealth !== undefined &&
    obstacle.health < obstacle.maxHealth
  ) {
    const damageFraction = 1 - obstacle.health / obstacle.maxHealth;
    const crackCount = Math.ceil(damageFraction * 3);
    for (let crack = 0; crack < crackCount; crack += 1) {
      const startX = x + width * (0.24 + crack * 0.24);
      drawLine(
        context,
        { x: startX, y: y + 2 },
        { x: startX - Math.min(5, width * 0.06), y: y + height - 2 },
        'rgba(28, 29, 23, 0.7)',
        1.25,
      );
    }
  }
}

function drawBarrel(
  context: CanvasRenderingContext2D,
  barrel: Readonly<ExplosiveBarrelEntity>,
  arenaWidth: number,
  arenaHeight: number,
  theme: ArenaTheme,
): void {
  const x = arenaWidth * barrel.xFraction;
  const y = arenaHeight * barrel.yFraction;
  const radius = barrel.radius;
  const colors = getArenaObjectPalette(theme.id).barrel;
  const alive = barrel.health > 0;

  drawCircle(context, x + 2, y + radius * 0.28 + 3, radius * 1.08, {
    fill: theme.shadow,
  });
  drawCircle(context, x, y + 1, radius + 1.5, {
    fill: alive ? colors.edge : '#343944',
  });

  if (alive) {
    const drumGradient = context.createRadialGradient(
      x - radius * 0.32,
      y - radius * 0.38,
      1,
      x,
      y,
      radius * 1.15,
    );
    drumGradient.addColorStop(0, colors.highlight);
    drumGradient.addColorStop(0.42, colors.fill);
    drumGradient.addColorStop(1, colors.detail);
    fillEllipse(context, x, y, radius - 1.5, radius - 1.5, drumGradient);
    drawCircle(context, x, y, radius - 2, {
      stroke: colors.edge,
      lineWidth: 1,
    });
  } else {
    const destroyedGradient = context.createRadialGradient(
      x - radius * 0.32,
      y - radius * 0.38,
      1,
      x,
      y,
      radius * 1.15,
    );
    destroyedGradient.addColorStop(0, '#394653');
    destroyedGradient.addColorStop(0.38, '#343944');
    destroyedGradient.addColorStop(1, '#171F2D');
    fillEllipse(context, x, y, radius - 1.5, radius - 1.5, destroyedGradient);
    drawCircle(context, x, y, radius - 2, {
      stroke: '#252D3A',
      lineWidth: 1,
    });
  }

  context.save();
  try {
    context.strokeStyle = alive ? 'rgba(35, 31, 25, 0.56)' : 'rgba(7, 12, 10, 0.5)';
    context.lineWidth = Math.max(1, radius * 0.12);
    context.beginPath();
    context.ellipse(x, y - radius * 0.34, radius * 0.7, radius * 0.2, 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.ellipse(x, y + radius * 0.34, radius * 0.7, radius * 0.2, 0, 0, Math.PI * 2);
    context.stroke();
  } finally {
    context.restore();
  }

  drawCircle(context, x + radius * 0.28, y - radius * 0.18, Math.max(1.5, radius * 0.13), {
    fill: alive ? colors.edge : '#252D3A',
    stroke: alive ? 'rgba(20, 22, 17, 0.48)' : 'rgba(150, 166, 166, 0.42)',
    lineWidth: 1,
  });
  drawCircle(context, x - radius * 0.42, y - radius * 0.45, Math.max(1, radius * 0.1), {
    fill: alive ? withAlpha(colors.highlight, 0.36) : 'rgba(150, 166, 166, 0.42)',
  });

  if (alive && barrel.health < barrel.maxHealth) {
    const damagedTone = alive ? colors.detail : '#394653';
    drawLine(
      context,
      { x: x - radius * 0.1, y: y - radius * 0.55 },
      { x: x + radius * 0.2, y: y - radius * 0.08 },
      damagedTone,
      1.25,
    );
  }
}

export function renderArenaObstacles(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
): void {
  const obstacles = arena?.obstacles ?? ARENA_OBSTACLES;
  const theme = getArenaTheme(arena?.theme);
  for (const obstacle of obstacles) {
    const centerX = width * obstacle.xFraction;
    const centerY = height * obstacle.yFraction;
    context.save();
    try {
      context.globalAlpha *= alpha;
      context.translate(centerX, centerY);
      context.scale(scale, scale);
      context.translate(-centerX, -centerY);
      drawObstacle(context, obstacle, width, height, theme);
    } finally {
      context.restore();
    }
  }

  for (const barrel of arena?.barrels ?? []) {
    const centerX = width * barrel.xFraction;
    const centerY = height * barrel.yFraction;
    context.save();
    try {
      context.globalAlpha *= alpha;
      context.translate(centerX, centerY);
      context.scale(scale, scale);
      context.translate(-centerX, -centerY);
      drawBarrel(context, barrel, width, height, theme);
    } finally {
      context.restore();
    }
  }
}
