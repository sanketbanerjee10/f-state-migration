import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import type { WorldPoint } from './EntityRenderer';
import { drawCircle, drawLine, drawRing } from './ShapeLibrary';

export type ProjectileVisualType =
  | 'standard'
  | 'heavy'
  | 'critical'
  | 'turret'
  | 'spitter'
  | 'acid';

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
        : type === 'turret'
          ? entity.projectileRadius * 0.85
          : type === 'spitter'
            ? 5
            : type === 'acid'
              ? 6
              : entity.projectileRadius
  );
  const trailLength = type === 'heavy'
    ? 16
    : type === 'critical'
      ? 13
      : type === 'turret'
        ? 14
        : type === 'spitter'
          ? 14
          : type === 'acid'
            ? 14
            : 10;
  const color = type === 'heavy'
    ? GAME_PALETTE.combat.heavyProjectile
    : type === 'critical'
      ? GAME_PALETTE.combat.critical
      : type === 'turret'
        ? GAME_PALETTE.combat.turretProjectile
        : type === 'spitter'
          ? GAME_PALETTE.combat.spitterProjectile
          : type === 'acid'
            ? GAME_PALETTE.enemies.acidProjectile
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
      : type === 'turret'
        ? GAME_PALETTE.combat.turretProjectileTrail
        : type === 'spitter'
          ? GAME_PALETTE.combat.spitterProjectileTrail
          : type === 'acid'
            ? GAME_PALETTE.enemies.acidProjectileTrail
            : GAME_PALETTE.combat.projectileTrail,
    type === 'heavy' || type === 'turret' || type === 'spitter' || type === 'acid' ? 4 : 2,
  );
  drawCircle(context, projectile.x, projectile.y, radius, {
    fill: color,
    stroke: type === 'turret'
      ? GAME_PALETTE.combat.turretProjectile
      : type === 'spitter'
        ? GAME_PALETTE.combat.spitterProjectileOutline
        : type === 'acid'
          ? GAME_PALETTE.enemies.acidProjectileOutline
          : GAME_PALETTE.combat.projectileOutline,
    lineWidth: 1,
  });

  if (type === 'critical') {
    drawRing(context, projectile.x, projectile.y, radius + 3, color, 1.5);
  }
}
