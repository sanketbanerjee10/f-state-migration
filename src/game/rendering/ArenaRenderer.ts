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
  type ArenaTheme,
  type ArenaObstacleEntity,
  type ArenaThemeId,
  type ExplosiveBarrelEntity,
} from '../arena/ArenaSystem';

interface ArenaRenderState {
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
}

type CanvasPaint = string | CanvasGradient | CanvasPattern;

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.arcTo(x + width, y, x + width, y + r, r);
  context.lineTo(x + width, y + height - r);
  context.arcTo(x + width, y + height, x + width - r, y + height, r);
  context.lineTo(x + r, y + height);
  context.arcTo(x, y + height, x, y + height - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: CanvasPaint,
): void {
  if (width <= 0 || height <= 0) return;
  context.save();
  try {
    roundedRectPath(context, x, y, width, height, radius);
    context.fillStyle = fill;
    context.fill();
  } finally {
    context.restore();
  }
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string,
  lineWidth = 1,
): void {
  if (width <= 0 || height <= 0) return;
  context.save();
  try {
    roundedRectPath(context, x, y, width, height, radius);
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  } finally {
    context.restore();
  }
}

function fillEllipse(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  fill: CanvasPaint,
  stroke?: string,
): void {
  context.save();
  try {
    context.beginPath();
    context.ellipse(
      centerX,
      centerY,
      Math.max(0, radiusX),
      Math.max(0, radiusY),
      0,
      0,
      Math.PI * 2,
    );
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.stroke();
    }
  } finally {
    context.restore();
  }
}

function getArenaTheme(themeId?: ArenaThemeId): ArenaTheme {
  return ARENA_THEME_CYCLE.find((theme) => theme.id === themeId) ??
    ARENA_THEME_CYCLE[0]!;
}

function drawArenaFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ArenaTheme,
  gridSpacing: number,
): void {
  context.fillStyle = theme.floor;
  context.fillRect(0, 0, width, height);

  const ambient = context.createRadialGradient(
    width * 0.48,
    height * 0.42,
    0,
    width * 0.48,
    height * 0.42,
    Math.max(width, height) * 0.72,
  );
  ambient.addColorStop(0, 'rgba(213, 184, 135, 0.075)');
  ambient.addColorStop(0.48, 'rgba(150, 166, 133, 0.035)');
  ambient.addColorStop(1, 'rgba(8, 14, 11, 0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  const stains = [
    { x: 0.18, y: 0.28, rx: 0.17, ry: 0.22 },
    { x: 0.78, y: 0.26, rx: 0.13, ry: 0.19 },
    { x: 0.72, y: 0.76, rx: 0.2, ry: 0.15 },
    { x: 0.27, y: 0.78, rx: 0.12, ry: 0.16 },
  ];

  for (const stain of stains) {
    const x = width * stain.x;
    const y = height * stain.y;
    context.fillStyle = 'rgba(5, 10, 8, 0.035)';
    context.beginPath();
    context.ellipse(x, y, width * stain.rx, height * stain.ry, 0, 0, Math.PI * 2);
    context.fill();
  }

  context.save();
  try {
    context.strokeStyle = theme.grid;
    context.lineWidth = 1;
    context.beginPath();

    const spacing = Math.max(64, gridSpacing);
    for (let column = 1, x = spacing; x < width; column += 1, x += spacing) {
      for (let row = 0, y = 0; y < height; row += 1, y += spacing * 0.82) {
        if ((column + row) % 3 === 0) continue;
        const segmentStart = y + ((column * 11 + row * 7) % 17);
        const segmentLength = spacing * (0.28 + ((column + row) % 3) * 0.08);
        context.moveTo(x, segmentStart);
        context.lineTo(x, Math.min(height, segmentStart + segmentLength));
      }
    }

    for (let row = 1, y = spacing * 0.55; y < height; row += 1, y += spacing * 0.82) {
      for (let column = 0, x = 0; x < width; column += 1, x += spacing) {
        if ((row * 2 + column) % 4 === 0) continue;
        const segmentStart = x + ((row * 13 + column * 5) % 23);
        const segmentLength = spacing * (0.2 + ((row + column) % 3) * 0.08);
        context.moveTo(segmentStart, y);
        context.lineTo(Math.min(width, segmentStart + segmentLength), y);
      }
    }
    context.stroke();
  } finally {
    context.restore();
  }

  context.save();
  try {
    context.strokeStyle = theme.marking;
    context.lineWidth = 1;
    for (let index = 0; index < 34; index += 1) {
      const x = (index * 137.31 + 41) % width;
      const y = (index * 79.73 + 23) % height;
      const length = 3 + (index % 5) * 1.6;
      const slope = index % 2 === 0 ? 1.5 : -1.5;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + length, y + slope);
      context.stroke();
    }
  } finally {
    context.restore();
  }

  const vignette = context.createRadialGradient(
    width * 0.5,
    height * 0.48,
    Math.min(width, height) * 0.18,
    width * 0.5,
    height * 0.48,
    Math.max(width, height) * 0.76,
  );
  vignette.addColorStop(0, 'rgba(3, 8, 7, 0)');
  vignette.addColorStop(0.68, 'rgba(3, 8, 7, 0.08)');
  vignette.addColorStop(1, 'rgba(3, 8, 7, 0.38)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

function drawArenaFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ArenaTheme,
): void {
  const inset = 10;
  const frameWidth = Math.max(0, width - inset * 2);
  const frameHeight = Math.max(0, height - inset * 2);

  context.save();
  try {
    context.globalAlpha *= 0.42;
    strokeRoundedRect(context, inset, inset, frameWidth, frameHeight, 12, theme.boundary, 1.25);
    context.globalAlpha *= 0.45;
    strokeRoundedRect(context, inset + 3, inset + 3, frameWidth - 6, frameHeight - 6, 10, theme.innerBoundary, 2);
  } finally {
    context.restore();
  }

  context.save();
  try {
    context.globalAlpha *= 0.22;
    context.strokeStyle = theme.accent;
    context.lineWidth = 1.5;
    const tick = 14;
    const corners = [
      [inset + 5, inset + 5, 1, 1],
      [width - inset - 5, inset + 5, -1, 1],
      [inset + 5, height - inset - 5, 1, -1],
      [width - inset - 5, height - inset - 5, -1, -1],
    ] as const;

    for (const [x, y, directionX, directionY] of corners) {
      context.beginPath();
      context.moveTo(x, y + directionY * tick);
      context.lineTo(x, y);
      context.lineTo(x + directionX * tick, y);
      context.stroke();
    }
  } finally {
    context.restore();
  }
}

function drawObstacle(
  context: CanvasRenderingContext2D,
  obstacle: ArenaObstacle | ArenaObstacleEntity,
  arenaWidth: number,
  arenaHeight: number,
  theme: ArenaTheme,
): void {
  const dimensions = GAME_VISUAL_CONFIG.obstacle;
  const colors = GAME_PALETTE.arena;
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
        'rgba(225, 199, 151, 0.12)',
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

    drawLine(context, { x: x + 7, y: y + 1 }, { x: x + width - 7, y: y + 1 }, 'rgba(244, 224, 184, 0.28)', 1);
    drawLine(context, { x: x + 2, y: y + height - 2 }, { x: x + width - 2, y: y + height - 2 }, 'rgba(12, 15, 12, 0.35)', 1.5);
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
          'rgba(31, 38, 29, 0.38)',
          1,
        );
        drawLine(
          context,
          { x: centerX - bagWidth * 0.2, y: centerY - bagHeight * 0.2 },
          { x: centerX + bagWidth * 0.2, y: centerY - bagHeight * 0.2 },
          'rgba(236, 225, 185, 0.16)',
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

  fillRoundedRect(context, x + 4, y + 2, Math.max(0, width - 8), Math.max(1, height * 0.2), 2, 'rgba(239, 224, 186, 0.16)');
  drawLine(context, { x: x + 4, y: y + height - 2 }, { x: x + width - 4, y: y + height - 2 }, 'rgba(12, 17, 14, 0.38)', 1.25);

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
  const colors = GAME_PALETTE.arena.barrel;
  const alive = barrel.health > 0;

  drawCircle(context, x + 2, y + radius * 0.28 + 3, radius * 1.08, {
    fill: theme.shadow,
  });
  drawCircle(context, x, y + 1, radius + 1.5, {
    fill: alive ? colors.edge : GAME_PALETTE.arena.obstacleShadow,
  });

  const drumGradient = context.createRadialGradient(
    x - radius * 0.32,
    y - radius * 0.38,
    1,
    x,
    y,
    radius * 1.15,
  );
  drumGradient.addColorStop(0, alive ? colors.detail : '#27302B');
  drumGradient.addColorStop(0.42, alive ? colors.fill : '#1B2420');
  drumGradient.addColorStop(1, alive ? '#493A2D' : '#111916');
  fillEllipse(context, x, y, radius - 1.5, radius - 1.5, drumGradient);
  drawCircle(context, x, y, radius - 2, {
    stroke: alive ? colors.edge : 'rgba(111, 119, 102, 0.45)',
    lineWidth: 1,
  });

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
    fill: alive ? colors.edge : '#202923',
    stroke: 'rgba(20, 22, 17, 0.48)',
    lineWidth: 1,
  });
  drawCircle(context, x - radius * 0.42, y - radius * 0.45, Math.max(1, radius * 0.1), {
    fill: 'rgba(246, 224, 181, 0.28)',
  });

  if (alive && barrel.health < barrel.maxHealth) {
    drawLine(
      context,
      { x: x - radius * 0.1, y: y - radius * 0.55 },
      { x: x + radius * 0.2, y: y - radius * 0.08 },
      'rgba(238, 215, 174, 0.8)',
      1.25,
    );
  }
}

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

    drawArenaFloor(context, width, height, theme, dimensions.gridSpacing);
    drawArenaFrame(context, width, height, theme);

    if (includeObstacles) {
      renderArenaObstacles(context, width, height, arena);
    }
  } finally {
    context.restore();
  }
}

function renderArenaObstacles(
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
