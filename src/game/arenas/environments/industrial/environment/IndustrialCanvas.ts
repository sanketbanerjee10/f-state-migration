export const INDUSTRIAL = {
  floorBase: '#252F32',
  floorDeep: '#1B2529',
  floorLight: '#3A4748',
  concreteEdge: '#465354',
  steel: '#52666A',
  steelLight: '#82918A',
  steelDark: '#303E43',
  rust: '#9A6047',
  rustDark: '#62443B',
  amber: '#D5A45D',
  cream: '#C6BDA4',
  teal: '#63877F',
  oil: 'rgba(10, 17, 18, 0.34)',
  shadow: 'rgba(4, 9, 11, 0.42)',
  seam: 'rgba(10, 18, 20, 0.42)',
  highlight: 'rgba(222, 218, 190, 0.16)',
} as const;

export type IndustrialPaint = string | CanvasGradient | CanvasPattern;

export interface IndustrialPoint {
  readonly x: number;
  readonly y: number;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function withCanvasState(
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

export function roundedPath(
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

export function fillRounded(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: IndustrialPaint,
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    roundedPath(context, x, y, width, height, radius);
    context.fillStyle = fill;
    context.fill();
  });
}

export function strokeRounded(
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
  withCanvasState(context, () => {
    roundedPath(context, x, y, width, height, radius);
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
  });
}

export function line(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
): void {
  withCanvasState(context, () => {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  });
}

export function ellipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  fill: string,
  rotation = 0,
): void {
  withCanvasState(context, () => {
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    context.fill();
  });
}

export function bolt(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 1.6,
): void {
  withCanvasState(context, () => {
    context.fillStyle = INDUSTRIAL.steelLight;
    context.strokeStyle = INDUSTRIAL.steelDark;
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = INDUSTRIAL.steelDark;
    context.lineWidth = 0.7;
    context.beginPath();
    context.moveTo(x - radius * 0.55, y);
    context.lineTo(x + radius * 0.55, y);
    context.stroke();
  });
}

export function hazardStripe(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: { readonly stripeWidth?: number; readonly alpha?: number } = {},
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    roundedPath(context, x, y, width, height, Math.min(2, height / 3));
    context.clip();
    context.globalAlpha *= options.alpha ?? 0.72;
    context.fillStyle = INDUSTRIAL.amber;
    context.fillRect(x, y, width, height);
    context.strokeStyle = INDUSTRIAL.floorDeep;
    context.lineWidth = options.stripeWidth ?? 4;
    const step = (options.stripeWidth ?? 4) * 2.2;
    for (let offset = -height; offset < width + height; offset += step) {
      context.beginPath();
      context.moveTo(x + offset, y + height);
      context.lineTo(x + offset + height, y);
      context.stroke();
    }
  });
}

export function drawRivetRow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  count: number,
  radius = 1.4,
): void {
  if (count < 2) return;
  for (let index = 0; index < count; index += 1) {
    bolt(context, x + (length * index) / (count - 1), y, radius);
  }
}

export function drawMetalPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 4,
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    fillRounded(context, x + 2, y + 3, width, height, radius, INDUSTRIAL.shadow);

    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, INDUSTRIAL.steelLight);
    gradient.addColorStop(0.12, INDUSTRIAL.steel);
    gradient.addColorStop(1, INDUSTRIAL.steelDark);
    fillRounded(context, x, y, width, height, radius, gradient);
    strokeRounded(context, x + 0.5, y + 0.5, width - 1, height - 1,
      radius, 'rgba(12, 20, 22, 0.72)', 1.2);

    line(context, x + 5, y + 2, x + width - 5, y + 2,
      'rgba(235, 226, 196, 0.22)', 1);
    line(context, x + 5, y + height - 2, x + width - 5, y + height - 2,
      'rgba(7, 14, 17, 0.38)', 1.3);

    const inset = Math.min(5, width * 0.08, height * 0.12);
    strokeRounded(context, x + inset, y + inset,
      width - inset * 2, height - inset * 2,
      Math.max(1, radius - 2), 'rgba(13, 23, 25, 0.36)', 0.8);

    if (width > 28 && height > 16) {
      drawRivetRow(context, x + 5, y + 5, width - 10,
        Math.max(2, Math.floor(width / 34)));
      drawRivetRow(context, x + 5, y + height - 5, width - 10,
        Math.max(2, Math.floor(width / 34)));
    }
  });
}

export function drawConcreteSeam(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  line(context, x1, y1, x2, y2, 'rgba(7, 14, 16, 0.25)', 2);
  line(context, x1, y1 - 0.7, x2, y2 - 0.7,
    'rgba(201, 199, 174, 0.08)', 0.8);
}

export function drawGrate(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  horizontal = true,
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    fillRounded(context, x, y, width, height, 2, INDUSTRIAL.floorDeep);
    strokeRounded(context, x + 0.5, y + 0.5, width - 1, height - 1,
      2, INDUSTRIAL.steelDark, 1);
    context.save();
    roundedPath(context, x + 2, y + 2, width - 4, height - 4, 1);
    context.clip();
    const count = horizontal
      ? Math.max(3, Math.floor(height / 4))
      : Math.max(3, Math.floor(width / 4));
    context.strokeStyle = 'rgba(139, 157, 151, 0.55)';
    context.lineWidth = 1;
    for (let index = 0; index <= count; index += 1) {
      context.beginPath();
      if (horizontal) {
        const yy = y + 2 + ((height - 4) * index) / count;
        context.moveTo(x + 2, yy);
        context.lineTo(x + width - 2, yy);
      } else {
        const xx = x + 2 + ((width - 4) * index) / count;
        context.moveTo(xx, y + 2);
        context.lineTo(xx, y + height - 2);
      }
      context.stroke();
    }
    context.restore();
    line(context, x + 3, y + 2, x + width - 3, y + 2,
      'rgba(226, 222, 192, 0.16)', 0.8);
  });
}

export function drawPipeRun(
  context: CanvasRenderingContext2D,
  points: readonly IndustrialPoint[],
  thickness = 5,
  accent: string = INDUSTRIAL.rust,
): void {
  if (points.length < 2) return;
  withCanvasState(context, () => {
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.strokeStyle = INDUSTRIAL.shadow;
    context.lineWidth = thickness + 3;
    context.beginPath();
    context.moveTo(points[0]!.x + 1, points[0]!.y + 3);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index]!.x + 1, points[index]!.y + 3);
    }
    context.stroke();

    context.strokeStyle = INDUSTRIAL.steelDark;
    context.lineWidth = thickness + 1.5;
    context.beginPath();
    context.moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index]!.x, points[index]!.y);
    }
    context.stroke();

    context.strokeStyle = INDUSTRIAL.steelLight;
    context.lineWidth = Math.max(1, thickness * 0.28);
    context.beginPath();
    context.moveTo(points[0]!.x, points[0]!.y - thickness * 0.2);
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(points[index]!.x, points[index]!.y - thickness * 0.2);
    }
    context.stroke();

    for (const point of points.slice(1, -1)) {
      ellipse(context, point.x, point.y, thickness * 0.9,
        thickness * 0.9, INDUSTRIAL.steelDark);
      ellipse(context, point.x, point.y - 0.6, thickness * 0.55,
        thickness * 0.55, accent);
    }
  });
}
