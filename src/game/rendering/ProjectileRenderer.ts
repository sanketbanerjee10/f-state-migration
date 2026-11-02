import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawRing } from './ShapeLibrary';

export type ProjectileVisualType = 'standard' | 'heavy' | 'critical';

export interface ProjectileVisualState extends WorldPoint {
  readonly directionX: number;
  readonly directionY: number;
  readonly type?: ProjectileVisualType;
  readonly radius?: number;
}

export function drawProjectile(
  context: CanvasRenderingContext2D,
  projectile: ProjectileVisualState,
): void {
  const { entity } = GAME_VISUAL_CONFIG;
  const type = projectile.type ?? 'standard';
  const magnitude = Math.hypot(projectile.directionX, projectile.directionY);
  const directionX = magnitude > 0
    ? projectile.directionX / magnitude
    : 1;
  const directionY = magnitude > 0
    ? projectile.directionY / magnitude
    : 0;
  const radius = projectile.radius ?? (
    type === 'heavy'
      ? entity.heavyProjectileRadius
      : type === 'critical'
        ? entity.criticalProjectileRadius
        : entity.projectileRadius
  );
  const trailLength = type === 'heavy' ? 16 : type === 'critical' ? 13 : 10;
  const color = type === 'heavy'
    ? GAME_PALETTE.combat.heavyProjectile
    : type === 'critical'
      ? GAME_PALETTE.combat.critical
      : GAME_PALETTE.combat.projectile;

  drawLine(
    context,
    {
      x: projectile.x - directionX * trailLength,
      y: projectile.y - directionY * trailLength,
    },
    {
      x: projectile.x + directionX * radius * 0.4,
      y: projectile.y + directionY * radius * 0.4,
    },
    type === 'heavy'
      ? GAME_PALETTE.combat.heavyProjectileTrail
      : GAME_PALETTE.combat.projectileTrail,
    type === 'heavy' ? 4 : 2,
  );
  drawCircle(context, projectile.x, projectile.y, radius, {
    fill: color,
    stroke: GAME_PALETTE.combat.projectileOutline,
    lineWidth: 1,
  });

  if (type === 'critical') {
    drawRing(context, projectile.x, projectile.y, radius + 3, color, 1.5);
  }
}
