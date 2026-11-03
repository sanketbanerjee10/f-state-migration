import type { GameItemType } from '../core/GameState';
import {
  drawCircle,
  drawLine,
  drawPolygon,
  drawRoundedRectangle,
  drawStarburst,
} from './ShapeLibrary';

function drawHealthSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const thickness = size * 0.58;
  const length = size * 1.72;
  drawRoundedRectangle(
    context,
    x - thickness / 2,
    y - length / 2,
    thickness,
    length,
    thickness * 0.14,
    { fill: color },
  );
  drawRoundedRectangle(
    context,
    x - length / 2,
    y - thickness / 2,
    length,
    thickness,
    thickness * 0.14,
    { fill: color },
  );
}

function drawDamageSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawLine(
    context,
    { x: x - size * 0.95, y: y + size * 0.54 },
    { x: x - size * 0.08, y: y - size * 0.13 },
    color,
    size * 0.16,
  );
  drawLine(
    context,
    { x: x - size * 0.8, y: y + size * 0.9 },
    { x: x + size * 0.15, y: y + size * 0.16 },
    color,
    size * 0.1,
  );
  drawPolygon(
    context,
    [
      { x: x + size * 0.88, y: y - size * 0.88 },
      { x: x + size * 0.52, y: y + size * 0.15 },
      { x: x + size * 0.1, y: y + size * 0.48 },
      { x: x - size * 0.24, y: y + size * 0.08 },
      { x: x + size * 0.12, y: y - size * 0.38 },
    ],
    { fill: color, stroke: outlineColor, lineWidth: size * 0.12 },
  );
}

function drawRapidFireSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  for (const offset of [-0.62, 0, 0.62]) {
    const bulletY = y + size * offset;
    drawLine(
      context,
      { x: x - size * 0.95, y: bulletY },
      { x: x - size * 0.12, y: bulletY },
      color,
      size * 0.12,
    );
    drawPolygon(context, [
      { x: x + size * 0.88, y: bulletY },
      { x: x + size * 0.3, y: bulletY - size * 0.19 },
      { x: x - size * 0.18, y: bulletY - size * 0.15 },
      { x: x - size * 0.18, y: bulletY + size * 0.15 },
      { x: x + size * 0.3, y: bulletY + size * 0.19 },
    ], { fill: color });
  }
}

function drawShieldSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawPolygon(context, [
    { x: x - size * 0.82, y: y - size * 0.75 },
    { x: x + size * 0.82, y: y - size * 0.75 },
    { x: x + size * 0.7, y: y + size * 0.05 },
    { x, y: y + size * 0.9 },
    { x: x - size * 0.7, y: y + size * 0.05 },
  ], { fill: color, stroke: outlineColor, lineWidth: size * 0.16 });
  drawLine(
    context,
    { x, y: y - size * 0.54 },
    { x, y: y + size * 0.55 },
    outlineColor,
    size * 0.1,
  );
}

function drawBombSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawCircle(context, x - size * 0.08, y + size * 0.2, size * 0.56, {
    fill: color,
    stroke: outlineColor,
    lineWidth: size * 0.13,
  });
  drawCircle(context, x - size * 0.26, y - size * 0.01, size * 0.13, {
    fill: '#fff4ff',
  });
  drawLine(
    context,
    { x: x + size * 0.27, y: y - size * 0.27 },
    { x: x + size * 0.5, y: y - size * 0.68 },
    outlineColor,
    size * 0.18,
  );
  drawLine(
    context,
    { x: x + size * 0.32, y: y - size * 0.34 },
    { x: x + size * 0.54, y: y - size * 0.69 },
    color,
    size * 0.09,
  );
  drawStarburst(
    context,
    x + size * 0.58,
    y - size * 0.72,
    size * 0.25,
    size * 0.12,
    4,
    { fill: '#ffd45c' },
    Math.PI / 4,
  );
}

function drawMagnetSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  accentColor: string,
): void {
  context.save();
  try {
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = size * 0.27;
    context.beginPath();
    context.moveTo(x - size * 0.53, y - size * 0.58);
    context.lineTo(x - size * 0.53, y + size * 0.18);
    context.quadraticCurveTo(
      x,
      y + size * 0.95,
      x + size * 0.53,
      y + size * 0.18,
    );
    context.lineTo(x + size * 0.53, y - size * 0.58);
    context.stroke();
  } finally {
    context.restore();
  }
  drawLine(
    context,
    { x: x - size * 0.53, y: y - size * 0.58 },
    { x: x - size * 0.53, y: y - size * 0.24 },
    accentColor,
    size * 0.28,
  );
  drawLine(
    context,
    { x: x + size * 0.53, y: y - size * 0.58 },
    { x: x + size * 0.53, y: y - size * 0.24 },
    '#f5fdff',
    size * 0.28,
  );
  drawCircle(context, x - size * 0.83, y + size * 0.72, size * 0.12, {
    fill: '#f5fdff',
  });
  drawCircle(context, x + size * 0.82, y + size * 0.7, size * 0.1, {
    fill: '#f5fdff',
  });
}

function drawTurretSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawPolygon(context, [
    { x: x - size * 0.58, y: y + size * 0.7 },
    { x: x + size * 0.58, y: y + size * 0.7 },
    { x: x + size * 0.38, y: y + size * 0.9 },
    { x: x - size * 0.38, y: y + size * 0.9 },
  ], { fill: outlineColor });
  drawPolygon(context, [
    { x: x - size * 0.28, y: y + size * 0.14 },
    { x: x + size * 0.28, y: y + size * 0.14 },
    { x: x + size * 0.48, y: y + size * 0.72 },
    { x: x - size * 0.48, y: y + size * 0.72 },
  ], { fill: color, stroke: outlineColor, lineWidth: size * 0.11 });
  drawCircle(context, x, y - size * 0.14, size * 0.36, {
    fill: color,
    stroke: outlineColor,
    lineWidth: size * 0.12,
  });
  drawRoundedRectangle(
    context,
    x + size * 0.05,
    y - size * 0.42,
    size * 0.82,
    size * 0.2,
    size * 0.08,
    { fill: color, stroke: outlineColor, lineWidth: size * 0.1 },
  );
  drawCircle(context, x + size * 0.82, y - size * 0.32, size * 0.07, {
    fill: outlineColor,
  });
  drawLine(
    context,
    { x: x - size * 0.2, y: y + size * 0.46 },
    { x: x + size * 0.2, y: y + size * 0.46 },
    '#eaffff',
    size * 0.1,
  );
}

function drawCursedSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawPolygon(context, [
    { x: x - size * 0.68, y: y - size * 0.36 },
    { x: x - size * 0.78, y: y - size * 0.93 },
    { x: x - size * 0.24, y: y - size * 0.63 },
    { x, y: y - size * 0.98 },
    { x: x + size * 0.28, y: y - size * 0.63 },
    { x: x + size * 0.78, y: y - size * 0.86 },
    { x: x + size * 0.65, y: y - size * 0.28 },
  ], { fill: color, stroke: outlineColor, lineWidth: size * 0.1 });
  drawCircle(context, x, y - size * 0.08, size * 0.62, {
    fill: color,
    stroke: outlineColor,
    lineWidth: size * 0.12,
  });
  drawPolygon(context, [
    { x: x - size * 0.48, y: y + size * 0.18 },
    { x: x + size * 0.48, y: y + size * 0.18 },
    { x: x + size * 0.34, y: y + size * 0.68 },
    { x: x + size * 0.14, y: y + size * 0.78 },
    { x, y: y + size * 0.61 },
    { x: x - size * 0.14, y: y + size * 0.78 },
    { x: x - size * 0.34, y: y + size * 0.68 },
  ], { fill: color, stroke: outlineColor, lineWidth: size * 0.09 });
  drawPolygon(context, [
    { x: x - size * 0.43, y: y - size * 0.18 },
    { x: x - size * 0.08, y: y - size * 0.02 },
    { x: x - size * 0.4, y: y + size * 0.1 },
  ], { fill: outlineColor });
  drawPolygon(context, [
    { x: x + size * 0.43, y: y - size * 0.18 },
    { x: x + size * 0.08, y: y - size * 0.02 },
    { x: x + size * 0.4, y: y + size * 0.1 },
  ], { fill: outlineColor });
  drawPolygon(context, [
    { x, y: y + size * 0.13 },
    { x: x - size * 0.12, y: y + size * 0.32 },
    { x: x + size * 0.12, y: y + size * 0.32 },
  ], { fill: outlineColor });
}

function drawRareGoldSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
): void {
  drawStarburst(
    context,
    x,
    y,
    size * 0.9,
    size * 0.42,
    5,
    { fill: color, stroke: outlineColor, lineWidth: size * 0.09 },
  );
}

export function drawOrbSymbol(
  context: CanvasRenderingContext2D,
  type: GameItemType,
  x: number,
  y: number,
  size: number,
  color: string,
  outlineColor: string,
  accentColor: string,
): void {
  switch (type) {
    case 'health':
      drawHealthSymbol(context, x, y, size, color);
      break;
    case 'damage':
      drawDamageSymbol(context, x, y, size, color, outlineColor);
      break;
    case 'rapidFire':
      drawRapidFireSymbol(context, x, y, size, color);
      break;
    case 'shield':
      drawShieldSymbol(context, x, y, size, color, outlineColor);
      break;
    case 'bomb':
      drawBombSymbol(context, x, y, size, color, outlineColor);
      break;
    case 'magnet':
      drawMagnetSymbol(context, x, y, size, color, accentColor);
      break;
    case 'turret':
      drawTurretSymbol(context, x, y, size, color, outlineColor);
      break;
    case 'cursed':
      drawCursedSymbol(context, x, y, size, color, outlineColor);
      break;
    case 'rareGold':
      drawRareGoldSymbol(context, x, y, size, color, outlineColor);
      break;
  }
}
