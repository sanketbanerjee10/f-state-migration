export const CONTAMINATED = {
  floorBase: '#202F32',
  floorDeep: '#172326',
  floorLight: '#35494A',
  concreteEdge: '#465A58',

  steel: '#526966',
  steelLight: '#829B8D',
  steelDark: '#293C3D',

  toxic: '#86C66E',
  toxicDeep: '#477B50',
  toxicLight: '#B4D987',

  warning: '#C5C66B',
  cream: '#B9C5AD',
  teal: '#638B83',

  stain: 'rgba(75, 135, 83, 0.22)',
  shadow: 'rgba(3, 12, 14, 0.48)',
  seam: 'rgba(7, 19, 20, 0.40)',
  highlight: 'rgba(197, 224, 159, 0.12)',
} as const;

export type ContaminatedPaint = string | CanvasGradient | CanvasPattern;

export interface ContaminatedPoint {
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
  fill: ContaminatedPaint,
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
    context.ellipse(x, y, Math.max(0, radiusX), Math.max(0, radiusY),
      rotation, 0, Math.PI * 2);
    context.fill();
  });
}

export interface HazardStripeOptions {
  readonly stripeWidth?: number;
  readonly opacity?: number;
}

export function drawHazardStripe(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: HazardStripeOptions = {},
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    roundedPath(context, x, y, width, height, Math.min(2, height / 3));
    context.clip();
    context.globalAlpha *= clamp01(options.opacity ?? 0.45);
    context.fillStyle = CONTAMINATED.warning;
    context.fillRect(x, y, width, height);
    context.strokeStyle = 'rgba(23, 35, 38, 0.68)';
    const stripeWidth = Math.max(1, options.stripeWidth ?? 4);
    context.lineWidth = stripeWidth;
    const step = stripeWidth * 2.4;
    for (let offset = -height; offset < width + height; offset += step) {
      context.beginPath();
      context.moveTo(x + offset, y + height);
      context.lineTo(x + offset + height, y);
      context.stroke();
    }
  });
}

export function drawBiohazardMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color = CONTAMINATED.warning,
  opacity = 0.6,
): void {
  if (size <= 0) return;
  const radius = size / 2;
  withCanvasState(context, () => {
    context.globalAlpha *= clamp01(opacity);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = Math.max(0.8, radius * 0.11);
    context.lineJoin = 'round';
    context.lineCap = 'round';

    for (let index = 0; index < 3; index += 1) {
      withCanvasState(context, () => {
        context.translate(x, y);
        context.rotate((index * Math.PI * 2) / 3);
        context.beginPath();
        context.moveTo(0, -radius * 0.16);
        context.lineTo(-radius * 0.11, -radius * 0.3);
        context.quadraticCurveTo(
          -radius * 0.43, -radius * 0.35,
          -radius * 0.43, -radius * 0.13,
        );
        context.quadraticCurveTo(
          -radius * 0.43, radius * 0.07,
          -radius * 0.2, radius * 0.15,
        );
        context.lineTo(-radius * 0.12, radius * 0.09);
        context.closePath();
        context.fill();
      });
    }

    context.beginPath();
    context.arc(x, y, radius * 0.19, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(x, y, radius * 0.27, 0, Math.PI * 2);
    context.stroke();
  });
}

export function drawChemicalStain(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation = 0,
  opacity = 1,
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(rotation);
    context.globalAlpha *= clamp01(opacity);
    ellipse(context, 0, 0, width * 0.47, height * 0.37, CONTAMINATED.toxicDeep);
    ellipse(context, -width * 0.2, height * 0.06,
      width * 0.27, height * 0.32, CONTAMINATED.stain);
    ellipse(context, width * 0.19, -height * 0.08,
      width * 0.28, height * 0.24, 'rgba(134, 198, 110, 0.24)');
    ellipse(context, width * 0.03, -height * 0.03,
      width * 0.24, height * 0.14, 'rgba(180, 217, 135, 0.12)');
  });
}

export interface ContainmentPanelOptions {
  readonly warningStripe?: boolean;
  readonly biohazard?: boolean;
}

export function drawContainmentPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: ContainmentPanelOptions = {},
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    fillRounded(context, x + 2, y + 3, width, height, 4, CONTAMINATED.shadow);
    const metal = context.createLinearGradient(x, y, x, y + height);
    metal.addColorStop(0, CONTAMINATED.steelLight);
    metal.addColorStop(0.14, CONTAMINATED.steel);
    metal.addColorStop(1, CONTAMINATED.steelDark);
    fillRounded(context, x, y, width, height, 4, metal);
    strokeRounded(context, x + 0.5, y + 0.5, width - 1, height - 1,
      4, 'rgba(8, 20, 22, 0.78)', 1.2);
    line(context, x + 4, y + 2, x + width - 4, y + 2,
      'rgba(220, 232, 205, 0.2)', 0.8);
    strokeRounded(context, x + 4, y + 4, width - 8, height - 8,
      2, 'rgba(11, 25, 27, 0.4)', 0.8);

    const fastenerRadius = Math.max(0.8, Math.min(1.7, width * 0.025));
    for (const [fastenerX, fastenerY] of [
      [x + 4, y + 4],
      [x + width - 4, y + 4],
      [x + 4, y + height - 4],
      [x + width - 4, y + height - 4],
    ]) {
      ellipse(context, fastenerX, fastenerY, fastenerRadius, fastenerRadius,
        CONTAMINATED.steelLight);
    }

    if (options.warningStripe && width >= 18 && height >= 8) {
      drawHazardStripe(context, x + 6, y + height - 7, width - 12, 4, {
        stripeWidth: 2,
        opacity: 0.42,
      });
    }
    if (options.biohazard && Math.min(width, height) >= 18) {
      drawBiohazardMark(context, x + width / 2, y + height / 2,
        Math.min(width, height) * 0.42, CONTAMINATED.warning, 0.54);
    }
  });
}

export interface VentGrilleOptions {
  readonly residue?: boolean;
}

export function drawVentGrille(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  options: VentGrilleOptions = {},
): void {
  if (width <= 0 || height <= 0) return;
  withCanvasState(context, () => {
    if (options.residue) {
      ellipse(context, x + width * 0.15, y + height * 0.8,
        width * 0.2, height * 0.22, 'rgba(71, 123, 80, 0.2)');
    }
    fillRounded(context, x, y, width, height, 2, CONTAMINATED.floorDeep);
    strokeRounded(context, x + 0.5, y + 0.5, width - 1, height - 1,
      2, CONTAMINATED.steelDark, 1);
    withCanvasState(context, () => {
      roundedPath(context, x + 2, y + 2, width - 4, height - 4, 1);
      context.clip();
      const span = orientation === 'horizontal' ? height : width;
      const count = Math.max(2, Math.floor(span / 4));
      context.lineWidth = 1;
      context.strokeStyle = 'rgba(130, 155, 141, 0.46)';
      for (let index = 0; index <= count; index += 1) {
        context.beginPath();
        if (orientation === 'horizontal') {
          const slatY = y + 2 + ((height - 4) * index) / count;
          context.moveTo(x + 2, slatY);
          context.lineTo(x + width - 2, slatY);
        } else {
          const slatX = x + 2 + ((width - 4) * index) / count;
          context.moveTo(slatX, y + 2);
          context.lineTo(slatX, y + height - 2);
        }
        context.stroke();
      }
    });
    line(context, x + 3, y + 2, x + width - 3, y + 2,
      'rgba(197, 224, 159, 0.13)', 0.8);
  });
}

export function drawToxicGlow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  intensity = 0.35,
): void {
  if (radius <= 0) return;
  withCanvasState(context, () => {
    const strength = clamp01(intensity);
    const glow = context.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(134, 198, 110, ${strength * 0.24})`);
    glow.addColorStop(0.38, `rgba(71, 123, 80, ${strength * 0.13})`);
    glow.addColorStop(1, 'rgba(71, 123, 80, 0)');
    context.fillStyle = glow;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  });
}

export function drawPipeRun(
  context: CanvasRenderingContext2D,
  points: readonly ContaminatedPoint[],
  thickness = 5,
  accent: string = CONTAMINATED.toxicDeep,
): void {
  if (points.length < 2 || thickness <= 0) return;
  withCanvasState(context, () => {
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const strokePath = (color: string, lineWidth: number, offsetY = 0): void => {
      context.strokeStyle = color;
      context.lineWidth = lineWidth;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y + offsetY);
      for (let index = 1; index < points.length; index += 1) {
        context.lineTo(points[index]!.x, points[index]!.y + offsetY);
      }
      context.stroke();
    };

    strokePath(CONTAMINATED.shadow, thickness + 3, 2);
    strokePath(CONTAMINATED.steelDark, thickness + 1.5);
    strokePath(CONTAMINATED.steelLight, Math.max(0.8, thickness * 0.24), -thickness * 0.2);

    for (const point of points.slice(1, -1)) {
      ellipse(context, point.x, point.y, thickness * 0.85,
        thickness * 0.85, CONTAMINATED.steelDark);
      ellipse(context, point.x, point.y - 0.5, thickness * 0.45,
        thickness * 0.45, accent);
    }
  });
}
