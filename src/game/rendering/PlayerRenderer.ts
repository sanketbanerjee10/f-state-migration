import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawRing } from './ShapeLibrary';

export interface PlayerVisualState extends WorldPoint {
  readonly aimAngle: number;
  readonly movementFactor?: number;
  readonly hitFlash?: number;
  readonly shieldStrength?: number;
}

export function drawPlayer(
  context: CanvasRenderingContext2D,
  player: PlayerVisualState,
  elapsedSeconds: number,
): void {
  const { entity } = GAME_VISUAL_CONFIG;
  const { player: colors } = GAME_PALETTE;
  const movement = clampVisualValue(player.movementFactor ?? 0);
  const y = player.y + Math.sin(elapsedSeconds * 8) * movement * 1.2;
  const aimX = Math.cos(player.aimAngle);
  const aimY = Math.sin(player.aimAngle);
  const radius = entity.playerRadius;
  const barrelStart = radius * 0.4;
  const barrelEnd = radius + entity.aimMarkerLength * 0.58;

  drawLine(
    context,
    { x: player.x + aimX * barrelStart, y: y + aimY * barrelStart },
    { x: player.x + aimX * barrelEnd, y: y + aimY * barrelEnd },
    colors.barrel,
    7,
  );
  drawLine(
    context,
    { x: player.x + aimX * (barrelEnd - 3), y: y + aimY * (barrelEnd - 3) },
    { x: player.x + aimX * (barrelEnd + 2), y: y + aimY * (barrelEnd + 2) },
    colors.highlight,
    2,
  );

  drawCircle(context, player.x, y, radius * 1.5, { fill: colors.glow });
  drawCircle(context, player.x, y, radius, {
    fill: colors.fill,
    stroke: colors.outline,
    lineWidth: entity.playerOutlineWidth,
  });
  context.save();
  try {
    context.globalAlpha = 0.65;
    drawCircle(
      context,
      player.x - radius * 0.34,
      y - radius * 0.38,
      radius * 0.22,
      { fill: colors.highlight },
    );
  } finally {
    context.restore();
  }

  const hitFlash = clampVisualValue(player.hitFlash ?? 0);
  if (hitFlash > 0) {
    context.save();
    try {
      context.globalAlpha = hitFlash * 0.72;
      drawCircle(context, player.x, y, radius * 0.92, {
        fill: colors.highlight,
      });
    } finally {
      context.restore();
    }
  }

  const shieldStrength = clampVisualValue(player.shieldStrength ?? 0);
  if (shieldStrength > 0) {
    const pulse = 1 + Math.sin(elapsedSeconds * 3) * 0.035;
    context.save();
    try {
      context.globalAlpha = 0.48 + shieldStrength * 0.45;
      drawRing(
        context,
        player.x,
        y,
        (radius + entity.shieldRingOffset) * pulse,
        colors.shield,
        2.5,
      );
      context.globalAlpha = 0.34;
      drawRing(
        context,
        player.x,
        y,
        radius + entity.shieldRingOffset - 4,
        colors.highlight,
        1,
      );
    } finally {
      context.restore();
    }
  }
}
