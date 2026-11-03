import { drawCircle, drawLine } from '../ShapeLibrary';
import {
  DEFAULT_ENEMY_APPEARANCE,
  type EnemyAppearance,
} from './EnemyAppearance';

export interface EnemyFaceState {
  x: number;
  y: number;
  radius?: number;
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

export function drawFace(
  context: CanvasRenderingContext2D,
  face: EnemyFaceState,
  appearance: EnemyAppearance = DEFAULT_ENEMY_APPEARANCE,
): void {
  const radius = Math.max(6, face.radius ?? 15) * (appearance.headScale ?? 1);

  withRotation(context, face.x, face.y, face.rotation ?? 0, () => {
    const eyeRadius = radius * 0.12;
    const leftEye = { x: face.x - radius * 0.3, y: face.y - radius * 0.1 };
    const rightEye = { x: face.x + radius * 0.3, y: face.y - radius * 0.1 };

    if (appearance.eyeStyle === 'glowing') {
      drawCircle(context, leftEye.x, leftEye.y, eyeRadius * 1.4, {
        fill: '#f9fafb',
        stroke: appearance.outlineColor,
        lineWidth: 1.5,
      });
      drawCircle(context, rightEye.x, rightEye.y, eyeRadius * 1.4, {
        fill: '#f9fafb',
        stroke: appearance.outlineColor,
        lineWidth: 1.5,
      });
    } else {
      drawCircle(context, leftEye.x, leftEye.y, eyeRadius, {
        fill: appearance.eyeStyle === 'angry' ? '#fef3c7' : '#f8fafc',
        stroke: appearance.outlineColor,
        lineWidth: 1,
      });
      drawCircle(context, rightEye.x, rightEye.y, eyeRadius, {
        fill: appearance.eyeStyle === 'angry' ? '#fef3c7' : '#f8fafc',
        stroke: appearance.outlineColor,
        lineWidth: 1,
      });
    }

    if (appearance.mouthStyle === 'closed') {
      drawLine(
        context,
        { x: face.x - radius * 0.28, y: face.y + radius * 0.4 },
        { x: face.x + radius * 0.28, y: face.y + radius * 0.4 },
        appearance.outlineColor,
        2,
      );
    } else if (appearance.mouthStyle === 'open') {
      drawCircle(context, face.x, face.y + radius * 0.5, radius * 0.2, {
        fill: appearance.outlineColor,
      });
    } else {
      const fangLength = radius * 0.32;
      drawLine(
        context,
        { x: face.x - radius * 0.22, y: face.y + radius * 0.2 },
        { x: face.x - radius * 0.14, y: face.y + fangLength },
        appearance.outlineColor,
        2,
      );
      drawLine(
        context,
        { x: face.x + radius * 0.22, y: face.y + radius * 0.2 },
        { x: face.x + radius * 0.14, y: face.y + fangLength },
        appearance.outlineColor,
        2,
      );
    }
  });
}

export const drawEnemyFace = drawFace;
