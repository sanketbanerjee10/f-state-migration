import { drawCircle, drawLine } from '../ShapeLibrary';
import {
  DEFAULT_ENEMY_APPEARANCE,
  type EnemyAppearance,
} from './EnemyAppearance';

export interface EnemyMutationState {
  x: number;
  y: number;
  radius?: number;
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

export function drawMutations(
  context: CanvasRenderingContext2D,
  mutation: EnemyMutationState,
  appearance: EnemyAppearance = DEFAULT_ENEMY_APPEARANCE,
): void {
  const radius = Math.max(6, mutation.radius ?? 18);
  const variant = appearance.variant ?? 'walker';

  withRotation(context, mutation.x, mutation.y, 0, () => {
    if (variant === 'spitter') {
      for (const offset of [-1, 0, 1]) {
        drawCircle(context, mutation.x + offset * radius * 0.58, mutation.y - radius * 0.82, radius * 0.2, {
          fill: '#cbe29a',
          stroke: appearance.outlineColor,
          lineWidth: 2,
        });
      }
      drawCircle(context, mutation.x + radius * 0.2, mutation.y + radius * 0.1, radius * 0.16, {
        fill: '#7cc76a',
        stroke: appearance.outlineColor,
        lineWidth: 1.5,
      });
    }

    if (variant === 'armoured') {
      context.save();
      context.lineCap = 'round';
      context.strokeStyle = appearance.outlineColor;
      context.lineWidth = 2.2;
      context.beginPath();
      context.arc(mutation.x, mutation.y - radius * 0.28, radius * 0.78, Math.PI * 0.7, Math.PI * 1.3);
      context.stroke();
      context.restore();
    }

    if (variant === 'splitter') {
      for (const offset of [-1.2, -0.4, 0.4, 1.2]) {
        drawLine(
          context,
          { x: mutation.x + offset * radius * 0.52, y: mutation.y - radius * 0.7 },
          { x: mutation.x + offset * radius * 0.52, y: mutation.y - radius * 1.32 },
          appearance.outlineColor,
          2,
        );
      }
    }

    if (appearance.hornStyle !== 'none') {
      const offset = radius * 0.48;
      const hornLength = radius * (appearance.hornStyle === 'curved' ? 0.8 : 0.68);
      if (appearance.hornStyle === 'curved') {
        context.beginPath();
        context.moveTo(mutation.x - offset, mutation.y - radius * 0.8);
        context.quadraticCurveTo(
          mutation.x - offset - hornLength * 0.45,
          mutation.y - radius * 1.2,
          mutation.x - offset - hornLength,
          mutation.y - radius * 1.5,
        );
        context.strokeStyle = appearance.outlineColor;
        context.lineWidth = 2;
        context.stroke();

        context.beginPath();
        context.moveTo(mutation.x + offset, mutation.y - radius * 0.8);
        context.quadraticCurveTo(
          mutation.x + offset + hornLength * 0.45,
          mutation.y - radius * 1.2,
          mutation.x + offset + hornLength,
          mutation.y - radius * 1.5,
        );
        context.strokeStyle = appearance.outlineColor;
        context.lineWidth = 2;
        context.stroke();
      } else {
        drawLine(
          context,
          { x: mutation.x - offset, y: mutation.y - radius * 0.78 },
          { x: mutation.x - offset - hornLength, y: mutation.y - radius * 1.38 },
          appearance.outlineColor,
          2,
        );
        drawLine(
          context,
          { x: mutation.x + offset, y: mutation.y - radius * 0.78 },
          { x: mutation.x + offset + hornLength, y: mutation.y - radius * 1.38 },
          appearance.outlineColor,
          2,
        );
      }
    }

    if (appearance.mutationLevel > 0 && variant !== 'splitter') {
      const spikeCount = Math.min(4, 2 + appearance.mutationLevel);
      for (let index = 0; index < spikeCount; index += 1) {
        const offset = (index - (spikeCount - 1) / 2) * (radius * 0.28);
        drawLine(
          context,
          { x: mutation.x + offset, y: mutation.y + radius * 0.2 },
          { x: mutation.x + offset, y: mutation.y + radius * 0.82 + index * 0.3 },
          appearance.outlineColor,
          2,
        );
      }
    }

    if (appearance.armorLevel > 0) {
      drawLine(
        context,
        { x: mutation.x - radius * 0.8, y: mutation.y + radius * 0.5 },
        { x: mutation.x - radius * 1.2, y: mutation.y + radius * 0.9 },
        appearance.outlineColor,
        2,
      );
      drawLine(
        context,
        { x: mutation.x + radius * 0.8, y: mutation.y + radius * 0.5 },
        { x: mutation.x + radius * 1.2, y: mutation.y + radius * 0.9 },
        appearance.outlineColor,
        2,
      );
    }
  });
}

export const drawEnemyMutations = drawMutations;
