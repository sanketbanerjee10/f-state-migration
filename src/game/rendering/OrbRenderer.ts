import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawRing } from './ShapeLibrary';
import { drawOrbSymbol } from './OrbSymbols';
import type { GameItemType, OrbRarity } from '../core/GameState';

export const INITIAL_ORB_TYPES = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
] as const;

export type OrbVisualType = GameItemType;

export interface OrbVisualState extends WorldPoint {
  readonly type: OrbVisualType;
  readonly remainingFraction: number;
  readonly rarity?: OrbRarity;
  readonly radius?: number;
  readonly pulseOffset?: number;
}

interface OrbStyle {
  readonly color: string;
  readonly glowColor: string;
  readonly rimColor: string;
  readonly symbolColor: string;
  readonly symbolScale: number;
  readonly outlineColor?: string;
  readonly accentColor?: string;
}

const ORB_STYLE: Readonly<Record<OrbVisualType, OrbStyle>> = {
  health: {
    color: GAME_PALETTE.orbs.health,
    glowColor: GAME_PALETTE.orbs.healthGlow,
    rimColor: GAME_PALETTE.orbs.healthRim,
    symbolColor: GAME_PALETTE.orbs.healthSymbol,
    symbolScale: 0.82,
  },
  damage: {
    color: GAME_PALETTE.orbs.damage,
    glowColor: GAME_PALETTE.orbs.damageGlow,
    rimColor: GAME_PALETTE.orbs.damageRim,
    symbolColor: GAME_PALETTE.orbs.damageSymbol,
    symbolScale: 0.62,
  },
  rapidFire: {
    color: GAME_PALETTE.orbs.rapidFire,
    glowColor: GAME_PALETTE.orbs.rapidFireGlow,
    rimColor: GAME_PALETTE.orbs.rapidFireRim,
    symbolColor: GAME_PALETTE.orbs.rapidFireSymbol,
    symbolScale: 0.65,
  },
  shield: {
    color: GAME_PALETTE.orbs.shield,
    glowColor: GAME_PALETTE.orbs.shieldGlow,
    rimColor: GAME_PALETTE.orbs.shieldRim,
    symbolColor: GAME_PALETTE.orbs.shieldSymbol,
    symbolScale: 0.68,
  },
  bomb: {
    color: GAME_PALETTE.orbs.bomb,
    glowColor: GAME_PALETTE.orbs.bombGlow,
    rimColor: GAME_PALETTE.orbs.bombRim,
    symbolColor: GAME_PALETTE.orbs.bombSymbol,
    symbolScale: 0.6,
  },
  magnet: {
    color: GAME_PALETTE.orbs.magnet,
    glowColor: GAME_PALETTE.orbs.magnetGlow,
    rimColor: GAME_PALETTE.orbs.magnetRim,
    symbolColor: GAME_PALETTE.orbs.magnetSymbol,
    symbolScale: 0.7,
    accentColor: GAME_PALETTE.orbs.magnetAccent,
  },
  turret: {
    color: GAME_PALETTE.orbs.turret,
    glowColor: GAME_PALETTE.orbs.turretGlow,
    rimColor: GAME_PALETTE.orbs.turretRim,
    symbolColor: GAME_PALETTE.orbs.turretSymbol,
    symbolScale: 0.83,
    outlineColor: GAME_PALETTE.orbs.turretOutline,
  },
  cursed: {
    color: GAME_PALETTE.orbs.cursed,
    glowColor: GAME_PALETTE.orbs.cursedGlow,
    rimColor: GAME_PALETTE.orbs.cursedRim,
    symbolColor: GAME_PALETTE.orbs.cursedSymbol,
    symbolScale: 0.67,
    outlineColor: GAME_PALETTE.orbs.cursedOutline,
  },
  rareGold: {
    color: GAME_PALETTE.orbs.rareGold,
    glowColor: GAME_PALETTE.orbs.rareGoldGlow,
    rimColor: GAME_PALETTE.orbs.rareGoldRim,
    symbolColor: GAME_PALETTE.orbs.rareGoldSymbol,
    symbolScale: 0.84,
  },
};

const RARITY_COLORS: Record<OrbRarity, string> = {
  common: GAME_PALETTE.orbs.outline,
  uncommon: '#82b6b3',
  rare: '#c084fc',
  special: GAME_PALETTE.orbs.rareGold,
};

export function drawOrb(
  context: CanvasRenderingContext2D,
  orb: OrbVisualState,
  elapsedSeconds: number,
): void {
  const radius = orb.radius ?? GAME_VISUAL_CONFIG.entity.orbRadius;
  const shellRadius = radius * 1.2;
  const style = ORB_STYLE[orb.type];
  const rarityColor = RARITY_COLORS[orb.rarity ?? 'common'];
  const life = clampVisualValue(orb.remainingFraction);
  const pulse = 1 + Math.sin(elapsedSeconds * 3.2 + (orb.pulseOffset ?? 0)) * 0.055;

  context.save();
  try {
    context.globalAlpha = 0.12;
    drawCircle(context, orb.x, orb.y, radius * 2.05 * pulse, {
      fill: style.glowColor,
    });
    context.globalAlpha = 0.24;
    drawCircle(context, orb.x, orb.y, shellRadius * pulse, {
      fill: style.glowColor,
    });
  } finally {
    context.restore();
  }

  drawCircle(context, orb.x, orb.y, shellRadius * 0.92 * pulse, {
    fill: style.color,
    stroke: style.rimColor,
    lineWidth: Math.max(1.5, shellRadius * 0.13),
  });

  if ((orb.rarity ?? 'common') !== 'common') {
    drawRing(
      context,
      orb.x,
      orb.y,
      shellRadius + 2.5,
      rarityColor,
      (orb.rarity ?? 'common') === 'special' ? 2.5 : 1.5,
    );
  }
  context.save();
  try {
    context.globalAlpha = 0.65;
    drawCircle(context, orb.x - shellRadius * 0.3, orb.y - shellRadius * 0.34, shellRadius * 0.13, {
      fill: GAME_PALETTE.orbs.highlight,
    });
  } finally {
    context.restore();
  }
  drawOrbSymbol(
    context,
    orb.type,
    orb.x,
    orb.y,
    shellRadius * style.symbolScale,
    style.symbolColor,
    style.outlineColor ?? GAME_PALETTE.orbs.symbolOutline,
    style.accentColor ?? style.rimColor,
  );

  if (life > 0) {
    drawRing(
      context,
      orb.x,
      orb.y,
      shellRadius + 4,
      rarityColor,
      1.5,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * life,
    );
  }
}
