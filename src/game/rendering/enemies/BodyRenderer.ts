import { drawCircle, drawLine, drawPolygon } from '../ShapeLibrary';
import {
  DEFAULT_ENEMY_APPEARANCE,
  type EnemyAppearance,
} from './EnemyAppearance';

export interface EnemyBodyState {
  x: number;
  y: number;
  radius?: number;
  torsoScale?: number;
  movementFactor?: number;
  rotation?: number;
}

function withRotation(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  draw: () => void,
): void {
  if (!Number.isFinite(rotation) || rotation === 0 || typeof context.translate !== 'function' || typeof context.rotate !== 'function') {
    draw();
    return;
  }
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.translate(-x, -y);
  try {
    draw();
  } finally {
    context.restore();
  }
}

export function drawBody(
  context: CanvasRenderingContext2D,
  body: EnemyBodyState,
  appearance: EnemyAppearance = DEFAULT_ENEMY_APPEARANCE,
): void {
  const radius = Math.max(6, body.radius ?? 18);
  const torsoScale = body.torsoScale ?? appearance.torsoScale ?? 1;
  const torsoRadius = radius * 0.92 * torsoScale;

  withRotation(context, body.x, body.y, body.rotation ?? 0, () => {
    const torso = [
      { x: body.x, y: body.y - torsoRadius * 0.35 },
      { x: body.x + torsoRadius * 0.92, y: body.y + torsoRadius * 0.8 },
      { x: body.x, y: body.y + torsoRadius * 1.18 },
      { x: body.x - torsoRadius * 0.92, y: body.y + torsoRadius * 0.8 },
    ];

    drawPolygon(context, torso, {
      fill: appearance.bodyColor,
      stroke: appearance.outlineColor,
      lineWidth: 2,
    });

    drawCircle(context, body.x, body.y + torsoRadius * 0.38, radius * 0.64, {
      fill: appearance.bodyColor,
      stroke: appearance.outlineColor,
      lineWidth: 2,
    });

    drawLine(
      context,
      { x: body.x - radius * 0.68, y: body.y + radius * 0.6 },
      { x: body.x - radius * 1.18, y: body.y + radius * 1.2 },
      appearance.limbColor,
      3,
    );
    drawLine(
      context,
      { x: body.x + radius * 0.68, y: body.y + radius * 0.6 },
      { x: body.x + radius * 1.18, y: body.y + radius * 1.2 },
      appearance.limbColor,
      3,
    );

    drawLine(
      context,
      { x: body.x - radius * 0.32, y: body.y + torsoRadius * 1.2 },
      { x: body.x - radius * 0.22, y: body.y + radius * 1.9 },
      appearance.limbColor,
      3,
    );
    drawLine(
      context,
      { x: body.x + radius * 0.32, y: body.y + torsoRadius * 1.2 },
      { x: body.x + radius * 0.22, y: body.y + radius * 1.9 },
      appearance.limbColor,
      3,
    );
  });
}

export const drawEnemyBody = drawBody;
