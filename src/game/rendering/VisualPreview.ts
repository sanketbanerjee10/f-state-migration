import type { RenderActor, RenderCommand, RenderLayers } from './RenderScene';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import { createGroundShadowCommand } from './EntityRenderer';
import { drawCollectionBurst, drawDamageNumber, drawImpactEffect, drawMuzzleFlash } from './EffectsRenderer';
import { INITIAL_ORB_TYPES, drawOrb } from './OrbRenderer';
import { drawPlayer } from './PlayerRenderer';
import { drawProjectile } from './ProjectileRenderer';
import { drawZombie } from './ZombieRenderer';

function pulse(
  elapsedSeconds: number,
  period: number,
  offset: number,
  duration: number,
): number {
  const phase = ((elapsedSeconds + offset) % period + period) % period;
  return phase < duration ? 1 - phase / duration : 0;
}

export function createVisualPreviewLayers(
  width: number,
  height: number,
  playerPosition = { x: width / 2, y: height / 2 },
  aimAngle = -0.22,
): RenderLayers {
  const centerX = width / 2;
  const playerRadius = GAME_VISUAL_CONFIG.entity.playerVisualRadius;
  const walkerPositions = [
    { x: width * 0.32, y: height * 0.39 },
    { x: width * 0.73, y: height * 0.62 },
  ] as const;
  const runnerPositions = [
    { x: width * 0.7, y: height * 0.43 },
    { x: width * 0.29, y: height * 0.64 },
  ] as const;
  const orbY = height * 0.78;
  const orbSpacing = Math.min(58, width * 0.11);
  const orbRadius = GAME_VISUAL_CONFIG.entity.orbRadius;
  const actors: RenderActor[] = [
    {
      get y() {
        return playerPosition.y;
      },
      draw: (context, frame) => drawPlayer(
        context,
        {
          ...playerPosition,
          aimAngle,
          movementFactor: 0.18,
          hitFlash: pulse(frame.elapsedSeconds, 5.4, 0, 0.18),
          shieldStrength: 1,
        },
        frame.elapsedSeconds,
      ),
    },
    ...walkerPositions.map((position, index): RenderActor => ({
      y: position.y,
      draw: (context, frame) => drawZombie(
        context,
        {
          ...position,
          type: 'walker',
          facingAngle: index === 0 ? 0.45 : -2.2,
          hitFlash: pulse(frame.elapsedSeconds, 4.8, index * 1.3, 0.2),
          healthFraction: index === 0 ? 1 : 0.66,
        },
        frame.elapsedSeconds,
      ),
    })),
    ...runnerPositions.map((position, index): RenderActor => ({
      y: position.y,
      draw: (context, frame) => drawZombie(
        context,
        {
          ...position,
          type: 'runner',
          facingAngle: index === 0 ? Math.PI : 0.5,
          movementFactor: 0.65,
          healthFraction: index === 0 ? 0.72 : undefined,
        },
        frame.elapsedSeconds,
      ),
    })),
  ];

  const projectiles: RenderCommand[] = [0, 0.34, 0.68].map((offset, index) => ({
    draw: (context, frame) => {
      const progress = (frame.elapsedSeconds * 0.72 + offset) % 1;
      const distance = playerRadius + 14 + progress * 104;
      drawProjectile(context, {
        x: playerPosition.x + Math.cos(aimAngle) * distance,
        y: playerPosition.y + Math.sin(aimAngle) * distance,
        directionX: Math.cos(aimAngle),
        directionY: Math.sin(aimAngle),
        type: index === 2 ? 'critical' : 'standard',
      });
    },
  }));
  const pickups: RenderCommand[] = INITIAL_ORB_TYPES.map((type, index) => ({
    draw: (context, frame) => {
      const x = centerX + (index - (INITIAL_ORB_TYPES.length - 1) / 2) * orbSpacing;
      const lifeCycle = (frame.elapsedSeconds * 0.055 + index * 0.17) % 1;
      drawOrb(
        context,
        {
          x,
          y: orbY,
          type,
          remainingFraction: 1 - lifeCycle,
          pulseOffset: index * 0.7,
        },
        frame.elapsedSeconds,
      );
    },
  }));

  const groundShadows = [
    createGroundShadowCommand(playerPosition, playerRadius),
    ...walkerPositions.map((position) => createGroundShadowCommand(
      position,
      GAME_VISUAL_CONFIG.entity.walkerRadius,
    )),
    ...runnerPositions.map((position) => createGroundShadowCommand(
      position,
      GAME_VISUAL_CONFIG.entity.runnerRadius,
    )),
    ...INITIAL_ORB_TYPES.map((_, index) => createGroundShadowCommand(
      {
        x: centerX + (index - (INITIAL_ORB_TYPES.length - 1) / 2) * orbSpacing,
        y: orbY,
      },
      orbRadius,
    )),
  ];

  const impact: RenderCommand = {
    draw: (context, frame) => {
      const progress = pulse(frame.elapsedSeconds, 2.8, 0.25, 0.42);
      if (progress > 0) {
        drawImpactEffect(context, {
          x: playerPosition.x + Math.cos(aimAngle) * 112,
          y: playerPosition.y + Math.sin(aimAngle) * 112,
          progress: 1 - progress,
        });
      }
    },
  };
  const collection: RenderCommand = {
    draw: (context, frame) => {
      const progress = pulse(frame.elapsedSeconds, 4.2, 1.1, 0.38);
      if (progress > 0) {
        drawCollectionBurst(context, {
          x: centerX,
          y: orbY,
          progress: 1 - progress,
          color: GAME_PALETTE.orbs.health,
        });
      }
    },
  };
  const muzzleFlash: RenderCommand = {
    draw: (context, frame) => {
      const intensity = pulse(frame.elapsedSeconds, 1.2, 0.3, 0.12);
      if (intensity > 0) {
        drawMuzzleFlash(context, {
          x: playerPosition.x + Math.cos(aimAngle) * (playerRadius + 5),
          y: playerPosition.y + Math.sin(aimAngle) * (playerRadius + 5),
          angle: aimAngle,
          intensity,
        });
      }
    },
  };
  const damageNumber: RenderCommand = {
    draw: (context, frame) => {
      const progress = pulse(frame.elapsedSeconds, 3.8, 0.6, 0.65);
      if (progress > 0) {
        drawDamageNumber(context, {
          x: runnerPositions[0].x,
          y: runnerPositions[0].y - GAME_VISUAL_CONFIG.entity.runnerRadius - 10,
          progress: 1 - progress,
          amount: 24,
          critical: true,
        });
      }
    },
  };

  return {
    groundShadows,
    pickups,
    projectiles,
    actors,
    foregroundEffects: [muzzleFlash],
    feedback: [impact, collection, damageNumber],
    debugOverlays: [],
  };
}
