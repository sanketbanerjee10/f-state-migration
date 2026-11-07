import {
  CONTAMINATED,
  drawBiohazardMark,
  drawChemicalStain,
  drawContainmentPanel,
  drawHazardStripe,
  drawPipeRun,
  drawToxicGlow,
  drawVentGrille,
  ellipse,
  line,
  withCanvasState,
} from './ContaminatedCanvas';

function drawFloorBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  context.fillStyle = CONTAMINATED.floorBase;
  context.fillRect(0, 0, width, height);

  const ambient = context.createRadialGradient(
    width * 0.48, height * 0.42, 0,
    width * 0.48, height * 0.42, Math.max(width, height) * 0.78,
  );
  ambient.addColorStop(0, 'rgba(130, 155, 141, 0.09)');
  ambient.addColorStop(0.54, 'rgba(99, 139, 131, 0.035)');
  ambient.addColorStop(1, 'rgba(5, 14, 17, 0.3)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, width, height);

  const columns = [0.24, 0.51, 0.76] as const;
  const rows = [0.29, 0.57, 0.82] as const;
  for (let index = 0; index < columns.length; index += 1) {
    const x = width * columns[index]!;
    const yOffset = index % 2 === 0 ? height * 0.08 : 0;
    line(context, x, yOffset, x, height - yOffset,
      CONTAMINATED.seam, 2);
    line(context, x + 1.5, yOffset, x + 1.5, height - yOffset,
      'rgba(197, 224, 159, 0.035)', 0.8);
  }
  for (let index = 0; index < rows.length; index += 1) {
    const y = height * rows[index]!;
    const xOffset = index % 2 === 0 ? width * 0.06 : 0;
    line(context, xOffset, y, width - xOffset, y,
      CONTAMINATED.seam, 2);
    line(context, xOffset, y + 1.5, width - xOffset, y + 1.5,
      'rgba(197, 224, 159, 0.03)', 0.8);
  }

  const panelTones = [
    { x: 0.03, y: 0.04, w: 0.19, h: 0.23 },
    { x: 0.53, y: 0.05, w: 0.2, h: 0.22 },
    { x: 0.78, y: 0.32, w: 0.18, h: 0.22 },
    { x: 0.28, y: 0.6, w: 0.21, h: 0.2 },
    { x: 0.04, y: 0.83, w: 0.2, h: 0.13 },
    { x: 0.78, y: 0.8, w: 0.18, h: 0.15 },
  ] as const;
  for (let index = 0; index < panelTones.length; index += 1) {
    const panel = panelTones[index]!;
    context.fillStyle = index % 2 === 0
      ? 'rgba(53, 73, 74, 0.12)'
      : 'rgba(70, 90, 88, 0.075)';
    context.fillRect(width * panel.x, height * panel.y,
      width * panel.w, height * panel.h);
    line(context, width * panel.x, height * panel.y,
      width * (panel.x + panel.w), height * panel.y,
      'rgba(130, 155, 141, 0.055)', 1);
  }

  const edge = Math.min(width, height) * 0.018;
  line(context, edge, edge, width - edge, edge, 'rgba(7, 19, 20, 0.32)', 2);
  line(context, edge, height - edge, width - edge, height - edge,
    'rgba(7, 19, 20, 0.32)', 2);
}

function drawContainmentMarkings(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const stripeWidth = Math.max(2, Math.min(4, Math.min(width, height) * 0.009));
  const bandHeight = Math.max(4, Math.min(7, height * 0.012));
  drawHazardStripe(context, width * 0.055, height * 0.085,
    width * 0.18, bandHeight, { stripeWidth, opacity: 0.34 });
  drawHazardStripe(context, width * 0.765, height * 0.885,
    width * 0.18, bandHeight, { stripeWidth, opacity: 0.3 });
  drawHazardStripe(context, width * 0.055, height * 0.79,
    bandHeight, height * 0.12, { stripeWidth, opacity: 0.26 });

  withCanvasState(context, () => {
    context.globalAlpha = 0.32;
    context.strokeStyle = CONTAMINATED.cream;
    context.lineWidth = Math.max(1, Math.min(2, Math.min(width, height) * 0.003));
    context.setLineDash([width * 0.025, width * 0.018, width * 0.008, width * 0.018]);
    context.beginPath();
    context.moveTo(width * 0.14, height * 0.13);
    context.lineTo(width * 0.4, height * 0.13);
    context.moveTo(width * 0.86, height * 0.22);
    context.lineTo(width * 0.86, height * 0.43);
    context.moveTo(width * 0.16, height * 0.87);
    context.lineTo(width * 0.38, height * 0.87);
    context.stroke();
    context.setLineDash([]);
  });

  const markSize = Math.max(12, Math.min(22, Math.min(width, height) * 0.055));
  drawBiohazardMark(context, width * 0.13, height * 0.15, markSize,
    CONTAMINATED.warning, 0.38);
  drawBiohazardMark(context, width * 0.87, height * 0.84, markSize,
    CONTAMINATED.warning, 0.34);
}

function drawChemicalDrainage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const channelWidth = Math.max(8, Math.min(13, width * 0.014));
  const leftX = width * 0.045;
  const rightX = width * 0.955 - channelWidth;
  const top = height * 0.24;
  const channelHeight = height * 0.52;

  for (const x of [leftX, rightX]) {
    context.fillStyle = 'rgba(3, 12, 14, 0.36)';
    context.fillRect(x - 2, top - 4, channelWidth + 4, channelHeight + 8);
    drawVentGrille(context, x, top, channelWidth, channelHeight,
      'vertical', { residue: true });
    ellipse(context, x + channelWidth * 0.5, top + channelHeight * 0.22,
      channelWidth * 0.8, height * 0.06,
      'rgba(71, 123, 80, 0.12)');
    ellipse(context, x + channelWidth * 0.5, top + channelHeight * 0.75,
      channelWidth * 0.65, height * 0.045,
      'rgba(75, 135, 83, 0.12)');
  }

  const drainSize = Math.max(10, Math.min(16, Math.min(width, height) * 0.04));
  drawToxicGlow(context, width * 0.06, height * 0.51, drainSize, 0.16);
  drawToxicGlow(context, width * 0.94, height * 0.49, drainSize, 0.14);
}

function drawFacilityInfrastructure(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const shortSide = Math.min(width, height);
  const panelWidth = Math.max(30, Math.min(58, width * 0.075));
  const panelHeight = Math.max(22, Math.min(42, height * 0.075));
  const panels = [
    { x: width * 0.28, y: height * 0.075, warningStripe: true },
    { x: width * 0.69, y: height * 0.84, warningStripe: false },
  ] as const;
  for (let index = 0; index < panels.length; index += 1) {
    const panel = panels[index]!;
    drawContainmentPanel(context, panel.x, panel.y,
      panelWidth, panelHeight, {
        warningStripe: panel.warningStripe,
        biohazard: index === 1,
      });
  }

  const ventWidth = Math.max(28, Math.min(48, width * 0.07));
  const ventHeight = Math.max(10, Math.min(15, height * 0.025));
  drawVentGrille(context, width * 0.34, height * 0.055,
    ventWidth, ventHeight, 'horizontal', { residue: true });
  drawVentGrille(context, width * 0.6, height * 0.92,
    ventWidth, ventHeight, 'horizontal');
  drawVentGrille(context, width * 0.035, height * 0.34,
    Math.max(10, shortSide * 0.025), Math.max(30, shortSide * 0.12),
    'vertical', { residue: true });

  drawPipeRun(context, [
    { x: width * 0.035, y: height * 0.2 },
    { x: width * 0.11, y: height * 0.2 },
    { x: width * 0.11, y: height * 0.34 },
    { x: width * 0.17, y: height * 0.34 },
  ], Math.max(2, shortSide * 0.006), CONTAMINATED.toxicDeep);
  drawPipeRun(context, [
    { x: width * 0.965, y: height * 0.78 },
    { x: width * 0.9, y: height * 0.78 },
    { x: width * 0.9, y: height * 0.65 },
    { x: width * 0.84, y: height * 0.65 },
  ], Math.max(2, shortSide * 0.006), CONTAMINATED.teal);
}

function drawChemicalResidue(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const stains = [
    { x: 0.2, y: 0.24, w: 0.065, h: 0.025, rotation: -0.3, opacity: 0.46 },
    { x: 0.78, y: 0.32, w: 0.052, h: 0.021, rotation: 0.24, opacity: 0.34 },
    { x: 0.3, y: 0.78, w: 0.06, h: 0.024, rotation: 0.16, opacity: 0.38 },
    { x: 0.72, y: 0.73, w: 0.044, h: 0.018, rotation: -0.2, opacity: 0.3 },
  ] as const;
  for (const stain of stains) {
    drawChemicalStain(context, width * stain.x, height * stain.y,
      width * stain.w, height * stain.h, stain.rotation, stain.opacity);
  }

  const abrasions = [
    { x: 0.24, y: 0.17, length: 0.034, slope: -1.4 },
    { x: 0.31, y: 0.19, length: 0.022, slope: 1.1 },
    { x: 0.74, y: 0.25, length: 0.028, slope: 1.2 },
    { x: 0.18, y: 0.69, length: 0.026, slope: -1.1 },
    { x: 0.79, y: 0.82, length: 0.04, slope: 1.3 },
    { x: 0.63, y: 0.87, length: 0.023, slope: -1.2 },
    { x: 0.42, y: 0.73, length: 0.018, slope: 1 },
    { x: 0.86, y: 0.42, length: 0.024, slope: -1.3 },
  ] as const;
  for (let index = 0; index < abrasions.length; index += 1) {
    const abrasion = abrasions[index]!;
    const x = width * abrasion.x;
    const y = height * abrasion.y;
    const length = width * abrasion.length;
    line(context, x, y, x + length, y + abrasion.slope,
      index % 3 === 0
        ? 'rgba(197, 224, 159, 0.075)'
        : 'rgba(7, 19, 20, 0.24)',
      index % 3 === 0 ? 0.8 : 1);
  }
}

function drawFloorVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const vignette = context.createRadialGradient(
    width * 0.5, height * 0.48, Math.min(width, height) * 0.19,
    width * 0.5, height * 0.48, Math.max(width, height) * 0.8,
  );
  vignette.addColorStop(0, 'rgba(3, 12, 14, 0)');
  vignette.addColorStop(0.7, 'rgba(3, 12, 14, 0.08)');
  vignette.addColorStop(1, 'rgba(3, 12, 14, 0.36)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
}

export function drawContaminatedFloor(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return;

  withCanvasState(context, () => {
    drawFloorBase(context, width, height);
    drawChemicalDrainage(context, width, height);
    drawFacilityInfrastructure(context, width, height);
    drawContainmentMarkings(context, width, height);
    drawChemicalResidue(context, width, height);
    drawFloorVignette(context, width, height);
  });
}
