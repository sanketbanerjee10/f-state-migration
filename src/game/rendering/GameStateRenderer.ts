import { createGroundShadowCommand } from './EntityRenderer';
import {
  drawCollectionBurst,
  drawDamageNumber,
  drawImpactEffect,
  drawMuzzleFlash,
} from './EffectsRenderer';
import { drawOrb } from './OrbRenderer';
import { drawPlayer } from './PlayerRenderer';
import { drawProjectile } from './ProjectileRenderer';
import type { RenderActor, RenderCommand, RenderLayers } from './RenderScene';
import { drawZombie } from './ZombieRenderer';
import type { GameState } from '../core/GameState';

export function createGameStateRenderLayers(state: GameState): RenderLayers {
  const { player } = state;
  const actors: RenderActor[] = [
    {
      y: player.y,
      draw: (context, frame) => drawPlayer(
        context,
        {
          x: player.x,
          y: player.y,
          aimAngle: player.aimAngle,
          movementFactor: player.movementFactor,
          hitFlash: Math.min(1, player.hitFlashSeconds / 0.22),
          shieldStrength: player.shieldStrength,
        },
        frame.elapsedSeconds,
      ),
    },
    ...state.zombies.map((zombie): RenderActor => ({
      y: zombie.y,
      draw: (context, frame) => drawZombie(
        context,
        {
          x: zombie.x,
          y: zombie.y,
          type: zombie.type,
          facingAngle: zombie.facingAngle,
          hitFlash: Math.min(1, zombie.hitFlashSeconds / 0.16),
          healthFraction: zombie.health / zombie.maxHealth,
        },
        frame.elapsedSeconds,
      ),
    })),
  ];
  const groundShadows: RenderCommand[] = [
    createGroundShadowCommand(player, player.radius),
    ...state.zombies.map((zombie) =>
      createGroundShadowCommand(zombie, zombie.radius),
    ),
    ...state.items.map((item) =>
      createGroundShadowCommand(item, item.radius),
    ),
  ];
  const projectiles: RenderCommand[] = state.projectiles.map((projectile) => ({
    draw: (context) => drawProjectile(context, {
      x: projectile.x,
      y: projectile.y,
      directionX: projectile.directionX,
      directionY: projectile.directionY,
      radius: projectile.radius,
    }),
  }));
  const foregroundEffects: RenderCommand[] = player.muzzleFlashSeconds > 0
    ? [{
        draw: (context) => drawMuzzleFlash(context, {
          x: player.x + Math.cos(player.aimAngle) * (player.radius + 5),
          y: player.y + Math.sin(player.aimAngle) * (player.radius + 5),
          angle: player.aimAngle,
          intensity: player.muzzleFlashSeconds / 0.075,
        }),
      }]
    : [];
  const feedback: RenderCommand[] = [
    ...state.collectionEffects.map((effect): RenderCommand => ({
      draw: (context) => drawCollectionBurst(context, {
        x: effect.x,
        y: effect.y,
        color: effect.color,
        progress: 1 - effect.remainingSeconds / effect.durationSeconds,
      }),
    })),
    ...state.impacts.map((impact): RenderCommand => ({
      draw: (context) => drawImpactEffect(context, {
        x: impact.x,
        y: impact.y,
        progress: 1 - impact.remainingSeconds / impact.durationSeconds,
        critical: impact.critical,
        kind: impact.kind,
        color: impact.color,
        radius: impact.radius,
      }),
    })),
    ...state.damageNumbers.map((damage): RenderCommand => ({
      draw: (context) => drawDamageNumber(context, {
        x: damage.x,
        y: damage.y,
        progress: 1 - damage.remainingSeconds / damage.durationSeconds,
        amount: damage.amount,
      }),
    })),
  ];

  return {
    groundShadows,
    pickups: state.items.map((item) => ({
      draw: (context, frame) => drawOrb(context, {
        x: item.x,
        y: item.y,
        type: item.type,
        radius: item.radius,
        remainingFraction: item.remainingSeconds / item.durationSeconds,
      }, frame.elapsedSeconds),
    })),
    projectiles,
    actors,
    foregroundEffects,
    feedback,
    debugOverlays: [],
  };
}

export function getGameEntityCount(state: GameState): number {
  return (
    1 +
    state.zombies.length +
    state.items.length +
    state.projectiles.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length
  );
}
