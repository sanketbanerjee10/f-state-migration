import { drawCircle } from '../ShapeLibrary';
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
  const variant = appearance.variant ?? 'walker';
  const headWidth = radius * (variant === 'screamer' ? 0.84 : variant === 'bloater' ? 0.72 : 0.9);
  const headHeight = radius * (variant === 'screamer' ? 1.12 : variant === 'bloater' ? 0.9 : 0.95);

  withRotation(context, head.x, head.y, head.rotation ?? 0, () => {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.fillStyle = appearance.bodyColor;
    context.strokeStyle = appearance.outlineColor;
    context.lineWidth = 2.2;

    context.beginPath();
    context.ellipse(head.x, head.y, headWidth, headHeight, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.beginPath();
    context.ellipse(head.x - headWidth * 0.22, head.y - headHeight * 0.2, headWidth * 0.36, headHeight * 0.24, 0, 0, Math.PI * 2);
    context.fill();

    if (variant === 'armoured') {
      drawCircle(context, head.x, head.y + headHeight * 0.12, headHeight * 0.2, {
        fill: '#C5EDFF',
        stroke: appearance.outlineColor,
        lineWidth: 2,
      });
    }

    context.restore();
  });
}

export const drawEnemyHead = drawHead;
