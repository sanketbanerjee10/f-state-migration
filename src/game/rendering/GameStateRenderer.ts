import { createGroundShadowCommand } from './EntityRenderer';
import { GAME_PALETTE } from './GamePalette';
import { GAME_VISUAL_CONFIG } from './VisualConfig';
import {
  drawCollectionBurst,
  drawDamageNumber,
  drawImpactEffect,
  drawMuzzleFlash,
} from './EffectsRenderer';
import { drawOrb } from './OrbRenderer';
import { drawCircle, drawLine, drawRing, drawSymbol } from './ShapeLibrary';
import { drawPlayer } from './PlayerRenderer';
import { drawProjectile } from './ProjectileRenderer';
import type { RenderActor, RenderCommand, RenderLayers } from './RenderScene';
import { drawZombie } from './ZombieRenderer';
import type { GameState } from '../core/GameState';
import {
  ARENA_TRANSITION_SECONDS,
  WAVE_MODIFIER_CONFIG,
} from '../core/GameConfig';

export function createGameStateRenderLayers(state: GameState): RenderLayers {
  const { player } = state;
  const visibilityRadiusMultiplier =
    state.wave.activeModifier === 'reducedVisibility'
      ? WAVE_MODIFIER_CONFIG.definitions.reducedVisibility
        .visibilityRadiusMultiplier
      : undefined;
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
          isElite: zombie.isElite,
          eliteModifier: zombie.eliteModifier,
          shieldFraction: zombie.eliteMaxShieldHealth
            ? (zombie.eliteShieldHealth ?? 0) / zombie.eliteMaxShieldHealth
            : 0,
          eliteExplosionFraction: zombie.eliteExplosionSeconds === undefined
            ? undefined
            : zombie.eliteExplosionSeconds /
              (zombie.eliteExplosionDurationSeconds ?? 1),
          radius: zombie.radius,
          isBoss: zombie.isBoss,
          bossType: zombie.bossType,
          bossShielded: zombie.bossShielded,
          bossPhase: zombie.bossPhase,
          bossChargeAngle: zombie.bossChargeAngle,
        },
        frame.elapsedSeconds,
      ),
    })),
    ...state.supportTurrets.map((turret): RenderActor => ({
      y: turret.y,
      draw: (context, frame) => {
        const pulse = 1 + Math.sin(frame.elapsedSeconds * 5 + turret.id) * 0.04;
        const aimAngle = turret.aimAngle ?? 0;
        drawLine(
          context,
          { x: turret.x, y: turret.y },
          {
            x: turret.x + Math.cos(aimAngle) * 20,
            y: turret.y + Math.sin(aimAngle) * 20,
          },
          GAME_PALETTE.combat.turretProjectile,
          4,
        );
        drawCircle(
          context,
          turret.x,
          turret.y,
          GAME_VISUAL_CONFIG.entity.supportTurretRadius * pulse,
          {
            fill: GAME_PALETTE.orbs.turret,
            stroke: GAME_PALETTE.arena.boundary,
            lineWidth: 2,
          },
        );
        drawSymbol(
          context,
          'crosshair',
          turret.x,
          turret.y,
          8,
          GAME_PALETTE.arena.floor,
          1.5,
        );
        drawRing(
          context,
          turret.x,
          turret.y,
          17 * pulse,
          GAME_PALETTE.orbs.turret,
          1,
        );
      },
    })),
  ];
  const groundShadows: RenderCommand[] = [
    createGroundShadowCommand(player, player.radius),
    ...state.hazards.map((hazard): RenderCommand => ({
      draw: (context, frame) => {
        context.save();
        try {
          if (hazard.kind === 'bloater') {
            const colors = GAME_PALETTE.hazards;
            context.globalAlpha = 0.9;
            drawCircle(context, hazard.x, hazard.y, hazard.radius, {
              fill: colors.bloaterFill,
            });
            drawRing(
              context,
              hazard.x,
              hazard.y,
              hazard.radius,
              colors.bloaterEdge,
              2,
            );
          } else {
            context.globalAlpha = 0.35;
            drawCircle(context, hazard.x, hazard.y, hazard.radius, {
              fill: '#7d8c78',
            });
            drawRing(
              context,
              hazard.x,
              hazard.y,
              hazard.radius,
              '#b9c68a',
              2,
            );
          }
        } finally {
          context.restore();
        }
      },
    })),
    ...state.zombies.map((zombie) =>
      createGroundShadowCommand(zombie, zombie.radius),
    ),
    ...state.items.map((item) =>
      createGroundShadowCommand(item, item.radius),
    ),
    ...state.supportTurrets.map((turret) =>
      createGroundShadowCommand(
        turret,
        GAME_VISUAL_CONFIG.entity.supportTurretRadius,
      ),
    ),
  ];
  const projectiles: RenderCommand[] = state.projectiles.map((projectile) => ({
    draw: (context) => drawProjectile(context, {
      x: projectile.x,
      y: projectile.y,
      directionX: projectile.directionX,
      directionY: projectile.directionY,
      radius: projectile.radius,
      type: projectile.kind === 'turret'
        ? 'turret'
        : projectile.kind === 'spitter'
          ? 'spitter'
        : projectile.kind === 'heavy' || projectile.kind === 'critical'
          ? projectile.kind
          : 'standard',
    }),
  }));
  const foregroundEffects: RenderCommand[] = [
    ...(player.muzzleFlashSeconds > 0
      ? [{
          draw: (context: CanvasRenderingContext2D) => drawMuzzleFlash(context, {
            x: player.x + Math.cos(player.aimAngle) * (player.radius + 5),
            y: player.y + Math.sin(player.aimAngle) * (player.radius + 5),
            angle: player.aimAngle,
            intensity: player.muzzleFlashSeconds / 0.075,
          }),
        }]
      : []),
    ...state.hazards.filter((hazard) => hazard.kind === 'bloater').map(
      (hazard): RenderCommand => ({
        draw: (context, frame) => {
          context.save();
          try {
            for (let particle = 0; particle < 10; particle += 1) {
              const phase =
                (frame.elapsedSeconds * 0.55 + particle * 0.137 +
                  hazard.id * 0.031) % 1;
              const angle = particle * 2.4 + hazard.id;
              const distance = hazard.radius * (0.18 + (particle % 4) * 0.17);
              const x = hazard.x + Math.cos(angle) * distance;
              const y = hazard.y + Math.sin(angle) * distance -
                phase * hazard.radius * 0.35;
              context.globalAlpha = 0.9 * (1 - phase * 0.65);
              drawCircle(context, x, y, 1.5 + (particle % 3) * 0.55, {
                fill: GAME_PALETTE.hazards.bloaterParticle,
              });
            }
          } finally {
            context.restore();
          }
        },
      }),
    ),
  ];
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
    visibility: visibilityRadiusMultiplier !== undefined
      ? {
          x: player.x,
          y: player.y,
          radius: Math.min(state.arenaWidth, state.arenaHeight) *
            visibilityRadiusMultiplier,
        }
      : undefined,
    arena: {
      obstacles: state.arenaObstacles,
      barrels: state.barrels,
      theme: state.arenaTheme,
      ...(state.wave.phase === 'intermission' && state.arenaTransitionFrom
        ? {
            transition: {
              from: state.arenaTransitionFrom,
              progress: Math.max(
                0,
                Math.min(
                  1,
                  1 - state.wave.transitionCountdownSeconds /
                    ARENA_TRANSITION_SECONDS,
                ),
              ),
            },
          }
        : {}),
    },
    groundShadows,
    pickups: state.items.map((item) => ({
      draw: (context, frame) => drawOrb(context, {
        x: item.x,
        y: item.y,
        type: item.type,
        rarity: item.rarity,
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
    state.supportTurrets.length +
    state.projectiles.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length
  );
}
