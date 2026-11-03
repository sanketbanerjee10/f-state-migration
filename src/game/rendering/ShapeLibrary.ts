export interface Point {
  x: number;
  y: number;
}

export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  lineWidth?: number;
}

export type GameSymbol =
  | 'plus'
  | 'crosshair'
  | 'speed'
  | 'shield'
  | 'starburst'
  | 'snowflake'
  | 'chevron'
  | 'star'
  | 'magnet'
  | 'turret'
  | 'curse';

function withCanvasState(
  context: CanvasRenderingContext2D,
  draw: () => void,
): void {
  context.save();
  try {
    draw();
  } finally {
    context.restore();
  }
}

function applyShapeStyle(
  context: CanvasRenderingContext2D,
  style: ShapeStyle,
): void {
  if (style.fill !== undefined) context.fillStyle = style.fill;
  if (style.stroke !== undefined) context.strokeStyle = style.stroke;
  if (style.lineWidth !== undefined) context.lineWidth = style.lineWidth;
}

function traceRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const boundedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(x + boundedRadius, y);
  context.lineTo(x + width - boundedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + boundedRadius);
  context.lineTo(x + width, y + height - boundedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - boundedRadius,
    y + height,
  );
  context.lineTo(x + boundedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - boundedRadius);
  context.lineTo(x, y + boundedRadius);
  context.quadraticCurveTo(x, y, x + boundedRadius, y);
  context.closePath();
}

function traceStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  rotation: number,
): void {
  context.beginPath();
  for (let point = 0; point < points * 2; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + (point * Math.PI) / points - Math.PI / 2;
    const pointX = x + Math.cos(angle) * radius;
    const pointY = y + Math.sin(angle) * radius;
    if (point === 0) context.moveTo(pointX, pointY);
    else context.lineTo(pointX, pointY);
  }
  context.closePath();
}

export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: ShapeStyle = {},
): void {
  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    context.beginPath();
    context.arc(x, y, Math.max(0, radius), 0, Math.PI * 2);
    if (style.fill !== undefined) context.fill();
    if (style.stroke !== undefined) context.stroke();
  });
}

export function drawPolygon(
  context: CanvasRenderingContext2D,
  points: readonly Point[],
  style: ShapeStyle = {},
): void {
  if (points.length < 3) return;

  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    context.beginPath();
    context.moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) {
      const point = points[index]!;
      context.lineTo(point.x, point.y);
    }
    context.closePath();
    if (style.fill !== undefined) context.fill();
    if (style.stroke !== undefined) context.stroke();
  });
}

export function drawRoundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  style: ShapeStyle = {},
): void {
  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    traceRoundedRectangle(context, x, y, width, height, radius);
    if (style.fill !== undefined) context.fill();
    if (style.stroke !== undefined) context.stroke();
  });
}

export function drawLine(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  stroke: string,
  lineWidth = 1,
): void {
  withCanvasState(context, () => {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  });
}

export function drawRing(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  stroke: string,
  lineWidth = 1,
  startAngle = 0,
  endAngle = Math.PI * 2,
): void {
  withCanvasState(context, () => {
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.arc(x, y, Math.max(0, radius), startAngle, endAngle);
    context.stroke();
  });
}

export function drawStarburst(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  style: ShapeStyle = {},
  rotation = 0,
): void {
  if (!Number.isInteger(points) || points < 2) {
    throw new RangeError('A starburst must have at least two points.');
  }

  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    traceStar(context, x, y, outerRadius, innerRadius, points, rotation);
    if (style.fill !== undefined) context.fill();
    if (style.stroke !== undefined) context.stroke();
  });
}

export function drawSymbol(
  context: CanvasRenderingContext2D,
  symbol: GameSymbol,
  x: number,
  y: number,
  size: number,
  color: string,
  lineWidth = Math.max(1.5, size * 0.13),
): void {
  const radius = Math.max(0, size);
  const innerRadius = radius * 0.42;
  const farRadius = radius * 0.9;

  switch (symbol) {
    case 'plus':
      drawLine(context, { x: x - radius, y }, { x: x + radius, y }, color, lineWidth);
      drawLine(context, { x, y: y - radius }, { x, y: y + radius }, color, lineWidth);
      break;
    case 'crosshair':
      drawRing(context, x, y, innerRadius, color, lineWidth);
      drawLine(context, { x: x - radius, y }, { x: x - innerRadius, y }, color, lineWidth);
      drawLine(context, { x: x + innerRadius, y }, { x: x + radius, y }, color, lineWidth);
      drawLine(context, { x, y: y - radius }, { x, y: y - innerRadius }, color, lineWidth);
      drawLine(context, { x, y: y + innerRadius }, { x, y: y + radius }, color, lineWidth);
      break;
    case 'speed':
      for (const offset of [-0.5, 0, 0.5]) {
        const lineY = y + radius * offset;
        drawLine(
          context,
          { x: x - radius, y: lineY },
          { x: x + radius * 0.35, y: lineY },
          color,
          lineWidth,
        );
      }
      break;
    case 'shield':
      drawPolygon(
        context,
        [
          { x: x - radius * 0.82, y: y - radius * 0.68 },
          { x: x + radius * 0.82, y: y - radius * 0.68 },
          { x: x + radius * 0.66, y: y + radius * 0.1 },
          { x, y: y + radius },
          { x: x - radius * 0.66, y: y + radius * 0.1 },
        ],
        { stroke: color, lineWidth },
      );
      break;
    case 'starburst':
      drawStarburst(
        context,
        x,
        y,
        radius,
        innerRadius * 0.5,
        8,
        { stroke: color, lineWidth },
        Math.PI / 8,
      );
      break;
    case 'magnet':
      drawLine(
        context,
        { x: x - radius * 0.65, y: y - radius * 0.8 },
        { x: x - radius * 0.65, y: y + radius * 0.15 },
        color,
        lineWidth * 1.5,
      );
      drawLine(
        context,
        { x: x + radius * 0.65, y: y - radius * 0.8 },
        { x: x + radius * 0.65, y: y + radius * 0.15 },
        color,
        lineWidth * 1.5,
      );
      drawLine(
        context,
        { x: x - radius * 0.65, y: y + radius * 0.15 },
        { x: x - radius * 0.25, y: y + radius * 0.75 },
        color,
        lineWidth * 1.5,
      );
      drawLine(
        context,
        { x: x + radius * 0.65, y: y + radius * 0.15 },
        { x: x + radius * 0.25, y: y + radius * 0.75 },
        color,
        lineWidth * 1.5,
      );
      drawLine(
        context,
        { x: x - radius * 0.65, y: y - radius * 0.8 },
        { x: x - radius * 0.22, y: y - radius * 0.8 },
        color,
        lineWidth * 1.5,
      );
      drawLine(
        context,
        { x: x + radius * 0.22, y: y - radius * 0.8 },
        { x: x + radius * 0.65, y: y - radius * 0.8 },
        color,
        lineWidth * 1.5,
      );
      break;
    case 'turret':
      drawRoundedRectangle(
        context,
        x - radius * 0.55,
        y - radius * 0.55,
        radius * 1.1,
        radius * 1.1,
        radius * 0.15,
        { stroke: color, lineWidth },
      );
      drawLine(
        context,
        { x, y },
        { x: x + radius * 0.8, y: y - radius * 0.8 },
        color,
        lineWidth,
      );
      break;
    case 'curse':
      drawStarburst(
        context,
        x,
        y,
        radius,
        innerRadius * 0.65,
        5,
        { stroke: color, lineWidth },
        Math.PI / 5,
      );
      break;
    case 'snowflake':
      for (let branch = 0; branch < 3; branch += 1) {
        const angle = (branch * Math.PI) / 3;
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        drawLine(context, { x: x - dx, y: y - dy }, { x: x + dx, y: y + dy }, color, lineWidth);
      }
      break;
    case 'chevron':
      drawLine(
        context,
        { x: x - radius * 0.65, y: y - radius },
        { x: x + radius * 0.25, y },
        color,
        lineWidth,
      );
      drawLine(
        context,
        { x: x + radius * 0.25, y },
        { x: x - radius * 0.65, y: y + radius },
        color,
        lineWidth,
      );
      drawLine(
        context,
        { x: x - radius * 0.05, y: y - radius },
        { x: x + radius * 0.85, y },
        color,
        lineWidth,
      );
      drawLine(
        context,
        { x: x + radius * 0.85, y },
        { x: x - radius * 0.05, y: y + radius },
        color,
        lineWidth,
      );
      break;
    case 'star':
      drawStarburst(context, x, y, radius, innerRadius, 4, {
        fill: color,
        stroke: color,
        lineWidth,
      });
      break;
    default: {
      const exhaustive: never = symbol;
      throw new Error(`Unsupported game symbol: ${exhaustive}`);
    }
  }
}

export function drawRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: ShapeStyle = {},
): void {
  withCanvasState(context, () => {
    applyShapeStyle(context, style);
    if (style.fill !== undefined) context.fillRect(x, y, width, height);
    if (style.stroke !== undefined) context.strokeRect(x, y, width, height);
  });
}
