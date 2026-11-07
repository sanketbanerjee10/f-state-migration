import {
  CONTAMINATED,
  clamp01,
  drawBiohazardMark,
  drawChemicalStain,
  drawContainmentPanel,
  drawHazardStripe,
  drawPipeRun,
  drawToxicGlow,
  drawVentGrille,
  ellipse,
  fillRounded,
  line,
  roundedPath,
  strokeRounded,
  withCanvasState,
} from './ContaminatedCanvas';

export interface ContaminatedVisualBase {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
}

export interface ToxicBarrelVisual extends ContaminatedVisualBase {
  readonly kind: 'toxic-barrel';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly ruptureProgress?: number;
  readonly puddle?: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly progress: number;
  };
}

export interface ChemicalTankVisual extends ContaminatedVisualBase {
  readonly kind: 'chemical-tank';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly ruptureProgress?: number;
  readonly pressure: number;
  readonly cloud?: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly opacity: number;
    readonly density: number;
    readonly ageSeconds: number;
    readonly remainingSeconds: number;
    readonly directionX: number;
    readonly directionY: number;
    readonly windInfluenceX?: number;
    readonly windInfluenceY?: number;
  };
}

export interface MutagenContainerVisual extends ContaminatedVisualBase {
  readonly kind: 'mutagen-container';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly ruptureProgress?: number;
  readonly contentsIntensity: number;
  readonly spill?: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly intensity: number;
    readonly ageSeconds: number;
    readonly remainingSeconds: number;
  };
  readonly spawnBurst?: {
    readonly x: number;
    readonly y: number;
    readonly progress: number;
    readonly intensity: number;
  };
}

export interface LeakingPipeVisual extends ContaminatedVisualBase {
  readonly kind: 'leaking-pipe';
  readonly phase: 'idle' | 'warning' | 'spraying' | 'cooldown';
  readonly directionX: number;
  readonly directionY: number;
  readonly phaseProgress: number;
  readonly intensity: number;
  readonly leakX?: number;
  readonly leakY?: number;
}

export interface ContaminatedPuddleVisual extends ContaminatedVisualBase {
  readonly kind: 'contaminated-puddle';
  readonly radiusX: number;
  readonly radiusY: number;
  readonly intensity: number;
  readonly ageSeconds: number;
  readonly remainingSeconds: number;
  readonly visualSeed: number;
}

export interface BiohazardWasteBinVisual extends ContaminatedVisualBase {
  readonly kind: 'biohazard-waste-bin';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly ruptureProgress?: number;
  readonly puddle?: {
    readonly x: number;
    readonly y: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly progress: number;
  };
}

export interface BrokenVentilationFanVisual extends ContaminatedVisualBase {
  readonly kind: 'broken-ventilation-fan';
  readonly phase: 'idle' | 'warning' | 'active' | 'cooldown';
  readonly directionAngle: number;
  readonly phaseProgress: number;
  readonly intensity: number;
  readonly bladeRotation?: number;
  readonly visualSeed: number;
}

export type ContaminatedVisualObject =
  | ToxicBarrelVisual
  | ChemicalTankVisual
  | MutagenContainerVisual
  | LeakingPipeVisual
  | ContaminatedPuddleVisual
  | BiohazardWasteBinVisual
  | BrokenVentilationFanVisual;

export interface ContaminatedRenderOptions {
  readonly timeSeconds: number;
}

const TAU = Math.PI * 2;

function finite(value: number | undefined, fallback = 0): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function positive(value: number, fallback = 1): number {
  const result = finite(value, fallback);
  return Math.max(0.01, Math.min(2000, result));
}

function unit(value: number): number {
  return clamp01(finite(value));
}

function healthDamage(health: number, maxHealth: number): number {
  const maximum = finite(maxHealth);
  return maximum > 0 ? 1 - unit(finite(health) / maximum) : 0;
}

function hashSeed(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? (Math.floor(value) >>> 0) : 0;
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function variation(seed: number, index: number): number {
  let value = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function drawShadow(context: CanvasRenderingContext2D, width: number, height: number): void {
  ellipse(context, 0, height * 0.39, width * 0.49, height * 0.12, CONTAMINATED.shadow);
}

function drawCorrosion(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  seed: number,
): void {
  const amount = unit(intensity);
  if (amount <= 0) return;
  withCanvasState(context, () => {
    context.globalAlpha *= 0.25 + amount * 0.58;
    for (let index = 0; index < 5; index += 1) {
      const x = (variation(seed, index) - 0.5) * width * 0.78;
      const y = height * (0.18 + variation(seed, index + 11) * 0.66);
      const radius = Math.max(1, Math.min(width, height) * (0.025 + variation(seed, index + 23) * 0.035));
      ellipse(context, x, y, radius * 1.5, radius, index % 2 ? CONTAMINATED.toxicDeep : CONTAMINATED.steelDark);
    }
    ellipse(context, 0, height * 0.36, width * 0.4, height * 0.055, 'rgba(32, 63, 43, 0.52)');
  });
}

function drawDamageCracks(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
  seed: number,
): void {
  const amount = unit(intensity);
  if (amount < 0.18) return;
  const x = (variation(seed, 41) - 0.5) * width * 0.44;
  const y = (variation(seed, 42) - 0.5) * height * 0.46;
  const length = Math.min(width, height) * (0.12 + amount * 0.22);
  withCanvasState(context, () => {
    context.globalAlpha *= 0.35 + amount * 0.55;
    context.strokeStyle = '#172426';
    context.lineWidth = Math.max(0.8, Math.min(width, height) * 0.018);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length * 0.28, y + length * 0.18);
    context.lineTo(x + length * 0.18, y + length * 0.43);
    context.lineTo(x + length * 0.52, y + length * 0.58);
    context.stroke();
    context.strokeStyle = 'rgba(180, 217, 135, 0.35)';
    context.lineWidth *= 0.5;
    context.beginPath();
    context.moveTo(x + 1, y);
    context.lineTo(x + length * 0.28 + 1, y + length * 0.18);
    context.stroke();
  });
}

function drawToxicParticles(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  intensity: number,
  time: number,
  seed: number,
  count = 5,
): void {
  const amount = unit(intensity);
  if (amount <= 0 || radius <= 0) return;
  withCanvasState(context, () => {
    for (let index = 0; index < count; index += 1) {
      const phase = variation(seed, index * 3) * TAU;
      const drift = Math.sin(time * (0.7 + variation(seed, index + 71)) + phase);
      const distance = radius * (0.24 + variation(seed, index + 19) * 0.7);
      const px = x + Math.cos(phase) * distance + drift * radius * 0.035;
      const py = y + Math.sin(phase) * distance - drift * radius * 0.08;
      const size = Math.max(0.6, radius * (0.012 + variation(seed, index + 31) * 0.018));
      context.globalAlpha = amount * (0.24 + variation(seed, index + 47) * 0.36);
      ellipse(context, px, py, size, size * 0.8, index % 2 ? CONTAMINATED.toxicLight : CONTAMINATED.toxic);
    }
  });
}

function drawGroundResidue(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  intensity: number,
  seed: number,
  time: number,
  biological = false,
): void {
  const rx = positive(radiusX, 0.01);
  const ry = positive(radiusY, 0.01);
  const amount = unit(intensity);
  if (amount <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
  withCanvasState(context, () => {
    context.translate(finite(x), finite(y));
    const pulse = 1 + Math.sin(finite(time) * 1.15 + (seed % 31)) * 0.018;
    context.globalAlpha *= Math.min(0.85, 0.25 + amount * 0.58);
    ellipse(context, 0, 0, rx * pulse, ry * pulse, biological ? 'rgba(99, 174, 88, 0.38)' : 'rgba(71, 123, 80, 0.32)');
    for (let index = 0; index < 7; index += 1) {
      const angle = (index / 7) * TAU + variation(seed, index) * 0.4;
      const distance = 0.66 + variation(seed, index + 9) * 0.31;
      const lobeX = Math.cos(angle) * rx * distance;
      const lobeY = Math.sin(angle) * ry * distance;
      const lobeScale = 0.17 + variation(seed, index + 21) * 0.13;
      ellipse(context, lobeX, lobeY, rx * lobeScale, ry * lobeScale,
        biological ? 'rgba(134, 198, 110, 0.42)' : 'rgba(71, 123, 80, 0.28)');
    }
    ellipse(context, 0, 0, rx * 0.58, ry * 0.55,
      biological ? 'rgba(39, 93, 52, 0.82)' : 'rgba(30, 66, 43, 0.82)');
    ellipse(context, -rx * 0.12, -ry * 0.13, rx * 0.34, ry * 0.18,
      biological ? 'rgba(180, 217, 135, 0.22)' : 'rgba(180, 217, 135, 0.14)');
    for (let index = 0; index < 4; index += 1) {
      const angle = variation(seed, index + 33) * TAU;
      const spotX = Math.cos(angle) * rx * (0.72 + variation(seed, index + 42) * 0.38);
      const spotY = Math.sin(angle) * ry * (0.72 + variation(seed, index + 52) * 0.38);
      ellipse(context, spotX, spotY, Math.max(0.7, rx * 0.022), Math.max(0.7, ry * 0.026),
        biological ? 'rgba(180, 217, 135, 0.48)' : 'rgba(134, 198, 110, 0.32)');
    }
  });
  if (biological) drawToxicParticles(context, x, y, Math.min(rx, ry), amount, time, seed ^ 0x2345, 3);
}

function drawWarningIndicator(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  intensity: number,
  time: number,
): void {
  const strength = unit(intensity);
  if (strength <= 0) return;
  const pulse = 0.55 + Math.sin(finite(time) * 5) * 0.2;
  withCanvasState(context, () => {
    context.globalAlpha *= strength * pulse;
    drawToxicGlow(context, x, y, 9, strength * 0.65);
    ellipse(context, x, y, 2.8, 2.8, CONTAMINATED.warning);
    ellipse(context, x - 0.7, y - 0.8, 0.8, 0.8, CONTAMINATED.cream);
  });
}

function drawCloudLayer(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  density: number,
  opacity: number,
  directionX: number,
  directionY: number,
  time: number,
  seed: number,
): void {
  const rx = positive(radiusX, 0.01);
  const ry = positive(radiusY, 0.01);
  const amount = unit(opacity);
  if (amount <= 0) return;
  let dx = finite(directionX);
  let dy = finite(directionY);
  const length = Math.hypot(dx, dy);
  if (length > 0.001) {
    dx /= length;
    dy /= length;
  } else {
    dx = 0;
    dy = 0;
  }
  withCanvasState(context, () => {
    context.translate(finite(x), finite(y));
    const motion = Math.sin(finite(time) * 0.85 + (seed % 19)) * 0.025;
    context.globalAlpha *= Math.min(0.58, amount * (0.4 + unit(density) * 0.42));
    const stretch = 1 + unit(density) * 0.16;
    ellipse(context, -dx * rx * 0.13, -dy * ry * 0.13,
      rx * stretch, ry * (1 - motion), 'rgba(134, 198, 110, 0.28)');
    ellipse(context, dx * rx * 0.17, dy * ry * 0.17,
      rx * 0.73, ry * 0.75, 'rgba(71, 123, 80, 0.38)');
    ellipse(context, -dx * rx * 0.16, -dy * ry * 0.16,
      rx * 0.49, ry * 0.48, 'rgba(39, 93, 52, 0.48)');
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * TAU + variation(seed, index + 3);
      const drift = Math.sin(finite(time) * 0.7 + index + seed % 13) * 0.04;
      const ox = Math.cos(angle) * rx * (0.38 + variation(seed, index + 14) * 0.35);
      const oy = Math.sin(angle) * ry * (0.35 + variation(seed, index + 24) * 0.35);
      ellipse(context, ox + dx * rx * drift, oy + dy * ry * drift,
        rx * (0.24 + variation(seed, index + 35) * 0.12),
        ry * (0.23 + variation(seed, index + 45) * 0.13),
        index % 2 ? 'rgba(180, 217, 135, 0.18)' : 'rgba(71, 123, 80, 0.3)');
    }
  });
  drawToxicParticles(context, x, y, Math.min(rx, ry), unit(density) * amount * 0.7, time, seed, 3);
}

function drawDirectionalSpray(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  directionX: number,
  directionY: number,
  length: number,
  intensity: number,
  time: number,
  seed: number,
): void {
  const amount = unit(intensity);
  const span = positive(length, 0.01);
  let dx = finite(directionX);
  let dy = finite(directionY);
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 0.001 || amount <= 0) return;
  dx /= magnitude;
  dy /= magnitude;
  const px = -dy;
  const py = dx;
  withCanvasState(context, () => {
    context.globalAlpha *= Math.min(0.78, amount * (0.45 + Math.sin(finite(time) * 7 + seed % 17) * 0.12));
    line(context, x, y, x + dx * span, y + dy * span, 'rgba(134, 198, 110, 0.3)', Math.max(2, span * 0.16));
    line(context, x, y, x + dx * span * 0.83, y + dy * span * 0.83, 'rgba(71, 123, 80, 0.72)', Math.max(1, span * 0.07));
    line(context, x, y, x + dx * span * 0.65, y + dy * span * 0.65, 'rgba(180, 217, 135, 0.52)', Math.max(0.8, span * 0.025));
    for (let index = 0; index < 5; index += 1) {
      const progress = 0.3 + variation(seed, index) * 0.68;
      const offset = (variation(seed, index + 9) - 0.5) * span * 0.18;
      const drift = Math.sin(finite(time) * 4 + index + seed % 11) * span * 0.025;
      ellipse(context, x + dx * span * progress + px * (offset + drift),
        y + dy * span * progress + py * (offset + drift),
        Math.max(0.7, span * (0.018 + variation(seed, index + 23) * 0.025)),
        Math.max(0.7, span * 0.014), 'rgba(180, 217, 135, 0.68)');
    }
  });
}

function drawAirflow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  length: number,
  intensity: number,
  time: number,
  seed: number,
): void {
  const amount = unit(intensity);
  const span = positive(length, 0.01);
  if (amount <= 0) return;
  const dx = Math.cos(finite(angle));
  const dy = Math.sin(finite(angle));
  const px = -dy;
  const py = dx;
  withCanvasState(context, () => {
    context.globalAlpha *= Math.min(0.62, amount * 0.55);
    for (let index = 0; index < 3; index += 1) {
      const offset = (index - 1) * span * 0.12;
      const phase = (finite(time) * 0.45 + variation(seed, index)) % 1;
      const start = span * (0.06 + phase * 0.18);
      const end = span * (0.52 + variation(seed, index + 12) * 0.35);
      const sway = Math.sin(finite(time) * 2 + index + seed % 9) * span * 0.025;
      line(context, x + px * offset + dx * start, y + py * offset + dy * start,
        x + px * (offset + sway) + dx * end,
        y + py * (offset + sway) + dy * end,
        index === 1 ? 'rgba(180, 217, 135, 0.42)' : 'rgba(134, 198, 110, 0.27)',
        index === 1 ? 1.6 : 1.1);
    }
    drawToxicParticles(context, x + dx * span * 0.4, y + dy * span * 0.4,
      span * 0.24, amount * 0.55, time, seed, 3);
  });
}

function drawRuptureBurst(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  time: number,
  seed: number,
): void {
  const completion = unit(progress);
  if (completion <= 0 || radius <= 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
  const fade = 1 - completion;
  const spread = radius * (0.3 + completion * 1.2);
  withCanvasState(context, () => {
    context.globalAlpha *= fade * 0.62;
    ellipse(context, finite(x), finite(y), spread, spread * 0.72, 'rgba(134, 198, 110, 0.28)');
    ellipse(context, finite(x), finite(y), spread * 0.52, spread * 0.38, 'rgba(71, 123, 80, 0.48)');
  });
  drawToxicParticles(context, finite(x), finite(y), spread, fade, time, seed, 6);
}

function withObject(
  context: CanvasRenderingContext2D,
  object: ContaminatedVisualBase,
  draw: (width: number, height: number) => void,
): void {
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) return;
  const width = positive(object.width);
  const height = positive(object.height);
  withCanvasState(context, () => {
    context.translate(object.x, object.y);
    context.rotate(finite(object.rotation));
    draw(width, height);
  });
}

function drawToxicBarrelBody(context: CanvasRenderingContext2D, object: ToxicBarrelVisual): void {
  const damage = healthDamage(object.health, object.maxHealth);
  const seed = hashSeed(object.id);
  withObject(context, object, (width, height) => {
    const destroyed = object.destroyed;
    drawShadow(context, width, height);
    const left = -width * 0.36;
    const top = -height * 0.43;
    const bodyWidth = width * 0.72;
    const bodyHeight = height * 0.82;
    fillRounded(context, left + 2, top + 2, bodyWidth, bodyHeight, width * 0.12,
      destroyed ? '#263331' : CONTAMINATED.steelDark);
    fillRounded(context, left, top, bodyWidth, bodyHeight, width * 0.12,
      destroyed ? '#354340' : CONTAMINATED.steel);
    ellipse(context, 0, top + 2, bodyWidth * 0.49, height * 0.095,
      destroyed ? '#293735' : CONTAMINATED.steelLight);
    ellipse(context, 0, top + 2, bodyWidth * 0.39, height * 0.064, CONTAMINATED.steelDark);
    fillRounded(context, left - 1, top + height * 0.14, bodyWidth + 2, height * 0.13,
      2, destroyed ? '#4a5146' : '#96945b');
    drawHazardStripe(context, left, top + height * 0.15, bodyWidth, height * 0.11,
      { stripeWidth: Math.max(2, width * 0.055), opacity: destroyed ? 0.16 : 0.52 });
    for (const ribY of [top + height * 0.06, top + height * 0.32, top + height * 0.65]) {
      line(context, left + 1, ribY, left + bodyWidth - 1, ribY, 'rgba(19, 34, 35, 0.65)', Math.max(1, width * 0.035));
      line(context, left + 3, ribY - 1, left + bodyWidth - 3, ribY - 1, 'rgba(197, 224, 159, 0.16)', 0.8);
    }
    drawChemicalStain(context, 0, top + height * 0.54, bodyWidth * 0.8,
      height * 0.2, 0, destroyed ? 0.24 : damage * 0.32);
    drawBiohazardMark(context, 0, top + height * 0.43, Math.min(width, height) * 0.24,
      CONTAMINATED.warning, destroyed ? 0.18 : 0.48);
    drawCorrosion(context, width, height, damage + (destroyed ? 0.65 : 0), seed);
    drawDamageCracks(context, width, height, damage, seed);
    if (damage > 0.68 && !destroyed) {
      drawToxicGlow(context, width * 0.2, height * 0.05, Math.min(width, height) * 0.34, damage * 0.45);
    }
    if (destroyed) {
      line(context, left + width * 0.12, top + height * 0.42,
        left + width * 0.34, top + height * 0.59, '#172426', Math.max(1.5, width * 0.06));
      line(context, left + width * 0.32, top + height * 0.57,
        left + width * 0.58, top + height * 0.46, '#172426', Math.max(1.5, width * 0.06));
    }
  });
}

function drawChemicalTankBody(context: CanvasRenderingContext2D, object: ChemicalTankVisual, time: number): void {
  const damage = healthDamage(object.health, object.maxHealth);
  const pressure = unit(object.pressure);
  const seed = hashSeed(object.id);
  withObject(context, object, (width, height) => {
    drawShadow(context, width, height);
    const destroyed = object.destroyed;
    const vesselW = width * 0.58;
    const vesselH = height * 0.76;
    const vesselX = -vesselW / 2;
    const vesselY = -height * 0.36;
    fillRounded(context, -width * 0.42, height * 0.26, width * 0.84, height * 0.13, 3, CONTAMINATED.steelDark);
    fillRounded(context, -width * 0.34, -height * 0.4, width * 0.1, height * 0.75, 2, CONTAMINATED.steelDark);
    fillRounded(context, width * 0.24, -height * 0.4, width * 0.1, height * 0.75, 2, CONTAMINATED.steelDark);
    fillRounded(context, vesselX, vesselY, vesselW, vesselH, vesselW * 0.25,
      destroyed ? '#343f3d' : '#425652');
    ellipse(context, 0, vesselY + 2, vesselW * 0.49, height * 0.08, CONTAMINATED.steelLight);
    ellipse(context, 0, vesselY + 2, vesselW * 0.37, height * 0.055, CONTAMINATED.steelDark);
    roundedPath(context, vesselX + vesselW * 0.2, vesselY + vesselH * 0.35,
      vesselW * 0.6, vesselH * 0.3, vesselW * 0.1);
    context.fillStyle = destroyed ? 'rgba(21, 33, 33, 0.82)' : `rgba(71, 123, 80, ${0.22 + pressure * 0.34})`;
    context.fill();
    strokeRounded(context, vesselX + vesselW * 0.2, vesselY + vesselH * 0.35,
      vesselW * 0.6, vesselH * 0.3, vesselW * 0.1, CONTAMINATED.steelLight, 1);
    drawContainmentPanel(context, -width * 0.19, height * 0.02, width * 0.38, height * 0.24,
      { warningStripe: true, biohazard: true });
    // Pressure gauge and the attached valve train remain visual details only.
    ellipse(context, width * 0.31, -height * 0.21, width * 0.095, width * 0.095, CONTAMINATED.steelDark);
    ellipse(context, width * 0.31, -height * 0.21, width * 0.067, width * 0.067,
      destroyed ? '#263331' : '#B9C5AD');
    const gaugeAngle = Math.PI * (0.8 + pressure * 1.25);
    line(context, width * 0.31, -height * 0.21,
      width * 0.31 + Math.cos(gaugeAngle) * width * 0.054,
      -height * 0.21 + Math.sin(gaugeAngle) * width * 0.054,
      pressure > 0.78 ? '#b7654d' : CONTAMINATED.toxicDeep, 1.2);
    drawPipeRun(context, [
      { x: width * 0.13, y: -height * 0.31 },
      { x: width * 0.32, y: -height * 0.31 },
      { x: width * 0.32, y: -height * 0.39 },
    ], Math.max(2, width * 0.045));
    ellipse(context, width * 0.32, -height * 0.39, width * 0.075, width * 0.075, CONTAMINATED.steelLight);
    line(context, width * 0.25, -height * 0.39, width * 0.39, -height * 0.39, CONTAMINATED.steelDark, 1.4);
    drawHazardStripe(context, -width * 0.3, height * 0.34, width * 0.6, height * 0.07,
      { stripeWidth: Math.max(1.5, width * 0.035), opacity: destroyed ? 0.14 : 0.38 });
    drawCorrosion(context, width, height, damage + (destroyed ? 0.55 : 0), seed);
    drawDamageCracks(context, width, height, damage, seed);
    if (pressure > 0.72 && !destroyed) drawWarningIndicator(context, -width * 0.32, -height * 0.28, pressure, time);
  });
}

function drawMutagenContainerBody(context: CanvasRenderingContext2D, object: MutagenContainerVisual, time: number): void {
  const damage = healthDamage(object.health, object.maxHealth);
  const seed = hashSeed(object.id);
  const contents = unit(object.contentsIntensity);
  withObject(context, object, (width, height) => {
    drawShadow(context, width, height);
    const destroyed = object.destroyed;
    fillRounded(context, -width * 0.39, -height * 0.39, width * 0.78, height * 0.78, 4, CONTAMINATED.steelDark);
    drawContainmentPanel(context, -width * 0.3, -height * 0.35, width * 0.6, height * 0.68,
      { warningStripe: true });
    fillRounded(context, -width * 0.17, -height * 0.26, width * 0.34, height * 0.48, width * 0.1,
      destroyed ? 'rgba(26, 39, 38, 0.94)' : 'rgba(35, 65, 53, 0.82)');
    if (!destroyed) {
      ellipse(context, 0, height * 0.06, width * 0.14, height * 0.16,
        `rgba(134, 198, 110, ${0.3 + contents * 0.42})`);
      ellipse(context, -width * 0.035, -height * 0.04, width * 0.045, height * 0.12,
        'rgba(180, 217, 135, 0.24)');
    } else {
      line(context, -width * 0.17, -height * 0.17, width * 0.17, height * 0.18, '#192627', 2);
      line(context, width * 0.17, -height * 0.17, -width * 0.17, height * 0.18, '#192627', 1.6);
    }
    for (const x of [-width * 0.2, width * 0.2]) {
      fillRounded(context, x - width * 0.025, -height * 0.31, width * 0.05, height * 0.61, 2, CONTAMINATED.steelLight);
      ellipse(context, x, -height * 0.2, width * 0.045, width * 0.045, CONTAMINATED.steelDark);
      ellipse(context, x, height * 0.2, width * 0.045, width * 0.045, CONTAMINATED.steelDark);
    }
    drawBiohazardMark(context, 0, -height * 0.32, Math.min(width, height) * 0.16,
      CONTAMINATED.warning, destroyed ? 0.16 : 0.5);
    drawWarningIndicator(context, width * 0.25, -height * 0.28,
      destroyed ? 0 : Math.max(damage * 0.72, contents * 0.22), time);
    drawCorrosion(context, width, height, damage + (destroyed ? 0.7 : 0), seed);
    drawDamageCracks(context, width, height, damage, seed);
  });
}

function drawLeakingPipeBody(context: CanvasRenderingContext2D, object: LeakingPipeVisual, time: number): void {
  const seed = hashSeed(object.id);
  withObject(context, object, (width, height) => {
    drawShadow(context, width, height);
    const horizontal = width >= height;
    const half = horizontal ? width * 0.43 : height * 0.43;
    const thickness = Math.max(3, Math.min(width, height) * 0.22);
    drawPipeRun(context, horizontal
      ? [{ x: -half, y: 0 }, { x: half, y: 0 }]
      : [{ x: 0, y: -half }, { x: 0, y: half }], thickness);
    for (const sign of [-1, 1]) {
      const flangeX = horizontal ? half * sign * 0.68 : 0;
      const flangeY = horizontal ? 0 : half * sign * 0.68;
      fillRounded(context, flangeX - thickness * 0.75, flangeY - thickness * 0.75,
        thickness * 1.5, thickness * 1.5, 2, CONTAMINATED.steelDark);
      ellipse(context, flangeX, flangeY, thickness * 0.48, thickness * 0.48, CONTAMINATED.steelLight);
    }
    const leakX = finite(object.leakX, horizontal ? width * 0.08 : 0);
    const leakY = finite(object.leakY, horizontal ? 0 : -height * 0.08);
    ellipse(context, leakX, leakY, thickness * 0.34, thickness * 0.34, '#172426');
    ellipse(context, leakX, leakY, thickness * 0.18, thickness * 0.18, CONTAMINATED.toxicDeep);
    drawCorrosion(context, width, height, 0.5, seed);
    if (object.phase === 'warning') {
      drawWarningIndicator(context, leakX, leakY, unit(object.intensity) * (0.55 + unit(object.phaseProgress) * 0.3), time);
      const directionLength = Math.hypot(finite(object.directionX), finite(object.directionY));
      if (directionLength > 0.001) {
        line(context, leakX, leakY,
          leakX + finite(object.directionX) / directionLength * Math.min(width, height) * 0.36,
          leakY + finite(object.directionY) / directionLength * Math.min(width, height) * 0.36,
          CONTAMINATED.warning, 1.2);
      }
    } else if (object.phase === 'cooldown') {
      drawWarningIndicator(context, leakX, leakY, unit(object.intensity) * 0.18, time);
    }
  });
}

function drawBiohazardWasteBinBody(
  context: CanvasRenderingContext2D,
  object: BiohazardWasteBinVisual,
  time: number,
): void {
  const damage = healthDamage(object.health, object.maxHealth);
  const seed = hashSeed(object.id);
  withObject(context, object, (width, height) => {
    drawShadow(context, width, height);
    const destroyed = object.destroyed;
    const left = -width * 0.42;
    const top = -height * 0.32;
    fillRounded(context, left + 3, top + height * 0.06, width * 0.84, height * 0.66, 4,
      destroyed ? '#303b39' : CONTAMINATED.steel);
    strokeRounded(context, left + 3, top + height * 0.06, width * 0.84, height * 0.66, 4,
      CONTAMINATED.steelDark, 1.4);
    for (let index = 0; index < 4; index += 1) {
      const ribX = left + width * (0.16 + index * 0.21);
      fillRounded(context, ribX, top + height * 0.13, width * 0.035, height * 0.5, 1,
        destroyed ? '#37423e' : CONTAMINATED.steelDark);
    }
    fillRounded(context, left - width * 0.02, top, width * 0.88, height * 0.14, 3,
      destroyed ? '#39443f' : CONTAMINATED.steelLight);
    line(context, left + width * 0.1, top + height * 0.14, left + width * 0.77, top + height * 0.14,
      CONTAMINATED.steelDark, 1.3);
    drawContainmentPanel(context, -width * 0.2, -height * 0.03, width * 0.4, height * 0.35,
      { warningStripe: true, biohazard: true });
    fillRounded(context, -width * 0.31, height * 0.37, width * 0.62, height * 0.08, 2,
      CONTAMINATED.steelDark);
    drawCorrosion(context, width, height, damage + (destroyed ? 0.68 : 0), seed);
    drawDamageCracks(context, width, height, damage, seed);
    if (damage > 0.72 && !destroyed) {
      line(context, -width * 0.34, -height * 0.2, -width * 0.18, -height * 0.33, '#182728', 1.8);
      drawWarningIndicator(context, width * 0.33, -height * 0.23, damage * 0.55, time);
    }
    if (destroyed) {
      line(context, -width * 0.41, -height * 0.32, width * 0.34, -height * 0.19, '#1a2929', 2.4);
      line(context, -width * 0.2, height * 0.2, width * 0.26, height * 0.36, '#172426', 1.6);
    }
  });
}

function drawBrokenVentilationFanBody(context: CanvasRenderingContext2D, object: BrokenVentilationFanVisual, time: number): void {
  const seed = hashSeed(object.visualSeed);
  const intensity = unit(object.intensity);
  withObject(context, object, (width, height) => {
    drawShadow(context, width, height);
    const side = Math.min(width, height) * 0.7;
    fillRounded(context, -width * 0.46, -height * 0.42, width * 0.92, height * 0.84, 3, CONTAMINATED.steelDark);
    fillRounded(context, -width * 0.4, -height * 0.36, width * 0.8, height * 0.72, 3, CONTAMINATED.steel);
    drawVentGrille(context, -side * 0.5, -side * 0.5, side, side, 'horizontal', { residue: true });
    const bladeRotation = finite(object.bladeRotation,
      object.phase === 'active' ? finite(time) * (0.8 + intensity * 3) : 0);
    withCanvasState(context, () => {
      context.translate(0, 0);
      context.rotate(bladeRotation);
      for (let index = 0; index < 4; index += 1) {
        withCanvasState(context, () => {
          context.rotate((index * Math.PI) / 2);
          context.beginPath();
          context.moveTo(side * 0.055, -side * 0.055);
          context.quadraticCurveTo(side * 0.3, -side * 0.36, side * 0.39, -side * 0.05);
          context.quadraticCurveTo(side * 0.22, side * 0.09, side * 0.055, side * 0.055);
          context.closePath();
          context.fillStyle = '#526966';
          context.fill();
          context.strokeStyle = 'rgba(20, 34, 35, 0.75)';
          context.lineWidth = 1;
          context.stroke();
          line(context, side * 0.1, 0, side * 0.31, -side * 0.08, 'rgba(197, 224, 159, 0.24)', 0.8);
        });
      }
      ellipse(context, 0, 0, side * 0.09, side * 0.09, CONTAMINATED.steelLight);
      ellipse(context, 0, 0, side * 0.04, side * 0.04, CONTAMINATED.steelDark);
    });
    drawHazardStripe(context, -width * 0.34, height * 0.32, width * 0.68, height * 0.055,
      { stripeWidth: Math.max(1.5, width * 0.035), opacity: 0.34 });
    for (const x of [-width * 0.37, width * 0.37]) {
      ellipse(context, x, -height * 0.31, 2, 2, CONTAMINATED.steelLight);
      ellipse(context, x, height * 0.31, 2, 2, CONTAMINATED.steelLight);
    }
    drawCorrosion(context, width, height, 0.48, seed);
    const warning = object.phase === 'warning' ? intensity : object.phase === 'cooldown' ? intensity * 0.22 : 0.12;
    drawWarningIndicator(context, width * 0.33, -height * 0.29, warning, time);
    // The local is retained to make the frame's fan hub position explicit.
    void seed;
  });
}

function drawCloudEffect(
  context: CanvasRenderingContext2D,
  object: ChemicalTankVisual,
  time: number,
): void {
  const cloud = object.cloud;
  if (!cloud) return;
  const rx = positive(cloud.radiusX, 0.01);
  const ry = positive(cloud.radiusY, 0.01);
  const windX = finite(cloud.windInfluenceX);
  const windY = finite(cloud.windInfluenceY);
  const directionX = finite(cloud.directionX) + windX * 0.45;
  const directionY = finite(cloud.directionY) + windY * 0.45;
  const windMagnitude = Math.min(0.35, Math.hypot(windX, windY) * 0.08);
  if (!Number.isFinite(cloud.x) || !Number.isFinite(cloud.y)) return;
  withCanvasState(context, () => {
    drawCloudLayer(context, cloud.x, cloud.y, rx * (1 + windMagnitude), ry * (1 + windMagnitude * 0.55),
      cloud.density, cloud.opacity, directionX, directionY, time,
      hashSeed(object.id) ^ hashSeed(finite(cloud.ageSeconds)));
  });
}

function worldPoint(
  object: ContaminatedVisualBase,
  localX: number,
  localY: number,
): { readonly x: number; readonly y: number } {
  const angle = finite(object.rotation);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: finite(object.x) + finite(localX) * cosine - finite(localY) * sine,
    y: finite(object.y) + finite(localX) * sine + finite(localY) * cosine,
  };
}

function drawPuddleSnapshot(
  context: CanvasRenderingContext2D,
  puddle: { readonly x: number; readonly y: number; readonly radiusX: number; readonly radiusY: number; readonly progress: number },
  time: number,
  seed: number,
): void {
  if (!Number.isFinite(puddle.x) || !Number.isFinite(puddle.y)) return;
  const progress = unit(puddle.progress);
  if (progress <= 0) return;
  drawGroundResidue(context, puddle.x, puddle.y,
    positive(puddle.radiusX, 0.01) * (0.72 + progress * 0.28),
    positive(puddle.radiusY, 0.01) * (0.72 + progress * 0.28),
    progress, seed, time);
}

function drawToxicBarrelGroundEffects(
  context: CanvasRenderingContext2D,
  object: ToxicBarrelVisual,
  time: number,
): void {
  if (object.puddle) {
    const progress = unit(object.puddle.progress);
    drawGroundResidue(context, object.puddle.x, object.puddle.y,
      positive(object.puddle.radiusX, 0.01) * (0.72 + progress * 0.28),
      positive(object.puddle.radiusY, 0.01) * (0.72 + progress * 0.28),
      progress * (object.destroyed ? 1 : 0.76), hashSeed(object.id) ^ 0x10a1, time);
  }
  const progress = unit(finite(object.ruptureProgress));
  if (progress > 0 && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawRuptureBurst(context, object.x, object.y,
      Math.min(positive(object.width), positive(object.height)) * 0.55,
      progress, time, hashSeed(object.id));
  }
}

function drawToxicBarrelForegroundEffects(
  context: CanvasRenderingContext2D,
  object: ToxicBarrelVisual,
): void {
  if (!object.destroyed && Number.isFinite(object.x) && Number.isFinite(object.y)
    && healthDamage(object.health, object.maxHealth) > 0.68) {
    drawToxicGlow(context, finite(object.x), finite(object.y), positive(object.width) * 0.42,
      healthDamage(object.health, object.maxHealth) * 0.3);
  }
}

function drawChemicalTankForegroundEffects(
  context: CanvasRenderingContext2D,
  object: ChemicalTankVisual,
  time: number,
): void {
  drawCloudEffect(context, object, time);
  if (!object.destroyed && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawToxicGlow(context, object.x, object.y, Math.min(positive(object.width), positive(object.height)) * 0.3,
      unit(object.pressure) * 0.45);
  }
  const progress = unit(finite(object.ruptureProgress));
  if (progress > 0 && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawRuptureBurst(context, object.x, object.y,
      Math.min(positive(object.width), positive(object.height)) * 0.68,
      progress, time, hashSeed(object.id));
  }
}

function drawMutagenContainerGroundEffects(
  context: CanvasRenderingContext2D,
  object: MutagenContainerVisual,
  time: number,
): void {
  if (object.spill) {
    const spill = object.spill;
    const lifetime = finite(spill.remainingSeconds) + finite(spill.ageSeconds);
    const fade = lifetime > 0 ? unit(finite(spill.remainingSeconds) / lifetime) : 1;
    drawGroundResidue(context, spill.x, spill.y,
      positive(spill.radiusX, 0.01), positive(spill.radiusY, 0.01),
      unit(spill.intensity) * fade, hashSeed(object.id) ^ 0x6a09e667, time, true);
  }
}

function drawMutagenContainerForegroundEffects(
  context: CanvasRenderingContext2D,
  object: MutagenContainerVisual,
  time: number,
): void {
  if (!object.destroyed && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawToxicGlow(context, object.x, object.y,
      Math.min(positive(object.width), positive(object.height)) * 0.42,
      unit(object.contentsIntensity) * (0.45 + healthDamage(object.health, object.maxHealth) * 0.45));
  }
  if (object.spawnBurst) {
    const burst = object.spawnBurst;
    if (Number.isFinite(burst.x) && Number.isFinite(burst.y)) {
      const progress = unit(burst.progress);
      const radius = Math.min(positive(object.width), positive(object.height)) * (0.18 + progress * 0.95);
      withCanvasState(context, () => {
        context.globalAlpha *= unit(burst.intensity) * (1 - progress) * 0.62;
        ellipse(context, burst.x, burst.y, radius, radius * 0.74, 'rgba(134, 198, 110, 0.3)');
        ellipse(context, burst.x, burst.y, radius * 0.58, radius * 0.46, 'rgba(71, 123, 80, 0.5)');
      });
      drawToxicParticles(context, burst.x, burst.y, radius,
        unit(burst.intensity) * (1 - progress), time, hashSeed(object.id) ^ 0xbb67ae85, 6);
    }
  }
  const rupture = unit(finite(object.ruptureProgress));
  if (rupture > 0 && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawRuptureBurst(context, object.x, object.y,
      Math.min(positive(object.width), positive(object.height)) * 0.62,
      rupture, time, hashSeed(object.id));
  }
}

function drawLeakingPipeForegroundEffects(
  context: CanvasRenderingContext2D,
  object: LeakingPipeVisual,
  time: number,
): void {
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) return;
  const horizontal = positive(object.width) >= positive(object.height);
  const leakLocalX = finite(object.leakX, horizontal ? object.width * 0.08 : 0);
  const leakLocalY = finite(object.leakY, horizontal ? 0 : -object.height * 0.08);
  const point = worldPoint(object, leakLocalX, leakLocalY);
  const progress = unit(object.phaseProgress);
  const intensity = unit(object.intensity);
  if (object.phase === 'warning') {
    drawWarningIndicator(context, point.x, point.y, intensity * (0.55 + progress * 0.3), time);
  } else if (object.phase === 'spraying') {
    const span = Math.min(positive(object.width), positive(object.height)) * (1.3 + progress * 1.7);
    drawDirectionalSpray(context, point.x, point.y,
      finite(object.directionX), finite(object.directionY), span,
      intensity * (0.55 + progress * 0.45), time, hashSeed(object.id));
  } else if (object.phase === 'cooldown') {
    drawToxicParticles(context, point.x, point.y, Math.min(positive(object.width), positive(object.height)) * 0.2,
      intensity * (1 - progress) * 0.22, time, hashSeed(object.id), 2);
  }
}

function drawContaminatedPuddle(
  context: CanvasRenderingContext2D,
  object: ContaminatedPuddleVisual,
  time: number,
): void {
  const lifetime = finite(object.ageSeconds) + finite(object.remainingSeconds);
  const fade = lifetime > 0 ? Math.min(1, unit(finite(object.remainingSeconds) / lifetime) * 1.5 + 0.25) : 1;
  drawGroundResidue(context, object.x, object.y,
    positive(object.radiusX, 0.01), positive(object.radiusY, 0.01),
    unit(object.intensity) * fade, hashSeed(object.visualSeed), time);
}

function drawBiohazardWasteBinGroundEffects(
  context: CanvasRenderingContext2D,
  object: BiohazardWasteBinVisual,
  time: number,
): void {
  if (object.puddle) {
    drawPuddleSnapshot(context, object.puddle, time, hashSeed(object.id) ^ 0x3c6ef372);
  }
  const progress = unit(finite(object.ruptureProgress));
  if (progress > 0 && Number.isFinite(object.x) && Number.isFinite(object.y)) {
    drawRuptureBurst(context, object.x, object.y,
      Math.min(positive(object.width), positive(object.height)) * 0.64,
      progress, time, hashSeed(object.id));
  }
}

function drawBrokenVentilationFanForegroundEffects(
  context: CanvasRenderingContext2D,
  object: BrokenVentilationFanVisual,
  time: number,
): void {
  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) return;
  const intensity = unit(object.intensity);
  const angle = finite(object.directionAngle);
  const length = Math.max(positive(object.width), positive(object.height)) * 2.8;
  if (object.phase === 'warning') {
    drawWarningIndicator(context, finite(object.x), finite(object.y), intensity * 0.75, time);
    drawAirflow(context, finite(object.x), finite(object.y), angle, length * 0.45,
      intensity * 0.28, time, hashSeed(object.visualSeed));
  } else if (object.phase === 'active') {
    drawAirflow(context, finite(object.x), finite(object.y), angle, length,
      intensity * (0.45 + unit(object.phaseProgress) * 0.55), time, hashSeed(object.visualSeed));
  } else if (object.phase === 'cooldown') {
    drawToxicParticles(context, finite(object.x), finite(object.y), length * 0.28,
      intensity * (1 - unit(object.phaseProgress)) * 0.16, time,
      hashSeed(object.visualSeed), 3);
  }
}

export function renderContaminatedObjectBodies(
  context: CanvasRenderingContext2D,
  objects: readonly ContaminatedVisualObject[],
  options: ContaminatedRenderOptions,
): void {
  const time = finite(options.timeSeconds);
  for (const object of objects) {
    switch (object.kind) {
      case 'toxic-barrel':
        drawToxicBarrelBody(context, object);
        break;
      case 'chemical-tank':
        drawChemicalTankBody(context, object, time);
        break;
      case 'mutagen-container':
        drawMutagenContainerBody(context, object, time);
        break;
      case 'leaking-pipe':
        drawLeakingPipeBody(context, object, time);
        break;
      case 'contaminated-puddle':
        break;
      case 'biohazard-waste-bin':
        drawBiohazardWasteBinBody(context, object, time);
        break;
      case 'broken-ventilation-fan':
        drawBrokenVentilationFanBody(context, object, time);
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}

export function renderContaminatedObjectGroundEffects(
  context: CanvasRenderingContext2D,
  objects: readonly ContaminatedVisualObject[],
  options: ContaminatedRenderOptions,
): void {
  const time = finite(options.timeSeconds);
  for (const object of objects) {
    switch (object.kind) {
      case 'toxic-barrel':
        drawToxicBarrelGroundEffects(context, object, time);
        break;
      case 'mutagen-container':
        drawMutagenContainerGroundEffects(context, object, time);
        break;
      case 'contaminated-puddle':
        drawContaminatedPuddle(context, object, time);
        break;
      case 'biohazard-waste-bin':
        drawBiohazardWasteBinGroundEffects(context, object, time);
        break;
      case 'chemical-tank':
      case 'leaking-pipe':
      case 'broken-ventilation-fan':
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}

export function renderContaminatedObjectForegroundEffects(
  context: CanvasRenderingContext2D,
  objects: readonly ContaminatedVisualObject[],
  options: ContaminatedRenderOptions,
): void {
  const time = finite(options.timeSeconds);
  for (const object of objects) {
    switch (object.kind) {
      case 'toxic-barrel':
        drawToxicBarrelForegroundEffects(context, object);
        break;
      case 'chemical-tank':
        drawChemicalTankForegroundEffects(context, object, time);
        break;
      case 'mutagen-container':
        drawMutagenContainerForegroundEffects(context, object, time);
        break;
      case 'leaking-pipe':
        drawLeakingPipeForegroundEffects(context, object, time);
        break;
      case 'biohazard-waste-bin':
      case 'contaminated-puddle':
        break;
      case 'broken-ventilation-fan':
        drawBrokenVentilationFanForegroundEffects(context, object, time);
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}

/**
 * Backward-compatible combined pass. Invoke the dedicated ground and
 * foreground passes instead when the scene needs distinct effect depths.
 */
export function renderContaminatedObjectEffects(
  context: CanvasRenderingContext2D,
  objects: readonly ContaminatedVisualObject[],
  options: ContaminatedRenderOptions,
): void {
  renderContaminatedObjectGroundEffects(context, objects, options);
  renderContaminatedObjectForegroundEffects(context, objects, options);
}
