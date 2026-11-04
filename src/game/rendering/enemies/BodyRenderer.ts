import { drawCircle, drawLine } from '../ShapeLibrary';
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
  const radius = Math.max(8, body.radius ?? 18);
  const torsoScale = body.torsoScale ?? appearance.torsoScale ?? 1;
  const variant = appearance.variant ?? 'walker';
  const bodyWidth = radius * (
    variant === 'brute' ? 1.92
      : variant === 'runner' ? 1.7
        : variant === 'screamer' ? 1.26
          : variant === 'bloater' ? 1.72
            : variant === 'armoured' ? 1.78
              : variant === 'swarm' ? 1.2
                : 1.6
  );
  const bodyHeight = radius * (
    variant === 'brute' ? 1.48
      : variant === 'runner' ? 1.32
        : variant === 'screamer' ? 1.84
          : variant === 'bloater' ? 1.84
            : variant === 'armoured' ? 1.32
              : variant === 'swarm' ? 1.1
                : 1.5
  ) * torsoScale;

  withRotation(context, body.x, body.y, body.rotation ?? 0, () => {
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    const baseY = body.y + (
      variant === 'runner' ? radius * 0.1
        : variant === 'screamer' ? radius * 0.2
          : variant === 'bloater' ? radius * 0.3
            : 0
    );

    context.fillStyle = appearance.bodyColor;
    context.strokeStyle = appearance.outlineColor;
    context.lineWidth = 2.2;

    const shadowX = body.x;
    const shadowY = baseY + bodyHeight * 0.9;
    context.fillStyle = 'rgba(5, 15, 18, 0.18)';
    context.beginPath();
    context.ellipse(shadowX, shadowY, bodyWidth * 0.78, radius * 0.24, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = appearance.bodyColor;
    context.beginPath();
    const x = body.x;
    const y = baseY;
    if (variant === 'runner') {
      context.ellipse(x + radius * 0.14, y + radius * 0.08, bodyWidth * 0.76, bodyHeight * 0.7, -0.35, 0, Math.PI * 2);
    } else if (variant === 'brute') {
      context.ellipse(x, y + radius * 0.02, bodyWidth * 0.85, bodyHeight * 0.74, 0, 0, Math.PI * 2);
    } else if (variant === 'bloater') {
      context.ellipse(x, y + radius * 0.12, bodyWidth * 0.72, bodyHeight * 0.9, 0, 0, Math.PI * 2);
      context.ellipse(x, y + radius * 0.18, bodyWidth * 0.62, bodyHeight * 0.55, 0, 0, Math.PI * 2);
    } else if (variant === 'screamer') {
      context.ellipse(x, y + radius * 0.08, bodyWidth * 0.58, bodyHeight * 0.9, 0, 0, Math.PI * 2);
    } else if (variant === 'armoured') {
      context.ellipse(x, y, bodyWidth * 0.72, bodyHeight * 0.78, 0, 0, Math.PI * 2);
    } else if (variant === 'swarm') {
      context.ellipse(x, y, bodyWidth * 0.76, bodyHeight * 0.72, 0, 0, Math.PI * 2);
    } else if (variant === 'splitter') {
      context.ellipse(x, y + radius * 0.04, bodyWidth * 0.72, bodyHeight * 0.8, 0, 0, Math.PI * 2);
    } else {
      context.ellipse(x, y, bodyWidth * 0.8, bodyHeight * 0.82, 0, 0, Math.PI * 2);
    }
    context.fill();
    context.stroke();

    context.fillStyle = 'rgba(255, 255, 255, 0.18)';
    context.beginPath();
    context.ellipse(
      x - bodyWidth * 0.26,
      y - bodyHeight * 0.22,
      bodyWidth * 0.3,
      bodyHeight * 0.2,
      0,
      0,
      Math.PI * 2,
    );
    context.fill();

    if (variant === 'spitter') {
      for (const offset of [-0.9, 0, 0.9]) {
        drawCircle(context, x + offset * radius * 0.82, y - radius * 0.65, radius * 0.24, {
          fill: '#b7c87f',
          stroke: appearance.outlineColor,
          lineWidth: 2,
        });
      }
    }

    if (variant === 'armoured') {
      context.beginPath();
      context.ellipse(x, y - radius * 0.18, bodyWidth * 0.7, bodyHeight * 0.38, 0, 0, Math.PI * 2);
      context.strokeStyle = appearance.outlineColor;
      context.lineWidth = 2.1;
      context.stroke();
    }

    const legInset = variant === 'swarm' ? radius * 0.42 : radius * 0.7;
    const legLength = variant === 'runner' ? radius * 1.35 : variant === 'swarm' ? radius * 0.88 : radius * 1.1;

    drawLine(
      context,
      { x: x - legInset, y: y + bodyHeight * 0.56 },
      { x: x - legInset - radius * 0.45, y: y + bodyHeight * 0.56 + legLength },
      appearance.limbColor,
      variant === 'swarm' ? 2 : 3,
    );
    drawLine(
      context,
      { x: x + legInset, y: y + bodyHeight * 0.56 },
      { x: x + legInset + radius * 0.45, y: y + bodyHeight * 0.56 + legLength },
      appearance.limbColor,
      variant === 'swarm' ? 2 : 3,
    );

    const frontLimbY = y + bodyHeight * 0.3;
    drawLine(
      context,
      { x: x - bodyWidth * 0.2, y: frontLimbY },
      { x: x - bodyWidth * 0.5, y: frontLimbY + radius * 0.8 },
      appearance.limbColor,
      3,
    );
    drawLine(
      context,
      { x: x + bodyWidth * 0.2, y: frontLimbY },
      { x: x + bodyWidth * 0.5, y: frontLimbY + radius * 0.8 },
      appearance.limbColor,
      3,
    );

    context.restore();
  });
}

export const drawEnemyBody = drawBody;
