import {
  MILITARY,
  ellipse,
  line,
  withMilitaryCanvasState,
} from './MilitaryCanvas';

function drawGroundBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = MILITARY.groundBase;
  context.fillRect(0, 0, width, height);

  const ambient = context.createRadialGradient(
    width * 0.48,
    height * 0.43,
    0,
    width * 0.48,
    height * 0.43,
    Math.max(width, height) * 0.78,
  );
  ambient.addColorStop(0, 'rgba(151, 143, 105, 0.10)');
  ambient.addColorStop(0.55, 'rgba(107, 105, 78, 0.035)');
  ambient.addColorStop(1, 'rgba(12, 17, 12, 0.27)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);
}

function drawDustPatches(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const patches = [
    [0.13, 0.18, 0.075, 0.035, -0.25],
    [0.82, 0.16, 0.060, 0.030, 0.20],
    [0.08, 0.77, 0.070, 0.035, 0.15],
    [0.91, 0.72, 0.065, 0.028, -0.30],
    [0.49, 0.89, 0.085, 0.025, 0.05],
    [0.72, 0.48, 0.045, 0.022, 0.35],
  ] as const;

  for (const [x, y, rx, ry, angle] of patches) {
    ellipse(
      context,
      width * x,
      height * y,
      width * rx,
      height * ry,
      MILITARY.dust,
      angle,
    );
  }

  const variations = [
    [0.27, 0.35, 0.055, 0.025, 0.4],
    [0.61, 0.25, 0.045, 0.020, -0.2],
    [0.36, 0.72, 0.050, 0.024, 0.1],
    [0.76, 0.83, 0.040, 0.020, -0.4],
  ] as const;

  for (const [x, y, rx, ry, angle] of variations) {
    ellipse(
      context,
      width * x,
      height * y,
      width * rx,
      height * ry,
      'rgba(20, 24, 18, 0.055)',
      angle,
    );
  }
}

function drawTireTrackSegment(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  angle: number,
  alpha: number,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(angle);
    context.globalAlpha *= alpha;
    context.strokeStyle = MILITARY.groundDeep;
    context.lineWidth = 3.5;
    context.setLineDash([10, 8, 4, 11]);

    context.beginPath();
    context.moveTo(0, -3);
    context.lineTo(length, -3);
    context.moveTo(0, 3);
    context.lineTo(length, 3);
    context.stroke();

    context.setLineDash([]);
  });
}

function drawVehicleWear(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  drawTireTrackSegment(context, width * 0.10, height * 0.43, width * 0.16, 0.16, 0.15);
  drawTireTrackSegment(context, width * 0.67, height * 0.57, width * 0.17, -0.12, 0.13);
  drawTireTrackSegment(context, width * 0.28, height * 0.82, width * 0.12, -0.08, 0.10);
}

function drawGroundScuffs(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const scuffs = [
    [0.08, 0.55, 13, -0.2],
    [0.20, 0.65, 9, 0.35],
    [0.78, 0.63, 12, -0.15],
    [0.91, 0.49, 10, 0.2],
    [0.16, 0.91, 11, -0.3],
    [0.84, 0.90, 9, 0.25],
    [0.43, 0.18, 8, 0.15],
    [0.58, 0.77, 10, -0.25],
  ] as const;

  for (const [x, y, length, angle] of scuffs) {
    withMilitaryCanvasState(context, () => {
      context.translate(width * x, height * y);
      context.rotate(angle);
      context.strokeStyle = 'rgba(191, 176, 137, 0.12)';
      context.lineWidth = 1.1;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(length, 1);
      context.stroke();
    });
  }
}

function drawGravelClusters(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const stones = [
    [0.045, 0.24, 2.0], [0.075, 0.27, 1.3], [0.11, 0.23, 1.5],
    [0.91, 0.27, 1.8], [0.94, 0.30, 1.2], [0.88, 0.32, 1.4],
    [0.13, 0.86, 1.7], [0.17, 0.89, 1.2], [0.10, 0.91, 1.3],
    [0.86, 0.86, 1.6], [0.90, 0.89, 1.2], [0.83, 0.91, 1.4],
  ] as const;

  for (const [x, y, radius] of stones) {
    ellipse(
      context,
      width * x,
      height * y,
      radius,
      radius * 0.65,
      'rgba(27, 31, 25, 0.22)',
    );
  }
}

function drawBrokenConcreteRemnant(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  rotation: number,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(rotation);
    context.scale(scale, scale);

    context.beginPath();
    context.moveTo(-27, -9);
    context.lineTo(-18, -18);
    context.lineTo(-4, -15);
    context.lineTo(5, -21);
    context.lineTo(22, -12);
    context.lineTo(25, 1);
    context.lineTo(15, 12);
    context.lineTo(-2, 10);
    context.lineTo(-12, 16);
    context.lineTo(-25, 7);
    context.closePath();

    context.fillStyle = 'rgba(60, 64, 58, 0.78)';
    context.fill();

    context.beginPath();
    context.moveTo(-23, -8);
    context.lineTo(-16, -14);
    context.lineTo(-3, -12);
    context.lineTo(5, -17);
    context.lineTo(19, -10);
    context.lineTo(20, 0);
    context.lineTo(12, 8);
    context.lineTo(-3, 6);
    context.lineTo(-12, 11);
    context.lineTo(-21, 4);
    context.closePath();

    context.fillStyle = 'rgba(102, 102, 91, 0.62)';
    context.fill();
    line(context, -13, -7, 1, -4, 'rgba(210, 204, 179, 0.10)', 1);
  });
}

function drawConcreteRemnants(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  drawBrokenConcreteRemnant(context, width * 0.055, height * 0.39, 0.85, -0.18);
  drawBrokenConcreteRemnant(context, width * 0.93, height * 0.66, 0.72, 0.32);
  drawBrokenConcreteRemnant(context, width * 0.23, height * 0.95, 0.58, -0.12);
}

function drawSparseWeeds(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const weeds = [
    [0.025, 0.13], [0.055, 0.94], [0.96, 0.12],
    [0.975, 0.83], [0.30, 0.975], [0.70, 0.965],
  ] as const;

  for (const [x, y] of weeds) {
    withMilitaryCanvasState(context, () => {
      const px = width * x;
      const py = height * y;
      context.strokeStyle = 'rgba(105, 117, 75, 0.42)';
      context.lineWidth = 1.2;
      context.lineCap = 'round';

      context.beginPath();
      context.moveTo(px, py);
      context.lineTo(px - 2, py - 5);
      context.moveTo(px, py);
      context.lineTo(px + 2, py - 4);
      context.moveTo(px, py);
      context.lineTo(px + 4, py - 3);
      context.stroke();
    });
  }
}

function drawFadedPaintFragments(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  withMilitaryCanvasState(context, () => {
    context.globalAlpha = 0.22;
    context.strokeStyle = MILITARY.warning;
    context.lineWidth = 2;
    context.setLineDash([7, 12]);

    context.beginPath();
    context.moveTo(width * 0.07, height * 0.30);
    context.lineTo(width * 0.13, height * 0.30);
    context.moveTo(width * 0.86, height * 0.35);
    context.lineTo(width * 0.91, height * 0.35);
    context.stroke();

    context.setLineDash([]);
  });
}

function drawPerimeterShade(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.26,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.76,
  );

  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(0.72, 'rgba(12, 16, 12, 0.035)');
  gradient.addColorStop(1, 'rgba(12, 16, 12, 0.24)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

export function drawMilitaryFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;

  withMilitaryCanvasState(context, () => {
    drawGroundBase(context, width, height);
    drawDustPatches(context, width, height);
    drawVehicleWear(context, width, height);
    drawGroundScuffs(context, width, height);
    drawGravelClusters(context, width, height);
    drawConcreteRemnants(context, width, height);
    drawSparseWeeds(context, width, height);
    drawFadedPaintFragments(context, width, height);
    drawPerimeterShade(context, width, height);
  });
}
