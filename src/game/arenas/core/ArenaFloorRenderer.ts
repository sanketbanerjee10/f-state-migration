import { GAME_VISUAL_CONFIG } from '../../rendering/VisualConfig';
import {
  ARENA_THEME_CYCLE,
  type ArenaTheme,
  type ArenaThemeId,
} from '../../arena/ArenaSystem';

type CanvasPaint = string | CanvasGradient | CanvasPattern;

export function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function roundedRectPath(
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

export function fillRoundedRect(
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

export function strokeRoundedRect(
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

export function fillEllipse(
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

export function getArenaTheme(themeId?: ArenaThemeId): ArenaTheme {
  return ARENA_THEME_CYCLE.find((theme) => theme.id === themeId) ??
    ARENA_THEME_CYCLE[0]!;
}

export function drawArenaFloor(
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
  ambient.addColorStop(0, withAlpha(theme.highlight, 0.16));
  ambient.addColorStop(0.48, withAlpha(theme.detail, 0.09));
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
    context.fillStyle = withAlpha(theme.detail, 0.07);
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

export function drawArenaFrame(
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
