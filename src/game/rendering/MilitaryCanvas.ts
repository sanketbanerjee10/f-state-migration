export const MILITARY = {
  groundBase: '#45463B',
  groundDeep: '#292D28',
  groundLight: '#62604D',
  concrete: '#66665B',
  concreteLight: '#858477',
  concreteDark: '#3C403A',
  olive: '#626B4B',
  oliveDark: '#3D4938',
  khaki: '#A69A72',
  sand: '#B2A17A',
  steel: '#59615D',
  steelLight: '#899087',
  rust: '#805744',
  warning: '#B99A55',
  warningRed: '#89564A',
  shadow: 'rgba(8, 12, 9, 0.42)',
  seam: 'rgba(18, 22, 17, 0.34)',
  dust: 'rgba(191, 176, 137, 0.12)',
  highlight: 'rgba(220, 211, 178, 0.13)',
} as const;

export type MilitaryPaint = string | CanvasGradient | CanvasPattern;

export interface MilitaryPoint {
  readonly x: number;
  readonly y: number;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function withMilitaryCanvasState(
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
  fill: MilitaryPaint,
): void {
  if (width <= 0 || height <= 0) return;
  withMilitaryCanvasState(context, () => {
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
  withMilitaryCanvasState(context, () => {
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
  withMilitaryCanvasState(context, () => {
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
  withMilitaryCanvasState(context, () => {
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(x, y, radiusX, radiusY, rotation, 0, Math.PI * 2);
    context.fill();
  });
}

export function drawMilitaryBolt(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius = 1.5,
): void {
  withMilitaryCanvasState(context, () => {
    context.fillStyle = MILITARY.steelLight;
    context.strokeStyle = MILITARY.groundDeep;
    context.lineWidth = 0.8;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    line(
      context,
      x - radius * 0.5,
      y,
      x + radius * 0.5,
      y,
      MILITARY.groundDeep,
      0.65,
    );
  });
}

export function drawRivetRow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  count: number,
  radius = 1.3,
): void {
  if (count < 2) return;
  for (let index = 0; index < count; index += 1) {
    drawMilitaryBolt(context, x + (length * index) / (count - 1), y, radius);
  }
}

export function drawConcretePad(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 5,
): void {
  if (width <= 0 || height <= 0) return;
  withMilitaryCanvasState(context, () => {
    fillRounded(context, x + 2, y + 3, width, height, radius, MILITARY.shadow);

    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, MILITARY.concreteLight);
    gradient.addColorStop(0.18, MILITARY.concrete);
    gradient.addColorStop(1, MILITARY.concreteDark);
    fillRounded(context, x, y, width, height, radius, gradient);
    strokeRounded(
      context,
      x + 0.5,
      y + 0.5,
      width - 1,
      height - 1,
      radius,
      'rgba(20, 24, 20, 0.62)',
      1.1,
    );

    line(
      context,
      x + 5,
      y + 3,
      x + width - 5,
      y + 3,
      'rgba(224, 216, 188, 0.16)',
      0.9,
    );

    const crackCount = Math.max(1, Math.floor(width / 180));
    for (let index = 0; index < crackCount; index += 1) {
      const cx = x + width * (0.22 + ((index * 37) % 55) / 100);
      const cy = y + height * (0.25 + ((index * 19) % 50) / 100);
      line(
        context,
        cx,
        cy,
        cx + 5 + (index % 4) * 2,
        cy + 3 + (index % 3) * 2,
        'rgba(25, 29, 24, 0.32)',
        1,
      );
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
  line(context, x1, y1, x2, y2, 'rgba(21, 25, 20, 0.28)', 2);
  line(context, x1, y1 - 0.8, x2, y2 - 0.8, MILITARY.highlight, 0.8);
}

export function drawDrainGrate(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  horizontal = true,
): void {
  if (width <= 0 || height <= 0) return;
  withMilitaryCanvasState(context, () => {
    fillRounded(context, x, y, width, height, 2, MILITARY.groundDeep);
    strokeRounded(
      context,
      x + 0.5,
      y + 0.5,
      width - 1,
      height - 1,
      2,
      MILITARY.steel,
      1,
    );

    context.beginPath();
    roundedPath(context, x + 2, y + 2, width - 4, height - 4, 1);
    context.clip();

    const count = horizontal
      ? Math.max(3, Math.floor(height / 4))
      : Math.max(3, Math.floor(width / 4));
    context.strokeStyle = 'rgba(151, 158, 143, 0.48)';
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
  });
}

export function drawMilitaryMarking(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = MILITARY.warning,
  alpha = 0.42,
): void {
  if (width <= 0 || height <= 0) return;
  withMilitaryCanvasState(context, () => {
    context.globalAlpha *= alpha;
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
  });
}

export function drawTireTrack(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle = 0,
  alpha = 0.18,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(angle);
    context.globalAlpha *= alpha;
    context.strokeStyle = MILITARY.groundDeep;
    context.lineWidth = 4;
    context.setLineDash([13, 8, 5, 9]);
    context.beginPath();
    context.moveTo(0, -4);
    context.lineTo(length, -4);
    context.moveTo(0, 4);
    context.lineTo(length, 4);
    context.stroke();
    context.setLineDash([]);
  });
}

export function drawGroundScuff(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle = 0,
  alpha = 0.12,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(angle);
    context.globalAlpha *= alpha;
    context.strokeStyle = MILITARY.sand;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(length, 1);
    context.stroke();
  });
}

export function drawMetalAccessPlate(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 3,
): void {
  if (width <= 0 || height <= 0) return;
  withMilitaryCanvasState(context, () => {
    fillRounded(context, x + 2, y + 3, width, height, radius, MILITARY.shadow);

    const gradient = context.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, MILITARY.steelLight);
    gradient.addColorStop(0.2, MILITARY.steel);
    gradient.addColorStop(1, MILITARY.oliveDark);
    fillRounded(context, x, y, width, height, radius, gradient);
    strokeRounded(
      context,
      x + 0.5,
      y + 0.5,
      width - 1,
      height - 1,
      radius,
      'rgba(17, 22, 18, 0.72)',
      1,
    );

    drawRivetRow(context, x + 5, y + 5, width - 10, Math.max(2, Math.floor(width / 32)));
    drawRivetRow(
      context,
      x + 5,
      y + height - 5,
      width - 10,
      Math.max(2, Math.floor(width / 32)),
    );

    line(
      context,
      x + 5,
      y + height * 0.5,
      x + width - 5,
      y + height * 0.5,
      'rgba(24, 30, 24, 0.42)',
      0.8,
    );
  });
}
