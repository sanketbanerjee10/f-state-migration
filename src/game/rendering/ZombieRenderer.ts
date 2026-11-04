import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { clampVisualValue } from './EntityRenderer';
import type { WorldPoint } from './EntityRenderer';
import {
  drawCircle,
  drawLine,
  drawPolygon,
  drawRect,
  drawRing,
} from './ShapeLibrary';
import { drawEnemyAnatomy } from './enemies';
import { getEnemyAppearance, type EnemyType } from './enemies/EnemyAppearance';
import type { ZombieEliteModifier } from '../core/GameState';
import type { BossType } from '../bosses/BossSystem';

export type ZombieVisualType = EnemyType;

export interface ZombieVisualState extends WorldPoint {
  readonly type: ZombieVisualType;
  readonly facingAngle?: number;
  readonly movementFactor?: number;
  readonly hitFlash?: number;
  readonly healthFraction?: number;
  readonly isElite?: boolean;
  readonly eliteModifier?: ZombieEliteModifier;
  readonly shieldFraction?: number;
  readonly eliteExplosionFraction?: number;
  readonly radius?: number;
  readonly isBoss?: boolean;
  readonly bossType?: BossType;
  readonly bossShielded?: boolean;
  readonly bossPhase?: 'pursuit' | 'windup' | 'charge' | 'stunned' | 'recovery';
  readonly bossChargeAngle?: number;
}

function drawEliteDetails(
  context: CanvasRenderingContext2D,
  zombie: ZombieVisualState,
  y: number,
  radius: number,
  elapsedSeconds: number,
): void {
  if (!zombie.isElite) return;

  const gold = GAME_PALETTE.enemies.elite;
  const health = clampVisualValue(zombie.healthFraction ?? 1);
  drawCircle(context, zombie.x, y, radius + 2, {
    stroke: gold,
    lineWidth: 2,
  });
  drawLine(
    context,
    { x: zombie.x - radius * 0.6, y: y - radius * 0.55 },
    { x: zombie.x - radius * 0.9, y: y - radius * 1.25 },
    gold,
    3,
  );
  drawLine(
    context,
    { x: zombie.x + radius * 0.6, y: y - radius * 0.55 },
    { x: zombie.x + radius * 0.9, y: y - radius * 1.25 },
    gold,
    3,
  );
  drawCircle(context, zombie.x, y - radius - 18, 3, { fill: gold });

  const barWidth = radius * 2.4;
  const barHeight = 6;
  const barX = zombie.x - barWidth / 2;
  const barY = y - radius - 12;
  drawRect(context, barX, barY, barWidth, barHeight, {
    fill: GAME_PALETTE.enemies.healthTrack,
    stroke: gold,
    lineWidth: 1,
  });
  if (health > 0) {
    drawRect(context, barX, barY, barWidth * health, barHeight, {
      fill: gold,
    });
  }

  if (zombie.eliteModifier === 'shielded') {
    const shield = clampVisualValue(zombie.shieldFraction ?? 0);
    if (shield > 0) {
      drawRing(context, zombie.x, y, radius + 7, gold, 2 + shield);
    }
  }
  if (zombie.eliteModifier === 'regenerating') {
    drawRing(
      context,
      zombie.x,
      y,
      radius + 5 + Math.sin(elapsedSeconds * 5) * 1.5,
      gold,
      1.5,
      -Math.PI / 2,
      Math.PI * 1.25,
    );
  }
  if (zombie.eliteExplosionFraction !== undefined) {
    context.save();
    try {
      context.globalAlpha = 0.35 + Math.sin(elapsedSeconds * 20) * 0.2;
      drawRing(
        context,
        zombie.x,
        y,
        radius + 12 +
          (1 - clampVisualValue(zombie.eliteExplosionFraction)) * radius,
        gold,
        3,
      );
    } finally {
      context.restore();
    }
  }
}

function drawBossDetails(
  context: CanvasRenderingContext2D,
  boss: ZombieVisualState,
  y: number,
  radius: number,
  elapsedSeconds: number,
): void {
  if (!boss.isBoss) return;

  const color = GAME_PALETTE.enemies.boss;
  drawCircle(context, boss.x, y, radius + 4, {
    stroke: color,
    lineWidth: 3,
  });
  if (boss.bossType === 'acidQueen') {
    for (const side of [-1, 1]) {
      drawCircle(
        context,
        boss.x + side * radius * 0.88,
        y + radius * 0.4,
        radius * 0.22,
        {
          fill: '#a6b975',
          stroke: GAME_PALETTE.enemies.outline,
          lineWidth: 2,
        },
      );
      drawCircle(
        context,
        boss.x + side * radius * 0.88,
        y + radius * 0.4,
        radius * 0.08,
        { fill: '#d6b77f' },
      );
    }
  } else {
    const hornColor = boss.bossType === 'hordeCaller'
      ? GAME_PALETTE.enemies.elite
      : color;
    const hornSpread = boss.bossType === 'charger' ? 0.78 : 0.55;
    const hornLength = boss.bossType === 'charger' ? 1.55 : 1.2;
    drawLine(
      context,
      { x: boss.x - radius * 0.55, y: y - radius * 0.58 },
      { x: boss.x - radius * hornSpread, y: y - radius * hornLength },
      hornColor,
      boss.bossType === 'charger' ? 6 : 4,
    );
    drawLine(
      context,
      { x: boss.x + radius * 0.55, y: y - radius * 0.58 },
      { x: boss.x + radius * hornSpread, y: y - radius * hornLength },
      hornColor,
      boss.bossType === 'charger' ? 6 : 4,
    );
  }

  const barWidth = radius * 2.8;
  const barHeight = 7;
  const barX = boss.x - barWidth / 2;
  const barY = y - radius - 17;
  drawRect(context, barX, barY, barWidth, barHeight, {
    fill: GAME_PALETTE.enemies.healthTrack,
    stroke: color,
    lineWidth: 1.5,
  });
  const health = clampVisualValue(boss.healthFraction ?? 1);
  if (health > 0) {
    drawRect(context, barX, barY, barWidth * health, barHeight, {
      fill: color,
    });
  }

  if (boss.bossShielded) {
    drawRing(context, boss.x, y, radius + 11, GAME_PALETTE.enemies.elite, 4);
  }
  if (boss.bossPhase === 'windup' && boss.bossChargeAngle !== undefined) {
    const length = radius * 6;
    drawLine(
      context,
      { x: boss.x, y },
      {
        x: boss.x + Math.cos(boss.bossChargeAngle) * length,
        y: y + Math.sin(boss.bossChargeAngle) * length,
      },
      color,
      4 + Math.sin(elapsedSeconds * 18) * 1.5,
    );
  }
}

function getEnemyRadius(type: ZombieVisualType): number {
  const { entity } = GAME_VISUAL_CONFIG;

  switch (type) {
    case 'walker':
      return entity.walkerRadius;
    case 'runner':
      return entity.runnerRadius;
    case 'brute':
      return entity.bruteRadius;
    case 'spitter':
      return entity.spitterRadius;
    case 'swarm':
      return entity.swarmRadius;
    case 'armoured':
      return entity.armouredRadius;
    case 'screamer':
      return entity.screamerRadius;
    case 'bloater':
      return entity.bloaterRadius;
    case 'splitter':
      return entity.splitterRadius;
    default:
      return entity.walkerRadius;
  }
}

function drawWalker(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
): void {
  const { enemies } = GAME_PALETTE;
  const lineWidth = GAME_VISUAL_CONFIG.entity.enemyOutlineWidth + 0.3;

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  context.fillStyle = 'rgba(9, 18, 22, 0.18)';
  context.beginPath();
  context.ellipse(x, y + radius * 1.08, radius * 0.82, radius * 0.24, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = fill;
  context.strokeStyle = enemies.outline;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.ellipse(x, y + radius * 0.12, radius * 1.18, radius * 1.05, -0.2, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.beginPath();
  context.ellipse(x - radius * 0.28, y - radius * 0.2, radius * 0.3, radius * 0.25, 0, 0, Math.PI * 2);
  context.fill();

  drawLine(context, { x: x - radius * 0.6, y: y + radius * 0.5 }, { x: x - radius * 0.9, y: y + radius * 1.12 }, enemies.limb, 3);
  drawLine(context, { x: x + radius * 0.6, y: y + radius * 0.5 }, { x: x + radius * 0.9, y: y + radius * 1.12 }, enemies.limb, 3);
  drawLine(context, { x: x - radius * 0.3, y: y + radius * 0.95 }, { x: x - radius * 0.18, y: y + radius * 1.35 }, enemies.limb, 3);
  drawLine(context, { x: x + radius * 0.3, y: y + radius * 0.95 }, { x: x + radius * 0.18, y: y + radius * 1.35 }, enemies.limb, 3);

  const eyeRadius = radius * 0.12;
  drawCircle(context, x - radius * 0.28, y - radius * 0.06, eyeRadius, { fill: enemies.eye, stroke: enemies.outline, lineWidth: 1.4 });
  drawCircle(context, x + radius * 0.28, y - radius * 0.06, eyeRadius, { fill: enemies.eye, stroke: enemies.outline, lineWidth: 1.4 });
  drawCircle(context, x - radius * 0.28, y - radius * 0.06, eyeRadius * 0.36, { fill: enemies.outline });
  drawCircle(context, x + radius * 0.28, y - radius * 0.06, eyeRadius * 0.36, { fill: enemies.outline });
  drawLine(context, { x: x - radius * 0.18, y: y + radius * 0.26 }, { x: x + radius * 0.18, y: y + radius * 0.26 }, enemies.outline, 1.7);

  context.restore();
}

export function drawZombie(
  context: CanvasRenderingContext2D,
  zombie: ZombieVisualState,
  elapsedSeconds: number,
): void {
  const { entity } = GAME_VISUAL_CONFIG;
  const { enemies } = GAME_PALETTE;
  const movement = clampVisualValue(zombie.movementFactor ?? 0.35);
  const y = zombie.y + Math.sin(elapsedSeconds * 7 + zombie.x * 0.03) * movement;
  const type = zombie.type;
  const radius = zombie.radius ?? getEnemyRadius(type);
  const appearanceType = zombie.isBoss && zombie.bossType === 'acidQueen'
    ? 'spitter'
    : zombie.isBoss && zombie.bossType === 'hordeCaller'
      ? 'screamer'
      : type;
  const baseColor = zombie.isBoss && zombie.bossType === 'acidQueen'
    ? '#a6b975'
    : enemies[appearanceType] ?? enemies.walker;
  const hitFlash = clampVisualValue(zombie.hitFlash ?? 0);

  if (type === 'walker') {
    context.save();
    try {
      if (hitFlash > 0) {
        context.globalAlpha = hitFlash * 0.88;
      }
      drawWalker(
        context,
        zombie.x,
        y,
        radius,
        hitFlash > 0 ? enemies.eye : baseColor,
      );
    } finally {
      context.restore();
    }

    if (zombie.healthFraction !== undefined) {
      const health = clampVisualValue(zombie.healthFraction);
      if (health < 1) {
        const barWidth = radius * 2;
        const barY = y - radius - 8;
        drawRect(context, zombie.x - radius, barY, barWidth, 4, {
          fill: enemies.healthTrack,
        });
        if (health > 0) {
          drawRect(context, zombie.x - radius, barY, barWidth * health, 4, {
            fill: GAME_PALETTE.combat.damage,
          });
        }
      }
    }
    drawEliteDetails(context, zombie, y, radius, elapsedSeconds);
    drawBossDetails(context, zombie, y, radius, elapsedSeconds);
    return;
  }

  const appearance = getEnemyAppearance(appearanceType, {
    bodyColor: baseColor,
    outlineColor: zombie.isElite ? enemies.elite : enemies.outline,
    limbColor: zombie.isElite ? enemies.elite : enemies.limb,
  });
  drawEnemyAnatomy(
    context,
    {
      x: zombie.x,
      y,
      radius,
      rotation: zombie.facingAngle ?? 0,
      movementFactor: zombie.movementFactor ?? 0.35,
      healthFraction: zombie.healthFraction ?? 1,
      hitFlash,
    },
    elapsedSeconds,
    appearance,
  );
  drawEliteDetails(context, zombie, y, radius, elapsedSeconds);
  drawBossDetails(context, zombie, y, radius, elapsedSeconds);
}
