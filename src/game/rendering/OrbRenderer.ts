import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawRing, drawSymbol } from './ShapeLibrary';

export const INITIAL_ORB_TYPES = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
] as const;

export type OrbVisualType = (typeof INITIAL_ORB_TYPES)[number];

export interface OrbVisualState extends WorldPoint {
  readonly type: OrbVisualType;
  readonly remainingFraction: number;
  readonly radius?: number;
  readonly pulseOffset?: number;
}

const ORB_STYLE: Record<OrbVisualType, {
  color: string;
  symbol: 'plus' | 'crosshair' | 'speed' | 'shield' | 'starburst';
}> = {
  health: { color: GAME_PALETTE.orbs.health, symbol: 'plus' },
  damage: { color: GAME_PALETTE.orbs.damage, symbol: 'crosshair' },
  rapidFire: { color: GAME_PALETTE.orbs.rapidFire, symbol: 'speed' },
  shield: { color: GAME_PALETTE.orbs.shield, symbol: 'shield' },
  bomb: { color: GAME_PALETTE.orbs.bomb, symbol: 'starburst' },
};

export function drawOrb(
  context: CanvasRenderingContext2D,
  orb: OrbVisualState,
  elapsedSeconds: number,
): void {
  const radius = orb.radius ?? GAME_VISUAL_CONFIG.entity.orbRadius;
  const style = ORB_STYLE[orb.type];
  const life = clampVisualValue(orb.remainingFraction);
  const pulse = 1 + Math.sin(elapsedSeconds * 3.2 + (orb.pulseOffset ?? 0)) * 0.055;

  context.save();
  try {
    context.globalAlpha = 0.14;
    drawCircle(context, orb.x, orb.y, radius * 1.85 * pulse, {
      fill: style.color,
    });
    context.globalAlpha = 0.28;
    drawCircle(context, orb.x, orb.y, radius * 1.32 * pulse, {
      fill: style.color,
    });
  } finally {
    context.restore();
  }

  drawCircle(context, orb.x, orb.y, radius * pulse, {
    fill: style.color,
    stroke: GAME_PALETTE.orbs.outline,
    lineWidth: GAME_VISUAL_CONFIG.entity.orbOutlineWidth,
  });
  context.save();
  try {
    context.globalAlpha = 0.55;
    drawCircle(context, orb.x - radius * 0.28, orb.y - radius * 0.32, radius * 0.17, {
      fill: GAME_PALETTE.orbs.highlight,
    });
  } finally {
    context.restore();
  }
  drawSymbol(
    context,
    style.symbol,
    orb.x,
    orb.y,
    radius * 0.53,
    GAME_PALETTE.orbs.symbol,
    Math.max(1.5, radius * 0.12),
  );

  if (life > 0) {
    drawRing(
      context,
      orb.x,
      orb.y,
      radius + 4,
      GAME_PALETTE.orbs.outline,
      1.5,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * life,
    );
  }
}
