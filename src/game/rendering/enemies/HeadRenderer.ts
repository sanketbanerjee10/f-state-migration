import { drawCircle, drawLine, drawPolygon } from '../ShapeLibrary';
import {
  DEFAULT_ENEMY_APPEARANCE,
  type EnemyAppearance,
} from './EnemyAppearance';

export interface EnemyHeadState {
  x: number;
  y: number;
  radius?: number;
  rotation?: number;
  bob?: number;
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

export function drawHead(
  context: CanvasRenderingContext2D,
  head: EnemyHeadState,
  appearance: EnemyAppearance = DEFAULT_ENEMY_APPEARANCE,
): void {
  const radius = Math.max(6, head.radius ?? 16) * (appearance.headScale ?? 1);

  withRotation(context, head.x, head.y, head.rotation ?? 0, () => {
    const skull = [
      { x: head.x, y: head.y - radius * 1.2 },
      { x: head.x + radius * 1.08, y: head.y - radius * 0.18 },
      { x: head.x + radius * 0.78, y: head.y + radius * 1.08 },
      { x: head.x - radius * 0.78, y: head.y + radius * 1.08 },
      { x: head.x - radius * 1.08, y: head.y - radius * 0.18 },
    ];

    drawPolygon(context, skull, {
      fill: appearance.bodyColor,
      stroke: appearance.outlineColor,
      lineWidth: 2,
    });

    drawCircle(context, head.x, head.y + radius * 0.1, radius * 0.76, {
      fill: appearance.bodyColor,
      stroke: appearance.outlineColor,
      lineWidth: 2,
    });

    drawLine(
      context,
      { x: head.x - radius * 0.14, y: head.y + radius * 1.12 },
      { x: head.x + radius * 0.14, y: head.y + radius * 1.12 },
      appearance.outlineColor,
      2,
    );
  });
}

export const drawEnemyHead = drawHead;
