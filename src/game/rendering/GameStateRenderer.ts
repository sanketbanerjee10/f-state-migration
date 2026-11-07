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
import type {
  RenderActor,
  RenderCommand,
  RenderFrame,
  RenderLayers,
} from './RenderScene';
import { drawZombie } from './ZombieRenderer';
import type { GameState } from '../core/GameState';
import {
  ARENA_TRANSITION_SECONDS,
  GAME_COMBAT_CONFIG,
  INDUSTRIAL_OBJECT_CONFIG,
  MILITARY_OBJECT_CONFIG,
  WAVE_MODIFIER_CONFIG,
} from '../core/GameConfig';
import type {
  MilitaryVisualObject,
} from './MilitaryObjectRenderer';
import { renderMilitaryObjectEffects } from './MilitaryObjectRenderer';
import type { MilitaryOutpostEntity } from '../arena/ArenaSystem';
import {
  renderContaminatedObjectForegroundEffects,
  renderContaminatedObjectGroundEffects,
  type ContaminatedVisualObject,
} from './ContaminatedObjectRenderer';
import type {
  ContaminatedArenaEntity,
  ContaminatedPuddleEntity,
} from '../arena/ContaminatedArenaSystem';

function getMilitaryVisualObjects(
  state: GameState,
  entities: readonly MilitaryOutpostEntity[] = state.militaryObjects,
): MilitaryVisualObject[] {
  return entities.map((object): MilitaryVisualObject => {
    const x = state.arenaWidth * object.xFraction;
    const y = state.arenaHeight * object.yFraction;
    const base = {
      id: object.id,
      x,
      y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
    };
    switch (object.kind) {
      case 'sandbag-barricade':
        return {
          ...base,
          kind: object.kind,
          health: object.health,
          maxHealth: object.maxHealth,
          destroyed: object.destroyed,
          ...(object.destroyed && object.spillRemainingSeconds > 0
            ? {
                sandArea: {
                  x,
                  y,
                  width: MILITARY_OBJECT_CONFIG.sandbag.sandWidth,
                  height: MILITARY_OBJECT_CONFIG.sandbag.sandHeight,
                  intensity: object.spillRemainingSeconds /
                    MILITARY_OBJECT_CONFIG.sandbag.spillDurationSeconds,
                },
              }
            : {}),
        };
      case 'military-ammo-crate': {
        const drop = state.items.find((item) => item.id === object.rewardItemId);
        return {
          ...base,
          kind: object.kind,
          health: object.health,
          maxHealth: object.maxHealth,
          destroyed: object.destroyed,
          ...(object.explosionRemainingSeconds > 0
            ? {
                explosion: {
                  x,
                  y,
                  radius: MILITARY_OBJECT_CONFIG.ammoCrate.explosionRadius,
                  progress: 1 - object.explosionRemainingSeconds /
                    MILITARY_OBJECT_CONFIG.ammoCrate.explosionDurationSeconds,
                },
              }
            : {}),
          ...(drop
            ? { drop: { x: drop.x, y: drop.y, revealProgress: 1 } }
            : {}),
        };
      }
      case 'fuel-drum': {
        const drop = state.items.find((item) => item.id === object.rewardItemId);
        return {
          ...base,
          kind: object.kind,
          health: object.health,
          maxHealth: object.maxHealth,
          destroyed: object.destroyed,
          phase: object.phase,
          ...(object.phase === 'blast' || object.phase === 'aftermath'
            ? {
                blast: {
                  x,
                  y,
                  radius: MILITARY_OBJECT_CONFIG.fuelDrum.blastRadius,
                  progress: object.phase === 'aftermath'
                    ? 0.99
                    : 1 - object.phaseRemainingSeconds /
                      MILITARY_OBJECT_CONFIG.fuelDrum.blastDurationSeconds,
                  intensity: object.phase === 'aftermath' ? 0.25 : 1,
                },
              }
            : {}),
          ...(drop
            ? { drop: { x: drop.x, y: drop.y, revealProgress: 1 } }
            : {}),
        };
      }
      case 'razor-wire':
        return { ...base, kind: object.kind, active: object.active };
      case 'abandoned-turret': {
        const inRange = state.player.alive &&
          Math.hypot(state.player.x - x, state.player.y - y) <=
            MILITARY_OBJECT_CONFIG.abandonedTurret.reviveRange;
        const visualState =
          (object.state === 'broken' || object.state === 'destroyed') && inRange
          ? 'revive-ready'
          : object.state;
        return {
          ...base,
          kind: object.kind,
          wireOffset: MILITARY_OBJECT_CONFIG.abandonedTurret.wireOffset,
          state: visualState,
          health: object.health,
          maxHealth: object.maxHealth,
          facingAngle: object.facingAngle,
          reviveProgress: object.reviveProgress,
          muzzleFlash: object.muzzleFlashSeconds /
            GAME_COMBAT_CONFIG.muzzleFlashDurationSeconds,
          shotAngle: object.facingAngle,
        };
      }
      case 'military-supply-crate':
        return {
          ...base,
          kind: object.kind,
          health: object.health,
          maxHealth: object.maxHealth,
          destroyed: object.destroyed,
          ...(object.destroyed
            ? {
                destructionProgress: 1 -
                  object.destructionRemainingSeconds /
                    MILITARY_OBJECT_CONFIG.supplyCrate.destructionDurationSeconds,
              }
            : {}),
        };
    }
  });
}

function getContaminatedVisualObjects(
  state: GameState,
  entities: readonly ContaminatedArenaEntity[] = state.contaminatedObjects,
): ContaminatedVisualObject[] {
  const toProgress = (remaining: number, duration: number): number =>
    Math.max(0, Math.min(1, 1 - remaining / duration));
  const base = (entity: ContaminatedArenaEntity) => ({
    id: entity.id,
    x: entity.x,
    y: entity.y,
    width: entity.width,
    height: entity.height,
    rotation: entity.rotation,
  });
  const puddleById = (id: string | undefined) => id
    ? entities.find((entity): entity is ContaminatedPuddleEntity =>
        entity.kind === 'contaminated-puddle' && entity.id === id,
      )
    : undefined;

  return entities.map((entity): ContaminatedVisualObject => {
    switch (entity.kind) {
      case 'toxic-barrel': {
        const puddle = puddleById(entity.puddleId);
        return {
          ...base(entity),
          kind: entity.kind,
          health: entity.health,
          maxHealth: entity.maxHealth,
          destroyed: entity.destroyed,
          ...(entity.destroyed && entity.ruptureRemainingSeconds > 0
            ? {
                ruptureProgress: toProgress(
                  entity.ruptureRemainingSeconds,
                  entity.ruptureDurationSeconds,
                ),
              }
            : {}),
          ...(puddle && entity.ruptureRemainingSeconds > 0
            ? {
                puddle: {
                  x: puddle.x,
                  y: puddle.y,
                  radiusX: puddle.radiusX,
                  radiusY: puddle.radiusY,
                  progress: toProgress(
                    entity.ruptureRemainingSeconds,
                    entity.ruptureDurationSeconds,
                  ),
                },
              }
            : {}),
        };
      }
      case 'chemical-tank':
        return {
          ...base(entity),
          kind: entity.kind,
          health: entity.health,
          maxHealth: entity.maxHealth,
          destroyed: entity.destroyed,
          pressure: entity.pressure,
          ...(entity.destroyed && entity.ruptureRemainingSeconds > 0
            ? {
                ruptureProgress: toProgress(
                  entity.ruptureRemainingSeconds,
                  entity.ruptureDurationSeconds,
                ),
              }
            : {}),
          ...(entity.cloud
            ? {
                cloud: {
                  x: entity.cloud.x,
                  y: entity.cloud.y,
                  radiusX: entity.cloud.radiusX,
                  radiusY: entity.cloud.radiusY,
                  opacity: entity.cloud.density * 0.42,
                  density: entity.cloud.density,
                  ageSeconds: entity.cloud.ageSeconds,
                  remainingSeconds: entity.cloud.remainingSeconds,
                  directionX: entity.cloud.directionX,
                  directionY: entity.cloud.directionY,
                  windInfluenceX: entity.cloud.windInfluenceX,
                  windInfluenceY: entity.cloud.windInfluenceY,
                },
              }
            : {}),
        };
      case 'mutagen-container':
        return {
          ...base(entity),
          kind: entity.kind,
          health: entity.health,
          maxHealth: entity.maxHealth,
          destroyed: entity.destroyed,
          contentsIntensity: entity.contentsIntensity,
          ...(entity.destroyed && entity.ruptureRemainingSeconds > 0
            ? {
                ruptureProgress: toProgress(
                  entity.ruptureRemainingSeconds,
                  entity.ruptureDurationSeconds,
                ),
              }
            : {}),
          ...(entity.spill
            ? {
                spill: {
                  x: entity.x,
                  y: entity.y,
                  radiusX: entity.spill.radiusX,
                  radiusY: entity.spill.radiusY,
                  intensity: entity.spill.remainingSeconds /
                    entity.spill.durationSeconds,
                  ageSeconds: entity.spill.ageSeconds,
                  remainingSeconds: entity.spill.remainingSeconds,
                },
              }
            : {}),
          ...(entity.spawnBurstRemainingSeconds > 0
            ? {
                spawnBurst: {
                  x: entity.x,
                  y: entity.y,
                  progress: toProgress(
                    entity.spawnBurstRemainingSeconds,
                    entity.spawnBurstDurationSeconds,
                  ),
                  intensity: 0.82,
                },
              }
            : {}),
        };
      case 'leaking-pipe':
        return {
          ...base(entity),
          kind: entity.kind,
          phase: entity.phase,
          directionX: entity.directionX,
          directionY: entity.directionY,
          phaseProgress: entity.phaseProgress,
          intensity: entity.phase === 'spraying'
            ? 1
            : entity.phase === 'warning'
              ? 0.68
              : entity.phase === 'cooldown'
                ? 0.2
                : 0,
          leakX: entity.leakX,
          leakY: entity.leakY,
        };
      case 'contaminated-puddle':
        return {
          ...base(entity),
          kind: entity.kind,
          radiusX: entity.radiusX,
          radiusY: entity.radiusY,
          intensity: entity.intensity,
          ageSeconds: entity.ageSeconds,
          remainingSeconds: entity.remainingSeconds,
          visualSeed: entity.visualSeed,
        };
      case 'biohazard-waste-bin': {
        const puddle = puddleById(entity.puddleId);
        return {
          ...base(entity),
          kind: entity.kind,
          health: entity.health,
          maxHealth: entity.maxHealth,
          destroyed: entity.destroyed,
          ...(entity.destroyed && entity.ruptureRemainingSeconds > 0
            ? {
                ruptureProgress: toProgress(
                  entity.ruptureRemainingSeconds,
                  entity.ruptureDurationSeconds,
                ),
              }
            : {}),
          ...(puddle && entity.ruptureRemainingSeconds > 0
            ? {
                puddle: {
                  x: puddle.x,
                  y: puddle.y,
                  radiusX: puddle.radiusX,
                  radiusY: puddle.radiusY,
                  progress: toProgress(
                    entity.ruptureRemainingSeconds,
                    entity.ruptureDurationSeconds,
                  ),
                },
              }
            : {}),
        };
      }
      case 'broken-ventilation-fan':
        return {
          ...base(entity),
          kind: entity.kind,
          phase: entity.phase,
          directionAngle: entity.directionAngle,
          phaseProgress: entity.phaseProgress,
          intensity: entity.phase === 'active'
            ? 0.86
            : entity.phase === 'warning'
              ? 0.52
              : 0.18,
          bladeRotation: entity.phase === 'active'
            ? state.elapsedSeconds * 5 + entity.visualSeed
            : 0,
          visualSeed: entity.visualSeed,
        };
    }
  });
}

export function createGameStateRenderLayers(state: GameState): RenderLayers {
  const { player } = state;
  const visibilityRadiusMultiplier =
    state.wave.activeModifier === 'reducedVisibility'
      ? WAVE_MODIFIER_CONFIG.definitions.reducedVisibility
        .visibilityRadiusMultiplier
      : undefined;
  const contaminatedVisuals = getContaminatedVisualObjects(state);
  const contaminatedGroundVisuals = contaminatedVisuals.filter((object) =>
    object.kind === 'contaminated-puddle' ||
    (object.kind === 'mutagen-container' && object.spill !== undefined) ||
    ((object.kind === 'toxic-barrel' || object.kind === 'biohazard-waste-bin') &&
      object.puddle !== undefined),
  );
  const contaminatedForegroundVisuals = contaminatedVisuals.filter(
    (object) => object.kind !== 'contaminated-puddle',
  );
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
    ...(contaminatedGroundVisuals.length > 0
      ? [{
          draw: (context: CanvasRenderingContext2D, frame: RenderFrame) =>
            renderContaminatedObjectGroundEffects(
              context,
              contaminatedGroundVisuals,
              { timeSeconds: frame.elapsedSeconds },
            ),
        }]
      : []),
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
              fill: GAME_PALETTE.hazards.acidFill,
            });
            drawRing(
              context,
              hazard.x,
              hazard.y,
              hazard.radius,
              GAME_PALETTE.hazards.acidEdge,
              2,
            );
          }
        } finally {
          context.restore();
        }
      },
    })),
    ...state.oilFirePatches.map((patch): RenderCommand => ({
      draw: (context, frame) => {
        const intensity = Math.min(1, patch.remainingSeconds /
          INDUSTRIAL_OBJECT_CONFIG.oilFire.durationSeconds);
        const flicker = 0.9 + Math.sin(frame.elapsedSeconds * 8 + patch.id) * 0.1;
        context.save();
        try {
          context.globalAlpha = intensity;
          drawCircle(context, patch.x, patch.y + patch.radius * 0.16,
            patch.radius * 0.84, { fill: 'rgba(27, 24, 20, 0.72)' });
          drawCircle(context, patch.x, patch.y,
            patch.radius * 0.62, { fill: 'rgba(210, 77, 31, 0.58)' });
          drawRing(context, patch.x, patch.y,
            patch.radius * (0.76 + flicker * 0.08),
            'rgba(255, 170, 61, 0.72)', 2);
          for (let flame = 0; flame < 5; flame += 1) {
            const angle = flame * Math.PI * 0.4 + patch.id;
            const flickerHeight = 0.2 +
              (0.5 + Math.sin(frame.elapsedSeconds * 7 + flame * 2.3) * 0.5) * 0.18;
            drawCircle(
              context,
              patch.x + Math.cos(angle) * patch.radius * 0.45,
              patch.y + Math.sin(angle) * patch.radius * 0.28,
              patch.radius * flickerHeight * 0.18,
              { fill: 'rgba(255, 177, 69, 0.78)' },
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
          : projectile.kind === 'acid'
            ? 'acid'
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
    ...(state.militaryObjects.length > 0
      ? [{
          draw: (context: CanvasRenderingContext2D, frame: RenderFrame) =>
            renderMilitaryObjectEffects(
              context,
              getMilitaryVisualObjects(state),
              { timeSeconds: frame.elapsedSeconds },
            ),
        }]
      : []),
    ...(contaminatedForegroundVisuals.length > 0
      ? [{
          draw: (context: CanvasRenderingContext2D, frame: RenderFrame) =>
            renderContaminatedObjectForegroundEffects(
              context,
              contaminatedForegroundVisuals,
              { timeSeconds: frame.elapsedSeconds },
            ),
        }]
      : []),
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
      gasCylinders: state.gasCylinders,
      oilFirePatches: state.oilFirePatches,
      militaryObjects: getMilitaryVisualObjects(state),
      contaminatedObjects: contaminatedVisuals,
      theme: state.arenaTheme,
      elapsedSeconds: state.elapsedSeconds,
      ...(state.wave.phase === 'intermission' && state.arenaTransitionFrom
        ? {
            transition: {
              from: {
                ...state.arenaTransitionFrom,
                militaryObjects: getMilitaryVisualObjects(
                  state,
                  state.arenaTransitionFrom.militaryObjects ?? [],
                ),
                contaminatedObjects: getContaminatedVisualObjects(
                  state,
                  state.arenaTransitionFrom.contaminatedObjects ?? [],
                ),
              },
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
    state.gasCylinders.length +
    state.oilFirePatches.length +
    state.contaminatedObjects.length +
    state.militaryObjects.length +
    state.supportTurrets.length +
    state.projectiles.length +
    state.impacts.length +
    state.damageNumbers.length +
    state.collectionEffects.length
  );
}
