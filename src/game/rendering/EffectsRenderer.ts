import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawPolygon, drawRing, drawStarburst } from './ShapeLibrary';

export interface MuzzleFlashVisualState extends WorldPoint {
  readonly angle: number;
  readonly intensity: number;
}

export interface ImpactVisualState extends WorldPoint {
  readonly progress: number;
  readonly critical?: boolean;
  readonly kind?: 'hit' | 'death' | 'bomb' | 'orbExpiry' | 'spawn' | 'playerDamage' | 'telegraph' | 'acid';
  readonly color?: string;
  readonly radius?: number;
}

export interface CollectionBurstVisualState extends WorldPoint {
  readonly progress: number;
  readonly color: string;
}

export interface DamageNumberVisualState extends WorldPoint {
  readonly progress: number;
  readonly amount: number;
  readonly critical?: boolean;
}

export function drawMuzzleFlash(
  context: CanvasRenderingContext2D,
  flash: MuzzleFlashVisualState,
): void {
  const intensity = clampVisualValue(flash.intensity);
  if (intensity === 0) return;

  const direction = { x: Math.cos(flash.angle), y: Math.sin(flash.angle) };
  const perpendicular = { x: -direction.y, y: direction.x };
  const length = GAME_VISUAL_CONFIG.effects.muzzleFlashLength * intensity;
  const points = [
    { x: flash.x + direction.x * 2, y: flash.y + direction.y * 2 },
    {
      x: flash.x + direction.x * length + perpendicular.x * length * 0.32,
      y: flash.y + direction.y * length + perpendicular.y * length * 0.32,
    },
    {
      x: flash.x + direction.x * length * 0.74,
      y: flash.y + direction.y * length * 0.74,
    },
    {
      x: flash.x + direction.x * length - perpendicular.x * length * 0.32,
      y: flash.y + direction.y * length - perpendicular.y * length * 0.32,
    },
  ];

  context.save();
  try {
    context.globalAlpha = intensity;
    drawPolygon(context, points, {
      fill: GAME_PALETTE.combat.muzzleFlash,
      stroke: GAME_PALETTE.combat.muzzleFlashOutline,
      lineWidth: 1,
    });
  } finally {
    context.restore();
  }
}

export function drawImpactEffect(
  context: CanvasRenderingContext2D,
  effect: ImpactVisualState,
): void {
  const progress = clampVisualValue(effect.progress);
  const color = effect.color ?? (effect.critical
    ? GAME_PALETTE.combat.critical
    : GAME_PALETTE.combat.impact);
  const baseRadius = effect.radius ?? GAME_VISUAL_CONFIG.effects.impactRingRadius;
  const radius = 3 + progress * baseRadius;
  const particleCount = effect.kind === 'death'
    ? GAME_VISUAL_CONFIG.effects.impactParticleCount + 5
    : GAME_VISUAL_CONFIG.effects.impactParticleCount;
  const ringWidth = effect.kind === 'bomb' ? 3 : effect.kind === 'death' ? 2.5 : 1.5;

  context.save();
  try {
    context.globalAlpha = 1 - progress;
    drawRing(context, effect.x, effect.y, radius, color, ringWidth);
    for (let particle = 0; particle < particleCount; particle += 1) {
      const angle = (particle * Math.PI * 2) / particleCount;
      const innerRadius = effect.kind === 'death' ? radius * 0.25 : radius * 0.62;
      const outerRadius = innerRadius + progress * (
        effect.kind === 'bomb' ? 18 : effect.kind === 'death' ? 16 : 8
      );
      drawLine(
        context,
        {
          x: effect.x + Math.cos(angle) * innerRadius,
          y: effect.y + Math.sin(angle) * innerRadius,
        },
        {
          x: effect.x + Math.cos(angle) * outerRadius,
          y: effect.y + Math.sin(angle) * outerRadius,
        },
        color,
        1.5,
      );
    }
  } finally {
    context.restore();
  }
}

export function drawCollectionBurst(
  context: CanvasRenderingContext2D,
  burst: CollectionBurstVisualState,
): void {
  const progress = clampVisualValue(burst.progress);
  const radius = progress * GAME_VISUAL_CONFIG.effects.collectionBurstLength;

  context.save();
  try {
    context.globalAlpha = 1 - progress;
    drawStarburst(
      context,
      burst.x,
      burst.y,
      Math.max(1, radius),
      Math.max(0.5, radius * 0.48),
      8,
      { stroke: burst.color, lineWidth: 2 },
      Math.PI / 8,
    );
    drawCircle(context, burst.x, burst.y, Math.max(0.5, 3 * (1 - progress)), {
      fill: burst.color,
    });
  } finally {
    context.restore();
  }
}

export function drawDamageNumber(
  context: CanvasRenderingContext2D,
  damage: DamageNumberVisualState,
): void {
  const progress = clampVisualValue(damage.progress);
  context.save();
  try {
    context.globalAlpha = 1 - progress;
    context.fillStyle = damage.critical
      ? GAME_PALETTE.combat.critical
      : GAME_PALETTE.combat.damageText;
    context.font = '600 12px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(
      `${Math.max(0, Math.round(damage.amount))}`,
      damage.x,
      damage.y - progress * 18,
    );
  } finally {
    context.restore();
  }
}
