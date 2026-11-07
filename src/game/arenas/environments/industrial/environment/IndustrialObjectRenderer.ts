import {
  INDUSTRIAL,
  bolt,
  clamp01,
  drawMetalPanel,
  ellipse,
  fillRounded,
  hazardStripe,
  line,
  strokeRounded,
  withCanvasState,
} from './IndustrialCanvas';

export interface IndustrialVisualBase {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
}

export interface OilBarrelVisual extends IndustrialVisualBase {
  readonly kind: 'oil-barrel';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly fire?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly intensity: number;
    readonly ageSeconds: number;
    readonly remainingSeconds: number;
  };
}

export interface GasCylinderVisual extends IndustrialVisualBase {
  readonly kind: 'gas-cylinder';
  readonly phase: 'idle' | 'flying' | 'detonating' | 'finished';
  readonly travelAngle?: number;
  readonly travelProgress?: number;
  readonly trailIntensity?: number;
  readonly detonationProgress?: number;
  readonly blastRadius?: number;
}

export interface ElectricGeneratorVisual extends IndustrialVisualBase {
  readonly kind: 'electric-generator';
  readonly phase: 'idle' | 'charging' | 'discharging' | 'cooldown';
  readonly chargeProgress: number;
  readonly dischargeProgress: number;
  readonly visualSeed: number;
  readonly dangerRadius: number;
  readonly arcDirection?: number;
}

export interface MovingWallVisual extends IndustrialVisualBase {
  readonly kind: 'moving-wall';
  readonly travelAngle?: number;
  readonly movementIntensity: number;
}

export interface SteamPipeVisual extends IndustrialVisualBase {
  readonly kind: 'steam-pipe';
  readonly phase: 'idle' | 'warning' | 'venting' | 'cooldown';
  readonly directionX: number;
  readonly directionY: number;
  readonly phaseProgress: number;
  readonly intensity: number;
}

export interface IndustrialCrateVisual extends IndustrialVisualBase {
  readonly kind: 'industrial-crate';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly destructionProgress?: number;
  readonly drop?: {
    readonly kind: 'health' | 'shield';
    readonly x: number;
    readonly y: number;
    readonly revealProgress: number;
  };
}

export type IndustrialVisualObject =
  | OilBarrelVisual
  | GasCylinderVisual
  | ElectricGeneratorVisual
  | MovingWallVisual
  | SteamPipeVisual
  | IndustrialCrateVisual;

export interface IndustrialRenderOptions {
  readonly timeSeconds: number;
}

function progress(value: number | undefined): number {
  return clamp01(value ?? 0);
}

function objectTransform(
  context: CanvasRenderingContext2D,
  object: IndustrialVisualBase,
  draw: () => void,
): void {
  withCanvasState(context, () => {
    context.translate(object.x, object.y);
    if (object.rotation) context.rotate(object.rotation);
    draw();
  });
}

function drawObjectShadow(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  offsetY = height * 0.1,
): void {
  ellipse(
    context,
    2,
    offsetY + 2,
    Math.max(4, width * 0.54),
    Math.max(3, height * 0.28),
    INDUSTRIAL.shadow,
  );
}

function drawOilBarrelBody(
  context: CanvasRenderingContext2D,
  object: OilBarrelVisual,
): void {
  const w = object.width;
  const h = object.height;
  const damaged = object.maxHealth > 0
    ? clamp01(1 - object.health / object.maxHealth)
    : 0;

  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.2);

    if (object.destroyed) {
      context.save();
      context.rotate(-0.16);
      fillRounded(context, -w * 0.48, -h * 0.28, w * 0.96, h * 0.58, h * 0.2,
        '#293438');
      fillRounded(context, -w * 0.4, -h * 0.2, w * 0.8, h * 0.38, h * 0.16,
        '#46504D');
      line(context, -w * 0.36, -h * 0.08, w * 0.34, h * 0.06,
        '#1C272A', 2);
      context.restore();
      return;
    }

    const shell = context.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    shell.addColorStop(0, '#35464A');
    shell.addColorStop(0.22, '#65756D');
    shell.addColorStop(0.52, '#879083');
    shell.addColorStop(0.78, '#586963');
    shell.addColorStop(1, '#2D3C40');
    fillRounded(context, -w * 0.42, -h * 0.48, w * 0.84, h * 0.92,
      Math.min(w, h) * 0.16, shell);
    strokeRounded(context, -w * 0.42, -h * 0.48, w * 0.84, h * 0.92,
      Math.min(w, h) * 0.16, '#202D30', 1.5);

    fillRounded(context, -w * 0.43, -h * 0.42, w * 0.86, h * 0.12, 3,
      '#A0A18A');
    fillRounded(context, -w * 0.43, h * 0.27, w * 0.86, h * 0.12, 3,
      '#394A4A');
    line(context, -w * 0.34, -h * 0.27, w * 0.34, -h * 0.27,
      'rgba(18, 27, 29, 0.62)', 1.4);
    line(context, -w * 0.34, h * 0.2, w * 0.34, h * 0.2,
      'rgba(18, 27, 29, 0.62)', 1.4);

    fillRounded(context, -w * 0.39, -h * 0.08, w * 0.78, h * 0.2, 2,
      '#B58A50');
    context.save();
    context.globalAlpha *= 0.72;
    hazardStripe(context, -w * 0.37, -h * 0.065, w * 0.74, h * 0.16,
      { stripeWidth: Math.max(2, w * 0.055), alpha: 0.62 });
    context.restore();

    if (damaged > 0.05) {
      ellipse(context, w * 0.22, -h * 0.22, w * 0.12, h * 0.1,
        `rgba(116, 66, 47, ${0.22 + damaged * 0.42})`);
      line(context, -w * 0.12, -h * 0.36, w * 0.03, -h * 0.06,
        '#483B34', 1.4 + damaged);
    }

    bolt(context, -w * 0.28, -h * 0.36, Math.max(1.2, w * 0.035));
    bolt(context, w * 0.28, -h * 0.36, Math.max(1.2, w * 0.035));
  });
}

function drawFirePatch(
  context: CanvasRenderingContext2D,
  fire: NonNullable<OilBarrelVisual['fire']>,
  time: number,
): void {
  const intensity = progress(fire.intensity);
  if (intensity <= 0) return;

  withCanvasState(context, () => {
    const pulse = 0.92 + Math.sin(time * 7.4 + fire.ageSeconds * 2.1) * 0.08;
    const radius = fire.radius * pulse;
    const glow = context.createRadialGradient(
      fire.x, fire.y, radius * 0.08,
      fire.x, fire.y, radius * 1.45,
    );
    glow.addColorStop(0, `rgba(255, 189, 82, ${0.18 * intensity})`);
    glow.addColorStop(0.45, `rgba(238, 104, 42, ${0.14 * intensity})`);
    glow.addColorStop(1, 'rgba(238, 104, 42, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(fire.x, fire.y, radius * 1.45, 0, Math.PI * 2);
    context.fill();

    ellipse(context, fire.x, fire.y + radius * 0.12,
      radius * 0.9, radius * 0.38, `rgba(24, 25, 22, ${0.58 * intensity})`);
    ellipse(context, fire.x - radius * 0.12, fire.y,
      radius * 0.68, radius * 0.27, `rgba(199, 75, 35, ${0.72 * intensity})`);

    for (let index = 0; index < 5; index += 1) {
      const phase = time * (5.2 + index * 0.23) + index * 1.7 + fire.ageSeconds;
      const offsetX = Math.sin(index * 2.4) * radius * 0.48;
      const flameH = radius * (0.28 + (0.5 + Math.sin(phase) * 0.5) * 0.26);
      const flameW = radius * (0.11 + (index % 2) * 0.035);
      context.save();
      context.translate(fire.x + offsetX, fire.y - radius * 0.05);
      context.fillStyle = `rgba(255, ${150 + index * 9}, 67, ${0.72 * intensity})`;
      context.beginPath();
      context.moveTo(-flameW, 0);
      context.quadraticCurveTo(-flameW * 0.8, -flameH * 0.55, 0, -flameH);
      context.quadraticCurveTo(flameW * 1.1, -flameH * 0.52, flameW, 0);
      context.closePath();
      context.fill();
      context.restore();
    }
  });
}

function drawGasCylinderBody(
  context: CanvasRenderingContext2D,
  object: GasCylinderVisual,
): void {
  const w = object.width;
  const h = object.height;
  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.32);
    const shell = context.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    shell.addColorStop(0, '#354A4D');
    shell.addColorStop(0.24, '#6D8580');
    shell.addColorStop(0.52, '#9AA18D');
    shell.addColorStop(0.82, '#5C7471');
    shell.addColorStop(1, '#2B3B41');
    fillRounded(context, -w * 0.3, -h * 0.36, w * 0.6, h * 0.72,
      w * 0.25, shell);
    strokeRounded(context, -w * 0.3, -h * 0.36, w * 0.6, h * 0.72,
      w * 0.25, '#202D31', 1.5);
    fillRounded(context, -w * 0.18, -h * 0.48, w * 0.36, h * 0.17,
      2, '#77877E');
    fillRounded(context, -w * 0.1, -h * 0.58, w * 0.2, h * 0.12,
      2, '#B28A55');
    line(context, -w * 0.2, -h * 0.08, w * 0.2, -h * 0.08,
      'rgba(21, 32, 34, 0.56)', 1.2);
    fillRounded(context, -w * 0.29, h * 0.08, w * 0.58, h * 0.14,
      2, '#A77D4A');
    bolt(context, -w * 0.19, h * 0.28, Math.max(1, w * 0.035));
    bolt(context, w * 0.19, h * 0.28, Math.max(1, w * 0.035));
  });
}

function drawGasCylinderTrail(
  context: CanvasRenderingContext2D,
  object: GasCylinderVisual,
): void {
  if (object.phase !== 'flying') return;
  const intensity = progress(object.trailIntensity ?? 0.7);
  const angle = object.travelAngle ?? 0;
  const length = Math.max(object.width * 1.8, object.height * 1.2);
  withCanvasState(context, () => {
    context.translate(object.x, object.y);
    context.rotate(angle);
    const gradient = context.createLinearGradient(-length, 0, -object.width * 0.2, 0);
    gradient.addColorStop(0, 'rgba(221, 190, 132, 0)');
    gradient.addColorStop(0.5, `rgba(221, 190, 132, ${0.16 * intensity})`);
    gradient.addColorStop(1, `rgba(238, 218, 177, ${0.38 * intensity})`);
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(-length * 0.5, 0, length * 0.5, object.height * 0.2,
      0, 0, Math.PI * 2);
    context.fill();
    for (let index = 0; index < 4; index += 1) {
      const px = -length * (0.28 + index * 0.16);
      ellipse(context, px, Math.sin(index * 2.2) * object.height * 0.12,
        object.width * 0.08, object.height * 0.055,
        `rgba(194, 178, 145, ${0.24 * intensity})`);
    }
  });
}

function drawDetonation(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rawProgress: number,
  time: number,
): void {
  const p = progress(rawProgress);
  if (p >= 1 || radius <= 0) return;
  const expansion = 0.3 + p * 0.7;
  const fade = 1 - p;
  withCanvasState(context, () => {
    const r = radius * expansion;
    const glow = context.createRadialGradient(x, y, r * 0.04, x, y, r);
    glow.addColorStop(0, `rgba(255, 228, 154, ${0.72 * fade})`);
    glow.addColorStop(0.28, `rgba(255, 157, 69, ${0.5 * fade})`);
    glow.addColorStop(0.72, `rgba(195, 73, 39, ${0.22 * fade})`);
    glow.addColorStop(1, 'rgba(195, 73, 39, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = `rgba(255, 202, 117, ${0.68 * fade})`;
    context.lineWidth = Math.max(1, radius * 0.035 * fade);
    context.beginPath();
    context.arc(x, y, r * (0.72 + Math.sin(time * 12) * 0.025),
      0, Math.PI * 2);
    context.stroke();
  });
}

function drawGeneratorBody(
  context: CanvasRenderingContext2D,
  object: ElectricGeneratorVisual,
  time: number,
): void {
  const w = object.width;
  const h = object.height;
  const charging = object.phase === 'charging';
  const discharging = object.phase === 'discharging';
  const charge = progress(object.chargeProgress);

  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.32);
    fillRounded(context, -w * 0.5, -h * 0.28, w, h * 0.62, 5, '#27363A');
    strokeRounded(context, -w * 0.5, -h * 0.28, w, h * 0.62, 5,
      '#172528', 1.5);
    fillRounded(context, -w * 0.43, -h * 0.35, w * 0.86, h * 0.62, 4,
      '#52666A');
    strokeRounded(context, -w * 0.43, -h * 0.35, w * 0.86, h * 0.62, 4,
      '#25363A', 1.2);

    fillRounded(context, -w * 0.25, -h * 0.25, w * 0.5, h * 0.42, 3,
      '#34484A');
    for (let index = 0; index < 5; index += 1) {
      const yy = -h * 0.2 + index * h * 0.075;
      line(context, -w * 0.2, yy, w * 0.2, yy,
        index % 2 ? '#A17B53' : '#8B9A8B', 2);
    }

    for (const side of [-1, 1] as const) {
      fillRounded(context, side * w * 0.34 - w * 0.07, -h * 0.17,
        w * 0.14, h * 0.36, 3, '#27393C');
      fillRounded(context, side * w * 0.34 - w * 0.045, -h * 0.12,
        w * 0.09, h * 0.25, 2, '#71847A');
      bolt(context, side * w * 0.34, -h * 0.22, Math.max(1, w * 0.025));
    }

    const lampAlpha = charging
      ? 0.48 + Math.sin(time * 8) * 0.22
      : discharging ? 0.95 : 0.55;
    ellipse(context, 0, -h * 0.43, w * 0.075, h * 0.07,
      charging ? `rgba(232, 180, 91, ${lampAlpha})`
        : discharging ? `rgba(130, 218, 215, ${lampAlpha})`
          : 'rgba(119, 148, 130, 0.55)');

    fillRounded(context, -w * 0.32, h * 0.23, w * 0.64, h * 0.075, 2,
      '#1C292C');
    fillRounded(context, -w * 0.3, h * 0.24, w * 0.6 * charge, h * 0.045,
      1, charging ? '#D7A45B' : '#79B5A5');
  });
}

function seededUnit(seed: number, index: number): number {
  const value = Math.sin(seed * 127.1 + index * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function drawElectricArcs(
  context: CanvasRenderingContext2D,
  object: ElectricGeneratorVisual,
  time: number,
): void {
  if (object.phase !== 'discharging') return;
  const p = progress(object.dischargeProgress);
  const radius = object.dangerRadius;
  const direction = object.arcDirection ?? 0;
  const seed = object.visualSeed;
  withCanvasState(context, () => {
    context.globalAlpha *= 0.45 + Math.sin(time * 24 + seed) * 0.12;
    context.lineCap = 'round';
    for (let arc = 0; arc < 7; arc += 1) {
      const baseAngle = direction + (arc - 3) * 0.34;
      const reach = radius * (0.48 + seededUnit(seed, arc) * 0.5);
      const segments = 5;
      const points: Array<{ x: number; y: number }> = [];
      for (let segment = 0; segment <= segments; segment += 1) {
        const t = segment / segments;
        const jitter = segment === 0 || segment === segments
          ? 0
          : (seededUnit(seed + Math.floor(time * 18), arc * 9 + segment) - 0.5)
            * radius * 0.12;
        const angle = baseAngle + jitter / Math.max(1, reach);
        points.push({
          x: object.x + Math.cos(angle) * reach * t,
          y: object.y + Math.sin(angle) * reach * t,
        });
      }
      context.strokeStyle = 'rgba(105, 220, 218, 0.34)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);
      for (const point of points.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();

      context.strokeStyle = 'rgba(204, 255, 239, 0.92)';
      context.lineWidth = 1.35;
      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);
      for (const point of points.slice(1)) context.lineTo(point.x, point.y);
      context.stroke();
    }

    const ringRadius = radius * p;
    context.strokeStyle = 'rgba(123, 225, 218, 0.72)';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(object.x, object.y, ringRadius, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = 'rgba(123, 225, 218, 0.22)';
    context.lineWidth = 7;
    context.beginPath();
    context.arc(object.x, object.y, ringRadius * 0.96, 0, Math.PI * 2);
    context.stroke();
  });
}

function drawGeneratorChargeGlow(
  context: CanvasRenderingContext2D,
  object: ElectricGeneratorVisual,
  time: number,
): void {
  if (object.phase !== 'charging') return;
  const charge = progress(object.chargeProgress);
  const pulse = 0.75 + Math.sin(time * 9 + object.visualSeed) * 0.25;
  const radius = Math.max(object.width, object.height) * (0.6 + charge * 0.65);
  withCanvasState(context, () => {
    const glow = context.createRadialGradient(
      object.x, object.y, 2,
      object.x, object.y, radius,
    );
    glow.addColorStop(0, `rgba(220, 174, 91, ${0.18 * charge * pulse})`);
    glow.addColorStop(0.5, `rgba(220, 174, 91, ${0.07 * charge * pulse})`);
    glow.addColorStop(1, 'rgba(220, 174, 91, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(object.x, object.y, radius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawMovingWallBody(
  context: CanvasRenderingContext2D,
  object: MovingWallVisual,
): void {
  const w = object.width;
  const h = object.height;
  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.3);
    fillRounded(context, -w * 0.5, -h * 0.5, w, h, 4, '#27383D');
    strokeRounded(context, -w * 0.5, -h * 0.5, w, h, 4, '#172629', 2);

    const plate = context.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    plate.addColorStop(0, '#82918A');
    plate.addColorStop(0.18, '#5B7071');
    plate.addColorStop(1, '#34484C');
    fillRounded(context, -w * 0.46, -h * 0.42, w * 0.92, h * 0.78,
      3, plate);
    strokeRounded(context, -w * 0.46, -h * 0.42, w * 0.92, h * 0.78,
      3, '#26383C', 1.2);

    const horizontal = w >= h;
    if (horizontal) {
      line(context, -w * 0.38, -h * 0.12, w * 0.38, -h * 0.12,
        'rgba(18, 29, 32, 0.58)', 1.5);
      line(context, -w * 0.38, h * 0.16, w * 0.38, h * 0.16,
        'rgba(18, 29, 32, 0.58)', 1.5);
      hazardStripe(context, -w * 0.43, h * 0.25, w * 0.86,
        Math.max(3, h * 0.1), { stripeWidth: 5, alpha: 0.82 });
    } else {
      line(context, -w * 0.12, -h * 0.38, -w * 0.12, h * 0.3,
        'rgba(18, 29, 32, 0.58)', 1.5);
      line(context, w * 0.16, -h * 0.38, w * 0.16, h * 0.3,
        'rgba(18, 29, 32, 0.58)', 1.5);
      hazardStripe(context, w * 0.25, -h * 0.42,
        Math.max(3, w * 0.1), h * 0.84,
        { stripeWidth: 5, alpha: 0.82 });
    }

    for (const side of [-1, 1] as const) {
      bolt(context, side * w * 0.4, -h * 0.34, 2);
      bolt(context, side * w * 0.4, h * 0.29, 2);
    }
  });
}

function drawMovingWallMotion(
  context: CanvasRenderingContext2D,
  object: MovingWallVisual,
): void {
  const intensity = progress(object.movementIntensity);
  if (intensity <= 0.01) return;
  const angle = object.travelAngle ?? 0;
  const length = Math.max(object.width, object.height) * (0.36 + intensity * 0.2);
  withCanvasState(context, () => {
    context.translate(object.x, object.y);
    context.rotate(angle);
    context.globalAlpha *= intensity * 0.52;
    for (const side of [-1, 1] as const) {
      line(context, -length, side * object.height * 0.25,
        -object.width * 0.48, side * object.height * 0.25,
        '#D4B16F', 1.5);
      line(context, -length * 0.82, side * object.height * 0.34,
        -object.width * 0.52, side * object.height * 0.34,
        'rgba(212, 177, 111, 0.55)', 1);
    }
  });
}

function drawSteamPipeBody(
  context: CanvasRenderingContext2D,
  object: SteamPipeVisual,
  time: number,
): void {
  const w = object.width;
  const h = object.height;
  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.3);
    fillRounded(context, -w * 0.5, -h * 0.22, w, h * 0.48, h * 0.18,
      '#293B3F');
    fillRounded(context, -w * 0.44, -h * 0.2, w * 0.88, h * 0.36,
      h * 0.15, '#71847D');
    strokeRounded(context, -w * 0.44, -h * 0.2, w * 0.88, h * 0.36,
      h * 0.15, '#29393B', 1.3);

    for (const side of [-1, 1] as const) {
      fillRounded(context, side * w * 0.28 - w * 0.055, -h * 0.31,
        w * 0.11, h * 0.58, 2, '#3C5051');
      bolt(context, side * w * 0.32, -h * 0.22, 1.7);
      bolt(context, side * w * 0.32, h * 0.18, 1.7);
    }

    fillRounded(context, w * 0.34, -h * 0.12, w * 0.2, h * 0.28,
      2, '#27373A');
    fillRounded(context, w * 0.49, -h * 0.08, w * 0.07, h * 0.2,
      2, '#A17A51');

    if (object.phase === 'warning') {
      const pulse = 0.42 + Math.sin(time * 10) * 0.25;
      ellipse(context, w * 0.52, 0, w * 0.09, h * 0.17,
        `rgba(228, 174, 91, ${pulse})`);
    } else {
      ellipse(context, w * 0.52, 0, w * 0.07, h * 0.13,
        'rgba(132, 165, 155, 0.52)');
    }
  });
}

function drawSteamPlume(
  context: CanvasRenderingContext2D,
  object: SteamPipeVisual,
  time: number,
): void {
  if (object.phase !== 'venting') return;
  const intensity = progress(object.intensity);
  const p = progress(object.phaseProgress);
  const dx = object.directionX;
  const dy = object.directionY;
  const magnitude = Math.hypot(dx, dy) || 1;
  const ux = dx / magnitude;
  const uy = dy / magnitude;
  const length = Math.max(object.width, object.height) * (1.9 + intensity * 2.2);
  const baseX = object.x + ux * object.width * 0.42;
  const baseY = object.y + uy * object.height * 0.42;

  withCanvasState(context, () => {
    for (let index = 0; index < 9; index += 1) {
      const t = (index + 1) / 10;
      const wobble = Math.sin(time * 4.5 + index * 1.7) * object.width * 0.08;
      const spread = object.width * (0.08 + t * 0.2);
      const px = baseX + ux * length * t - uy * wobble;
      const py = baseY + uy * length * t + ux * wobble;
      const radius = spread * (0.55 + (index % 3) * 0.16);
      const alpha = (0.12 + (1 - t) * 0.15) * intensity * (0.7 + p * 0.3);
      ellipse(context, px, py, radius, radius * 0.72,
        `rgba(196, 207, 194, ${alpha})`, Math.atan2(uy, ux));
    }

    const endX = baseX + ux * length;
    const endY = baseY + uy * length;
    const plume = context.createLinearGradient(baseX, baseY, endX, endY);
    plume.addColorStop(0, `rgba(202, 213, 201, ${0.19 * intensity})`);
    plume.addColorStop(0.58, `rgba(184, 198, 190, ${0.1 * intensity})`);
    plume.addColorStop(1, 'rgba(184, 198, 190, 0)');
    context.fillStyle = plume;
    context.beginPath();
    context.moveTo(baseX - uy * object.width * 0.15, baseY + ux * object.width * 0.15);
    context.lineTo(baseX + ux * length - uy * object.width * 0.52,
      baseY + uy * length + ux * object.width * 0.52);
    context.lineTo(baseX + ux * length + uy * object.width * 0.52,
      baseY + uy * length - ux * object.width * 0.52);
    context.lineTo(baseX + uy * object.width * 0.15,
      baseY - ux * object.width * 0.15);
    context.closePath();
    context.fill();
  });
}

function drawIndustrialCrateBody(
  context: CanvasRenderingContext2D,
  object: IndustrialCrateVisual,
): void {
  const w = object.width;
  const h = object.height;
  const damage = object.maxHealth > 0
    ? clamp01(1 - object.health / object.maxHealth)
    : 0;
  objectTransform(context, object, () => {
    drawObjectShadow(context, w, h, h * 0.28);
    if (object.destroyed) {
      fillRounded(context, -w * 0.42, -h * 0.12, w * 0.56, h * 0.28,
        2, '#354448');
      fillRounded(context, -w * 0.08, -h * 0.32, w * 0.48, h * 0.2,
        2, '#58645D');
      line(context, -w * 0.25, -h * 0.08, w * 0.22, -h * 0.18,
        '#1F2D31', 2);
      return;
    }

    const metal = context.createLinearGradient(-w * 0.5, -h * 0.5,
      w * 0.5, h * 0.5);
    metal.addColorStop(0, '#89948A');
    metal.addColorStop(0.16, '#5E716D');
    metal.addColorStop(0.7, '#43575A');
    metal.addColorStop(1, '#2D3D42');
    fillRounded(context, -w * 0.5, -h * 0.5, w, h, 4, metal);
    strokeRounded(context, -w * 0.5, -h * 0.5, w, h, 4,
      '#1D2C30', 1.6);

    for (const sx of [-1, 1] as const) {
      for (const sy of [-1, 1] as const) {
        fillRounded(context, sx * (w * 0.39) - w * 0.055,
          sy * (h * 0.39) - h * 0.055,
          w * 0.11, h * 0.11, 2, '#26383C');
        bolt(context, sx * w * 0.39, sy * h * 0.39, 1.8);
      }
    }

    fillRounded(context, -w * 0.32, -h * 0.29, w * 0.64, h * 0.58,
      3, '#34484A');
    strokeRounded(context, -w * 0.32, -h * 0.29, w * 0.64, h * 0.58,
      3, 'rgba(17, 29, 32, 0.72)', 1);
    line(context, -w * 0.24, -h * 0.12, w * 0.24, -h * 0.12,
      'rgba(176, 187, 166, 0.32)', 1);
    line(context, -w * 0.24, h * 0.12, w * 0.24, h * 0.12,
      'rgba(176, 187, 166, 0.2)', 1);

    hazardStripe(context, -w * 0.46, h * 0.34, w * 0.92,
      Math.max(3, h * 0.09), { stripeWidth: 4, alpha: 0.72 });

    if (damage > 0.08) {
      const crackAlpha = 0.35 + damage * 0.5;
      line(context, -w * 0.1, -h * 0.42, w * 0.03, -h * 0.08,
        `rgba(22, 27, 27, ${crackAlpha})`, 1.5);
      line(context, w * 0.03, -h * 0.08, -w * 0.02, h * 0.12,
        `rgba(22, 27, 27, ${crackAlpha})`, 1.2);
    }
    if (damage > 0.45) {
      line(context, w * 0.3, -h * 0.18, w * 0.18, h * 0.1,
        'rgba(20, 27, 28, 0.72)', 1.5);
    }
  });
}

function drawOrbDrop(
  context: CanvasRenderingContext2D,
  drop: NonNullable<IndustrialCrateVisual['drop']>,
  time: number,
): void {
  const reveal = progress(drop.revealProgress);
  if (reveal <= 0) return;
  const bob = Math.sin(time * 3.8) * 2;
  const radius = 7 + reveal * 3;
  const color = drop.kind === 'health' ? '#E98A75' : '#7CC8C0';
  withCanvasState(context, () => {
    context.globalAlpha *= reveal;
    const glow = context.createRadialGradient(
      drop.x, drop.y + bob, 1,
      drop.x, drop.y + bob, radius * 2.8,
    );
    glow.addColorStop(0, `${color}88`);
    glow.addColorStop(1, `${color}00`);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(drop.x, drop.y + bob, radius * 2.8, 0, Math.PI * 2);
    context.fill();

    ellipse(context, drop.x, drop.y + bob, radius, radius,
      '#243337');
    ellipse(context, drop.x, drop.y + bob, radius * 0.7, radius * 0.7,
      color);
    ellipse(context, drop.x - radius * 0.22, drop.y + bob - radius * 0.24,
      radius * 0.22, radius * 0.18, 'rgba(255, 246, 218, 0.76)');
    if (drop.kind === 'health') {
      line(context, drop.x - radius * 0.35, drop.y + bob,
        drop.x + radius * 0.35, drop.y + bob, '#FFF1D7', 1.6);
      line(context, drop.x, drop.y + bob - radius * 0.35,
        drop.x, drop.y + bob + radius * 0.35, '#FFF1D7', 1.6);
    } else {
      strokeRounded(context, drop.x - radius * 0.35, drop.y + bob - radius * 0.38,
        radius * 0.7, radius * 0.76, 3, '#E1F4E6', 1.3);
    }
  });
}

export function renderIndustrialObjectBodies(
  context: CanvasRenderingContext2D,
  objects: readonly IndustrialVisualObject[],
  options: IndustrialRenderOptions,
): void {
  const time = Number.isFinite(options.timeSeconds) ? options.timeSeconds : 0;
  for (const object of objects) {
    switch (object.kind) {
      case 'oil-barrel':
        drawOilBarrelBody(context, object);
        break;
      case 'gas-cylinder':
        if (object.phase !== 'finished' && object.phase !== 'detonating') {
          drawGasCylinderBody(context, object);
        }
        break;
      case 'electric-generator':
        drawGeneratorBody(context, object, time);
        break;
      case 'moving-wall':
        drawMovingWallBody(context, object);
        break;
      case 'steam-pipe':
        drawSteamPipeBody(context, object, time);
        break;
      case 'industrial-crate':
        drawIndustrialCrateBody(context, object);
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}

export function renderIndustrialObjectEffects(
  context: CanvasRenderingContext2D,
  objects: readonly IndustrialVisualObject[],
  options: IndustrialRenderOptions,
): void {
  const time = Number.isFinite(options.timeSeconds) ? options.timeSeconds : 0;
  for (const object of objects) {
    switch (object.kind) {
      case 'oil-barrel':
        if (object.fire) drawFirePatch(context, object.fire, time);
        break;
      case 'gas-cylinder':
        if (object.phase === 'flying') drawGasCylinderTrail(context, object);
        if (object.phase === 'detonating') {
          drawDetonation(
            context,
            object.x,
            object.y,
            object.blastRadius ?? Math.max(object.width, object.height) * 2.4,
            object.detonationProgress ?? 0,
            time,
          );
        }
        break;
      case 'electric-generator':
        drawGeneratorChargeGlow(context, object, time);
        drawElectricArcs(context, object, time);
        break;
      case 'moving-wall':
        drawMovingWallMotion(context, object);
        break;
      case 'steam-pipe':
        drawSteamPlume(context, object, time);
        break;
      case 'industrial-crate':
        if (object.destroyed && object.destructionProgress !== undefined) {
          drawDetonation(
            context,
            object.x,
            object.y,
            Math.max(object.width, object.height) * 0.72,
            object.destructionProgress,
            time,
          );
        }
        if (object.drop) drawOrbDrop(context, object.drop, time);
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}
