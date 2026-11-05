import { GAME_PALETTE } from '../GamePalette';
import { drawGroundShadow } from '../EntityRenderer';
import { drawCircle, drawLine } from '../ShapeLibrary';
import { DEFAULT_ENEMY_APPEARANCE, type EnemyAppearance } from './EnemyAppearance';
import { drawBody } from './BodyRenderer';
import { drawFace } from './FaceRenderer';
import { drawHead } from './HeadRenderer';
import { drawMutations } from './MutationsRenderer';

export interface EnemyRenderState {
  x: number;
  y: number;
  radius?: number;
  rotation?: number;
  movementFactor?: number;
  healthFraction?: number;
  hitFlash?: number;
}

export function drawEnemyAnatomy(
  context: CanvasRenderingContext2D,
  enemy: EnemyRenderState,
  elapsedSeconds: number,
  appearance: EnemyAppearance = DEFAULT_ENEMY_APPEARANCE,
): void {
  const radius = Math.max(8, enemy.radius ?? 18);
  const bob = Math.sin(elapsedSeconds * 7 + enemy.x * 0.04) * (enemy.movementFactor ?? 0.15);
  const y = enemy.y + bob;
  const hitFlash = Number.isFinite(enemy.hitFlash ?? 0) ? enemy.hitFlash ?? 0 : 0;

  drawGroundShadow(context, { x: enemy.x, y }, radius * 1.1);

  if (hitFlash > 0) {
    context.save();
    context.globalAlpha = Math.min(1, hitFlash * 0.9);
  }

  drawBody(context, { x: enemy.x, y, radius, movementFactor: enemy.movementFactor, rotation: enemy.rotation }, appearance);
  drawHead(context, { x: enemy.x, y: y - radius * 0.9, radius: radius * 0.78, rotation: enemy.rotation }, appearance);
  drawFace(context, { x: enemy.x, y: y - radius * 0.9, radius: radius * 0.78, rotation: enemy.rotation }, appearance);
  drawMutations(context, { x: enemy.x, y: y - radius * 0.35, radius }, appearance);

  if (hitFlash > 0) {
    context.restore();
  }

  const health = Number.isFinite(enemy.healthFraction ?? 1) ? enemy.healthFraction ?? 1 : 1;
  if (health >= 0 && health < 1) {
    const trackY = y - radius - 8;
    drawLine(context, { x: enemy.x - radius, y: trackY }, { x: enemy.x + radius, y: trackY }, GAME_PALETTE.enemies.healthTrack, 3);
    drawLine(context, { x: enemy.x - radius, y: trackY }, { x: enemy.x - radius + radius * 2 * health, y: trackY }, GAME_PALETTE.enemies.healthFill, 3);
  }

  drawCircle(context, enemy.x, y + radius * 1.1, radius * 0.18, {
    fill: appearance.outlineColor,
  });
}

export const drawEnemy = drawEnemyAnatomy;
export const drawEnemyRenderer = drawEnemyAnatomy;
