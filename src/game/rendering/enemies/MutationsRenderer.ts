import { drawLine } from '../ShapeLibrary';
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

  withRotation(context, mutation.x, mutation.y, 0, () => {
    if (appearance.hornStyle !== 'none') {
      const hornLength = radius * (appearance.hornStyle === 'curved' ? 0.9 : 0.7);
      const offset = radius * 0.5;

      if (appearance.hornStyle === 'curved') {
        context.beginPath();
        context.moveTo(mutation.x - offset, mutation.y - radius * 1.05);
        context.quadraticCurveTo(
          mutation.x - offset - hornLength * 0.4,
          mutation.y - radius * 1.25,
          mutation.x - offset - hornLength,
          mutation.y - radius * 1.45,
        );
        context.strokeStyle = appearance.outlineColor;
        context.lineWidth = 2;
        context.stroke();

        context.beginPath();
        context.moveTo(mutation.x + offset, mutation.y - radius * 1.05);
        context.quadraticCurveTo(
          mutation.x + offset + hornLength * 0.4,
          mutation.y - radius * 1.25,
          mutation.x + offset + hornLength,
          mutation.y - radius * 1.45,
        );
        context.strokeStyle = appearance.outlineColor;
        context.lineWidth = 2;
        context.stroke();
      } else {
        drawLine(
          context,
          { x: mutation.x - offset, y: mutation.y - radius * 0.9 },
          { x: mutation.x - offset - hornLength, y: mutation.y - radius * 1.25 },
          appearance.outlineColor,
          2,
        );
        drawLine(
          context,
          { x: mutation.x + offset, y: mutation.y - radius * 0.9 },
          { x: mutation.x + offset + hornLength, y: mutation.y - radius * 1.25 },
          appearance.outlineColor,
          2,
        );
      }
    }

    if (appearance.mutationLevel > 0) {
      const spikeCount = Math.min(4, 2 + appearance.mutationLevel);
      for (let index = 0; index < spikeCount; index += 1) {
        const offset = (index - (spikeCount - 1) / 2) * (radius * 0.28);
        drawLine(
          context,
          { x: mutation.x + offset, y: mutation.y + radius * 0.4 },
          { x: mutation.x + offset, y: mutation.y + radius * 0.9 + index * 0.7 },
          appearance.outlineColor,
          2,
        );
      }
    }

    if (appearance.armorLevel > 0 || appearance.clawStyle) {
      const clawLength = radius * 0.44;
      drawLine(
        context,
        { x: mutation.x - radius * 0.85, y: mutation.y + radius * 0.75 },
        { x: mutation.x - radius * 1.25, y: mutation.y + radius * 1.2 },
        appearance.limbColor,
        2,
      );
      drawLine(
        context,
        { x: mutation.x + radius * 0.85, y: mutation.y + radius * 0.75 },
        { x: mutation.x + radius * 1.25, y: mutation.y + radius * 1.2 },
        appearance.limbColor,
        2,
      );
      drawLine(
        context,
        { x: mutation.x - radius * 1.25, y: mutation.y + radius * 1.2 },
        { x: mutation.x - radius * 1.45, y: mutation.y + radius * 1.4 + clawLength },
        appearance.outlineColor,
        2,
      );
      drawLine(
        context,
        { x: mutation.x + radius * 1.25, y: mutation.y + radius * 1.2 },
        { x: mutation.x + radius * 1.45, y: mutation.y + radius * 1.4 + clawLength },
        appearance.outlineColor,
        2,
      );
    }
  });
}

export const drawEnemyMutations = drawMutations;
