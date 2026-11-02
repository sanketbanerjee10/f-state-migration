import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawPolygon, drawRect } from './ShapeLibrary';

export type ZombieVisualType = 'walker' | 'runner';

export interface ZombieVisualState extends WorldPoint {
  readonly type: ZombieVisualType;
  readonly facingAngle?: number;
  readonly movementFactor?: number;
  readonly hitFlash?: number;
  readonly healthFraction?: number;
}

function runnerPoints(
  x: number,
  y: number,
  radius: number,
  angle: number,
): readonly { x: number; y: number }[] {
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const perpendicular = { x: -direction.y, y: direction.x };
  const point = (forward: number, side: number) => ({
    x: x + direction.x * forward + perpendicular.x * side,
    y: y + direction.y * forward + perpendicular.y * side,
  });

  return [
    point(radius * 1.45, 0),
    point(-radius * 0.82, -radius * 0.9),
    point(-radius * 0.48, 0),
    point(-radius * 0.82, radius * 0.9),
  ];
}

function drawWalker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
): void {
  const { enemies } = GAME_PALETTE;
  const lineWidth = GAME_VISUAL_CONFIG.entity.enemyOutlineWidth;
  drawLine(
    context,
    { x: x - radius * 0.58, y: y + radius * 0.35 },
    { x: x - radius * 1.08, y: y + radius * 0.76 },
    enemies.limb,
    lineWidth + 1,
  );
  drawLine(
    context,
    { x: x + radius * 0.58, y: y + radius * 0.35 },
    { x: x + radius * 1.08, y: y + radius * 0.76 },
    enemies.limb,
    lineWidth + 1,
  );
  drawCircle(context, x, y, radius, {
    fill,
    stroke: enemies.outline,
    lineWidth,
  });
  drawCircle(context, x - radius * 0.32, y - radius * 0.12, radius * 0.12, {
    fill: enemies.eye,
  });
  drawCircle(context, x + radius * 0.32, y - radius * 0.12, radius * 0.12, {
    fill: enemies.eye,
  });
  drawLine(
    context,
    { x: x - radius * 0.2, y: y + radius * 0.38 },
    { x: x + radius * 0.2, y: y + radius * 0.38 },
    enemies.outline,
    1.5,
  );
}

function drawRunner(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  fill: string,
): void {
  const { enemies } = GAME_PALETTE;
  const points = runnerPoints(x, y, radius, angle);
  drawPolygon(context, points, {
    fill,
    stroke: enemies.outline,
    lineWidth: GAME_VISUAL_CONFIG.entity.enemyOutlineWidth,
  });
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const perpendicular = { x: -direction.y, y: direction.x };
  const eye = {
    x: x + direction.x * radius * 0.48 - perpendicular.x * radius * 0.18,
    y: y + direction.y * radius * 0.48 - perpendicular.y * radius * 0.18,
  };
  drawCircle(context, eye.x, eye.y, radius * 0.13, { fill: enemies.eye });
}

export function drawZombie(
  context: CanvasRenderingContext2D,
  zombie: ZombieVisualState,
  elapsedSeconds: number,
): void {
  const { entity } = GAME_VISUAL_CONFIG;
  const { enemies } = GAME_PALETTE;
  const movement = clampVisualValue(zombie.movementFactor ?? 0.35);
  const y = zombie.y + Math.sin(elapsedSeconds * 7 + zombie.x * 0.03) * movement;
  const radius = zombie.type === 'walker' ? entity.walkerRadius : entity.runnerRadius;
  const baseColor = enemies[zombie.type];
  const hitFlash = clampVisualValue(zombie.hitFlash ?? 0);
  context.save();
  try {
    if (hitFlash > 0) {
      context.globalAlpha = hitFlash * 0.88;
    }
    if (zombie.type === 'walker') {
      drawWalker(
        context,
        zombie.x,
        y,
        radius,
        hitFlash > 0 ? enemies.eye : baseColor,
      );
    } else {
      drawRunner(
        context,
        zombie.x,
        y,
        radius,
        zombie.facingAngle ?? 0,
        hitFlash > 0 ? enemies.eye : baseColor,
      );
    }
  } finally {
    context.restore();
  }

  if (zombie.healthFraction !== undefined) {
    const health = clampVisualValue(zombie.healthFraction);
    if (health < 1) {
      const barWidth = radius * 2;
      const barY = y - radius - 8;
      drawRect(context, zombie.x - radius, barY, barWidth, 4, {
        fill: enemies.healthTrack,
      });
      if (health > 0) {
        drawRect(context, zombie.x - radius, barY, barWidth * health, 4, {
          fill: GAME_PALETTE.combat.damage,
        });
      }
    }
  }
}
