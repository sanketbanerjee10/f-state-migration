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
  const variant = appearance.variant ?? 'walker';

  withRotation(context, face.x, face.y, face.rotation ?? 0, () => {
    const eyeRadius = radius * (variant === 'runner' ? 0.11 : 0.13);
    const eyeY = face.y - radius * 0.08;
    const leftEyeX = face.x - radius * 0.3;
    const rightEyeX = face.x + radius * 0.3;
    const eyeFill = '#FFF3A6';

    const eyeStyle = { fill: eyeFill, stroke: appearance.outlineColor, lineWidth: 1.7 };
    drawCircle(context, leftEyeX, eyeY, eyeRadius, eyeStyle);
    drawCircle(context, rightEyeX, eyeY, eyeRadius, eyeStyle);
    drawCircle(context, leftEyeX, eyeY, eyeRadius * 0.4, { fill: appearance.outlineColor });
    drawCircle(context, rightEyeX, eyeY, eyeRadius * 0.4, { fill: appearance.outlineColor });

    if (appearance.eyeStyle === 'angry') {
      drawLine(
        context,
        { x: leftEyeX - radius * 0.18, y: eyeY - radius * 0.14 },
        { x: leftEyeX + radius * 0.12, y: eyeY - radius * 0.22 },
        appearance.outlineColor,
        2,
      );
      drawLine(
        context,
        { x: rightEyeX - radius * 0.12, y: eyeY - radius * 0.22 },
        { x: rightEyeX + radius * 0.18, y: eyeY - radius * 0.14 },
        appearance.outlineColor,
        2,
      );
    }

    if (appearance.mouthStyle === 'closed') {
      drawLine(
        context,
        { x: face.x - radius * 0.24, y: face.y + radius * 0.26 },
        { x: face.x + radius * 0.24, y: face.y + radius * 0.26 },
        appearance.outlineColor,
        2,
      );
    } else if (appearance.mouthStyle === 'open') {
      context.save();
      context.lineCap = 'round';
      context.strokeStyle = appearance.outlineColor;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(face.x, face.y + radius * 0.26, radius * 0.22, 0.2, Math.PI - 0.2);
      context.stroke();
      context.restore();
    } else {
      drawLine(
        context,
        { x: face.x - radius * 0.22, y: face.y + radius * 0.18 },
        { x: face.x - radius * 0.12, y: face.y + radius * 0.42 },
        appearance.outlineColor,
        2,
      );
      drawLine(
        context,
        { x: face.x + radius * 0.22, y: face.y + radius * 0.18 },
        { x: face.x + radius * 0.12, y: face.y + radius * 0.42 },
        appearance.outlineColor,
        2,
      );
    }
  });
}

export const drawEnemyFace = drawFace;
