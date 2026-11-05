import {
  INDUSTRIAL,
  drawConcreteSeam,
  drawGrate,
  drawMetalPanel,
  drawPipeRun,
  ellipse,
  fillRounded,
  hazardStripe,
  line,
  withCanvasState,
} from './IndustrialCanvas';

function drawFloorBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = INDUSTRIAL.floorBase;
  context.fillRect(0, 0, width, height);

  const ambient = context.createRadialGradient(
    width * 0.48, height * 0.42, 0,
    width * 0.48, height * 0.42, Math.max(width, height) * 0.78,
  );
  ambient.addColorStop(0, 'rgba(117, 143, 132, 0.12)');
  ambient.addColorStop(0.52, 'rgba(72, 99, 96, 0.045)');
  ambient.addColorStop(1, 'rgba(5, 11, 14, 0.22)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  const slabW = Math.max(112, width / 4.2);
  const slabH = Math.max(96, height / 4.1);
  context.save();
  context.strokeStyle = 'rgba(8, 16, 18, 0.22)';
  context.lineWidth = 2;
  for (let x = slabW; x < width; x += slabW) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = slabH; y < height; y += slabH) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  for (let x = slabW; x < width; x += slabW) {
    line(context, x + 2, 0, x + 2, height,
      'rgba(192, 194, 170, 0.055)', 0.8);
    drawConcreteSeam(context, x + 0.5, 0, x + 0.5, height);
  }
  for (let y = slabH; y < height; y += slabH) {
    line(context, 0, y + 2, width, y + 2,
      'rgba(192, 194, 170, 0.045)', 0.8);
    drawConcreteSeam(context, 0, y + 1, width, y + 1);
  }
}

function drawDrainage(context: CanvasRenderingContext2D, width: number, height: number): void {
  const channelY = height * 0.18;
  const channelH = Math.max(10, height * 0.025);
  fillRounded(context, width * 0.08, channelY, width * 0.84,
    channelH, 3, 'rgba(13, 22, 24, 0.44)');
  drawGrate(context, width * 0.1, channelY + 2,
    width * 0.8, channelH - 4, true);

  drawMetalPanel(context, width * 0.045, channelY - 4,
    Math.max(22, width * 0.035), channelH + 8, 3);
  drawMetalPanel(context, width * 0.92, channelY - 4,
    Math.max(22, width * 0.035), channelH + 8, 3);
}

function drawMaintenancePanels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const panelW = Math.max(34, width * 0.055);
  const panelH = Math.max(24, height * 0.065);
  const placements = [
    [width * 0.12, height * 0.38],
    [width * 0.82, height * 0.32],
    [width * 0.76, height * 0.78],
    [width * 0.2, height * 0.76],
  ] as const;

  for (const [x, y] of placements) {
    drawMetalPanel(context, x, y, panelW, panelH, 3);
    line(context, x + panelW * 0.25, y + panelH * 0.5,
      x + panelW * 0.75, y + panelH * 0.5,
      'rgba(18, 29, 31, 0.7)', 1.2);
  }
}

function drawSafetyMarkings(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const laneY = height * 0.89;
  withCanvasState(context, () => {
    context.globalAlpha = 0.48;
    context.strokeStyle = INDUSTRIAL.amber;
    context.lineWidth = 2;
    context.setLineDash([22, 14, 7, 14]);
    context.beginPath();
    context.moveTo(width * 0.12, laneY);
    context.lineTo(width * 0.88, laneY);
    context.stroke();
    context.setLineDash([]);
  });

  hazardStripe(context, width * 0.035, height * 0.055,
    width * 0.12, 5, { stripeWidth: 3, alpha: 0.38 });
  hazardStripe(context, width * 0.845, height * 0.055,
    width * 0.12, 5, { stripeWidth: 3, alpha: 0.38 });
}

function drawPipeAndCableRoutes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  drawPipeRun(context, [
    { x: width * 0.035, y: height * 0.3 },
    { x: width * 0.07, y: height * 0.3 },
    { x: width * 0.07, y: height * 0.68 },
    { x: width * 0.16, y: height * 0.68 },
  ], 3.2, INDUSTRIAL.rust);

  drawPipeRun(context, [
    { x: width * 0.965, y: height * 0.3 },
    { x: width * 0.93, y: height * 0.3 },
    { x: width * 0.93, y: height * 0.64 },
    { x: width * 0.84, y: height * 0.64 },
  ], 3.2, INDUSTRIAL.teal);
}

function drawOilAndWear(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const stains = [
    { x: 0.31, y: 0.25, rx: 0.055, ry: 0.022, a: -0.2 },
    { x: 0.68, y: 0.52, rx: 0.07, ry: 0.026, a: 0.28 },
    { x: 0.43, y: 0.82, rx: 0.045, ry: 0.018, a: -0.1 },
    { x: 0.86, y: 0.84, rx: 0.04, ry: 0.016, a: 0.2 },
  ] as const;

  for (const stain of stains) {
    ellipse(context, width * stain.x, height * stain.y,
      width * stain.rx, height * stain.ry, INDUSTRIAL.oil, stain.a);
    ellipse(context, width * stain.x - 4, height * stain.y - 1,
      width * stain.rx * 0.42, height * stain.ry * 0.38,
      'rgba(120, 137, 126, 0.09)', stain.a);
  }

  for (let index = 0; index < 26; index += 1) {
    const x = ((index * 173.7 + 61) % 997) / 997 * width;
    const y = ((index * 91.3 + 37) % 991) / 991 * height;
    const length = 4 + (index % 5) * 2;
    line(context, x, y, x + length, y + (index % 2 ? 1.2 : -1.2),
      'rgba(199, 194, 168, 0.075)', 0.8);
  }
}

function drawFloorVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const vignette = context.createRadialGradient(
    width * 0.5, height * 0.48, Math.min(width, height) * 0.2,
    width * 0.5, height * 0.48, Math.max(width, height) * 0.78,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.72, 'rgba(2, 7, 9, 0.08)');
  vignette.addColorStop(1, 'rgba(2, 7, 9, 0.32)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

export function drawIndustrialFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;

  withCanvasState(context, () => {
    drawFloorBase(context, width, height);
    drawDrainage(context, width, height);
    drawPipeAndCableRoutes(context, width, height);
    drawMaintenancePanels(context, width, height);
    drawSafetyMarkings(context, width, height);
    drawOilAndWear(context, width, height);
    drawFloorVignette(context, width, height);
  });
}
