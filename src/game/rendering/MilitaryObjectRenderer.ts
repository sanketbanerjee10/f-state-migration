import {
  MILITARY,
  clamp01,
  drawMilitaryBolt,
  drawRivetRow,
  ellipse,
  fillRounded,
  line,
  strokeRounded,
  withMilitaryCanvasState,
} from './MilitaryCanvas';

export interface MilitaryVisualBase {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation?: number;
}

export interface SandbagBarricadeVisual extends MilitaryVisualBase {
  readonly kind: 'sandbag-barricade';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly sandArea?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly intensity: number;
  };
}

export interface MilitaryAmmoCrateVisual extends MilitaryVisualBase {
  readonly kind: 'military-ammo-crate';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly explosion?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly progress: number;
  };
  readonly drop?: {
    readonly x: number;
    readonly y: number;
    readonly revealProgress: number;
  };
}

export interface FuelDrumVisual extends MilitaryVisualBase {
  readonly kind: 'fuel-drum';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly phase: 'idle' | 'igniting' | 'blast' | 'aftermath' | 'finished';
  readonly blast?: {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly progress: number;
    readonly intensity: number;
  };
  readonly drop?: {
    readonly x: number;
    readonly y: number;
    readonly revealProgress: number;
  };
}

export interface RazorWireVisual extends MilitaryVisualBase {
  readonly kind: 'razor-wire';
  readonly active: boolean;
  readonly contact?: {
    readonly x: number;
    readonly y: number;
    readonly intensity: number;
  };
}

export interface AbandonedTurretVisual extends MilitaryVisualBase {
  readonly kind: 'abandoned-turret';
  readonly wireOffset: number;
  readonly state:
    | 'broken'
    | 'revive-ready'
    | 'reviving'
    | 'active'
    | 'firing'
    | 'damaged'
    | 'destroyed';
  readonly health?: number;
  readonly maxHealth?: number;
  readonly facingAngle: number;
  readonly reviveProgress?: number;
  readonly muzzleFlash?: number;
  readonly shotAngle?: number;
}

export interface MilitarySupplyCrateVisual extends MilitaryVisualBase {
  readonly kind: 'military-supply-crate';
  readonly health: number;
  readonly maxHealth: number;
  readonly destroyed: boolean;
  readonly destructionProgress?: number;
  readonly reward?: {
    readonly x: number;
    readonly y: number;
    readonly revealProgress: number;
    readonly visualKind?: 'generic-supply' | 'health-pack' | 'health-orb';
  };
}

export type MilitaryVisualObject =
  | SandbagBarricadeVisual
  | MilitaryAmmoCrateVisual
  | FuelDrumVisual
  | RazorWireVisual
  | AbandonedTurretVisual
  | MilitarySupplyCrateVisual;

export interface MilitaryRenderOptions {
  readonly timeSeconds: number;
}

function damageRatio(health: number, maxHealth: number): number {
  return maxHealth > 0 ? clamp01(1 - health / maxHealth) : 1;
}

function withObjectTransform(
  context: CanvasRenderingContext2D,
  object: MilitaryVisualBase,
  draw: () => void,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(object.x, object.y);
    if (object.rotation) context.rotate(object.rotation);
    draw();
  });
}

function drawShadow(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ellipse(context, 2, height * 0.2, Math.max(4, width * 0.56),
    Math.max(3, height * 0.3), MILITARY.shadow);
}

function drawSandbag(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  worn: boolean,
): void {
  withMilitaryCanvasState(context, () => {
    context.translate(x, y);
    context.rotate(rotation);
    const fill = context.createLinearGradient(0, -height * 0.5, 0, height * 0.5);
    fill.addColorStop(0, worn ? '#92866A' : '#C1B18B');
    fill.addColorStop(0.45, worn ? '#706B58' : '#A99A76');
    fill.addColorStop(1, worn ? '#4C4D40' : '#756D56');
    context.fillStyle = fill;
    context.beginPath();
    context.ellipse(0, 0, width * 0.5, height * 0.5, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(39, 39, 31, 0.62)';
    context.lineWidth = Math.max(0.8, height * 0.055);
    context.stroke();
    line(context, -width * 0.23, -height * 0.04, width * 0.23, height * 0.04,
      'rgba(48, 45, 35, 0.48)', Math.max(0.7, height * 0.035));
    line(context, -width * 0.1, -height * 0.3, width * 0.08, -height * 0.22,
      'rgba(231, 218, 180, 0.22)', 0.8);
  });
}

function drawSandbagBody(
  context: CanvasRenderingContext2D,
  object: SandbagBarricadeVisual,
): void {
  const { width: w, height: h } = object;
  const damage = damageRatio(object.health, object.maxHealth);
  withObjectTransform(context, object, () => {
    drawShadow(context, w, h);
    if (object.destroyed) {
      drawSandbag(context, -w * 0.27, h * 0.12, w * 0.43, h * 0.32, -0.22, true);
      drawSandbag(context, w * 0.1, h * 0.17, w * 0.4, h * 0.28, 0.18, true);
      drawSandbag(context, -w * 0.02, -h * 0.02, w * 0.34, h * 0.25, 0.08, true);
      return;
    }

    for (let row = 0; row < 2; row += 1) {
      const count = row === 0 ? 3 : 4;
      const bagWidth = w * (row === 0 ? 0.31 : 0.27);
      const spacing = row === 0 ? w * 0.32 : w * 0.245;
      const offset = row === 0 ? -w * 0.32 : -w * 0.367;
      for (let index = 0; index < count; index += 1) {
        const x = offset + index * spacing + (row === 0 ? w * 0.16 : 0);
        const y = row === 0 ? -h * 0.22 : h * 0.22;
        drawSandbag(context, x, y, bagWidth, h * 0.43,
          Math.sin(index * 2.1 + row) * 0.035, false);
      }
    }
    if (damage > 0.12) {
      const alpha = 0.25 + damage * 0.5;
      line(context, -w * 0.22, -h * 0.28, -w * 0.05, h * 0.03,
        `rgba(58, 47, 35, ${alpha})`, 1.5);
      line(context, -w * 0.05, h * 0.03, w * 0.08, h * 0.17,
        `rgba(58, 47, 35, ${alpha})`, 1.2);
      ellipse(context, w * 0.28, -h * 0.2, w * 0.09, h * 0.06,
        `rgba(72, 62, 43, ${0.12 + damage * 0.22})`);
    }
  });
}

function drawCrateBody(
  context: CanvasRenderingContext2D,
  object: MilitaryAmmoCrateVisual | MilitarySupplyCrateVisual,
  supply: boolean,
): void {
  const { width: w, height: h } = object;
  const damage = damageRatio(object.health, object.maxHealth);
  withObjectTransform(context, object, () => {
    drawShadow(context, w, h);
    if (object.destroyed) {
      fillRounded(context, -w * 0.42, -h * 0.12, w * 0.62, h * 0.27, 3, '#39463D');
      fillRounded(context, -w * 0.08, -h * 0.31, w * 0.48, h * 0.22, 3, '#6D765E');
      fillRounded(context, w * 0.08, h * 0.13, w * 0.34, h * 0.17, 2, '#4C5949');
      line(context, -w * 0.28, -h * 0.06, w * 0.25, -h * 0.19, '#252E27', 2);
      return;
    }

    const base = supply ? '#62674C' : '#4D5D43';
    const light = supply ? '#A29A70' : '#89916B';
    const dark = supply ? '#3C4636' : '#29372F';
    const metal = context.createLinearGradient(-w * 0.5, -h * 0.5, w * 0.5, h * 0.5);
    metal.addColorStop(0, light);
    metal.addColorStop(0.22, base);
    metal.addColorStop(0.76, dark);
    metal.addColorStop(1, '#202B25');
    fillRounded(context, -w * 0.5, -h * 0.5, w, h, 4, metal);
    strokeRounded(context, -w * 0.5, -h * 0.5, w, h, 4, '#1D2923', 1.8);
    fillRounded(context, -w * 0.47, -h * 0.43, w * 0.12, h * 0.86, 2, '#27352D');
    fillRounded(context, w * 0.35, -h * 0.43, w * 0.12, h * 0.86, 2, '#27352D');
    drawRivetRow(context, -w * 0.3, -h * 0.39, w * 0.6, 4, 1.2);
    fillRounded(context, -w * 0.29, -h * 0.29, w * 0.58, h * 0.58, 3,
      supply ? '#4B533F' : '#344438');
    strokeRounded(context, -w * 0.29, -h * 0.29, w * 0.58, h * 0.58, 3,
      'rgba(20, 29, 23, 0.65)', 1);

    if (supply) {
      fillRounded(context, -w * 0.2, -h * 0.16, w * 0.4, h * 0.34, 3, '#A59A70');
      line(context, -w * 0.16, -h * 0.2, -w * 0.16, h * 0.2, '#3A4435', 2.4);
      line(context, w * 0.16, -h * 0.2, w * 0.16, h * 0.2, '#3A4435', 2.4);
      fillRounded(context, -w * 0.12, -h * 0.09, w * 0.24, h * 0.18, 2, '#6C7555');
    } else {
      for (let index = 0; index < 3; index += 1) {
        const x = (index - 1) * w * 0.13;
        fillRounded(context, x - w * 0.035, -h * 0.11, w * 0.07, h * 0.27, 2, '#B59A62');
        ellipse(context, x, -h * 0.11, w * 0.035, h * 0.04, '#D0B477');
      }
      line(context, -w * 0.37, h * 0.31, w * 0.37, h * 0.31,
        '#B49A5F', Math.max(2, h * 0.08));
    }
    if (damage > 0.08) {
      line(context, -w * 0.08, -h * 0.43, w * 0.02, -h * 0.08,
        `rgba(25, 30, 25, ${0.3 + damage * 0.48})`, 1.4);
      line(context, w * 0.02, -h * 0.08, w * 0.24, h * 0.2,
        `rgba(25, 30, 25, ${0.25 + damage * 0.4})`, 1.2);
    }
    drawMilitaryBolt(context, -w * 0.39, -h * 0.39);
    drawMilitaryBolt(context, w * 0.39, -h * 0.39);
    drawMilitaryBolt(context, -w * 0.39, h * 0.39);
    drawMilitaryBolt(context, w * 0.39, h * 0.39);
  });
}

function drawFuelDrumBody(context: CanvasRenderingContext2D, object: FuelDrumVisual): void {
  const { width: w, height: h } = object;
  const damage = damageRatio(object.health, object.maxHealth);
  withObjectTransform(context, object, () => {
    drawShadow(context, w, h);
    if (object.destroyed || object.phase === 'aftermath' || object.phase === 'finished') {
      fillRounded(context, -w * 0.46, -h * 0.22, w * 0.92, h * 0.52,
        h * 0.16, '#343C32');
      fillRounded(context, -w * 0.38, -h * 0.16, w * 0.76, h * 0.36,
        h * 0.13, '#4C5140');
      line(context, -w * 0.3, -h * 0.06, w * 0.27, h * 0.08, '#242B24', 2);
      return;
    }

    const shell = context.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
    shell.addColorStop(0, '#303D32');
    shell.addColorStop(0.2, '#5D6A4C');
    shell.addColorStop(0.5, '#87906A');
    shell.addColorStop(0.8, '#59664A');
    shell.addColorStop(1, '#29362D');
    fillRounded(context, -w * 0.42, -h * 0.48, w * 0.84, h * 0.92,
      Math.min(w, h) * 0.16, shell);
    strokeRounded(context, -w * 0.42, -h * 0.48, w * 0.84, h * 0.92,
      Math.min(w, h) * 0.16, '#1D2A22', 1.6);
    fillRounded(context, -w * 0.43, -h * 0.39, w * 0.86, h * 0.11, 3, '#A29A6F');
    fillRounded(context, -w * 0.43, h * 0.27, w * 0.86, h * 0.11, 3, '#394637');
    fillRounded(context, -w * 0.34, -h * 0.07, w * 0.68, h * 0.22, 2, '#B49A5E');
    context.strokeStyle = '#3A4030';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(0, -h * 0.03);
    context.lineTo(-w * 0.07, h * 0.1);
    context.lineTo(w * 0.07, h * 0.1);
    context.closePath();
    context.stroke();
    if (damage > 0.08) {
      ellipse(context, w * 0.22, -h * 0.18, w * 0.12, h * 0.1,
        `rgba(113, 61, 38, ${0.22 + damage * 0.42})`);
      line(context, -w * 0.14, -h * 0.35, w * 0.04, -h * 0.04, '#40392D', 1.5);
    }
    if (object.phase === 'igniting') {
      ellipse(context, w * 0.12, -h * 0.5, w * 0.18, h * 0.12,
        'rgba(244, 143, 64, 0.38)');
    }
  });
}

function drawWireBody(
  context: CanvasRenderingContext2D,
  object: RazorWireVisual,
  time: number,
): void {
  const { width: w, height: h } = object;
  withObjectTransform(context, object, () => {
    drawShadow(context, w, h);
    context.globalAlpha *= object.active ? 1 : 0.5;
    ellipse(context, 0, h * 0.08, w * 0.52, h * 0.32, 'rgba(25, 30, 25, 0.26)');
    for (let index = 0; index < 5; index += 1) {
      const x = -w * 0.42 + (w * 0.84 * index) / 4;
      const rx = w * 0.13;
      const ry = h * 0.37;
      context.strokeStyle = '#26302B';
      context.lineWidth = Math.max(2, h * 0.085);
      context.beginPath();
      context.ellipse(x, 0, rx, ry, 0, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = '#92968A';
      context.lineWidth = Math.max(0.8, h * 0.027);
      context.beginPath();
      context.ellipse(x - 1, -1, rx * 0.94, ry * 0.94, 0, 0, Math.PI * 2);
      context.stroke();
      for (let barb = 0; barb < 4; barb += 1) {
        const angle = barb * Math.PI * 0.5 + index * 0.8;
        const bx = x + Math.cos(angle) * rx;
        const by = Math.sin(angle) * ry;
        line(context, bx - 2, by - 2, bx + 2, by + 2, '#B3B4A5', 1.1);
        line(context, bx - 2, by + 2, bx + 2, by - 2, '#4D5951', 1);
      }
    }
    for (const side of [-1, 1] as const) {
      const stakeX = side * w * 0.48;
      fillRounded(context, stakeX - 2, -h * 0.45, 4, h * 0.9, 1, '#454F47');
    }
    line(context, -w * 0.47, -h * 0.05, w * 0.47, -h * 0.05, '#A4A99A', 1.1);
    if (object.active) {
      const glint = 0.12 + (0.5 + Math.sin(time * 3.2) * 0.5) * 0.2;
      line(context, -w * 0.3, -h * 0.22, -w * 0.18, -h * 0.29,
        `rgba(238, 229, 194, ${glint})`, 1.4);
      line(context, w * 0.12, h * 0.24, w * 0.25, h * 0.15,
        `rgba(238, 229, 194, ${glint})`, 1.2);
    }
  });
}

function drawTurretBody(context: CanvasRenderingContext2D, object: AbandonedTurretVisual): void {
  const { width: w, height: h } = object;
  withObjectTransform(context, object, () => {
    drawShadow(context, w, h);
    if (object.state === 'destroyed') {
      fillRounded(context, -w * 0.42, h * 0.04, w * 0.84, h * 0.3, 4, '#303A34');
      fillRounded(context, -w * 0.2, -h * 0.12, w * 0.4, h * 0.22, 3, '#596052');
      line(context, -w * 0.24, -h * 0.1, w * 0.3, h * 0.19, '#252D28', 2);
      return;
    }
    fillRounded(context, -w * 0.42, -h * 0.12, w * 0.84, h * 0.52, 5, '#303C35');
    strokeRounded(context, -w * 0.42, -h * 0.12, w * 0.84, h * 0.52, 5, '#1E2A24', 1.8);
    ellipse(context, 0, h * 0.12, w * 0.34, h * 0.2, '#65705A');
    ellipse(context, 0, h * 0.12, w * 0.25, h * 0.13, '#303D34');
    withMilitaryCanvasState(context, () => {
      context.translate(0, -h * 0.12);
      context.rotate(object.facingAngle);
      fillRounded(context, -w * 0.3, -h * 0.34, w * 0.6, h * 0.36, 4, '#596550');
      strokeRounded(context, -w * 0.3, -h * 0.34, w * 0.6, h * 0.36, 4, '#222D27', 1.5);
      fillRounded(context, w * 0.16, -h * 0.25, w * 0.48, h * 0.11, 2, '#29352E');
      fillRounded(context, w * 0.54, -h * 0.23, w * 0.12, h * 0.07, 1, '#A19B7D');
      line(context, -w * 0.18, -h * 0.29, -w * 0.1, -h * 0.42, '#A99B73', 1.5);
      if (object.state === 'broken' || object.state === 'revive-ready') {
        line(context, -w * 0.2, -h * 0.04, -w * 0.34, h * 0.11, '#B58B56', 1.6);
      }
    });
    const indicator = object.state === 'broken'
      ? '#594A38'
      : object.state === 'revive-ready' || object.state === 'reviving'
        ? '#B99A55'
        : object.state === 'damaged'
          ? '#89564A'
          : '#778866';
    ellipse(context, 0, -h * 0.03, 3, 2.5, indicator);
    if (object.state === 'reviving') {
      const progress = clamp01(object.reviveProgress ?? 0);
      context.strokeStyle = '#C5A865';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(0, -h * 0.03, Math.max(w, h) * 0.42,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      context.stroke();
    }
  });
}

function drawExplosion(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progressValue: number,
  time: number,
  intensity: number,
  fire: boolean,
): void {
  const progress = clamp01(progressValue);
  if (progress >= 1 || radius <= 0) return;
  const expand = 0.3 + progress * 0.7;
  withMilitaryCanvasState(context, () => {
    context.globalAlpha *= (1 - progress) * clamp01(intensity);
    const currentRadius = radius * expand;
    const gradient = context.createRadialGradient(x, y, 1, x, y, currentRadius);
    gradient.addColorStop(0, fire ? 'rgba(255, 219, 132, 0.92)' : 'rgba(255, 233, 178, 0.9)');
    gradient.addColorStop(0.25, fire ? 'rgba(238, 125, 53, 0.72)' : 'rgba(196, 148, 79, 0.58)');
    gradient.addColorStop(0.65, fire ? 'rgba(119, 56, 38, 0.26)' : 'rgba(106, 93, 70, 0.2)');
    gradient.addColorStop(1, 'rgba(75, 66, 50, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, currentRadius, 0, Math.PI * 2);
    context.fill();
    if (fire) {
      for (let index = 0; index < 5; index += 1) {
        const angle = index * Math.PI * 0.4 + time * 0.3;
        const flicker = 0.65 + Math.sin(time * 12 + index) * 0.15;
        ellipse(context,
          x + Math.cos(angle) * currentRadius * 0.36,
          y + Math.sin(angle) * currentRadius * 0.22,
          4 + flicker * 5, 7 + flicker * 8,
          'rgba(247, 139, 55, 0.72)', angle);
      }
    }
  });
}

function drawDrop(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  revealProgress: number,
  kind: 'rapid' | 'damage' | 'health' | 'generic',
  time: number,
): void {
  const reveal = clamp01(revealProgress);
  if (reveal <= 0) return;
  const color = kind === 'rapid' ? '#E6C16D'
    : kind === 'damage' ? '#D98258'
      : kind === 'health' ? '#82C58D'
        : '#B7A77D';
  const radius = 7 + reveal * 3;
  const bob = Math.sin(time * 3.5) * 2;
  withMilitaryCanvasState(context, () => {
    context.globalAlpha *= reveal;
    const glow = context.createRadialGradient(x, y + bob, 1, x, y + bob, radius * 2.7);
    glow.addColorStop(0, `${color}88`);
    glow.addColorStop(1, `${color}00`);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y + bob, radius * 2.7, 0, Math.PI * 2);
    context.fill();
    ellipse(context, x, y + bob, radius, radius, '#26342C');
    ellipse(context, x, y + bob, radius * 0.68, radius * 0.68, color);
    if (kind === 'rapid') {
      line(context, x - radius * 0.34, y + bob, x + radius * 0.34, y + bob, '#FFF0C9', 1.5);
      line(context, x, y + bob - radius * 0.34, x, y + bob + radius * 0.34, '#FFF0C9', 1.5);
    } else if (kind === 'damage') {
      line(context, x - radius * 0.28, y + bob + radius * 0.2,
        x + radius * 0.28, y + bob - radius * 0.2, '#FFF0C9', 1.8);
    } else if (kind === 'health') {
      line(context, x - radius * 0.3, y + bob, x + radius * 0.3, y + bob, '#FFF0C9', 1.5);
      line(context, x, y + bob - radius * 0.3, x, y + bob + radius * 0.3, '#FFF0C9', 1.5);
    }
  });
}

function drawSandArea(
  context: CanvasRenderingContext2D,
  area: NonNullable<SandbagBarricadeVisual['sandArea']>,
  time: number,
): void {
  const intensity = clamp01(area.intensity);
  if (intensity <= 0 || area.width <= 0 || area.height <= 0) return;
  withMilitaryCanvasState(context, () => {
    context.globalAlpha *= 0.28 + intensity * 0.3;
    const radius = Math.max(area.width, area.height) * 0.62;
    const gradient = context.createRadialGradient(area.x, area.y, 2, area.x, area.y, radius);
    gradient.addColorStop(0, 'rgba(190, 164, 111, 0.62)');
    gradient.addColorStop(0.7, 'rgba(164, 143, 101, 0.34)');
    gradient.addColorStop(1, 'rgba(164, 143, 101, 0)');
    context.fillStyle = gradient;
    context.fillRect(area.x - area.width * 0.5, area.y - area.height * 0.5,
      area.width, area.height);
    for (let index = 0; index < 7; index += 1) {
      const x = area.x + Math.sin(index * 2.17) * area.width * 0.39;
      const y = area.y + Math.cos(index * 1.63) * area.height * 0.34;
      const pulse = 0.8 + Math.sin(time * 1.8 + index) * 0.2;
      ellipse(context, x, y, 2 + (index % 3), 1.2 + (index % 2),
        `rgba(207, 184, 132, ${0.2 * pulse * intensity})`, index * 0.27);
    }
  });
}

function drawTurretBarbedWire(
  context: CanvasRenderingContext2D,
  object: AbandonedTurretVisual,
): void {
  const padding = object.wireOffset;
  const halfWidth = object.width * 0.5 + padding;
  const halfHeight = object.height * 0.5 + padding;
  withObjectTransform(context, object, () => {
    withMilitaryCanvasState(context, () => {
      context.strokeStyle = 'rgba(183, 178, 151, 0.78)';
      context.lineWidth = 1;
      context.setLineDash([5, 3]);
      context.strokeRect(-halfWidth, -halfHeight, halfWidth * 2, halfHeight * 2);
      context.setLineDash([]);
      for (let x = -halfWidth + 8; x < halfWidth; x += 16) {
        line(context, x - 2, -halfHeight - 2, x + 2, -halfHeight + 2, '#CFC5A4', 0.8);
        line(context, x - 2, halfHeight + 2, x + 2, halfHeight - 2, '#CFC5A4', 0.8);
      }
      for (let y = -halfHeight + 8; y < halfHeight; y += 16) {
        line(context, -halfWidth - 2, y - 2, -halfWidth + 2, y + 2, '#CFC5A4', 0.8);
        line(context, halfWidth + 2, y - 2, halfWidth - 2, y + 2, '#CFC5A4', 0.8);
      }
    });
  });
}

function drawTurretEffects(
  context: CanvasRenderingContext2D,
  object: AbandonedTurretVisual,
  time: number,
): void {
  const progress = clamp01(object.muzzleFlash ?? 0);
  if (progress <= 0) return;
  const angle = object.shotAngle ?? object.facingAngle;
  const distance = object.width * 0.42;
  const x = object.x + Math.cos(angle) * distance;
  const y = object.y - object.height * 0.08 + Math.sin(angle) * distance;
  withMilitaryCanvasState(context, () => {
    context.globalAlpha *= progress;
    const gradient = context.createRadialGradient(x, y, 1, x, y, object.width * 0.24);
    gradient.addColorStop(0, 'rgba(255, 232, 164, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 166, 67, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, object.width * 0.24, 0, Math.PI * 2);
    context.fill();
    line(context, x, y, x + Math.cos(angle) * 10, y + Math.sin(angle) * 10,
      'rgba(255, 222, 154, 0.85)', 2);
  });
  if (object.state === 'reviving') {
    ellipse(context, object.x, object.y - object.height * 0.3,
      2 + Math.sin(time * 9) * 0.5, 2, 'rgba(215, 187, 120, 0.75)');
  }
}

export function renderMilitaryObjectBodies(
  context: CanvasRenderingContext2D,
  objects: readonly MilitaryVisualObject[],
  options: MilitaryRenderOptions,
): void {
  const time = Number.isFinite(options.timeSeconds) ? options.timeSeconds : 0;
  for (const object of objects) {
    switch (object.kind) {
      case 'sandbag-barricade':
        drawSandbagBody(context, object);
        break;
      case 'military-ammo-crate':
        drawCrateBody(context, object, false);
        break;
      case 'fuel-drum':
        drawFuelDrumBody(context, object);
        break;
      case 'razor-wire':
        drawWireBody(context, object, time);
        break;
      case 'abandoned-turret':
        drawTurretBarbedWire(context, object);
        drawTurretBody(context, object);
        break;
      case 'military-supply-crate':
        drawCrateBody(context, object, true);
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}

export function renderMilitaryObjectEffects(
  context: CanvasRenderingContext2D,
  objects: readonly MilitaryVisualObject[],
  options: MilitaryRenderOptions,
): void {
  const time = Number.isFinite(options.timeSeconds) ? options.timeSeconds : 0;
  for (const object of objects) {
    switch (object.kind) {
      case 'sandbag-barricade':
        if (object.sandArea) drawSandArea(context, object.sandArea, time);
        break;
      case 'military-ammo-crate':
        if (object.explosion) {
          drawExplosion(context, object.explosion.x, object.explosion.y,
            object.explosion.radius, object.explosion.progress, time, 0.75, false);
        }
        if (object.drop) {
          drawDrop(context, object.drop.x, object.drop.y, object.drop.revealProgress,
            'rapid', time);
        }
        break;
      case 'fuel-drum':
        if (object.blast) {
          drawExplosion(context, object.blast.x, object.blast.y,
            object.blast.radius, object.blast.progress, time, object.blast.intensity, true);
        }
        if (object.phase === 'aftermath' && object.blast) {
          ellipse(context, object.blast.x, object.blast.y,
            object.blast.radius * 0.42, object.blast.radius * 0.24,
            'rgba(46, 39, 32, 0.24)');
        }
        if (object.drop) {
          drawDrop(context, object.drop.x, object.drop.y, object.drop.revealProgress,
            'damage', time);
        }
        break;
      case 'razor-wire':
        if (object.contact && object.active) {
          const intensity = clamp01(object.contact.intensity);
          withMilitaryCanvasState(context, () => {
            context.globalAlpha *= intensity;
            ellipse(context, object.contact!.x, object.contact!.y, 10, 5,
              'rgba(211, 190, 135, 0.25)');
            for (let index = 0; index < 3; index += 1) {
              const angle = index * Math.PI * 2 / 3;
              line(context, object.contact!.x, object.contact!.y,
                object.contact!.x + Math.cos(angle) * 8,
                object.contact!.y + Math.sin(angle) * 8, '#D4C59A', 1.1);
            }
          });
        }
        break;
      case 'abandoned-turret':
        drawTurretEffects(context, object, time);
        break;
      case 'military-supply-crate':
        if (object.destroyed && object.destructionProgress !== undefined) {
          drawExplosion(context, object.x, object.y,
            Math.max(object.width, object.height) * 0.7,
            object.destructionProgress, time, 0.34, false);
        }
        if (object.reward) {
          drawDrop(context, object.reward.x, object.reward.y,
            object.reward.revealProgress,
            object.reward.visualKind === 'health-orb' ||
                object.reward.visualKind === 'health-pack'
              ? 'health'
              : 'generic',
            time);
        }
        break;
      default: {
        const exhaustive: never = object;
        return exhaustive;
      }
    }
  }
}
